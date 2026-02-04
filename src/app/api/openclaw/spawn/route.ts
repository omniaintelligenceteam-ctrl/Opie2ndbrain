export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Spawn a session with full OpenClaw tool access
export async function POST(req: Request) {
  try {
    const { message, chatHistory, memoryContext } = await req.json();
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
    const sessionLabel = `opie-doit-${Date.now()}`;
    
    // Build comprehensive task for the spawned session
    const task = `DO IT MODE - Execute this task with full workspace access:

USER REQUEST: ${message}

CHAT CONTEXT:
${(chatHistory || []).slice(-10).map((m: any) => `${m.role}: ${m.content}`).join('\n')}

MEMORY CONTEXT:
${memoryContext || 'No additional context'}

INSTRUCTIONS:
- You have full tool access: read/write files, execute commands, git operations, web search
- Do the work requested immediately ("DO IT" = execute)
- After completing, write your response to Supabase via REST API:
  POST ${supabaseUrl}/rest/v1/opie_responses
  Headers: apikey: ${supabaseKey}, Authorization: Bearer ${supabaseKey}
  Body: {
    "session_key": "${sessionLabel}",
    "task": "${message.replace(/"/g, '\\"').slice(0, 200)}",
    "response": "your full reply with actions taken",
    "status": "complete"
  }
- If file changes made, commit and push to git automatically
- Reply with a summary of actions taken

SUPABASE ENV: ${supabaseUrl ? 'Configured' : 'MISSING'}`;

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
        deliver: false, // We'll check Supabase for results
        label: sessionLabel,
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
      sessionKey: sessionLabel,
      status: 'spawned',
      message: 'Task spawned to OpenClaw. Check back in a few seconds.',
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