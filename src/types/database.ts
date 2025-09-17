export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          tier: 'free' | 'basic' | 'pro' | 'enterprise' | null;
          role: 'user' | null;
          subscription_start: string | null;
          subscription_end: string | null;
          is_active: boolean | null;
          last_login: string | null;
          total_tokens_used: number | null;
          total_cost: number | null;
          onboarding_completed: boolean | null;
          metadata: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          tier?: 'free' | 'basic' | 'pro' | 'enterprise' | null;
          role?: 'user' | null;
          subscription_start?: string | null;
          subscription_end?: string | null;
          is_active?: boolean | null;
          last_login?: string | null;
          total_tokens_used?: number | null;
          total_cost?: number | null;
          onboarding_completed?: boolean | null;
          metadata?: any | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          tier?: 'free' | 'basic' | 'pro' | 'enterprise' | null;
          role?: 'user' | null;
          subscription_start?: string | null;
          subscription_end?: string | null;
          is_active?: boolean | null;
          last_login?: string | null;
          total_tokens_used?: number | null;
          total_cost?: number | null;
          onboarding_completed?: boolean | null;
          metadata?: any | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_sessions: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
          archived: boolean | null;
          last_message_at: string | null;
          message_count: number | null;
          model_used: string | null;
          total_tokens: number | null;
          total_cost: number | null;
          session_duration_minutes: number | null;
          metadata: any | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          created_at?: string;
          updated_at?: string;
          archived?: boolean | null;
          last_message_at?: string | null;
          message_count?: number | null;
          model_used?: string | null;
          total_tokens?: number | null;
          total_cost?: number | null;
          session_duration_minutes?: number | null;
          metadata?: any | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
          archived?: boolean | null;
          last_message_at?: string | null;
          message_count?: number | null;
          model_used?: string | null;
          total_tokens?: number | null;
          total_cost?: number | null;
          session_duration_minutes?: number | null;
          metadata?: any | null;
        };
      };
      messages: {
        Row: {
          id: string;
          chat_session_id: string;
          user_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          created_at: string;
          updated_at: string;
          model_used: string | null;
          prompt_tokens: number | null;
          completion_tokens: number | null;
          total_tokens: number | null;
          cost: number | null;
          response_time_ms: number | null;
          resources: any | null;
          metadata: any | null;
        };
        Insert: {
          id?: string;
          chat_session_id: string;
          user_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          created_at?: string;
          updated_at?: string;
          model_used?: string | null;
          prompt_tokens?: number | null;
          completion_tokens?: number | null;
          total_tokens?: number | null;
          cost?: number | null;
          response_time_ms?: number | null;
          resources?: any | null;
          metadata?: any | null;
        };
        Update: {
          id?: string;
          chat_session_id?: string;
          user_id?: string;
          role?: 'user' | 'assistant' | 'system';
          content?: string;
          created_at?: string;
          updated_at?: string;
          model_used?: string | null;
          prompt_tokens?: number | null;
          completion_tokens?: number | null;
          total_tokens?: number | null;
          cost?: number | null;
          response_time_ms?: number | null;
          resources?: any | null;
          metadata?: any | null;
        };
      };
      analytics_events: {
        Row: {
          id: string;
          user_id: string | null;
          session_id: string | null;
          event_type: 'user_login' | 'user_logout' | 'session_started' | 'session_ended' | 'message_sent' | 'response_received' | 'api_call' | 'page_view' | 'session_auto_named' | 'session_manually_renamed';
          event_data: any | null;
          ip_address: string | null;
          user_agent: string | null;
          referer: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          session_id?: string | null;
          event_type: 'user_login' | 'user_logout' | 'session_started' | 'session_ended' | 'message_sent' | 'response_received' | 'api_call' | 'page_view' | 'session_auto_named' | 'session_manually_renamed';
          event_data?: any | null;
          ip_address?: string | null;
          user_agent?: string | null;
          referer?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          session_id?: string | null;
          event_type?: 'user_login' | 'user_logout' | 'session_started' | 'session_ended' | 'message_sent' | 'response_received' | 'api_call' | 'page_view';
          event_data?: any | null;
          ip_address?: string | null;
          user_agent?: string | null;
          referer?: string | null;
          created_at?: string;
        };
      };
      api_usage_logs: {
        Row: {
          id: string;
          user_id: string | null;
          session_id: string | null;
          endpoint: string;
          method: string;
          status_code: number | null;
          response_time_ms: number | null;
          tokens_used: number | null;
          cost: number | null;
          model_used: string | null;
          prompt_tokens: number | null;
          completion_tokens: number | null;
          request_data: any | null;
          response_data: any | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          session_id?: string | null;
          endpoint: string;
          method?: string;
          status_code?: number | null;
          response_time_ms?: number | null;
          tokens_used?: number | null;
          cost?: number | null;
          model_used?: string | null;
          prompt_tokens?: number | null;
          completion_tokens?: number | null;
          request_data?: any | null;
          response_data?: any | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          session_id?: string | null;
          endpoint?: string;
          method?: string;
          status_code?: number | null;
          response_time_ms?: number | null;
          tokens_used?: number | null;
          cost?: number | null;
          model_used?: string | null;
          prompt_tokens?: number | null;
          completion_tokens?: number | null;
          request_data?: any | null;
          response_data?: any | null;
          error_message?: string | null;
          created_at?: string;
        };
      };
      rate_limits: {
        Row: {
          id: string;
          user_id: string;
          tier: 'free' | 'basic' | 'pro' | 'enterprise';
          daily_limit: number;
          monthly_limit: number;
          daily_used: number | null;
          monthly_used: number | null;
          daily_reset_at: string | null;
          monthly_reset_at: string | null;
          is_limited: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tier?: 'free' | 'basic' | 'pro' | 'enterprise';
          daily_limit?: number;
          monthly_limit?: number;
          daily_used?: number | null;
          monthly_used?: number | null;
          daily_reset_at?: string | null;
          monthly_reset_at?: string | null;
          is_limited?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tier?: 'free' | 'basic' | 'pro' | 'enterprise';
          daily_limit?: number;
          monthly_limit?: number;
          daily_used?: number | null;
          monthly_used?: number | null;
          daily_reset_at?: string | null;
          monthly_reset_at?: string | null;
          is_limited?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      system_metrics: {
        Row: {
          id: string;
          metric_name: string;
          metric_value: number;
          metric_unit: string | null;
          tags: any | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          metric_name: string;
          metric_value: number;
          metric_unit?: string | null;
          tags?: any | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          metric_name?: string;
          metric_value?: number;
          metric_unit?: string | null;
          tags?: any | null;
          created_at?: string;
        };
      };
      usage_analytics: {
        Row: {
          id: string;
          date: string;
          period_type: string;
          total_users: number | null;
          active_users: number | null;
          new_users: number | null;
          total_sessions: number | null;
          total_messages: number | null;
          total_tokens: number | null;
          total_cost: number | null;
          avg_session_length_minutes: number | null;
          avg_messages_per_session: number | null;
          most_used_model: string | null;
          error_rate: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          period_type: string;
          total_users?: number | null;
          active_users?: number | null;
          new_users?: number | null;
          total_sessions?: number | null;
          total_messages?: number | null;
          total_tokens?: number | null;
          total_cost?: number | null;
          avg_session_length_minutes?: number | null;
          avg_messages_per_session?: number | null;
          most_used_model?: string | null;
          error_rate?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          period_type?: string;
          total_users?: number | null;
          active_users?: number | null;
          new_users?: number | null;
          total_sessions?: number | null;
          total_messages?: number | null;
          total_tokens?: number | null;
          total_cost?: number | null;
          avg_session_length_minutes?: number | null;
          avg_messages_per_session?: number | null;
          most_used_model?: string | null;
          error_rate?: number | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      semantic_search: {
        Args: {
          query_embedding: number[];
          match_threshold: number;
          match_count: number;
          user_id: string | null;
        };
        Returns: {
          id: string;
          content: string;
          metadata: any;
          similarity: number;
        }[];
      };
      get_user_analytics: {
        Args: {
          p_user_id: string;
        };
        Returns: {
          total_users: number;
          active_users: number;
          total_sessions: number;
          total_messages: number;
          total_tokens: number;
          total_cost: number;
          avg_session_length_minutes: number;
          avg_messages_per_session: number;
          most_used_model: string;
          error_rate: number;
        }[];
      };
    };
  };
};

export type UserTier = 'free' | 'basic' | 'pro' | 'enterprise';
export type UserRole = 'user';
export type AnalyticsEventType = 'user_login' | 'user_logout' | 'session_started' | 'session_ended' | 'message_sent' | 'response_received' | 'api_call' | 'page_view' | 'session_auto_named' | 'session_manually_renamed';