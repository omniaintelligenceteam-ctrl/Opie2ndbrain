import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const { text } = await request.json();
  
  const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: { stability: 0.5, similarity_boost: 0.5 }
    }),
  });

  const audioBuffer = await response.arrayBuffer();
  
  return new Response(audioBuffer, {
    headers: { 
      'Content-Type': 'audio/mpeg',
    },
  });
}
