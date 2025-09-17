-- Migration 005: Fix Schema Synchronization
-- This fixes the mismatch between database schema and TypeScript types

-- =====================================================
-- 1. FIX MESSAGES TABLE CONSTRAINTS
-- =====================================================

-- Make chat_session_id NOT NULL (it should be required)
UPDATE messages SET chat_session_id = gen_random_uuid() WHERE chat_session_id IS NULL;
ALTER TABLE messages ALTER COLUMN chat_session_id SET NOT NULL;

-- Make user_id NOT NULL for existing messages by getting it from chat_sessions
UPDATE messages
SET user_id = cs.user_id
FROM chat_sessions cs
WHERE messages.chat_session_id = cs.id
AND messages.user_id IS NULL;

ALTER TABLE messages ALTER COLUMN user_id SET NOT NULL;

-- Add missing foreign key constraint for user_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'messages_user_id_fkey'
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE messages ADD CONSTRAINT messages_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- 2. CLEAN UP DUPLICATE FUNCTIONS
-- =====================================================

-- Drop all existing functions to avoid conflicts
DROP FUNCTION IF EXISTS add_message_to_session(uuid, uuid, text, text, jsonb, text, integer, integer, integer, numeric, integer);
DROP FUNCTION IF EXISTS add_message_to_session(uuid, uuid, text, text, jsonb);
DROP FUNCTION IF EXISTS get_user_chat_sessions(uuid, integer, integer);
DROP FUNCTION IF EXISTS get_user_chat_sessions(uuid);
DROP FUNCTION IF EXISTS get_chat_session_messages(uuid, uuid);
DROP FUNCTION IF EXISTS create_chat_session(text, uuid);
DROP FUNCTION IF EXISTS update_chat_session_title(uuid, uuid, text);
DROP FUNCTION IF EXISTS delete_chat_session(uuid, uuid);

-- =====================================================
-- 3. CREATE CORRECT FUNCTIONS MATCHING DATABASE SCHEMA
-- =====================================================

-- Function to get user chat sessions with proper return type
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
    total_cost NUMERIC,
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

-- Function to get chat session messages (matching database schema)
CREATE OR REPLACE FUNCTION get_chat_session_messages(
    p_session_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    chat_session_id UUID,
    user_id UUID,
    role TEXT,
    content TEXT,
    resources JSONB,
    created_at TIMESTAMPTZ,
    metadata JSONB,
    model_used TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    cost NUMERIC,
    response_time_ms INTEGER
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
        m.user_id,
        m.role,
        m.content,
        m.resources,
        m.created_at,
        m.metadata,
        m.model_used,
        m.prompt_tokens,
        m.completion_tokens,
        m.total_tokens,
        m.cost,
        m.response_time_ms
    FROM messages m
    WHERE m.chat_session_id = p_session_id
    ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a chat session
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

-- Function to add message with ALL required fields
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
    p_cost NUMERIC DEFAULT 0.000000,
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

    -- Insert the message with ALL required fields including user_id
    INSERT INTO messages (
        chat_session_id, user_id, role, content, resources, metadata,
        model_used, prompt_tokens, completion_tokens, total_tokens, cost, response_time_ms
    )
    VALUES (
        p_session_id, p_user_id, p_role, p_content, p_resources, COALESCE(p_resources, '{}'::jsonb),
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

-- =====================================================
-- 4. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_user_chat_sessions(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_chat_session_messages(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_chat_session(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_message_to_session(UUID, UUID, TEXT, TEXT, JSONB, TEXT, INTEGER, INTEGER, INTEGER, NUMERIC, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_chat_session_title(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_chat_session(UUID, UUID) TO authenticated;

-- =====================================================
-- 5. CREATE PERFORMANCE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_user ON messages(chat_session_id, user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

-- Test if everything works
DO $$
DECLARE
    test_user_id UUID;
    test_session_id UUID;
    test_message_id UUID;
BEGIN
    -- Get first user
    SELECT id INTO test_user_id FROM profiles LIMIT 1;

    IF test_user_id IS NOT NULL THEN
        -- Test session creation
        SELECT create_chat_session('Test Session', test_user_id) INTO test_session_id;

        -- Test message creation
        SELECT add_message_to_session(
            test_session_id, test_user_id, 'user', 'Test message', NULL
        ) INTO test_message_id;

        -- Cleanup
        DELETE FROM messages WHERE id = test_message_id;
        DELETE FROM chat_sessions WHERE id = test_session_id;

        RAISE NOTICE 'Migration 005 verification: SUCCESS';
    ELSE
        RAISE NOTICE 'No users found for testing';
    END IF;
END $$;