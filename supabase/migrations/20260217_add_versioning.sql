-- Add versioning support to content_assets table
-- Created: 2026-02-17

-- Add version field to content_assets
ALTER TABLE content_assets 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add index for efficient version queries
CREATE INDEX IF NOT EXISTS idx_content_assets_bundle_version 
ON content_assets(bundle_id, type, version DESC);

-- Add index for latest version queries
CREATE INDEX IF NOT EXISTS idx_content_assets_latest_version
ON content_assets(bundle_id, type, version DESC) 
WHERE status != 'archived';

COMMENT ON COLUMN content_assets.version IS 'Version number for asset regeneration (1 = original, 2+ = regenerated versions)';