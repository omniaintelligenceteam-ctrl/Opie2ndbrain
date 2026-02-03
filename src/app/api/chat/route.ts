import { NextRequest, NextResponse } from 'next/server';
import { PersonalityParameters, parametersToApiConfig } from '@/lib/personalityTypes';
import Anthropic from '@anthropic-ai/sdk';

// Force Node.js runtime for full env var access
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Initialize Anthropic client (for when using Claude models)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Model configurations
const MODELS = {
  kimi: {
    provider: 'ollama',
    model: 'kimi-k2.5',
    baseUrl: 'https://ollama.com/v1',
  },
  opus: {
    provider: 'anthropic',
    model: 'claude-opus-4-5-20250514',
  },
  sonnet: {
    provider: 'anthropic', 
    model: 'claude-sonnet-4-20250514',
  },
  haiku: {
    provider: 'anthropic',
    model: 'claude-3-5-haiku-20241022',
  },
} as const;

type ModelAlias = keyof typeof MODELS;

// Default to Kimi
let currentModel: ModelAlias = 'kimi';

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

// Simple in-memory conversation history (per session)
const conversationHistory: Map<string, Array<{role: 'user' | 'assistant', content: string}>> = new Map();
const MAX_HISTORY = 20;

async function callOllama(messages: Array<{role: string, content: string}>, model: string): Promise<string> {
  const ollamaKey = process.env.OLLAMA_API_KEY;
  if (!ollamaKey) {
    throw new Error('OLLAMA_API_KEY not configured');
  }

  const response = await fetch('https://ollama.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ollamaKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Ollama error:', response.status, error);
    throw new Error(`Ollama API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No response';
}

async function callAnthropic(messages: Array<{role: 'user' | 'assistant', content: string}>, model: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const response = await anthropic.messages.create({
    model: model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: messages,
  });

  let reply = '';
  for (const block of response.content) {
    if (block.type === 'text') {
      reply += block.text;
    }
  }
  return reply;
}

export async function POST(req: NextRequest) {
  const { message, sessionId = 'default', isVoice = true, personality, interactionMode = 'plan', model } = await req.json();

  // Update model if specified
  if (model && model in MODELS) {
    currentModel = model as ModelAlias;
    console.log('[Chat API] Model set to:', model);
  }

  const personalityConfig = personality
    ? parametersToApiConfig(personality as PersonalityParameters)
    : null;
  
  if (!message) {
    return NextResponse.json({ reply: 'No message provided' }, { status: 400 });
  }

  try {
    // Build input with voice instructions if needed
    let userMessage = isVoice ? VOICE_INSTRUCTIONS + message : message;
    
    // Add personality modifiers
    if (personalityConfig?.systemModifiers) {
      userMessage = `[Style: ${personalityConfig.systemModifiers}]\n\n${userMessage}`;
    }
    
    // Add interaction mode context
    const modeContext = interactionMode === 'plan' 
      ? '\n\n[INTERACTION MODE: Plan] You are in planning/brainstorming mode. Discuss ideas but do NOT execute actions.'
      : '\n\n[INTERACTION MODE: Execute] You are in execute mode. You may take actions.';
    userMessage = userMessage + modeContext;

    // Get or create conversation history
    if (!conversationHistory.has(sessionId)) {
      conversationHistory.set(sessionId, []);
    }
    const history = conversationHistory.get(sessionId)!;
    
    // Add user message to history
    history.push({ role: 'user', content: userMessage });
    
    // Trim history if too long
    while (history.length > MAX_HISTORY) {
      history.shift();
    }

    // Get model config
    const modelConfig = MODELS[currentModel];
    console.log('[Chat API] Using model:', currentModel, modelConfig);

    // Call the appropriate API
    let reply: string;
    if (modelConfig.provider === 'ollama') {
      reply = await callOllama(history, modelConfig.model);
    } else {
      reply = await callAnthropic(history, modelConfig.model);
    }

    // Add assistant response to history
    history.push({ role: 'assistant', content: reply });

    console.log('[Chat API] Reply:', reply.slice(0, 200));

    // Parse mode indicators from response
    let newMode: 'plan' | 'execute' | null = null;
    if (reply.includes('[MODE:execute]')) {
      newMode = 'execute';
      reply = reply.replace(/\[MODE:execute\]/g, '').trim();
    } else if (reply.includes('[MODE:plan]')) {
      newMode = 'plan';
      reply = reply.replace(/\[MODE:plan\]/g, '').trim();
    }

    return NextResponse.json({ reply, mode: newMode, model: currentModel });

  } catch (error: unknown) {
    console.error('API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      reply: `Error: ${errorMessage}`,
      error: true 
    });
  }
}
