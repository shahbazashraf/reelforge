// app/api/ai/script/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAIProvider, callAI } from '@/lib/ai-provider'

export async function POST(request: NextRequest) {
  const { concept, numScenes = 6, platform = 'instagram', style } = await request.json()

  const systemPrompt = `You are a viral social media content strategist for ${platform}.
Generate a ${numScenes}-scene reel script. Style: ${style || 'engaging, short-form social media'}.
Return ONLY valid JSON — no markdown, no code fences, no explanation.`

  const userPrompt = `Concept: ${concept}

Return this exact JSON structure:
{
  "title": "short catchy title under 60 chars",
  "caption": "post caption with emojis under 150 chars",
  "hashtags": "#tag1 #tag2 #tag3 (8-12 relevant hashtags)",
  "scenes": [
    {
      "text": "on-screen text max 10 words",
      "image_prompt": "detailed visual description for image generation, ultra HD, cinematic"
    }
  ]
}`

  try {
    const provider = getAIProvider()
    if (!provider) {
      return NextResponse.json(
        { error: 'No AI provider configured. Set GROQ_API_KEY or OPENROUTER_API_KEY in .env.local' },
        { status: 500 }
      )
    }

    console.log(`[script] provider=${provider.name} model=${provider.model}`)

    const content = await callAI(
      provider,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.8, jsonMode: true }
    )

    const script = JSON.parse(content)
    return NextResponse.json({ success: true, script })
  } catch (err) {
    console.error('[script] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
