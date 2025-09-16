import { createClient } from '@/lib/supabase';
import { Database } from '@/types/database';

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

export async function supabaseSemanticSearch(
  query: string,
  options: SearchOptions = {},
  userId?: string
): Promise<SearchResult[]> {
  const {
    limit = 10,
    threshold = 0.5,
  } = options;

  try {
    console.log(`Starting Supabase semantic search for: "${query.substring(0, 100)}"`);

    const supabase = createClient();

    // Get embedding for the query
    const { getEmbedding } = await import('./embeddings');
    const queryEmbedding = await getEmbedding(query);

    console.log('Query embedding generated, starting Supabase search...');

    // Call Supabase function for semantic search
    const { data, error } = await supabase.rpc('semantic_search', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      user_id: userId || null,
    } as any);

    if (error) {
      console.error('Supabase semantic search error:', error);
      throw error;
    }

    const dataLength = Array.isArray(data) ? (data as any[]).length : 0;
    console.log(`Supabase semantic search completed with ${dataLength} results`);

    // Transform results to match expected format
    const results: SearchResult[] = Array.isArray(data) ? (data as any[]).map((item: any) => ({
      text: item.content,
      metadata: {
        id: item.id,
        title: item.display_name,
        type: item.metadata?.type || 'unknown',
        chapter_number: item.metadata?.chapter_number || '',
        section_number: item.metadata?.section_number || '',
        url: item.metadata?.url,
      },
      similarity: item.similarity,
    })) : [];

    return results;
  } catch (error) {
    console.error('Error in Supabase semantic search:', error);
    throw error;
  }
}

export async function createChatSession(title: string, userId: string): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('create_chat_session', {
    session_title: title,
    user_id: userId,
  } as any);

  if (error) {
    console.error('Error creating chat session:', error);
    throw error;
  }

  return data;
}

export async function addMessageToSession(
  sessionId: string,
  userId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  resources?: any
): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('add_message_to_session', {
    session_id: sessionId,
    user_id: userId,
    message_role: role,
    message_content: content,
    message_resources: resources || null,
  } as any);

  if (error) {
    console.error('Error adding message to session:', error);
    throw error;
  }

  return data;
}

export async function getUserChatSessions(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_user_chat_sessions', {
    user_id: userId,
  } as any);

  if (error) {
    console.error('Error getting user chat sessions:', error);
    throw error;
  }

  return data || [];
}

export async function getChatSessionMessages(sessionId: string, userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_session_id', sessionId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error getting chat session messages:', error);
    throw error;
  }

  return data || [];
}

export async function updateChatSessionTitle(sessionId: string, userId: string, title: string) {
  const supabase = createClient();

  const { error } = await (supabase as any)
    .from('chat_sessions')
    .update({ title })
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating chat session title:', error);
    throw error;
  }
}

export async function deleteChatSession(sessionId: string, userId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting chat session:', error);
    throw error;
  }
}

export async function getUserProfile(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
    console.error('Error getting user profile:', error);
    throw error;
  }

  return data;
}

export async function updateUserProfile(userId: string, updates: any) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...updates })
    .select()
    .single();

  if (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }

  return data;
}

export async function getUserSettings(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error getting user settings:', error);
    throw error;
  }

  return data;
}

export async function updateUserSettings(userId: string, settings: any) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, ...settings })
    .select()
    .single();

  if (error) {
    console.error('Error updating user settings:', error);
    throw error;
  }

  return data;
}