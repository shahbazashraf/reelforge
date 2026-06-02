// app/api/social/[platform]/auth/route.ts
import { NextRequest, NextResponse } from 'next/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

const OAUTH_CONFIGS: Record<string, () => string> = {
  instagram: () => {
    const params = new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID!,
      redirect_uri: `${APP_URL}/api/social/instagram/callback`,
      scope: 'instagram_basic,instagram_content_publish,instagram_manage_insights',
      response_type: 'code',
    })
    return `https://api.instagram.com/oauth/authorize?${params}`
  },
  tiktok: () => {
    const params = new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      redirect_uri: `${APP_URL}/api/social/tiktok/callback`,
      scope: 'user.info.basic,video.publish,video.upload',
      response_type: 'code',
    })
    return `https://www.tiktok.com/v2/auth/authorize/?${params}`
  },
  facebook: () => {
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID!,
      redirect_uri: `${APP_URL}/api/social/facebook/callback`,
      scope: 'pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish',
      response_type: 'code',
    })
    return `https://www.facebook.com/v19.0/dialog/oauth?${params}`
  },
  twitter: () => {
    const params = new URLSearchParams({
      client_id: process.env.TWITTER_CLIENT_ID!,
      redirect_uri: `${APP_URL}/api/social/twitter/callback`,
      scope: 'tweet.write tweet.read users.read offline.access',
      response_type: 'code',
      code_challenge: 'challenge',
      code_challenge_method: 'plain',
    })
    return `https://twitter.com/i/oauth2/authorize?${params}`
  },
  youtube: () => {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: `${APP_URL}/api/social/youtube/callback`,
      scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  },
  snapchat: () => {
    const params = new URLSearchParams({
      client_id: process.env.SNAPCHAT_CLIENT_ID!,
      redirect_uri: `${APP_URL}/api/social/snapchat/callback`,
      scope: 'snapchat-marketing-api',
      response_type: 'code',
    })
    return `https://accounts.snapchat.com/accounts/oauth2/auth?${params}`
  },
}

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  const { platform } = params
  const builder = OAUTH_CONFIGS[platform]

  if (!builder) {
    return NextResponse.json({ error: `Platform "${platform}" not supported` }, { status: 400 })
  }

  const url = builder()
  return NextResponse.redirect(url)
}
