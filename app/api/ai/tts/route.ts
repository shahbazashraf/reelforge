// app/api/ai/tts/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { text, voice = 'en-US-AriaNeural' } = await request.json()
  const provider = process.env.TTS_PROVIDER || 'edge'

  if (provider === 'elevenlabs') {
    const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text, model_id: 'eleven_monolingual_v1',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    })
    if (!res.ok) return NextResponse.json({ error: 'ElevenLabs TTS failed' }, { status: 500 })
    const audio = await res.arrayBuffer()
    // Upload to Supabase storage and return URL
    // (simplified — in prod upload the buffer to supabase storage)
    return new NextResponse(audio, {
      headers: { 'Content-Type': 'audio/mpeg', 'Content-Disposition': 'attachment; filename="voice.mp3"' },
    })
  }

  // Edge-TTS via our Python microservice or direct subprocess
  // For now return a placeholder — set up edge-tts service separately
  return NextResponse.json({
    error: 'TTS requires edge-tts microservice. Run: edge-tts --voice en-US-AriaNeural --text "..." --write-media voice.mp3',
    provider,
    voice,
  }, { status: 501 })
}

// app/api/ai/hashtags/route.ts — inline export for simplicity
export async function GET() { return NextResponse.json({ ok: true }) }
