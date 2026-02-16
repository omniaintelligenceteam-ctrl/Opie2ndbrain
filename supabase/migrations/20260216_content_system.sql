-- Content System Tables
-- Workflows, Content Bundles, and Content Assets
-- Created: 2026-02-16

-- ============================================================================
-- Workflows table — tracks all workflow executions
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  runtime_status TEXT DEFAULT 'pending',
  input JSONB,
  output JSONB,
  agent_logs JSONB DEFAULT '[]',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  actual_duration INTEGER,
  runtime_duration INTEGER,
  queue_position INTEGER,
  priority INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_workflows_status_created
ON workflows(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflows_type_created
ON workflows(type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflows_runtime_status
ON workflows(runtime_status);

-- ============================================================================
-- Content Bundles table — groups of generated content
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_bundles (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  trade TEXT,
  quality_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'creating',
  assets JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  workflow_id TEXT REFERENCES workflows(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_content_bundles_status
ON content_bundles(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_bundles_workflow
ON content_bundles(workflow_id);

-- ============================================================================
-- Content Assets table — individual content pieces
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_assets (
  id TEXT PRIMARY KEY,
  bundle_id TEXT REFERENCES content_bundles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'email', 'linkedin', 'instagram', 'heygen', 'image'
  content TEXT,
  status TEXT DEFAULT 'draft',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_assets_bundle
ON content_assets(bundle_id);

CREATE INDEX IF NOT EXISTS idx_content_assets_type
ON content_assets(type, created_at DESC);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_assets ENABLE ROW LEVEL SECURITY;

-- Public access policies (service role + anon)
CREATE POLICY "public_all" ON workflows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON content_bundles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON content_assets FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- Enable Realtime
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE workflows;
ALTER PUBLICATION supabase_realtime ADD TABLE content_bundles;
ALTER PUBLICATION supabase_realtime ADD TABLE content_assets;

COMMENT ON TABLE workflows IS 'Tracks all workflow executions (content generation, research, hooks)';
COMMENT ON TABLE content_bundles IS 'Groups of generated content assets around a topic/trade';
COMMENT ON TABLE content_assets IS 'Individual content pieces (emails, posts, videos, images)';
