import { NextRequest, NextResponse } from 'next/server';

type TTSProvider = 'elevenlabs' | 'openai' | 'edge';

// Edge TTS voices (Microsoft)
const EDGE_VOICES = {
  'en-US-GuyNeural': 'Guy (Male)',
  'en-US-JennyNeural': 'Jenny (Female)',
  'en-US-AriaNeural': 'Aria (Female)',
  'en-US-DavisNeural': 'Davis (Male)',
};

// OpenAI TTS voices
const OPENAI_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

export async function POST(request: NextRequest) {
  try {
    const { text, provider = 'azure', voice } = await request.json();
    
    if (!text || typeof text !== 'string') {
      console.error('[TTS] Invalid text input');
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    console.log(`[TTS] Generating speech: provider=${provider}, chars=${text.length}, text="${text.slice(0, 200)}"`);

    switch (provider) {
      case 'openai':
        return await generateOpenAI(text, voice || 'nova');
      case 'elevenlabs':
        return await generateElevenLabs(text, voice);
      case 'edge':
        return await generateEdgeTTS(text, voice || 'en-US-GuyNeural');
      case 'azure':
      default:
        return await generateAzureTTS(text, voice || 'en-US-GuyNeural');
    }
  } catch (error) {
    console.error('[TTS] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint to list available voices
export async function GET() {
  return NextResponse.json({
    providers: {
      azure: {
        name: 'Azure Speech (500k free/month)',
        voices: EDGE_VOICES, // Same Microsoft neural voices
        default: 'en-US-GuyNeural',
      },
      edge: {
        name: 'Edge TTS (Free/Unofficial)',
        voices: EDGE_VOICES,
        default: 'en-US-GuyNeural',
      },
      openai: {
        name: 'OpenAI TTS ($15/1M chars)',
        voices: OPENAI_VOICES,
        default: 'nova',
      },
      elevenlabs: {
        name: 'ElevenLabs (Credits)',
        voices: ['default'],
        default: 'default',
      },
    },
    default: 'azure',
  });
}

async function generateAzureTTS(text: string, voice: string): Promise<Response> {
  const apiKey = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || 'eastus';
  
  if (!apiKey) {
    console.error('[TTS/Azure] AZURE_SPEECH_KEY not configured');
    return NextResponse.json({ error: 'Azure Speech key not configured' }, { status: 500 });
  }

  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  
  // Clean text for SSML: escape XML entities and remove emojis/special chars that might break parsing
  const cleanText = text
    .replace(/[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}|\u{1F900}-\u{1F9FF}|\u{1FA00}-\u{1FAFF}]/gu, '') // Remove emojis
    .replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] || c))
    .trim();
  
  console.log(`[TTS/Azure] Clean text (${cleanText.length} chars): "${cleanText.slice(0, 100)}"`);
  
  // Build SSML
  const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
    <voice name='${voice}'>${cleanText}</voice>
  </speak>`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        'User-Agent': 'Opie2ndBrain',
      },
      body: ssml,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TTS/Azure] Error ${response.status}: ${errorText}`);
      return NextResponse.json({ error: 'Azure TTS failed', details: errorText }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`[TTS/Azure] Success: ${audioBuffer.byteLength} bytes`);
    
    return new Response(audioBuffer, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-cache' },
    });
  } catch (error) {
    console.error('[TTS/Azure] Request failed:', error);
    return NextResponse.json({ error: 'Azure TTS request failed' }, { status: 500 });
  }
}

async function generateOpenAI(text: string, voice: string): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: voice,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[TTS/OpenAI] Error ${response.status}: ${errorText}`);
    return NextResponse.json({ error: 'OpenAI TTS failed', details: errorText }, { status: response.status });
  }

  const audioBuffer = await response.arrayBuffer();
  console.log(`[TTS/OpenAI] Success: ${audioBuffer.byteLength} bytes`);
  
  return new Response(audioBuffer, {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-cache' },
  });
}

async function generateElevenLabs(text: string, voice?: string): Promise<Response> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
  }

  const voiceId = voice || 'MClEFoImJXBTgLwdLI5n'; // Default voice
  
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: { stability: 0.5, similarity_boost: 0.5 },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[TTS/ElevenLabs] Error ${response.status}: ${errorText}`);
    return NextResponse.json({ error: 'ElevenLabs TTS failed', details: errorText }, { status: response.status });
  }

  const audioBuffer = await response.arrayBuffer();
  console.log(`[TTS/ElevenLabs] Success: ${audioBuffer.byteLength} bytes`);
  
  return new Response(audioBuffer, {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-cache' },
  });
}

async function generateEdgeTTS(text: string, voice: string): Promise<Response> {
  // Edge TTS via edge-tts package or fallback API
  // Using a public edge-tts API endpoint
  const endpoint = 'https://api.edge-tts.com/tts';
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });

    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      console.log(`[TTS/Edge] Success: ${audioBuffer.byteLength} bytes`);
      return new Response(audioBuffer, {
        headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-cache' },
      });
    }
  } catch (e) {
    console.log('[TTS/Edge] Primary API failed, trying fallback');
  }

  // Fallback: Use browser-compatible Web Speech synthesis placeholder
  // For server-side, we'll use a different approach - stream via Azure
  const azureEndpoint = `https://eastus.tts.speech.microsoft.com/cognitiveservices/v1`;
  const azureKey = process.env.AZURE_SPEECH_KEY;
  
  if (azureKey) {
    const ssml = `<speak version='1.0' xml:lang='en-US'><voice name='${voice}'>${text}</voice></speak>`;
    
    const response = await fetch(azureEndpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': azureKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
      },
      body: ssml,
    });

    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      console.log(`[TTS/Azure] Success: ${audioBuffer.byteLength} bytes`);
      return new Response(audioBuffer, {
        headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-cache' },
      });
    }
  }

  // Ultimate fallback - return error suggesting OpenAI
  console.error('[TTS/Edge] All Edge TTS methods failed');
  return NextResponse.json(
    { error: 'Edge TTS unavailable. Try provider=openai instead.' },
    { status: 503 }
  );
}
