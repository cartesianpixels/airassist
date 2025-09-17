import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

export interface AnalyticsEvent {
  id: string;
  userId: string;
  sessionId?: string;
  eventType: 'message_sent' | 'response_received' | 'session_started' | 'session_ended' | 'user_login' | 'user_logout';
  metadata: {
    model?: string;
    tokenCount?: number;
    responseTime?: number;
    cost?: number;
    messageLength?: number;
    userAgent?: string;
    timestamp: number;
  };
}

export interface UsageMetrics {
  daily: {
    date: string;
    sessions: number;
    messages: number;
    tokens: number;
    cost: number;
    uniqueUsers: number;
  }[];
  weekly: {
    week: string;
    sessions: number;
    messages: number;
    tokens: number;
    cost: number;
    uniqueUsers: number;
  }[];
  monthly: {
    month: string;
    sessions: number;
    messages: number;
    tokens: number;
    cost: number;
    uniqueUsers: number;
  }[];
}

export interface SystemMetrics {
  activeUsers: number;
  totalUsers: number;
  averageResponseTime: number;
  errorRate: number;
  totalTokensToday: number;
  totalCostToday: number;
  uptime: number;
  lastUpdated: string;
}

export interface RateLimitInfo {
  userId: string;
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
  dailyLimit: number;
  monthlyLimit: number;
  dailyUsage: number;
  monthlyUsage: number;
  resetDate: string;
  isLimited: boolean;
}

interface AnalyticsState {
  // Events
  events: AnalyticsEvent[];
  eventsLoading: boolean;
  
  // Usage metrics
  usageMetrics: UsageMetrics | null;
  usageMetricsLoading: boolean;
  
  // System metrics
  systemMetrics: SystemMetrics | null;
  systemMetricsLoading: boolean;
  
  // Rate limiting
  userRateLimit: RateLimitInfo | null;
  rateLimitLoading: boolean;
  
  // Errors
  error: string | null;
  
  // Actions
  addEvent: (event: Omit<AnalyticsEvent, 'id'>) => void;
  setEvents: (events: AnalyticsEvent[]) => void;
  setUsageMetrics: (metrics: UsageMetrics) => void;
  setSystemMetrics: (metrics: SystemMetrics) => void;
  setUserRateLimit: (rateLimit: RateLimitInfo) => void;
  
  // Loading actions
  setEventsLoading: (loading: boolean) => void;
  setUsageMetricsLoading: (loading: boolean) => void;
  setSystemMetricsLoading: (loading: boolean) => void;
  setRateLimitLoading: (loading: boolean) => void;
  
  // Error actions
  setError: (error: string | null) => void;
  
  // Utility actions
  reset: () => void;
  
  // Analytics helpers
  incrementDailyUsage: () => void;
  trackMessageSent: (sessionId: string, messageLength: number) => void;
  trackResponseReceived: (sessionId: string, model: string, tokenCount: number, responseTime: number, cost: number) => void;
  trackSessionStarted: (sessionId: string) => void;
  trackSessionEnded: (sessionId: string) => void;
}

const initialState = {
  events: [],
  eventsLoading: false,
  usageMetrics: null,
  usageMetricsLoading: false,
  systemMetrics: null,
  systemMetricsLoading: false,
  userRateLimit: null,
  rateLimitLoading: false,
  error: null,
};

export const useAnalyticsStore = create<AnalyticsState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,
      
      // Event actions
      addEvent: (eventData) => {
        const event: AnalyticsEvent = {
          ...eventData,
          id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
        
        set((state) => ({
          events: [...state.events, event]
        }));
        
        // TODO: Send to analytics API
        console.log('Analytics event:', event);
      },
      
      setEvents: (events) => set({ events }),
      
      setUsageMetrics: (usageMetrics) => set({ usageMetrics }),
      
      setSystemMetrics: (systemMetrics) => set({ systemMetrics }),
      
      setUserRateLimit: (userRateLimit) => set({ userRateLimit }),
      
      // Loading actions
      setEventsLoading: (loading) => set({ eventsLoading: loading }),
      
      setUsageMetricsLoading: (loading) => set({ usageMetricsLoading: loading }),
      
      setSystemMetricsLoading: (loading) => set({ systemMetricsLoading: loading }),
      
      setRateLimitLoading: (loading) => set({ rateLimitLoading: loading }),
      
      // Error actions
      setError: (error) => set({ error }),
      
      // Utility actions
      reset: () => set(initialState),
      
      // Analytics helpers
      incrementDailyUsage: () => {
        const { userRateLimit } = get();
        if (userRateLimit) {
          set({
            userRateLimit: {
              ...userRateLimit,
              dailyUsage: userRateLimit.dailyUsage + 1,
              monthlyUsage: userRateLimit.monthlyUsage + 1,
              isLimited: userRateLimit.dailyUsage + 1 >= userRateLimit.dailyLimit
            }
          });
        }
      },
      
      trackMessageSent: (sessionId, messageLength) => {
        const { addEvent } = get();
        addEvent({
          userId: 'current-user', // TODO: Get from auth context
          sessionId,
          eventType: 'message_sent',
          metadata: {
            messageLength,
            timestamp: Date.now(),
          }
        });
      },
      
      trackResponseReceived: (sessionId, model, tokenCount, responseTime, cost) => {
        const { addEvent } = get();
        addEvent({
          userId: 'current-user', // TODO: Get from auth context
          sessionId,
          eventType: 'response_received',
          metadata: {
            model,
            tokenCount,
            responseTime,
            cost,
            timestamp: Date.now(),
          }
        });
      },
      
      trackSessionStarted: (sessionId) => {
        const { addEvent } = get();
        addEvent({
          userId: 'current-user', // TODO: Get from auth context
          sessionId,
          eventType: 'session_started',
          metadata: {
            timestamp: Date.now(),
          }
        });
      },
      
      trackSessionEnded: (sessionId) => {
        const { addEvent } = get();
        addEvent({
          userId: 'current-user', // TODO: Get from auth context
          sessionId,
          eventType: 'session_ended',
          metadata: {
            timestamp: Date.now(),
          }
        });
      },
    })),
    {
      name: 'analytics-store',
    }
  )
);