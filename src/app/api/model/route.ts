import { NextRequest, NextResponse } from 'next/server';

// Valid model aliases
const VALID_MODELS = ['opus', 'sonnet', 'haiku'] as const;
type ModelAlias = typeof VALID_MODELS[number];

// In-memory model preference (shared with chat route via module scope)
// Note: This resets on cold start, but Vercel will keep it warm for a while
let currentModel: ModelAlias = 'sonnet';

export function getCurrentModel(): ModelAlias {
  return currentModel;
}

export async function POST(req: NextRequest) {
  try {
    const { model } = await req.json();
    
    if (!model) {
      return NextResponse.json({ error: 'No model specified' }, { status: 400 });
    }

    // Validate model
    if (!VALID_MODELS.includes(model)) {
      return NextResponse.json({ error: 'Invalid model. Valid options: opus, sonnet, haiku' }, { status: 400 });
    }

    // Update in-memory model preference
    currentModel = model;
    console.log('[Model API] Set model to:', model);

    return NextResponse.json({ 
      success: true, 
      model: model,
    });

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