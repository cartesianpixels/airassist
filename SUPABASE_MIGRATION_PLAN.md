# 🚀 Supabase Cloud Migration & Vercel Deployment Plan

## 📊 Current State
- **Database**: Local PostgreSQL with pgvector
- **Tables**: `knowledge_base`, `chat_sessions`, `messages`
- **Features**: Vector embeddings, semantic search
- **Deployment**: Currently local development

## 🎯 Target State
- **Database**: Supabase Cloud (PostgreSQL + Auth + RLS)
- **Frontend**: Next.js deployed on Vercel
- **Auth**: Google OAuth via Supabase Auth
- **Features**: User sessions, chat persistence, production-ready

---

## 📋 Phase 1: Database Migration to Supabase Cloud

### Step 1.1: Supabase Project Setup
- [ ] Create new Supabase project
- [ ] Enable pgvector extension
- [ ] Configure project settings
- [ ] Save API keys and connection strings

### Step 1.2: Enhanced Schema Creation
```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- User profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced chat sessions with user ownership
CREATE TABLE public.chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enhanced messages with user context
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  resources JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enhanced knowledge base
CREATE TABLE public.knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  display_name TEXT NOT NULL,
  summary TEXT,
  tags JSONB,
  metadata JSONB NOT NULL,
  embedding VECTOR(1536),
  access_level TEXT DEFAULT 'public' CHECK (access_level IN ('public', 'premium', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- User settings
CREATE TABLE public.user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language TEXT DEFAULT 'en',
  notifications JSONB DEFAULT '{"email": true, "push": false}'::jsonb,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Step 1.3: Row Level Security (RLS) Setup
```sql
-- Enable RLS on all user tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Knowledge base is public read, admin write
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Chat sessions policies
CREATE POLICY "Users can view own chat sessions" ON public.chat_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own chat sessions" ON public.chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chat sessions" ON public.chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own chat sessions" ON public.chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Knowledge base policies
CREATE POLICY "Anyone can read knowledge base" ON public.knowledge_base
  FOR SELECT USING (true);

-- User settings policies
CREATE POLICY "Users can manage own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);
```

### Step 1.4: Data Migration Script
- [ ] Create migration script to export from local PostgreSQL
- [ ] Transform data to match new schema structure
- [ ] Import knowledge base data to Supabase
- [ ] Verify data integrity and vector embeddings

### Step 1.5: Database Functions
```sql
-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function for semantic search with user context
CREATE OR REPLACE FUNCTION public.semantic_search(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  display_name text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    kb.id,
    kb.content,
    kb.display_name,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM knowledge_base kb
  WHERE 1 - (kb.embedding <=> query_embedding) > match_threshold
    AND (kb.access_level = 'public' OR kb.created_by = user_id)
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

---

## 📋 Phase 2: Authentication Setup

### Step 2.1: Google OAuth Configuration
- [ ] Create Google Cloud Console project
- [ ] Set up OAuth consent screen
- [ ] Create OAuth 2.0 credentials
- [ ] Configure authorized redirect URIs for Supabase
- [ ] Enable Google OAuth in Supabase Auth settings

### Step 2.2: Supabase Auth Configuration
- [ ] Configure site URL and redirect URLs
- [ ] Set up email templates
- [ ] Configure session settings
- [ ] Test authentication flow

---

## 📋 Phase 3: Next.js Application Updates

### Step 3.1: Install Dependencies
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/auth-helpers-react
npm install @supabase/auth-ui-react @supabase/auth-ui-shared
```

### Step 3.2: Environment Configuration
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key

# For Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Step 3.3: Supabase Client Setup
```typescript
// lib/supabase.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const createClient = () => createClientComponentClient()
export const createServerClient = () => createServerComponentClient({ cookies })

// types/database.ts
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
      // ... other table types
    }
  }
}
```

### Step 3.4: Authentication Components
- [ ] Create `AuthProvider` context component
- [ ] Build login/signup page with Google OAuth
- [ ] Create protected route middleware
- [ ] Build user profile management
- [ ] Implement logout functionality

### Step 3.5: Database Integration Updates
- [ ] Replace local PostgreSQL client with Supabase client
- [ ] Update semantic search to use Supabase functions
- [ ] Modify chat session management for user ownership
- [ ] Update message persistence with user context
- [ ] Add user settings management

### Step 3.6: UI Enhancements
- [ ] Add user authentication state to existing chat UI
- [ ] Create dashboard for chat history
- [ ] Add user menu and profile settings
- [ ] Implement chat session persistence
- [ ] Add loading states for auth operations

---

## 📋 Phase 4: Vercel Deployment

### Step 4.1: Vercel Project Setup
- [ ] Connect GitHub repository to Vercel
- [ ] Configure build settings for Next.js
- [ ] Set up environment variables in Vercel dashboard
- [ ] Configure custom domain (if needed)

### Step 4.2: Production Environment Variables
```env
# Vercel Environment Variables
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
OPENAI_API_KEY=your_openai_key
```

### Step 4.3: Deployment Configuration
```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### Step 4.4: Production Testing
- [ ] Test authentication flow in production
- [ ] Verify database connections and RLS policies
- [ ] Test chat functionality with user sessions
- [ ] Validate semantic search performance
- [ ] Monitor for any production-specific issues

---

## 📋 Phase 5: Data Migration Execution

### Step 5.1: Migration Script Creation
```typescript
// scripts/migrate-to-supabase.ts
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function migrateKnowledgeBase() {
  // Read existing data from SQL dump
  // Transform to new schema
  // Insert into Supabase with proper structure
}

async function main() {
  console.log('Starting migration to Supabase...')
  await migrateKnowledgeBase()
  console.log('Migration completed!')
}

main().catch(console.error)
```

### Step 5.2: Migration Execution
- [ ] Run migration script to transfer knowledge base
- [ ] Verify vector embeddings are properly migrated
- [ ] Test semantic search functionality
- [ ] Create backup of migrated data

---

## 🎯 Success Criteria

### Authentication
- [ ] Users can sign in with Google OAuth
- [ ] User sessions persist across browser sessions
- [ ] Protected routes work correctly
- [ ] User profiles are created automatically

### Chat Functionality
- [ ] Users can create and manage chat sessions
- [ ] Messages are saved and associated with users
- [ ] Chat history persists and loads correctly
- [ ] Semantic search works with user context

### Production Deployment
- [ ] Application deployed successfully on Vercel
- [ ] All environment variables configured
- [ ] Database connections working in production
- [ ] Performance meets requirements

### Data Integrity
- [ ] All knowledge base data migrated successfully
- [ ] Vector embeddings function correctly
- [ ] RLS policies enforce proper data access
- [ ] No data loss during migration

---

## 📁 New File Structure

```
src/
├── app/
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── callback/
│   │       └── route.ts
│   ├── dashboard/
│   │   └── page.tsx
│   └── api/
│       └── chat/
│           └── route.ts (updated for Supabase)
├── components/
│   ├── auth/
│   │   ├── AuthProvider.tsx
│   │   ├── LoginButton.tsx
│   │   └── UserMenu.tsx
│   ├── chat/ (existing, enhanced with auth)
│   └── dashboard/
│       ├── ChatHistory.tsx
│       └── UserSettings.tsx
├── lib/
│   ├── supabase.ts
│   ├── auth.ts
│   └── database.ts (updated)
├── types/
│   └── database.ts
└── middleware.ts
```

This plan focuses on the core migration to Supabase Cloud and production deployment on Vercel, removing the complexity of self-hosted solutions while maintaining all the enhanced features needed for a production-ready application.