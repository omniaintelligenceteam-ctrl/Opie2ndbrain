/**
 * GET /api/memory/activity — recent memory events
 */
import { NextResponse } from 'next/server';
import { RELAY_BASE } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!RELAY_BASE) {
    return NextResponse.json({ events: [], contextUsed: 14200, contextTotal: 200000 });
  }
  try {
    const res = await fetch(`${RELAY_BASE}/api/memory/activity`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ events: [], contextUsed: 14200, contextTotal: 200000 });
  }
}
