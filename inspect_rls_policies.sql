-- Inspect all RLS policies in the database
SELECT
    'RLS POLICIES FOR CHAT_SESSIONS' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'chat_sessions'
ORDER BY tablename, policyname;

-- Check if RLS is enabled on tables
SELECT
    'RLS STATUS' as info,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('chat_sessions', 'messages', 'profiles')
ORDER BY tablename;

-- Show all policies for all tables
SELECT
    'ALL RLS POLICIES' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;