import { NextResponse } from 'next/server';
import { gatewayFetch } from '@/lib/gateway';

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
    const data = await gatewayFetch<{ crons?: CronJob[] }>('/crons');
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
  try {
    const body = await request.json();
    const data = await gatewayFetch('/crons', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to create cron:', error);
    return NextResponse.json({ error: 'Failed to create cron' }, { status: 500 });
  }
}
