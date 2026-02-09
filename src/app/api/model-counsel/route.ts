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

// Model configurations - easily configurable
// TO CHANGE MODELS: Just update the model IDs below to any models you have access to
// Supported providers: 'anthropic' or 'ollama'
const MODELS = {
  opus: { 
    model: 'claude-opus-4-6-20251022', 
    name: 'Claude Opus 4.6',
    provider: 'anthropic'
  },
  sonnet: { 
    model: 'claude-sonnet-4-20250514', 
    name: 'Claude Sonnet 4',
    provider: 'anthropic'
  },
  kimi: { 
    model: 'kimi-k2.5:cloud', 
    name: 'Kimi K2.5',
    provider: 'ollama'
  }
};

async function queryModel(modelKey: string, question: string): Promise<ModelResponse> {
  const startTime = Date.now();
  
  try {
    const modelConfig = MODELS[modelKey as keyof typeof MODELS];
    
    if (modelConfig.provider === 'anthropic') {
      // Use Anthropic API
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
      
    } else if (modelConfig.provider === 'ollama') {
      // Use Ollama API (for Kimi)
      const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelConfig.model,
          prompt: `You are ${modelConfig.name}. Please answer this question with your unique perspective and capabilities:\n\n${question}`,
          stream: false
        })
      });
      
      if (!ollamaResponse.ok) {
        throw new Error(`Ollama API error: ${ollamaResponse.statusText}`);
      }
      
      const data = await ollamaResponse.json();
      const timing = Date.now() - startTime;
      
      return {
        model: modelConfig.name,
        response: data.response || '',
        timing,
        tokens: data.prompt_eval_count + data.eval_count || 0,
      };
    } else {
      throw new Error(`Unsupported provider: ${modelConfig.provider}`);
    }

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
      kimi: responses.find(r => r.model === MODELS.kimi.name)
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