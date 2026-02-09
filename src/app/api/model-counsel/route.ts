import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Force Node.js runtime for full env var access
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface ModelResponse {
  model: string;
  response: string;
  timing: number;
  tokens: number;
  error?: string;
}

interface RequestModel {
  id: string;
  name: string;
  modelId: string;
  provider: 'anthropic' | 'ollama';
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Fallback models if none provided
const DEFAULT_MODELS: RequestModel[] = [
  { id: 'opus46', name: 'Claude Opus 4.6', modelId: 'claude-opus-4-6-20251022', provider: 'anthropic' },
  { id: 'sonnet4', name: 'Claude Sonnet 4', modelId: 'claude-sonnet-4-20250514', provider: 'anthropic' },
  { id: 'kimi', name: 'Kimi K2.5', modelId: 'kimi-k2.5:cloud', provider: 'ollama' },
];

async function queryModel(model: RequestModel, question: string): Promise<ModelResponse> {
  const startTime = Date.now();
  
  try {
    if (model.provider === 'anthropic') {
      const response = await anthropic.messages.create({
        model: model.modelId,
        max_tokens: 1000,
        temperature: 0.5,
        messages: [
          {
            role: 'user',
            content: `You are ${model.name}. Please answer this question with your unique perspective and capabilities:\n\n${question}`
          }
        ]
      });

      const timing = Date.now() - startTime;
      const content = response.content[0];
      
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      return {
        model: model.name,
        response: content.text,
        timing,
        tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      };
      
    } else if (model.provider === 'ollama') {
      const ollamaUrl = process.env.OLLAMA_BASE_URL || 'https://ollama.com/v1';
      const ollamaResponse = await fetch(`${ollamaUrl}/chat/completions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OLLAMA_API_KEY || ''}`
        },
        body: JSON.stringify({
          model: model.modelId,
          messages: [{ role: 'user', content: `You are ${model.name}. Please answer this question with your unique perspective and capabilities:\n\n${question}` }],
          stream: false
        })
      });
      
      if (!ollamaResponse.ok) {
        throw new Error(`Ollama API error: ${ollamaResponse.statusText}`);
      }
      
      const data = await ollamaResponse.json();
      const timing = Date.now() - startTime;
      
      return {
        model: model.name,
        response: data.choices?.[0]?.message?.content || '',
        timing,
        tokens: (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0),
      };
    } else {
      throw new Error(`Unsupported provider: ${model.provider}`);
    }

  } catch (error) {
    const timing = Date.now() - startTime;
    console.error(`Error querying ${model.name}:`, error);
    
    return {
      model: model.name,
      response: '',
      timing,
      tokens: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function synthesizeResponses(question: string, responses: ModelResponse[]): Promise<string> {
  const validResponses = responses.filter(r => !r.error && r.response.trim());
  
  if (validResponses.length === 0) {
    return "Unable to get valid responses from any models to synthesize an answer.";
  }

  if (validResponses.length === 1) {
    return validResponses[0].response;
  }

  try {
    const synthesisPrompt = `I asked multiple AI models this question: "${question}"

Here are their responses:

${validResponses.map(r => `**${r.model}:**\n${r.response}\n`).join('\n')}

Synthesize these into a single best answer that:
1. Combines the strongest insights from each
2. Resolves contradictions by noting different perspectives
3. Is comprehensive yet concise
4. Notes where models agree vs disagree

Synthesis:`;

    const synthesis = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      temperature: 0.3,
      messages: [{ role: 'user', content: synthesisPrompt }]
    });

    const content = synthesis.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected synthesis response type');
    }

    return content.text;

  } catch (error) {
    console.error('Error synthesizing responses:', error);
    return `Best available answer:\n\n${validResponses[0].response}\n\n_Note: Unable to fully synthesize all responses._`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { question, models } = await req.json();

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({
        error: 'Question is required and must be a non-empty string'
      }, { status: 400 });
    }

    const trimmedQuestion = question.trim();
    
    if (trimmedQuestion.length > 2000) {
      return NextResponse.json({
        error: 'Question is too long (max 2000 characters)'
      }, { status: 400 });
    }

    // Use provided models or defaults
    const activeModels: RequestModel[] = (models && Array.isArray(models) && models.length >= 2)
      ? models
      : DEFAULT_MODELS;

    // Query all models in parallel
    const responses = await Promise.all(
      activeModels.map(model => queryModel(model, trimmedQuestion))
    );
    
    // Build response map keyed by model id
    const responseMap: Record<string, ModelResponse> = {};
    activeModels.forEach((model, i) => {
      responseMap[model.id] = responses[i];
    });

    // Synthesize the responses
    const synthesis = await synthesizeResponses(trimmedQuestion, responses);

    return NextResponse.json({
      responses: responseMap,
      synthesis,
      timestamp: new Date().toISOString(),
      question: trimmedQuestion
    });

  } catch (error) {
    console.error('Model Counsel API error:', error);
    
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
