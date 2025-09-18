-- Fix knowledge base search function to ensure proper deployment
-- and handle vector parameter correctly

-- Drop and recreate the function to ensure it's properly registered
DROP FUNCTION IF EXISTS search_knowledge_base(vector(1536), float, int);

-- Recreate the search function with proper parameter handling
CREATE OR REPLACE FUNCTION search_knowledge_base(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    document_type TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kb.id,
        kb.title,
        kb.content,
        kb.document_type,
        kb.metadata,
        1 - (kb.embedding <=> query_embedding) AS similarity
    FROM knowledge_base kb
    WHERE kb.embedding IS NOT NULL
      AND 1 - (kb.embedding <=> query_embedding) > match_threshold
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION search_knowledge_base TO authenticated;
GRANT EXECUTE ON FUNCTION search_knowledge_base TO anon;

-- Ensure the knowledge_base table has proper permissions
GRANT SELECT ON knowledge_base TO authenticated;
GRANT SELECT ON knowledge_base TO anon;