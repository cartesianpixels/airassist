import { createHash } from 'crypto';

// 💰 LEVEL 1: In-memory cache for ultra-fast responses
class MemoryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttlMinutes: number = 60): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// 💰 Global cache instances
const queryCache = new MemoryCache();
const embeddingCache = new MemoryCache();
const responseCache = new MemoryCache();
const documentCache = new MemoryCache();

// 🔑 Smart cache key generation
export function createCacheKey(prefix: string, data: any): string {
  const serialized = typeof data === 'string' ? data : JSON.stringify(data);
  const hash = createHash('md5').update(serialized).digest('hex').slice(0, 12);
  return `${prefix}:${hash}`;
}

// 💰 EMBEDDING CACHE - Never regenerate embeddings
export class EmbeddingCacheManager {
  static async getOrGenerate(text: string, generateFn: () => Promise<number[]>): Promise<number[]> {
    const key = createCacheKey('emb', text);

    // Try memory cache first (instant)
    let cached = embeddingCache.get(key);
    if (cached) {
      console.log('💰 Embedding CACHE HIT (memory)');
      return cached;
    }

    // Generate and cache
    console.log('💸 Embedding CACHE MISS - generating...');
    const embedding = await generateFn();
    embeddingCache.set(key, embedding, 1440); // 24 hours

    return embedding;
  }
}

// 💰 SEARCH CACHE - Cache vector search results
export class SearchCacheManager {
  static get(query: string, threshold: number, count: number): any[] | null {
    const key = createCacheKey('search', { query, threshold, count });
    const cached = queryCache.get(key);

    if (cached) {
      console.log('💰 Search CACHE HIT');
      return cached;
    }

    return null;
  }

  static set(query: string, threshold: number, count: number, results: any[]): void {
    const key = createCacheKey('search', { query, threshold, count });
    queryCache.set(key, results, 30); // 30 minutes
    console.log('💾 Search cached');
  }
}

// 💰 RESPONSE CACHE - Cache AI responses
export class ResponseCacheManager {
  static get(messages: any[], docs: any[], model: string): string | null {
    // Create cache key from conversation + documents used
    const conversationHash = createCacheKey('conv', messages);
    const docsHash = createCacheKey('docs', docs.map(d => ({ id: d.id, similarity: d.similarity })));
    const key = `resp:${conversationHash}:${docsHash}:${model}`;

    const cached = responseCache.get(key);
    if (cached) {
      console.log('💰 Response CACHE HIT - FREE response!');
      return cached;
    }

    return null;
  }

  static set(messages: any[], docs: any[], model: string, response: string): void {
    const conversationHash = createCacheKey('conv', messages);
    const docsHash = createCacheKey('docs', docs.map(d => ({ id: d.id, similarity: d.similarity })));
    const key = `resp:${conversationHash}:${docsHash}:${model}`;

    responseCache.set(key, response, 120); // 2 hours
    console.log('💾 Response cached');
  }
}

// 💰 DOCUMENT CACHE - Cache processed documents
export class DocumentCacheManager {
  static get(docIds: string[]): any[] | null {
    const key = createCacheKey('docs', docIds.sort());
    return documentCache.get(key);
  }

  static set(docIds: string[], docs: any[]): void {
    const key = createCacheKey('docs', docIds.sort());
    documentCache.set(key, docs, 60); // 1 hour
  }
}

// 💰 QUERY SIMILARITY CACHE - Detect similar queries
export class QuerySimilarityCache {
  private static queryHistory: Array<{ query: string; response: string; timestamp: number }> = [];

  static findSimilarQuery(newQuery: string): string | null {
    const normalizedNew = newQuery.toLowerCase().trim();

    // Look for very similar queries in recent history
    for (const item of this.queryHistory) {
      const normalizedOld = item.query.toLowerCase().trim();

      // Simple similarity check - you could use more sophisticated matching
      const similarity = this.calculateSimilarity(normalizedNew, normalizedOld);

      if (similarity > 0.8 && Date.now() - item.timestamp < 3600000) { // 1 hour
        console.log(`💰 Similar query found (${(similarity * 100).toFixed(1)}% match)`);
        return item.response;
      }
    }

    return null;
  }

  static addQuery(query: string, response: string): void {
    this.queryHistory.unshift({
      query,
      response,
      timestamp: Date.now()
    });

    // Keep only recent 100 queries
    this.queryHistory = this.queryHistory.slice(0, 100);
  }

  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}

// 💰 CACHE STATISTICS AND MANAGEMENT
export class CacheStats {
  static getStats() {
    return {
      embedding: embeddingCache.stats(),
      query: queryCache.stats(),
      response: responseCache.stats(),
      document: documentCache.stats(),
      queryHistory: QuerySimilarityCache['queryHistory'].length
    };
  }

  static clearAll() {
    embeddingCache.clear();
    queryCache.clear();
    responseCache.clear();
    documentCache.clear();
    console.log('🧹 All caches cleared');
  }

  static calculateSavings(cacheHits: number, missedCalls: number, avgCostPerCall: number = 0.002) {
    const savedCost = cacheHits * avgCostPerCall;
    const totalPossibleCost = (cacheHits + missedCalls) * avgCostPerCall;
    const savingsPercent = totalPossibleCost > 0 ? (savedCost / totalPossibleCost) * 100 : 0;

    return {
      savedCost: savedCost.toFixed(4),
      savingsPercent: savingsPercent.toFixed(1),
      cacheHits,
      totalCalls: cacheHits + missedCalls
    };
  }
}

// All managers are already exported above, no need to re-export