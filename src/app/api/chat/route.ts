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
  const { message, sessionId, isVoice = true, personality } = await req.json();

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
    // Build input with personality modifiers if provided
    let input = isVoice ? VOICE_INSTRUCTIONS + message : message;
    if (personalityConfig?.systemModifiers) {
      input = `[Style: ${personalityConfig.systemModifiers}]\n\n${input}`;
    }

    const res = await fetch(`${GATEWAY_URL}/v1/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'x-moltbot-agent-id': 'main',
        'x-moltbot-session-key': 'agent:main:main',  // Use main session for full context
        // Pass personality parameters as headers for gateway support
        ...(personalityConfig && {
          'x-moltbot-temperature': String(personalityConfig.temperature),
          'x-moltbot-max-tokens': String(personalityConfig.maxTokens),
        }),
      },
      body: JSON.stringify({
        model: 'moltbot:main',
        input,
        stream: false,
        // Include personality in body for gateways that support it
        ...(personalityConfig && {
          temperature: personalityConfig.temperature,
          max_tokens: personalityConfig.maxTokens,
        }),
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Gateway error:', res.status, errorText);
      return NextResponse.json({ 
        reply: 'Sorry, hit an error. Try again?',
        error: true
      });
    }

    const data = await res.json();
    
    // Handle different response formats
    let reply = 'No response';
    
    if (data.output) {
      const assistantMessage = data.output
        .find((item: { type?: string; role?: string }) => item.type === 'message' && item.role === 'assistant');
      if (assistantMessage?.content?.[0]?.text) {
        reply = assistantMessage.content[0].text;
      }
    } else if (data.text) {
      reply = data.text;
    } else if (data.reply) {
      reply = data.reply;
    } else if (data.message) {
      reply = data.message;
    }
    
    return NextResponse.json({ reply });

  } catch (error) {
    console.error('Fetch error:', error);
    // Return a friendly response instead of 500 error
    return NextResponse.json({ 
      reply: 'Connection hiccup. The gateway might be restarting - try again in a moment!',
      error: true
    });
  }
}
