-- Content Images Table for Research-First Content Creation System
-- Stores AI-generated images for content bundles
-- Created: 2026-02-17

-- ============================================================================
-- Content Images table — AI-generated images for content bundles
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

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_content_images_bundle
ON content_images(bundle_id, status);

CREATE INDEX IF NOT EXISTS idx_content_images_style
ON content_images(style, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_images_status
ON content_images(status, generated_at DESC);

-- Row Level Security
ALTER TABLE content_images ENABLE ROW LEVEL SECURITY;

-- Public access policy (service role + anon)
CREATE POLICY "public_all" ON content_images FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE content_images;

-- Comments
COMMENT ON TABLE content_images IS 'AI-generated images for content bundles using Gemini API';
COMMENT ON COLUMN content_images.prompt IS 'Enhanced prompt used for generation (includes Nano Banana styling)';
COMMENT ON COLUMN content_images.original_prompt IS 'Original user/strategy prompt before enhancement';
COMMENT ON COLUMN content_images.style IS 'Image generation style (commercial_photography, illustration, etc.)';
COMMENT ON COLUMN content_images.aspect_ratio IS 'Image aspect ratio (1:1, 16:9, 4:5, 9:16)';
COMMENT ON COLUMN content_images.metadata IS 'Gemini API response metadata and generation parameters';