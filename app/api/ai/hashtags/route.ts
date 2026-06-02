// app/api/ai/hashtags/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { caption, platform = 'instagram' } = await request.json()
  if (!caption) return NextResponse.json({ error: 'Caption required' }, { status: 400 })

  const prompt = `Generate 10 viral hashtags for this ${platform} post. Return ONLY a JSON array of strings, no explanation, no markdown.
Post: ${caption}`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    })
    const data = await res.json()
    const text = data.choices[0].message.content.trim()
    const hashtags: string[] = JSON.parse(text)
    return NextResponse.json({ hashtags })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
