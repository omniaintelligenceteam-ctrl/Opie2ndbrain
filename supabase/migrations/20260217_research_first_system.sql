-- Research-First Content Creation System Database Updates
-- Adds research findings, strategy documentation, and workflow status tracking
-- Created: 2026-02-17

-- Add research_findings to content_bundles
ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS research_findings JSONB;
ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS strategy_doc JSONB;

-- Update status field to support research workflow
-- Drop existing status check constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'content_bundles_status_check') THEN
        ALTER TABLE content_bundles DROP CONSTRAINT content_bundles_status_check;
    END IF;
END $$;

-- Add new status constraint with research workflow states
ALTER TABLE content_bundles ADD CONSTRAINT content_bundles_status_check 
CHECK (status IN ('researching', 'awaiting_strategy_approval', 'creating', 'review', 'complete', 'failed'));

-- Update existing records to have 'creating' status instead of invalid ones
UPDATE content_bundles SET status = 'creating' WHERE status NOT IN ('researching', 'awaiting_strategy_approval', 'creating', 'review', 'complete', 'failed');

-- Add research tracking fields
ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS research_started_at TIMESTAMPTZ;
ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS research_completed_at TIMESTAMPTZ;
ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS strategy_started_at TIMESTAMPTZ;
ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS strategy_completed_at TIMESTAMPTZ;
ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS creation_started_at TIMESTAMPTZ;

-- Add research session tracking
ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS research_session_id TEXT;

-- Add indexes for research workflow queries
CREATE INDEX IF NOT EXISTS idx_content_bundles_research_status
ON content_bundles(status, research_started_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_bundles_research_session
ON content_bundles(research_session_id) WHERE research_session_id IS NOT NULL;

-- Add metadata to track which research elements influenced each asset
ALTER TABLE content_assets ADD COLUMN IF NOT EXISTS research_influence JSONB;

COMMENT ON COLUMN content_bundles.research_findings IS 'Complete research data: trends, stats, competitors, hooks, brand voice';
COMMENT ON COLUMN content_bundles.strategy_doc IS 'Platform-specific content strategy based on research findings';  
COMMENT ON COLUMN content_bundles.research_session_id IS 'Session ID for the research agent';
COMMENT ON COLUMN content_assets.research_influence IS 'Which research elements influenced this asset (for transparency)';

-- Update realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE content_bundles;
ALTER PUBLICATION supabase_realtime ADD TABLE content_assets;