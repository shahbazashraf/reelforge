// lib/platforms.ts
import type { PlatformConfig } from '@/types'

export const PLATFORMS: Record<string, PlatformConfig> = {
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    color: '#E1306C',
    gradient: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
    icon: 'ti-brand-instagram',
    maxDurationS: 90,
    maxSizeMb: 100,
    formats: ['9:16', '1:1', '4:5'],
  },
  tiktok: {
    id: 'tiktok',
    label: 'TikTok',
    color: '#ffffff',
    gradient: 'linear-gradient(135deg, #010101, #2d2d2d)',
    icon: 'ti-brand-tiktok',
    maxDurationS: 600,
    maxSizeMb: 1000,
    formats: ['9:16'],
  },
  facebook: {
    id: 'facebook',
    label: 'Facebook',
    color: '#1877F2',
    gradient: 'linear-gradient(135deg, #1877F2, #0d65d9)',
    icon: 'ti-brand-facebook',
    maxDurationS: 90,
    maxSizeMb: 1000,
    formats: ['9:16', '16:9', '1:1'],
  },
  twitter: {
    id: 'twitter',
    label: 'Twitter / X',
    color: '#1DA1F2',
    gradient: 'linear-gradient(135deg, #000, #1a1a1a)',
    icon: 'ti-brand-twitter',
    maxDurationS: 140,
    maxSizeMb: 512,
    formats: ['16:9', '1:1'],
  },
  youtube: {
    id: 'youtube',
    label: 'YouTube',
    color: '#FF0000',
    gradient: 'linear-gradient(135deg, #FF0000, #cc0000)',
    icon: 'ti-brand-youtube',
    maxDurationS: 60,
    maxSizeMb: 256000,
    formats: ['9:16', '16:9'],
  },
  snapchat: {
    id: 'snapchat',
    label: 'Snapchat',
    color: '#FFFC00',
    gradient: 'linear-gradient(135deg, #FFFC00, #f5e600)',
    icon: 'ti-brand-snapchat',
    maxDurationS: 60,
    maxSizeMb: 32,
    formats: ['9:16'],
  },
}

export const ASPECT_RATIOS = {
  '9:16': { w: 1080, h: 1920, label: 'Reel / Short', icon: 'ti-device-mobile' },
  '1:1':  { w: 1080, h: 1080, label: 'Feed Square',  icon: 'ti-square' },
  '16:9': { w: 1920, h: 1080, label: 'Landscape',    icon: 'ti-rectangle-landscape' },
  '4:5':  { w: 1080, h: 1350, label: 'Portrait Feed', icon: 'ti-rectangle-vertical' },
}

export const TRANSITIONS = ['fade', 'slide', 'zoom', 'none'] as const

export const TTS_VOICES = [
  { id: 'en-US-AriaNeural',   label: 'Aria (US)',     lang: 'English US' },
  { id: 'en-GB-SoniaNeural',  label: 'Sonia (UK)',    lang: 'English UK' },
  { id: 'en-AU-NatashaNeural',label: 'Natasha (AU)',  lang: 'English AU' },
  { id: 'en-US-GuyNeural',    label: 'Guy (US)',      lang: 'English US' },
  { id: 'ar-SA-ZariyahNeural',label: 'Zariyah (AR)',  lang: 'Arabic' },
  { id: 'fr-FR-DeniseNeural', label: 'Denise (FR)',   lang: 'French' },
  { id: 'de-DE-KatjaNeural',  label: 'Katja (DE)',    lang: 'German' },
  { id: 'es-ES-ElviraNeural', label: 'Elvira (ES)',   lang: 'Spanish' },
  { id: 'hi-IN-SwaraNeural',  label: 'Swara (IN)',    lang: 'Hindi' },
  { id: 'ur-PK-UzmaNeural',   label: 'Uzma (PK)',     lang: 'Urdu' },
]

export const SUBTITLE_STYLES = [
  { id: 'bold-center',  label: 'Bold Centered' },
  { id: 'bottom-bar',   label: 'Bottom Bar' },
  { id: 'karaoke',      label: 'Karaoke Word-by-word' },
  { id: 'top',          label: 'Top Banner' },
  { id: 'none',         label: 'No subtitles' },
]

// OAuth start URLs — these redirect to /api/social/[platform]/auth
export function getOAuthUrl(platform: string): string {
  return `/api/social/${platform}/auth`
}
