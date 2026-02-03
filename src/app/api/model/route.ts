import { NextRequest, NextResponse } from 'next/server';

// Model mapping from aliases to full provider/model format
const MODEL_MAP = {
  'opus': 'anthropic/claude-opus-4-5',
  'sonnet': 'anthropic/claude-sonnet-4-20250514', 
  'haiku': 'anthropic/claude-3-5-haiku-20241022',
  'kimi': 'ollama/kimi-k2-instruct',
} as const;

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;

export async function POST(req: NextRequest) {
  if (!GATEWAY_TOKEN) {
    return NextResponse.json({ error: 'Gateway token not configured' }, { status: 500 });
  }

  try {
    const { model } = await req.json();
    
    if (!model) {
      return NextResponse.json({ error: 'No model specified' }, { status: 400 });
    }

    // Get full model name from alias
    const fullModelName = MODEL_MAP[model as keyof typeof MODEL_MAP];
    if (!fullModelName) {
      return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
    }

    // Set model for the main session
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        tool: 'session_status',
        args: {
          sessionKey: 'agent:main:main',
          model: fullModelName,
        },
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Failed to set model:', res.status, errorText);
      return NextResponse.json({ 
        error: `Failed to set model: ${res.status}`,
        details: errorText 
      }, { status: 500 });
    }

    const data = await res.json();
    console.log('[Model API] Set model to:', fullModelName);

    return NextResponse.json({ 
      success: true, 
      model: fullModelName,
      response: data 
    });

  } catch (error) {
    console.error('Model switching error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}