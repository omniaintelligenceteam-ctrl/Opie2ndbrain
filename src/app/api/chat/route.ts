import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL = process.env.OPIE_GATEWAY_URL || 'https://ubuntu-s-1vcpu-1gb-sfo3-01.tail0fbff3.ts.net';
const GATEWAY_TOKEN = process.env.OPIE_GATEWAY_TOKEN;

// Voice session uses a dedicated session key for persistent context
// This routes to agent:main:voice which maintains voice-specific history
// while still loading all workspace context files (SOUL.md, MEMORY.md, etc.)
const VOICE_SESSION_KEY = 'agent:main:voice';

// Voice-specific instructions - added as system prompt via instructions field
const VOICE_INSTRUCTIONS = `[VOICE MODE] This is a voice conversation with Wes via the 2nd Brain app.

IMPORTANT: You have full access to Wes's context - MEMORY.md, SOUL.md, USER.md, and daily notes are all loaded. Use them!

Voice response rules:
- 2-3 sentences MAX. Be concise.
- NO formatting: no tables, no bullets, no markdown, no lists.
- Speak naturally like you're talking, not reading.
- Don't dump information. Answer directly.
- If asked something complex, give the short answer first, then offer to elaborate.
- You ARE Opie. Act like yourself.`;

export async function POST(req: NextRequest) {
  const { message, sessionId } = await req.json();
  
  if (!message) {
    return NextResponse.json({ reply: 'No message provided' }, { status: 400 });
  }

  if (!GATEWAY_TOKEN) {
    console.error('OPIE_GATEWAY_TOKEN not set');
    return NextResponse.json({ reply: 'Server configuration error' }, { status: 500 });
  }

  try {
    const res = await fetch(`${GATEWAY_URL}/v1/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'x-moltbot-agent-id': 'main',
        // Use explicit session key to maintain persistent voice session
        'x-moltbot-session-key': VOICE_SESSION_KEY
      },
      body: JSON.stringify({
        model: 'moltbot:main',
        input: message,  // Clean message - instructions go in instructions field
        instructions: VOICE_INSTRUCTIONS,  // System-level instructions
        user: sessionId || 'voice-user',  // User identifier (session key takes precedence)
        stream: false
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Gateway error:', res.status, errorText);
      return NextResponse.json({ reply: 'Sorry, hit an error. Try again?' }, { status: 500 });
    }

    const data = await res.json();
    
    const assistantMessage = data.output
      ?.find((item: any) => item.type === 'message' && item.role === 'assistant')
      ?.content?.[0]?.text;
    
    const reply = assistantMessage || data.text || data.reply || 'No response';
    
    return NextResponse.json({ reply });

  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({ reply: 'Connection error. Try again?' }, { status: 500 });
  }
}
