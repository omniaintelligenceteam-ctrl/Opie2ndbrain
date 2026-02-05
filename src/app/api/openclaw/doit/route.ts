export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: Request) {
  // Validate API key
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
    
    const openclawUrl = process.env.OPENCLAW_URL || 'http://143.198.128.209:3000';
    const openclawToken = process.env.OPENCLAW_TOKEN;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (openclawToken) {
      headers['Authorization'] = `Bearer ${openclawToken}`;
    }
    
    const response = await fetch(`${openclawUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'ollama/kimi-k2.5:cloud',
        messages: [
          { 
            role: 'system', 
            content: `You are Opie, Wes's voice assistant with full workspace access. You can read/write files, execute commands, and access long-term memory.\n\n${memoryContext || ''}` 
          },
          ...(chatHistory || []),
          { role: 'user', content: message }
        ],
        stream: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenClaw error: ${response.status}`);
    }
    
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
    
  } catch (error) {
    console.error('EXECUTE mode error:', error);
    return Response.json(
      { error: 'OpenClaw unavailable', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    );
  }
}