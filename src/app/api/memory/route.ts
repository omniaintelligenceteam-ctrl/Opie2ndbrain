export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const memoryServerUrl = process.env.MEMORY_SERVER_URL || 'http://localhost:3456';
    const res = await fetch(`${memoryServerUrl}/memory`, {
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
