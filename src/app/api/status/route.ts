import { NextResponse } from 'next/server';

// Force Node.js runtime for full env var access
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { gatewayFetch, gatewayHealth, invokeGatewayTool, GATEWAY_URL, GATEWAY_TOKEN, IS_VERCEL } from '@/lib/gateway';

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
  security: {
    secure: boolean;
    status: string;
    warnings: number;
    sslValid: boolean;
    authEnabled: boolean;
    lastScan: string;
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

async function getSecurityStatus(gatewayCheck: { connected: boolean }): Promise<{
  secure: boolean;
  status: string;
  warnings: number;
  sslValid: boolean;
  authEnabled: boolean;
  lastScan: string;
  checks?: {
    gateway: boolean;
    authToken: boolean;
    httpsOnly: boolean;
    noExposedSecrets: boolean;
  };
}> {
  const warnings: string[] = [];
  const checks = {
    gateway: gatewayCheck.connected,
    authToken: !!GATEWAY_TOKEN && GATEWAY_TOKEN.length > 20,
    httpsOnly: GATEWAY_URL.startsWith('https://') || GATEWAY_URL.includes('localhost'),
    noExposedSecrets: true, // Assume true unless we detect otherwise
  };

  // Check gateway connection
  if (!gatewayCheck.connected) {
    warnings.push('Gateway disconnected');
  }

  // Check auth token is configured
  if (!GATEWAY_TOKEN || GATEWAY_TOKEN.length < 20) {
    warnings.push('Weak or missing auth token');
    checks.authToken = false;
  }

  // Check HTTPS
  if (!GATEWAY_URL.startsWith('https://') && !GATEWAY_URL.includes('localhost')) {
    warnings.push('Gateway not using HTTPS');
    checks.httpsOnly = false;
  }

  // Try to get gateway config to check for security issues
  try {
    const configResult = await invokeGatewayTool<{ config?: { gateway?: { auth?: { mode?: string } } } }>('gateway', { action: 'config.get' });
    if (configResult.ok && configResult.result) {
      // Check if auth is properly configured
      const config = configResult.result as { config?: { gateway?: { auth?: { mode?: string } } } };
      const authMode = config?.config?.gateway?.auth?.mode;
      if (!authMode || authMode === 'none') {
        warnings.push('Gateway auth disabled');
        checks.authToken = false;
      }
    }
  } catch {
    // Ignore config check errors
  }

  const secure = warnings.length === 0;
  const status = secure 
    ? 'All systems secure' 
    : warnings.length === 1 
      ? warnings[0] 
      : `${warnings.length} issues detected`;

  return {
    secure,
    status,
    warnings: warnings.length,
    sslValid: checks.httpsOnly,
    authEnabled: checks.authToken,
    lastScan: new Date().toISOString(),
    checks,
  };
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
    security: await getSecurityStatus(gatewayCheck),
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
