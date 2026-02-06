import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering (uses searchParams)
export const dynamic = 'force-dynamic';

const supabaseAdmin = getSupabaseAdmin();

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('sessionId') || 'default';
    const category = req.nextUrl.searchParams.get('category'); // optional filter
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    // Fetch user memory
    let query = supabaseAdmin
      .from('opie_user_memory')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('category', category);
    }

    const { data: memories, error } = await query;

    if (error) {
      console.error('[Memory Get] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by category
    const grouped = {
      facts: memories?.filter(m => m.category === 'fact').map(m => m.content) || [],
      preferences: memories?.filter(m => m.category === 'preference').map(m => m.content) || [],
      decisions: memories?.filter(m => m.category === 'decision').map(m => m.content) || [],
      action_items: memories?.filter(m => m.category === 'action item').map(m => m.content) || [],
    };

    // Format for system prompt injection
    const formatted = formatForPrompt(grouped);

    return NextResponse.json({ 
      memories: grouped,
      formatted,
      total: memories?.length || 0
    });

  } catch (error) {
    console.error('[Memory Get] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function formatForPrompt(grouped: Record<string, string[]>): string {
  const sections = [];

  if (grouped.facts.length > 0) {
    sections.push(`**Known Facts:**\n${grouped.facts.map(f => `- ${f}`).join('\n')}`);
  }
  if (grouped.preferences.length > 0) {
    sections.push(`**User Preferences:**\n${grouped.preferences.map(p => `- ${p}`).join('\n')}`);
  }
  if (grouped.decisions.length > 0) {
    sections.push(`**Past Decisions:**\n${grouped.decisions.slice(0, 5).map(d => `- ${d}`).join('\n')}`);
  }
  if (grouped.action_items.length > 0) {
    sections.push(`**Pending Actions:**\n${grouped.action_items.slice(0, 5).map(a => `- ${a}`).join('\n')}`);
  }

  return sections.length > 0 
    ? `## User Memory\n${sections.join('\n\n')}`
    : '';
}
