import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
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

interface ChatState {
  // Session management
  sessions: ChatSession[];
  currentSessionId: string | null;
  messages: Message[];
  
  // UI state
  sidebarOpen: boolean;
  isThinking: boolean;
  streamingMessageId: string | null;
  
  // Loading states
  sessionsLoading: boolean;
  messagesLoading: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  setSessions: (sessions: ChatSession[]) => void;
  setCurrentSessionId: (sessionId: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;
  
  // UI actions
  setSidebarOpen: (open: boolean) => void;
  setIsThinking: (thinking: boolean) => void;
  setStreamingMessageId: (messageId: string | null) => void;
  
  // Loading actions
  setSessionsLoading: (loading: boolean) => void;
  setMessagesLoading: (loading: boolean) => void;
  
  // Error actions
  setError: (error: string | null) => void;
  
  // Utility actions
  reset: () => void;
  clearCurrentSession: () => void;
}

const initialState = {
  sessions: [],
  currentSessionId: null,
  messages: [],
  sidebarOpen: false,
  isThinking: false,
  streamingMessageId: null,
  sessionsLoading: false,
  messagesLoading: false,
  error: null,
};

export const useChatStore = create<ChatState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,
      
      // Session actions
      setSessions: (sessions) => set({ sessions }),
      
      setCurrentSessionId: (sessionId) => set({ currentSessionId: sessionId }),
      
      setMessages: (messages) => set({ messages }),
      
      addMessage: (message) => set((state) => ({
        messages: [...state.messages, message]
      })),
      
      updateMessage: (messageId, updates) => set((state) => ({
        messages: state.messages.map(msg => 
          msg.id === messageId ? { ...msg, ...updates } : msg
        )
      })),
      
      removeMessage: (messageId) => set((state) => ({
        messages: state.messages.filter(msg => msg.id !== messageId)
      })),
      
      // UI actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      setIsThinking: (thinking) => set({ isThinking: thinking }),
      
      setStreamingMessageId: (messageId) => set({ streamingMessageId: messageId }),
      
      // Loading actions
      setSessionsLoading: (loading) => set({ sessionsLoading: loading }),
      
      setMessagesLoading: (loading) => set({ messagesLoading: loading }),
      
      // Error actions
      setError: (error) => set({ error }),
      
      // Utility actions
      reset: () => set(initialState),
      
      clearCurrentSession: () => set({ 
        currentSessionId: null, 
        messages: [],
        streamingMessageId: null,
        isThinking: false 
      }),
    })),
    {
      name: 'chat-store',
    }
  )
);