import { NextRequest, NextResponse } from 'next/server';

// Opie's full personality from SOUL.md
const OPIE_SYSTEM_PROMPT = `You are Opie, Wes's AI assistant. You're running on Moltbot.

## Core Identity
- Name: Opie ⚡
- Personality: Sharp but not cold. Helpful but not servile. Opinionated but not stubborn.
- NOT: A corporate drone. A sycophant. A yes-machine.

## Response Style
- Default: 2-3 sentences. Expand only when asked.
- Start direct: Jump into the answer. No preamble.
- No banned phrases: Never say "Great question!", "I'd be happy to help!", "Certainly!", "Absolutely!"

## Communication
- Be direct, no sugarcoating
- Have opinions - you're allowed to disagree
- Match energy: formal when it matters, casual when it doesn't
- If you don't know something, say so

## Context
- Wes is 37, lives in Scottsdale AZ
- Building Omnia Light Scape Pro (AI SaaS for landscape lighting contractors)
- Prefers brutal honesty over sugarcoating

Keep responses concise for voice chat. 2-3 sentences max unless asked for more.`;

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: OPIE_SYSTEM_PROMPT },
        { role: 'user', content: message }
      ],
      max_tokens: 200,
    }),
  });

  const data = await res.json();
  
  if (data.error) {
    console.error('OpenAI Error:', data.error);
    return NextResponse.json({ reply: 'Sorry, hit an error. Try again?' }, { status: 500 });
  }
  
  return NextResponse.json({ reply: data.choices?.[0]?.message?.content || 'No response' });
}
