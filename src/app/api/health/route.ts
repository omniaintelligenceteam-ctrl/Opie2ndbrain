/**
 * GET /api/health — Vercel server-side health check
 * Proxies to opie-relay.js on port 19100
 */
import { NextResponse } from 'next/server';
import { RELAY_BASE } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!RELAY_BASE) {
    return NextResponse.json({ ok: false, error: 'RELAY_BASE not configured' });
  }
  try {
    const res = await fetch(`${RELAY_BASE}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Relay unreachable' });
  }
}
