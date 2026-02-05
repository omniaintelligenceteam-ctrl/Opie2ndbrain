import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OLLAMA_URL = process.env.OLLAMA_API_URL || 'https://api.ollama.com/v1';
const OLLAMA_KEY = process.env.OLLAMA_API_KEY || '';

async function getEmbedding(text: string): Promise<number[] | null> {
  if (OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text.slice(0, 8000),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.data?.[0]?.embedding || null;
      }
    } catch (e) {
      console.error('[Search] OpenAI error:', e);
    }
  }

  // Fallback to Ollama
  try {
    const response = await fetch(`${OLLAMA_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OLLAMA_KEY}`,
      },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        input: text.slice(0, 8000),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const embedding = data.data?.[0]?.embedding || [];
      while (embedding.length < 1536) embedding.push(0);
      return embedding.slice(0, 1536);
    }
  } catch (e) {
    console.log('[Search] Ollama embedding not available');
  }

  return null;
}

// Search for semantically similar past conversations
export async function POST(req: NextRequest) {
  try {
    const { 
      query, 
      sessionId = 'default', 
      threshold = 0.7, 
      limit = 5 
    } = await req.json();

    if (!query || !supabaseAdmin) {
      return NextResponse.json({ error: 'Missing query or Supabase not configured' }, { status: 400 });
    }

    // Get query embedding
    const queryEmbedding = await getEmbedding(query);
    
    if (!queryEmbedding) {
      return NextResponse.json({ 
        results: [],
        reason: 'No embedding provider available (add OPENAI_API_KEY for vector search)'
      });
    }

    // Search using Supabase function
    const { data, error } = await supabaseAdmin.rpc('search_memory', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      filter_session: sessionId
    });

    if (error) {
      console.error('[Search] RPC error:', error);
      // Fallback to direct query if function doesn't exist
      const { data: fallbackData } = await supabaseAdmin
        .from('opie_embeddings')
        .select('chunk_text, chunk_type, metadata')
        .eq('session_id', sessionId)
        .limit(limit);
      
      return NextResponse.json({ 
        results: fallbackData || [],
        method: 'fallback'
      });
    }

    console.log('[Search] Found', data?.length || 0, 'results');

    return NextResponse.json({ 
      results: data || [],
      method: 'vector'
    });

  } catch (error) {
    console.error('[Search] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// GET endpoint for quick context retrieval
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');
  const sessionId = req.nextUrl.searchParams.get('sessionId') || 'default';
  
  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
  }

  // Reuse POST logic
  return POST(new NextRequest(req.url, {
    method: 'POST',
    body: JSON.stringify({ query, sessionId }),
  }));
}
