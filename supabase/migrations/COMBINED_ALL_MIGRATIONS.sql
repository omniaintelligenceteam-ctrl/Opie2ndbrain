-- ============================================================================
-- Opie2ndbrain — COMBINED MIGRATIONS (all 11 migration files)
-- Safe to run on a fresh or existing database (uses IF NOT EXISTS throughout)
-- Run this in Supabase SQL Editor: Dashboard > SQL Editor > New Query > Paste & Run
-- ============================================================================

-- Helper: safely add to realtime publication (ignores if already added)
CREATE OR REPLACE FUNCTION safe_add_to_realtime(tbl TEXT) RETURNS VOID AS $$
BEGIN
  EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$ LANGUAGE plpgsql;

-- Helper: safely create policy (ignores if already exists)
CREATE OR REPLACE FUNCTION safe_create_policy(policy_name TEXT, tbl TEXT) RETURNS VOID AS $$
BEGIN
  EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (true) WITH CHECK (true)', policy_name, tbl);
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. Shared Conversations (20260210)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shared_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL DEFAULT 'wes-main-session',
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('dashboard', 'telegram')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT idx_session_created UNIQUE (session_id, created_at, id)
);

CREATE INDEX IF NOT EXISTS idx_shared_conversations_session
ON shared_conversations(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shared_conversations_source
ON shared_conversations(source, created_at DESC);

ALTER TABLE shared_conversations ENABLE ROW LEVEL SECURITY;
SELECT safe_create_policy('Service role full access', 'shared_conversations');

CREATE OR REPLACE FUNCTION cleanup_old_shared_messages()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM shared_conversations
  WHERE session_id = NEW.session_id
  AND id NOT IN (
    SELECT id FROM shared_conversations
    WHERE session_id = NEW.session_id
    ORDER BY created_at DESC
    LIMIT 100
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_shared_messages ON shared_conversations;
CREATE TRIGGER trigger_cleanup_shared_messages
  AFTER INSERT ON shared_conversations
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_shared_messages();

SELECT safe_add_to_realtime('shared_conversations');

-- ============================================================================
-- 2. Content System — workflows, content_bundles, content_assets (20260216)
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

CREATE INDEX IF NOT EXISTS idx_workflows_status_created ON workflows(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflows_type_created ON workflows(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflows_runtime_status ON workflows(runtime_status);

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

CREATE INDEX IF NOT EXISTS idx_content_bundles_status ON content_bundles(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_bundles_workflow ON content_bundles(workflow_id);

CREATE TABLE IF NOT EXISTS content_assets (
  id TEXT PRIMARY KEY,
  bundle_id TEXT REFERENCES content_bundles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'draft',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_assets_bundle ON content_assets(bundle_id);
CREATE INDEX IF NOT EXISTS idx_content_assets_type ON content_assets(type, created_at DESC);

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_assets ENABLE ROW LEVEL SECURITY;

SELECT safe_create_policy('public_all', 'workflows');
SELECT safe_create_policy('public_all', 'content_bundles');
SELECT safe_create_policy('public_all', 'content_assets');

SELECT safe_add_to_realtime('workflows');
SELECT safe_add_to_realtime('content_bundles');
SELECT safe_add_to_realtime('content_assets');

-- ============================================================================
-- 3. Add agent_session_id to workflows (20260216)
-- ============================================================================
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS agent_session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_workflows_agent_session ON workflows(agent_session_id) WHERE agent_session_id IS NOT NULL;

-- ============================================================================
-- 4. HeyGen Jobs (20260216)
-- ============================================================================
CREATE TABLE IF NOT EXISTS heygen_jobs (
  id           TEXT PRIMARY KEY,
  bundle_id    TEXT REFERENCES content_bundles(id) ON DELETE SET NULL,
  asset_id     TEXT REFERENCES content_assets(id) ON DELETE SET NULL,
  video_id     TEXT,
  status       TEXT NOT NULL DEFAULT 'pending',
  avatar_id    TEXT NOT NULL,
  avatar_name  TEXT,
  voice_id     TEXT NOT NULL,
  input_text   TEXT NOT NULL,
  video_url    TEXT,
  thumbnail_url TEXT,
  duration     REAL,
  video_url_expires_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count  INTEGER NOT NULL DEFAULT 0,
  max_retries  INTEGER NOT NULL DEFAULT 3,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_heygen_jobs_status ON heygen_jobs(status);
CREATE INDEX IF NOT EXISTS idx_heygen_jobs_bundle ON heygen_jobs(bundle_id);
CREATE INDEX IF NOT EXISTS idx_heygen_jobs_video ON heygen_jobs(video_id);

CREATE OR REPLACE FUNCTION update_heygen_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS heygen_jobs_updated_at ON heygen_jobs;
CREATE TRIGGER heygen_jobs_updated_at
  BEFORE UPDATE ON heygen_jobs
  FOR EACH ROW EXECUTE FUNCTION update_heygen_jobs_updated_at();

ALTER TABLE heygen_jobs ENABLE ROW LEVEL SECURITY;
SELECT safe_create_policy('public_all', 'heygen_jobs');
SELECT safe_add_to_realtime('heygen_jobs');

-- ============================================================================
-- 5. Image Generation Jobs (20260216)
-- ============================================================================
CREATE TABLE IF NOT EXISTS image_generation_jobs (
  id              TEXT PRIMARY KEY,
  bundle_id       TEXT REFERENCES content_bundles(id) ON DELETE SET NULL,
  asset_id        TEXT REFERENCES content_assets(id) ON DELETE SET NULL,
  prediction_id   TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  prompt          TEXT NOT NULL,
  style           TEXT NOT NULL DEFAULT 'commercial',
  aspect_ratio    TEXT NOT NULL DEFAULT '1:1',
  size_name       TEXT NOT NULL DEFAULT 'instagram',
  image_url       TEXT,
  storage_path    TEXT,
  error_message   TEXT,
  retry_count     INTEGER NOT NULL DEFAULT 0,
  max_retries     INTEGER NOT NULL DEFAULT 3,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_image_gen_jobs_status ON image_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_image_gen_jobs_bundle ON image_generation_jobs(bundle_id);
CREATE INDEX IF NOT EXISTS idx_image_gen_jobs_prediction ON image_generation_jobs(prediction_id);

CREATE OR REPLACE FUNCTION update_image_gen_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS image_gen_jobs_updated_at ON image_generation_jobs;
CREATE TRIGGER image_gen_jobs_updated_at
  BEFORE UPDATE ON image_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION update_image_gen_jobs_updated_at();

ALTER TABLE image_generation_jobs ENABLE ROW LEVEL SECURITY;
SELECT safe_create_policy('public_all', 'image_generation_jobs');
SELECT safe_add_to_realtime('image_generation_jobs');

-- ============================================================================
-- 6. P2 Features — Scheduling, Templates, A/B Testing (20260216)
-- ============================================================================
ALTER TABLE content_assets ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
ALTER TABLE content_assets ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE content_assets ADD COLUMN IF NOT EXISTS platform TEXT;
ALTER TABLE content_assets ADD COLUMN IF NOT EXISTS platform_post_id TEXT;

CREATE INDEX IF NOT EXISTS idx_content_assets_scheduled
ON content_assets(scheduled_for) WHERE scheduled_for IS NOT NULL;

ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS template_name TEXT;
ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_content_bundles_templates
ON content_bundles(is_template, created_at DESC) WHERE is_template = true;

CREATE TABLE IF NOT EXISTS ab_tests (
  id TEXT PRIMARY KEY,
  bundle_a_id TEXT REFERENCES content_bundles(id) ON DELETE CASCADE,
  bundle_b_id TEXT REFERENCES content_bundles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  winner TEXT,
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
SELECT safe_create_policy('public_all', 'ab_tests');
SELECT safe_add_to_realtime('ab_tests');

-- ============================================================================
-- 7. P3 Features — Comments, Analytics, Webhooks (20260216)
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_comments (
  id TEXT PRIMARY KEY,
  bundle_id TEXT REFERENCES content_bundles(id) ON DELETE CASCADE,
  asset_id TEXT REFERENCES content_assets(id) ON DELETE CASCADE,
  author TEXT NOT NULL DEFAULT 'User',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_bundle ON content_comments(bundle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_asset ON content_comments(asset_id, created_at DESC);

ALTER TABLE content_comments ENABLE ROW LEVEL SECURITY;
SELECT safe_create_policy('public_all', 'content_comments');
SELECT safe_add_to_realtime('content_comments');

CREATE TABLE IF NOT EXISTS content_analytics (
  id TEXT PRIMARY KEY,
  asset_id TEXT REFERENCES content_assets(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0,
  shares INTEGER DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_analytics_asset ON content_analytics(asset_id, recorded_at DESC);
ALTER TABLE content_analytics ENABLE ROW LEVEL SECURITY;
SELECT safe_create_policy('public_all', 'content_analytics');

CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] DEFAULT '{}',
  secret TEXT,
  enabled BOOLEAN DEFAULT true,
  last_triggered TIMESTAMPTZ,
  last_status INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
SELECT safe_create_policy('public_all', 'webhooks');

-- ============================================================================
-- 8. Versioning for content_assets (20260217)
-- ============================================================================
ALTER TABLE content_assets ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_content_assets_bundle_version
ON content_assets(bundle_id, type, version DESC);

CREATE INDEX IF NOT EXISTS idx_content_assets_latest_version
ON content_assets(bundle_id, type, version DESC)
WHERE status != 'archived';

-- ============================================================================
-- 9. Content Images table (20260217)
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_images (
  id TEXT PRIMARY KEY,
  bundle_id TEXT REFERENCES content_bundles(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  original_prompt TEXT,
  url TEXT NOT NULL,
  style TEXT DEFAULT 'commercial_photography',
  aspect_ratio TEXT DEFAULT '1:1',
  status TEXT DEFAULT 'generated',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_content_images_bundle ON content_images(bundle_id, status);
CREATE INDEX IF NOT EXISTS idx_content_images_style ON content_images(style, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_images_status ON content_images(status, generated_at DESC);

ALTER TABLE content_images ENABLE ROW LEVEL SECURITY;
SELECT safe_create_policy('public_all', 'content_images');
SELECT safe_add_to_realtime('content_images');

-- ============================================================================
-- 10. Research-First System — adds research columns + status constraint (20260217)
-- ============================================================================
ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS research_findings JSONB;
ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS strategy_doc JSONB;

-- Drop old status constraint if exists, then recreate with research states
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'content_bundles_status_check') THEN
        ALTER TABLE content_bundles DROP CONSTRAINT content_bundles_status_check;
    END IF;
END $$;

-- (Will be overridden by migration 11 below which adds 'cancelled')

ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS research_started_at TIMESTAMPTZ;
ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS research_completed_at TIMESTAMPTZ;
ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS strategy_started_at TIMESTAMPTZ;
ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS strategy_completed_at TIMESTAMPTZ;
ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS creation_started_at TIMESTAMPTZ;
ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS research_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_content_bundles_research_status
ON content_bundles(status, research_started_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_bundles_research_session
ON content_bundles(research_session_id) WHERE research_session_id IS NOT NULL;

ALTER TABLE content_assets ADD COLUMN IF NOT EXISTS research_influence JSONB;

-- ============================================================================
-- 11. Add cancelled status (20260218)
-- ============================================================================
-- Final status constraint with ALL statuses including 'cancelled'
ALTER TABLE content_bundles ADD CONSTRAINT content_bundles_status_check
CHECK (status IN ('researching', 'awaiting_strategy_approval', 'creating', 'review', 'complete', 'failed', 'cancelled'));

ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- ============================================================================
-- Cleanup helper functions (optional — they served their purpose)
-- ============================================================================
DROP FUNCTION IF EXISTS safe_add_to_realtime(TEXT);
DROP FUNCTION IF EXISTS safe_create_policy(TEXT, TEXT);

-- ============================================================================
-- Done! Verify with:
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'workflows' AND column_name = 'runtime_duration';
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'content_bundles' AND column_name = 'cancelled_at';
-- Both should return 1 row.
-- ============================================================================
