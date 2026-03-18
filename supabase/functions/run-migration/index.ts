import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { db: { schema: 'public' } }
  )

  // Edge functions can use the admin client which has DDL access
  // via the pg connection pool
  const migrations = [
    `CREATE TABLE IF NOT EXISTS ab_tests (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, name TEXT NOT NULL, variant TEXT NOT NULL DEFAULT 'control', config JSONB DEFAULT '{}', results JSONB DEFAULT '{}', status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS content_analytics (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, content_id TEXT NOT NULL, content_type TEXT, event_type TEXT NOT NULL, metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS content_comments (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, content_id TEXT NOT NULL, author TEXT DEFAULT 'Wes', body TEXT NOT NULL, resolved BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS content_images (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, content_id TEXT NOT NULL, url TEXT NOT NULL, alt_text TEXT, width INTEGER, height INTEGER, mime_type TEXT DEFAULT 'image/jpeg', metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS image_generation_jobs (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, prompt TEXT NOT NULL, model TEXT DEFAULT 'dall-e-3', status TEXT DEFAULT 'pending', result_url TEXT, error TEXT, metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS larry_jobs (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, job_type TEXT NOT NULL, payload JSONB DEFAULT '{}', status TEXT DEFAULT 'pending', result JSONB, error TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS media_jobs (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, job_type TEXT NOT NULL, source_url TEXT, output_url TEXT, status TEXT DEFAULT 'pending', metadata JSONB DEFAULT '{}', error TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS opie_conversation_summaries (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, conversation_id TEXT NOT NULL, session_id TEXT DEFAULT 'default', summary TEXT NOT NULL, key_topics TEXT[] DEFAULT '{}', action_items TEXT[] DEFAULT '{}', message_count INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS webhooks (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL, events TEXT[] DEFAULT '{}', secret TEXT, active BOOLEAN DEFAULT true, last_triggered_at TIMESTAMPTZ, metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS opie_user_memory_v2 (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, session_id TEXT NOT NULL DEFAULT 'default', key TEXT NOT NULL, value TEXT NOT NULL, category TEXT DEFAULT 'general', confidence FLOAT DEFAULT 1.0, source TEXT DEFAULT 'conversation', metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(session_id, key))`,
  ]

  // Unfortunately supabase-js doesn't support raw DDL either
  // Edge functions DO have access to Deno.env SUPABASE_DB_URL though!
  const dbUrl = Deno.env.get('SUPABASE_DB_URL')
  
  return new Response(JSON.stringify({
    message: 'Edge function reached',
    hasDbUrl: !!dbUrl,
    tables: migrations.length,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
