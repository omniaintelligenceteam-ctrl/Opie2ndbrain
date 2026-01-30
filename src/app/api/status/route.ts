import { NextResponse } from 'next/server';
import { gatewayFetch, gatewayHealth, GATEWAY_URL, IS_VERCEL } from '@/lib/gateway';

const SERVER_START = Date.now();

interface SystemStatus {
  opie: {
    status: 'online' | 'thinking' | 'speaking' | 'offline' | 'demo';
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
    const data = await gatewayFetch<{ sessions?: Array<{ status?: string }> }>('/sessions', {
      fallback: { sessions: [] }
    });
    const sessions = data.sessions || [];
    const active = sessions.filter((s) => s.status === 'running').length;
    const idle = sessions.filter((s) => s.status === 'idle' || s.status === 'complete').length;
    return { active, idle, total: sessions.length };
  } catch {
    return { active: 0, idle: 0, total: 0 };
  }
}

async function getGatewayStatus(): Promise<{ 
  model?: string; 
  contextUsed?: number; 
  contextTotal?: number; 
  sessions?: number;
  isProcessing?: boolean;
}> {
  try {
    // Try multiple endpoints for comprehensive status
    const [statusData, sessionsData] = await Promise.allSettled([
      gatewayFetch<{ 
        model?: string;
        context_window?: number;
        context_used?: number;
        processing?: boolean;
        status?: string;
      }>('/api/status'),
      gatewayFetch<{ 
        sessions?: Array<{ status?: string; model?: string }>;
        active_count?: number;
      }>('/api/sessions')
    ]);

    let model = undefined;
    let contextUsed = undefined;
    let contextTotal = undefined;
    let sessions = 0;
    let isProcessing = false;

    // Extract data from status endpoint
    if (statusData.status === 'fulfilled') {
      const data = statusData.value;
      model = data.model || model;
      contextUsed = data.context_used || contextUsed;
      contextTotal = data.context_window || contextTotal;
      isProcessing = data.processing || data.status === 'processing' || isProcessing;
    }

    // Extract data from sessions endpoint
    if (sessionsData.status === 'fulfilled') {
      const data = sessionsData.value;
      sessions = data.active_count || data.sessions?.length || sessions;
      
      // Check if any session is processing
      if (data.sessions) {
        isProcessing = data.sessions.some(s => 
          s.status === 'running' || s.status === 'processing'
        ) || isProcessing;
        
        // Use model from active session if available
        const activeSession = data.sessions.find(s => s.status === 'running' || s.model);
        if (activeSession?.model) {
          model = activeSession.model;
        }
      }
    }

    return {
      model: model || 'claude-sonnet-3.5',
      contextUsed,
      contextTotal,
      sessions,
      isProcessing,
    };
  } catch (error) {
    console.log('Gateway status fetch error:', error);
    return {
      model: 'claude-sonnet-3.5',
    };
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

  // Determine dynamic status based on activity
  let opieStatus: 'online' | 'thinking' | 'speaking' | 'offline' | 'demo' = 'offline';
  const isDemo = IS_VERCEL && GATEWAY_URL.includes('localhost');
  
  if (isDemo) {
    opieStatus = 'demo'; // Demo mode when gateway unavailable in production
  } else if (gatewayCheck.connected) {
    if (gatewayStatus.isProcessing || agentStats.active > 0) {
      opieStatus = 'thinking'; // Show as thinking when processing or agents active
    } else {
      opieStatus = 'online'; // Idle but available
    }
  }

  const status: SystemStatus = {
    opie: {
      status: opieStatus,
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
