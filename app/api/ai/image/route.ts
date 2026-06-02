// app/api/ai/image/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

const SIZE_MAP: Record<string, string> = {
  '9:16': '1024x1792',
  '1:1':  '1024x1024',
  '16:9': '1792x1024',
  '4:5':  '1024x1280',
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prompt, aspectRatio = '9:16' } = await request.json()
  if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 })

  const size = SIZE_MAP[aspectRatio] || '1024x1792'

  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
        prompt: `${prompt}. Ultra HD, cinematic, professional photography, 8K resolution.`,
        n: 1,
        size,
        response_format: 'b64_json',
        quality: 'standard',
      }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)

    const b64 = data.data[0].b64_json
    const buffer = Buffer.from(b64, 'base64')
    const filename = `${user.id}/${Date.now()}.png`

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filename, buffer, { contentType: 'image/png' })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filename)
    return NextResponse.json({ url: publicUrl, filename })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
