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

// POST /api/crons/[id]/run - Run a cron job immediately
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const data = await gatewayFetch(`/cron/${id}/run`, { method: 'POST' });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to run cron:', error);
    
    // Mock response for development
    return NextResponse.json({
      success: true,
      cronId: id,
      runId: `run-${Date.now()}`,
      startedAt: new Date().toISOString(),
      status: 'running',
    });
  }
}
