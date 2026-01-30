import { NextResponse } from 'next/server';
import { gatewayFetch, IS_VERCEL, GATEWAY_URL } from '@/lib/gateway';

// GET /api/crons/[id] - Get a single cron job
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Return demo response in Vercel without gateway
  if (IS_VERCEL && GATEWAY_URL.includes('localhost')) {
    return NextResponse.json({
      cron: null,
      error: 'Cron details unavailable in demo mode',
      demo: true
    });
  }
  
  try {
    const data = await gatewayFetch(`/cron/${id}`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch cron:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cron job', demo: false },
      { status: 503 }
    );
  }
}

// PUT /api/crons/[id] - Update a cron job
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Block in Vercel without gateway
  if (IS_VERCEL && GATEWAY_URL.includes('localhost')) {
    return NextResponse.json({
      error: 'Cannot update crons in demo mode',
      demo: true
    }, { status: 503 });
  }
  
  try {
    const body = await request.json();
    const data = await gatewayFetch(`/cron/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to update cron:', error);
    return NextResponse.json({
      error: 'Failed to update cron - gateway unavailable',
    }, { status: 503 });
  }
}

// DELETE /api/crons/[id] - Delete a cron job
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Block in Vercel without gateway
  if (IS_VERCEL && GATEWAY_URL.includes('localhost')) {
    return NextResponse.json({
      error: 'Cannot delete crons in demo mode',
      demo: true
    }, { status: 503 });
  }
  
  try {
    await gatewayFetch(`/cron/${id}`, { method: 'DELETE' });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete cron:', error);
    return NextResponse.json({
      error: 'Failed to delete cron - gateway unavailable',
    }, { status: 503 });
  }
}
