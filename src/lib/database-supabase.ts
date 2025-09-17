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

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: userId,
      title: title,
      archived: false,
      metadata: {}
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating chat session:', error);
    throw error;
  }

  return data.id;
}

export async function updateSessionTitle(sessionId: string, title: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('user_sessions')
    .update({
      title: title.trim(),
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  if (error) {
    console.error('Error updating session title:', error);
    throw error;
  }
}

export async function addMessageToSession(
  sessionId: string,
  userId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  resources?: any
): Promise<string> {
  const supabase = createClient();

  // First verify the session exists (RLS will ensure user owns it)
  const { data: sessionData, error: sessionError } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .single();

  if (sessionError || !sessionData) {
    console.error('Session not found or access denied:', { sessionId, userId, sessionError });
    throw new Error(`Session not found or access denied. Session ID: ${sessionId}`);
  }

  // Insert the message with user_id (required by database schema)
  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_session_id: sessionId,
      user_id: userId,
      role: role,
      content: content,
      resources: resources || null,
      metadata: {},
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error adding message to session:', error);
    throw error;
  }

  return data.id;
}

export async function getUserChatSessions(userId: string, limit: number = 20, offset: number = 0) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('chat_sessions')
    .select(`
      id,
      title,
      created_at,
      updated_at,
      archived,
      messages!inner(id)
    `)
    .eq('user_id', userId)
    .eq('archived', false)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error getting user chat sessions:', error);
    throw error;
  }

  // Transform data to include message count
  const sessions = (data || []).map(session => ({
    ...session,
    message_count: session.messages?.length || 0,
    last_message_at: session.updated_at
  }));

  return sessions;
}

export async function getChatSessionMessages(sessionId: string, userId: string) {
  const supabase = createClient();

  // First verify the session exists (RLS will ensure user owns it)
  const { data: sessionData, error: sessionError } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .single();

  if (sessionError || !sessionData) {
    console.error('Session not found or access denied:', { sessionId, userId, sessionError });
    throw new Error(`Session not found or access denied. Session ID: ${sessionId}`);
  }

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_session_id', sessionId)
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
    .eq('id', sessionId);

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
    .eq('id', sessionId);

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