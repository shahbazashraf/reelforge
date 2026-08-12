// app/api/social/[platform]/callback/route.ts
// Handles the OAuth callback for all social platforms.
// After successful token exchange + profile fetch, upserts into social_accounts
// and redirects the user back to the dashboard — persistent, no re-auth needed.
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// ── Token exchange + profile fetch per platform ───────────────────────────────

async function exchangeCode(platform: string, code: string, redirectUri: string) {
  switch (platform) {

    // ── Instagram (Business Login API — replaces deprecated Basic Display API) ──
    case 'instagram': {
      // Step A: Exchange code for short-lived token
      const fd = new FormData()
      fd.append('client_id', process.env.INSTAGRAM_APP_ID!)
      fd.append('client_secret', process.env.INSTAGRAM_APP_SECRET!)
      fd.append('grant_type', 'authorization_code')
      fd.append('redirect_uri', redirectUri)
      fd.append('code', code)

      const shortRes = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        body: fd,
      })
      const shortData = await shortRes.json()
      if (shortData.error_type || !shortData.access_token) {
        throw new Error(shortData.error_message || `Instagram auth failed (${shortData.error_type || 'unknown'})`)
      }

      // Step B: Exchange short-lived for long-lived token (60 days)
      const longRes = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_APP_SECRET}&access_token=${shortData.access_token}`
      )
      const longData = await longRes.json()
      if (longData.error) {
        throw new Error(longData.error.message || 'Long-lived token exchange failed')
      }

      // Step C: Fetch profile details
      const profileRes = await fetch(
        `https://graph.instagram.com/me?fields=id,username,name,profile_picture_url,followers_count&access_token=${longData.access_token}`
      )
      const profile = await profileRes.json()
      if (profile.error) {
        throw new Error(profile.error.message || 'Profile fetch failed')
      }

      return {
        access_token: longData.access_token,
        refresh_token: null,                        // Instagram uses token refresh endpoint, not refresh_token
        expires_in: longData.expires_in,            // ~5184000s = 60 days
        username: profile.username,
        platform_user_id: String(profile.id),
        display_name: profile.name || profile.username,
        profile_pic: profile.profile_picture_url || null,
        followers: profile.followers_count || 0,
      }
    }

    // ── Facebook ──────────────────────────────────────────────────────────────
    case 'facebook': {
      const tokenRes = await fetch(
        `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
      )
      const tokenData = await tokenRes.json()
      if (tokenData.error) throw new Error(tokenData.error.message)

      // Get managed pages
      const pagesRes = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${tokenData.access_token}`)
      const pages = await pagesRes.json()
      const page = pages.data?.[0]

      // Fetch user profile for display
      const meRes = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name,picture&access_token=${tokenData.access_token}`)
      const me = await meRes.json()

      return {
        access_token: page?.access_token || tokenData.access_token,
        refresh_token: null,
        expires_in: null, // Facebook long-lived tokens don't expire normally
        username: page?.name || me.name || 'My Page',
        platform_user_id: page?.id || me.id,
        display_name: page?.name || me.name,
        profile_pic: me.picture?.data?.url || null,
        followers: 0,
        page_id: page?.id || null,
      }
    }

    // ── YouTube ───────────────────────────────────────────────────────────────
    case 'youtube': {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      })
      const tokenData = await tokenRes.json()
      if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error)

      const channelRes = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
      )
      const channelData = await channelRes.json()
      const channel = channelData.items?.[0]

      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        username: channel?.snippet?.title || 'My Channel',
        platform_user_id: channel?.id,
        display_name: channel?.snippet?.title,
        profile_pic: channel?.snippet?.thumbnails?.default?.url || null,
        followers: parseInt(channel?.statistics?.subscriberCount || '0'),
      }
    }

    // ── Twitter / X ───────────────────────────────────────────────────────────
    case 'twitter': {
      const creds = Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')
      const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${creds}`,
        },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code_verifier: 'challenge',
        }),
      })
      const tokenData = await tokenRes.json()
      if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error)

      const userRes = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })
      const userData = await userRes.json()

      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        username: userData.data?.username,
        platform_user_id: userData.data?.id,
        display_name: userData.data?.name,
        profile_pic: userData.data?.profile_image_url || null,
        followers: userData.data?.public_metrics?.followers_count || 0,
      }
    }

    // ── TikTok ────────────────────────────────────────────────────────────────
    case 'tiktok': {
      const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: process.env.TIKTOK_CLIENT_KEY!,
          client_secret: process.env.TIKTOK_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      })
      const tokenData = await tokenRes.json()
      if (tokenData.error) throw new Error(tokenData.message || tokenData.error)

      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in_seconds,
        username: tokenData.open_id,
        platform_user_id: tokenData.open_id,
        display_name: null,
        profile_pic: null,
        followers: 0,
      }
    }

    // ── Snapchat ──────────────────────────────────────────────────────────────
    case 'snapchat': {
      const tokenRes = await fetch('https://accounts.snapchat.com/accounts/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.SNAPCHAT_CLIENT_ID!,
          client_secret: process.env.SNAPCHAT_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      })
      const tokenData = await tokenRes.json()
      if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error)

      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        username: tokenData.sub || 'snapchat_user',
        platform_user_id: tokenData.sub,
        display_name: null,
        profile_pic: null,
        followers: 0,
      }
    }

    default:
      throw new Error(`Platform ${platform} callback not implemented`)
  }
}

// ── Main GET handler ──────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // User denied permission
  if (error || !code) {
    const msg = encodeURIComponent(errorDescription || error || 'oauth_denied')
    return NextResponse.redirect(`${APP_URL}/dashboard/social-accounts?error=${msg}&platform=${platform}`)
  }

  try {
    const redirectUri = `${APP_URL}/api/social/${platform}/callback`
    const tokenData = await exchangeCode(platform, code, redirectUri)

    // ── Get the authenticated Supabase user ──────────────────────────────────
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cs: any[]) => cs.forEach(({ name, value, options }: any) =>
            cookieStore.set(name, value, options)
          ),
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(`${APP_URL}/auth/login?redirect=/dashboard/social-accounts`)
    }

    // ── Compute token expiry ─────────────────────────────────────────────────
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null

    // ── Upsert social account (persistent storage — no re-auth needed) ───────
    const { error: upsertError } = await supabase.from('social_accounts').upsert(
      {
        user_id: user.id,
        platform,
        username: tokenData.username,
        display_name: tokenData.display_name || tokenData.username,
        profile_pic: (tokenData as any).profile_pic || null,
        followers: (tokenData as any).followers || 0,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires: expiresAt,
        page_id: (tokenData as any).page_id || null,
        platform_user_id: tokenData.platform_user_id,
        status: 'active',
      },
      { onConflict: 'user_id,platform' }
    )

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError)
      throw new Error('Failed to save account: ' + upsertError.message)
    }

    // ── Redirect back to dashboard with success state ─────────────────────────
    return NextResponse.redirect(
      `${APP_URL}/dashboard/social-accounts?connected=${platform}&username=${encodeURIComponent(tokenData.username || '')}`
    )
  } catch (err: any) {
    console.error(`OAuth callback error for ${platform}:`, err)
    const msg = encodeURIComponent(err.message || 'OAuth failed')
    return NextResponse.redirect(
      `${APP_URL}/dashboard/social-accounts?error=${msg}&platform=${platform}`
    )
  }
}
