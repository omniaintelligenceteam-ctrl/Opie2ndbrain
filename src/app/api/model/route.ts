import { NextRequest, NextResponse } from 'next/server';

// Valid model aliases - Kimi first as default
const VALID_MODELS = ['kimi', 'opus', 'sonnet', 'haiku'] as const;
type ModelAlias = typeof VALID_MODELS[number];

// Default to Kimi
let currentModel: ModelAlias = 'kimi';

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

    currentModel = model;
    console.log('[Model API] Set model to:', model);

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
  return NextResponse.json({ model: currentModel });
}
