// types/index.ts

export type AspectRatio = '9:16' | '1:1' | '16:9' | '4:5'
export type Platform = 'instagram' | 'tiktok' | 'facebook' | 'twitter' | 'youtube' | 'snapchat'
export type ProjectStatus = 'draft' | 'processing' | 'ready' | 'published' | 'scheduled'
export type Transition = 'fade' | 'slide' | 'zoom' | 'none'
export type AudioType = 'music' | 'voice' | 'sfx'
export type TTSProvider = 'edge' | 'elevenlabs' | 'coqui'
export type AccountStatus = 'active' | 'error' | 'expired'

// ── Supabase DB row types ─────────────────────────────────────────────────

export interface Project {
  id: string
  user_id: string
  title: string
  status: ProjectStatus
  aspect_ratio: AspectRatio
  caption: string | null
  hashtags: string | null
  output_url: string | null
  thumbnail_url: string | null
  total_views: number
  created_at: string
  updated_at: string
  scenes?: Scene[]
  audio_tracks?: AudioTrack[]
  publish_jobs?: PublishJob[]
}

export interface Scene {
  id: string
  project_id: string
  order: number
  image_url: string | null
  text: string | null
  duration_ms: number
  transition: Transition
  ai_prompt: string | null
  created_at: string
}

export interface AudioTrack {
  id: string
  project_id: string
  type: AudioType
  name: string
  url: string
  start_ms: number
  volume: number
  loop: boolean
  created_at: string
}

export interface SocialAccount {
  id: string
  user_id: string
  platform: Platform
  username: string
  display_name: string
  profile_pic: string | null
  page_id: string | null
  platform_user_id: string | null
  followers: number
  status: AccountStatus
  token_expires: string | null
  created_at: string
}

export type JobStatus = 'pending' | 'processing' | 'published' | 'failed' | 'cancelled'

export interface PublishJob {
  id: string
  project_id: string
  platform: Platform
  account_id: string
  status: JobStatus
  scheduled_at: string | null
  published_at: string | null
  post_url: string | null
  post_id: string | null
  error_msg: string | null
  created_at: string
}

// ── UI types ──────────────────────────────────────────────────────────────

export interface PlatformConfig {
  id: Platform
  label: string
  color: string
  gradient: string
  icon: string
  maxDurationS: number
  maxSizeMb: number
  formats: AspectRatio[]
}

export interface GeneratedScript {
  title: string
  caption: string
  hashtags: string
  scenes: Array<{
    text: string
    image_prompt: string
  }>
}

export interface NavItem {
  label: string
  href: string
  icon: string
  badge?: number
}
