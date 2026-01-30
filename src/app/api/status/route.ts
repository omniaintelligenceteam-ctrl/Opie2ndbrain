import { NextResponse } from 'next/server';
import { gatewayFetch, gatewayHealth, GATEWAY_URL } from '@/lib/gateway';

const SERVER_START = Date.now();

interface SystemStatus {
  opie: {
    status: 'online' | 'thinking' | 'speaking' | 'offline';
    lastActivity: string;
    uptime: number;
  };
  gateway: {
    connected: boolean;
    latency: number;
    lastPing: string;
    url: string;
  };
  voice: {
    available: boolean;
    status: 'ready' | 'speaking' | 'listening' | 'unavailable';
  };
  api: {
    healthy: boolean;
    responseTime: number;
  };
  agents: {
    active: number;
    idle: number;
    total: number;
  };
  tasks: {
    running: number;
    completed: number;
    failed: number;
    pending: number;
  };
  model?: string;
  context?: {
    used: number;
    total: number;
  };
}

async function getAgentSessions(): Promise<{ active: number; idle: number; total: number }> {
  try {
    const data = await gatewayFetch<{ sessions?: Array<{ status?: string }> }>('/sessions');
    const sessions = data.sessions || [];
    const active = sessions.filter((s) => s.status === 'running').length;
    const idle = sessions.filter((s) => s.status === 'idle' || s.status === 'complete').length;
    return { active, idle, total: sessions.length };
  } catch {
    return { active: 0, idle: 0, total: 0 };
  }
}

async function getGatewayStatus(): Promise<{ model?: string; contextUsed?: number; contextTotal?: number }> {
  try {
    const data = await gatewayFetch<{ 
      model?: string;
      context_window?: number;
      context_used?: number;
    }>('/status');
    return {
      model: data.model,
      contextUsed: data.context_used,
      contextTotal: data.context_window,
    };
  } catch {
    return {};
  }
}

export async function GET() {
  const requestStart = Date.now();

  const [gatewayCheck, agentStats, gatewayStatus] = await Promise.all([
    gatewayHealth(),
    getAgentSessions(),
    getGatewayStatus(),
  ]);

  const responseTime = Date.now() - requestStart;
  const uptime = Math.floor((Date.now() - SERVER_START) / 1000);

  const status: SystemStatus = {
    opie: {
      status: gatewayCheck.connected ? 'online' : 'offline',
      lastActivity: new Date().toISOString(),
      uptime,
    },
    gateway: {
      connected: gatewayCheck.connected,
      latency: gatewayCheck.latency,
      lastPing: new Date().toISOString(),
      url: GATEWAY_URL,
    },
    voice: {
      available: true,
      status: 'ready',
    },
    api: {
      healthy: true,
      responseTime,
    },
    agents: agentStats,
    tasks: {
      running: agentStats.active,
      completed: 0,
      failed: 0,
      pending: 0,
    },
    model: gatewayStatus.model,
    context: gatewayStatus.contextUsed && gatewayStatus.contextTotal ? {
      used: gatewayStatus.contextUsed,
      total: gatewayStatus.contextTotal,
    } : undefined,
  };

  return NextResponse.json(status, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
