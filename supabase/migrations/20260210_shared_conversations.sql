-- Shared Conversations Table
-- Bridges context between Dashboard and Telegram sessions
-- Created: 2026-02-10

CREATE TABLE IF NOT EXISTS shared_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL DEFAULT 'wes-main-session',
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('dashboard', 'telegram')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index for fast session lookups
  CONSTRAINT idx_session_created UNIQUE (session_id, created_at, id)
);

-- Index for querying by session
CREATE INDEX IF NOT EXISTS idx_shared_conversations_session 
ON shared_conversations(session_id, created_at DESC);

-- Index for querying by source
CREATE INDEX IF NOT EXISTS idx_shared_conversations_source
ON shared_conversations(source, created_at DESC);

-- Enable RLS
ALTER TABLE shared_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY "Service role full access" ON shared_conversations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Auto-cleanup old messages (keep last 100 per session)
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

-- Trigger to auto-cleanup
DROP TRIGGER IF EXISTS trigger_cleanup_shared_messages ON shared_conversations;
CREATE TRIGGER trigger_cleanup_shared_messages
  AFTER INSERT ON shared_conversations
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_shared_messages();

COMMENT ON TABLE shared_conversations IS 'Bridges conversation context between Dashboard and Telegram sessions';
