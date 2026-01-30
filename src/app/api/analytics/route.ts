import { NextRequest, NextResponse } from 'next/server';

// In-memory store for server-side analytics (would use a database in production)
let analyticsStore: AnalyticsData = {
  actions: {},
  messages: [],
  dailyStats: {},
  agentUsage: {},
  sessions: [],
};

interface DailyStats {
  messages: number;
  tokens: number;
  tasks: number;
  cost?: number;
}

interface AnalyticsData {
  actions: Record<string, number>;
  messages: { timestamp: number; tokens: number; sessionId?: string }[];
  dailyStats: Record<string, DailyStats>;
  agentUsage: Record<string, number>;
  sessions: { id: string; startTime: number; messageCount: number }[];
}

interface TrackEventPayload {
  type: 'message' | 'action' | 'task' | 'agent';
  actionId?: string;
  tokens?: number;
  agentId?: string;
  sessionId?: string;
}

// GET - Retrieve analytics data
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get('days') || '7');
  
  // Filter daily stats to requested days
  const now = new Date();
  const filteredStats: Record<string, DailyStats> = {};
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    filteredStats[dateStr] = analyticsStore.dailyStats[dateStr] || { messages: 0, tokens: 0, tasks: 0 };
  }

  // Calculate totals
  const totals = Object.values(filteredStats).reduce(
    (acc, day) => ({
      messages: acc.messages + day.messages,
      tokens: acc.tokens + day.tokens,
      tasks: acc.tasks + day.tasks,
    }),
    { messages: 0, tokens: 0, tasks: 0 }
  );

  // Get top actions
  const topActions = Object.entries(analyticsStore.actions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({ id, count }));

  // Get agent usage
  const agentUsage = Object.entries(analyticsStore.agentUsage)
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => ({ id, count }));

  return NextResponse.json({
    dailyStats: filteredStats,
    totals,
    topActions,
    agentUsage,
    activeSessions: analyticsStore.sessions.length,
  });
}

// POST - Track analytics event
export async function POST(req: NextRequest) {
  try {
    const payload: TrackEventPayload = await req.json();
    const today = new Date().toISOString().split('T')[0];

    // Initialize today's stats if needed
    if (!analyticsStore.dailyStats[today]) {
      analyticsStore.dailyStats[today] = { messages: 0, tokens: 0, tasks: 0 };
    }

    switch (payload.type) {
      case 'message':
        analyticsStore.dailyStats[today].messages += 1;
        if (payload.tokens) {
          analyticsStore.dailyStats[today].tokens += payload.tokens;
          analyticsStore.messages.push({
            timestamp: Date.now(),
            tokens: payload.tokens,
            sessionId: payload.sessionId,
          });
        }
        break;

      case 'action':
        if (payload.actionId) {
          analyticsStore.actions[payload.actionId] = (analyticsStore.actions[payload.actionId] || 0) + 1;
        }
        break;

      case 'task':
        analyticsStore.dailyStats[today].tasks += 1;
        break;

      case 'agent':
        if (payload.agentId) {
          analyticsStore.agentUsage[payload.agentId] = (analyticsStore.agentUsage[payload.agentId] || 0) + 1;
        }
        break;
    }

    // Cleanup old messages (keep last 1000)
    if (analyticsStore.messages.length > 1000) {
      analyticsStore.messages = analyticsStore.messages.slice(-1000);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
  }
}

// DELETE - Reset analytics (admin only)
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const confirm = searchParams.get('confirm');

  if (confirm !== 'yes') {
    return NextResponse.json({ error: 'Please confirm reset with ?confirm=yes' }, { status: 400 });
  }

  analyticsStore = {
    actions: {},
    messages: [],
    dailyStats: {},
    agentUsage: {},
    sessions: [],
  };

  return NextResponse.json({ success: true, message: 'Analytics data reset' });
}
