import { NextRequest, NextResponse } from 'next/server';
import { GATEWAY_URL, GATEWAY_TOKEN, IS_VERCEL } from '@/lib/gateway';
import {
  ContextWindowState,
  ContextSegment,
  getWarningLevel,
  DEMO_SEGMENTS,
} from '@/lib/contextTypes';

// In-memory store for forgotten segments (in production, use persistent storage)
const forgottenSegments = new Set<string>();

export async function GET() {
  // Check if gateway is available
  const gatewayUnavailable = IS_VERCEL && GATEWAY_URL.includes('localhost');

  if (gatewayUnavailable || !GATEWAY_TOKEN) {
    // Return demo data
    const segments = DEMO_SEGMENTS.filter(s => !forgottenSegments.has(s.id));
    const used = segments.reduce((sum, s) => sum + s.tokenCount, 0);
    const total = 128000;
    const percentage = (used / total) * 100;

    const response: ContextWindowState = {
      used,
      total,
      percentage,
      segments: segments.map(s => ({
        ...s,
        percentage: used > 0 ? (s.tokenCount / used) * 100 : 0,
      })),
      lastUpdated: new Date().toISOString(),
      warningLevel: getWarningLevel(percentage),
    };

    return NextResponse.json(response);
  }

  try {
    // Try to fetch real context data from gateway
    const res = await fetch(`${GATEWAY_URL}/api/context`, {
      headers: {
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'x-moltbot-agent-id': 'main',
      },
    });

    if (res.ok) {
      const data = await res.json();

      // Transform gateway response to our format
      const segments: ContextSegment[] = [];

      if (data.system_prompt_tokens) {
        segments.push({
          id: 'system-prompt',
          type: 'system_prompt',
          label: 'System Prompt',
          tokenCount: data.system_prompt_tokens,
          percentage: 0,
          canForget: false,
        });
      }

      if (data.memory_tokens) {
        segments.push({
          id: 'memory',
          type: 'memory',
          label: 'Memory Context',
          tokenCount: data.memory_tokens,
          percentage: 0,
          canForget: true,
          content: data.memory_preview,
        });
      }

      if (data.conversation_tokens) {
        segments.push({
          id: 'conversation',
          type: 'conversation',
          label: 'Conversation History',
          tokenCount: data.conversation_tokens,
          percentage: 0,
          canForget: true,
        });
      }

      if (data.tool_tokens) {
        segments.push({
          id: 'tools',
          type: 'tool_calls',
          label: 'Tool Results',
          tokenCount: data.tool_tokens,
          percentage: 0,
          canForget: true,
        });
      }

      // Filter out forgotten segments
      const filteredSegments = segments.filter(s => !forgottenSegments.has(s.id));
      const used = filteredSegments.reduce((sum, s) => sum + s.tokenCount, 0);
      const total = data.total_context || 128000;
      const percentage = (used / total) * 100;

      const response: ContextWindowState = {
        used,
        total,
        percentage,
        segments: filteredSegments.map(s => ({
          ...s,
          percentage: used > 0 ? (s.tokenCount / used) * 100 : 0,
        })),
        lastUpdated: new Date().toISOString(),
        warningLevel: getWarningLevel(percentage),
      };

      return NextResponse.json(response);
    }

    // Fallback to demo data
    return returnDemoData();
  } catch (error) {
    console.error('Context fetch error:', error);
    return returnDemoData();
  }
}

function returnDemoData() {
  const segments = DEMO_SEGMENTS.filter(s => !forgottenSegments.has(s.id));
  const used = segments.reduce((sum, s) => sum + s.tokenCount, 0);
  const total = 128000;
  const percentage = (used / total) * 100;

  const response: ContextWindowState = {
    used,
    total,
    percentage,
    segments: segments.map(s => ({
      ...s,
      percentage: used > 0 ? (s.tokenCount / used) * 100 : 0,
    })),
    lastUpdated: new Date().toISOString(),
    warningLevel: getWarningLevel(percentage),
  };

  return NextResponse.json(response);
}

export async function POST(req: NextRequest) {
  const { action, segmentId } = await req.json();

  if (action === 'forget' && segmentId) {
    forgottenSegments.add(segmentId);

    // If gateway is available, try to send forget command
    const gatewayUnavailable = IS_VERCEL && GATEWAY_URL.includes('localhost');

    if (!gatewayUnavailable && GATEWAY_TOKEN) {
      try {
        await fetch(`${GATEWAY_URL}/api/context/forget`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GATEWAY_TOKEN}`,
          },
          body: JSON.stringify({ segmentId }),
        });
      } catch (e) {
        console.error('Failed to send forget to gateway:', e);
      }
    }

    return NextResponse.json({ success: true, forgotten: segmentId });
  }

  if (action === 'clear') {
    forgottenSegments.clear();
    return NextResponse.json({ success: true, cleared: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
