import { useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  createChatSession,
  addMessageToSession,
  getUserChatSessions,
  getChatSessionMessages,
  updateSessionTitle,
  deleteChatSession,
} from '@/lib/database-supabase';
import type { Message } from '@/lib/supabase-typed';

// Cache for sessions and messages to reduce database calls
const sessionCache = new Map<string, { data: any[]; timestamp: number }>();
const messageCache = new Map<string, { data: Message[]; timestamp: number }>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for chat data

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
  message_count: number;
  last_message_at: string | null;
}

export function useSupabaseChat() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChatSessions = useCallback(async (limit: number = 20, offset: number = 0, append: boolean = false) => {
    if (!user) return;

    // Check cache first (only for initial load, not appends)
    const cacheKey = `${user.id}_${limit}_${offset}`;
    if (!append) {
      const cached = sessionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setSessions(cached.data);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      const sessionsData = await getUserChatSessions(user.id, limit, offset);

      if (append) {
        setSessions(prev => [...prev, ...sessionsData]);
      } else {
        setSessions(sessionsData);
        // Cache the result
        sessionCache.set(cacheKey, { data: sessionsData, timestamp: Date.now() });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat sessions');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadChatMessages = useCallback(async (sessionId: string) => {
    if (!user) return;

    // Check cache first
    const cached = messageCache.get(sessionId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setMessages(cached.data);
      setCurrentSessionId(sessionId);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const messagesData = await getChatSessionMessages(sessionId, user.id);

      const formattedMessages = (messagesData as any[]).map((msg: any) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        resources: msg.resources || undefined,
      })) as any;

      setMessages(formattedMessages);
      setCurrentSessionId(sessionId);

      // Cache the result
      messageCache.set(sessionId, { data: formattedMessages, timestamp: Date.now() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createNewChatSession = useCallback(async (title: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setError(null);
      const sessionId = await createChatSession(title, user.id);
      setCurrentSessionId(sessionId); // Set the current session ID
      setMessages([]); // Clear messages for new session
      await loadChatSessions(); // Refresh sessions list
      return sessionId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create chat session';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [user, loadChatSessions]);

  const addMessage = useCallback(async (
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    resources?: any
  ) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setError(null);
      const messageId = await addMessageToSession(sessionId, user.id, role, content, resources);

      // Add message to local state
      const newMessage = {
        id: messageId,
        role: role as "user" | "assistant",
        content,
        resources,
      } as any;

      setMessages(prev => [...prev, newMessage]);

      // Invalidate caches when new message is added
      messageCache.delete(sessionId);

      // Invalidate session cache (message count might have changed)
      for (const key of sessionCache.keys()) {
        if (key.startsWith(user.id)) {
          sessionCache.delete(key);
        }
      }

      return messageId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add message';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [user]);

  const updateSessionTitle = useCallback(async (sessionId: string, title: string) => {
    if (!user) return;

    try {
      setError(null);
      await updateSessionTitle(sessionId, title);
      await loadChatSessions(); // Refresh sessions list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update session title');
    }
  }, [user, loadChatSessions]);

  const deleteSession = useCallback(async (sessionId: string) => {
    if (!user) return;

    try {
      setError(null);
      await deleteChatSession(sessionId, user.id);

      // Clear current session if it's the one being deleted
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }

      await loadChatSessions(); // Refresh sessions list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  }, [user, currentSessionId, loadChatSessions]);

  const startNewChat = useCallback(() => {
    setCurrentSessionId(null);
    setMessages([]);
    setError(null);
  }, []);

  return {
    sessions,
    currentSessionId,
    messages,
    loading,
    error,
    loadChatSessions,
    loadChatMessages,
    createNewChatSession,
    addMessage,
    updateSessionTitle,
    deleteSession,
    startNewChat,
    setMessages, // For optimistic updates during streaming
  };
}