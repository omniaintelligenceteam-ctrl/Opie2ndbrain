import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: {
      MOLTBOT_GATEWAY_URL: process.env.MOLTBOT_GATEWAY_URL ? '✓ SET' : '✗ MISSING',
      MOLTBOT_GATEWAY_TOKEN: process.env.MOLTBOT_GATEWAY_TOKEN ? '✓ SET' : '✗ MISSING',
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      NODE_ENV: process.env.NODE_ENV,
    },
    tokenLength: process.env.MOLTBOT_GATEWAY_TOKEN?.length || 0,
    urlValue: process.env.MOLTBOT_GATEWAY_URL || 'NOT SET',
  });
}
