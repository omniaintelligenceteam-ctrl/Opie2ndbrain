import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
// Dashboard internal routes are public (URL is the security)
const PUBLIC_ROUTES = [
  '/api/status',    // Health check endpoint
  '/api/tts',       // TTS for voice features
  '/api/chat',      // Chat interface
  '/api/agents',    // Agent sessions dashboard
  '/api/metrics',   // Dashboard metrics
  '/api/crons',     // Cron jobs display
  '/api/activity',  // Activity feed
  '/_next',         // Next.js internals
  '/favicon',
  '/manifest',
];

// Routes that require authentication (external-facing, sensitive)
const PROTECTED_API_ROUTES = [
  '/api/email',         // Send emails
  '/api/calendar',      // Calendar access
  '/api/workspace',     // Workspace modifications
  '/api/memory',        // Memory writes
  '/api/notifications', // Push notifications
  '/api/analytics',     // Analytics data
];

/**
 * Validate API key against the configured dashboard key
 */
function validateApiKey(apiKey: string | null): boolean {
  const configuredKey = process.env.DASHBOARD_API_KEY;
  
  // In development, if no key is configured, allow all requests
  if (!configuredKey && process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // No key configured in production = deny all (fail secure)
  if (!configuredKey) {
    return false;
  }
  
  // Validate the provided key
  return apiKey === configuredKey;
}

/**
 * Check if a path should be protected
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_API_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Check if a path is public (doesn't need auth)
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Extract API key from request
 * Checks x-api-key header first, then ?apiKey query param
 */
function extractApiKey(request: NextRequest): string | null {
  // Check header first (preferred method)
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
  
  // Skip auth for public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }
  
  // Only check auth for API routes that need protection
  if (isProtectedRoute(pathname)) {
    const apiKey = extractApiKey(request);
    
    if (!validateApiKey(apiKey)) {
      // Return 401 Unauthorized
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'Valid API key required. Provide via x-api-key header or ?apiKey query parameter.',
        },
        { 
          status: 401,
          headers: {
            'WWW-Authenticate': 'ApiKey realm="Dashboard API"',
          },
        }
      );
    }
  }
  
  // Allow request to proceed
  return NextResponse.next();
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
  ],
};
