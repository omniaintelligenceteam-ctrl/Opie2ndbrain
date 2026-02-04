export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    
    if (!query || query.length < 3) {
      return Response.json({ error: 'Query must be at least 3 characters' }, { status: 400 });
    }
    
    // Forward to memory server
    const memoryRes = await fetch(`http://143.198.128.209:3456/memory/search?q=${encodeURIComponent(query)}`);
    
    if (!memoryRes.ok) {
      throw new Error(`Memory server error: ${memoryRes.status}`);
    }
    
    // Stream response through
    return new Response(memoryRes.body, {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Memory search error:', error);
    return Response.json(
      { error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 503 }
    );
  }
}