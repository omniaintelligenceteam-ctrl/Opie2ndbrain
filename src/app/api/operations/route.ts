/**
 * GET /api/operations — last 200 agent events (or SSE stream with ?sse param)
 */
import { NextRequest, NextResponse } from 'next/server';
import { RELAY_BASE } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!RELAY_BASE) {
    return NextResponse.json({ events: [], live: false });
  }

  const url = new URL(req.url);
  const isSSE = url.searchParams.has('sse');
  const endpoint = isSSE
    ? `${RELAY_BASE}/api/operations/live`
    : `${RELAY_BASE}/api/operations/recent`;

  try {
    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(isSSE ? 60000 : 5000),
    });
    if (!res.ok) return NextResponse.json({ events: [], live: false });

    if (isSSE && res.body) {
      return new Response(res.body as ReadableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ events: [], live: false });
  }
}
