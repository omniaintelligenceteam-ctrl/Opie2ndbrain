import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'https://ubuntu-s-1vcpu-1gb-sfo3-01.tail0fbff3.ts.net/gateway';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || '';

const VOICE_SYSTEM = `You are G, Wes's AI operations chief. Rules for voice responses:
- 2-3 sentences MAX. Be concise and direct.
- NO formatting: no tables, no bullets, no markdown, no lists, no emojis.
- Speak naturally like you're talking, not reading.
- When asked to do something, confirm what you'll do and do it.
- You manage the OpenClaw multi-agent system with agents: Elon (CTO), Gary (CMO), Mark (CRO), Ray (CFO), Tim (COO), Steve (CPO), Pepper (Chief of Staff).`;

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId = 'voice-agent' } = await req.json();

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!GATEWAY_TOKEN) {
      return Response.json({ error: 'Gateway token not configured' }, { status: 500 });
    }

    console.log('[VoiceAgent] Sending to G:', message.slice(0, 100));

    // Use sessions_spawn to talk to G
    const response = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        tool: 'sessions_spawn',
        args: {
          task: `${VOICE_SYSTEM}\n\nUser said: ${message}`,
          label: `voice:${sessionId}`,
          timeoutSeconds: 60,
          cleanup: 'keep',
        },
      }),
      signal: AbortSignal.timeout(65000),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[VoiceAgent] Gateway error:', response.status, error.slice(0, 200));
      return Response.json({ error: `Gateway error: ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    let reply = '';

    if (data.ok && data.result) {
      const result = data.result;
      if (result.details?.reply) reply = result.details.reply;
      else if (result.reply) reply = result.reply;
      else if (result.text) reply = result.text;
      else if (result.details?.status === 'error') reply = `Error: ${result.details.error}`;
      else if (typeof result === 'string') reply = result;
      else {
        // Try to extract text from content array
        const content = result.content || result.details?.content;
        if (Array.isArray(content)) {
          reply = content.map((c: any) => c.text || '').join('');
        }
      }
    }

    if (!reply) {
      reply = "Sorry, I didn't get a response. Try again.";
    }

    // Clean up voice response - remove markdown/formatting
    reply = reply
      .replace(/[*_~`#]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n{2,}/g, ' ')
      .replace(/\n/g, ' ')
      .trim();

    console.log('[VoiceAgent] G replied:', reply.slice(0, 100));

    return Response.json({ reply, sessionId });

  } catch (error) {
    console.error('[VoiceAgent] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
