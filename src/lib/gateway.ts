// Gateway configuration - centralized for all API routes
// Uses Tailscale Funnel (public HTTPS) for production access
export const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || process.env.MOLTBOT_GATEWAY_URL || 'https://ubuntu-s-1vcpu-1gb-sfo3-01.tail0fbff3.ts.net';
export const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || process.env.OPENCLAW_GATEWAY_TOKEN || process.env.MOLTBOT_GATEWAY_TOKEN || 'opie-token-123';

// Check if we're likely in a production environment without local gateway
export const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
export const GATEWAY_AVAILABLE = true; // Always available through proxy

// Gateway configuration checks
export const GATEWAY_CONFIGURED = !!GATEWAY_URL && GATEWAY_URL !== '';
export function isGatewayUnavailableInProd(): boolean {
  return IS_VERCEL && GATEWAY_URL.includes('localhost');
}

export interface GatewayFetchOptions extends RequestInit {
  timeout?: number;
  fallback?: unknown;
}

export class GatewayUnavailableError extends Error {
  constructor(message = 'Gateway unavailable') {
    super(message);
    this.name = 'GatewayUnavailableError';
  }
}

// Invoke a gateway tool via /tools/invoke endpoint
// This is the proper way to interact with the gateway
export interface ToolInvokeResult<T = unknown> {
  ok: boolean;
  result?: T;
  error?: {
    type: string;
    message: string;
  };
}

export async function invokeGatewayTool<T = unknown>(
  tool: string,
  args: Record<string, unknown> = {},
  options: { timeout?: number } = {}
): Promise<ToolInvokeResult<T>> {
  const { timeout = 10000 } = options;
  
  // In Vercel with localhost gateway, return error immediately
  if (IS_VERCEL && GATEWAY_URL.includes('localhost')) {
    return { ok: false, error: { type: 'unavailable', message: 'Gateway unavailable' } };
  }
  
  try {
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
      },
      body: JSON.stringify({ tool, args }),
      signal: AbortSignal.timeout(timeout),
    });
    
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { ok: false, error: { type: 'invalid_response', message: 'Gateway returned non-JSON' } };
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    return { 
      ok: false, 
      error: { 
        type: 'network', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      } 
    };
  }
}

export async function gatewayFetch<T = unknown>(
  path: string,
  options: GatewayFetchOptions = {}
): Promise<T> {
  const { timeout = 10000, headers: customHeaders, fallback, ...rest } = options;
  
  // In Vercel without external gateway, return fallback immediately
  if (IS_VERCEL && GATEWAY_URL.includes('localhost')) {
    if (fallback !== undefined) {
      return fallback as T;
    }
    throw new GatewayUnavailableError('Gateway unavailable in production (localhost)');
  }
  
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
    
    // Return fallback if provided
    if (fallback !== undefined) {
      return fallback as T;
    }
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new GatewayUnavailableError('Gateway request timed out');
    }
    throw error;
  }
}

export async function gatewayHealth(): Promise<{ connected: boolean; latency: number; reason?: string; model?: string; sessions?: number }> {
  const start = Date.now();

  if (!GATEWAY_CONFIGURED) {
    return { connected: false, latency: 0, reason: 'Gateway URL not configured' };
  }

  if (isGatewayUnavailableInProd()) {
    return {
      connected: false,
      latency: 0,
      reason: 'Gateway unavailable in production (localhost)',
    };
  }

  try {
    const res = await fetch(`${GATEWAY_URL}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    const latency = Date.now() - start;

    if (!res.ok) {
      return { connected: false, latency, reason: `Relay HTTP ${res.status}` };
    }

    const data = await res.json();

    if (data?.ok && data?.connected === true) {
      return { connected: true, latency };
    }

    if (data?.ok && data?.connected === false) {
      return { connected: false, latency, reason: 'Relay up but gateway WebSocket disconnected' };
    }

    return { connected: false, latency, reason: 'Unexpected relay health response' };
  } catch (error) {
    return {
      connected: false,
      latency: Date.now() - start,
      reason: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}
