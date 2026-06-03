// app/api/ai/hashtags/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAIProvider, callAI } from '@/lib/ai-provider'

export async function POST(request: NextRequest) {
  const { caption, platform = 'instagram' } = await request.json()
  if (!caption) return NextResponse.json({ error: 'Caption required' }, { status: 400 })

  const prompt = `Generate 10 viral hashtags for this ${platform} post. Return ONLY a JSON array of strings, no explanation, no markdown.
Post: ${caption}`

  try {
    const provider = getAIProvider()
    if (!provider) {
      return NextResponse.json(
        { error: 'No AI provider configured. Set GROQ_API_KEY or OPENROUTER_API_KEY in .env.local' },
        { status: 500 }
      )
    }

    const text = await callAI(provider, [{ role: 'user', content: prompt }], { temperature: 0.7 })
    const hashtags: string[] = JSON.parse(text)
    return NextResponse.json({ hashtags })
  } catch (err) {
    console.error('[hashtags] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
