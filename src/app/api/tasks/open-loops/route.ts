/**
 * GET /api/tasks/open-loops — parsed open loops / active tasks
 */
import { NextResponse } from 'next/server';
import { RELAY_BASE } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!RELAY_BASE) {
    return NextResponse.json({ tasks: [] });
  }
  try {
    const res = await fetch(`${RELAY_BASE}/api/tasks/open-loops`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ tasks: [] });
  }
}
