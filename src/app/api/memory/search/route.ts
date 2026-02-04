export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  
  if (!query) {
    return Response.json({ error: 'Missing query param q' }, { status: 400 });
  }
  
  const res = await fetch(`http://143.198.128.209:3456/memory/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  
  return Response.json(data);
}