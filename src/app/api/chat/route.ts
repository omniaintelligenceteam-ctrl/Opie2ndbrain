import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    
    // Insert message into Supabase
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/voice_messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY || '',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ user_message: message, status: 'pending' }),
    });
    
    const [inserted] = await insertRes.json();
    const msgId = inserted.id;
    
    // Poll for response (max 30 seconds)
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      
      const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/voice_messages?id=eq.${msgId}`, {
        headers: {
          'apikey': SUPABASE_KEY || '',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      });
      
      const [msg] = await checkRes.json();
      if (msg.status === 'done' && msg.assistant_reply) {
        return NextResponse.json({ reply: msg.assistant_reply });
      }
    }
    
    return NextResponse.json({ reply: 'Opie is busy, try again' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ reply: 'Error connecting' }, { status: 500 });
  }
}
