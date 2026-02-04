export const dynamic = 'force-dynamic';

// Poll for Opie responses from Supabase via REST API
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionKey = searchParams.get('sessionKey');
  
  if (!sessionKey) {
    return Response.json({ error: 'Missing sessionKey' }, { status: 400 });
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
  
  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ error: 'Supabase not configured' }, { status: 503 });
  }
  
  try {
    // Query Supabase REST API directly
    const response = await fetch(
      `${supabaseUrl}/rest/v1/opie_responses?session_key=eq.${encodeURIComponent(sessionKey)}&status=eq.complete&order=created_at.desc&limit=1`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      return Response.json({ error: `Supabase error: ${error}` }, { status: 500 });
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return Response.json({
        found: true,
        response: data[0],
      });
    }
    
    return Response.json({
      found: false,
      status: 'pending',
    });
    
  } catch (error) {
    console.error('Poll error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
