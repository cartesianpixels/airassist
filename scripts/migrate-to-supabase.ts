import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from multiple possible locations
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
dotenv.config();

// Debug: Show what environment variables are available
console.log('🔍 Checking environment variables...');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Found' : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Found' : '❌ Missing');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase configuration.');
  console.error('Please set the following environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Check your .env or .env.local file contains these values.');
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

async function parseSQLDumps(): Promise<LocalKnowledgeEntry[]> {
  const dumpsDir = path.join(process.cwd(), 'dumps');

  if (!fs.existsSync(dumpsDir)) {
    console.log('❌ No dumps directory found');
    return [];
  }

  const sqlFiles = fs.readdirSync(dumpsDir).filter(file => file.endsWith('.sql'));
  console.log(`📁 Processing ${sqlFiles.length} SQL files...`);

  const allEntries: LocalKnowledgeEntry[] = [];

  for (const file of sqlFiles) {
    console.log(`📄 Processing ${file}...`);
    const filePath = path.join(dumpsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Look for COPY knowledge_base statement and parse the data section
    const copyMatch = content.match(/COPY public\.knowledge_base \([^)]+\) FROM stdin;([\s\S]*?)\\./);

    if (copyMatch) {
      const dataLines = copyMatch[1].trim().split('\n').filter(line => line.trim() && !line.startsWith('\\'));

      console.log(`🔍 Found ${dataLines.length} data rows for knowledge_base`);

      for (const line of dataLines) {
        try {
          // Split by tabs (COPY format uses tabs)
          const parts = line.split('\t');

          if (parts.length >= 9) {
            const entry: LocalKnowledgeEntry = {
              id: parts[0],
              content: parts[1],
              display_name: parts[2],
              summary: parts[3] === '\\N' ? undefined : parts[3],
              tags: parts[4] === '\\N' ? undefined : JSON.parse(parts[4]),
              metadata: JSON.parse(parts[5]),
              embedding: parts[6] === '\\N' ? undefined : JSON.parse(parts[6]),
              created_at: parts[7],
              updated_at: parts[8]
            };
            allEntries.push(entry);
          }
        } catch (error) {
          console.log(`⚠️  Skipped malformed row: ${error.message}`);
        }
      }
    } else {
      console.log(`📄 No knowledge_base COPY data found in ${file}`);
    }
  }

  console.log(`✅ Parsed ${allEntries.length} records from SQL dumps`);
  return allEntries;
}

async function importDataWithDuplicateDetection() {
  console.log('🚀 Starting data import...');

  try {
    // Parse SQL dumps
    const localEntries = await parseSQLDumps();

    if (localEntries.length === 0) {
      console.log('❌ No data found in dumps');
      return;
    }

    console.log(`📊 Found ${localEntries.length} records to import`);

    // Synchronize all records using upsert (insert or update)
    console.log('🔄 Synchronizing records with upsert...');

    const batchSize = 50;
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < localEntries.length; i += batchSize) {
      const batch = localEntries.slice(i, i + batchSize);

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
        // Use upsert to handle duplicates gracefully
        const { data, error } = await supabase
          .from('knowledge_base')
          .upsert(supabaseEntries as any, {
            onConflict: 'id',
            ignoreDuplicates: false // This will update existing records
          })
          .select('id');

        if (error) {
          console.log(`⚠️  Batch ${Math.floor(i / batchSize) + 1} had issues: ${error.message}`);
          skipped += batch.length;
        } else {
          const processedCount = data?.length || batch.length;
          imported += processedCount;
          console.log(`✅ Processed ${imported}/${localEntries.length} records (batch ${Math.floor(i / batchSize) + 1})`);
        }
      } catch (error) {
        console.log(`⚠️  Skipped batch ${Math.floor(i / batchSize) + 1}: ${error.message || error}`);
        skipped += batch.length;
        // Continue with next batch instead of failing
      }
    }

    console.log(`🎉 Synchronization complete!`);
    console.log(`📊 Total processed: ${imported} records`);
    if (skipped > 0) {
      console.log(`⚠️  Skipped: ${skipped} records (due to errors)`);
    }
  } catch (error) {
    console.error('💥 Import failed:', error);
    throw error;
  }
}


async function runImport() {
  console.log('🚀 SQL Dump Importer');
  console.log(`📍 Target: ${SUPABASE_URL}`);

  try {
    await importDataWithDuplicateDetection();

    // Quick verification
    const { count } = await supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Total records in Supabase: ${count}`);
    console.log('✅ Import complete');
  } catch (error) {
    console.error('💥 Import failed:', error);
    process.exit(1);
  }
}

// Auto-run when executed directly
runImport();

export { runImport };