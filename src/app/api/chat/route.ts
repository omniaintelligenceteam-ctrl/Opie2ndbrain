import { NextRequest, NextResponse } from 'next/server';
import { PersonalityParameters, parametersToApiConfig } from '@/lib/personalityTypes';
import Anthropic from '@anthropic-ai/sdk';

// Force Node.js runtime for full env var access (Edge has 5KB limit issues)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for AI response (Pro plan: 300)

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Model mapping from aliases to Anthropic model names
const MODEL_MAP: Record<string, string> = {
  'opus': 'claude-opus-4-5-20250514',
  'sonnet': 'claude-sonnet-4-20250514', 
  'haiku': 'claude-3-5-haiku-20241022',
};

// In-memory model preference (resets on cold start, but that's fine for now)
let currentModel = 'sonnet';

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
const MAX_HISTORY = 20; // Keep last 20 messages per session

export async function POST(req: NextRequest) {
  const { message, sessionId = 'default', isVoice = true, personality, interactionMode = 'plan', model } = await req.json();

  // Update model if specified
  if (model && MODEL_MAP[model]) {
    currentModel = model;
    console.log('[Chat API] Model set to:', model);
  }

  // Convert personality parameters to API config if provided
  const personalityConfig = personality
    ? parametersToApiConfig(personality as PersonalityParameters)
    : null;
  
  if (!message) {
    return NextResponse.json({ reply: 'No message provided' }, { status: 400 });
  }

  // Check for Anthropic API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ 
      reply: 'Anthropic API key not configured. Please add ANTHROPIC_API_KEY to your environment variables.',
      error: true 
    });
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
      ? '\n\n[INTERACTION MODE: Plan] You are in planning/brainstorming mode. Discuss ideas but do NOT execute actions. Before taking any action, ask for confirmation and include [MODE:execute] in your response when switching to execute mode.'
      : '\n\n[INTERACTION MODE: Execute] You are in execute mode. You may take actions. When done or switching back to planning, include [MODE:plan] in your response.';
    userMessage = userMessage + modeContext;

    // Get or create conversation history for this session
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

    // Get the Anthropic model name
    const modelName = MODEL_MAP[currentModel] || MODEL_MAP['sonnet'];
    console.log('[Chat API] Using model:', modelName);

    // Call Anthropic API directly
    const response = await anthropic.messages.create({
      model: modelName,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: history,
    });

    // Extract reply text
    let reply = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        reply += block.text;
      }
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
    console.error('Anthropic API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      reply: `Error: ${errorMessage}`,
      error: true 
    });
  }
}
