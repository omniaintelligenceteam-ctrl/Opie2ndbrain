-- Vector Memory with pgvector for semantic search
-- Run in Supabase SQL Editor (pgvector is pre-installed)

-- Enable the vector extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS vector;

-- Conversation embeddings for semantic search
CREATE TABLE IF NOT EXISTS opie_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL DEFAULT 'default',
  conversation_id TEXT,
  chunk_text TEXT NOT NULL, -- The actual text content
  chunk_type TEXT DEFAULT 'message', -- 'message', 'summary', 'fact'
  embedding VECTOR(1536), -- OpenAI/Ollama embedding dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE opie_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on embeddings" ON opie_embeddings
  FOR ALL USING (true) WITH CHECK (true);

-- Index for fast vector search
CREATE INDEX IF NOT EXISTS idx_embeddings_vector 
  ON opie_embeddings 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX idx_embeddings_session ON opie_embeddings(session_id);
CREATE INDEX idx_embeddings_type ON opie_embeddings(chunk_type);

-- Function for semantic search
CREATE OR REPLACE FUNCTION search_memory(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_session TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  chunk_text TEXT,
  chunk_type TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.chunk_text,
    e.chunk_type,
    1 - (e.embedding <=> query_embedding) AS similarity,
    e.metadata
  FROM opie_embeddings e
  WHERE 
    (filter_session IS NULL OR e.session_id = filter_session)
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
