import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabaseAdmin: SupabaseClient | null = null;
let _supabase: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
}

function getSupabaseServiceKey(): string {
  return process.env.SUPABASE_SERVICE_KEY || '';
}

function getSupabaseAnonKey(): string {
  return process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
}

// Server-side client (uses service key for full access) - lazy loaded
export const supabaseAdmin = {
  from: (table: string) => {
    if (!_supabaseAdmin) {
      const url = getSupabaseUrl();
      const key = getSupabaseServiceKey();
      if (!url || !key) {
        throw new Error('Supabase not configured - missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
      }
      _supabaseAdmin = createClient(url, key, { auth: { persistSession: false } });
    }
    return _supabaseAdmin.from(table);
  }
};

// Client-side safe client (uses anon key, respects RLS) - lazy loaded
export const supabase = {
  from: (table: string) => {
    if (!_supabase) {
      const url = getSupabaseUrl();
      const key = getSupabaseAnonKey();
      if (!url || !key) {
        throw new Error('Supabase not configured');
      }
      _supabase = createClient(url, key, { auth: { persistSession: false } });
    }
    return _supabase.from(table);
  }
};

export interface OpieResponse {
  id: string;
  request_id: string;
  session_id: string | null;
  user_message: string | null;
  response: string | null;
  status: 'pending' | 'complete' | 'error';
  error: string | null;
  created_at: string;
  completed_at: string | null;
}
