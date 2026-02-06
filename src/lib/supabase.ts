// Consolidated Supabase client — singleton pattern
// Server-side: uses SUPABASE_SERVICE_KEY (admin)
// Client-side: uses NEXT_PUBLIC_SUPABASE_ANON_KEY
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── Server-side admin client (API routes, server components) ───────────────
const supabaseUrl = process.env.SUPABASE_URL
  || process.env.NEXT_PUBLIC_SUPABASE_URL
  || 'https://wsiedmznnwaejwonuraj.supabase.co';

const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

let _supabaseAdmin: SupabaseClient | null = null;

/**
 * Returns the server-side admin Supabase client (singleton).
 * Returns null if no service key is configured.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseServiceKey) return null;
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  }
  return _supabaseAdmin;
}

/** Legacy export — same as getSupabaseAdmin() */
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null;

// ─── Client-side anon client (browser components) ───────────────────────────
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let _supabaseClient: SupabaseClient | null = null;

/**
 * Returns the client-side anon Supabase client (singleton).
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseAnonKey) return null;
  if (!_supabaseClient) {
    _supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl,
      supabaseAnonKey,
      { auth: { persistSession: false } },
    );
  }
  return _supabaseClient;
}

/** Legacy export — same as getSupabaseClient() */
export const supabase = supabaseAnonKey
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl,
      supabaseAnonKey,
      { auth: { persistSession: false } },
    )
  : null;
