import { NextResponse } from 'next/server';
import { RELAY_BASE } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!RELAY_BASE) {
    return NextResponse.json({ ok: true, leads: [], summary: { hot: 0, warm: 0, cold: 0 } });
  }

  try {
    const res = await fetch(`${RELAY_BASE}/api/crm/leads`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ ok: true, leads: [], summary: { hot: 0, warm: 0, cold: 0 } });
  }
}
