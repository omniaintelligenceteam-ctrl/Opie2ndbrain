import { NextResponse } from 'next/server';

// Force Node.js runtime for full env var access
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { invokeGatewayTool, IS_VERCEL, GATEWAY_URL } from '@/lib/gateway';

interface CronJob {
  id: string;
  name: string;
  schedule: string;
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
    // Use /tools/invoke to call the cron list action
    const data = await invokeGatewayTool('cron', { action: 'list', includeDisabled: true }) as any;
    
    // Transform the response to match expected format
    const jobs = data?.jobs || [];
    const crons: CronJob[] = jobs.map((job: any) => ({
      id: job.id || job.jobId,
      name: job.name || 'Unnamed Job',
      schedule: formatSchedule(job.schedule),
      enabled: job.enabled !== false,
      priority: job.priority || 'normal',
      lastRun: job.lastRun,
      lastStatus: job.lastStatus,
      nextRun: job.nextRun,
      runCount: job.runCount || 0,
      avgRuntime: job.avgRuntime,
      description: job.description,
    }));
    
    return NextResponse.json({ crons });
  } catch (error) {
    console.error('Failed to fetch crons:', error);
    
    // Return empty state
    return NextResponse.json({
      crons: [],
      error: 'Gateway unavailable',
    });
  }
}

function formatSchedule(schedule: any): string {
  if (!schedule) return 'Unknown';
  if (typeof schedule === 'string') return schedule;
  
  if (schedule.kind === 'cron') return schedule.expr || 'Cron';
  if (schedule.kind === 'every') {
    const ms = schedule.everyMs;
    if (ms >= 3600000) return `Every ${ms / 3600000}h`;
    if (ms >= 60000) return `Every ${ms / 60000}m`;
    return `Every ${ms / 1000}s`;
  }
  if (schedule.kind === 'at') return `Once at ${new Date(schedule.atMs).toLocaleString()}`;
  
  return JSON.stringify(schedule);
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
    const data = await invokeGatewayTool('cron', { action: 'add', job: body });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to create cron:', error);
    return NextResponse.json({ error: 'Failed to create cron - gateway unavailable' }, { status: 503 });
  }
}
