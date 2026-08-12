// app/api/social/[platform]/auth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// ── Instagram: New Business Login API (Basic Display API shut down Dec 2024) ─
// Uses: https://www.instagram.com/oauth/authorize  (NOT api.instagram.com)
// Scopes: instagram_business_basic, instagram_business_content_publish
// ─────────────────────────────────────────────────────────────────────────────

const OAUTH_CONFIGS: Record<string, (state: string) => string> = {
  instagram: (state) => {
    if (!process.env.INSTAGRAM_APP_ID) throw new Error('INSTAGRAM_APP_ID not configured')
    const params = new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID!,
      redirect_uri: `${APP_URL}/api/social/instagram/callback`,
      scope: 'instagram_business_basic,instagram_business_content_publish,instagram_business_manage_insights',
      response_type: 'code',
      state,
    })
    return `https://www.instagram.com/oauth/authorize?${params}`
  },

  tiktok: (state) => {
    if (!process.env.TIKTOK_CLIENT_KEY) throw new Error('TIKTOK_CLIENT_KEY not configured')
    const params = new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      redirect_uri: `${APP_URL}/api/social/tiktok/callback`,
      scope: 'user.info.basic,video.publish,video.upload',
      response_type: 'code',
      state,
    })
    return `https://www.tiktok.com/v2/auth/authorize/?${params}`
  },

  facebook: (state) => {
    if (!process.env.FACEBOOK_APP_ID) throw new Error('FACEBOOK_APP_ID not configured')
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID!,
      redirect_uri: `${APP_URL}/api/social/facebook/callback`,
      scope: 'pages_manage_posts,pages_read_engagement,pages_show_list,instagram_business_basic,instagram_business_content_publish',
      response_type: 'code',
      state,
    })
    return `https://www.facebook.com/v20.0/dialog/oauth?${params}`
  },

  twitter: (state) => {
    if (!process.env.TWITTER_CLIENT_ID) throw new Error('TWITTER_CLIENT_ID not configured')
    const params = new URLSearchParams({
      client_id: process.env.TWITTER_CLIENT_ID!,
      redirect_uri: `${APP_URL}/api/social/twitter/callback`,
      scope: 'tweet.write tweet.read users.read offline.access',
      response_type: 'code',
      code_challenge: 'challenge',
      code_challenge_method: 'plain',
      state,
    })
    return `https://twitter.com/i/oauth2/authorize?${params}`
  },

  youtube: (state) => {
    if (!process.env.GOOGLE_CLIENT_ID) throw new Error('GOOGLE_CLIENT_ID not configured')
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: `${APP_URL}/api/social/youtube/callback`,
      scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      state,
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  },

  snapchat: (state) => {
    if (!process.env.SNAPCHAT_CLIENT_ID) throw new Error('SNAPCHAT_CLIENT_ID not configured')
    const params = new URLSearchParams({
      client_id: process.env.SNAPCHAT_CLIENT_ID!,
      redirect_uri: `${APP_URL}/api/social/snapchat/callback`,
      scope: 'snapchat-marketing-api',
      response_type: 'code',
      state,
    })
    return `https://accounts.snapchat.com/accounts/oauth2/auth?${params}`
  },
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params
  const builder = OAUTH_CONFIGS[platform]

  if (!builder) {
    return NextResponse.json({ error: `Platform "${platform}" not supported` }, { status: 400 })
  }

  // Verify the user is logged in before starting OAuth
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(`${APP_URL}/auth/login?redirect=/dashboard/social-accounts`)
    }
  } catch {
    // Continue even if auth check fails — callback will catch unauthorized state
  }

  try {
    const state = crypto.randomUUID()
    const url = builder(state)
    return NextResponse.redirect(url)
  } catch (err: any) {
    // Missing env var — redirect with clear message
    const msg = encodeURIComponent(err.message || 'Platform not configured')
    return NextResponse.redirect(`${APP_URL}/dashboard/social-accounts?error=${msg}&platform=${platform}`)
  }
}
