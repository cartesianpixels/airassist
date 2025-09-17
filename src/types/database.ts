export type UserTier = 'free' | 'basic' | 'pro' | 'enterprise';
export type UserRole = 'user' | 'moderator' | 'admin';
export type AnalyticsEventType = 'user_login' | 'user_logout' | 'session_started' | 'session_ended' | 'message_sent' | 'response_received' | 'api_call' | 'page_view';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          tier: UserTier
          role: UserRole
          subscription_start: string | null
          subscription_end: string | null
          is_active: boolean
          last_login: string | null
          total_tokens_used: number
          total_cost: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          tier?: UserTier
          role?: UserRole
          subscription_start?: string | null
          subscription_end?: string | null
          is_active?: boolean
          last_login?: string | null
          total_tokens_used?: number
          total_cost?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          tier?: UserTier
          role?: UserRole
          subscription_start?: string | null
          subscription_end?: string | null
          is_active?: boolean
          last_login?: string | null
          total_tokens_used?: number
          total_cost?: number
          updated_at?: string
        }
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
          updated_at: string
          archived: boolean
          model_used: string
          total_tokens: number
          total_cost: number
          session_duration_minutes: number
          metadata: Record<string, any>
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          created_at?: string
          updated_at?: string
          archived?: boolean
          model_used?: string
          total_tokens?: number
          total_cost?: number
          session_duration_minutes?: number
          metadata?: Record<string, any>
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
          updated_at?: string
          archived?: boolean
          model_used?: string
          total_tokens?: number
          total_cost?: number
          session_duration_minutes?: number
          metadata?: Record<string, any>
        }
      }
      messages: {
        Row: {
          id: string
          chat_session_id: string
          user_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          resources: Record<string, any> | null
          metadata: Record<string, any>
          model_used: string
          prompt_tokens: number
          completion_tokens: number
          total_tokens: number
          cost: number
          response_time_ms: number
          created_at: string
        }
        Insert: {
          id?: string
          chat_session_id: string
          user_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          resources?: Record<string, any> | null
          metadata?: Record<string, any>
          model_used?: string
          prompt_tokens?: number
          completion_tokens?: number
          total_tokens?: number
          cost?: number
          response_time_ms?: number
          created_at?: string
        }
        Update: {
          id?: string
          chat_session_id?: string
          user_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          resources?: Record<string, any> | null
          metadata?: Record<string, any>
          model_used?: string
          prompt_tokens?: number
          completion_tokens?: number
          total_tokens?: number
          cost?: number
          response_time_ms?: number
          created_at?: string
        }
      }
      knowledge_base: {
        Row: {
          id: string
          content: string
          display_name: string
          summary: string | null
          tags: Record<string, any> | null
          metadata: Record<string, any>
          embedding: number[] | null
          access_level: 'public' | 'premium' | 'admin'
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          content: string
          display_name: string
          summary?: string | null
          tags?: Record<string, any> | null
          metadata: Record<string, any>
          embedding?: number[] | null
          access_level?: 'public' | 'premium' | 'admin'
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          content?: string
          display_name?: string
          summary?: string | null
          tags?: Record<string, any> | null
          metadata?: Record<string, any>
          embedding?: number[] | null
          access_level?: 'public' | 'premium' | 'admin'
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          theme: 'light' | 'dark' | 'auto'
          language: string
          notifications: Record<string, any>
          preferences: Record<string, any>
          ai_preferences: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          theme?: 'light' | 'dark' | 'auto'
          language?: string
          notifications?: Record<string, any>
          preferences?: Record<string, any>
          ai_preferences?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          theme?: 'light' | 'dark' | 'auto'
          language?: string
          notifications?: Record<string, any>
          preferences?: Record<string, any>
          ai_preferences?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }
      analytics_events: {
        Row: {
          id: string
          user_id: string
          session_id: string | null
          event_type: AnalyticsEventType
          event_data: Record<string, any>
          ip_address: string | null
          user_agent: string | null
          referer: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id?: string | null
          event_type: AnalyticsEventType
          event_data?: Record<string, any>
          ip_address?: string | null
          user_agent?: string | null
          referer?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string | null
          event_type?: AnalyticsEventType
          event_data?: Record<string, any>
          ip_address?: string | null
          user_agent?: string | null
          referer?: string | null
          created_at?: string
        }
      }
      api_usage_logs: {
        Row: {
          id: string
          user_id: string
          session_id: string | null
          endpoint: string
          method: string
          status_code: number
          response_time_ms: number
          tokens_used: number
          cost: number
          model_used: string
          prompt_tokens: number
          completion_tokens: number
          request_data: Record<string, any>
          response_data: Record<string, any>
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id?: string | null
          endpoint: string
          method?: string
          status_code?: number
          response_time_ms?: number
          tokens_used?: number
          cost?: number
          model_used?: string
          prompt_tokens?: number
          completion_tokens?: number
          request_data?: Record<string, any>
          response_data?: Record<string, any>
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string | null
          endpoint?: string
          method?: string
          status_code?: number
          response_time_ms?: number
          tokens_used?: number
          cost?: number
          model_used?: string
          prompt_tokens?: number
          completion_tokens?: number
          request_data?: Record<string, any>
          response_data?: Record<string, any>
          error_message?: string | null
          created_at?: string
        }
      }
      rate_limits: {
        Row: {
          id: string
          user_id: string
          tier: UserTier
          daily_limit: number
          monthly_limit: number
          daily_used: number
          monthly_used: number
          daily_reset_at: string
          monthly_reset_at: string
          is_limited: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tier?: UserTier
          daily_limit?: number
          monthly_limit?: number
          daily_used?: number
          monthly_used?: number
          daily_reset_at?: string
          monthly_reset_at?: string
          is_limited?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tier?: UserTier
          daily_limit?: number
          monthly_limit?: number
          daily_used?: number
          monthly_used?: number
          daily_reset_at?: string
          monthly_reset_at?: string
          is_limited?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      model_configurations: {
        Row: {
          id: string
          model_id: string
          model_name: string
          provider: string
          cost_per_1k_input_tokens: number
          cost_per_1k_output_tokens: number
          max_tokens: number
          context_window: number
          available_for_tiers: UserTier[]
          is_active: boolean
          features: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          model_id: string
          model_name: string
          provider: string
          cost_per_1k_input_tokens: number
          cost_per_1k_output_tokens: number
          max_tokens: number
          context_window: number
          available_for_tiers?: UserTier[]
          is_active?: boolean
          features?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          model_id?: string
          model_name?: string
          provider?: string
          cost_per_1k_input_tokens?: number
          cost_per_1k_output_tokens?: number
          max_tokens?: number
          context_window?: number
          available_for_tiers?: UserTier[]
          is_active?: boolean
          features?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      semantic_search: {
        Args: {
          query_embedding: number[]
          match_threshold?: number
          match_count?: number
          user_id?: string | null
        }
        Returns: {
          id: string
          content: string
          display_name: string
          summary: string | null
          metadata: Record<string, any>
          similarity: number
        }[]
      }
      get_user_chat_sessions: {
        Args: {
          user_id: string
        }
        Returns: {
          id: string
          title: string
          created_at: string
          updated_at: string
          archived: boolean
          message_count: number
          last_message_at: string | null
        }[]
      }
      create_chat_session: {
        Args: {
          session_title: string
          user_id: string
        }
        Returns: string
      }
      add_message_to_session: {
        Args: {
          session_id: string
          user_id: string
          message_role: 'user' | 'assistant' | 'system'
          message_content: string
          message_resources?: Record<string, any> | null
        }
        Returns: string
      }
    }
  }
}