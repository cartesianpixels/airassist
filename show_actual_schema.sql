-- Show actual tables and their columns - no counts!

-- 1. LIST ALL 12 TABLES
SELECT DISTINCT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. SHOW ALL COLUMNS FOR EACH TABLE
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 3. SHOW THE 3 CUSTOM TYPES
SELECT
    t.typname as type_name,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
FROM pg_type t
LEFT JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND t.typtype = 'e'
GROUP BY t.typname
ORDER BY t.typname;

-- 4. SHOW FOREIGN KEY RELATIONSHIPS
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 5. SHOW FUNCTIONS RELATED TO CHAT/MESSAGES/SESSIONS
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND (routine_name LIKE '%chat%'
         OR routine_name LIKE '%message%'
         OR routine_name LIKE '%session%'
         OR routine_name LIKE '%user%')
ORDER BY routine_name;