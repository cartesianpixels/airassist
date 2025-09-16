import { useState, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  createChatSession,
  addMessageToSession,
  getUserChatSessions,
  getChatSessionMessages,
  updateChatSessionTitle,
  deleteChatSession,
} from '@/lib/database-supabase';
import type { Message } from '@/lib/types';

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

  const loadChatSessions = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const sessionsData = await getUserChatSessions(user.id);
      setSessions(sessionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat sessions');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadChatMessages = useCallback(async (sessionId: string) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const messagesData = await getChatSessionMessages(sessionId, user.id);

      const formattedMessages: Message[] = (messagesData as any[]).map((msg: any) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        resources: msg.resources || undefined,
      }));

      setMessages(formattedMessages);
      setCurrentSessionId(sessionId);
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
      const newMessage: Message = {
        id: messageId,
        role: role as "user" | "assistant",
        content,
        resources,
      };

      setMessages(prev => [...prev, newMessage]);
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
      await updateChatSessionTitle(sessionId, user.id, title);
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