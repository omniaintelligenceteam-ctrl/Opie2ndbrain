// Webhook endpoint for OpenClaw async responses
// OpenClaw sub-agent sends response here when done

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Simple in-memory store for responses (fallback if Supabase fails)
const responseStore = new Map<string, { text: string; timestamp: number }>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { runId, sessionKey, response, error } = body;

    if (!runId) {
      return NextResponse.json({ error: 'Missing runId' }, { status: 400 });
    }

    const responseData = {
      run_id: runId,
      session_key: sessionKey,
      response_text: response || error || 'No response',
      status: error ? 'error' : 'complete',
      timestamp: new Date().toISOString(),
    };

    // Store in memory (immediate access)
    responseStore.set(runId, {
      text: responseData.response_text,
      timestamp: Date.now(),
    });

    // Also try Supabase if available
    try {
      if (supabaseAdmin) {
        await supabaseAdmin
          .from('opie_responses')
          .upsert(responseData, { onConflict: 'run_id' });
      }
    } catch (e) {
      // Supabase failed, but memory store worked
      console.log('Supabase store failed, using memory store:', e);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of responseStore) {
    if (now - data.timestamp > 10 * 60 * 1000) {
      // Remove entries older than 10 minutes
      responseStore.delete(id);
    }
  }
}, 5 * 60 * 1000);

export function getResponseFromMemory(runId: string) {
  return responseStore.get(runId);
}
