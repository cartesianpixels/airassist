-- Test message creation to debug the foreign key issue
-- Run this to test if messages can be inserted properly

-- Test 1: Check existing session
SELECT
    id as session_id,
    title,
    user_id,
    created_at
FROM chat_sessions
ORDER BY created_at DESC;

-- Test 2: Try to insert a test message to the most recent session
DO $$
DECLARE
    test_session_id UUID := '7daedf3d-dfcf-4dcf-abe8-3f751b783273'; -- Your most recent session
    test_user_id UUID := '06e9e81e-bbc5-4cb4-aadc-46697fb18ea7';     -- Your user ID
    test_message_id UUID;
BEGIN
    -- Check if session exists
    IF EXISTS (SELECT 1 FROM chat_sessions WHERE id = test_session_id AND user_id = test_user_id) THEN
        RAISE NOTICE 'Session found, attempting to insert message...';

        -- Try using the function
        SELECT add_message_to_session(
            test_session_id,
            test_user_id,
            'user',
            'Test message - checking database functionality',
            NULL,
            'gpt-4o-mini',
            10,
            0,
            10,
            0.000015,
            0
        ) INTO test_message_id;

        RAISE NOTICE 'Message inserted successfully with ID: %', test_message_id;

        -- Verify the message was created
        IF EXISTS (SELECT 1 FROM messages WHERE id = test_message_id) THEN
            RAISE NOTICE 'Message verification: SUCCESS';
        ELSE
            RAISE NOTICE 'Message verification: FAILED';
        END IF;

        -- Clean up test message
        DELETE FROM messages WHERE id = test_message_id;
        RAISE NOTICE 'Test message cleaned up';

    ELSE
        RAISE NOTICE 'Session not found or access denied';
    END IF;

EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error occurred: % - %', SQLSTATE, SQLERRM;
END $$;

-- Test 3: Check current messages count
SELECT COUNT(*) as total_messages FROM messages;

-- Test 4: Show current messages table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'messages'
AND table_schema = 'public'
ORDER BY ordinal_position;