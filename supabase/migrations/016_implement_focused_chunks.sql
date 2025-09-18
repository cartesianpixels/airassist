-- Add chunk metadata support to knowledge_base table
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS parent_document_id UUID;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS content_topic TEXT;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS semantic_focus TEXT;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS chunk_index INTEGER;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS total_chunks INTEGER;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS keywords TEXT[];

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_kb_content_topic ON knowledge_base(content_topic);
CREATE INDEX IF NOT EXISTS idx_kb_semantic_focus ON knowledge_base(semantic_focus);
CREATE INDEX IF NOT EXISTS idx_kb_keywords ON knowledge_base USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_kb_parent_document ON knowledge_base(parent_document_id);
CREATE INDEX IF NOT EXISTS idx_kb_chunk_index ON knowledge_base(chunk_index);

-- Update search function to leverage focused chunks
DROP FUNCTION IF EXISTS search_knowledge_base(vector(1536), float, int);

CREATE OR REPLACE FUNCTION search_knowledge_base(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 15
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    document_type TEXT,
    metadata JSONB,
    similarity FLOAT,
    content_topic TEXT,
    semantic_focus TEXT,
    keywords TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kb.id,
        kb.display_name as title,
        kb.content,
        COALESCE(kb.access_level, 'general') as document_type,
        kb.metadata,
        1 - (kb.embedding <=> query_embedding) AS similarity,
        kb.content_topic,
        kb.semantic_focus,
        kb.keywords
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