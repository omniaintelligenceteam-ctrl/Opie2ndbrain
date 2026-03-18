/**
 * One-time migration runner — POST /api/admin/migrate
 * Runs the missing_tables migration against Supabase.
 * Protected by ADMIN_SECRET env var.
 * DELETE THIS FILE after migration is confirmed.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIGRATION_SQL = `
-- ab_tests
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'control',
  config JSONB DEFAULT '{}',
  results JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- content_analytics
CREATE TABLE IF NOT EXISTS content_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id TEXT NOT NULL,
  content_type TEXT,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- content_comments
CREATE TABLE IF NOT EXISTS content_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id TEXT NOT NULL,
  author TEXT DEFAULT 'Wes',
  body TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- content_images
CREATE TABLE IF NOT EXISTS content_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id TEXT NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT,
  width INTEGER,
  height INTEGER,
  mime_type TEXT DEFAULT 'image/jpeg',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- image_generation_jobs
CREATE TABLE IF NOT EXISTS image_generation_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt TEXT NOT NULL,
  model TEXT DEFAULT 'dall-e-3',
  status TEXT DEFAULT 'pending',
  result_url TEXT,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- larry_jobs
CREATE TABLE IF NOT EXISTS larry_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- media_jobs
CREATE TABLE IF NOT EXISTS media_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type TEXT NOT NULL,
  source_url TEXT,
  output_url TEXT,
  status TEXT DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- opie_conversation_summaries
CREATE TABLE IF NOT EXISTS opie_conversation_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  session_id TEXT DEFAULT 'default',
  summary TEXT NOT NULL,
  key_topics TEXT[] DEFAULT '{}',
  action_items TEXT[] DEFAULT '{}',
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- webhooks
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] DEFAULT '{}',
  secret TEXT,
  active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- opie_user_memory_v2 (referenced in some code paths)
CREATE TABLE IF NOT EXISTS opie_user_memory_v2 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL DEFAULT 'default',
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  confidence FLOAT DEFAULT 1.0,
  source TEXT DEFAULT 'conversation',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, key)
);
`;

// Split into individual statements for execution
function splitStatements(sql: string): string[] {
  return sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 10 && !s.startsWith('--'));
}

export async function POST(req: NextRequest) {
  // Simple secret check
  const secret = req.headers.get('x-admin-secret') || new URL(req.url).searchParams.get('secret');
  const adminSecret = process.env.ADMIN_SECRET || 'opie-migrate-2026';
  if (secret !== adminSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY!;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase env vars missing' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const statements = splitStatements(MIGRATION_SQL);
  const results: { stmt: string; ok: boolean; error?: string }[] = [];

  for (const stmt of statements) {
    const shortStmt = stmt.slice(0, 80).replace(/\n/g, ' ');
    try {
      // Use rpc to execute raw SQL if exec_sql exists
      const { error } = await supabase.rpc('exec_sql', { query: stmt });
      if (error) {
        // Try direct insert approach for CREATE TABLE (won't work but worth logging)
        results.push({ stmt: shortStmt, ok: false, error: error.message });
      } else {
        results.push({ stmt: shortStmt, ok: true });
      }
    } catch (e: any) {
      results.push({ stmt: shortStmt, ok: false, error: e.message });
    }
  }

  const failed = results.filter(r => !r.ok);
  const succeeded = results.filter(r => r.ok);

  return NextResponse.json({
    total: statements.length,
    succeeded: succeeded.length,
    failed: failed.length,
    results,
    note: failed.length > 0
      ? 'Some statements failed — exec_sql RPC may not exist. Run migration manually in Supabase SQL Editor.'
      : 'All statements executed successfully.',
  });
}

export async function GET(req: NextRequest) {
  // Return the migration SQL for easy copy-paste into Supabase SQL Editor
  const secret = new URL(req.url).searchParams.get('secret');
  const adminSecret = process.env.ADMIN_SECRET || 'opie-migrate-2026';
  if (secret !== adminSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return new Response(MIGRATION_SQL, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
