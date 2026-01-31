import { NextResponse } from 'next/server';

// Force Node.js runtime for full env var access
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { GATEWAY_URL, GATEWAY_TOKEN, IS_VERCEL } from '@/lib/gateway';

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
  // Running states
  if (lower === 'running' || lower === 'active' || lower === 'processing' ||
      lower === 'busy' || lower === 'working' || lower === 'in_progress' ||
      lower === 'in-progress' || lower === 'pending' || lower === 'executing' ||
      lower === 'started' || lower === 'thinking') return 'running';
  // Complete states
  if (lower === 'complete' || lower === 'completed' || lower === 'success' ||
      lower === 'done' || lower === 'finished') return 'complete';
  // Failed states
  if (lower === 'failed' || lower === 'error' || lower === 'cancelled' ||
      lower === 'aborted' || lower === 'timeout') return 'failed';
  return 'idle';
}

// Fetch sessions via /tools/invoke API (the proper gateway endpoint)
async function tryFetchSessions(): Promise<GatewaySession[]> {
  // Skip network calls entirely in Vercel with localhost gateway
  if (IS_VERCEL && GATEWAY_URL.includes('localhost')) {
    return [];
  }
  
  try {
    // Use the /tools/invoke endpoint to call sessions_list
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
      },
      body: JSON.stringify({
        tool: 'sessions_list',
        args: {
          activeMinutes: 60,  // Sessions active in last hour
          messageLimit: 1,    // Include last message for status
        },
      }),
      signal: AbortSignal.timeout(10000),
    });
    
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.warn('Gateway returned non-JSON for sessions_list');
      return [];
    }
    
    const data = await res.json();
    
    if (data.ok && data.result?.sessions) {
      // Map gateway session format to our expected format
      return data.result.sessions.map((s: Record<string, unknown>) => ({
        sessionId: s.key || s.sessionId,
        key: s.key,
        label: s.label || s.displayName,
        status: determineSessionStatus(s),
        lastActivityAt: s.updatedAt ? new Date(s.updatedAt as number).toISOString() : undefined,
        startedAt: s.createdAt ? new Date(s.createdAt as number).toISOString() : undefined,
        model: s.model as string,
        tokensUsed: s.totalTokens as number,
        inputTokens: s.contextTokens as number,
        outputTokens: (s.totalTokens as number) - (s.contextTokens as number || 0),
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Failed to fetch sessions via tools/invoke:', error);
    return [];
  }
}

// Determine session status based on session data
function determineSessionStatus(session: Record<string, unknown>): string {
  // Check if aborted
  if (session.abortedLastRun) return 'failed';
  
  // Check for recent activity (within last 30 seconds = likely running)
  const updatedAt = session.updatedAt as number;
  if (updatedAt && Date.now() - updatedAt < 30000) {
    return 'running';
  }
  
  // Check kind
  const kind = session.kind as string;
  if (kind === 'other' || kind === 'subagent') {
    // Subagents that aren't recently active are likely complete
    return 'complete';
  }
  
  return 'idle';
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
  // Check if gateway is available
  const gatewayUnavailable = IS_VERCEL && GATEWAY_URL.includes('localhost');
  
  if (gatewayUnavailable) {
    return NextResponse.json({ 
      error: 'Session details unavailable in demo mode',
      demo: true 
    }, { status: 503 });
  }
  
  try {
    const body = await request.json();
    const { sessionId, sessionKey } = body;
    
    const key = sessionKey || sessionId;
    if (!key) {
      return NextResponse.json({ error: 'sessionId or sessionKey required' }, { status: 400 });
    }

    // Use /tools/invoke to call sessions_history
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
      },
      body: JSON.stringify({
        tool: 'sessions_history',
        args: {
          sessionKey: key,
          limit: 20,
          includeTools: false,
        },
      }),
      signal: AbortSignal.timeout(10000),
    });
    
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Gateway returned non-JSON response' }, { status: 502 });
    }
    
    const data = await res.json();
    
    if (!data.ok) {
      return NextResponse.json({ 
        error: data.error?.message || 'Session not found',
        details: data.error,
      }, { status: 404 });
    }
    
    return NextResponse.json({
      session: {
        key,
        history: data.result,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch session details:', error);
    return NextResponse.json({ error: 'Failed to fetch session - gateway unavailable' }, { status: 503 });
  }
}
