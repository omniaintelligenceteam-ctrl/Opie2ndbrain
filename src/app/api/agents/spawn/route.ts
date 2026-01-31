import { NextResponse } from 'next/server';

const GATEWAY_URL = process.env.MOLTBOT_GATEWAY_URL || 'http://localhost:18789';
const GATEWAY_TOKEN = process.env.MOLTBOT_GATEWAY_TOKEN || '';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agentType, task, label, model } = body;
    
    if (!agentType || !task) {
      return NextResponse.json({ error: 'Missing agentType or task' }, { status: 400 });
    }

    // Generate unique label if not provided
    const sessionLabel = label || `${agentType}-${Date.now()}`;
    
    // Use the /tools/invoke endpoint to call sessions_spawn directly
    // This is the proper gateway API for invoking tools
    const spawnResponse = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        tool: 'sessions_spawn',
        args: {
          task,
          label: sessionLabel,
          model: model || 'anthropic/claude-sonnet-4',
          thinking: 'low',
          runTimeoutSeconds: 300,
        },
      }),
    });

    const responseText = await spawnResponse.text();
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('Non-JSON response from gateway:', responseText.slice(0, 500));
      return NextResponse.json({
        error: 'Gateway returned non-JSON response',
        details: 'Gateway may not be properly configured',
        hint: 'Check MOLTBOT_GATEWAY_URL and MOLTBOT_GATEWAY_TOKEN',
      }, { status: 502 });
    }

    if (spawnResponse.ok && data.ok) {
      return NextResponse.json({
        success: true,
        sessionId: data.result?.sessionId || data.result?.childSessionKey || sessionLabel,
        label: sessionLabel,
        result: data.result,
        source: 'tools-invoke',
        timestamp: new Date().toISOString(),
      });
    }

    // Handle error response
    return NextResponse.json({
      error: 'Failed to spawn agent',
      details: data.error?.message || data.error || 'Unknown gateway error',
      gatewayStatus: spawnResponse.status,
      gatewayResponse: data,
    }, { status: spawnResponse.status >= 400 ? spawnResponse.status : 500 });

  } catch (error) {
    console.error('Spawn error:', error);
    return NextResponse.json({
      error: 'Failed to spawn agent',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
