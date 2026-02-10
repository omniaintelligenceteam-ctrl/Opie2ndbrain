// OpenClaw Proxy - Bypass CORS by proxying through Vercel
// Frontend → Vercel API → OpenClaw Gateway → Response

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const OPENCLAW_URL = 'https://ubuntu-s-1vcpu-1gb-sfo3-01.tail0fbff3.ts.net:9443';
const OPENCLAW_TOKEN = 'opie-token-123';

export async function POST(req: NextRequest) {
  try {
    // Get request body from frontend
    const body = await req.json();
    
    // Forward to OpenClaw with server-side request (bypasses CORS)
    const response = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
      },
      body: JSON.stringify({
        ...body,
        model: 'openclaw:main', // Force OpenClaw main agent
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenClaw Proxy] Error:', response.status, errorText);
      return NextResponse.json(
        { error: `OpenClaw error: ${errorText}` },
        { status: response.status }
      );
    }

    // For streaming requests
    if (body.stream) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // For non-streaming requests
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[OpenClaw Proxy] Network error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy error' },
      { status: 502 }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}