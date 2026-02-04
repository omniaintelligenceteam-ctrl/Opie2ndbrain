import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
// ALL routes are public - this is a personal dashboard
const PUBLIC_ROUTES = [
  '/',  // Allow everything - add auth only where needed
];

// Routes that require authentication (only truly external-facing)
const PROTECTED_API_ROUTES = [
  '/api/email',    // Send emails externally
  '/api/calendar', // Calendar modifications
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
  // Auth disabled for now - all routes public
  return NextResponse.next();
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
  ],
};
