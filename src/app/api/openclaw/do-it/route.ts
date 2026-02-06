// Redirect to canonical /api/openclaw/doit endpoint
// This file exists only for backwards compatibility.
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const target = url.origin + '/api/openclaw/doit';

  // Forward the request to the canonical route
  const body = await req.text();
  const headers = new Headers(req.headers);

  const res = await fetch(target, {
    method: 'POST',
    headers,
    body,
  });

  return new Response(res.body, {
    status: res.status,
    headers: res.headers,
  });
}
