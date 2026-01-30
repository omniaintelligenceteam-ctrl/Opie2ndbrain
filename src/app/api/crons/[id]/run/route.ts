import { NextResponse } from 'next/server';
import { gatewayFetch, IS_VERCEL, GATEWAY_URL } from '@/lib/gateway';

// POST /api/crons/[id]/run - Run a cron job immediately
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Block in Vercel without gateway
  if (IS_VERCEL && GATEWAY_URL.includes('localhost')) {
    return NextResponse.json({
      error: 'Cannot run crons in demo mode - gateway unavailable',
      demo: true
    }, { status: 503 });
  }
  
  try {
    const data = await gatewayFetch(`/cron/${id}/run`, { method: 'POST' });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to run cron:', error);
    return NextResponse.json({
      error: 'Failed to run cron - gateway unavailable',
    }, { status: 503 });
  }
}
