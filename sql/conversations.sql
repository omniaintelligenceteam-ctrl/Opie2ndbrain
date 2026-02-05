-- Conversations table for persistent chat history
CREATE TABLE opie_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  title TEXT,
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by session
CREATE INDEX idx_conversations_session ON opie_conversations(session_id);
CREATE INDEX idx_conversations_updated ON opie_conversations(updated_at DESC);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON opie_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();
