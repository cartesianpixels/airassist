-- Comprehensive Database Schema Inspection for AirAssist
-- This will show us the exact structure of your database

-- 1. Show all tables with detailed information
SELECT
    'TABLES OVERVIEW' as section,
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Detailed column information for ALL tables
SELECT
    'COLUMN DETAILS' as section,
    t.table_name,
    c.column_name,
    c.ordinal_position,
    c.data_type,
    c.character_maximum_length,
    c.is_nullable,
    c.column_default,
    CASE
        WHEN c.data_type = 'USER-DEFINED' THEN c.udt_name
        ELSE c.data_type
    END as actual_type
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- 3. Show all foreign key relationships
SELECT
    'FOREIGN KEYS' as section,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- 4. Show all primary keys
SELECT
    'PRIMARY KEYS' as section,
    tc.table_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 5. Show all custom types (enums, etc.)
SELECT
    'CUSTOM TYPES' as section,
    t.typname as type_name,
    CASE
        WHEN t.typtype = 'e' THEN 'enum'
        WHEN t.typtype = 'c' THEN 'composite'
        WHEN t.typtype = 'd' THEN 'domain'
        ELSE t.typtype::text
    END as type_type,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
FROM pg_type t
LEFT JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND t.typtype = 'e'
GROUP BY t.typname, t.typtype
ORDER BY t.typname;

-- 6. Show all functions related to chat
SELECT
    'FUNCTIONS' as section,
    routine_name,
    routine_type,
    specific_name,
    data_type as return_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND (routine_name LIKE '%chat%'
         OR routine_name LIKE '%message%'
         OR routine_name LIKE '%session%'
         OR routine_name LIKE '%user%')
ORDER BY routine_name;

-- 7. Show current data samples
SELECT 'CHAT SESSIONS DATA' as section;
SELECT
    id,
    user_id,
    title,
    archived,
    created_at,
    updated_at,
    CASE WHEN 'model_used' IN (
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'chat_sessions' AND table_schema = 'public'
    ) THEN 'HAS model_used column' ELSE 'NO model_used column' END as model_used_status
FROM chat_sessions
ORDER BY created_at DESC;

SELECT 'MESSAGES DATA' as section;
SELECT
    id,
    chat_session_id,
    role,
    content,
    created_at,
    CASE WHEN 'user_id' IN (
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'messages' AND table_schema = 'public'
    ) THEN 'HAS user_id column' ELSE 'NO user_id column' END as user_id_status
FROM messages
ORDER BY created_at DESC
LIMIT 10;

SELECT 'PROFILES DATA' as section;
SELECT
    id,
    email,
    full_name,
    created_at,
    CASE WHEN 'tier' IN (
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'profiles' AND table_schema = 'public'
    ) THEN 'HAS tier column' ELSE 'NO tier column' END as tier_status
FROM profiles
ORDER BY created_at DESC;

-- 8. Check RLS policies
SELECT
    'RLS POLICIES' as section,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 9. Show indexes
SELECT
    'INDEXES' as section,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname NOT LIKE '%_pkey'  -- Skip primary key indexes
ORDER BY tablename, indexname;

-- 10. Check if migration 004 functions exist
SELECT
    'MIGRATION STATUS' as section,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'add_message_to_session'
        AND routine_schema = 'public'
    ) THEN 'add_message_to_session function EXISTS'
    ELSE 'add_message_to_session function MISSING'
    END as function_status;