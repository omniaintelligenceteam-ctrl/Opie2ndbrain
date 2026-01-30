import { NextResponse } from 'next/server';
import { gatewayFetch, IS_VERCEL, GATEWAY_URL } from '@/lib/gateway';

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
  avgRuntime?: string;
  description?: string;
}

export async function GET() {
  try {
    const data = await gatewayFetch<{ crons?: CronJob[] }>('/crons', {
      fallback: { crons: [] }
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch crons:', error);
    
    // Return empty state
    return NextResponse.json({
      crons: [],
      error: 'Gateway unavailable',
    });
  }
}

export async function POST(request: Request) {
  // Check if gateway is available
  const gatewayUnavailable = IS_VERCEL && GATEWAY_URL.includes('localhost');
  
  if (gatewayUnavailable) {
    return NextResponse.json({ 
      error: 'Cannot create crons in demo mode - gateway unavailable',
      demo: true 
    }, { status: 503 });
  }
  
  try {
    const body = await request.json();
    const data = await gatewayFetch('/crons', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to create cron:', error);
    return NextResponse.json({ error: 'Failed to create cron - gateway unavailable' }, { status: 503 });
  }
}
