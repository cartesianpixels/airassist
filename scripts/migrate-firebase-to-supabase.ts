import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';
import { openai } from '../src/lib/openai';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase configuration.');
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface FirebaseKnowledgeItem {
  id: string;
  content: string;
  metadata: {
    title: string;
    type: string;
    procedure_type: string;
    chapter: string;
    section: string;
    paragraph: string;
    source: string;
    chunk_index: number;
    total_chunks: number;
    url: string;
    word_count: number;
    char_count: number;
    scraped_at: string;
  };
  displayName: string;
  tags: string[];
  summary: string;
}

interface SupabaseKnowledgeItem {
  id: string;
  content: string;
  display_name: string;
  summary: string;
  tags: string[];
  metadata: any;
  embedding: number[];
  created_at: string;
  updated_at: string;
}

interface FirebaseSourceItem {
  id: string;
  document?: string;
  aviation_sources?: Array<{
    name: string;
    type: string;
    resources: Array<{
      title: string;
      url: string;
    }>;
  }>;
}

interface SupabaseSourceItem {
  id: string;
  name: string;
  document_name?: string;
  source_type: string;
  resources?: any;
  metadata: any;
  created_at: string;
  updated_at: string;
}

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.substring(0, 8000), // Limit text length for embedding API
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

function transformFirebaseToSupabase(item: FirebaseKnowledgeItem): Omit<SupabaseKnowledgeItem, 'embedding'> {
  const now = new Date().toISOString();

  // Generate a UUID from the Firebase ID for consistency
  const uuid = uuidv4();

  return {
    id: uuid,
    content: item.content,
    display_name: item.displayName,
    summary: item.summary || '',
    tags: item.tags || [],
    metadata: {
      ...item.metadata,
      firebase_id: item.id, // Keep original Firebase ID for reference
    },
    created_at: now,
    updated_at: now,
  };
}

async function loadFirebaseData(): Promise<{
  knowledgeItems: FirebaseKnowledgeItem[];
  sourceItems: FirebaseSourceItem[];
}> {
  const knowledgeBasePath = path.join(__dirname, '../firebase/knowledge-base.json');
  const sourcesPath = path.join(__dirname, '../firebase/aviation_sources.json');

  const knowledgeItems: FirebaseKnowledgeItem[] = [];
  const sourceItems: FirebaseSourceItem[] = [];

  if (fs.existsSync(knowledgeBasePath)) {
    const data = JSON.parse(fs.readFileSync(knowledgeBasePath, 'utf8'));
    knowledgeItems.push(...data);
    console.log(`📊 Loaded ${data.length} knowledge items from Firebase`);
  }

  if (fs.existsSync(sourcesPath)) {
    const data = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
    sourceItems.push(...data);
    console.log(`📊 Loaded ${data.length} source items from Firebase`);
  }

  return { knowledgeItems, sourceItems };
}

function transformFirebaseSourceToSupabase(item: FirebaseSourceItem): SupabaseSourceItem[] {
  const now = new Date().toISOString();
  const results: SupabaseSourceItem[] = [];

  if (item.document) {
    // Handle document references
    results.push({
      id: uuidv4(),
      name: item.document,
      document_name: item.document,
      source_type: 'document',
      resources: null,
      metadata: {
        firebase_id: item.id,
        type: 'document_reference',
      },
      created_at: now,
      updated_at: now,
    });
  }

  if (item.aviation_sources) {
    // Handle aviation source references
    item.aviation_sources.forEach(source => {
      results.push({
        id: uuidv4(),
        name: source.name,
        document_name: null,
        source_type: source.type,
        resources: source.resources,
        metadata: {
          firebase_id: item.id,
          type: 'external_source',
          original_source: source,
        },
        created_at: now,
        updated_at: now,
      });
    });
  }

  return results;
}

async function createAviationSourcesTable() {
  console.log('🔧 Creating aviation_sources table...');

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS public.aviation_sources (
        id uuid DEFAULT gen_random_uuid() NOT NULL,
        name text NOT NULL,
        document_name text,
        source_type text NOT NULL,
        resources jsonb,
        metadata jsonb NOT NULL DEFAULT '{}',
        created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT aviation_sources_pkey PRIMARY KEY (id)
    );

    CREATE INDEX IF NOT EXISTS idx_aviation_sources_name ON public.aviation_sources USING btree (name);
    CREATE INDEX IF NOT EXISTS idx_aviation_sources_type ON public.aviation_sources USING btree (source_type);
    CREATE INDEX IF NOT EXISTS idx_aviation_sources_document ON public.aviation_sources USING btree (document_name);
    CREATE INDEX IF NOT EXISTS idx_aviation_sources_metadata ON public.aviation_sources USING gin (metadata);
    CREATE INDEX IF NOT EXISTS idx_aviation_sources_resources ON public.aviation_sources USING gin (resources);
  `;

  try {
    // Note: Supabase doesn't support direct SQL execution via client
    // This would need to be run manually in Supabase SQL editor
    console.log('⚠️  Please run the following SQL in your Supabase SQL editor:');
    console.log(createTableSQL);
    return true;
  } catch (error) {
    console.error('❌ Error creating table:', error);
    return false;
  }
}

async function migrateWithEmbeddings() {
  console.log('🚀 Starting Firebase to Supabase migration with embeddings...');

  try {
    // Load Firebase data
    const { knowledgeItems, sourceItems } = await loadFirebaseData();

    if (knowledgeItems.length === 0 && sourceItems.length === 0) {
      console.log('❌ No data to migrate');
      return;
    }

    console.log(`📦 Processing ${knowledgeItems.length} knowledge items and ${sourceItems.length} source items...`);

    // Migrate knowledge base with embeddings
    if (knowledgeItems.length > 0) {
      await migrateKnowledgeBase(knowledgeItems);
    }

    // Migrate aviation sources
    if (sourceItems.length > 0) {
      await migrateAviationSources(sourceItems);
    }

    console.log(`\n🎉 Migration complete!`);
  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }
}

async function migrateKnowledgeBase(firebaseItems: FirebaseKnowledgeItem[]) {
  console.log('\n📚 Migrating knowledge base with embeddings...');

  const batchSize = 10; // Smaller batches for embedding generation
  let processed = 0;
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < firebaseItems.length; i += batchSize) {
    const batch = firebaseItems.slice(i, i + batchSize);

    console.log(`🔄 Processing knowledge batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(firebaseItems.length / batchSize)}...`);

    // Process batch items
    const supabaseItems: SupabaseKnowledgeItem[] = [];

    for (const item of batch) {
      try {
        // Transform structure
        const transformed = transformFirebaseToSupabase(item);

        // Generate embedding
        console.log(`🧠 Generating embedding for: ${item.displayName}`);
        const embedding = await generateEmbedding(item.content);

        supabaseItems.push({
          ...transformed,
          embedding,
        });

        processed++;
      } catch (error) {
        console.error(`⚠️  Failed to process item ${item.id}:`, error.message);
        failed++;
      }
    }

    // Insert batch into Supabase
    if (supabaseItems.length > 0) {
      try {
        const { data, error } = await supabase
          .from('knowledge_base')
          .insert(supabaseItems as any)
          .select('id');

        if (error) {
          console.error(`❌ Knowledge batch insert failed:`, error.message);
          failed += supabaseItems.length;
        } else {
          successful += data?.length || supabaseItems.length;
          console.log(`✅ Inserted ${data?.length || supabaseItems.length} knowledge items`);
        }
      } catch (error) {
        console.error(`❌ Database error:`, error);
        failed += supabaseItems.length;
      }
    }

    // Rate limiting pause
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`📚 Knowledge base migration: ${successful} successful, ${failed} failed`);
}

async function migrateAviationSources(sourceItems: FirebaseSourceItem[]) {
  console.log('\n✈️  Migrating aviation sources...');

  const allSourceItems: SupabaseSourceItem[] = [];

  // Transform all source items
  sourceItems.forEach(item => {
    const transformed = transformFirebaseSourceToSupabase(item);
    allSourceItems.push(...transformed);
  });

  console.log(`📦 Transformed ${sourceItems.length} Firebase items into ${allSourceItems.length} Supabase items`);

  let successful = 0;
  let failed = 0;
  const batchSize = 50;

  for (let i = 0; i < allSourceItems.length; i += batchSize) {
    const batch = allSourceItems.slice(i, i + batchSize);

    try {
      const { data, error } = await supabase
        .from('aviation_sources')
        .insert(batch as any)
        .select('id');

      if (error) {
        console.error(`❌ Sources batch insert failed:`, error.message);
        failed += batch.length;
      } else {
        successful += data?.length || batch.length;
        console.log(`✅ Inserted ${data?.length || batch.length} aviation sources`);
      }
    } catch (error) {
      console.error(`❌ Aviation sources error:`, error);
      failed += batch.length;
    }
  }

  console.log(`✈️  Aviation sources migration: ${successful} successful, ${failed} failed`);
}

async function runMigration() {
  console.log('🚀 Firebase → Supabase Migration with Embeddings');
  console.log(`📍 Target: ${SUPABASE_URL}`);

  try {
    await migrateWithEmbeddings();
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Auto-run when executed directly
if (require.main === module) {
  runMigration();
}

export { runMigration };