import { NextResponse } from 'next/server';
import { invokeGatewayTool, gatewayHealth } from '@/lib/gateway';
import { OIOS_AGENTS, type OIOSAgent } from '@/lib/oios-agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// --- Types ---

interface OIOSAgentStatus {
  id: string;
  name: string;
  role: string;
  model: OIOSAgent['model'];
  emoji: string;
  color: string;
  status: 'active' | 'idle' | 'error';
  sessionKey?: string;
  lastActivity?: string;
  tokensUsed?: number;
}

interface ActivityItem {
  agent: string;
  action: string;
  timestamp: string;
  channel?: string;
}

interface GatewaySession {
  key?: string;
  label?: string;
  displayName?: string;
  updatedAt?: number;
  createdAt?: number;
  totalTokens?: number;
  model?: string;
  abortedLastRun?: boolean;
  kind?: string;
}

interface SessionsResult {
  sessions?: GatewaySession[];
  details?: {
    sessions?: GatewaySession[];
  };
}

// --- Helpers ---

/**
 * Try to match a gateway session to an OIOS agent.
 * Checks session key, label, and displayName for agent name references.
 */
function matchSessionToAgent(session: GatewaySession): OIOSAgent | undefined {
  const haystack = [
    session.key ?? '',
    session.label ?? '',
    session.displayName ?? '',
  ]
    .join(' ')
    .toLowerCase();

  // Direct agent-id match first (most specific)
  for (const agent of OIOS_AGENTS) {
    if (haystack.includes(agent.id)) {
      return agent;
    }
  }

  // Fall back to agent name match (case-insensitive)
  for (const agent of OIOS_AGENTS) {
    if (haystack.includes(agent.name.toLowerCase())) {
      return agent;
    }
  }

  // Check for the gateway 'main' key which maps to G
  if (haystack.includes('main')) {
    return OIOS_AGENTS.find((a) => a.id === 'g');
  }

  return undefined;
}

/**
 * Derive a human-readable action string from a session.
 */
function deriveAction(session: GatewaySession): string {
  if (session.abortedLastRun) return 'Session aborted';
  const updatedAt = session.updatedAt ?? 0;
  if (updatedAt && Date.now() - updatedAt < 30_000) return 'Processing';
  if (session.kind === 'subagent') return 'Subagent task';
  return 'Session active';
}

// --- Route handler ---

export async function GET() {
  const timestamp = new Date().toISOString();

  // Fire gateway health check and sessions list in parallel
  const [healthResult, sessionsResult] = await Promise.all([
    gatewayHealth().catch((err) => ({
      connected: false,
      latency: 0,
      reason: err instanceof Error ? err.message : 'Unknown error',
    })),
    invokeGatewayTool<SessionsResult>('sessions_list', {
      activeMinutes: 120,
      messageLimit: 1,
    }).catch(() => ({
      ok: false as const,
      error: { type: 'network', message: 'Failed to fetch sessions' },
    })),
  ]);

  // Extract sessions array from gateway response
  const rawSessions: GatewaySession[] = sessionsResult.ok
    ? sessionsResult.result?.details?.sessions ??
      sessionsResult.result?.sessions ??
      []
    : [];

  // Build a map of agentId -> matched session(s)
  const agentSessionMap = new Map<string, GatewaySession>();
  const recentActivity: ActivityItem[] = [];

  for (const session of rawSessions) {
    const agent = matchSessionToAgent(session);
    if (!agent) continue;

    // Keep the most recent session per agent
    const existing = agentSessionMap.get(agent.id);
    const sessionTime = session.updatedAt ?? session.createdAt ?? 0;
    const existingTime = existing?.updatedAt ?? existing?.createdAt ?? 0;

    if (!existing || sessionTime > existingTime) {
      agentSessionMap.set(agent.id, session);
    }

    // Collect activity entries
    recentActivity.push({
      agent: agent.name,
      action: deriveAction(session),
      timestamp: session.updatedAt
        ? new Date(session.updatedAt).toISOString()
        : session.createdAt
          ? new Date(session.createdAt).toISOString()
          : timestamp,
      channel: session.label ?? session.key ?? undefined,
    });
  }

  // Sort activity newest-first, cap at 20
  recentActivity.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  recentActivity.splice(20);

  // Build per-agent status from config + matched sessions
  const agents: OIOSAgentStatus[] = OIOS_AGENTS.map((agent) => {
    const session = agentSessionMap.get(agent.id);

    if (!session) {
      return {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        model: agent.model,
        emoji: agent.emoji,
        color: agent.color,
        status: 'idle' as const,
      };
    }

    const isError = !!session.abortedLastRun;
    const isActive =
      !isError &&
      session.updatedAt != null &&
      Date.now() - session.updatedAt < 120_000;

    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      model: agent.model,
      emoji: agent.emoji,
      color: agent.color,
      status: isError ? ('error' as const) : isActive ? ('active' as const) : ('idle' as const),
      sessionKey: session.key ?? undefined,
      lastActivity: session.updatedAt
        ? new Date(session.updatedAt).toISOString()
        : undefined,
      tokensUsed: session.totalTokens ?? undefined,
    };
  });

  // Gateway status (safe even if health check errored)
  const gateway = {
    connected: 'connected' in healthResult ? healthResult.connected : false,
    latency: 'latency' in healthResult ? healthResult.latency : 0,
    ...(('reason' in healthResult && healthResult.reason) ? { reason: healthResult.reason } : {}),
  };

  // If sessions fetch failed, attach a warning but still return agent config
  const warnings: string[] = [];
  if (!sessionsResult.ok) {
    warnings.push(
      `sessions_list: ${sessionsResult.error?.message ?? 'unknown error'}`,
    );
  }

  return NextResponse.json({
    agents,
    recentActivity,
    gateway,
    timestamp,
    ...(warnings.length > 0 ? { warnings } : {}),
  });
}
