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

  const { projectId, platforms, scheduledAt } = await request.json()

  // Get project
  const { data: project } = await supabase
    .from('projects')
    .select('*, scenes(*), audio_tracks(*)')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (!project.output_url) return NextResponse.json({ error: 'Project not rendered yet. Render first.' }, { status: 400 })

  // Get social accounts for selected platforms
  const { data: accounts } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('platform', platforms)

  if (!accounts?.length) {
    return NextResponse.json({ error: 'No connected accounts for selected platforms' }, { status: 400 })
  }

  const jobs = []

  for (const account of accounts) {
    // Create publish job record
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
      // Dispatch to Python worker or call platform API directly
      const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000'
      fetch(`${BACKEND}/api/publish/now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: job?.id,
          platform: account.platform,
          video_url: project.output_url,
          caption: project.caption || '',
          hashtags: project.hashtags || '',
          access_token: account.access_token,
          page_id: account.page_id || '',
          ig_user_id: account.platform === 'instagram' ? account.page_id : '',
        }),
      }).catch(console.error) // fire and forget — worker updates DB
    }
  }

  return NextResponse.json({
    success: true,
    jobCount: jobs.length,
    jobs,
    scheduled: !!scheduledAt,
  })
}
