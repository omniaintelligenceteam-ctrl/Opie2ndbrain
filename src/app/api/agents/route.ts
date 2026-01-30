import { NextResponse } from 'next/server';

const GATEWAY_URL = process.env.OPIE_GATEWAY_URL || process.env.MOLTBOT_GATEWAY_URL || 'http://localhost:18100';
const GATEWAY_TOKEN = process.env.OPIE_GATEWAY_TOKEN || process.env.MOLTBOT_GATEWAY_TOKEN || '';

interface GatewaySession {
  sessionId: string;
  label?: string;
  status: 'running' | 'complete' | 'failed' | 'idle';
  startedAt?: string;
  completedAt?: string;
  model?: string;
  tokensUsed?: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
}

interface AgentSession {
  id: string;
  label: string;
  status: 'running' | 'complete' | 'failed' | 'idle';
  startedAt: string;
  runtime: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  model: string;
  error?: string;
}

function formatRuntime(startedAt: string, completedAt?: string): string {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const diffMs = end - start;
  
  if (diffMs < 1000) return '<1s';
  if (diffMs < 60000) return `${Math.round(diffMs / 1000)}s`;
  if (diffMs < 3600000) return `${Math.round(diffMs / 60000)}m ${Math.round((diffMs % 60000) / 1000)}s`;
  return `${Math.round(diffMs / 3600000)}h ${Math.round((diffMs % 3600000) / 60000)}m`;
}

function extractLabel(sessionId: string, label?: string): string {
  if (label) return label;
  
  // Extract meaningful label from sessionId patterns
  // e.g., "agent:main:subagent:abc123" -> "Subagent abc123"
  // e.g., "agent:main:main" -> "Main Agent"
  const parts = sessionId.split(':');
  if (parts.length >= 3) {
    const type = parts[2];
    if (type === 'main') return 'Main Agent';
    if (type === 'subagent' && parts[3]) return `Subagent ${parts[3].slice(0, 8)}`;
    if (type === 'voice') return 'Voice Session';
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
  
  return sessionId.slice(0, 20);
}

async function gatewayFetch(path: string, options: RequestInit = {}) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
    ...options.headers,
  };

  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gateway error: ${res.status} ${text}`);
  }

  return res.json();
}

// GET /api/agents - List active agent sessions
export async function GET() {
  try {
    // Try to fetch from gateway /v1/sessions endpoint
    const data = await gatewayFetch('/v1/sessions');
    
    const sessions: AgentSession[] = (data.sessions || []).map((s: GatewaySession) => ({
      id: s.sessionId,
      label: extractLabel(s.sessionId, s.label),
      status: s.status || 'idle',
      startedAt: s.startedAt || new Date().toISOString(),
      runtime: s.startedAt ? formatRuntime(s.startedAt, s.completedAt) : '0s',
      tokens: {
        input: s.inputTokens || 0,
        output: s.outputTokens || 0,
        total: s.tokensUsed || (s.inputTokens || 0) + (s.outputTokens || 0),
      },
      model: s.model || 'unknown',
      error: s.error,
    }));

    return NextResponse.json({
      sessions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch agent sessions:', error);
    
    // Return demo data for development
    return NextResponse.json({
      sessions: [
        {
          id: 'agent:main:main',
          label: 'Main Agent',
          status: 'running',
          startedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          runtime: '5m 12s',
          tokens: { input: 2450, output: 890, total: 3340 },
          model: 'claude-sonnet-4-20250514',
        },
        {
          id: 'agent:main:subagent:research-abc123',
          label: 'Research Subagent',
          status: 'running',
          startedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
          runtime: '2m 34s',
          tokens: { input: 1200, output: 450, total: 1650 },
          model: 'claude-sonnet-4-20250514',
        },
        {
          id: 'agent:main:subagent:code-def456',
          label: 'Code Subagent',
          status: 'complete',
          startedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
          runtime: '8m 22s',
          tokens: { input: 5600, output: 2100, total: 7700 },
          model: 'claude-sonnet-4-20250514',
        },
      ],
      timestamp: new Date().toISOString(),
      demo: true,
    });
  }
}

// GET /api/agents/[id] - Get agent session details
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId } = body;
    
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    const data = await gatewayFetch(`/v1/sessions/${encodeURIComponent(sessionId)}`);
    
    return NextResponse.json({
      session: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch session details:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}
