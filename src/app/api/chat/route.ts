import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are Opie, a helpful AI assistant. Be concise and friendly. Keep responses under 2-3 sentences for voice chat.' },
          { role: 'user', content: message }
        ],
        max_tokens: 150,
      }),
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No response';
    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ reply: 'Error connecting' }, { status: 500 });
  }
}
