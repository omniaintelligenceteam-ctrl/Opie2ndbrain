-- Memory Tables for Opie2ndbrain
-- Run in Supabase SQL Editor

-- User memory: extracted facts, preferences, decisions
CREATE TABLE IF NOT EXISTS opie_user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL DEFAULT 'default',
  category TEXT NOT NULL, -- 'fact', 'preference', 'decision', 'action_item'
  content TEXT NOT NULL,
  source_conversation_id TEXT, -- which conversation it came from
  confidence FLOAT DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = permanent
  metadata JSONB DEFAULT '{}'
);

-- Conversation summaries (for older conversations)
CREATE TABLE IF NOT EXISTS opie_conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL UNIQUE,
  session_id TEXT NOT NULL DEFAULT 'default',
  summary TEXT NOT NULL,
  key_topics TEXT[], -- array of topics discussed
  message_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS with open access (personal app)
ALTER TABLE opie_user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE opie_conversation_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on user_memory" ON opie_user_memory
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on summaries" ON opie_conversation_summaries
  FOR ALL USING (true) WITH CHECK (true);

-- Indexes for fast lookup
CREATE INDEX idx_user_memory_session ON opie_user_memory(session_id);
CREATE INDEX idx_user_memory_category ON opie_user_memory(category);
CREATE INDEX idx_summaries_session ON opie_conversation_summaries(session_id);
