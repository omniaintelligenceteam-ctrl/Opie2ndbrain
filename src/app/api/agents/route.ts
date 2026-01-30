import { NextResponse } from 'next/server';
import { gatewayFetch } from '@/lib/gateway';

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

export async function GET() {
  try {
    const data = await gatewayFetch<{ sessions?: GatewaySession[] }>('/sessions');
    
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
    
    // Return empty state when gateway unavailable
    return NextResponse.json({
      sessions: [],
      timestamp: new Date().toISOString(),
      error: 'Gateway unavailable',
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

    const data = await gatewayFetch(`/sessions/${encodeURIComponent(sessionId)}`);
    
    return NextResponse.json({
      session: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch session details:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}
