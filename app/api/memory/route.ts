export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const res = await fetch('http://143.198.128.209:3456/memory', {
      cache: 'no-store'
    });
    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    return Response.json({ 
      error: 'Memory server unavailable',
      longTerm: '',
      dailyNotes: [],
      lastModified: null
    }, { status: 503 });
  }
}