import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are Opie, a helpful AI assistant. Be concise and friendly. 2-3 sentences max.' },
        { role: 'user', content: message }
      ],
      max_tokens: 150,
    }),
  });

  const data = await res.json();
  return NextResponse.json({ reply: data.choices?.[0]?.message?.content || 'No response' });
}
