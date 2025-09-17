// Centralized API client with caching and error handling
import { createClient } from '@/lib/supabase';

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  cache?: boolean;
  cacheKey?: string;
  cacheDuration?: number;
}

interface CachedResponse {
  data: any;
  timestamp: number;
}

// Simple in-memory cache for API responses
const responseCache = new Map<string, CachedResponse>();
const DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  async request<T = any>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      body,
      headers = {},
      signal,
      cache = false,
      cacheKey,
      cacheDuration = DEFAULT_CACHE_DURATION
    } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const finalCacheKey = cacheKey || `${method}:${url}:${JSON.stringify(body)}`;

    // Check cache for GET requests
    if (cache && method === 'GET') {
      const cached = responseCache.get(finalCacheKey);
      if (cached && Date.now() - cached.timestamp < cacheDuration) {
        return cached.data;
      }
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      signal
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();

      // Cache successful GET responses
      if (cache && method === 'GET') {
        responseCache.set(finalCacheKey, { data, timestamp: Date.now() });
      }

      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request cancelled');
      }
      throw error;
    }
  }

  // Helper methods for different HTTP verbs
  get<T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  put<T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  delete<T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // Clear cache for specific key or all cache
  clearCache(key?: string) {
    if (key) {
      responseCache.delete(key);
    } else {
      responseCache.clear();
    }
  }

  // Get cache status
  getCacheInfo() {
    return {
      size: responseCache.size,
      keys: Array.from(responseCache.keys())
    };
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Utility for Supabase-specific operations with optimizations
export class SupabaseApiClient {
  private static instance: SupabaseApiClient;
  private supabase = createClient();

  static getInstance() {
    if (!SupabaseApiClient.instance) {
      SupabaseApiClient.instance = new SupabaseApiClient();
    }
    return SupabaseApiClient.instance;
  }

  // Optimized profile fetch with caching
  async getProfile(userId: string, fields: string[] = ['*']) {
    const cacheKey = `profile_${userId}_${fields.join(',')}`;
    const cached = responseCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < DEFAULT_CACHE_DURATION) {
      return { data: cached.data, error: null };
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .select(fields.join(','))
      .eq('id', userId);

    if (!error && data) {
      responseCache.set(cacheKey, { data: data[0], timestamp: Date.now() });
    }

    return { data: data?.[0] || null, error };
  }

  // Clear profile cache
  clearProfileCache(userId?: string) {
    if (userId) {
      for (const key of responseCache.keys()) {
        if (key.startsWith(`profile_${userId}`)) {
          responseCache.delete(key);
        }
      }
    } else {
      for (const key of responseCache.keys()) {
        if (key.startsWith('profile_')) {
          responseCache.delete(key);
        }
      }
    }
  }
}

export const supabaseApi = SupabaseApiClient.getInstance();