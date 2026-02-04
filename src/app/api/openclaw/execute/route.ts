export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { message, chatHistory, memoryContext } = await req.json();
    
    // Build system prompt with full memory context
    const systemPrompt = `You are Opie, Wes's voice assistant with full memory access.

Core facts about Wes:
- Direct, no fluff communication style
- 2-3 sentences default, expand only when asked
- "DO IT" means execute immediately
- Late night worker (10PM-2AM MST)
- Age 37, Scottsdale AZ (MST no DST)
- Premier Landscape Lighting + Omnia Light Scape Pro

Current memory context:
${memoryContext || 'Loading from memory server...'}

Recent chat context for this conversation:
${(chatHistory || []).slice(-5).map((m: any) => `${m.role}: ${m.content}`).join('\n')}

You have full workspace access through OpenClaw. When asked to perform actions (write files, run commands, search, etc.), do them directly.`;

    // Call Ollama Cloud API with Kimi K2.5
    const ollamaRes = await fetch('https://api.ollama.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY || process.env.OLLAMA_API_KEY || ''}`,
      },
      body: JSON.stringify({
        model: 'kimi-k2.5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        stream: true,
        temperature: 0.7,
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