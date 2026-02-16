-- Add agent_session_id to workflows table for gateway session tracking
-- This enables the completion poller to check agent status via the gateway
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS agent_session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_workflows_agent_session ON workflows(agent_session_id) WHERE agent_session_id IS NOT NULL;
