export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: Request) {
  // Validate API key for execute endpoint
  const apiKey = req.headers.get('x-api-key');
  const expectedKey = process.env.DASHBOARD_API_KEY;
  if (expectedKey && apiKey !== expectedKey) {
    return Response.json(
      { error: 'Unauthorized', message: 'Invalid or missing API key' },
      { status: 401 }
    );
  }

  try {
    const { message, chatHistory, memoryContext } = await req.json();
    
    // Build system prompt with full memory context
    const systemPrompt = `You are Opie, Wes's voice assistant with full memory access.

Core facts about Wes:
- Direct, no fluff communication style
- 2-3 sentences default, expand only when asked
- "EXECUTE" means execute immediately
- Late night worker (10PM-2AM MST)
- Age 37, Scottsdale AZ (MST no DST)
- Premier Landscape Lighting + Omnia Light Scape Pro

Current memory context:
${memoryContext || 'Loading from memory server...'}

Recent chat context for this conversation:
${(chatHistory || []).slice(-5).map((m: any) => `${m.role}: ${m.content}`).join('\n')}

You have full workspace access through OpenClaw. When asked to perform actions (write files, run commands, search, etc.), do them directly.`;

    // Call Ollama API with Kimi K2.5
    const ollamaRes = await fetch('https://ollama.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OLLAMA_API_KEY || ''}`,
      },
      body: JSON.stringify({
        model: 'kimi-k2.5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        stream: true,
      }),
    });

    if (!ollamaRes.ok) {
      const error = await ollamaRes.text();
      throw new Error(`Ollama error: ${error}`);
    }

    // Stream response back to client
    return new Response(ollamaRes.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
    
  } catch (error) {
    console.error('Execute mode error:', error);
    return Response.json(
      { error: 'Failed to execute', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    );
  }
}