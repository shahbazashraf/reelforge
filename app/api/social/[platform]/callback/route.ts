// app/api/social/[platform]/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function exchangeCode(platform: string, code: string, redirectUri: string) {
  switch (platform) {
    case 'instagram': {
      const fd = new FormData()
      fd.append('client_id', process.env.INSTAGRAM_APP_ID!)
      fd.append('client_secret', process.env.INSTAGRAM_APP_SECRET!)
      fd.append('grant_type', 'authorization_code')
      fd.append('redirect_uri', redirectUri)
      fd.append('code', code)
      const r = await fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body: fd })
      const data = await r.json()
      // Exchange for long-lived token
      const llr = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_APP_SECRET}&access_token=${data.access_token}`
      )
      const ll = await llr.json()
      const profile = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${ll.access_token}`)
      const p = await profile.json()
      return {
        access_token: ll.access_token,
        refresh_token: null,
        expires_in: ll.expires_in,
        username: p.username,
        platform_user_id: p.id,
      }
    }

    case 'facebook': {
      const r = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&redirect_uri=${redirectUri}&code=${code}`
      )
      const data = await r.json()
      // Get pages
      const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${data.access_token}`)
      const pages = await pagesRes.json()
      const page = pages.data?.[0]
      return {
        access_token: page?.access_token || data.access_token,
        refresh_token: null,
        expires_in: null, // long-lived
        username: page?.name || 'Page',
        platform_user_id: page?.id,
        page_id: page?.id,
      }
    }

    case 'youtube': {
      const r = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code, client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri, grant_type: 'authorization_code',
        }),
      })
      const data = await r.json()
      const ch = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      const channel = await ch.json()
      const snippet = channel.items?.[0]?.snippet
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        username: snippet?.title || 'My Channel',
        platform_user_id: channel.items?.[0]?.id,
      }
    }

    case 'twitter': {
      const r = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          code, grant_type: 'authorization_code',
          redirect_uri: redirectUri, code_verifier: 'challenge',
        }),
      })
      const data = await r.json()
      const user = await fetch('https://api.twitter.com/2/users/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      const u = await user.json()
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        username: u.data?.username,
        platform_user_id: u.data?.id,
      }
    }

    case 'tiktok': {
      const r = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: process.env.TIKTOK_CLIENT_KEY!, client_secret: process.env.TIKTOK_CLIENT_SECRET!,
          code, grant_type: 'authorization_code', redirect_uri: redirectUri,
        }),
      })
      const data = await r.json()
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in_seconds,
        username: data.open_id,
        platform_user_id: data.open_id,
      }
    }

    default:
      throw new Error(`Platform ${platform} callback not implemented`)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  const { platform } = params
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/dashboard/social-accounts?error=oauth_denied&platform=${platform}`)
  }

  try {
    const redirectUri = `${APP_URL}/api/social/${platform}/callback`
    const tokenData = await exchangeCode(platform, code, redirectUri)

    // Get the authenticated user from Supabase
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${APP_URL}/auth/login`)

    // Upsert social account
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null

    await supabase.from('social_accounts').upsert({
      user_id: user.id,
      platform,
      username: tokenData.username,
      display_name: tokenData.username,
      access_token: tokenData.access_token,   // encrypt this in production!
      refresh_token: tokenData.refresh_token,
      token_expires: expiresAt,
      page_id: (tokenData as any).page_id || null,
      status: 'active',
    }, { onConflict: 'user_id,platform' })

    return NextResponse.redirect(`${APP_URL}/dashboard/social-accounts?connected=${platform}`)
  } catch (err) {
    console.error(`OAuth callback error for ${platform}:`, err)
    return NextResponse.redirect(`${APP_URL}/dashboard/social-accounts?error=oauth_failed&platform=${platform}`)
  }
}
