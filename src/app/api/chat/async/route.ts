// Async chat handler for OpenClaw integration
// Uses sessions.spawn → webhook → poll pattern (like Feb 4 setup)

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:3457';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || 'opie-token-123';
const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/openclaw`
  : 'http://localhost:3000/api/webhook/openclaw';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionId = 'default', model = 'kimi' } = body;

    if (!message) {
      return NextResponse.json({ error: 'No message' }, { status: 400 });
    }

    // Generate a unique run ID
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    // Spawn a sub-agent to handle the request
    const spawnRes = await fetch(`${GATEWAY_URL}/v1/sessions/spawn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        agentId: 'teammate',
        task: `Respond to this user message. When done, POST the response to the webhook.

MESSAGE: ${message}

POST your response to: ${WEBHOOK_URL}
With JSON body: {"runId": "${runId}", "response": "your response text"}`,
        sessionKey: `agent:main:main`,
        deliverTo: null, // Don't deliver to channels
      }),
    });

    if (!spawnRes.ok) {
      const err = await spawnRes.text();
      console.error('Spawn failed:', err);
      return NextResponse.json({ error: 'Failed to spawn agent' }, { status: 502 });
    }

    const spawnData = await spawnRes.json();

    return NextResponse.json({
      runId,
      sessionKey: spawnData.sessionKey || `agent:teammate:${runId}`,
      status: 'started',
    });

  } catch (err) {
    console.error('Async chat error:', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
