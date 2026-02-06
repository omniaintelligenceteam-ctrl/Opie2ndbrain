import { NextRequest, NextResponse } from 'next/server';

// Valid model aliases - Kimi first as default
const VALID_MODELS = ['kimi', 'opus', 'sonnet', 'haiku'] as const;
type ModelAlias = typeof VALID_MODELS[number];

// NOTE: Module-level mutable state is unreliable in serverless (each cold start
// resets it, and concurrent instances don't share memory). This default is used
// only until the client sends a POST. For durable model selection, persist to
// a database or cookie.
const DEFAULT_MODEL: ModelAlias = 'kimi';

export async function POST(req: NextRequest) {
  try {
    const { model } = await req.json();
    
    if (!model) {
      return NextResponse.json({ error: 'No model specified' }, { status: 400 });
    }

    if (!VALID_MODELS.includes(model)) {
      return NextResponse.json({ 
        error: `Invalid model. Valid options: ${VALID_MODELS.join(', ')}` 
      }, { status: 400 });
    }

    // In a serverless environment the model preference should be persisted
    // (e.g. in a cookie, query-param, or database). For now we acknowledge
    // the selection and let the client pass it on subsequent chat requests.
    console.log('[Model API] Client selected model:', model);

    return NextResponse.json({ success: true, model });

  } catch (error) {
    console.error('Model switching error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  // Return the default — actual preference is client-side
  return NextResponse.json({ model: DEFAULT_MODEL });
}
