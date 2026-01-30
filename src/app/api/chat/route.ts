import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    
    const insertRes = await fetch(SUPABASE_URL + '/rest/v1/voice_messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ user_message: message, status: 'pending' }),
    });
    
    const inserted = await insertRes.json();
    const msgId = inserted[0]?.id;
    
    if (!msgId) {
      return NextResponse.json({ reply: 'Error saving message' });
    }
    
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      
      const checkRes = await fetch(SUPABASE_URL + '/rest/v1/voice_messages?id=eq.' + msgId, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
        },
      });
      
      const msgs = await checkRes.json();
      if (msgs[0]?.status === 'done' && msgs[0]?.assistant_reply) {
        return NextResponse.json({ reply: msgs[0].assistant_reply });
      }
    }
    
    return NextResponse.json({ reply: 'Opie is busy, try again' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ reply: 'Error connecting' }, { status: 500 });
  }
}
