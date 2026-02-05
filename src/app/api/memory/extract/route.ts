import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const OLLAMA_URL = process.env.OLLAMA_API_URL || 'https://api.ollama.com/v1';
const OLLAMA_KEY = process.env.OLLAMA_API_KEY || '';

const EXTRACTION_PROMPT = `You are a memory extraction assistant. Analyze the conversation and extract important information.

Return a JSON object with these arrays (include only items that are clearly stated or implied):

{
  "facts": ["concrete facts about the user or their situation"],
  "preferences": ["user preferences, likes, dislikes, communication style"],
  "decisions": ["decisions made during the conversation"],
  "action_items": ["tasks or follow-ups mentioned"],
  "key_topics": ["main topics discussed"]
}

Rules:
- Only extract what's clearly present in the conversation
- Keep each item concise (1 sentence max)
- Return empty arrays if nothing relevant found
- Output ONLY valid JSON, no explanation`;

export async function POST(req: NextRequest) {
  try {
    const { messages, conversationId, sessionId = 'default' } = await req.json();

    if (!messages || messages.length < 2) {
      return NextResponse.json({ extracted: false, reason: 'Not enough messages' });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    // Format conversation for extraction
    const conversationText = messages
      .map((m: any) => `${m.role}: ${m.text || m.content}`)
      .join('\n');

    // Call Ollama for extraction
    const response = await fetch(`${OLLAMA_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OLLAMA_KEY}`,
      },
      body: JSON.stringify({
        model: 'kimi-k2.5:latest',
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: `Extract memory from this conversation:\n\n${conversationText}` }
        ],
        temperature: 0.1, // Low temp for consistent extraction
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Memory Extract] Ollama error:', error);
      return NextResponse.json({ error: 'Extraction failed' }, { status: 500 });
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || '{}';
    
    // Parse JSON from response
    let extracted;
    try {
      // Handle markdown code blocks
      const jsonMatch = extractedText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, extractedText];
      extracted = JSON.parse(jsonMatch[1].trim());
    } catch (e) {
      console.error('[Memory Extract] JSON parse error:', extractedText);
      return NextResponse.json({ extracted: false, reason: 'Parse error' });
    }

    // Store extracted items in Supabase
    const insertPromises = [];

    for (const category of ['facts', 'preferences', 'decisions', 'action_items']) {
      const items = extracted[category] || [];
      for (const content of items) {
        if (content && content.trim()) {
          insertPromises.push(
            supabaseAdmin.from('opie_user_memory').upsert({
              session_id: sessionId,
              category: category.replace('_', ' ').replace(/s$/, ''), // 'facts' -> 'fact'
              content: content.trim(),
              source_conversation_id: conversationId,
              metadata: { extracted_at: new Date().toISOString() }
            }, {
              onConflict: 'session_id,category,content',
              ignoreDuplicates: true
            })
          );
        }
      }
    }

    // Store conversation summary
    if (extracted.key_topics?.length > 0) {
      const summaryText = messages.length > 10 
        ? `Discussed: ${extracted.key_topics.join(', ')}`
        : null;
      
      if (summaryText) {
        insertPromises.push(
          supabaseAdmin.from('opie_conversation_summaries').upsert({
            conversation_id: conversationId,
            session_id: sessionId,
            summary: summaryText,
            key_topics: extracted.key_topics,
            message_count: messages.length
          }, {
            onConflict: 'conversation_id'
          })
        );
      }
    }

    await Promise.all(insertPromises);

    console.log('[Memory Extract] Stored:', {
      facts: extracted.facts?.length || 0,
      preferences: extracted.preferences?.length || 0,
      decisions: extracted.decisions?.length || 0,
      action_items: extracted.action_items?.length || 0
    });

    return NextResponse.json({ 
      extracted: true, 
      counts: {
        facts: extracted.facts?.length || 0,
        preferences: extracted.preferences?.length || 0,
        decisions: extracted.decisions?.length || 0,
        action_items: extracted.action_items?.length || 0
      }
    });

  } catch (error) {
    console.error('[Memory Extract] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
