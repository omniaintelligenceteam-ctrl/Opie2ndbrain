import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://143.198.128.209/ocgw';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || '';

// Ollama cloud API (same provider as the main chat route)
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'https://ollama.com/v1';
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || '';
const OLLAMA_MODEL = 'kimi-k2.5:cloud';

// G's voice persona — concise, direct, ops-focused
const G_SYSTEM = `You are G, Wes's AI operations chief for the OpenClaw multi-agent system. You run a team of AI agents on a DigitalOcean droplet.

Your team:
- Elon (CTO) — tech architecture
- Gary (CMO) — marketing & content
- Mark (CRO) — revenue & sales
- Ray (CFO) — finance & costs
- Tim (COO) — operations
- Steve (CPO) — product
- Pepper (Chief of Staff) — coordination
- Codex — coding agent
- Scout — lead generation
- Opie — 2nd brain assistant

VOICE RESPONSE RULES (critical):
- 2-3 sentences MAX. Be concise and direct.
- NO formatting: no tables, no bullets, no markdown, no lists, no emojis, no asterisks.
- Speak naturally like you're talking to Wes in person.
- When reporting status, give the headline, not a data dump.
- You have real-time access to system status. Use the context provided to give accurate answers.`;

// Conversation memory per session (in-memory, resets on cold start)
const sessions = new Map<string, Array<{ role: string; content: string }>>();
const MAX_HISTORY = 20;

// Fetch live system context from gateway
async function getSystemContext(): Promise<string> {
  if (!GATEWAY_TOKEN) return '';

  const parts: string[] = [];

  try {
    // Fetch status + agents in parallel
    const [statusRes, agentsRes, sessionsRes] = await Promise.allSettled([
      fetch(`${GATEWAY_URL}/tools/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        },
        body: JSON.stringify({ tool: 'session_status', args: {} }),
        signal: AbortSignal.timeout(8000),
      }).then(r => r.json()),

      fetch(`${GATEWAY_URL}/tools/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        },
        body: JSON.stringify({ tool: 'agents_list', args: {} }),
        signal: AbortSignal.timeout(8000),
      }).then(r => r.json()),

      fetch(`${GATEWAY_URL}/tools/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        },
        body: JSON.stringify({ tool: 'sessions_list', args: {} }),
        signal: AbortSignal.timeout(8000),
      }).then(r => r.json()),
    ]);

    if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
      const statusText = statusRes.value.result?.details?.statusText
        || statusRes.value.result?.content?.[0]?.text
        || '';
      if (statusText) parts.push(`[SYSTEM STATUS]\n${statusText}`);
    }

    if (agentsRes.status === 'fulfilled' && agentsRes.value.ok) {
      const agents = agentsRes.value.result?.details?.agents;
      if (Array.isArray(agents)) {
        const agentList = agents.map((a: any) => `${a.name} (${a.id})`).join(', ');
        parts.push(`[AGENTS] ${agents.length} configured: ${agentList}`);
      }
    }

    if (sessionsRes.status === 'fulfilled' && sessionsRes.value.ok) {
      const activeSessions = sessionsRes.value.result?.details?.sessions;
      if (Array.isArray(activeSessions)) {
        const sessionSummary = activeSessions.map((s: any) => {
          const ago = s.updatedAt ? Math.round((Date.now() - s.updatedAt) / 60000) : '?';
          return `${s.key} (${s.model}, ${ago}m ago, ${s.totalTokens} tokens)`;
        }).join('; ');
        parts.push(`[ACTIVE SESSIONS] ${activeSessions.length}: ${sessionSummary}`);
      }
    }
  } catch (e) {
    console.error('[VoiceAgent] Context fetch error:', e);
  }

  return parts.length > 0 ? '\n\n--- LIVE SYSTEM DATA ---\n' + parts.join('\n\n') : '';
}

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId = 'voice-default', history } = await req.json();

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!OLLAMA_API_KEY) {
      return Response.json({ error: 'OLLAMA_API_KEY not configured' }, { status: 500 });
    }

    console.log('[VoiceAgent] User:', message.slice(0, 100));

    // Get or create conversation history
    let convo = sessions.get(sessionId) || [];

    // If client sent history, use that (handles cold starts)
    if (Array.isArray(history) && history.length > 0 && convo.length === 0) {
      convo = history.slice(-MAX_HISTORY).map((m: any) => ({
        role: m.role as string,
        content: m.text || m.content || '',
      }));
    }

    // Add user message
    convo.push({ role: 'user', content: message });

    // Trim to max history
    if (convo.length > MAX_HISTORY) {
      convo = convo.slice(-MAX_HISTORY);
    }

    // Fetch live system context for G's awareness
    const liveContext = await getSystemContext();

    const systemPrompt = G_SYSTEM + liveContext;

    // Build messages array with system prompt
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...convo,
    ];

    // Call Ollama/Kimi cloud API (OpenAI-compatible)
    const response = await fetch(`${OLLAMA_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OLLAMA_API_KEY}`,
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: apiMessages,
        max_tokens: 300, // Keep voice responses short
        temperature: 0.7,
        stream: false,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[VoiceAgent] Ollama error:', response.status, errorText.slice(0, 200));
      return Response.json({ error: `AI provider error: ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || '';

    if (!reply) {
      reply = "Sorry, I didn't catch that. Say again?";
    }

    // Clean up for voice — strip any formatting that slipped through
    reply = reply
      .replace(/[*_~`#]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n{2,}/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    // Save assistant response to history
    convo.push({ role: 'assistant', content: reply });
    sessions.set(sessionId, convo);

    console.log('[VoiceAgent] G:', reply.slice(0, 100));

    return Response.json({ reply, sessionId });

  } catch (error) {
    console.error('[VoiceAgent] Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: msg }, { status: 500 });
  }
}
