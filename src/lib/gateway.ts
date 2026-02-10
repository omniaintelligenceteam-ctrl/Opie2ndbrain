// Gateway configuration - centralized for all API routes
// Uses proxy endpoint to bypass CORS issues with OpenClaw direct API
export const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || process.env.MOLTBOT_GATEWAY_URL || '/api/openclaw-proxy';
export const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || process.env.OPENCLAW_GATEWAY_TOKEN || process.env.MOLTBOT_GATEWAY_TOKEN || 'proxy-internal';

// Check if we're likely in a production environment without local gateway
export const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
export const GATEWAY_AVAILABLE = true; // Always available through proxy

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
  
  // In Vercel with localhost gateway, immediately return unavailable
  if (IS_VERCEL && GATEWAY_URL.includes('localhost')) {
    return { 
      connected: false, 
      latency: 0, 
      reason: 'Gateway unavailable in production (localhost)' 
    };
  }
  
  try {
    // Use /tools/invoke with session_status - most reliable endpoint
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
      },
      body: JSON.stringify({
        tool: 'session_status',
        args: {},
      }),
      signal: AbortSignal.timeout(5000),
    });
    
    const latency = Date.now() - start;
    
    // Check if response is JSON
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // Gateway is up but may have auth issues or wrong endpoint
      return { 
        connected: false, 
        latency, 
        reason: 'Gateway returned non-JSON response' 
      };
    }
    
    const data = await res.json();
    
    if (res.ok && data.ok) {
      return { 
        connected: true, 
        latency,
        model: data.result?.model,
        sessions: data.result?.activeSessions,
      };
    }
    
    // Gateway responded but with error
    return {
      connected: res.status !== 401 && res.status !== 403, // Auth errors = not connected
      latency,
      reason: data.error?.message || `HTTP ${res.status}`,
    };
  } catch (error) {
    const latency = Date.now() - start;
    return { 
      connected: false, 
      latency, 
      reason: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}
