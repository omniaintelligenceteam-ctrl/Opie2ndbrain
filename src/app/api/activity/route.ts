import { NextResponse } from 'next/server';

const GATEWAY_URL = process.env.OPIE_GATEWAY_URL || process.env.MOLTBOT_GATEWAY_URL || 'http://localhost:18100';
const GATEWAY_TOKEN = process.env.OPIE_GATEWAY_TOKEN || process.env.MOLTBOT_GATEWAY_TOKEN || '';

export interface ActivityItem {
  id: string;
  type: 'task_complete' | 'task_failed' | 'task_started' | 'reminder' | 'error' | 'info' | 'thinking';
  title: string;
  description?: string;
  timestamp: string;
  agentId?: string;
  agentEmoji?: string;
  metadata?: Record<string, unknown>;
}

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

// GET /api/activity - Get activity feed
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const since = searchParams.get('since'); // ISO timestamp

  try {
    // Try to fetch from gateway activity/events endpoint
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (since) params.set('since', since);

    const data = await gatewayFetch(`/v1/activity?${params.toString()}`);
    
    return NextResponse.json({
      activities: data.activities || data.events || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch activity:', error);
    
    // Return demo activity data for development
    const now = Date.now();
    const demoActivities: ActivityItem[] = [
      {
        id: 'act-1',
        type: 'task_complete',
        title: 'Research task completed',
        description: 'Gathered 12 competitor insights from web search',
        timestamp: new Date(now - 1000 * 60 * 2).toISOString(),
        agentId: 'research',
        agentEmoji: '🔍',
      },
      {
        id: 'act-2',
        type: 'task_started',
        title: 'Code generation started',
        description: 'Building API integration module',
        timestamp: new Date(now - 1000 * 60 * 5).toISOString(),
        agentId: 'code',
        agentEmoji: '💻',
      },
      {
        id: 'act-3',
        type: 'reminder',
        title: 'Daily standup reminder',
        description: 'Team meeting in 30 minutes',
        timestamp: new Date(now - 1000 * 60 * 15).toISOString(),
      },
      {
        id: 'act-4',
        type: 'task_failed',
        title: 'Email send failed',
        description: 'Rate limit exceeded - will retry in 5 minutes',
        timestamp: new Date(now - 1000 * 60 * 20).toISOString(),
        agentId: 'outreach',
        agentEmoji: '📧',
      },
      {
        id: 'act-5',
        type: 'info',
        title: 'Memory sync completed',
        description: 'Synced 47 memory entries to long-term storage',
        timestamp: new Date(now - 1000 * 60 * 30).toISOString(),
      },
      {
        id: 'act-6',
        type: 'task_complete',
        title: 'Blog post draft ready',
        description: '1,200 words on LED lighting benefits',
        timestamp: new Date(now - 1000 * 60 * 45).toISOString(),
        agentId: 'content',
        agentEmoji: '✍️',
      },
      {
        id: 'act-7',
        type: 'task_started',
        title: 'Data analysis started',
        description: 'Processing Q4 revenue data',
        timestamp: new Date(now - 1000 * 60 * 60).toISOString(),
        agentId: 'analyst',
        agentEmoji: '📊',
      },
      {
        id: 'act-8',
        type: 'task_complete',
        title: 'Lead qualification done',
        description: 'Qualified 8/15 new leads as high-priority',
        timestamp: new Date(now - 1000 * 60 * 90).toISOString(),
        agentId: 'sales',
        agentEmoji: '💰',
      },
    ];

    return NextResponse.json({
      activities: demoActivities.slice(0, limit),
      timestamp: new Date().toISOString(),
      demo: true,
    });
  }
}

// POST /api/activity - Add activity item (for internal use)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const activity: ActivityItem = {
      id: `act-${Date.now()}`,
      type: body.type || 'info',
      title: body.title,
      description: body.description,
      timestamp: new Date().toISOString(),
      agentId: body.agentId,
      agentEmoji: body.agentEmoji,
      metadata: body.metadata,
    };

    // Try to post to gateway
    try {
      await gatewayFetch('/v1/activity', {
        method: 'POST',
        body: JSON.stringify(activity),
      });
    } catch {
      // Gateway might not support activity posting, that's ok
    }

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('Failed to create activity:', error);
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
  }
}
