import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that never require authentication
const PUBLIC_ROUTES = [
  '/',              // Landing / dashboard page
  '/opie',          // Main Opie UI
  '/api/status',    // Health-check (no secrets exposed)
  '/api/chat',      // Chat API
  '/api/chat/:path*', // All chat sub-routes (poll, etc.)
  '/api/tts',       // Text-to-speech
  '/api/openclaw/:path*', // OpenClaw integration
  '/api/kanban',          // Kanban board (G needs access)
];

// API routes that require a valid DASHBOARD_API_KEY
// All /api/* routes are protected by default unless listed above.

/**
 * Validate API key against the configured dashboard key
 */
function validateApiKey(apiKey: string | null): boolean {
  const configuredKey = process.env.DASHBOARD_API_KEY;

  // In development, if no key is configured, allow all requests
  if (!configuredKey && process.env.NODE_ENV === 'development') {
    return true;
  }

  // No key configured = allow all (key must be set to enable auth)
  if (!configuredKey) {
    return true;
  }

  // Validate the provided key
  return apiKey === configuredKey;
}

/**
 * Check if a path is public (doesn't need auth)
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => matchesPattern(pathname, route));
}

/**
 * Extract API key from request
 * Checks Authorization Bearer, x-api-key header, then ?apiKey query param
 */
function extractApiKey(request: NextRequest): string | null {
  // Check Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check x-api-key header
  const headerKey = request.headers.get('x-api-key');
  if (headerKey) {
    return headerKey;
  }

  // Check query parameter as fallback
  const url = new URL(request.url);
  const queryKey = url.searchParams.get('apiKey');
  if (queryKey) {
    return queryKey;
  }

  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If no DASHBOARD_API_KEY is configured, skip all auth checks
  const configuredKey = process.env.DASHBOARD_API_KEY;
  if (!configuredKey) {
    return NextResponse.next();
  }

  // Allow public routes without auth
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // All /api/* routes require authentication
  if (pathname.startsWith('/api/')) {
    const apiKey = extractApiKey(request);

    if (!validateApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid API key required' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
  ],
};

// Helper to check if path matches pattern (supports wildcards)
function matchesPattern(pathname: string, pattern: string): boolean {
  if (pattern.includes(':path*')) {
    const base = pattern.replace('/:path*', '');
    return pathname === base || pathname.startsWith(base + '/');
  }
  return pathname === pattern || pathname.startsWith(pattern + '/');
}
