// Supabase admin client for server-side operations
import { createClient } from '@supabase/supabase-js';

// URL can be overridden via env var, defaults to working project
const supabaseUrl = process.env.SUPABASE_URL || 'https://wsiedmznnwaejwonuraj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

// Create admin client (null if not configured)
export const supabaseAdmin = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
  : null;
