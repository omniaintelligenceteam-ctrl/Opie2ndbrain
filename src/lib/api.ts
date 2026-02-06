// API utility with dashboard key authentication
const API_KEY = process.env.NEXT_PUBLIC_DASHBOARD_API_KEY;

/**
 * Fetch wrapper that includes API key header for dashboard routes
 */
export function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Add API key header if configured
  if (API_KEY) {
    headers['x-api-key'] = API_KEY;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
