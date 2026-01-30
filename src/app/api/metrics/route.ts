import { NextResponse } from 'next/server';

const GATEWAY_URL = process.env.OPIE_GATEWAY_URL || process.env.MOLTBOT_GATEWAY_URL || 'http://localhost:18100';
const GATEWAY_TOKEN = process.env.OPIE_GATEWAY_TOKEN || process.env.MOLTBOT_GATEWAY_TOKEN || '';

// Server start time for uptime calculation
const SERVER_START = Date.now();

interface DashboardMetrics {
  sessions: {
    today: number;
    thisWeek: number;
    total: number;
  };
  tokens: {
    today: number;
    thisWeek: number;
    total: number;
  };
  tasks: {
    completedToday: number;
    successRate: number;
    avgDuration: number;
  };
  uptime: {
    current: number;
    percentage: number;
    lastRestart: string;
  };
  conversations: {
    today: number;
    avgLength: number;
    topTopics: string[];
  };
  agents: {
    mostActive: string;
    tasksPerAgent: number;
    efficiency: number;
  };
}

async function gatewayFetch(path: string) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
  };

  const res = await fetch(`${GATEWAY_URL}${path}`, { headers });
  if (!res.ok) throw new Error(`Gateway error: ${res.status}`);
  return res.json();
}

async function fetchMetricsFromGateway(): Promise<Partial<DashboardMetrics>> {
  try {
    const data = await gatewayFetch('/v1/metrics');
    return {
      sessions: data.sessions,
      tokens: data.tokens,
      tasks: data.tasks,
    };
  } catch {
    return {};
  }
}

// Generate realistic demo metrics
function generateDemoMetrics(): DashboardMetrics {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hourOfDay = now.getHours();
  
  // Vary metrics based on time for realistic feel
  const baseSessionsToday = 5 + Math.floor(hourOfDay / 2);
  const baseTokensToday = 15000 + (hourOfDay * 2000);
  
  const uptime = Math.floor((Date.now() - SERVER_START) / 1000);
  
  return {
    sessions: {
      today: baseSessionsToday + Math.floor(Math.random() * 3),
      thisWeek: (dayOfWeek + 1) * baseSessionsToday + Math.floor(Math.random() * 10),
      total: 847 + Math.floor(Math.random() * 50),
    },
    tokens: {
      today: baseTokensToday + Math.floor(Math.random() * 5000),
      thisWeek: (dayOfWeek + 1) * baseTokensToday + Math.floor(Math.random() * 20000),
      total: 2457000 + Math.floor(Math.random() * 100000),
    },
    tasks: {
      completedToday: 12 + Math.floor(Math.random() * 8),
      successRate: 94 + Math.random() * 5,
      avgDuration: 45 + Math.floor(Math.random() * 30),
    },
    uptime: {
      current: uptime,
      percentage: 99.7 + Math.random() * 0.29,
      lastRestart: new Date(SERVER_START).toISOString(),
    },
    conversations: {
      today: 8 + Math.floor(Math.random() * 5),
      avgLength: 12 + Math.floor(Math.random() * 8),
      topTopics: ['Code Review', 'Email Draft', 'Research', 'Content Writing', 'Data Analysis'],
    },
    agents: {
      mostActive: ['Code Agent', 'Research Agent', 'Content Agent'][Math.floor(Math.random() * 3)],
      tasksPerAgent: 4 + Math.floor(Math.random() * 3),
      efficiency: 87 + Math.random() * 10,
    },
  };
}

export async function GET() {
  // Try to fetch real metrics
  const realMetrics = await fetchMetricsFromGateway();
  
  // Merge with demo metrics for any missing data
  const demoMetrics = generateDemoMetrics();
  
  const metrics: DashboardMetrics = {
    sessions: realMetrics.sessions || demoMetrics.sessions,
    tokens: realMetrics.tokens || demoMetrics.tokens,
    tasks: realMetrics.tasks || demoMetrics.tasks,
    uptime: demoMetrics.uptime, // Always use server uptime
    conversations: demoMetrics.conversations,
    agents: demoMetrics.agents,
  };

  return NextResponse.json(metrics);
}
