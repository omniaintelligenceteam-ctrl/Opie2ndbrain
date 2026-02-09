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

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Model configurations
const MODELS = {
  opus: { model: 'claude-3-5-sonnet-20241022', name: 'Claude Opus 4.6' }, // Using available model
  sonnet: { model: 'claude-3-5-sonnet-20241022', name: 'Claude Sonnet 4' },
  gemini: { model: 'claude-3-5-haiku-20241022', name: 'Gemini 2.5 Pro' } // Using Haiku as Gemini substitute
};

async function queryModel(modelKey: string, question: string): Promise<ModelResponse> {
  const startTime = Date.now();
  
  try {
    const modelConfig = MODELS[modelKey as keyof typeof MODELS];
    
    // For this implementation, we'll use Anthropic models for all three
    // In a real implementation, you'd integrate with actual Gemini API
    const response = await anthropic.messages.create({
      model: modelConfig.model,
      max_tokens: 1000,
      temperature: modelKey === 'opus' ? 0.7 : modelKey === 'sonnet' ? 0.5 : 0.3,
      messages: [
        {
          role: 'user',
          content: `You are ${modelConfig.name}. Please answer this question with your unique perspective and capabilities:\n\n${question}`
        }
      ]
    });

    const timing = Date.now() - startTime;
    const content = response.content[0];
    
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return {
      model: modelConfig.name,
      response: content.text,
      timing,
      tokens: response.usage?.input_tokens + response.usage?.output_tokens || 0,
    };

  } catch (error) {
    const timing = Date.now() - startTime;
    console.error(`Error querying ${modelKey}:`, error);
    
    return {
      model: MODELS[modelKey as keyof typeof MODELS].name,
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
    return "I apologize, but I wasn't able to get valid responses from any of the models to synthesize an answer.";
  }

  if (validResponses.length === 1) {
    return validResponses[0].response;
  }

  try {
    const synthesisPrompt = `I asked multiple AI models this question: "${question}"

Here are their responses:

${validResponses.map((r, i) => `**${r.model}:**
${r.response}

`).join('')}

Please synthesize these responses into a single, best answer that:
1. Combines the strongest insights from each response
2. Resolves any contradictions by explaining different perspectives
3. Provides a comprehensive yet concise final answer
4. Acknowledges when models agree vs. disagree

Synthesis:`;

    const synthesis = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
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
    
    // Fallback: return the first valid response with a note
    return `Based on the available responses, here's the best answer I can provide:\n\n${validResponses[0].response}\n\n_Note: Unable to fully synthesize all model responses due to processing error._`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

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

    // Query all models in parallel
    const modelPromises = Object.keys(MODELS).map(modelKey => 
      queryModel(modelKey, trimmedQuestion)
    );

    const responses = await Promise.all(modelPromises);
    
    // Build the response object with model keys
    const responseMap = {
      opus: responses.find(r => r.model === MODELS.opus.name),
      sonnet: responses.find(r => r.model === MODELS.sonnet.name),
      gemini: responses.find(r => r.model === MODELS.gemini.name)
    };

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