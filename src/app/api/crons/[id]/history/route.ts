import { NextResponse } from 'next/server';
import { gatewayFetch, IS_VERCEL, GATEWAY_URL } from '@/lib/gateway';

// GET /api/crons/[id]/history - Get cron run history
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Return empty history in Vercel without gateway
  if (IS_VERCEL && GATEWAY_URL.includes('localhost')) {
    return NextResponse.json({
      history: [],
      error: 'Cron history unavailable in demo mode',
      demo: true
    });
  }
  
  try {
    const data = await gatewayFetch(`/cron/${id}/history`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch cron history:', error);
    return NextResponse.json({
      history: [],
      error: 'Failed to fetch cron history - gateway unavailable',
    });
  }
}
