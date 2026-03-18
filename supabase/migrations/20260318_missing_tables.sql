-- ============================================================================
-- Missing tables migration — 2026-03-18
-- Adds the 9 tables the app needs that don't yet exist in Supabase
-- Safe to run on existing DB (uses IF NOT EXISTS throughout)
-- ============================================================================

-- ── 1. ab_tests ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'control',
  config JSONB DEFAULT '{}',
  results JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Service role full access ab_tests"
  ON ab_tests FOR ALL USING (true) WITH CHECK (true);

-- ── 2. content_analytics ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id TEXT NOT NULL,
  content_type TEXT,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_analytics_content_id ON content_analytics(content_id);
CREATE INDEX IF NOT EXISTS idx_content_analytics_created_at ON content_analytics(created_at DESC);
ALTER TABLE content_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Service role full access content_analytics"
  ON content_analytics FOR ALL USING (true) WITH CHECK (true);

-- ── 3. content_comments ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id TEXT NOT NULL,
  author TEXT DEFAULT 'Wes',
  body TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_comments_content_id ON content_comments(content_id);
ALTER TABLE content_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Service role full access content_comments"
  ON content_comments FOR ALL USING (true) WITH CHECK (true);

-- ── 4. content_images ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id TEXT NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT,
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  mime_type TEXT DEFAULT 'image/jpeg',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_images_content_id ON content_images(content_id);
ALTER TABLE content_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Service role full access content_images"
  ON content_images FOR ALL USING (true) WITH CHECK (true);

-- ── 5. image_generation_jobs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS image_generation_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  model TEXT DEFAULT 'dall-e-3',
  width INTEGER DEFAULT 1024,
  height INTEGER DEFAULT 1024,
  style TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  result_url TEXT,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_image_generation_jobs_status ON image_generation_jobs(status);
ALTER TABLE image_generation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Service role full access image_generation_jobs"
  ON image_generation_jobs FOR ALL USING (true) WITH CHECK (true);

-- ── 6. larry_jobs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS larry_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','done','failed')),
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_larry_jobs_status ON larry_jobs(status);
ALTER TABLE larry_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Service role full access larry_jobs"
  ON larry_jobs FOR ALL USING (true) WITH CHECK (true);

-- ── 7. media_jobs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type TEXT NOT NULL,
  source_url TEXT,
  output_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  metadata JSONB DEFAULT '{}',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_media_jobs_status ON media_jobs(status);
ALTER TABLE media_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Service role full access media_jobs"
  ON media_jobs FOR ALL USING (true) WITH CHECK (true);

-- ── 8. opie_conversation_summaries ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS opie_conversation_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  session_id TEXT DEFAULT 'default',
  summary TEXT NOT NULL,
  key_topics TEXT[] DEFAULT '{}',
  action_items TEXT[] DEFAULT '{}',
  message_count INTEGER DEFAULT 0,
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_opie_conv_summaries_conv_id ON opie_conversation_summaries(conversation_id);
CREATE INDEX IF NOT EXISTS idx_opie_conv_summaries_session ON opie_conversation_summaries(session_id, created_at DESC);
ALTER TABLE opie_conversation_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Service role full access opie_conversation_summaries"
  ON opie_conversation_summaries FOR ALL USING (true) WITH CHECK (true);

-- ── 9. webhooks ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] DEFAULT '{}',
  secret TEXT,
  active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Service role full access webhooks"
  ON webhooks FOR ALL USING (true) WITH CHECK (true);

-- ── Ensure opie_user_memory_v2 exists (referenced in some code paths) ────────
CREATE TABLE IF NOT EXISTS opie_user_memory_v2 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL DEFAULT 'default',
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  confidence FLOAT DEFAULT 1.0,
  source TEXT DEFAULT 'conversation',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, key)
);
CREATE INDEX IF NOT EXISTS idx_opie_user_memory_v2_session ON opie_user_memory_v2(session_id);
ALTER TABLE opie_user_memory_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Service role full access opie_user_memory_v2"
  ON opie_user_memory_v2 FOR ALL USING (true) WITH CHECK (true);
