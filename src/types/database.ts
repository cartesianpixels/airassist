export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
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
          metadata: Record<string, any>
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          created_at?: string
          updated_at?: string
          archived?: boolean
          metadata?: Record<string, any>
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
          updated_at?: string
          archived?: boolean
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
          created_at: string
          metadata: Record<string, any>
        }
        Insert: {
          id?: string
          chat_session_id: string
          user_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          resources?: Record<string, any> | null
          created_at?: string
          metadata?: Record<string, any>
        }
        Update: {
          id?: string
          chat_session_id?: string
          user_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          resources?: Record<string, any> | null
          created_at?: string
          metadata?: Record<string, any>
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