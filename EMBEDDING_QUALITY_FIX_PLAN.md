# Systematic Embedding Quality Fix Plan

## The Real Problem

The entire knowledge base has **systematically poor embeddings** that don't represent semantic content properly. The Chapter 5 vs Chapter 6 wake turbulence case is just one example of a widespread data quality issue.

**Root Cause**: Large mixed-content documents get averaged embeddings that dilute specific procedures, making similarity search fundamentally unreliable for ANY specific query.

## Current Broken State

- Documents contain multiple unrelated procedures in single embeddings
- Specific procedures (wake turbulence, approach minima, etc.) get diluted by surrounding content
- Similarity search returns documents that "mention" topics rather than documents "about" topics
- This affects ALL queries, not just wake turbulence

**Example Evidence**:
- Chapter 5 Section 5: 24k chars, mostly radar separation + some wake turbulence → embedding represents "radar document"
- Chapter 6 Section 2: 3k chars, random content with word overlap → accidentally ranks higher
- Result: User asks about wake turbulence, gets irrelevant content

## Solution: Systematic Content-Focused Chunking

**Objective**: Transform mixed documents into focused chunks where each embedding accurately represents its semantic content.

### Implementation Tasks

## Task 1: Analyze Current Knowledge Base Structure

**File**: `scripts/analyze-knowledge-base-quality.ts`

**Purpose**: Understand the scope of the embedding quality problem

```typescript
interface DocumentAnalysis {
  id: string;
  title: string;
  size: number;
  topicCount: number;
  mainTopics: string[];
  contentDensity: number;
  embeddingQuality: 'focused' | 'mixed' | 'diluted';
}

async function analyzeKnowledgeBase() {
  // Analyze each document for:
  // - Content size and complexity
  // - Number of distinct topics/procedures
  // - Semantic coherence
  // - Embedding dilution risk
}
```

**Output**: Report showing which documents need chunking and why

## Task 2: Create Intelligent Chunking Algorithm

**File**: `scripts/chunk-knowledge-base.ts`

**Strategy**: Split documents by semantic boundaries, not arbitrary size

```typescript
interface ChunkingStrategy {
  // Split by procedural sections
  procedureBoundaries: RegExp[];
  // Maintain topic coherence
  topicCoherence: number;
  // Optimal chunk size for embeddings
  targetSize: { min: 800, max: 2500 };
  // Preserve regulatory context
  includeContext: boolean;
}

function identifySemanticBoundaries(content: string): SemanticSection[] {
  // Find natural breaking points:
  // - Procedure headers
  // - Topic changes
  // - Regulatory sections
  // - Application contexts
}

function createFocusedChunks(sections: SemanticSection[]): FocusedChunk[] {
  // Create chunks that are semantically coherent
  // Each chunk represents ONE clear topic/procedure
  // Include enough context for understanding
  // Generate descriptive titles that reflect actual content
}
```

## Task 3: Generate High-Quality Embeddings

**Strategy**: Create embeddings that accurately represent chunk content

```typescript
async function generateSemanticEmbedding(chunk: FocusedChunk): Promise<number[]> {
  // Combine chunk content + title + topic keywords for embedding
  const embeddingText = `${chunk.title}\n\nTopic: ${chunk.topic}\n\n${chunk.content}`;

  // This ensures embeddings represent what the chunk is ABOUT
  // not just what words it contains
  return await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: embeddingText
  });
}
```

## Task 4: Implement Systematic Migration

**File**: `scripts/migrate-to-focused-chunks.ts`

**Process**:
1. **Backup**: Preserve current knowledge base
2. **Analyze**: Identify documents needing chunking
3. **Chunk**: Apply semantic chunking to mixed documents
4. **Embed**: Generate focused embeddings for each chunk
5. **Validate**: Test similarity quality improvements
6. **Deploy**: Replace old embeddings with new focused ones

```typescript
async function migrateToFocusedChunks() {
  // For each document:
  const documents = await loadKnowledgeBase();

  for (const doc of documents) {
    if (requiresChunking(doc)) {
      // Split into semantically coherent chunks
      const chunks = await createSemanticChunks(doc);

      // Generate focused embeddings
      for (const chunk of chunks) {
        const embedding = await generateSemanticEmbedding(chunk);
        await saveChunk(chunk, embedding);
      }
    } else {
      // Keep small focused documents as-is
      await migrateAsIs(doc);
    }
  }
}
```

## Task 5: Update Database Schema for Chunk Management

**File**: `supabase/migrations/016_implement_focused_chunks.sql`

```sql
-- Add chunk metadata to support focused content
ALTER TABLE knowledge_base ADD COLUMN parent_document_id UUID;
ALTER TABLE knowledge_base ADD COLUMN content_topic TEXT;
ALTER TABLE knowledge_base ADD COLUMN semantic_focus TEXT;
ALTER TABLE knowledge_base ADD COLUMN chunk_index INTEGER;

-- Create indexes for better search
CREATE INDEX idx_kb_content_topic ON knowledge_base(content_topic);
CREATE INDEX idx_kb_semantic_focus ON knowledge_base(semantic_focus);

-- Update search function to leverage focused chunks
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
    semantic_focus TEXT
)
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
        kb.semantic_focus
    FROM knowledge_base kb
    WHERE kb.embedding IS NOT NULL
      AND 1 - (kb.embedding <=> query_embedding) > match_threshold
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

## Task 6: Validation and Testing

**Test Strategy**: Verify that focused embeddings solve similarity ranking for ALL query types

```typescript
async function validateEmbeddingQuality() {
  const testQueries = [
    // Wake turbulence (our known broken case)
    "wake turbulence separation minima",

    // Other specific procedures
    "approach weather minimums",
    "runway incursion procedures",
    "emergency aircraft handling",
    "IFR separation requirements",

    // General queries
    "radar separation",
    "air traffic control procedures"
  ];

  for (const query of testQueries) {
    const results = await searchKnowledgeBase(query);

    // Verify top results are actually relevant to the query
    const topResult = results[0];
    const isRelevant = assessRelevance(query, topResult);

    console.log(`Query: ${query}`);
    console.log(`Top result: ${topResult.title} (similarity: ${topResult.similarity})`);
    console.log(`Actually relevant: ${isRelevant ? 'YES' : 'NO'}`);
    console.log('---');
  }
}
```

**Success Criteria**:
- Wake turbulence queries return wake turbulence-focused chunks first
- Approach queries return approach-focused chunks first
- General queries return appropriately broad content
- No more irrelevant content ranking higher than relevant content

## Expected Outcomes

### Before Fix (Current State)
- Mixed documents with averaged embeddings
- Specific procedures diluted by unrelated content
- Similarity search unreliable for any specific query
- AI gets mostly irrelevant context for most questions

### After Fix
- Each chunk embedding accurately represents its semantic content
- Specific queries find specific, relevant procedures first
- General queries still work but with better precision
- AI gets focused, relevant context for all queries
- Dramatic improvement in response quality across all topics

## Implementation Priority

1. **Critical**: Analyze current embedding quality problems
2. **High**: Implement semantic chunking algorithm
3. **High**: Generate new focused embeddings
4. **Medium**: Update database schema and search functions
5. **Low**: Optimize chunk sizes and embedding strategies

This fixes the systematic data quality problem that affects ALL queries, not just wake turbulence.