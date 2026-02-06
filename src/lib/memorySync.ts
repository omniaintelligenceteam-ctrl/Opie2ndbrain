// Bi-directional memory sync between Opie (me) and Opie2ndbrain (web app)
// Both write to Supabase, both read from Supabase

import { getSupabaseAdmin } from '@/lib/supabase';

// Use consolidated singleton
function getSupabase() {
  return getSupabaseAdmin();
}

export interface MemoryEntry {
  id?: string;
  source: 'telegram' | 'web_app' | 'sub_agent';
  session_id: string;
  timestamp: string;
  category: 'decision' | 'insight' | 'preference' | 'project_update' | 'fact';
  content: string;
  context?: string;
  tags?: string[];
}

// Write memory from any source
export async function writeMemory(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('[MemorySync] Supabase not configured');
    return;
  }

  const { error } = await supabase
    .from('opie_memory')
    .insert({
      ...entry,
      timestamp: new Date().toISOString(),
    } as any);

  if (error) {
    console.error('[MemorySync] Write failed:', error);
  }
}

// Read recent memory from all sources
export async function readMemory(
  options: {
    limit?: number;
    since?: string;
    category?: string;
    source?: string;
  } = {}
): Promise<MemoryEntry[]> {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('[MemorySync] Supabase not configured');
    return [];
  }

  let query = supabase
    .from('opie_memory')
    .select('*')
    .order('timestamp', { ascending: false });

  if (options.limit) query = query.limit(options.limit);
  if (options.since) query = query.gte('timestamp', options.since);
  if (options.category) query = query.eq('category', options.category);
  if (options.source) query = query.eq('source', options.source);

  const { data, error } = await query as any;

  if (error) {
    console.error('[MemorySync] Read failed:', error);
    return [];
  }

  return data || [];
}

// Search memory semantically (using Supabase text search)
export async function searchMemory(searchQuery: string, limit = 5): Promise<MemoryEntry[]> {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('[MemorySync] Supabase not configured');
    return [];
  }

  const { data, error } = await supabase
    .from('opie_memory')
    .select('*')
    .textSearch('content', searchQuery)
    .limit(limit) as any;

  if (error) {
    console.error('[MemorySync] Search failed:', error);
    return [];
  }

  return data || [];
}

// Get memory summary for context building
export async function getMemoryContext(maxEntries = 10): Promise<string> {
  const recent = await readMemory({ limit: maxEntries });

  if (recent.length === 0) return '';

  return recent
    .map(e => `[${e.source}] ${e.category}: ${e.content}`)
    .join('\n');
}
