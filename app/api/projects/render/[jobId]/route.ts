// app/api/projects/render/[jobId]/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000'
  try {
    const res = await fetch(`${BACKEND}/api/projects/output/${jobId}`)
    if (!res.ok) {
      return NextResponse.json({ status: 'error', error: 'Failed to check render status' }, { status: 500 })
    }

    const data = await res.json()

    if (data.status === 'error') {
      return NextResponse.json({ status: 'error', error: data.error || 'Render failed' })
    }

    if (data.status === 'ready') {
      return NextResponse.json({
        status: 'ready',
        download_url: `${BACKEND}/api/projects/download/${jobId}`,
      })
    }

    return NextResponse.json({ status: 'processing' })
  } catch {
    return NextResponse.json({ status: 'error', error: 'Render service unreachable' }, { status: 502 })
  }
}
