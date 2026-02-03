import { NextRequest, NextResponse } from 'next/server';
import { GATEWAY_URL, GATEWAY_TOKEN, IS_VERCEL } from '@/lib/gateway';
import { PersonalityParameters, parametersToApiConfig } from '@/lib/personalityTypes';

// Force Node.js runtime for full env var access (Edge has 5KB limit issues)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for AI response (Pro plan: 300)

const VOICE_INSTRUCTIONS = `[VOICE MODE] This is a voice conversation. Rules:
- 2-3 sentences MAX. Be concise.
- NO formatting: no tables, no bullets, no markdown, no lists.
- Speak naturally like you're talking, not reading.
- Don't dump information. Answer directly.
- If asked something complex, give the short answer first, then offer to elaborate.

User said: `;

// Demo responses for when gateway is unavailable
const DEMO_RESPONSES = [
  "I'm running in demo mode right now - the gateway isn't connected. Try again when you're running locally!",
  "This is a demo deployment. Connect to the local gateway to chat with me for real.",
  "Hey! The gateway's not available in this environment. The full experience needs the local Moltbot gateway running.",
];

export async function POST(req: NextRequest) {
  const { message, sessionId, isVoice = true, personality, interactionMode = 'plan' } = await req.json();

  // Convert personality parameters to API config if provided
  const personalityConfig = personality
    ? parametersToApiConfig(personality as PersonalityParameters)
    : null;
  
  if (!message) {
    return NextResponse.json({ reply: 'No message provided' }, { status: 400 });
  }

  // Check if gateway is available in this environment
  const gatewayUnavailable = IS_VERCEL && GATEWAY_URL.includes('localhost');
  
  if (gatewayUnavailable || !GATEWAY_TOKEN) {
    // Return demo response instead of error
    const demoReply = DEMO_RESPONSES[Math.floor(Math.random() * DEMO_RESPONSES.length)];
    return NextResponse.json({ 
      reply: demoReply,
      demo: true,
      reason: gatewayUnavailable ? 'gateway_unavailable' : 'no_token'
    });
  }

  try {
    // Build input with personality modifiers and interaction mode
    let input = isVoice ? VOICE_INSTRUCTIONS + message : message;
    if (personalityConfig?.systemModifiers) {
      input = `[Style: ${personalityConfig.systemModifiers}]\n\n${input}`;
    }
    
    // Add interaction mode context
    const modeContext = interactionMode === 'plan' 
      ? '\n\n[INTERACTION MODE: Plan] You are in planning/brainstorming mode. Discuss ideas but do NOT execute actions. Before taking any action, ask for confirmation and include [MODE:execute] in your response when switching to execute mode.'
      : '\n\n[INTERACTION MODE: Execute] You are in execute mode. You may take actions. When done or switching back to planning, include [MODE:plan] in your response.';
    input = input + modeContext;

    // Use tools/invoke with sessions_send - more reliable than /v1/responses
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        tool: 'sessions_send',
        args: {
          sessionKey: 'agent:main:main',
          message: input,
          timeoutSeconds: 55, // Just under Vercel's 60s limit
        },
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Gateway error:', res.status, errorText);
      return NextResponse.json({ 
        reply: `Gateway error ${res.status}: ${errorText.slice(0, 200)}`,
        error: true,
        debug: { status: res.status, text: errorText.slice(0, 500) }
      });
    }

    const data = await res.json();
    
    // Debug: log the response structure
    console.log('[Chat API] Gateway response:', JSON.stringify(data, null, 2).slice(0, 2000));
    
    // Handle sessions_send response format
    let reply = 'No response';
    
    if (data.ok && data.result) {
      // sessions_send returns result.details.reply (preferred) or result.content[].text
      const result = data.result;

      // Prefer result.details.reply - it's the parsed reply text
      if (result.details?.reply) {
        reply = result.details.reply;
      } else if (result.content && Array.isArray(result.content)) {
        const textParts = result.content
          .filter((c: { type?: string }) => c.type === 'text')
          .map((c: { text?: string }) => c.text)
          .filter(Boolean);
        if (textParts.length > 0) {
          // Content text might be JSON - try to parse and extract reply
          const text = textParts.join('\n');
          try {
            const parsed = JSON.parse(text);
            reply = parsed.reply || text;
          } catch {
            reply = text;
          }
        }
      } else if (result.reply) {
        reply = result.reply;
      } else if (result.text) {
        reply = result.text;
      } else if (typeof result === 'string') {
        reply = result;
      }
    } else if (data.error) {
      console.error('[Chat API] Gateway error:', data.error);
      reply = `Error: ${data.error.message || 'Unknown error'}`;
    }
    
    console.log('[Chat API] Final reply:', reply.slice(0, 500));
    
    // Parse mode indicators from response
    let newMode: 'plan' | 'execute' | null = null;
    if (reply.includes('[MODE:execute]')) {
      newMode = 'execute';
      reply = reply.replace(/\[MODE:execute\]/g, '').trim();
    } else if (reply.includes('[MODE:plan]')) {
      newMode = 'plan';
      reply = reply.replace(/\[MODE:plan\]/g, '').trim();
    }
    
    return NextResponse.json({ reply, mode: newMode });

  } catch (error: any) {
    console.error('Fetch error:', error);
    // Return a friendly response instead of 500 error
    return NextResponse.json({ 
      reply: `Connection error: ${error?.message || 'unknown'}`,
      error: true,
      debug: { name: error?.name, message: error?.message, cause: error?.cause }
    });
  }
}
