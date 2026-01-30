// Gateway configuration - centralized for all API routes
export const GATEWAY_URL = process.env.MOLTBOT_GATEWAY_URL || 'http://localhost:18789';
export const GATEWAY_TOKEN = process.env.MOLTBOT_GATEWAY_TOKEN || '';

export interface GatewayFetchOptions extends RequestInit {
  timeout?: number;
}

export async function gatewayFetch<T = unknown>(
  path: string,
  options: GatewayFetchOptions = {}
): Promise<T> {
  const { timeout = 10000, headers: customHeaders, ...rest } = options;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
    ...customHeaders,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${GATEWAY_URL}${path}`, {
      ...rest,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      throw new Error(`Gateway error ${res.status}: ${text}`);
    }

    return res.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Gateway request timed out');
    }
    throw error;
  }
}

export async function gatewayHealth(): Promise<{ connected: boolean; latency: number }> {
  const start = Date.now();
  try {
    const res = await fetch(`${GATEWAY_URL}/status`, {
      headers: GATEWAY_TOKEN ? { 'Authorization': `Bearer ${GATEWAY_TOKEN}` } : {},
      signal: AbortSignal.timeout(5000),
    });
    return { connected: res.ok, latency: Date.now() - start };
  } catch {
    return { connected: false, latency: Date.now() - start };
  }
}
