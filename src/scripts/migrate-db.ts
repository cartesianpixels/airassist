#!/usr/bin/env tsx

import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function migrate() {
  console.log('🔧 Loading environment variables...');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('💡 Make sure your .env file exists and contains:');
    console.log('   DATABASE_URL=postgresql://airassist_user:dev_password_123@localhost:5432/airassist');
    process.exit(1);
  }
  
  console.log('✅ DATABASE_URL loaded successfully');

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  const client = await pool.connect();

  try {
    console.log('🔄 Starting database migration...');

    // Enable pgvector extension
    console.log('📦 Enabling pgvector extension...');
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');

    // Create knowledge_base table
    console.log('📋 Creating knowledge_base table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content TEXT NOT NULL,
        display_name TEXT NOT NULL,
        summary TEXT,
        tags JSONB,
        metadata JSONB NOT NULL,
        embedding vector(1536), -- OpenAI ada-002 embedding dimension
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    console.log('🔍 Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_base_content 
      ON knowledge_base USING GIN (to_tsvector('english', content));
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags 
      ON knowledge_base USING GIN (tags);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_base_metadata 
      ON knowledge_base USING GIN (metadata);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding 
      ON knowledge_base USING ivfflat (embedding vector_cosine_ops) 
      WITH (lists = 100);
    `);

    // Create chat_sessions table
    console.log('💬 Creating chat_sessions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create messages table
    console.log('📨 Creating messages table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        resources JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for chat functionality
    console.log('🔗 Creating chat indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_chat_session_id 
      ON messages(chat_session_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_created_at 
      ON messages(created_at);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at 
      ON chat_sessions(updated_at);
    `);

    // Create update timestamp function
    console.log('⚙️ Creating timestamp update function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers
    console.log('🎯 Creating triggers...');
    await client.query(`
      DROP TRIGGER IF EXISTS update_knowledge_base_updated_at ON knowledge_base;
      CREATE TRIGGER update_knowledge_base_updated_at 
      BEFORE UPDATE ON knowledge_base 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;
      CREATE TRIGGER update_chat_sessions_updated_at 
      BEFORE UPDATE ON chat_sessions 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);