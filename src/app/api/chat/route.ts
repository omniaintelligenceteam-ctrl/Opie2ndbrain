import { NextRequest } from 'next/server';
import { PersonalityParameters, parametersToApiConfig } from '@/lib/personalityTypes';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Force Node.js runtime for full env var access
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Provider Configuration
type Provider = 'openclaw' | 'ollama' | 'anthropic';

const OPENCLAW_GATEWAY_URL = 'http://143.198.128.209:3457';
const OPENCLAW_GATEWAY_TOKEN = 'opie-token-123';
const OPENCLAW_AVAILABLE = true; // Bridge is always available

const REQUEST_TIMEOUT_MS = 120_000;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODELS = {
  kimi: { provider: 'ollama' as const, model: 'kimi-k2.5:cloud' },
  opus: { provider: 'anthropic' as const, model: 'claude-opus-4-5-20250514' },
  sonnet: { provider: 'anthropic' as const, model: 'claude-sonnet-4-20250514' },
  haiku: { provider: 'anthropic' as const, model: 'claude-3-5-haiku-20241022' },
};

type ModelAlias = keyof typeof MODELS;

let currentModel: ModelAlias = 'sonnet';
let currentProvider: Provider = OPENCLAW_AVAILABLE ? 'openclaw' : 'ollama';

const VOICE_INSTRUCTIONS = `[VOICE MODE] This is a voice conversation. Rules:
- 2-3 sentences MAX. Be concise.
- NO formatting: no tables, no bullets, no markdown, no lists.
- Speak naturally like you're talking, not reading.
- Don't dump information. Answer directly.

User said: `;

const SYSTEM_PROMPT = `You are Opie, a helpful AI assistant. You're friendly, concise, and practical.`;

// Helper to create SSE stream
function createStreamResponse(generator: AsyncGenerator<string>) {
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of generator) {
        controller.enqueue(new TextEncoder().encode(chunk));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}

// Call OpenClaw (non-streaming, converted to SSE)
async function* streamOpenClaw(messages: Array<{role: string, content: string}>, sessionId: string) {
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  if (!lastUserMessage) {
    yield `data: ${JSON.stringify({ error: 'No user message' })}\n\n`;
    return;
  }

  try {
    const response = await fetch(`${OPENCLAW_GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        tool: 'sessions_spawn',
        args: {
          task: lastUserMessage.content,
          label: `opie:chat:${sessionId}`,
          timeoutSeconds: 115,
          cleanup: 'keep',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      yield `data: ${JSON.stringify({ error: `OpenClaw: ${error.slice(0, 200)}` })}\n\n`;
      return;
    }

    const data = await response.json();
    let reply = '';

    if (data.ok && data.result) {
      const result = data.result;
      // Check for error response
      if (result.details?.status === 'error' || result.status === 'error') {
        const errorMsg = result.details?.error || result.error || 'Unknown error';
        reply = `Error: ${errorMsg}`;
      }
      else if (result.details?.reply) reply = result.details.reply;
      else if (result.reply) reply = result.reply;
      else if (result.text) reply = result.text;
      else if (typeof result === 'string') reply = result;
    }

    // Stream the complete reply as one chunk
    yield `data: ${JSON.stringify({ choices: [{ delta: { content: reply } }] })}\n\n`;
    yield `data: [DONE]\n\n`;

  } catch (error) {
    console.error("[Ollama] Error:", error);
    yield `data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'OpenClaw failed' })}\n\n`;
  }
}

// Call Ollama with streaming
async function* streamOllama(messages: Array<{role: string, content: string}>, model: string) {
  const ollamaKey = process.env.OLLAMA_API_KEY;
  if (!ollamaKey) {
    yield `data: ${JSON.stringify({ error: 'OLLAMA_API_KEY not configured' })}\n\n`;
    return;
  }

  try {
    const response = await fetch('https://ollama.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ollamaKey}`,
      },
      body: JSON.stringify({
        model: model,
        stream: true,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      yield `data: ${JSON.stringify({ error: `Ollama: ${error.slice(0, 200)}` })}\n\n`;
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield `data: ${JSON.stringify({ error: 'No response body' })}\n\n`;
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            yield `data: [DONE]\n\n`;
            return;
          }
          yield `${line}\n\n`;
        }
      }
    }

  } catch (error) {
    console.error("[Ollama] Error:", error);
    yield `data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Ollama failed' })}\n\n`;
  }
}

// Call Anthropic with streaming
async function* streamAnthropic(messages: Array<{role: string, content: string}>, model: string, imageDataUrl?: string) {
  if (!process.env.ANTHROPIC_API_KEY) {
    yield `data: ${JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' })}\n\n`;
    return;
  }

  try {
    const apiMessages = messages.slice(1).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const stream = await anthropic.messages.create({
      model: model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: apiMessages,
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield `data: ${JSON.stringify({ choices: [{ delta: { content: event.delta.text } }] })}\n\n`;
      }
    }

    yield `data: [DONE]\n\n`;

  } catch (error) {
    console.error("[Ollama] Error:", error);
    yield `data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Anthropic failed' })}\n\n`;
  }
}

// Main handler
export async function POST(req: NextRequest) {
  const {
    message,
    sessionId = 'default',
    isVoice = true,
    personality,
    interactionMode = 'plan',
    model,
    provider,
    memoryContext,
    image,
  } = await req.json();

  if (provider && ['openclaw', 'ollama', 'anthropic'].includes(provider)) {
    currentProvider = provider as Provider;
  }
  if (model && model in MODELS) {
    currentModel = model as ModelAlias;
  }

  if (!message) {
    return Response.json({ error: 'No message provided' }, { status: 400 });
  }

  // Build user message with context
  let userMessage = message;
  if (isVoice) userMessage = VOICE_INSTRUCTIONS + userMessage;

  const modeContext = interactionMode === 'plan'
    ? '\n[MODE: Plan] Discuss ideas but do NOT execute actions.'
    : '\n[MODE: DO IT] Execute actions decisively.';

  userMessage += modeContext;

  if (interactionMode === 'execute' && memoryContext) {
    userMessage += `\n\n[MEMORY]\n${memoryContext}`;
  }

  const messages = [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userMessage }];

  // DO IT mode: Use OpenClaw spawn + Supabase for async with full tool access
  if (interactionMode === 'execute') {
    try {
      const requestId = uuidv4();
      
      // Insert pending row
      const { error: insertError } = await supabaseAdmin
        .from('opie_responses')
        .insert({
          request_id: requestId,
          user_message: message,
          status: 'pending',
        });
      
      if (insertError) {
        console.error('[Chat] Supabase insert error:', insertError);
        return Response.json({ 
          error: 'Database error', 
          details: insertError.message || insertError.code || 'Unknown' 
        }, { status: 500 });
      }
      
      // Spawn OpenClaw session
      const spawnRes = await fetch(`${OPENCLAW_GATEWAY_URL}/tools/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENCLAW_GATEWAY_TOKEN}`,
        },
        body: JSON.stringify({
          tool: 'sessions_spawn',
          args: {
            task: userMessage,
            label: `opie:execute:${requestId}`,
            timeoutSeconds: 115,
            cleanup: 'keep',
          },
        }),
        signal: AbortSignal.timeout(10000),
      });
      
      const spawnData = await spawnRes.json();
      
      if (spawnData.ok && spawnData.result?.sessionKey) {
        // Update with session_id
        await supabaseAdmin
          .from('opie_responses')
          .update({ session_id: spawnData.result.sessionKey })
          .eq('request_id', requestId);
      }
      
      // Return request_id for polling
      return Response.json({
        mode: 'async',
        request_id: requestId,
        poll_url: `/api/chat/poll?request_id=${requestId}`,
      });
      
    } catch (error) {
      console.error('[Chat] Execute mode error:', error);
      return Response.json({ error: 'Failed to start execution' }, { status: 500 });
    }
  }

  // Plan mode: Use streaming for quick responses
  let generator: AsyncGenerator<string>;
  
  // Route kimi to Ollama, anthropic to Claude, default to Ollama
  if (currentModel === 'kimi') {
    generator = streamOllama(messages, MODELS.kimi.model);
  } else if (currentProvider === 'anthropic' || ['opus', 'sonnet', 'haiku'].includes(currentModel)) {
    generator = streamAnthropic(messages, MODELS[currentModel].model, image);
  } else {
    generator = streamOllama(messages, MODELS.kimi.model);
  }

  return createStreamResponse(generator);
}