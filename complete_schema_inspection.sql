-- COMPLETE SUPABASE PUBLIC SCHEMA INSPECTION
-- This will show EVERYTHING in your database

-- =====================================================
-- 1. ALL TABLES WITH COMPLETE COLUMN DETAILS
-- =====================================================
SELECT
    '=== TABLE: ' || t.table_name || ' ===' as info,
    t.table_name,
    c.column_name,
    c.ordinal_position as pos,
    CASE
        WHEN c.data_type = 'USER-DEFINED' THEN c.udt_name
        ELSE c.data_type
    END as data_type,
    CASE
        WHEN c.character_maximum_length IS NOT NULL
        THEN '(' || c.character_maximum_length || ')'
        WHEN c.numeric_precision IS NOT NULL
        THEN '(' || c.numeric_precision || ',' || COALESCE(c.numeric_scale, 0) || ')'
        ELSE ''
    END as type_details,
    c.is_nullable,
    c.column_default,
    CASE
        WHEN pk.column_name IS NOT NULL THEN 'PRIMARY KEY'
        WHEN fk.column_name IS NOT NULL THEN 'FOREIGN KEY -> ' || fk.foreign_table_name || '.' || fk.foreign_column_name
        ELSE ''
    END as constraints
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
LEFT JOIN (
    -- Primary keys
    SELECT kcu.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
LEFT JOIN (
    -- Foreign keys
    SELECT
        kcu.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- =====================================================
-- 2. ALL CUSTOM TYPES (ENUMS, COMPOSITES)
-- =====================================================
SELECT '=== CUSTOM TYPES ===' as info;
SELECT
    t.typname as type_name,
    CASE t.typtype
        WHEN 'e' THEN 'ENUM'
        WHEN 'c' THEN 'COMPOSITE'
        WHEN 'd' THEN 'DOMAIN'
        ELSE 'OTHER'
    END as type_category,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) as values
FROM pg_type t
LEFT JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
GROUP BY t.typname, t.typtype
ORDER BY t.typname;

-- =====================================================
-- 3. ALL FUNCTIONS AND PROCEDURES
-- =====================================================
SELECT '=== FUNCTIONS ===' as info;
SELECT
    r.routine_name,
    r.routine_type,
    r.data_type as return_type,
    array_agg(
        p.parameter_name || ' ' ||
        CASE WHEN p.data_type = 'USER-DEFINED' THEN p.udt_name ELSE p.data_type END ||
        CASE p.parameter_mode WHEN 'IN' THEN '' ELSE ' ' || p.parameter_mode END
        ORDER BY p.ordinal_position
    ) as parameters
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p ON r.specific_name = p.specific_name
WHERE r.routine_schema = 'public'
    AND r.routine_type IN ('FUNCTION', 'PROCEDURE')
GROUP BY r.routine_name, r.routine_type, r.data_type, r.specific_name
ORDER BY r.routine_name;

-- =====================================================
-- 4. ALL VIEWS
-- =====================================================
SELECT '=== VIEWS ===' as info;
SELECT
    table_name as view_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- =====================================================
-- 5. ALL INDEXES
-- =====================================================
SELECT '=== INDEXES ===' as info;
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- =====================================================
-- 6. ALL TRIGGERS
-- =====================================================
SELECT '=== TRIGGERS ===' as info;
SELECT
    trigger_name,
    event_object_table as table_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- 7. ALL RLS POLICIES
-- =====================================================
SELECT '=== RLS POLICIES ===' as info;
SELECT
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

-- =====================================================
-- 8. ALL FOREIGN KEY CONSTRAINTS (DETAILED)
-- =====================================================
SELECT '=== FOREIGN KEY CONSTRAINTS ===' as info;
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- =====================================================
-- 9. TABLE SIZES AND ROW COUNTS
-- =====================================================
SELECT '=== TABLE STATISTICS ===' as info;
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.tablename AND table_schema = 'public') as column_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- 10. SAMPLE DATA FROM KEY TABLES
-- =====================================================
SELECT '=== PROFILES SAMPLE ===' as info;
SELECT * FROM profiles ORDER BY created_at DESC LIMIT 3;

SELECT '=== CHAT_SESSIONS SAMPLE ===' as info;
SELECT * FROM chat_sessions ORDER BY created_at DESC LIMIT 3;

SELECT '=== MESSAGES SAMPLE ===' as info;
SELECT * FROM messages ORDER BY created_at DESC LIMIT 5;

-- =====================================================
-- 11. SCHEMA SUMMARY
-- =====================================================
SELECT '=== SCHEMA SUMMARY ===' as info;
SELECT
    'TABLES' as object_type,
    COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

UNION ALL

SELECT
    'VIEWS' as object_type,
    COUNT(*) as count
FROM information_schema.views
WHERE table_schema = 'public'

UNION ALL

SELECT
    'FUNCTIONS' as object_type,
    COUNT(*) as count
FROM information_schema.routines
WHERE routine_schema = 'public'

UNION ALL

SELECT
    'CUSTOM_TYPES' as object_type,
    COUNT(*) as count
FROM pg_type t
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND t.typtype = 'e'

ORDER BY object_type;