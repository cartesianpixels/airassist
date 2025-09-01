import Database from 'better-sqlite3';
import path from 'path';

// Initialize SQLite database
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/app/data/knowledge.db' 
  : path.join(process.cwd(), 'data', 'knowledge.db');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    initializeDatabase(db);
  }
  return db;
}

function initializeDatabase(database: Database.Database) {
  // Create knowledge_base table
  database.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_base (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      display_name TEXT NOT NULL,
      summary TEXT,
      tags TEXT, -- JSON array as string
      metadata TEXT NOT NULL, -- JSON object as string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_knowledge_base_content ON knowledge_base(content);
    CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags ON knowledge_base(tags);
    CREATE INDEX IF NOT EXISTS idx_knowledge_base_metadata ON knowledge_base(metadata);
  `);
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
}

export function insertKnowledgeBaseItem(item: KnowledgeBaseItem): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO knowledge_base 
    (id, content, display_name, summary, tags, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    item.id,
    item.content,
    item.display_name,
    item.summary || null,
    item.tags ? JSON.stringify(item.tags) : null,
    JSON.stringify(item.metadata)
  );
}

export function getAllKnowledgeBase(): KnowledgeBaseItem[] {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM knowledge_base ORDER BY id`);
  const rows = stmt.all() as any[];
  
  return rows.map(row => ({
    id: row.id,
    content: row.content,
    display_name: row.display_name,
    summary: row.summary,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    metadata: JSON.parse(row.metadata)
  }));
}

export function getKnowledgeBaseForAI() {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT id, content, metadata 
    FROM knowledge_base 
    ORDER BY id
  `);
  const rows = stmt.all() as any[];
  
  return rows.map(row => {
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
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Graceful shutdown
process.on('SIGINT', closeDatabase);
process.on('SIGTERM', closeDatabase);