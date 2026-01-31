import { NextRequest } from 'next/server';
import { GATEWAY_URL, GATEWAY_TOKEN, IS_VERCEL } from '@/lib/gateway';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Poll interval on server side (faster than client polling)
const SERVER_POLL_INTERVAL = 1500; // 1.5 seconds
const MAX_STREAM_DURATION = 5 * 60 * 1000; // 5 minutes max per connection

interface GatewaySession {
  key?: string;
  sessionId?: string;
  label?: string;
  status?: string;
  updatedAt?: number;
  createdAt?: number;
  model?: string;
  totalTokens?: number;
  contextTokens?: number;
  abortedLastRun?: boolean;
  kind?: string;
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
      const subId = parts[3];
      return `Subagent ${subId.slice(0, 8)}`;
    }
    if (type === 'voice') return 'Voice Session';
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
  
  return sessionId.slice(0, 20);
}

function determineSessionStatus(session: GatewaySession): string {
  if (session.abortedLastRun) return 'failed';
  
  const updatedAt = session.updatedAt;
  if (updatedAt && Date.now() - updatedAt < 30000) {
    return 'running';
  }
  
  const kind = session.kind;
  if (kind === 'other' || kind === 'subagent') {
    return 'complete';
  }
  
  return 'idle';
}

function normalizeStatus(status?: string): 'running' | 'complete' | 'failed' | 'idle' {
  if (!status) return 'idle';

  const lower = status.toLowerCase();
  if (['running', 'active', 'processing', 'busy', 'working', 'in_progress', 
       'in-progress', 'pending', 'executing', 'started', 'thinking'].includes(lower)) return 'running';
  if (['complete', 'completed', 'success', 'done', 'finished'].includes(lower)) return 'complete';
  if (['failed', 'error', 'cancelled', 'aborted', 'timeout'].includes(lower)) return 'failed';
  return 'idle';
}

async function fetchSessions(): Promise<{ sessions: AgentSession[]; error?: string }> {
  if (IS_VERCEL && GATEWAY_URL.includes('localhost')) {
    return { sessions: [], error: 'Gateway unavailable' };
  }
  
  try {
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
      },
      body: JSON.stringify({
        tool: 'sessions_list',
        args: { activeMinutes: 60, messageLimit: 1 },
      }),
      signal: AbortSignal.timeout(8000),
    });
    
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { sessions: [], error: 'Invalid gateway response' };
    }
    
    const data = await res.json();
    const rawSessions = data.result?.details?.sessions || data.result?.sessions || [];
    
    if (!data.ok || rawSessions.length === 0) {
      return { sessions: [] };
    }
    
    const sessions: AgentSession[] = rawSessions.map((s: GatewaySession) => {
      const sessionId = s.key || s.sessionId || 'unknown';
      const status = determineSessionStatus(s);
      const startedAt = s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString();
      
      return {
        id: sessionId,
        label: s.label || extractLabel(sessionId, s.label),
        status: normalizeStatus(status),
        startedAt,
        runtime: formatRuntime(startedAt),
        tokens: {
          input: s.contextTokens || 0,
          output: (s.totalTokens || 0) - (s.contextTokens || 0),
          total: s.totalTokens || 0,
        },
        model: s.model || 'unknown',
      };
    });
    
    return { sessions };
  } catch (error) {
    console.error('[SSE] Gateway fetch error:', error);
    return { sessions: [], error: error instanceof Error ? error.message : 'Connection failed' };
  }
}

// Create a signature of sessions for change detection
function sessionsSignature(sessions: AgentSession[]): string {
  return sessions
    .map(s => `${s.id}:${s.status}:${s.tokens.total}`)
    .sort()
    .join('|');
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout | null = null;
  let lastSignature = '';
  let isAborted = false;
  const startTime = Date.now();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`));
      
      // Initial data fetch
      const initial = await fetchSessions();
      lastSignature = sessionsSignature(initial.sessions);
      
      const initialPayload = {
        type: 'update',
        sessions: initial.sessions,
        summary: {
          total: initial.sessions.length,
          running: initial.sessions.filter(s => s.status === 'running').length,
          completed: initial.sessions.filter(s => s.status === 'complete').length,
          failed: initial.sessions.filter(s => s.status === 'failed').length,
          idle: initial.sessions.filter(s => s.status === 'idle').length,
        },
        timestamp: new Date().toISOString(),
        source: initial.error ? 'fallback' : 'gateway',
        ...(initial.error && { error: initial.error }),
      };
      
      controller.enqueue(encoder.encode(`event: sessions\ndata: ${JSON.stringify(initialPayload)}\n\n`));
      
      // Poll and push updates
      intervalId = setInterval(async () => {
        if (isAborted) {
          if (intervalId) clearInterval(intervalId);
          return;
        }
        
        // Check if we've exceeded max stream duration
        if (Date.now() - startTime > MAX_STREAM_DURATION) {
          controller.enqueue(encoder.encode(`event: reconnect\ndata: ${JSON.stringify({ reason: 'max_duration' })}\n\n`));
          controller.close();
          if (intervalId) clearInterval(intervalId);
          return;
        }
        
        try {
          const result = await fetchSessions();
          const newSignature = sessionsSignature(result.sessions);
          
          // Only send if data changed
          if (newSignature !== lastSignature) {
            lastSignature = newSignature;
            
            const payload = {
              type: 'update',
              sessions: result.sessions,
              summary: {
                total: result.sessions.length,
                running: result.sessions.filter(s => s.status === 'running').length,
                completed: result.sessions.filter(s => s.status === 'complete').length,
                failed: result.sessions.filter(s => s.status === 'failed').length,
                idle: result.sessions.filter(s => s.status === 'idle').length,
              },
              timestamp: new Date().toISOString(),
              source: result.error ? 'fallback' : 'gateway',
              ...(result.error && { error: result.error }),
            };
            
            controller.enqueue(encoder.encode(`event: sessions\ndata: ${JSON.stringify(payload)}\n\n`));
          }
          
          // Send heartbeat every ~30 seconds even if no change
          // This keeps the connection alive through proxies
        } catch (error) {
          console.error('[SSE] Polling error:', error);
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'Polling failed' })}\n\n`));
        }
      }, SERVER_POLL_INTERVAL);
      
      // Heartbeat every 25 seconds to keep connection alive
      const heartbeatId = setInterval(() => {
        if (!isAborted) {
          controller.enqueue(encoder.encode(`:heartbeat ${Date.now()}\n\n`));
        }
      }, 25000);
      
      // Store heartbeat ID for cleanup
      (globalThis as unknown as { heartbeatId?: NodeJS.Timeout }).heartbeatId = heartbeatId;
    },
    
    cancel() {
      isAborted = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
      const heartbeatId = (globalThis as unknown as { heartbeatId?: NodeJS.Timeout }).heartbeatId;
      if (heartbeatId) {
        clearInterval(heartbeatId);
      }
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
