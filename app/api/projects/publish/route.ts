// app/api/projects/publish/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { projectId, platforms, scheduledAt } = body

  if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  if (!platforms?.length) return NextResponse.json({ error: 'Select at least one platform to publish to' }, { status: 400 })

  // Get project
  const { data: project } = await supabase
    .from('projects')
    .select('*, scenes(*), audio_tracks(*)')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // Validate render is complete
  if (!project.output_url) {
    return NextResponse.json({
      error: 'Video not rendered yet. Click "Render Video" first, wait for it to complete, then publish.',
    }, { status: 400 })
  }

  // Validate the output URL is reachable
  try {
    const checkRes = await fetch(project.output_url, { method: 'HEAD' })
    if (!checkRes.ok) {
      return NextResponse.json({
        error: 'Rendered video file not found. The render may have expired. Please re-render the video.',
      }, { status: 400 })
    }
  } catch {
    return NextResponse.json({
      error: 'Cannot reach the rendered video file. Ensure the backend is running and re-render if needed.',
    }, { status: 400 })
  }

  // Get social accounts for selected platforms
  const { data: accounts } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('platform', platforms)

  if (!accounts?.length) {
    return NextResponse.json({
      error: `No connected accounts for: ${platforms.join(', ')}. Connect your accounts in Settings → Social Accounts first.`,
    }, { status: 400 })
  }

  const jobs = []

  for (const account of accounts) {
    const { data: job } = await supabase.from('publish_jobs').insert({
      project_id: projectId,
      user_id: user.id,
      platform: account.platform,
      account_id: account.id,
      status: scheduledAt ? 'pending' : 'processing',
      scheduled_at: scheduledAt || null,
    }).select().single()

    jobs.push(job)

    if (!scheduledAt) {
      const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000'
      fetch(`${BACKEND}/api/publish/now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: job?.id,
          platform: account.platform,
          video_path: project.output_url,
          caption: project.caption || '',
          hashtags: project.hashtags || '',
          access_token: account.access_token,
          page_id: account.page_id || '',
          ig_user_id: account.platform === 'instagram' ? account.page_id : '',
        }),
      }).catch((err) => {
        console.error(`[publish] dispatch failed for ${account.platform}:`, err.message)
      })
    }
  }

  return NextResponse.json({
    success: true,
    jobCount: jobs.length,
    jobs,
    scheduled: !!scheduledAt,
  })
}
