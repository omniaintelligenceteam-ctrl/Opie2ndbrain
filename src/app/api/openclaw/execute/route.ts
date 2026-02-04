export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const API_KEY = process.env.DASHBOARD_API_KEY || process.env.INTERNAL_API_KEY;

export async function POST(req: Request) {
  try {
    // Verify API key
    const authHeader = req.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '') || req.headers.get('x-api-key');
    
    if (API_KEY && apiKey !== API_KEY) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { message, chatHistory, memoryContext } = await req.json();
    
    // Build full context for the task
    const fullTask = `Task from Opie2ndbrain (DO IT mode):

User message: ${message}

Recent chat context:
${(chatHistory || []).map((m: any) => `${m.role}: ${m.content}`).join('\n')}

Memory context:
${memoryContext || 'No additional memory context'}

Execute this task with full workspace access.`;

    // Spawn a session via OpenClaw
    const spawnRes = await fetch('http://143.198.128.209:18789/v1/sessions/spawn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentId: 'main',
        task: fullTask,
        deliver: true, // Result will be delivered back
        label: `opie-doit-${Date.now()}`,
        timeoutSeconds: 300,
      }),
    });

    if (!spawnRes.ok) {
      const error = await spawnRes.text();
      throw new Error(`Spawn failed: ${error}`);
    }

    const spawnData = await spawnRes.json();
    
    // Return the session info - the result will come via message/callback
    return Response.json({
      success: true,
      sessionKey: spawnData.sessionKey,
      message: 'Task spawned. Result will be delivered.',
      spawnedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('DO IT mode error:', error);
    return Response.json(
      { error: 'Failed to spawn session', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    );
  }
}