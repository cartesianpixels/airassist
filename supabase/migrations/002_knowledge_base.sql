-- Knowledge Base and Vector Search Setup
-- For AI document retrieval and embeddings

-- Create knowledge_base table for storing documents
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    document_type TEXT DEFAULT 'general',
    metadata JSONB DEFAULT '{}',
    embedding vector(1536), -- OpenAI embedding dimension
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create categories table for organizing knowledge base
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create knowledge_base_categories junction table
CREATE TABLE IF NOT EXISTS knowledge_base_categories (
    knowledge_base_id UUID REFERENCES knowledge_base(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (knowledge_base_id, category_id)
);

-- Create indexes for knowledge base
CREATE INDEX IF NOT EXISTS idx_knowledge_base_document_type ON knowledge_base(document_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_created_at ON knowledge_base(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_metadata ON knowledge_base USING GIN(metadata);

-- Create vector similarity search index
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON knowledge_base
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- Create function for similarity search
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
) AS $$
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
    WHERE 1 - (kb.embedding <=> query_embedding) > match_threshold
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS for knowledge base tables
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for knowledge base (read-only for authenticated users)
CREATE POLICY "Everyone can view knowledge base" ON knowledge_base
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Everyone can view categories" ON categories
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Everyone can view knowledge base categories" ON knowledge_base_categories
    FOR SELECT TO authenticated USING (true);

-- Create trigger for updating updated_at
CREATE TRIGGER update_knowledge_base_updated_at
    BEFORE UPDATE ON knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some default categories
INSERT INTO categories (name, description) VALUES
('ATC Procedures', 'Air Traffic Control procedures and guidelines'),
('IVAO Documentation', 'IVAO specific documentation and rules'),
('Aviation Regulations', 'FAA, ICAO and other aviation regulations'),
('Training Materials', 'Training guides and educational content'),
('Emergency Procedures', 'Emergency and abnormal situation procedures')
ON CONFLICT (name) DO NOTHING;

-- Grant permissions
GRANT SELECT ON knowledge_base TO authenticated;
GRANT SELECT ON categories TO authenticated;
GRANT SELECT ON knowledge_base_categories TO authenticated;
GRANT EXECUTE ON FUNCTION search_knowledge_base TO authenticated;