import { NextResponse } from 'next/server';
import { GATEWAY_URL, GATEWAY_TOKEN } from '@/lib/gateway';

interface GatewaySession {
  sessionId?: string;
  key?: string;
  label?: string;
  status?: string;
  lastActivityAt?: string;
  startedAt?: string;
  completedAt?: string;
  model?: string;
  tokensUsed?: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
  reasoningLevel?: string;
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
  
  const parts = sessionId.split(':');
  if (parts.length >= 3) {
    const type = parts[2];
    if (type === 'main') return 'Main Agent';
    if (type === 'subagent' && parts[3]) {
      // Try to extract label from subagent ID
      const subId = parts[3];
      return `Subagent ${subId.slice(0, 8)}`;
    }
    if (type === 'voice') return 'Voice Session';
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
  
  return sessionId.slice(0, 20);
}

function normalizeStatus(status?: string): 'running' | 'complete' | 'failed' | 'idle' {
  if (!status) return 'idle';
  
  const lower = status.toLowerCase();
  if (lower === 'running' || lower === 'active') return 'running';
  if (lower === 'complete' || lower === 'completed' || lower === 'success') return 'complete';
  if (lower === 'failed' || lower === 'error') return 'failed';
  return 'idle';
}

// Try to fetch sessions via WebSocket-style RPC over HTTP (if supported)
async function tryFetchSessions(): Promise<GatewaySession[]> {
  const methods = [
    // Try direct sessions endpoint
    async () => {
      const res = await fetch(`${GATEWAY_URL}/sessions`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
        },
        signal: AbortSignal.timeout(5000),
      });
      
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        return data.sessions || data;
      }
      return null;
    },
    // Try API v1 endpoint  
    async () => {
      const res = await fetch(`${GATEWAY_URL}/api/v1/sessions`, {
        headers: {
          'Accept': 'application/json',
          ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
        },
        signal: AbortSignal.timeout(5000),
      });
      
      if (res.ok) {
        const data = await res.json();
        return data.sessions || data;
      }
      return null;
    },
    // Try internal RPC endpoint
    async () => {
      const res = await fetch(`${GATEWAY_URL}/_internal/sessions`, {
        headers: {
          'Accept': 'application/json',
          ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
        },
        signal: AbortSignal.timeout(5000),
      });
      
      if (res.ok) {
        const data = await res.json();
        return data.sessions || data;
      }
      return null;
    },
  ];

  for (const method of methods) {
    try {
      const result = await method();
      if (result && Array.isArray(result)) {
        return result;
      }
    } catch {
      // Try next method
    }
  }
  
  return [];
}

// Check if a session is likely an agent session (vs main chat)
function isAgentSession(session: GatewaySession): boolean {
  const id = session.sessionId || session.key || '';
  const label = session.label || '';
  
  // Include subagents
  if (id.includes('subagent')) return true;
  
  // Include sessions with agent-like labels
  const agentKeywords = [
    'research', 'code', 'content', 'analyst', 'sales', 
    'proposal', 'qa', 'outreach', 'agent', 'task'
  ];
  
  const lowerLabel = label.toLowerCase();
  return agentKeywords.some(kw => lowerLabel.includes(kw));
}

export async function GET() {
  try {
    // Try to fetch real session data
    const rawSessions = await tryFetchSessions();
    
    // Filter and transform sessions
    const sessions: AgentSession[] = rawSessions
      .filter(s => s && (s.sessionId || s.key))
      .map((s: GatewaySession) => {
        const sessionId = s.sessionId || s.key || 'unknown';
        return {
          id: sessionId,
          label: s.label || extractLabel(sessionId, s.label),
          status: normalizeStatus(s.status),
          startedAt: s.startedAt || s.lastActivityAt || new Date().toISOString(),
          runtime: s.startedAt ? formatRuntime(s.startedAt, s.completedAt) : '0s',
          tokens: {
            input: s.inputTokens || 0,
            output: s.outputTokens || 0,
            total: s.tokensUsed || (s.inputTokens || 0) + (s.outputTokens || 0),
          },
          model: s.model || 'unknown',
          error: s.error,
        };
      });

    // Compute summary stats
    const runningCount = sessions.filter(s => s.status === 'running').length;
    const totalTokens = sessions.reduce((sum, s) => sum + s.tokens.total, 0);

    return NextResponse.json({
      sessions,
      summary: {
        total: sessions.length,
        running: runningCount,
        completed: sessions.filter(s => s.status === 'complete').length,
        failed: sessions.filter(s => s.status === 'failed').length,
        idle: sessions.filter(s => s.status === 'idle').length,
        totalTokens,
      },
      timestamp: new Date().toISOString(),
      source: rawSessions.length > 0 ? 'gateway' : 'empty',
    });
  } catch (error) {
    console.error('Failed to fetch agent sessions:', error);
    
    // Return empty state when gateway unavailable
    return NextResponse.json({
      sessions: [],
      summary: {
        total: 0,
        running: 0,
        completed: 0,
        failed: 0,
        idle: 0,
        totalTokens: 0,
      },
      timestamp: new Date().toISOString(),
      error: 'Gateway unavailable',
      source: 'fallback',
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId } = body;
    
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    // Try to fetch specific session details
    const res = await fetch(`${GATEWAY_URL}/sessions/${encodeURIComponent(sessionId)}`, {
      headers: {
        'Accept': 'application/json',
        ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
      },
      signal: AbortSignal.timeout(5000),
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    const data = await res.json();
    
    return NextResponse.json({
      session: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch session details:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}
