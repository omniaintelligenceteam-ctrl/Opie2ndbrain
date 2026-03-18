CREATE TABLE IF NOT EXISTS public.larry_jobs (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'generating',
  video_url TEXT,
  video_path TEXT,
  discord_channel_id TEXT,
  discord_message_id TEXT,
  error_message TEXT,
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_larry_jobs_status ON public.larry_jobs(status);
CREATE INDEX IF NOT EXISTS idx_larry_jobs_created_at ON public.larry_jobs(created_at DESC);
