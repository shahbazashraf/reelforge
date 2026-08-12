// app/api/projects/render/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await request.json()
  if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 })

  const { data: project, error } = await supabase
    .from('projects')
    .select('*, scenes(*), audio_tracks(*)')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (error || !project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (!project.scenes?.length) return NextResponse.json({ error: 'No scenes to render. Add at least one scene before rendering.' }, { status: 400 })

  // Mark as processing
  await supabase.from('projects').update({ status: 'processing' }).eq('id', projectId)

  const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000'
  try {
    const res = await fetch(`${BACKEND}/api/projects/assemble`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        scenes: project.scenes
          .sort((a: any, b: any) => a.order - b.order)
          .map((s: any) => ({
            image_path: s.image_url,
            duration_ms: s.duration_ms,
            text: s.text,
            transition: s.transition,
          })),
        audio_tracks: (project.audio_tracks || []).map((t: any) => ({
          path: t.url,
          type: t.type,
          volume: t.volume,
          loop: t.loop,
        })),
        aspect_ratio: project.aspect_ratio || '9:16',
        subtitle_position: 'bottom',
        subtitle_style: 'bold',
        subtitle_size: 48,
        auto_tts: true,
        auto_bgm: true,
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: 'Unknown render error' }))
      await supabase.from('projects').update({ status: 'draft' }).eq('id', projectId)
      return NextResponse.json(
        { error: errData.detail || 'Render validation failed. Check your scenes and try again.' },
        { status: res.status }
      )
    }

    const { job_id } = await res.json()
    return NextResponse.json({ jobId: job_id, status: 'processing' })
  } catch {
    await supabase.from('projects').update({ status: 'draft' }).eq('id', projectId)
    return NextResponse.json({
      error: 'Cannot connect to render service. Ensure the Python backend is running: cd backend && uvicorn app.main:app --port 8000',
    }, { status: 502 })
  }
}
