import { NextResponse } from 'next/server';

const GATEWAY_URL = process.env.OPIE_GATEWAY_URL || process.env.MOLTBOT_GATEWAY_URL || 'http://localhost:18100';
const GATEWAY_TOKEN = process.env.OPIE_GATEWAY_TOKEN || process.env.MOLTBOT_GATEWAY_TOKEN || '';

interface RecentMemory {
  id: string;
  title: string;
  type: 'file' | 'conversation' | 'note' | 'task';
  path?: string;
  timestamp: string;
  preview?: string;
}

async function fetchFromGateway(): Promise<RecentMemory[]> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
    };

    const res = await fetch(`${GATEWAY_URL}/v1/memory/recent`, { headers });
    if (!res.ok) throw new Error('Gateway error');
    
    const data = await res.json();
    return data.memories || [];
  } catch {
    return [];
  }
}

// Generate demo recent memories
function generateDemoMemories(limit: number): RecentMemory[] {
  const now = Date.now();
  
  const demoMemories: RecentMemory[] = [
    {
      id: 'mem-1',
      title: 'MEMORY.md',
      type: 'file',
      path: 'memory/MEMORY.md',
      timestamp: new Date(now - 1000 * 60 * 15).toISOString(),
      preview: 'Long-term memory and knowledge base updates...',
    },
    {
      id: 'mem-2',
      title: 'Dashboard planning conversation',
      type: 'conversation',
      timestamp: new Date(now - 1000 * 60 * 45).toISOString(),
      preview: 'Discussion about real-time dashboard features...',
    },
    {
      id: 'mem-3',
      title: 'Today\'s Notes',
      type: 'file',
      path: `memory/${new Date().toISOString().split('T')[0]}.md`,
      timestamp: new Date(now - 1000 * 60 * 60).toISOString(),
      preview: 'Session notes and active work tracking...',
    },
    {
      id: 'mem-4',
      title: 'API Integration Notes',
      type: 'note',
      timestamp: new Date(now - 1000 * 60 * 90).toISOString(),
      preview: 'Gateway API endpoints and authentication...',
    },
    {
      id: 'mem-5',
      title: 'Build dashboard components',
      type: 'task',
      timestamp: new Date(now - 1000 * 60 * 120).toISOString(),
      preview: 'Create StatusIndicators, SmartDashboard, NotificationCenter...',
    },
    {
      id: 'mem-6',
      title: 'AGENTS.md',
      type: 'file',
      path: 'AGENTS.md',
      timestamp: new Date(now - 1000 * 60 * 180).toISOString(),
      preview: 'Agent workspace configuration and rules...',
    },
    {
      id: 'mem-7',
      title: 'Morning check-in',
      type: 'conversation',
      timestamp: new Date(now - 1000 * 60 * 240).toISOString(),
      preview: 'Daily standup and priority review...',
    },
    {
      id: 'mem-8',
      title: 'USER.md',
      type: 'file',
      path: 'USER.md',
      timestamp: new Date(now - 1000 * 60 * 300).toISOString(),
      preview: 'User preferences and context...',
    },
    {
      id: 'mem-9',
      title: 'Lead research results',
      type: 'task',
      timestamp: new Date(now - 1000 * 60 * 360).toISOString(),
      preview: 'Compiled 15 qualified leads from Atlanta area...',
    },
    {
      id: 'mem-10',
      title: 'Email draft review',
      type: 'conversation',
      timestamp: new Date(now - 1000 * 60 * 420).toISOString(),
      preview: 'Reviewed and approved follow-up email template...',
    },
  ];

  return demoMemories.slice(0, limit);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const type = searchParams.get('type'); // file, conversation, note, task

  // Try to fetch from gateway first
  let memories = await fetchFromGateway();
  
  // Fall back to demo data if no real data
  if (memories.length === 0) {
    memories = generateDemoMemories(limit);
  }

  // Filter by type if specified
  if (type) {
    memories = memories.filter(m => m.type === type);
  }

  return NextResponse.json({
    memories: memories.slice(0, limit),
    total: memories.length,
  });
}
