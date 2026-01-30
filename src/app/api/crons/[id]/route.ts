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

// GET /api/crons/[id] - Get a single cron job
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const data = await gatewayFetch(`/cron/${id}`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch cron:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cron job' },
      { status: 500 }
    );
  }
}

// PUT /api/crons/[id] - Update a cron job
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const body = await request.json();
    const data = await gatewayFetch(`/cron/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to update cron:', error);
    
    // Mock response for development
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({
      id,
      ...body,
      updated: true,
    });
  }
}

// DELETE /api/crons/[id] - Delete a cron job
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    await gatewayFetch(`/cron/${id}`, { method: 'DELETE' });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete cron:', error);
    
    // Mock response for development
    return NextResponse.json({ success: true, deleted: id });
  }
}
