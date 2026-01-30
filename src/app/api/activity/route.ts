import { NextResponse } from 'next/server';
import { gatewayFetch } from '@/lib/gateway';

interface ActivityItem {
  id: string;
  type: 'message' | 'task' | 'agent' | 'cron' | 'system';
  title: string;
  description?: string;
  timestamp: string;
  status?: 'success' | 'error' | 'pending' | 'running';
  metadata?: Record<string, unknown>;
}

export async function GET() {
  try {
    // Try to fetch activity from gateway
    const data = await gatewayFetch<{ activity?: ActivityItem[] }>('/activity');
    
    return NextResponse.json({
      activity: data.activity || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch activity:', error);
    
    // Return empty state
    return NextResponse.json({
      activity: [],
      timestamp: new Date().toISOString(),
      error: 'Gateway unavailable',
    });
  }
}
