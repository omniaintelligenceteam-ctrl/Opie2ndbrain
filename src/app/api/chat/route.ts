import { NextRequest, NextResponse } from 'next/server';
import { PersonalityParameters, parametersToApiConfig } from '@/lib/personalityTypes';
import Anthropic from '@anthropic-ai/sdk';

// Force Node.js runtime for full env var access
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 120 seconds max

// ============================================================================
// Provider Configuration
// ============================================================================

type Provider = 'openclaw' | 'ollama' | 'anthropic';

// OpenClaw Gateway configuration
const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL;
const OPENCLAW_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;
const OPENCLAW_AVAILABLE = !!(OPENCLAW_GATEWAY_URL && OPENCLAW_GATEWAY_TOKEN);

// Timeout for requests (120 seconds)
const REQUEST_TIMEOUT_MS = 120_000;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================================
// Model Configurations
// ============================================================================

const MODELS = {
  kimi: {
    provider: 'ollama' as const,
    model: 'kimi-k2.5:cloud',  // Updated: use cloud variant
  },
  opus: {
    provider: 'anthropic' as const,
    model: 'claude-opus-4-5-20250514',
  },
  sonnet: {
    provider: 'anthropic' as const,
    model: 'claude-sonnet-4-20250514',
  },
  haiku: {
    provider: 'anthropic' as const,
    model: 'claude-3-5-haiku-20241022',
  },
};

type ModelAlias = keyof typeof MODELS;

// Default settings
let currentModel: ModelAlias = 'sonnet';
let currentProvider: Provider = OPENCLAW_AVAILABLE ? 'openclaw' : 'anthropic';

// ============================================================================
// Prompts
// ============================================================================

const VOICE_INSTRUCTIONS = `[VOICE MODE] This is a voice conversation. Rules:
- 2-3 sentences MAX. Be concise.
- NO formatting: no tables, no bullets, no markdown, no lists.
- Speak naturally like you're talking, not reading.
- Don't dump information. Answer directly.
- If asked something complex, give the short answer first, then offer to elaborate.

User said: `;

const SYSTEM_PROMPT = `You are Opie, a helpful AI assistant. You're friendly, concise, and practical.
You help with tasks, answer questions, and have natural conversations.
Keep responses focused and helpful.`;

// Conversation history for direct API calls
const conversationHistory: Map<string, Array<{role: 'user' | 'assistant', content: string}>> = new Map();
const MAX_HISTORY = 20;

// ============================================================================
// OpenClaw Gateway
// ============================================================================

async function callOpenClaw(
  messages: Array<{role: 'user' | 'assistant', content: string}>,
  sessionId: string
): Promise<string> {
  if (!OPENCLAW_GATEWAY_URL || !OPENCLAW_GATEWAY_TOKEN) {
    throw new Error('OpenClaw not configured. Set OPENCLAW_GATEWAY_URL and OPENCLAW_GATEWAY_TOKEN.');
  }

  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  if (!lastUserMessage) {
    throw new Error('No user message found');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    console.log('[Chat API] OpenClaw: calling /tools/invoke (sessions_send)');

    const response = await fetch(`${OPENCLAW_GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        tool: 'sessions_send',
        args: {
          sessionKey: `opie:chat:${sessionId}`,
          message: lastUserMessage.content,
          timeoutSeconds: 115,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Chat API] OpenClaw HTTP error:', response.status, errorBody.slice(0, 300));
      throw new Error(`OpenClaw error ${response.status}: ${errorBody.slice(0, 300)}`);
    }

    const data = await response.json();
    console.log('[Chat API] OpenClaw response ok:', data.ok, 'hasResult:', !!data.result);

    if (data.ok && data.result) {
      const result = data.result;

      if (result.details?.reply) {
        return result.details.reply;
      }

      if (result.content && Array.isArray(result.content)) {
        const textParts = result.content
          .filter((c: { type?: string }) => c.type === 'text')
          .map((c: { text?: string }) => c.text)
          .filter(Boolean);

        if (textParts.length > 0) {
          const text = textParts.join('\n');
          try {
            const parsed = JSON.parse(text);
            return parsed.reply || text;
          } catch {
            return text;
          }
        }
      }

      if (result.reply) return result.reply;
      if (result.text) return result.text;
      if (typeof result === 'string') return result;
    }

    if (data.error) {
      throw new Error(`OpenClaw error: ${data.error.message || JSON.stringify(data.error).slice(0, 300)}`);
    }

    throw new Error('OpenClaw returned empty response - check gateway logs');

  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('OpenClaw request timed out after 120 seconds');
    }
    throw error;
  }
}

// ============================================================================
// Ollama (Kimi)
// ============================================================================

async function callOllama(
  messages: Array<{role: string, content: string}>,
  model: string
): Promise<string> {
  const ollamaKey = process.env.OLLAMA_API_KEY;
  if (!ollamaKey) {
    throw new Error('OLLAMA_API_KEY not configured');
  }

  console.log('[Chat API] Ollama: calling with model:', model);

  const response = await fetch('https://ollama.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ollamaKey}`,
    },
    body: JSON.stringify({
      model: model,
      stream: false,  // Explicitly disable streaming
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[Chat API] Ollama HTTP error:', response.status, errorBody.slice(0, 300));
    throw new Error(`Ollama error ${response.status}: ${errorBody.slice(0, 300)}`);
  }

  const data = await response.json();
  console.log('[Chat API] Ollama response structure:', Object.keys(data));

  const content = data.choices?.[0]?.message?.content;
  if (!content || content.trim() === '') {
    console.error('[Chat API] Ollama returned empty content. Full response:', JSON.stringify(data).slice(0, 500));
    throw new Error('Ollama returned empty response - model may be unavailable');
  }

  return content.trim();
}

// ============================================================================
// Anthropic
// ============================================================================

// Parse base64 data URL (e.g., "data:image/png;base64,ABC123...")
function parseDataUrl(dataUrl: string): { base64: string; mediaType: string } | null {
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!match) {
    console.error('[Chat API] Invalid data URL format');
    return null;
  }
  return {
    mediaType: match[1],
    base64: match[2],
  };
}

async function callAnthropic(
  messages: Array<{role: 'user' | 'assistant', content: string}>,
  model: string,
  imageDataUrl?: string
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  console.log('[Chat API] Anthropic: calling with model:', model, imageDataUrl ? '(with image)' : '');

  // Build messages array, potentially with image content
  const apiMessages: Anthropic.MessageParam[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const isLastUserMessage = msg.role === 'user' && i === messages.length - 1;

    if (isLastUserMessage && imageDataUrl) {
      // Include image in the last user message
      const imageData = parseDataUrl(imageDataUrl);
      if (imageData) {
        apiMessages.push({
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageData.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: imageData.base64,
              },
            },
            {
              type: 'text',
              text: msg.content || 'What do you see in this image?',
            },
          ],
        });
      } else {
        // Fallback to text-only if parsing fails
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    } else {
      apiMessages.push({ role: msg.role, content: msg.content });
    }
  }

  const response = await anthropic.messages.create({
    model: model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: apiMessages,
  });

  let reply = '';
  for (const block of response.content) {
    if (block.type === 'text') {
      reply += block.text;
    }
  }

  if (!reply || reply.trim() === '') {
    throw new Error('Anthropic returned empty response');
  }

  return reply;
}

// ============================================================================
// Main API Handler
// ============================================================================

export async function POST(req: NextRequest) {
  const {
    message,
    sessionId = 'default',
    isVoice = true,
    personality,
    interactionMode = 'plan',
    model,
    provider,  // NEW: explicit provider selection
    memoryContext,  // Memory context for DO IT mode
    image,  // Image file path for vision
  } = await req.json();

  // Update provider if explicitly specified
  if (provider && ['openclaw', 'ollama', 'anthropic'].includes(provider)) {
    currentProvider = provider as Provider;
    console.log('[Chat API] Provider set to:', currentProvider);
  }

  // Update model if specified
  if (model && model in MODELS) {
    currentModel = model as ModelAlias;
    console.log('[Chat API] Model set to:', currentModel);
  }

  const personalityConfig = personality
    ? parametersToApiConfig(personality as PersonalityParameters)
    : null;

  if (!message) {
    return NextResponse.json({ reply: 'No message provided', error: true }, { status: 400 });
  }

  try {
    // Build the full message with context
    let userMessage = message;

    if (isVoice) {
      userMessage = VOICE_INSTRUCTIONS + userMessage;
    }

    if (personalityConfig?.systemModifiers) {
      userMessage = `[Style: ${personalityConfig.systemModifiers}]\n\n${userMessage}`;
    }

    let modeContext = interactionMode === 'plan'
      ? '\n\n[INTERACTION MODE: Plan] You are in planning/brainstorming mode. Discuss ideas but do NOT execute actions.'
      : '\n\n[INTERACTION MODE: DO IT] You are in DO IT mode. Execute actions decisively.';

    // Add memory context in execute/DO IT mode
    if (interactionMode === 'execute' && memoryContext) {
      modeContext += `\n\n[MEMORY CONTEXT]\n${memoryContext}`;
    }

    userMessage = userMessage + modeContext;

    let reply: string;
    let usedProvider: Provider;
    let usedModel: string;

    // === Route to selected provider ===
    if (currentProvider === 'openclaw' && OPENCLAW_AVAILABLE) {
      console.log('[Chat API] Using OpenClaw Gateway');
      const fullMessage = `[System: ${SYSTEM_PROMPT}]\n\n${userMessage}`;
      reply = await callOpenClaw([{ role: 'user', content: fullMessage }], sessionId);
      usedProvider = 'openclaw';
      usedModel = 'gateway-agent'; // OpenClaw uses its own agent/model

    } else if (currentProvider === 'ollama') {
      console.log('[Chat API] Using Ollama directly');
      const modelConfig = MODELS.kimi;

      if (!conversationHistory.has(sessionId)) {
        conversationHistory.set(sessionId, []);
      }
      const history = conversationHistory.get(sessionId)!;
      history.push({ role: 'user', content: userMessage });
      while (history.length > MAX_HISTORY) history.shift();

      reply = await callOllama(history, modelConfig.model);
      history.push({ role: 'assistant', content: reply });
      usedProvider = 'ollama';
      usedModel = modelConfig.model;

    } else {
      // Default: Anthropic
      const modelConfig = MODELS[currentModel];

      if (modelConfig.provider !== 'anthropic') {
        currentModel = 'sonnet';
      }

      console.log('[Chat API] Using Anthropic directly, model:', MODELS[currentModel].model);

      if (!conversationHistory.has(sessionId)) {
        conversationHistory.set(sessionId, []);
      }
      const history = conversationHistory.get(sessionId)!;
      history.push({ role: 'user', content: userMessage });
      while (history.length > MAX_HISTORY) history.shift();

      reply = await callAnthropic(history, MODELS[currentModel].model, image);
      history.push({ role: 'assistant', content: reply });
      usedProvider = 'anthropic';
      usedModel = MODELS[currentModel].model;
    }

    // Parse mode indicators from response
    let newMode: 'plan' | 'execute' | null = null;
    if (reply.includes('[MODE:execute]')) {
      newMode = 'execute';
      reply = reply.replace(/\[MODE:execute\]/g, '').trim();
    } else if (reply.includes('[MODE:plan]')) {
      newMode = 'plan';
      reply = reply.replace(/\[MODE:plan\]/g, '').trim();
    }

    console.log('[Chat API] SUCCESS | provider:', usedProvider, '| model:', usedModel, '| reply:', reply.length, 'chars');

    // Truth log: always know which path was used
    return NextResponse.json({
      reply,
      mode: newMode,
      provider: usedProvider,  // "openclaw" | "ollama" | "anthropic"
      model: usedModel,        // actual model name
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Chat API] ERROR | provider:', currentProvider, '|', errorMessage);

    return NextResponse.json({
      reply: `Sorry, I couldn't process that: ${errorMessage}`,
      error: true,
      provider: currentProvider,
      model: null,
    });
  }
}
