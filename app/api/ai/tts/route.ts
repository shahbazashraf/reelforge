// app/api/ai/tts/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { text, voice = 'en-US-AriaNeural' } = await request.json()

  if (!text?.trim()) {
    return NextResponse.json({ error: 'Text is required for TTS generation' }, { status: 400 })
  }

  // Provider cascade: ElevenLabs → OpenAI TTS → Python backend edge-tts
  const elevenlabsKey = process.env.ELEVENLABS_API_KEY
  const elevenlabsVoice = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'

  // Try ElevenLabs first
  if (elevenlabsKey && elevenlabsKey.length > 10) {
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenlabsVoice}`, {
        method: 'POST',
        headers: { 'xi-api-key': elevenlabsKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      })
      if (res.ok) {
        const audio = await res.arrayBuffer()
        return new NextResponse(audio, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': 'attachment; filename="voice.mp3"',
            'X-TTS-Provider': 'elevenlabs',
          },
        })
      }
      console.warn('[tts] ElevenLabs failed:', res.status)
    } catch (e) {
      console.warn('[tts] ElevenLabs error:', e)
    }
  }

  // Try OpenAI TTS
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey && openaiKey.length > 10) {
    try {
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'tts-1', input: text, voice: 'nova', response_format: 'mp3' }),
      })
      if (res.ok) {
        const audio = await res.arrayBuffer()
        return new NextResponse(audio, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': 'attachment; filename="voice.mp3"',
            'X-TTS-Provider': 'openai',
          },
        })
      }
      console.warn('[tts] OpenAI TTS failed:', res.status)
    } catch (e) {
      console.warn('[tts] OpenAI TTS error:', e)
    }
  }

  // Fallback: call Python backend which has edge-tts
  const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000'
  try {
    const res = await fetch(`${BACKEND}/api/ai/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    })
    if (res.ok) {
      const audio = await res.arrayBuffer()
      return new NextResponse(audio, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': 'attachment; filename="voice.mp3"',
          'X-TTS-Provider': 'edge-tts',
        },
      })
    }
  } catch {
    // Python backend not available
  }

  return NextResponse.json({
    error: 'All TTS providers failed. Ensure ELEVENLABS_API_KEY or OPENAI_API_KEY is set, or the Python backend is running with edge-tts installed.',
  }, { status: 503 })
}
