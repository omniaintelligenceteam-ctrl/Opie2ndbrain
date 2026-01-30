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

// GET /api/crons/[id]/history - Get cron run history
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const data = await gatewayFetch(`/cron/${id}/history`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch cron history:', error);
    
    // Mock response for development
    return NextResponse.json({
      history: [
        {
          id: `${id}-run-1`,
          cronId: id,
          startedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          completedAt: new Date(Date.now() - 1000 * 60 * 29).toISOString(),
          status: 'success',
          output: 'Task completed successfully.\n✓ Checked 15 items\n✓ Updated 3 records',
        },
        {
          id: `${id}-run-2`,
          cronId: id,
          startedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          completedAt: new Date(Date.now() - 1000 * 60 * 59).toISOString(),
          status: 'success',
          output: 'Task completed successfully.\n✓ Checked 12 items\n✓ No updates needed',
        },
        {
          id: `${id}-run-3`,
          cronId: id,
          startedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
          completedAt: new Date(Date.now() - 1000 * 60 * 89).toISOString(),
          status: 'failed',
          output: 'Error: Connection timeout\nRetry in next scheduled run',
        },
        {
          id: `${id}-run-4`,
          cronId: id,
          startedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          completedAt: new Date(Date.now() - 1000 * 60 * 119).toISOString(),
          status: 'success',
          output: 'Task completed successfully.',
        },
      ],
    });
  }
}
