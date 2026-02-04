import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Webhook endpoint for OpenClaw to deliver spawn results
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Extract data from OpenClaw delivery
    const { request_id, session_id, response, status, error } = body;
    
    if (!request_id) {
      return NextResponse.json({ error: 'Missing request_id' }, { status: 400 });
    }
    
    // Update the response in Supabase
    const { error: dbError } = await supabaseAdmin
      .from('opie_responses')
      .update({
        session_id,
        response,
        status: status || 'complete',
        error,
        completed_at: new Date().toISOString(),
      })
      .eq('request_id', request_id);
    
    if (dbError) {
      console.error('[Webhook] Supabase error:', dbError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Allow GET for health checks
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'openclaw-webhook' });
}
