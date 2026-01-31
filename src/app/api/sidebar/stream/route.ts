import { NextRequest } from 'next/server';
import { GATEWAY_URL, GATEWAY_TOKEN, IS_VERCEL } from '@/lib/gateway';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Poll intervals (server-side)
const SESSIONS_POLL_INTERVAL = 1500;  // 1.5s - sessions change frequently
const CRONS_POLL_INTERVAL = 5000;     // 5s - crons change less often
const SKILLS_POLL_INTERVAL = 30000;   // 30s - skills rarely change
const MAX_STREAM_DURATION = 5 * 60 * 1000; // 5 min max per connection

// ============================================================================
// Types
// ============================================================================

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
  tokens: { input: number; output: number; total: number; };
  model: string;
}

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  command: string;
  enabled: boolean;
  priority?: 'critical' | 'normal' | 'low';
  lastRun?: string;
  lastStatus?: 'success' | 'failed' | 'running';
  nextRun?: string;
  runCount?: number;
  description?: string;
}

interface Task {
  id: string;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  label: string;
  status: 'running' | 'complete' | 'failed';
  startTime: string;
  progress?: number;
  output?: string;
}

interface Skill {
  id: string;
  name: string;
  category: string;
  available: boolean;
}

interface SidebarStats {
  activeAgents: number;
  totalAgents: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  enabledCrons: number;
  totalCrons: number;
}

// ============================================================================
// Helpers
// ============================================================================

function formatRuntime(startedAt: string, completedAt?: string): string {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const diffMs = end - start;
  
  if (diffMs < 1000) return '<1s';
  if (diffMs < 60000) return `${Math.round(diffMs / 1000)}s`;
  if (diffMs < 3600000) return `${Math.round(diffMs / 60000)}m`;
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

function determineSessionStatus(session: GatewaySession): string {
  if (session.abortedLastRun) return 'failed';
  const updatedAt = session.updatedAt;
  if (updatedAt && Date.now() - updatedAt < 30000) return 'running';
  const kind = session.kind;
  if (kind === 'other' || kind === 'subagent') return 'complete';
  return 'idle';
}

function normalizeStatus(status?: string): 'running' | 'complete' | 'failed' | 'idle' {
  if (!status) return 'idle';
  const lower = status.toLowerCase();
  if (['running', 'active', 'processing', 'busy', 'working', 'in_progress', 'pending', 'executing', 'started', 'thinking'].includes(lower)) return 'running';
  if (['complete', 'completed', 'success', 'done', 'finished'].includes(lower)) return 'complete';
  if (['failed', 'error', 'cancelled', 'aborted', 'timeout'].includes(lower)) return 'failed';
  return 'idle';
}

// Agent emoji mapping
const AGENT_EMOJI_MAP: Record<string, string> = {
  research: '🔍', code: '💻', content: '✍️', analyst: '📊',
  proposal: '📝', sales: '💰', qa: '✅', outreach: '📧',
};

function getAgentEmoji(label: string): string {
  const lower = label.toLowerCase();
  for (const [key, emoji] of Object.entries(AGENT_EMOJI_MAP)) {
    if (lower.includes(key)) return emoji;
  }
  return '🤖';
}

function getAgentType(label: string): string {
  const lower = label.toLowerCase();
  for (const key of Object.keys(AGENT_EMOJI_MAP)) {
    if (lower.includes(key)) return key;
  }
  return 'agent';
}

// ============================================================================
// Gateway Fetchers
// ============================================================================

async function fetchSessions(): Promise<{ sessions: AgentSession[]; tasks: Task[]; error?: string }> {
  if (IS_VERCEL && GATEWAY_URL.includes('localhost')) {
    return { sessions: [], tasks: [], error: 'Gateway unavailable' };
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
        args: { activeMinutes: 1440, messageLimit: 1 }, // Last 24 hours
      }),
      signal: AbortSignal.timeout(8000),
    });
    
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { sessions: [], tasks: [], error: 'Invalid gateway response' };
    }
    
    const data = await res.json();
    const rawSessions = data.result?.details?.sessions || data.result?.sessions || [];
    
    if (!data.ok || rawSessions.length === 0) {
      return { sessions: [], tasks: [] };
    }
    
    const sessions: AgentSession[] = [];
    const tasks: Task[] = [];
    
    for (const s of rawSessions as GatewaySession[]) {
      const sessionId = s.key || s.sessionId || 'unknown';
      const status = determineSessionStatus(s);
      const normalizedStatus = normalizeStatus(status);
      const startedAt = s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString();
      const label = s.label || extractLabel(sessionId, s.label);
      
      const session: AgentSession = {
        id: sessionId,
        label,
        status: normalizedStatus,
        startedAt,
        runtime: formatRuntime(startedAt),
        tokens: {
          input: s.contextTokens || 0,
          output: (s.totalTokens || 0) - (s.contextTokens || 0),
          total: s.totalTokens || 0,
        },
        model: s.model || 'unknown',
      };
      sessions.push(session);
      
      // Convert running sessions to tasks
      if (normalizedStatus === 'running' || normalizedStatus === 'complete' || normalizedStatus === 'failed') {
        tasks.push({
          id: sessionId,
          agentId: getAgentType(label),
          agentName: label,
          agentEmoji: getAgentEmoji(label),
          label,
          status: normalizedStatus === 'idle' ? 'complete' : normalizedStatus,
          startTime: startedAt,
          progress: normalizedStatus === 'running' ? 50 : normalizedStatus === 'complete' ? 100 : 0,
        });
      }
    }
    
    return { sessions, tasks };
  } catch (error) {
    console.error('[Sidebar SSE] Sessions fetch error:', error);
    return { sessions: [], tasks: [], error: error instanceof Error ? error.message : 'Fetch failed' };
  }
}

async function fetchCrons(): Promise<{ crons: CronJob[]; error?: string }> {
  if (IS_VERCEL && GATEWAY_URL.includes('localhost')) {
    return { crons: [], error: 'Gateway unavailable' };
  }
  
  try {
    // Try the /crons endpoint first
    const res = await fetch(`${GATEWAY_URL}/crons`, {
      headers: {
        'Accept': 'application/json',
        ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
      },
      signal: AbortSignal.timeout(5000),
    });
    
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // Try tools/invoke as fallback
      const invokeRes = await fetch(`${GATEWAY_URL}/tools/invoke`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
        },
        body: JSON.stringify({ tool: 'crons_list', args: {} }),
        signal: AbortSignal.timeout(5000),
      });
      
      if (invokeRes.ok) {
        const invokeData = await invokeRes.json();
        return { crons: invokeData.result?.crons || [] };
      }
      
      return { crons: [] };
    }
    
    const data = await res.json();
    return { crons: data.crons || data || [] };
  } catch (error) {
    console.error('[Sidebar SSE] Crons fetch error:', error);
    return { crons: [], error: error instanceof Error ? error.message : 'Fetch failed' };
  }
}

async function fetchSkills(): Promise<{ skills: Skill[]; error?: string }> {
  // Skills are typically static, but we can check what tools are available
  if (IS_VERCEL && GATEWAY_URL.includes('localhost')) {
    return { skills: [], error: 'Gateway unavailable' };
  }
  
  try {
    const res = await fetch(`${GATEWAY_URL}/tools/list`, {
      headers: {
        'Accept': 'application/json',
        ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
      },
      signal: AbortSignal.timeout(5000),
    });
    
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { skills: [] };
    }
    
    const data = await res.json();
    const tools = data.tools || [];
    
    // Map tools to skills format
    const skills: Skill[] = tools.map((tool: { name: string; description?: string; category?: string }) => ({
      id: tool.name,
      name: tool.name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
      category: tool.category || 'Tools',
      available: true,
    }));
    
    return { skills };
  } catch (error) {
    console.error('[Sidebar SSE] Skills fetch error:', error);
    return { skills: [], error: error instanceof Error ? error.message : 'Fetch failed' };
  }
}

async function fetchSystemStatus(): Promise<{ 
  gatewayConnected: boolean; 
  latency: number;
  model?: string;
}> {
  if (IS_VERCEL && GATEWAY_URL.includes('localhost')) {
    return { gatewayConnected: false, latency: 0 };
  }
  
  const start = Date.now();
  try {
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
      },
      body: JSON.stringify({ tool: 'session_status', args: {} }),
      signal: AbortSignal.timeout(5000),
    });
    
    const latency = Date.now() - start;
    
    if (res.ok) {
      const data = await res.json();
      return {
        gatewayConnected: data.ok,
        latency,
        model: data.result?.model,
      };
    }
    
    return { gatewayConnected: false, latency };
  } catch {
    return { gatewayConnected: false, latency: Date.now() - start };
  }
}

// ============================================================================
// Signature functions for change detection
// ============================================================================

function sessionsSignature(sessions: AgentSession[]): string {
  return sessions.map(s => `${s.id}:${s.status}:${s.tokens.total}`).sort().join('|');
}

function tasksSignature(tasks: Task[]): string {
  return tasks.map(t => `${t.id}:${t.status}:${t.progress}`).sort().join('|');
}

function cronsSignature(crons: CronJob[]): string {
  return crons.map(c => `${c.id}:${c.enabled}:${c.lastStatus}`).sort().join('|');
}

// ============================================================================
// SSE Handler
// ============================================================================

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  let sessionsIntervalId: NodeJS.Timeout | null = null;
  let cronsIntervalId: NodeJS.Timeout | null = null;
  let skillsIntervalId: NodeJS.Timeout | null = null;
  let heartbeatIntervalId: NodeJS.Timeout | null = null;
  
  let lastSessionsSig = '';
  let lastTasksSig = '';
  let lastCronsSig = '';
  let isAborted = false;
  const startTime = Date.now();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`));
      
      // === Initial data fetch ===
      const [sessionsResult, cronsResult, skillsResult, statusResult] = await Promise.all([
        fetchSessions(),
        fetchCrons(),
        fetchSkills(),
        fetchSystemStatus(),
      ]);
      
      // Calculate initial stats
      const stats: SidebarStats = {
        activeAgents: sessionsResult.sessions.filter(s => s.status === 'running').length,
        totalAgents: sessionsResult.sessions.length,
        runningTasks: sessionsResult.tasks.filter(t => t.status === 'running').length,
        completedTasks: sessionsResult.tasks.filter(t => t.status === 'complete').length,
        failedTasks: sessionsResult.tasks.filter(t => t.status === 'failed').length,
        enabledCrons: cronsResult.crons.filter(c => c.enabled).length,
        totalCrons: cronsResult.crons.length,
      };
      
      lastSessionsSig = sessionsSignature(sessionsResult.sessions);
      lastTasksSig = tasksSignature(sessionsResult.tasks);
      lastCronsSig = cronsSignature(cronsResult.crons);
      
      // Send initial data for all sections
      const initialPayload = {
        sessions: sessionsResult.sessions,
        tasks: sessionsResult.tasks,
        crons: cronsResult.crons,
        skills: skillsResult.skills,
        stats,
        gateway: {
          connected: statusResult.gatewayConnected,
          latency: statusResult.latency,
          model: statusResult.model,
        },
        timestamp: new Date().toISOString(),
        source: sessionsResult.error ? 'fallback' : 'gateway',
      };
      
      controller.enqueue(encoder.encode(`event: initial\ndata: ${JSON.stringify(initialPayload)}\n\n`));
      
      // === Polling intervals ===
      
      // Sessions & Tasks - poll frequently
      sessionsIntervalId = setInterval(async () => {
        if (isAborted) return;
        if (Date.now() - startTime > MAX_STREAM_DURATION) {
          controller.enqueue(encoder.encode(`event: reconnect\ndata: ${JSON.stringify({ reason: 'max_duration' })}\n\n`));
          controller.close();
          return;
        }
        
        try {
          const result = await fetchSessions();
          const newSessionsSig = sessionsSignature(result.sessions);
          const newTasksSig = tasksSignature(result.tasks);
          
          // Only send if data changed
          if (newSessionsSig !== lastSessionsSig || newTasksSig !== lastTasksSig) {
            lastSessionsSig = newSessionsSig;
            lastTasksSig = newTasksSig;
            
            const stats: SidebarStats = {
              activeAgents: result.sessions.filter(s => s.status === 'running').length,
              totalAgents: result.sessions.length,
              runningTasks: result.tasks.filter(t => t.status === 'running').length,
              completedTasks: result.tasks.filter(t => t.status === 'complete').length,
              failedTasks: result.tasks.filter(t => t.status === 'failed').length,
              enabledCrons: 0, // Will be updated by crons poll
              totalCrons: 0,
            };
            
            controller.enqueue(encoder.encode(`event: sessions\ndata: ${JSON.stringify({
              sessions: result.sessions,
              tasks: result.tasks,
              stats,
              timestamp: new Date().toISOString(),
            })}\n\n`));
          }
        } catch (error) {
          console.error('[Sidebar SSE] Sessions poll error:', error);
        }
      }, SESSIONS_POLL_INTERVAL);
      
      // Crons - poll less frequently
      cronsIntervalId = setInterval(async () => {
        if (isAborted) return;
        
        try {
          const result = await fetchCrons();
          const newCronsSig = cronsSignature(result.crons);
          
          if (newCronsSig !== lastCronsSig) {
            lastCronsSig = newCronsSig;
            
            controller.enqueue(encoder.encode(`event: crons\ndata: ${JSON.stringify({
              crons: result.crons,
              enabledCount: result.crons.filter(c => c.enabled).length,
              totalCount: result.crons.length,
              timestamp: new Date().toISOString(),
            })}\n\n`));
          }
        } catch (error) {
          console.error('[Sidebar SSE] Crons poll error:', error);
        }
      }, CRONS_POLL_INTERVAL);
      
      // Skills - poll rarely
      skillsIntervalId = setInterval(async () => {
        if (isAborted) return;
        
        try {
          const result = await fetchSkills();
          
          controller.enqueue(encoder.encode(`event: skills\ndata: ${JSON.stringify({
            skills: result.skills,
            timestamp: new Date().toISOString(),
          })}\n\n`));
        } catch (error) {
          console.error('[Sidebar SSE] Skills poll error:', error);
        }
      }, SKILLS_POLL_INTERVAL);
      
      // Heartbeat to keep connection alive
      heartbeatIntervalId = setInterval(() => {
        if (!isAborted) {
          controller.enqueue(encoder.encode(`:heartbeat ${Date.now()}\n\n`));
        }
      }, 25000);
    },
    
    cancel() {
      isAborted = true;
      if (sessionsIntervalId) clearInterval(sessionsIntervalId);
      if (cronsIntervalId) clearInterval(cronsIntervalId);
      if (skillsIntervalId) clearInterval(skillsIntervalId);
      if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
