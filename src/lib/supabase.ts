// Supabase admin client for server-side operations
import { createClient } from '@supabase/supabase-js';

// Hardcoded to working project - wsiedmznnwaejwonuraj
const supabaseUrl = 'https://wsiedmznnwaejwonuraj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

// Create admin client
export const supabaseAdmin = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
  : null;
