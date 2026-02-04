// Simplified OpenClaw function using Ollama directly
async function* streamOpenClaw(messages: Array<{role: string, content: string}>, _sessionId: string) {
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  if (!lastUserMessage) {
    yield `data: ${JSON.stringify({ error: 'No user message' })}

`;
    return;
  }

  try {
    // Use Ollama directly
    const ollamaKey = process.env.OLLAMA_API_KEY;
    if (!ollamaKey) {
      yield `data: ${JSON.stringify({ error: 'OLLAMA_API_KEY not configured' })}

`;
      return;
    }

    const response = await fetch('https://ollama.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ollamaKey}`,
      },
      body: JSON.stringify({
        model: MODELS.kimi.model,
        stream: true,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: lastUserMessage.content },
        ],
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      yield `data: ${JSON.stringify({ error: `Ollama: ${error.slice(0, 200)}` })}

`;
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield `data: ${JSON.stringify({ error: 'No response body' })}

`;
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.startsWith('data: ')) {
          yield `${line}\n\n`;
        }
      }
    }
    yield 'data: [DONE]\n\n';

  } catch (error) {
    console.error("[Ollama] Error:", error);
    yield `data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Ollama failed' })}

`;
  }
}
