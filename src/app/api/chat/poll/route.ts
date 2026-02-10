// Poll endpoint for async OpenClaw responses
// Dashboard polls this to get the response from webhook

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getResponseFromMemory } from '@/app/api/webhook/openclaw/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const runId = searchParams.get('runId');
    const sessionKey = searchParams.get('sessionKey');

    if (!runId) {
      return NextResponse.json({ error: 'Missing runId' }, { status: 400 });
    }

    // Check memory first (fastest)
    const memoryResp = getResponseFromMemory(runId);
    if (memoryResp) {
      return NextResponse.json({
        status: 'complete',
        response: memoryResp.text,
        source: 'memory',
      });
    }

    // Check Supabase
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('opie_responses')
        .select('*')
        .eq('run_id', runId)
        .single();

      if (data && !error) {
        return NextResponse.json({
          status: data.status,
          response: data.response_text,
          source: 'supabase',
        });
      }
    }

    // Not found yet
    return NextResponse.json({
      status: 'pending',
      response: null,
    });
  } catch (err) {
    console.error('Poll error:', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
