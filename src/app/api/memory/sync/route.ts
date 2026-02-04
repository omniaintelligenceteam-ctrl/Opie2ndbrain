import { NextRequest, NextResponse } from 'next/server';
import { readMemory, searchMemory, getMemoryContext } from '@/lib/memorySync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: Read recent memory for context building
export async function GET(req: NextRequest) {
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10');
  const since = req.nextUrl.searchParams.get('since'); // ISO timestamp

  try {
    const memory = await readMemory({ limit, since: since || undefined });
    return NextResponse.json({ memory });
  } catch (error) {
    console.error('[Memory Sync] GET error:', error);
    return NextResponse.json({ error: 'Failed to read memory' }, { status: 500 });
  }
}

// POST: Search memory or get context summary
export async function POST(req: NextRequest) {
  try {
    const { action, query, limit = 5 } = await req.json();

    if (action === 'search' && query) {
      const results = await searchMemory(query, limit);
      return NextResponse.json({ results });
    }

    if (action === 'context') {
      const context = await getMemoryContext(limit);
      return NextResponse.json({ context });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Memory Sync] POST error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
