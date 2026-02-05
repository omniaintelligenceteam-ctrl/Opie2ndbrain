import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Embedding provider - supports OpenAI or Ollama
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OLLAMA_URL = process.env.OLLAMA_API_URL || 'https://api.ollama.com/v1';
const OLLAMA_KEY = process.env.OLLAMA_API_KEY || '';

async function getEmbedding(text: string): Promise<number[] | null> {
  // Try OpenAI first (better quality)
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
          input: text.slice(0, 8000), // Limit input
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.data?.[0]?.embedding || null;
      }
    } catch (e) {
      console.error('[Embed] OpenAI error:', e);
    }
  }

  // Fallback to Ollama (if embedding model available)
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
      // Pad to 1536 dimensions if needed
      const embedding = data.data?.[0]?.embedding || [];
      while (embedding.length < 1536) embedding.push(0);
      return embedding.slice(0, 1536);
    }
  } catch (e) {
    console.log('[Embed] Ollama embedding not available');
  }

  return null;
}

// Embed and store a message or chunk
export async function POST(req: NextRequest) {
  try {
    const { text, conversationId, sessionId = 'default', chunkType = 'message', metadata = {} } = await req.json();

    if (!text || !supabaseAdmin) {
      return NextResponse.json({ error: 'Missing text or Supabase not configured' }, { status: 400 });
    }

    // Get embedding
    const embedding = await getEmbedding(text);
    
    if (!embedding) {
      return NextResponse.json({ embedded: false, reason: 'No embedding provider available' });
    }

    // Store in Supabase
    const { error } = await supabaseAdmin.from('opie_embeddings').insert({
      session_id: sessionId,
      conversation_id: conversationId,
      chunk_text: text.slice(0, 2000), // Limit stored text
      chunk_type: chunkType,
      embedding: embedding,
      metadata
    });

    if (error) {
      console.error('[Embed] Storage error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ embedded: true });

  } catch (error) {
    console.error('[Embed] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
