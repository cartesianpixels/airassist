-- Test User and Session Relationships
-- This will help us understand exactly how users relate to chats

-- 1. Show all users and their sessions
SELECT
    'USER SESSION RELATIONSHIPS' as info,
    p.id as user_id,
    p.email as user_email,
    p.full_name,
    cs.id as session_id,
    cs.title as session_title,
    cs.created_at as session_created,
    COUNT(m.id) as message_count
FROM profiles p
LEFT JOIN chat_sessions cs ON p.id = cs.user_id
LEFT JOIN messages m ON cs.id = m.chat_session_id
GROUP BY p.id, p.email, p.full_name, cs.id, cs.title, cs.created_at
ORDER BY p.email, cs.created_at DESC;

-- 2. Check for orphaned data
SELECT 'ORPHANED SESSIONS' as info;
SELECT
    cs.id as session_id,
    cs.user_id,
    cs.title,
    'Session with no user' as issue
FROM chat_sessions cs
LEFT JOIN profiles p ON cs.user_id = p.id
WHERE p.id IS NULL;

SELECT 'ORPHANED MESSAGES' as info;
SELECT
    m.id as message_id,
    m.chat_session_id,
    'Message with no session' as issue
FROM messages m
LEFT JOIN chat_sessions cs ON m.chat_session_id = cs.id
WHERE cs.id IS NULL;

-- 3. Test if we can create a session for the current user
DO $$
DECLARE
    test_user_id UUID;
    test_session_id UUID;
    user_email TEXT;
BEGIN
    -- Get the first user
    SELECT id, email INTO test_user_id, user_email
    FROM profiles
    LIMIT 1;

    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with user: % (%)', user_email, test_user_id;

        -- Try to create a session
        INSERT INTO chat_sessions (user_id, title)
        VALUES (test_user_id, 'Test Session - ' || NOW())
        RETURNING id INTO test_session_id;

        RAISE NOTICE 'Created test session: %', test_session_id;

        -- Try to add a message
        INSERT INTO messages (chat_session_id, role, content)
        VALUES (test_session_id, 'user', 'Test message - ' || NOW());

        RAISE NOTICE 'Added test message successfully';

        -- Clean up
        DELETE FROM messages WHERE chat_session_id = test_session_id;
        DELETE FROM chat_sessions WHERE id = test_session_id;

        RAISE NOTICE 'Cleanup completed - test successful!';
    ELSE
        RAISE NOTICE 'No users found in profiles table';
    END IF;

EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error during test: % - %', SQLSTATE, SQLERRM;
END $$;

-- 4. Show the exact structure we're working with
SELECT
    'EXACT TABLE STRUCTURES' as info,
    table_name,
    string_agg(
        column_name || ' ' || data_type ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
        ', '
        ORDER BY ordinal_position
    ) as columns
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'chat_sessions', 'messages', 'user_settings')
GROUP BY table_name
ORDER BY table_name;