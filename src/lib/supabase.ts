// =============================================================================
// Consolidated Supabase Client — Singleton pattern
// =============================================================================
// Server-side (admin) client using service key — for API routes and server components.
// Client-side (anon) client using public anon key — for browser-side operations.
//
// IMPORTANT: Import from here. Do NOT create Supabase clients elsewhere.
// =============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

// ---------------------------------------------------------------------------
// Server-side admin client (singleton)
// Uses service key — full access, no RLS.
// ---------------------------------------------------------------------------

let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (_supabaseAdmin) return _supabaseAdmin;

  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !key) return null;

  _supabaseAdmin = createClient(SUPABASE_URL, key, {
    auth: { persistSession: false },
  });
  return _supabaseAdmin;
}

/** Convenience export — same as getSupabaseAdmin() but evaluated once at import. */
export const supabaseAdmin = getSupabaseAdmin();

// ---------------------------------------------------------------------------
// Client-side (browser) client (singleton)
// Uses anon key — respects RLS policies.
// ---------------------------------------------------------------------------

let _supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (_supabaseClient) return _supabaseClient;

  const key = SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !key) return null;

  _supabaseClient = createClient(SUPABASE_URL, key, {
    auth: { persistSession: false },
  });
  return _supabaseClient;
}

/** Convenience export for browser-side code (replaces old supabaseClient.ts). */
export const supabase = getSupabaseClient();
