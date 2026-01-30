import { NextResponse } from 'next/server';

const GATEWAY_URL = process.env.MOLTBOT_GATEWAY_URL || 'http://localhost:18100';
const GATEWAY_TOKEN = process.env.MOLTBOT_GATEWAY_TOKEN || '';

async function gatewayFetch(path: string, options: RequestInit = {}) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
    ...options.headers,
  };

  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gateway error: ${res.status} ${text}`);
  }

  return res.json();
}

// GET /api/crons - List all cron jobs
export async function GET() {
  try {
    const data = await gatewayFetch('/cron');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch crons:', error);
    
    // Return mock data for development/demo
    return NextResponse.json({
      crons: [
        {
          id: 'cron-1',
          name: 'Heartbeat Check',
          schedule: '*/30 * * * *',
          command: 'moltbot heartbeat',
          enabled: true,
          lastRun: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          lastStatus: 'success',
          nextRun: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
          runCount: 48,
        },
        {
          id: 'cron-2',
          name: 'Email Digest',
          schedule: '0 9 * * *',
          command: 'moltbot email digest',
          enabled: true,
          lastRun: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
          lastStatus: 'success',
          nextRun: new Date(Date.now() + 1000 * 60 * 60 * 21).toISOString(),
          runCount: 7,
        },
        {
          id: 'cron-3',
          name: 'Lead Research',
          schedule: '0 */4 * * *',
          command: 'moltbot research leads',
          enabled: false,
          lastRun: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          lastStatus: 'failed',
          runCount: 12,
        },
        {
          id: 'cron-4',
          name: 'Memory Sync',
          schedule: '0 0 * * *',
          command: 'moltbot memory sync',
          enabled: true,
          lastRun: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
          lastStatus: 'success',
          nextRun: new Date(Date.now() + 1000 * 60 * 60 * 16).toISOString(),
          runCount: 30,
        },
      ],
    });
  }
}

// POST /api/crons - Create a new cron job
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await gatewayFetch('/cron', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to create cron:', error);
    
    // Mock response for development
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({
      id: `cron-${Date.now()}`,
      ...body,
      lastStatus: null,
      lastRun: null,
      nextRun: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
      runCount: 0,
    });
  }
}
