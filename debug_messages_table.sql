-- Debug the messages table issue
-- Run this to understand the current state

-- Check if there are multiple messages tables or partitions
SELECT
    schemaname,
    tablename,
    tableowner,
    tablespace,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables
WHERE tablename = 'messages'
AND schemaname = 'public';

-- Check the exact structure of the messages table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'messages'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any foreign key issues
SELECT
    constraint_name,
    table_name,
    column_name,
    foreign_table_name,
    foreign_column_name
FROM (
    SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'messages'
) AS fk_info;

-- Check current data in messages table
SELECT COUNT(*) as total_messages FROM messages;

-- Check current data in chat_sessions
SELECT id, title, user_id, created_at FROM chat_sessions ORDER BY created_at;

-- Try to insert a test message to see what fails
-- (This will show us the exact error if there's a constraint issue)