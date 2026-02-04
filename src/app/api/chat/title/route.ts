// src/app/api/chat/title/route.ts
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
      return NextResponse.json({ title: 'New conversation' });
    }

    // Take first exchange (up to 2 messages)
    const context = messages
      .slice(0, 2)
      .map((m: { role: string; text: string }) => `${m.role}: ${m.text}`)
      .join('\n');

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Fast and cheap for titles
      max_tokens: 20,
      messages: [
        {
          role: 'user',
          content: `Generate a 3-5 word title for this conversation. Return ONLY the title, no quotes or punctuation.\n\n${context}`,
        },
      ],
    });

    let title = 'New conversation';
    for (const block of response.content) {
      if (block.type === 'text') {
        title = block.text.trim().replace(/^["']|["']$/g, ''); // Remove quotes
        break;
      }
    }

    // Truncate if too long
    if (title.length > 50) {
      title = title.slice(0, 47) + '...';
    }

    return NextResponse.json({ title });
  } catch (error) {
    console.error('[Title API] Error:', error);
    // Fallback title
    const now = new Date();
    const fallback = `Chat from ${now.toLocaleDateString()}`;
    return NextResponse.json({ title: fallback });
  }
}
