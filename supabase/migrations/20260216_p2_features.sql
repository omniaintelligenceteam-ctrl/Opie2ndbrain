-- P2 Features: Scheduling, Templates, A/B Testing
-- Depends on: 20260216_content_system.sql

-- ============================================================================
-- Scheduling: add columns to content_assets
-- ============================================================================
ALTER TABLE content_assets ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
ALTER TABLE content_assets ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE content_assets ADD COLUMN IF NOT EXISTS platform TEXT;
ALTER TABLE content_assets ADD COLUMN IF NOT EXISTS platform_post_id TEXT;

CREATE INDEX IF NOT EXISTS idx_content_assets_scheduled
ON content_assets(scheduled_for)
WHERE scheduled_for IS NOT NULL;

-- ============================================================================
-- Templates: add columns to content_bundles
-- ============================================================================
ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS template_name TEXT;
ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_content_bundles_templates
ON content_bundles(is_template, created_at DESC)
WHERE is_template = true;

-- ============================================================================
-- A/B Testing: new table
-- ============================================================================
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
CREATE POLICY "public_all" ON ab_tests FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE ab_tests;
