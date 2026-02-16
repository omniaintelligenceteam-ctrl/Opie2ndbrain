-- P3 Features: Comments, Analytics, Webhooks
-- Depends on: 20260216_content_system.sql

-- ============================================================================
-- Comments / Team Collaboration
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_comments (
  id TEXT PRIMARY KEY,
  bundle_id TEXT REFERENCES content_bundles(id) ON DELETE CASCADE,
  asset_id TEXT REFERENCES content_assets(id) ON DELETE CASCADE,
  author TEXT NOT NULL DEFAULT 'User',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_bundle
ON content_comments(bundle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_asset
ON content_comments(asset_id, created_at DESC);

ALTER TABLE content_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON content_comments FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE content_comments;

-- ============================================================================
-- Performance Analytics
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS idx_analytics_asset
ON content_analytics(asset_id, recorded_at DESC);

ALTER TABLE content_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON content_analytics FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- Webhooks
-- ============================================================================
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
CREATE POLICY "public_all" ON webhooks FOR ALL USING (true) WITH CHECK (true);
