/**
 * Opie Relay Client
 * Talks to opie-relay.js (port 19100) — the device-authenticated bridge
 * to the OpenClaw gateway with full operator.admin scope.
 *
 * Public URL via Tailscale Funnel:
 *   https://ubuntu-s-1vcpu-1gb-sfo3-01.tail0fbff3.ts.net → localhost:19100
 */

// Use env var so we can swap in dev vs prod
export const RELAY_BASE =
  process.env.OPIE_RELAY_URL ||
  'https://ubuntu-s-1vcpu-1gb-sfo3-01.tail0fbff3.ts.net';

// Which OpenClaw agent session to target (can override per-request)
export const MAIN_SESSION = 'agent:main:main';

/** Check if the relay is up and connected to gateway */
export async function relayHealth(): Promise<{ ok: boolean; connected: boolean; latency: number }> {
  const start = Date.now();
  try {
    const res = await fetch(`${RELAY_BASE}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return { ok: data.ok === true, connected: data.connected === true, latency: Date.now() - start };
  } catch {
    return { ok: false, connected: false, latency: Date.now() - start };
  }
}

/**
 * Send a message through the relay and stream back the SSE response.
 * Yields raw SSE lines ready to forward to the browser.
 *
 * The relay emits:
 *   data: {"delta":"..."}\n\n   — partial text
 *   data: [DONE]\n\n            — end of stream
 */
export async function* streamViaRelay(
  message: string,
  sessionKey: string = MAIN_SESSION,
  timeoutMs: number = 90_000,
): AsyncGenerator<string> {
  const res = await fetch(`${RELAY_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionKey, stream: true, timeoutMs }),
    signal: AbortSignal.timeout(timeoutMs + 5_000),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => 'unknown error');
    yield `data: ${JSON.stringify({ error: `Relay error ${res.status}: ${text.slice(0, 200)}` })}\n\n`;
    yield 'data: [DONE]\n\n';
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      // Split on double newlines (SSE frame boundary)
      const parts = buf.split('\n\n');
      buf = parts.pop() ?? '';

      for (const part of parts) {
        const line = part.trim();
        if (!line) continue;
        if (line.startsWith('data: ')) {
          const payload = line.slice(6);
          if (payload === '[DONE]') {
            yield 'data: [DONE]\n\n';
            return;
          }
          // Parse relay delta → emit in OpenAI-compat format for the frontend
          try {
            const parsed = JSON.parse(payload);
            if (parsed.delta) {
              // Translate relay format to OpenAI streaming format
              yield `data: ${JSON.stringify({ choices: [{ delta: { content: parsed.delta } }] })}\n\n`;
            } else if (parsed.error) {
              yield `data: ${JSON.stringify({ error: parsed.error })}\n\n`;
            }
          } catch {
            // Pass through raw if we can't parse
            yield `${line}\n\n`;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield 'data: [DONE]\n\n';
}

/**
 * Non-streaming: send message, wait, return full text.
 */
export async function chatViaRelay(
  message: string,
  sessionKey: string = MAIN_SESSION,
  timeoutMs: number = 90_000,
): Promise<string> {
  const res = await fetch(`${RELAY_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionKey, stream: false, timeoutMs }),
    signal: AbortSignal.timeout(timeoutMs + 5_000),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Relay chat failed');
  return data.text ?? '';
}

/**
 * Call any gateway WS method via the relay (proxy endpoint).
 * e.g. method='sessions.list', method='tools.catalog', etc.
 */
export async function gatewayMethod<T = unknown>(
  method: string,
  params: Record<string, unknown> = {},
  timeoutMs = 15_000,
): Promise<T> {
  const res = await fetch(`${RELAY_BASE}/gateway`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params, timeoutMs }),
    signal: AbortSignal.timeout(timeoutMs + 3_000),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || `Gateway method '${method}' failed`);
  return data.result as T;
}
