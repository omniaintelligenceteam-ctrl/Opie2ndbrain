-- Image Generation Jobs: Tracks Replicate Flux image generation requests
-- Depends on: 20260216_content_system.sql

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

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_image_gen_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER image_gen_jobs_updated_at
  BEFORE UPDATE ON image_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION update_image_gen_jobs_updated_at();

ALTER TABLE image_generation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON image_generation_jobs FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE image_generation_jobs;
