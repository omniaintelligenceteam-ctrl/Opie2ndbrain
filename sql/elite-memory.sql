-- ELITE MEMORY SYSTEM for Opie2ndbrain
-- Project-tagged + Deep Context + Scratchpad

-- 1. PROJECT-TAGGED MEMORY
-- Enhanced user memory with project tagging
CREATE TABLE IF NOT EXISTS opie_user_memory_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL DEFAULT 'default',
  project_tag TEXT, -- 'omnia-lighting', 'opie-dev', 'general'
  category TEXT NOT NULL, -- 'fact', 'preference', 'decision', 'action_item', 'correction'
  content TEXT NOT NULL,
  source_conversation_id TEXT,
  confidence FLOAT DEFAULT 1.0,
  import_score FLOAT DEFAULT 1.0, -- 0-10, higher = more important
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  access_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  -- For temporal awareness: "3 days ago you said..."
  original_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PERSISTENT SCRATCHPAD (Working memory)
-- Auto-updates with every change/decision
CREATE TABLE IF NOT EXISTS opie_scratchpad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL DEFAULT 'default',
  project_tag TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL, -- e.g., "Omnia Gutter Fix Session"
  current_focus TEXT, -- What we're working on RIGHT NOW
  recent_changes TEXT[], -- Last 20 changes, chronological
  key_decisions TEXT[], -- Important decisions made
  blockers TEXT[], -- Current issues/blockers
  next_steps TEXT[], -- What to do next
  context_summary TEXT, -- 2-3 sentence summary of current state
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, project_tag)
);

-- 3. DEEP SESSION CONTEXT
-- Store full conversation chunks for deep recall
CREATE TABLE IF NOT EXISTS opie_session_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  project_tag TEXT,
  chunk_index INT NOT NULL, -- 0, 1, 2... for ordering
  messages JSONB NOT NULL, -- Array of {role, text, timestamp}
  summary TEXT, -- Mini-summary of this chunk
  key_facts TEXT[], -- Extracted from this chunk
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, chunk_index)
);

-- 4. PREDICTIVE PREFETCH LOG
-- Track what memories were useful, learn patterns
CREATE TABLE IF NOT EXISTS opie_memory_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  project_tag TEXT,
  query_context TEXT, -- What was the user asking
  memories_accessed UUID[], -- Which memories helped
  was_helpful BOOLEAN, -- Did this memory help?
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE opie_user_memory_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE opie_scratchpad ENABLE ROW LEVEL SECURITY;
ALTER TABLE opie_session_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE opie_memory_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON opie_user_memory_v2 FOR ALL USING (true);
CREATE POLICY "Allow all" ON opie_scratchpad FOR ALL USING (true);
CREATE POLICY "Allow all" ON opie_session_chunks FOR ALL USING (true);
CREATE POLICY "Allow all" ON opie_memory_access_log FOR ALL USING (true);

-- Indexes for fast lookup
CREATE INDEX idx_memory_v2_project ON opie_user_memory_v2(project_tag);
CREATE INDEX idx_memory_v2_session ON opie_user_memory_v2(session_id);
CREATE INDEX idx_memory_v2_category ON opie_user_memory_v2(category);
CREATE INDEX idx_memory_v2_importance ON opie_user_memory_v2(import_score DESC);
CREATE INDEX idx_scratchpad_project ON opie_scratchpad(project_tag);
CREATE INDEX idx_chunks_session ON opie_session_chunks(session_id, chunk_index);
CREATE INDEX idx_chunks_project ON opie_session_chunks(project_tag);

-- Function to auto-update scratchpad
CREATE OR REPLACE FUNCTION update_scratchpad(
  p_session_id TEXT,
  p_project_tag TEXT,
  p_change TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO opie_scratchpad (session_id, project_tag, title, recent_changes)
  VALUES (p_session_id, p_project_tag, p_project_tag || ' Session', ARRAY[p_change])
  ON CONFLICT (session_id, project_tag)
  DO UPDATE SET
    recent_changes = array_prepend(p_change, opie_scratchpad.recent_changes[1:19]), -- Keep last 20
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to increment memory access count
CREATE OR REPLACE FUNCTION touch_memory(p_memory_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE opie_user_memory_v2 
  SET access_count = access_count + 1, last_accessed = NOW()
  WHERE id = p_memory_id;
END;
$$ LANGUAGE plpgsql;
