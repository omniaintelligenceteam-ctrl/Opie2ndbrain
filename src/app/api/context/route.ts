import { NextRequest, NextResponse } from 'next/server';
import { GATEWAY_URL, GATEWAY_TOKEN, IS_VERCEL } from '@/lib/gateway';
import {
  ContextWindowState,
  ContextSegment,
  getWarningLevel,
  DEMO_SEGMENTS,
} from '@/lib/contextTypes';

// In-memory store for forgotten segments (in production, use persistent storage)
const forgottenSegments = new Set<string>();

export async function GET() {
  // Check if gateway is available
  const gatewayUnavailable = IS_VERCEL && GATEWAY_URL.includes('localhost');

  if (gatewayUnavailable || !GATEWAY_TOKEN) {
    // Return demo data
    const segments = DEMO_SEGMENTS.filter(s => !forgottenSegments.has(s.id));
    const used = segments.reduce((sum, s) => sum + s.tokenCount, 0);
    const total = 128000;
    const percentage = (used / total) * 100;

    const response: ContextWindowState = {
      used,
      total,
      percentage,
      segments: segments.map(s => ({
        ...s,
        percentage: used > 0 ? (s.tokenCount / used) * 100 : 0,
      })),
      lastUpdated: new Date().toISOString(),
      warningLevel: getWarningLevel(percentage),
    };

    return NextResponse.json(response);
  }

  try {
    // Get real session status via /tools/invoke
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        tool: 'session_status',
        args: {},
      }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      
      if (data.ok && data.result) {
        // Parse the result - it may be in content[0].text as stringified JSON
        let sessionData = data.result;
        if (data.result.content?.[0]?.text) {
          try {
            // Extract numbers from the status text
            const text = data.result.content[0].text;
            const contextMatch = text.match(/Context:\s*([\d.]+)k\/([\d.]+)k\s*\((\d+)%\)/);
            const tokensMatch = text.match(/Tokens:\s*([\d.]+)\s*in\s*\/\s*([\d.]+)\s*out/);
            
            if (contextMatch) {
              const used = parseFloat(contextMatch[1]) * 1000;
              const total = parseFloat(contextMatch[2]) * 1000;
              const percentage = parseFloat(contextMatch[3]);
              
              const segments: ContextSegment[] = [
                {
                  id: 'conversation',
                  type: 'conversation',
                  label: 'Active Conversation',
                  tokenCount: Math.round(used),
                  percentage: 100,
                  canForget: false,
                },
              ];

              const response: ContextWindowState = {
                used: Math.round(used),
                total: Math.round(total),
                percentage,
                segments,
                lastUpdated: new Date().toISOString(),
                warningLevel: getWarningLevel(percentage),
              };

              return NextResponse.json(response);
            }
          } catch (parseErr) {
            console.error('Failed to parse session status:', parseErr);
          }
        }
      }
    }

    // Fallback to demo data
    return returnDemoData();
  } catch (error) {
    console.error('Context fetch error:', error);
    return returnDemoData();
  }
}

function returnDemoData() {
  const segments = DEMO_SEGMENTS.filter(s => !forgottenSegments.has(s.id));
  const used = segments.reduce((sum, s) => sum + s.tokenCount, 0);
  const total = 128000;
  const percentage = (used / total) * 100;

  const response: ContextWindowState = {
    used,
    total,
    percentage,
    segments: segments.map(s => ({
      ...s,
      percentage: used > 0 ? (s.tokenCount / used) * 100 : 0,
    })),
    lastUpdated: new Date().toISOString(),
    warningLevel: getWarningLevel(percentage),
  };

  return NextResponse.json(response);
}

export async function POST(req: NextRequest) {
  const { action, segmentId } = await req.json();

  if (action === 'forget' && segmentId) {
    forgottenSegments.add(segmentId);

    // If gateway is available, try to send forget command
    const gatewayUnavailable = IS_VERCEL && GATEWAY_URL.includes('localhost');

    if (!gatewayUnavailable && GATEWAY_TOKEN) {
      try {
        await fetch(`${GATEWAY_URL}/api/context/forget`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GATEWAY_TOKEN}`,
          },
          body: JSON.stringify({ segmentId }),
        });
      } catch (e) {
        console.error('Failed to send forget to gateway:', e);
      }
    }

    return NextResponse.json({ success: true, forgotten: segmentId });
  }

  if (action === 'clear') {
    forgottenSegments.clear();
    return NextResponse.json({ success: true, cleared: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
