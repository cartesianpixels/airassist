-- Debug the foreign key constraint issue
-- This will help us understand exactly what's happening

-- 1. Check what sessions exist
SELECT
    'Current Sessions:' as info,
    id as session_id,
    user_id,
    title,
    created_at
FROM chat_sessions
ORDER BY created_at DESC;

-- 2. Check the foreign key constraint details
SELECT
    'Foreign Key Constraint:' as info,
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
    AND kcu.column_name = 'chat_session_id';

-- 3. Check current messages and their session references
SELECT
    'Current Messages:' as info,
    m.id as message_id,
    m.chat_session_id,
    m.role,
    m.content,
    m.created_at,
    CASE
        WHEN cs.id IS NOT NULL THEN 'Session exists'
        ELSE 'Session MISSING!'
    END as session_status
FROM messages m
LEFT JOIN chat_sessions cs ON m.chat_session_id = cs.id
ORDER BY m.created_at DESC;

-- 4. Test if we can find the session that's failing
-- Replace this UUID with the one from your error
DO $$
DECLARE
    test_session_id UUID := '7daedf3d-dfcf-4dcf-abe8-3f751b783273'; -- Your latest session
    session_exists BOOLEAN;
BEGIN
    -- Check if session exists
    SELECT EXISTS(
        SELECT 1 FROM chat_sessions WHERE id = test_session_id
    ) INTO session_exists;

    IF session_exists THEN
        RAISE NOTICE 'Session % EXISTS in chat_sessions table', test_session_id;
    ELSE
        RAISE NOTICE 'Session % DOES NOT EXIST in chat_sessions table', test_session_id;
    END IF;
END $$;