import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';
import * as dotenv from 'dotenv';
import { Client } from 'pg';

// Load environment variables from multiple possible locati
dotenv.config({ path: '.env' });
dotenv.config();

// Debug: Show what environment variables are available
console.log('🔍 Checking environment variables...');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Found' : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Found' : '❌ Missing');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Found' : '❌ Missing');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://airassist_user:your_secure_password_here@localhost:5433/airassist';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase configuration.');
  console.error('Please set the following environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  console.error('- DATABASE_URL (optional, defaults to local PostgreSQL)');
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface LocalKnowledgeEntry {
  id: string;
  content: string;
  display_name: string;
  summary?: string;
  tags?: any;
  metadata: any;
  embedding?: number[];
  created_at: string;
  updated_at: string;
}

function parseVectorToArray(vectorData: any): number[] | undefined {
  if (!vectorData) return undefined;

  // If it's already an array of numbers, return it
  if (Array.isArray(vectorData) && typeof vectorData[0] === 'number') {
    return vectorData;
  }

  // If it's a string representation of a vector (like "[1,2,3]")
  if (typeof vectorData === 'string') {
    try {
      // Remove brackets and split by comma
      const cleaned = vectorData.replace(/^\[|\]$/g, '');
      return cleaned.split(',').map(x => parseFloat(x.trim()));
    } catch (error) {
      console.warn('Failed to parse vector string:', error);
      return undefined;
    }
  }

  // If it's a pgvector object, extract the data
  if (vectorData && typeof vectorData === 'object') {
    // Try to access common pgvector properties
    if (vectorData.data) return Array.from(vectorData.data);
    if (vectorData.values) return Array.from(vectorData.values);
    if (vectorData.vector) return Array.from(vectorData.vector);
  }

  console.warn('Unknown vector format:', typeof vectorData);
  return undefined;
}

async function getLocalRecords(): Promise<LocalKnowledgeEntry[]> {
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    console.log('🔌 Connecting to local PostgreSQL...');
    await client.connect();

    console.log('📊 Fetching records from local knowledge_base...');
    const result = await client.query(`
      SELECT
        id,
        content,
        display_name,
        summary,
        tags,
        metadata,
        embedding::text as embedding,
        created_at,
        updated_at
      FROM knowledge_base
      ORDER BY created_at ASC
    `);

    console.log(`✅ Found ${result.rows.length} records in local database`);

    return result.rows.map(row => ({
      id: row.id,
      content: row.content,
      display_name: row.display_name,
      summary: row.summary,
      tags: row.tags,
      metadata: row.metadata,
      embedding: row.embedding ? parseVectorToArray(row.embedding) : undefined,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString()
    }));

  } finally {
    await client.end();
    console.log('🔌 Disconnected from local PostgreSQL');
  }
}

async function getExistingSupabaseRecords(): Promise<Set<string>> {
  console.log('🔍 Checking existing records in Supabase...');

  const existingIds = new Set<string>();
  let from = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('id')
      .range(from, from + batchSize - 1);

    if (error) {
      console.error('❌ Error fetching existing records:', error);
      break;
    }

    if (!data || data.length === 0) {
      break; // No more records
    }

    // Add IDs to the set
    data.forEach(record => existingIds.add(record.id));

    console.log(`📊 Fetched ${existingIds.size} existing IDs so far...`);

    // If we got fewer records than requested, we've reached the end
    if (data.length < batchSize) {
      break;
    }

    from += batchSize;
  }

  console.log(`📊 Found ${existingIds.size} total existing records in Supabase`);
  return existingIds;
}

async function syncWithDuplicateDetection() {
  console.log('🚀 Starting local PostgreSQL to Supabase sync...');

  try {
    // Get local records
    const localEntries = await getLocalRecords();

    if (localEntries.length === 0) {
      console.log('❌ No data found in local database');
      return;
    }

    console.log(`📊 Found ${localEntries.length} records to sync`);

    // Get existing records in Supabase
    const existingIds = await getExistingSupabaseRecords();

    // Filter out duplicates
    const newEntries = localEntries.filter(entry => !existingIds.has(entry.id));
    const duplicateCount = localEntries.length - newEntries.length;

    console.log(`🔄 Syncing ${newEntries.length} new records (${duplicateCount} duplicates will be skipped)`);

    if (newEntries.length === 0) {
      console.log('✅ All records already exist in Supabase - nothing to sync');
      return;
    }

    // Batch sync new records
    const batchSize = 50;
    let synced = 0;
    let failed = 0;

    for (let i = 0; i < newEntries.length; i += batchSize) {
      const batch = newEntries.slice(i, i + batchSize);

      const supabaseEntries = batch.map(entry => ({
        id: entry.id,
        content: entry.content,
        display_name: entry.display_name,
        summary: entry.summary || null,
        tags: entry.tags || null,
        metadata: entry.metadata,
        embedding: entry.embedding || null,
        access_level: 'public' as const,
        created_at: entry.created_at,
        updated_at: entry.updated_at,
        created_by: null,
      }));

      try {
        // Insert new records only (no upsert to prevent overwriting)
        const { data, error } = await supabase
          .from('knowledge_base')
          .insert(supabaseEntries as any)
          .select('id');

        if (error) {
          console.log(`⚠️  Batch ${Math.floor(i / batchSize) + 1} failed: ${error.message}`);
          failed += batch.length;
        } else {
          const insertedCount = data?.length || batch.length;
          synced += insertedCount;
          console.log(`✅ Synced ${synced}/${newEntries.length} new records (batch ${Math.floor(i / batchSize) + 1})`);
        }
      } catch (error) {
        console.log(`⚠️  Batch ${Math.floor(i / batchSize) + 1} error: ${error.message || error}`);
        failed += batch.length;
      }
    }

    console.log(`🎉 Sync complete!`);
    console.log(`📊 Successfully synced: ${synced} records`);
    console.log(`📊 Skipped duplicates: ${duplicateCount} records`);
    if (failed > 0) {
      console.log(`⚠️  Failed: ${failed} records`);
    }

  } catch (error) {
    console.error('💥 Sync failed:', error);
    throw error;
  }
}

async function runSync() {
  console.log('🚀 Local PostgreSQL → Supabase Synchronizer');
  console.log(`📍 Source: ${DATABASE_URL.replace(/\/\/[^@]+@/, '//***:***@')}`);
  console.log(`📍 Target: ${SUPABASE_URL}`);

  try {
    await syncWithDuplicateDetection();

    // Final verification
    const { count } = await supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Total records in Supabase after sync: ${count}`);
    console.log('✅ Sync complete');
  } catch (error) {
    console.error('💥 Sync failed:', error);
    process.exit(1);
  }
}

// Auto-run when executed directly
if (require.main === module) {
  runSync();
}

export { runSync };