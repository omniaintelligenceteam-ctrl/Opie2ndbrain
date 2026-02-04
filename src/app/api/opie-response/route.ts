import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Poll for Opie responses from Supabase
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
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Get response for this session
  const { data, error } = await supabase
    .from('opie_responses')
    .select('*')
    .eq('session_key', sessionKey)
    .eq('status', 'complete')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  
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
}
