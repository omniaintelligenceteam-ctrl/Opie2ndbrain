import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    
    if (!text || typeof text !== 'string') {
      console.error('[TTS] Invalid text input');
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error('[TTS] ELEVENLABS_API_KEY not configured');
      return NextResponse.json({ error: 'TTS not configured' }, { status: 500 });
    }

    console.log(`[TTS] Generating speech for ${text.length} chars`);
    
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/MClEFoImJXBTgLwdLI5n', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: { stability: 0.5, similarity_boost: 0.5 }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TTS] ElevenLabs error ${response.status}: ${errorText}`);
      return NextResponse.json(
        { error: 'TTS generation failed', details: errorText }, 
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`[TTS] Success: ${audioBuffer.byteLength} bytes`);
    
    return new Response(audioBuffer, {
      headers: { 
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[TTS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
