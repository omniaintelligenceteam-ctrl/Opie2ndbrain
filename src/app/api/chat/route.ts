import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL = 'https://divisions-disco-wing-enjoy.trycloudflare.com';
const GATEWAY_TOKEN = '08bd72129fdc575b3162b1fac84b48c87a69de72aaa1a483';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    
    const response = await fetch(`${GATEWAY_URL}/api/sessions/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        sessionKey: 'main',
        message: message,
        timeoutSeconds: 60,
      }),
    });

    const data = await response.json();
    return NextResponse.json({ reply: data.reply || data.message || 'No response' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ reply: 'Error connecting to Opie' }, { status: 500 });
  }
}
