import { NextRequest, NextResponse } from 'next/server';
import { PersonalityParameters, parametersToApiConfig } from '@/lib/personalityTypes';

// Force Node.js runtime for full env var access
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 120 seconds for OpenClaw

// OpenClaw Gateway configuration (from env - never log these)
const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL;
const OPENCLAW_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;

// Timeout for gateway requests (120 seconds)
const GATEWAY_TIMEOUT_MS = 120_000;

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

/**
 * Call OpenClaw Gateway using tools/invoke with sessions_send
 *
 * REQUEST FORMAT TO OPENCLAW:
 * ---------------------------
 * POST /tools/invoke
 * Headers:
 *   Authorization: Bearer <OPENCLAW_GATEWAY_TOKEN>
 *   Content-Type: application/json
 *
 * Body:
 * {
 *   "tool": "sessions_send",
 *   "args": {
 *     "sessionKey": "agent:main:main",
 *     "message": "<full user message with system context>",
 *     "timeoutSeconds": 115
 *   }
 * }
 *
 * EXPECTED RESPONSE:
 * ------------------
 * {
 *   "ok": true,
 *   "result": {
 *     "details": {
 *       "runId": "...",
 *       "status": "ok",
 *       "reply": "The actual AI response text",
 *       "sessionKey": "agent:main:main"
 *     },
 *     "content": [
 *       { "type": "text", "text": "{...json with reply...}" }
 *     ]
 *   }
 * }
 *
 * OPENCLAW CONFIG REQUIRED:
 * -------------------------
 * 1. Gateway must be running with auth enabled:
 *    clawdbot gateway --bind lan --port 18789
 *
 * 2. clawdbot.json should have:
 *    {
 *      "gateway": {
 *        "bind": "lan",
 *        "auth": { "mode": "password", "token": "<your-token>" }
 *      }
 *    }
 *
 * 3. Ensure firewall allows port 18789 (or your configured port)
 */
async function callOpenClawGateway(message: string): Promise<string> {
  if (!OPENCLAW_GATEWAY_URL || !OPENCLAW_GATEWAY_TOKEN) {
    throw new Error('OpenClaw Gateway not configured. Set OPENCLAW_GATEWAY_URL and OPENCLAW_GATEWAY_TOKEN.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS);

  try {
    console.log('[Chat API] Calling OpenClaw Gateway (non-streaming, 120s timeout)');

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
          sessionKey: 'agent:main:main',
          message: message,
          timeoutSeconds: 115, // Slightly under our 120s timeout
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Chat API] Gateway HTTP error:', response.status);
      throw new Error(`Gateway error ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const data = await response.json();

    // Log response structure (without sensitive data)
    console.log('[Chat API] Gateway response ok:', data.ok, 'hasResult:', !!data.result);

    // Extract reply from response
    if (data.ok && data.result) {
      const result = data.result;

      // Prefer result.details.reply - it's the parsed reply text
      if (result.details?.reply) {
        return result.details.reply;
      }

      // Fallback: extract from content array
      if (result.content && Array.isArray(result.content)) {
        const textParts = result.content
          .filter((c: { type?: string }) => c.type === 'text')
          .map((c: { text?: string }) => c.text)
          .filter(Boolean);

        if (textParts.length > 0) {
          const text = textParts.join('\n');
          // Content might be JSON - try to parse and extract reply
          try {
            const parsed = JSON.parse(text);
            return parsed.reply || text;
          } catch {
            return text;
          }
        }
      }

      // Other fallbacks
      if (result.reply) return result.reply;
      if (result.text) return result.text;
      if (typeof result === 'string') return result;
    }

    if (data.error) {
      console.error('[Chat API] Gateway error:', data.error.message || data.error);
      throw new Error(data.error.message || 'Gateway returned an error');
    }

    throw new Error('Gateway returned empty response');

  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Gateway request timed out after 120 seconds');
    }
    throw error;
  }
}

export async function POST(req: NextRequest) {
  const {
    message,
    sessionId = 'default',
    isVoice = true,
    personality,
    interactionMode = 'plan',
  } = await req.json();

  const personalityConfig = personality
    ? parametersToApiConfig(personality as PersonalityParameters)
    : null;

  if (!message) {
    return NextResponse.json({ reply: 'No message provided' }, { status: 400 });
  }

  // Check gateway configuration (don't log the actual values)
  if (!OPENCLAW_GATEWAY_URL || !OPENCLAW_GATEWAY_TOKEN) {
    console.error('[Chat API] Missing OPENCLAW_GATEWAY_URL or OPENCLAW_GATEWAY_TOKEN');
    return NextResponse.json({
      reply: 'OpenClaw Gateway not configured. Please set OPENCLAW_GATEWAY_URL and OPENCLAW_GATEWAY_TOKEN environment variables.',
      error: true,
      model: 'openclaw'
    });
  }

  try {
    // Build the full message with context
    let userMessage = message;

    // Add voice instructions if voice mode
    if (isVoice) {
      userMessage = VOICE_INSTRUCTIONS + userMessage;
    }

    // Add personality modifiers
    if (personalityConfig?.systemModifiers) {
      userMessage = `[Style: ${personalityConfig.systemModifiers}]\n\n${userMessage}`;
    }

    // Add interaction mode context
    const modeContext = interactionMode === 'plan'
      ? '\n\n[INTERACTION MODE: Plan] You are in planning/brainstorming mode. Discuss ideas but do NOT execute actions.'
      : '\n\n[INTERACTION MODE: Execute] You are in execute mode. You may take actions.';
    userMessage = userMessage + modeContext;

    // Add system prompt context
    userMessage = `[System: ${SYSTEM_PROMPT}]\n\n${userMessage}`;

    console.log('[Chat API] Sending to OpenClaw, session:', sessionId, 'mode:', interactionMode);

    // Call OpenClaw Gateway
    let reply = await callOpenClawGateway(userMessage);

    // Parse mode indicators from response
    let newMode: 'plan' | 'execute' | null = null;
    if (reply.includes('[MODE:execute]')) {
      newMode = 'execute';
      reply = reply.replace(/\[MODE:execute\]/g, '').trim();
    } else if (reply.includes('[MODE:plan]')) {
      newMode = 'plan';
      reply = reply.replace(/\[MODE:plan\]/g, '').trim();
    }

    console.log('[Chat API] Reply received, length:', reply.length);

    // Response shape: { reply, mode, model }
    return NextResponse.json({ reply, mode: newMode, model: 'openclaw' });

  } catch (error: unknown) {
    console.error('[Chat API] Error:', error instanceof Error ? error.message : 'Unknown error');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      reply: `Sorry, I couldn't process that: ${errorMessage}`,
      error: true,
      model: 'openclaw'
    });
  }
}
