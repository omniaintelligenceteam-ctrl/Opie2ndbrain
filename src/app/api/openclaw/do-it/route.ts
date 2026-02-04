import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime for streaming support
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Environment configuration
const OPENCLAW_URL = process.env.OPENCLAW_URL || 'http://localhost:3000';
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN;

// Timeout for requests (120 seconds)
const REQUEST_TIMEOUT_MS = 120_000;

/**
 * Build system prompt with memory context
 */
function buildSystemPrompt(memoryContext?: string): string {
  const basePrompt = `You are Opie in DO IT mode. You have full tool access and can execute actions decisively.
When the user asks you to do something, DO IT - don't just explain how.
You can edit files, run commands, update memory, and take real actions.`;

  if (memoryContext && memoryContext.trim()) {
    return `${basePrompt}

Recent context from memory:
${memoryContext}`;
  }

  return basePrompt;
}

/**
 * Check if OpenClaw is available
 */
async function checkOpenClawHealth(): Promise<boolean> {
  if (!OPENCLAW_URL || !OPENCLAW_TOKEN) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${OPENCLAW_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * DO IT API Route - Streams responses from OpenClaw
 */
export async function POST(req: NextRequest) {
  try {
    const { message, memoryContext, chatHistory = [] } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'No message provided' },
        { status: 400 }
      );
    }

    // Check OpenClaw availability
    const openclawAvailable = await checkOpenClawHealth();

    if (!openclawAvailable) {
      console.log('[DO IT] OpenClaw not available, returning fallback warning');
      return NextResponse.json({
        fallback: true,
        warning: 'OpenClaw offline - falling back to direct API',
        provider: 'fallback',
      });
    }

    // Build system prompt with memory context
    const systemPrompt = buildSystemPrompt(memoryContext);

    console.log('[DO IT] Routing to OpenClaw:', OPENCLAW_URL);

    // Set up timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
        },
        body: JSON.stringify({
          model: 'ollama/kimi-k2.5:cloud',
          messages: [
            { role: 'system', content: systemPrompt },
            ...chatHistory.map((m: { role: string; content: string }) => ({
              role: m.role,
              content: m.content,
            })),
            { role: 'user', content: message },
          ],
          stream: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DO IT] OpenClaw error:', response.status, errorText.slice(0, 300));
        return NextResponse.json({
          fallback: true,
          warning: `OpenClaw error ${response.status} - falling back`,
          error: errorText.slice(0, 300),
        });
      }

      // Stream the response back to the client
      if (!response.body) {
        return NextResponse.json({
          fallback: true,
          warning: 'No response body from OpenClaw',
        });
      }

      // Return SSE stream
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Provider': 'openclaw',
        },
      });

    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('[DO IT] Request timed out');
        return NextResponse.json({
          fallback: true,
          warning: 'OpenClaw request timed out - falling back',
        });
      }

      throw fetchError;
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[DO IT] Error:', errorMessage);

    return NextResponse.json({
      fallback: true,
      warning: 'OpenClaw offline - falling back to direct API',
      error: errorMessage,
    });
  }
}
