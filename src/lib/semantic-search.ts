import { getDatabase, searchKnowledgeBase } from './database-pg';
import { getEmbedding } from './embeddings';

export interface SearchResult {
  text: string;
  metadata: {
    id: string;
    title: string;
    type: string;
    chapter_number: string;
    section_number: string;
    url?: string;
  };
  similarity: number;
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  includeMetadata?: boolean;
}

export async function semanticSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const {
    limit = 10,
    threshold = 0.7,
    includeMetadata = true
  } = options;

  try {
    console.log(`Semantic search starting for query: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);

    // Search using PostgreSQL vector similarity with fallback
    let results = await searchKnowledgeBase(query, limit, threshold);

    // If no results found with current threshold, try with lower threshold
    if (results.length === 0 && threshold > 0.5) {
      console.log(`No results found with threshold ${threshold}, trying with 0.5`);
      results = await searchKnowledgeBase(query, limit, 0.5);
    }

    // If still no results, try with even lower threshold
    if (results.length === 0 && threshold > 0.3) {
      console.log(`No results found with threshold 0.5, trying with 0.3`);
      results = await searchKnowledgeBase(query, limit, 0.3);
    }

    console.log(`Semantic search completed with ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Error in semantic search:', error);
    // Return empty results instead of throwing to prevent chat failure
    console.log('Returning empty results due to search error');
    return [];
  }
}

export async function hybridSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const startTime = Date.now();
  const {
    limit = 10,
    threshold = 0.5
  } = options;

  const db = getDatabase();
  const client = await db.connect();

  try {
    console.log(`Starting hybrid search for: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);
    
    // Get query embedding with timeout
    const embeddingTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Embedding generation timeout after 30 seconds')), 30000);
    });
    
    const embeddingPromise = getEmbedding(query);
    const queryEmbedding = await Promise.race([embeddingPromise, embeddingTimeout]);
    
    console.log(`Embedding ready, executing hybrid database query...`);
    
    // Hybrid search: combine vector similarity with text search
    const embeddingVector = `[${queryEmbedding.join(',')}]`;
    
    // Add timeout to the complex hybrid query
    const hybridQueryTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Hybrid search query timeout after 30 seconds')), 30000);
    });
    
    const hybridQueryPromise = client.query(`
      WITH vector_search AS (
        SELECT 
          id, 
          content, 
          metadata,
          1 - (embedding <=> $1) as vector_similarity
        FROM knowledge_base
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1
        LIMIT $2
      ),
      text_search AS (
        SELECT 
          id, 
          content, 
          metadata,
          ts_rank_cd(to_tsvector('english', content), plainto_tsquery('english', $3)) as text_rank
        FROM knowledge_base
        WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $3)
        ORDER BY ts_rank_cd(to_tsvector('english', content), plainto_tsquery('english', $3)) DESC
        LIMIT $2
      )
      SELECT DISTINCT ON (kb.id)
        kb.id,
        kb.content,
        kb.metadata,
        COALESCE(vs.vector_similarity, 0) as vector_similarity,
        COALESCE(ts.text_rank, 0) as text_rank,
        (COALESCE(vs.vector_similarity, 0) * 0.7 + COALESCE(ts.text_rank, 0) * 0.3) as combined_score
      FROM knowledge_base kb
      LEFT JOIN vector_search vs ON kb.id = vs.id
      LEFT JOIN text_search ts ON kb.id = ts.id
      WHERE (vs.id IS NOT NULL OR ts.id IS NOT NULL)
        AND (COALESCE(vs.vector_similarity, 0) > $4 OR COALESCE(ts.text_rank, 0) > 0)
      ORDER BY kb.id, combined_score DESC
    `, [embeddingVector, limit * 2, query, threshold]);
    
    const result = await Promise.race([hybridQueryPromise, hybridQueryTimeout]);
    
    console.log(`Hybrid search completed in ${Date.now() - startTime}ms, found ${result.rows.length} raw results`);

    const searchResults: SearchResult[] = result.rows
      .sort((a, b) => b.combined_score - a.combined_score)
      .slice(0, limit)
      .map(row => {
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
          similarity: row.combined_score
        };
      });

    console.log(`Hybrid search returning ${searchResults.length} filtered results`);
    
    if (searchResults.length === 0) {
      console.warn(`No hybrid search results found for threshold ${threshold}, query may be too specific`);
    }

    return searchResults;
  } catch (error) {
    console.error(`Hybrid search failed after ${Date.now() - startTime}ms:`, error.message || error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getRelatedContent(
  contentId: string,
  limit: number = 5
): Promise<SearchResult[]> {
  const db = getDatabase();
  const client = await db.connect();

  try {
    // Get the embedding of the source content
    const sourceResult = await client.query(`
      SELECT embedding, content, metadata
      FROM knowledge_base
      WHERE id = $1 AND embedding IS NOT NULL
    `, [contentId]);

    if (sourceResult.rows.length === 0) {
      return [];
    }

    const sourceEmbedding = sourceResult.rows[0].embedding;

    // Find similar content
    const result = await client.query(`
      SELECT 
        id, 
        content, 
        metadata,
        1 - (embedding <=> $1) as similarity
      FROM knowledge_base
      WHERE id != $2 
        AND embedding IS NOT NULL
        AND 1 - (embedding <=> $1) > 0.8
      ORDER BY embedding <=> $1
      LIMIT $3
    `, [sourceEmbedding, contentId, limit]);

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
        },
        similarity: row.similarity
      };
    });
  } finally {
    client.release();
  }
}

export async function searchByMetadata(
  filters: {
    type?: string;
    chapter?: string;
    section?: string;
  },
  limit: number = 20
): Promise<SearchResult[]> {
  const db = getDatabase();
  const client = await db.connect();

  try {
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (filters.type) {
      whereConditions.push(`metadata->>'type' = $${paramIndex}`);
      params.push(filters.type);
      paramIndex++;
    }

    if (filters.chapter) {
      whereConditions.push(`metadata->>'chapter' = $${paramIndex}`);
      params.push(filters.chapter);
      paramIndex++;
    }

    if (filters.section) {
      whereConditions.push(`metadata->>'section' = $${paramIndex}`);
      params.push(filters.section);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    params.push(limit);

    const result = await client.query(`
      SELECT id, content, metadata
      FROM knowledge_base
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex}
    `, params);

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
        },
        similarity: 1.0 // Perfect match for metadata filters
      };
    });
  } finally {
    client.release();
  }
}