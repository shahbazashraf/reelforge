// app/api/social/[platform]/refresh/route.ts
// Refreshes an expired/expiring access token for a connected social account.
// Called by the UI "Refresh token" button or can be called by a scheduled cron.
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: account } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('platform', platform)
    .single()

  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  try {
    let newToken: string | null = null
    let newExpiry: string | null = null

    switch (platform) {
      // ── Instagram — uses ig_refresh_token endpoint (no refresh_token needed) ─
      case 'instagram': {
        if (!account.access_token) throw new Error('No access token — reconnect required')
        const res = await fetch(
          `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${account.access_token}`
        )
        const data = await res.json()
        if (data.error) throw new Error(data.error.message || 'Instagram token refresh failed')
        newToken = data.access_token
        newExpiry = new Date(Date.now() + data.expires_in * 1000).toISOString()
        break
      }

      // ── YouTube — uses refresh_token grant ────────────────────────────────
      case 'youtube': {
        if (!account.refresh_token) throw new Error('No refresh token — reconnect required')
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: account.refresh_token,
            grant_type: 'refresh_token',
          }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error_description || data.error)
        newToken = data.access_token
        newExpiry = new Date(Date.now() + data.expires_in * 1000).toISOString()
        break
      }

      // ── Twitter — uses refresh_token grant ────────────────────────────────
      case 'twitter': {
        if (!account.refresh_token) throw new Error('No refresh token — reconnect required')
        const creds = Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')
        const res = await fetch('https://api.twitter.com/2/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${creds}`,
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: account.refresh_token,
          }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error_description || data.error)
        newToken = data.access_token
        newExpiry = new Date(Date.now() + data.expires_in * 1000).toISOString()
        // Update refresh token too (Twitter rotates it)
        await supabase.from('social_accounts').update({
          refresh_token: data.refresh_token,
        }).eq('id', account.id)
        break
      }

      // ── TikTok — uses refresh_token grant ────────────────────────────────
      case 'tiktok': {
        if (!account.refresh_token) throw new Error('No refresh token — reconnect required')
        const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_key: process.env.TIKTOK_CLIENT_KEY!,
            client_secret: process.env.TIKTOK_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: account.refresh_token,
          }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.message || data.error)
        newToken = data.access_token
        newExpiry = new Date(Date.now() + data.expires_in_seconds * 1000).toISOString()
        break
      }

      // ── Facebook / Snapchat — long-lived tokens, reconnect when needed ────
      default:
        return NextResponse.json(
          { error: `${platform} tokens do not need manual refresh — reconnect when expired` },
          { status: 400 }
        )
    }

    // Save refreshed token
    await supabase.from('social_accounts').update({
      access_token: newToken,
      token_expires: newExpiry,
      status: 'active',
    }).eq('id', account.id)

    return NextResponse.json({ success: true, expires: newExpiry })
  } catch (err: any) {
    await supabase.from('social_accounts').update({ status: 'error' }).eq('id', account.id)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
