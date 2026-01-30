import { NextResponse } from 'next/server';

const GATEWAY_URL = process.env.OPIE_GATEWAY_URL || process.env.MOLTBOT_GATEWAY_URL || 'http://localhost:18100';
const GATEWAY_TOKEN = process.env.OPIE_GATEWAY_TOKEN || process.env.MOLTBOT_GATEWAY_TOKEN || '';

// Track server start time for uptime
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
}

async function checkGateway(): Promise<{ connected: boolean; latency: number }> {
  const start = Date.now();
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
    };
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(`${GATEWAY_URL}/v1/health`, {
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const latency = Date.now() - start;
    
    return { connected: res.ok, latency };
  } catch (error) {
    return { connected: false, latency: Date.now() - start };
  }
}

async function getAgentSessions(): Promise<{ active: number; idle: number; total: number }> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
    };
    
    const res = await fetch(`${GATEWAY_URL}/v1/sessions`, { headers });
    if (!res.ok) throw new Error('Failed to fetch sessions');
    
    const data = await res.json();
    const sessions = data.sessions || [];
    
    const active = sessions.filter((s: any) => s.status === 'running').length;
    const idle = sessions.filter((s: any) => s.status === 'idle' || s.status === 'complete').length;
    
    return { active, idle, total: sessions.length };
  } catch {
    // Demo data
    return { active: 2, idle: 3, total: 5 };
  }
}

async function getTaskStats(): Promise<{ running: number; completed: number; failed: number; pending: number }> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
    };
    
    const res = await fetch(`${GATEWAY_URL}/v1/tasks`, { headers });
    if (!res.ok) throw new Error('Failed to fetch tasks');
    
    const data = await res.json();
    const tasks = data.tasks || [];
    
    return {
      running: tasks.filter((t: any) => t.status === 'running').length,
      completed: tasks.filter((t: any) => t.status === 'complete' || t.status === 'completed').length,
      failed: tasks.filter((t: any) => t.status === 'failed' || t.status === 'error').length,
      pending: tasks.filter((t: any) => t.status === 'pending' || t.status === 'queued').length,
    };
  } catch {
    // Demo data
    return { running: 3, completed: 47, failed: 2, pending: 5 };
  }
}

export async function GET() {
  const requestStart = Date.now();
  
  // Run checks in parallel
  const [gatewayCheck, agentStats, taskStats] = await Promise.all([
    checkGateway(),
    getAgentSessions(),
    getTaskStats(),
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
    },
    voice: {
      available: true, // Assume TTS is available
      status: 'ready',
    },
    api: {
      healthy: true,
      responseTime,
    },
    agents: agentStats,
    tasks: taskStats,
  };

  return NextResponse.json(status);
}

// HEAD request for quick health check
export async function HEAD() {
  return new Response(null, { status: 200 });
}
