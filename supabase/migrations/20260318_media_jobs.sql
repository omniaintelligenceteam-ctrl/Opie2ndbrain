-- Media generation jobs for image/video requests from Content Studio

CREATE TABLE IF NOT EXISTS public.media_jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  description TEXT NOT NULL,
  platform TEXT,
  aspect_ratio TEXT,
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
  session_key TEXT,
  media_url TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_jobs_status_created
ON public.media_jobs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_jobs_created
ON public.media_jobs(created_at DESC);

