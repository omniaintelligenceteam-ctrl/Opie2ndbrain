// src/app/api/chat/summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ summary: '' });
    }

    // Format conversation for summary
    const conversation = messages
      .map((m: { role: string; text: string }) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
      .join('\n\n');

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: `Summarize this conversation in 2-3 sentences, capturing the key topics and any conclusions. Be concise.\n\n${conversation}`,
        },
      ],
    });

    let summary = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        summary = block.text.trim();
        break;
      }
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('[Summary API] Error:', error);
    return NextResponse.json({ summary: '', error: 'Failed to generate summary' }, { status: 500 });
  }
}
