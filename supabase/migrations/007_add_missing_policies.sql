-- Migration 007: Add Only Missing RLS Policies
-- This adds only the policies that don't already exist

-- Check which tables might be missing policies and add them conditionally

-- =====================================================
-- 1. ADD MISSING POLICIES CONDITIONALLY
-- =====================================================

-- Enable RLS on tables that might not have it enabled
DO $$
BEGIN
    -- Enable RLS on tables if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'system_metrics'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'usage_analytics'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'user_sessions'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Add policies only if they don't exist
DO $$
BEGIN
    -- SYSTEM_METRICS POLICIES
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'system_metrics'
        AND policyname = 'Admins can view system metrics'
    ) THEN
        CREATE POLICY "Admins can view system metrics" ON system_metrics
            FOR SELECT TO public
            USING (EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'::user_role
            ));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'system_metrics'
        AND policyname = 'System can insert metrics'
    ) THEN
        CREATE POLICY "System can insert metrics" ON system_metrics
            FOR INSERT TO public
            WITH CHECK (true);
    END IF;

    -- USAGE_ANALYTICS POLICIES
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'usage_analytics'
        AND policyname = 'Admins can view usage analytics'
    ) THEN
        CREATE POLICY "Admins can view usage analytics" ON usage_analytics
            FOR SELECT TO public
            USING (EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'::user_role
            ));
    END IF;

    -- USER_SESSIONS POLICIES
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'user_sessions'
        AND policyname = 'Users can update their own sessions'
    ) THEN
        CREATE POLICY "Users can update their own sessions" ON user_sessions
            FOR UPDATE TO public
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'user_sessions'
        AND policyname = 'Users can view their own sessions'
    ) THEN
        CREATE POLICY "Users can view their own sessions" ON user_sessions
            FOR SELECT TO public
            USING (auth.uid() = user_id);
    END IF;

    RAISE NOTICE 'Migration 007: Missing RLS policies added successfully';
END $$;