import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { GATEWAY_URL, GATEWAY_TOKEN } from '@/lib/gateway';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Poll for chat response status
export async function GET(req: NextRequest) {
  const requestId = req.nextUrl.searchParams.get('request_id');
  
  if (!requestId) {
    return NextResponse.json({ error: 'Missing request_id' }, { status: 400 });
  }
  
  try {
    // Get current status from Supabase
    const { data, error } = await supabaseAdmin
      .from('opie_responses')
      .select('*')
      .eq('request_id', requestId)
      .single();
    
    if (error || !data) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    // If already complete or error, return it
    if (data.status === 'complete' || data.status === 'error') {
      return NextResponse.json({
        status: data.status,
        response: data.response,
        error: data.error,
      });
    }
    
    // If pending and we have a session_id, check OpenClaw for updates
    if (data.status === 'pending' && data.session_id) {
      try {
        const historyRes = await fetch(`${GATEWAY_URL}/tools/invoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
          },
          body: JSON.stringify({
            tool: 'sessions_history',
            args: {
              sessionKey: data.session_id,
              limit: 1,
            },
          }),
          signal: AbortSignal.timeout(5000),
        });
        
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          
          // Check if session has a response
          if (historyData.ok && historyData.result?.messages?.length > 0) {
            const lastMsg = historyData.result.messages[historyData.result.messages.length - 1];
            
            if (lastMsg.role === 'assistant' && lastMsg.content) {
              // Update Supabase with the response
              await supabaseAdmin
                .from('opie_responses')
                .update({
                  response: lastMsg.content,
                  status: 'complete',
                  completed_at: new Date().toISOString(),
                })
                .eq('request_id', requestId);
              
              return NextResponse.json({
                status: 'complete',
                response: lastMsg.content,
              });
            }
          }
        }
      } catch (e) {
        console.error('[Poll] Error checking session:', e);
      }
    }
    
    // Still pending
    return NextResponse.json({
      status: 'pending',
      message: 'Processing...',
    });
    
  } catch (error) {
    console.error('[Poll] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
