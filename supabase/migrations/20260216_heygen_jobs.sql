-- HeyGen Jobs: Tracks HeyGen video generation requests
-- Depends on: 20260216_content_system.sql

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

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_heygen_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER heygen_jobs_updated_at
  BEFORE UPDATE ON heygen_jobs
  FOR EACH ROW EXECUTE FUNCTION update_heygen_jobs_updated_at();

ALTER TABLE heygen_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON heygen_jobs FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE heygen_jobs;
