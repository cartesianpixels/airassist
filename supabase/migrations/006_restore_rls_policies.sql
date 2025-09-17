-- Migration 006: Restore All RLS Policies
-- This restores all the existing RLS policies that were identified

-- =====================================================
-- 1. ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. ANALYTICS_EVENTS POLICIES
-- =====================================================

CREATE POLICY "System can insert analytics events" ON analytics_events
    FOR INSERT TO public
    WITH CHECK (true);

CREATE POLICY "Users can view their own analytics events" ON analytics_events
    FOR SELECT TO public
    USING (auth.uid() = user_id);

-- =====================================================
-- 3. API_USAGE_LOGS POLICIES
-- =====================================================

CREATE POLICY "System can insert API usage logs" ON api_usage_logs
    FOR INSERT TO public
    WITH CHECK (true);

CREATE POLICY "Users can view their own API usage" ON api_usage_logs
    FOR SELECT TO public
    USING (auth.uid() = user_id);

-- =====================================================
-- 4. CHAT_SESSIONS POLICIES
-- =====================================================

CREATE POLICY "Users can create own chat sessions" ON chat_sessions
    FOR INSERT TO public
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat sessions" ON chat_sessions
    FOR DELETE TO public
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions" ON chat_sessions
    FOR UPDATE TO public
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own chat sessions" ON chat_sessions
    FOR SELECT TO public
    USING (auth.uid() = user_id);

-- =====================================================
-- 5. KNOWLEDGE_BASE POLICIES
-- =====================================================

CREATE POLICY "Anyone can read knowledge base" ON knowledge_base
    FOR SELECT TO public
    USING ((access_level = 'public'::text) OR (auth.uid() = created_by));

CREATE POLICY "Authenticated users can create knowledge base entries" ON knowledge_base
    FOR INSERT TO public
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own knowledge base entries" ON knowledge_base
    FOR DELETE TO public
    USING (auth.uid() = created_by);

CREATE POLICY "Users can update own knowledge base entries" ON knowledge_base
    FOR UPDATE TO public
    USING (auth.uid() = created_by);

-- =====================================================
-- 6. MESSAGES POLICIES
-- =====================================================

CREATE POLICY "Users can create own messages" ON messages
    FOR INSERT TO public
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages" ON messages
    FOR DELETE TO public
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own messages" ON messages
    FOR UPDATE TO public
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own messages" ON messages
    FOR SELECT TO public
    USING (auth.uid() = user_id);

-- =====================================================
-- 7. MODEL_CONFIGURATIONS POLICIES
-- =====================================================

CREATE POLICY "Everyone can view active model configurations" ON model_configurations
    FOR SELECT TO public
    USING (is_active = true);

-- =====================================================
-- 8. PROFILES POLICIES
-- =====================================================

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT TO public
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE TO public
    USING (auth.uid() = id);

CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT TO public
    USING (auth.uid() = id);

-- =====================================================
-- 9. RATE_LIMITS POLICIES
-- =====================================================

CREATE POLICY "Users can update their own rate limits" ON rate_limits
    FOR UPDATE TO public
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own rate limits" ON rate_limits
    FOR SELECT TO public
    USING (auth.uid() = user_id);

-- =====================================================
-- 10. SYSTEM_METRICS POLICIES
-- =====================================================

CREATE POLICY "Admins can view system metrics" ON system_metrics
    FOR SELECT TO public
    USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'::user_role
    ));

CREATE POLICY "System can insert metrics" ON system_metrics
    FOR INSERT TO public
    WITH CHECK (true);

-- =====================================================
-- 11. USAGE_ANALYTICS POLICIES
-- =====================================================

CREATE POLICY "Admins can view usage analytics" ON usage_analytics
    FOR SELECT TO public
    USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'::user_role
    ));

-- =====================================================
-- 12. USER_SESSIONS POLICIES
-- =====================================================

CREATE POLICY "Users can update their own sessions" ON user_sessions
    FOR UPDATE TO public
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT TO public
    USING (auth.uid() = user_id);

-- =====================================================
-- 13. USER_SETTINGS POLICIES
-- =====================================================

CREATE POLICY "Users can create own settings" ON user_settings
    FOR INSERT TO public
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON user_settings
    FOR DELETE TO public
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
    FOR UPDATE TO public
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own settings" ON user_settings
    FOR SELECT TO public
    USING (auth.uid() = user_id);

-- =====================================================
-- 14. VERIFICATION
-- =====================================================

-- Verify policies were created
DO $$
BEGIN
    RAISE NOTICE 'Migration 006: RLS policies restored successfully';
    RAISE NOTICE 'Total policies created: %', (
        SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public'
    );
END $$;