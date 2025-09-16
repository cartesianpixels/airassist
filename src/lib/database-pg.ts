import { Pool, PoolClient } from 'pg';
import { QdrantClient } from '@qdrant/js-client-rest';
import Redis from 'ioredis';

// Database connection pool
let pool: Pool | null = null;
let qdrant: QdrantClient | null = null;
let redis: Redis | null = null;

export function getDatabase(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    pool = new Pool({
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

export function getQdrant(): QdrantClient {
  if (!qdrant) {
    const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    qdrant = new QdrantClient({ url: qdrantUrl });
  }
  return qdrant;
}

export function getRedis(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });
  }
  return redis;
}

export interface KnowledgeBaseItem {
  id: string;
  content: string;
  display_name: string;
  summary?: string;
  tags?: string[];
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
    url?: string;
    word_count: number;
    char_count: number;
    scraped_at: string;
  };
  embedding?: number[];
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  chat_session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  resources?: any;
  created_at: Date;
}

export async function insertKnowledgeBaseItem(item: KnowledgeBaseItem): Promise<void> {
  const db = getDatabase();
  const client = await db.connect();
  
  try {
    const query = `
      INSERT INTO knowledge_base 
      (id, content, display_name, summary, tags, metadata, embedding)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        display_name = EXCLUDED.display_name,
        summary = EXCLUDED.summary,
        tags = EXCLUDED.tags,
        metadata = EXCLUDED.metadata,
        embedding = EXCLUDED.embedding,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await client.query(query, [
      item.id,
      item.content,
      item.display_name,
      item.summary || null,
      item.tags ? JSON.stringify(item.tags) : null,
      JSON.stringify(item.metadata),
      item.embedding ? `[${item.embedding.join(',')}]` : null,
    ]);
  } finally {
    client.release();
  }
}

export async function getAllKnowledgeBase(): Promise<KnowledgeBaseItem[]> {
  const db = getDatabase();
  const client = await db.connect();
  
  try {
    const result = await client.query(`
      SELECT id, content, display_name, summary, tags, metadata, embedding
      FROM knowledge_base 
      ORDER BY created_at DESC
    `);
    
    return result.rows.map(row => ({
      id: row.id,
      content: row.content,
      display_name: row.display_name,
      summary: row.summary,
      tags: row.tags || undefined,
      metadata: row.metadata,
      embedding: row.embedding || undefined,
    }));
  } finally {
    client.release();
  }
}

export async function getKnowledgeBaseForAI() {
  const db = getDatabase();
  const client = await db.connect();
  
  try {
    const result = await client.query(`
      SELECT id, content, metadata 
      FROM knowledge_base 
      ORDER BY created_at DESC
    `);
    
    return result.rows.map(row => {
      const metadata = JSON.parse(row.metadata);
      return {
        text: row.content,
        metadata: {
          id: row.id,
          title: metadata.title,
          type: metadata.type,
          chapter_number: metadata.chapter,
          section_number: metadata.section,
          url: metadata.url,
        }
      };
    });
  } finally {
    client.release();
  }
}

export async function searchKnowledgeBase(
  query: string,
  limit: number = 10,
  similarity_threshold: number = 0.7
): Promise<Array<{text: string, metadata: any, similarity: number}>> {
  const startTime = Date.now();
  const db = getDatabase();
  const client = await db.connect();
  
  try {
    console.log(`Starting semantic search for: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);
    
    // First, get embedding for the query
    const queryEmbedding = await getEmbedding(query);
    console.log(`Query embedding generated, starting database search...`);
    
    const embeddingVector = `[${queryEmbedding.join(',')}]`;
    
    // Add timeout to database query
    const queryTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout after 20 seconds')), 20000);
    });
    
    const dbQueryPromise = client.query(`
      SELECT 
        id, 
        content, 
        metadata,
        1 - (embedding <=> $1) as similarity
      FROM knowledge_base
      WHERE 1 - (embedding <=> $1) > $2
      ORDER BY embedding <=> $1
      LIMIT $3
    `, [embeddingVector, similarity_threshold, limit]);
    
    const result = await Promise.race([dbQueryPromise, queryTimeout]);
    
    console.log(`Semantic search completed in ${Date.now() - startTime}ms, found ${result.rows.length} results`);
    
    if (result.rows.length === 0) {
      console.warn(`No results found for similarity threshold ${similarity_threshold}, consider lowering threshold`);
    }
    
    return result.rows.map(row => {
      const metadata = row.metadata;
      return {
        text: row.content,
        metadata: {
          id: row.id,
          title: metadata.title,
          type: metadata.type,
          chapter_number: metadata.chapter,
          section_number: metadata.section,
          url: metadata.url,
        },
        similarity: row.similarity
      };
    });
  } catch (error) {
    console.error(`Semantic search failed after ${Date.now() - startTime}ms:`, error.message || error);
    throw error;
  } finally {
    client.release();
  }
}

export async function createChatSession(title: string): Promise<ChatSession> {
  const db = getDatabase();
  const client = await db.connect();
  
  try {
    const result = await client.query(`
      INSERT INTO chat_sessions (title)
      VALUES ($1)
      RETURNING id, title, created_at, updated_at
    `, [title]);
    
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function getChatSessions(): Promise<ChatSession[]> {
  const db = getDatabase();
  const client = await db.connect();
  
  try {
    const result = await client.query(`
      SELECT id, title, created_at, updated_at
      FROM chat_sessions
      ORDER BY updated_at DESC
    `);
    
    return result.rows;
  } finally {
    client.release();
  }
}

export async function getChatSession(id: string): Promise<ChatSession | null> {
  const db = getDatabase();
  const client = await db.connect();
  
  try {
    const result = await client.query(`
      SELECT id, title, created_at, updated_at
      FROM chat_sessions
      WHERE id = $1
    `, [id]);
    
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export async function insertMessage(message: Omit<Message, 'created_at'>): Promise<Message> {
  const db = getDatabase();
  const client = await db.connect();
  
  try {
    const result = await client.query(`
      INSERT INTO messages (id, chat_session_id, role, content, resources)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, chat_session_id, role, content, resources, created_at
    `, [
      message.id,
      message.chat_session_id,
      message.role,
      message.content,
      message.resources ? JSON.stringify(message.resources) : null,
    ]);
    
    // Update chat session's updated_at timestamp
    await client.query(`
      UPDATE chat_sessions 
      SET updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [message.chat_session_id]);
    
    return {
      ...result.rows[0],
      resources: result.rows[0].resources ? JSON.parse(result.rows[0].resources) : undefined,
    };
  } finally {
    client.release();
  }
}

export async function getChatMessages(chatSessionId: string): Promise<Message[]> {
  const db = getDatabase();
  const client = await db.connect();
  
  try {
    const result = await client.query(`
      SELECT id, chat_session_id, role, content, resources, created_at
      FROM messages
      WHERE chat_session_id = $1
      ORDER BY created_at ASC
    `, [chatSessionId]);
    
    return result.rows.map(row => ({
      ...row,
      resources: row.resources ? JSON.parse(row.resources) : undefined,
    }));
  } finally {
    client.release();
  }
}

// Import the embedding function from the embeddings module
import { getEmbedding as getEmbeddingFromService } from './embeddings';

async function getEmbedding(text: string): Promise<number[]> {
  return getEmbeddingFromService(text);
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
  if (redis) {
    redis.disconnect();
    redis = null;
  }
}

// Graceful shutdown
process.on('SIGINT', closeDatabase);
process.on('SIGTERM', closeDatabase);