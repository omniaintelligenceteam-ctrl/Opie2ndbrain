import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Poll for async EXECUTE task status
export async function GET(req: NextRequest) {
  const requestId = req.nextUrl.searchParams.get('request_id');
  
  if (!requestId) {
    return NextResponse.json({ error: 'Missing request_id' }, { status: 400 });
  }
  
  try {
    // Check if Supabase is configured
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    // Get task status from Supabase
    const { data, error } = await supabaseAdmin
      .from('opie_requests')
      .select('*')
      .eq('request_id', requestId)
      .single();
    
    if (error || !data) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    // Return current status
    return NextResponse.json({
      status: data.status,
      response: data.response,
      error: data.error,
      updated_at: data.updated_at,
    });
    
  } catch (error) {
    console.error('[Poll] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
