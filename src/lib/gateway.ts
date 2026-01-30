// Gateway configuration - centralized for all API routes
export const GATEWAY_URL = process.env.MOLTBOT_GATEWAY_URL || 'http://localhost:18789';
export const GATEWAY_TOKEN = process.env.MOLTBOT_GATEWAY_TOKEN || '';

// Check if we're likely in a production environment without local gateway
export const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
export const GATEWAY_AVAILABLE = !IS_VERCEL || process.env.MOLTBOT_GATEWAY_URL?.startsWith('http');

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

export async function gatewayHealth(): Promise<{ connected: boolean; latency: number; reason?: string }> {
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
    // Try multiple endpoints to check gateway health
    const endpoints = ['/api/status', '/status', '/health', '/'];
    
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(`${GATEWAY_URL}${endpoint}`, {
          method: 'HEAD', // Use HEAD to reduce payload
          headers: GATEWAY_TOKEN ? { 'Authorization': `Bearer ${GATEWAY_TOKEN}` } : {},
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          return { connected: true, latency: Date.now() - start };
        }
      } catch (e) {
        // Try next endpoint
        continue;
      }
    }
    return { connected: false, latency: Date.now() - start, reason: 'No endpoint responded' };
  } catch {
    return { connected: false, latency: Date.now() - start, reason: 'Connection failed' };
  }
}
