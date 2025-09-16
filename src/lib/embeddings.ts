import OpenAI from 'openai';
import { getRedis } from './database-pg';
import crypto from 'crypto';

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export interface EmbeddingCache {
  embedding: number[];
  timestamp: number;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const startTime = Date.now();
  const textPreview = text.substring(0, 50) + (text.length > 50 ? '...' : '');
  console.log(`Getting embedding for: "${textPreview}"`);
  
  const redis = getRedis();
  
  // Create cache key from text hash
  const textHash = crypto.createHash('sha256').update(text).digest('hex');
  const cacheKey = `embedding:${textHash}`;
  
  try {
    // Check cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      const { embedding, timestamp }: EmbeddingCache = JSON.parse(cached);
      // Cache for 7 days
      if (Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
        console.log(`Embedding cache hit (${Date.now() - startTime}ms)`);
        return embedding;
      }
    }
  } catch (error) {
    console.warn('Redis cache error:', error);
  }

  try {
    console.log('Calling OpenAI embeddings API...');
    // Get embedding from OpenAI
    const client = getOpenAI();
    
    // Add timeout to embedding call
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI embedding timeout after 30 seconds')), 30000);
    });
    
    const embeddingPromise = client.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.replace(/\n/g, ' '),
    });
    
    const response = await Promise.race([embeddingPromise, timeoutPromise]);

    const embedding = response.data[0]?.embedding;
    if (!embedding) {
      throw new Error('No embedding returned from OpenAI');
    }

    console.log(`Embedding generated successfully (${Date.now() - startTime}ms, length: ${embedding.length})`);

    // Cache the result
    try {
      const cacheData: EmbeddingCache = {
        embedding,
        timestamp: Date.now(),
      };
      await redis.set(cacheKey, JSON.stringify(cacheData), 'EX', 7 * 24 * 60 * 60); // 7 days
    } catch (error) {
      console.warn('Failed to cache embedding:', error);
    }

    return embedding;
  } catch (error) {
    console.error(`Error getting embedding for "${textPreview}":`, error.message || error);
    throw error;
  }
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  
  // Process in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchEmbeddings = await Promise.all(
      batch.map(text => getEmbedding(text))
    );
    embeddings.push(...batchEmbeddings);
    
    // Small delay between batches
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return embeddings;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function findSimilarTexts(
  queryEmbedding: number[],
  candidateEmbeddings: Array<{embedding: number[], text: string, metadata?: any}>,
  topK: number = 5,
  threshold: number = 0.7
): Promise<Array<{text: string, similarity: number, metadata?: any}>> {
  const similarities = candidateEmbeddings
    .map(candidate => ({
      text: candidate.text,
      metadata: candidate.metadata,
      similarity: cosineSimilarity(queryEmbedding, candidate.embedding)
    }))
    .filter(result => result.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return similarities;
}

// Alternative embedding service using HuggingFace (for local/self-hosted option)
export async function getHuggingFaceEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    throw new Error('HUGGINGFACE_API_KEY environment variable is not set');
  }

  const response = await fetch(
    'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text,
        options: { wait_for_model: true }
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`HuggingFace API error: ${response.statusText}`);
  }

  const embedding = await response.json();
  return embedding;
}

export async function clearEmbeddingCache(): Promise<void> {
  const redis = getRedis();
  const keys = await redis.keys('embedding:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}