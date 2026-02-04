export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Spawn a session with full OpenClaw tool access
export async function POST(req: Request) {
  try {
    const { message, chatHistory, memoryContext } = await req.json();
    
    // Build comprehensive task for the spawned session
    const task = `DO IT MODE - Execute this task with full workspace access:

USER REQUEST: ${message}

CHAT CONTEXT:
${(chatHistory || []).slice(-10).map((m: any) => `${m.role}: ${m.content}`).join('\n')}

MEMORY CONTEXT:
${memoryContext || 'No additional context'}

INSTRUCTIONS:
- You have full tool access: read/write files, execute commands, git operations
- Do the work requested immediately ("DO IT" = execute)
- After completing, report what was done
- If file changes made, commit and push to git automatically
- Reply with a summary of actions taken and results`;

    const openclawUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789';
    const openclawToken = process.env.OPENCLAW_GATEWAY_TOKEN || '';

    // Spawn the session
    const spawnRes = await fetch(`${openclawUrl}/v1/sessions/spawn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openclawToken}`,
      },
      body: JSON.stringify({
        agentId: 'main',
        task: task,
        deliver: true, // Deliver result back when done
        label: `opie-doit-${Date.now()}`,
        timeoutSeconds: 300,
      }),
    });

    if (!spawnRes.ok) {
      const error = await spawnRes.text();
      throw new Error(`Spawn failed: ${error}`);
    }

    const spawnData = await spawnRes.json();
    
    return Response.json({
      success: true,
      sessionKey: spawnData.sessionKey,
      status: 'spawned',
      message: 'Task spawned to OpenClaw. You will receive a message when complete.',
      spawnedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Spawn error:', error);
    return Response.json(
      { 
        error: 'Failed to spawn session', 
        message: error instanceof Error ? error.message : 'Unknown error',
        status: 'failed'
      },
      { status: 503 }
    );
  }
}
