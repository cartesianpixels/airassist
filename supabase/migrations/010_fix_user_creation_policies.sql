-- Fix RLS policies to allow proper user registration and analytics flow
-- Migration: Enable user profile creation and analytics tracking

-- =============================================
-- FIX PROFILES TABLE POLICIES
-- =============================================

-- Drop restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create proper policies for user registration flow
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- CRITICAL: Allow authenticated users to insert profiles
-- This is needed for the registration flow
CREATE POLICY "Authenticated users can insert profiles" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow service role to manage any profile
CREATE POLICY "Service role can manage profiles" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- FIX RATE_LIMITS TABLE POLICIES
-- =============================================

-- Drop and recreate rate limits policies
DROP POLICY IF EXISTS "Users can view their own rate limits" ON rate_limits;
DROP POLICY IF EXISTS "Users can update their own rate limits" ON rate_limits;
DROP POLICY IF EXISTS "Users can insert their own rate limits" ON rate_limits;

CREATE POLICY "Users can view their own rate limits" ON rate_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own rate limits" ON rate_limits
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow system to create rate limits for users
CREATE POLICY "System can insert rate limits" ON rate_limits
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can manage rate limits" ON rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- FIX ANALYTICS_EVENTS POLICIES
-- =============================================

-- Update analytics events policies to allow proper tracking
DROP POLICY IF EXISTS "Users can view their own analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Users can insert their own analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Service role can insert analytics events" ON analytics_events;

CREATE POLICY "Users can view their own analytics events" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Allow any authenticated user to insert analytics events
CREATE POLICY "Authenticated users can insert analytics events" ON analytics_events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage analytics events" ON analytics_events
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- FIX API_USAGE_LOGS POLICIES
-- =============================================

DROP POLICY IF EXISTS "Users can view their own API usage" ON api_usage_logs;
DROP POLICY IF EXISTS "Users can insert their own API usage logs" ON api_usage_logs;
DROP POLICY IF EXISTS "Service role can insert API usage logs" ON api_usage_logs;

CREATE POLICY "Users can view their own API usage" ON api_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Allow authenticated users to log their API usage
CREATE POLICY "Authenticated users can insert API usage logs" ON api_usage_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- =============================================
-- FIX USER_SESSIONS POLICIES
-- =============================================

DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON user_sessions;

CREATE POLICY "Users can view their own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert sessions" ON user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- CREATE USER REGISTRATION TRIGGER
-- =============================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );

  -- Create rate limits for new user
  INSERT INTO public.rate_limits (user_id, tier, daily_limit, monthly_limit)
  VALUES (new.id, 'free', 100, 1000);

  -- Track user registration event
  INSERT INTO public.analytics_events (user_id, event_type, event_data)
  VALUES (
    new.id,
    'user_login',
    jsonb_build_object(
      'registration', true,
      'provider', new.app_metadata->>'provider',
      'created_at', new.created_at
    )
  );

  RETURN new;
END;
$$ language plpgsql security definer;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- =============================================
-- CREATE MISSING USER_SETTINGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  theme TEXT DEFAULT 'auto' CHECK (theme IN ('light', 'dark', 'auto')),
  language TEXT DEFAULT 'en',
  notifications JSONB DEFAULT '{
    "email": true,
    "browser": true,
    "sessions": false
  }'::jsonb,
  ai_preferences JSONB DEFAULT '{
    "defaultModel": "gpt-4o-mini",
    "maxTokens": 1500,
    "temperature": 0.7,
    "streamingEnabled": true,
    "autoSave": true
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create RLS policies for user_settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- =============================================
-- UPDATE EXISTING FUNCTIONS
-- =============================================

-- Update the user rate limit function to work with new policies
CREATE OR REPLACE FUNCTION get_user_rate_limit(p_user_id UUID)
RETURNS TABLE (
  tier user_tier,
  daily_limit INTEGER,
  monthly_limit INTEGER,
  daily_used INTEGER,
  monthly_used INTEGER,
  daily_remaining INTEGER,
  monthly_remaining INTEGER,
  is_limited BOOLEAN,
  daily_reset_at TIMESTAMPTZ,
  monthly_reset_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rl.tier,
    rl.daily_limit,
    rl.monthly_limit,
    rl.daily_used,
    rl.monthly_used,
    (rl.daily_limit - rl.daily_used) as daily_remaining,
    (rl.monthly_limit - rl.monthly_used) as monthly_remaining,
    (rl.daily_used >= rl.daily_limit OR rl.monthly_used >= rl.monthly_limit) as is_limited,
    rl.daily_reset_at,
    rl.monthly_reset_at
  FROM rate_limits rl
  WHERE rl.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Fix RLS policies to enable proper user registration and analytics tracking