-- Fix messages table issues and ensure proper TypeScript integration
-- Migration 004: Fix function signatures and ensure all analytics columns exist

-- First, drop existing functions that have parameter name conflicts
DROP FUNCTION IF EXISTS create_chat_session(text, uuid);
DROP FUNCTION IF EXISTS get_user_chat_sessions(uuid, integer, integer);
DROP FUNCTION IF EXISTS get_chat_session_messages(uuid, uuid);
DROP FUNCTION IF EXISTS add_message_to_session(uuid, uuid, text, text, jsonb, text, integer, integer, integer, decimal, integer);
DROP FUNCTION IF EXISTS update_chat_session_title(uuid, uuid, text);
DROP FUNCTION IF EXISTS delete_chat_session(uuid, uuid);

-- First, let's ensure all required columns exist in messages table
DO $$
BEGIN
    -- Check and add missing analytics columns to messages
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'model_used') THEN
        ALTER TABLE messages ADD COLUMN model_used TEXT DEFAULT 'gpt-4o-mini';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'prompt_tokens') THEN
        ALTER TABLE messages ADD COLUMN prompt_tokens INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'completion_tokens') THEN
        ALTER TABLE messages ADD COLUMN completion_tokens INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'total_tokens') THEN
        ALTER TABLE messages ADD COLUMN total_tokens INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'cost') THEN
        ALTER TABLE messages ADD COLUMN cost DECIMAL(10,6) DEFAULT 0.000000;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'response_time_ms') THEN
        ALTER TABLE messages ADD COLUMN response_time_ms INTEGER DEFAULT 0;
    END IF;
END $$;

-- Fix the chat_sessions table to match our TypeScript types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'chat_sessions' AND column_name = 'model_used') THEN
        ALTER TABLE chat_sessions ADD COLUMN model_used TEXT DEFAULT 'gpt-4o-mini';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'chat_sessions' AND column_name = 'total_tokens') THEN
        ALTER TABLE chat_sessions ADD COLUMN total_tokens INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'chat_sessions' AND column_name = 'total_cost') THEN
        ALTER TABLE chat_sessions ADD COLUMN total_cost DECIMAL(10,4) DEFAULT 0.0000;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'chat_sessions' AND column_name = 'session_duration_minutes') THEN
        ALTER TABLE chat_sessions ADD COLUMN session_duration_minutes INTEGER DEFAULT 0;
    END IF;
END $$;

-- Recreate the functions that our TypeScript code expects
CREATE OR REPLACE FUNCTION get_user_chat_sessions(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    title TEXT,
    archived BOOLEAN,
    metadata JSONB,
    model_used TEXT,
    total_tokens INTEGER,
    total_cost DECIMAL,
    session_duration_minutes INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    message_count BIGINT,
    last_message_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cs.id,
        cs.user_id,
        cs.title,
        cs.archived,
        cs.metadata,
        cs.model_used,
        cs.total_tokens,
        cs.total_cost,
        cs.session_duration_minutes,
        cs.created_at,
        cs.updated_at,
        COUNT(m.id) as message_count,
        MAX(m.created_at) as last_message_at
    FROM chat_sessions cs
    LEFT JOIN messages m ON cs.id = m.chat_session_id
    WHERE cs.user_id = p_user_id
    GROUP BY cs.id, cs.user_id, cs.title, cs.archived, cs.metadata,
             cs.model_used, cs.total_tokens, cs.total_cost, cs.session_duration_minutes,
             cs.created_at, cs.updated_at
    ORDER BY COALESCE(MAX(m.created_at), cs.created_at) DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get chat session messages with proper types
CREATE OR REPLACE FUNCTION get_chat_session_messages(
    p_session_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    chat_session_id UUID,
    role TEXT,
    content TEXT,
    resources JSONB,
    model_used TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    cost DECIMAL,
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Verify user owns the session
    IF NOT EXISTS (
        SELECT 1 FROM chat_sessions
        WHERE chat_sessions.id = p_session_id
        AND chat_sessions.user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Session not found or access denied';
    END IF;

    RETURN QUERY
    SELECT
        m.id,
        m.chat_session_id,
        m.role,
        m.content,
        m.resources,
        m.model_used,
        m.prompt_tokens,
        m.completion_tokens,
        m.total_tokens,
        m.cost,
        m.response_time_ms,
        m.created_at
    FROM messages m
    WHERE m.chat_session_id = p_session_id
    ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a chat session with proper return type
CREATE OR REPLACE FUNCTION create_chat_session(
    p_title TEXT,
    p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    session_id UUID;
BEGIN
    INSERT INTO chat_sessions (user_id, title, model_used)
    VALUES (p_user_id, p_title, 'gpt-4o-mini')
    RETURNING id INTO session_id;

    RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add message with all analytics tracking
CREATE OR REPLACE FUNCTION add_message_to_session(
    p_session_id UUID,
    p_user_id UUID,
    p_role TEXT,
    p_content TEXT,
    p_resources JSONB DEFAULT NULL,
    p_model_used TEXT DEFAULT 'gpt-4o-mini',
    p_prompt_tokens INTEGER DEFAULT 0,
    p_completion_tokens INTEGER DEFAULT 0,
    p_total_tokens INTEGER DEFAULT 0,
    p_cost DECIMAL DEFAULT 0.000000,
    p_response_time_ms INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    message_id UUID;
    session_exists BOOLEAN;
BEGIN
    -- Check if session exists and user owns it
    SELECT EXISTS(
        SELECT 1 FROM chat_sessions
        WHERE id = p_session_id AND user_id = p_user_id
    ) INTO session_exists;

    IF NOT session_exists THEN
        RAISE EXCEPTION 'Session not found or access denied. Session ID: %, User ID: %', p_session_id, p_user_id;
    END IF;

    -- Insert the message
    INSERT INTO messages (
        chat_session_id, role, content, resources,
        model_used, prompt_tokens, completion_tokens, total_tokens, cost, response_time_ms
    )
    VALUES (
        p_session_id, p_role, p_content, p_resources,
        p_model_used, p_prompt_tokens, p_completion_tokens, p_total_tokens, p_cost, p_response_time_ms
    )
    RETURNING id INTO message_id;

    -- Update session totals and timestamp
    UPDATE chat_sessions
    SET
        total_tokens = total_tokens + p_total_tokens,
        total_cost = total_cost + p_cost,
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update session title
CREATE OR REPLACE FUNCTION update_chat_session_title(
    p_session_id UUID,
    p_user_id UUID,
    p_title TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    updated_rows INTEGER;
BEGIN
    UPDATE chat_sessions
    SET title = p_title, updated_at = NOW()
    WHERE id = p_session_id AND user_id = p_user_id;

    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    RETURN updated_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete session
CREATE OR REPLACE FUNCTION delete_chat_session(
    p_session_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    deleted_rows INTEGER;
BEGIN
    DELETE FROM chat_sessions
    WHERE id = p_session_id AND user_id = p_user_id;

    GET DIAGNOSTICS deleted_rows = ROW_COUNT;
    RETURN deleted_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_chat_sessions(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_chat_session_messages(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_chat_session(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_message_to_session(UUID, UUID, TEXT, TEXT, JSONB, TEXT, INTEGER, INTEGER, INTEGER, DECIMAL, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_chat_session_title(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_chat_session(UUID, UUID) TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_session_id_created ON messages(chat_session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated ON chat_sessions(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

-- Test if we can insert a test message (uncomment to test)
-- DO $$
-- DECLARE
--     test_session_id UUID;
--     test_message_id UUID;
-- BEGIN
--     -- Get the first session from chat_sessions
--     SELECT id INTO test_session_id FROM chat_sessions LIMIT 1;
--
--     IF test_session_id IS NOT NULL THEN
--         -- Try to insert a test message
--         SELECT add_message_to_session(
--             test_session_id,
--             (SELECT user_id FROM chat_sessions WHERE id = test_session_id),
--             'user',
--             'Test message to verify table structure',
--             NULL,
--             'gpt-4o-mini',
--             10,
--             20,
--             30,
--             0.000050,
--             150
--         ) INTO test_message_id;
--
--         RAISE NOTICE 'Test message inserted successfully with ID: %', test_message_id;
--
--         -- Clean up test message
--         DELETE FROM messages WHERE id = test_message_id;
--         RAISE NOTICE 'Test message cleaned up';
--     ELSE
--         RAISE NOTICE 'No chat sessions found for testing';
--     END IF;
-- END $$;