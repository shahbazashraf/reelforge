// app/api/ai/script/route.ts
import { NextRequest, NextResponse } from 'next/server'

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
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
      }),
    })
    const data = await res.json()
    const script = JSON.parse(data.choices[0].message.content)
    return NextResponse.json({ success: true, script })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
