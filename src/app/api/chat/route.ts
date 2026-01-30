import { NextRequest, NextResponse } from 'next/server';
import { GATEWAY_URL, GATEWAY_TOKEN } from '@/lib/gateway';

const VOICE_INSTRUCTIONS = `[VOICE MODE] This is a voice conversation. Rules:
- 2-3 sentences MAX. Be concise.
- NO formatting: no tables, no bullets, no markdown, no lists.
- Speak naturally like you're talking, not reading.
- Don't dump information. Answer directly.
- If asked something complex, give the short answer first, then offer to elaborate.

User said: `;

export async function POST(req: NextRequest) {
  const { message, sessionId, isVoice = true } = await req.json();
  
  if (!message) {
    return NextResponse.json({ reply: 'No message provided' }, { status: 400 });
  }

  if (!GATEWAY_TOKEN) {
    console.error('MOLTBOT_GATEWAY_TOKEN not set');
    return NextResponse.json({ reply: 'Server configuration error - no gateway token' }, { status: 500 });
  }

  try {
    const res = await fetch(`${GATEWAY_URL}/v1/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'x-moltbot-agent-id': 'main',
        'x-moltbot-session-key': sessionId || 'agent:main:voice'
      },
      body: JSON.stringify({
        model: 'moltbot:main',
        input: isVoice ? VOICE_INSTRUCTIONS + message : message,
        stream: false
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Gateway error:', res.status, errorText);
      return NextResponse.json({ reply: 'Sorry, hit an error. Try again?' }, { status: 500 });
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
    return NextResponse.json({ reply: 'Connection error. Try again?' }, { status: 500 });
  }
}
