-- Add 'cancelled' status to content_bundles
-- Supports user-initiated pipeline cancellation at any active stage

-- Drop existing constraint
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints
               WHERE constraint_name = 'content_bundles_status_check') THEN
        ALTER TABLE content_bundles DROP CONSTRAINT content_bundles_status_check;
    END IF;
END $$;

-- Recreate with 'cancelled' added
ALTER TABLE content_bundles ADD CONSTRAINT content_bundles_status_check
CHECK (status IN ('researching', 'awaiting_strategy_approval', 'creating', 'review', 'complete', 'failed', 'cancelled'));

-- Add cancelled_at timestamp for audit trail
ALTER TABLE content_bundles ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
COMMENT ON COLUMN content_bundles.cancelled_at IS 'When the bundle was cancelled by the user';
