-- Debug knowledge base table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'knowledge_base'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'knowledge_base'
);

-- Check function exists
SELECT EXISTS (
    SELECT FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name = 'search_knowledge_base'
);

-- Count records
SELECT COUNT(*) as record_count FROM knowledge_base;