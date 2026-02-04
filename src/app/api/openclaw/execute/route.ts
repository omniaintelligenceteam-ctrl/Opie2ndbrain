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

    // Call Anthropic API directly with full context
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
        stream: true,
      }),
    });

    if (!anthropicRes.ok) {
      const error = await anthropicRes.text();
      throw new Error(`Anthropic error: ${error}`);
    }

    // Stream response back to client
    return new Response(anthropicRes.body, {
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