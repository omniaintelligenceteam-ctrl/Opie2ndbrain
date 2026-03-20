import { NextResponse } from 'next/server';
import { RELAY_BASE } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!RELAY_BASE) {
    return NextResponse.json({ ok: true, totalCost: 0, totalTokens: 0, byModel: [], byAgent: [], tokenUsage: { input: 0, output: 0 }, trend7d: [] });
  }

  try {
    const res = await fetch(`${RELAY_BASE}/api/costs/summary`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ ok: true, totalCost: 0, totalTokens: 0, byModel: [], byAgent: [], tokenUsage: { input: 0, output: 0 }, trend7d: [] });
  }
}
