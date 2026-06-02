// hooks/useSocialAccounts.ts
'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import type { SocialAccount, Platform } from '@/types'

const sb = () => createClient()

export function useSocialAccounts() {
  return useQuery({
    queryKey: ['social-accounts'],
    queryFn: async () => {
      const { data, error } = await sb()
        .from('social_accounts')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as SocialAccount[]
    },
  })
}

export function useConnectAccount() {
  const qc = useQueryClient()
  return useMutation({
    // In production: call your OAuth init endpoint, then handle callback
    // This mutation saves the account after the OAuth flow completes
    mutationFn: async (data: Partial<SocialAccount> & { platform: Platform }) => {
      const { data: account, error } = await sb()
        .from('social_accounts')
        .upsert(data, { onConflict: 'user_id,platform' })
        .select()
        .single()
      if (error) throw error
      return account as SocialAccount
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-accounts'] }),
  })
}

export function useDisconnectAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from('social_accounts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-accounts'] }),
  })
}

export function useRefreshAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // Call your refresh token endpoint
      const res = await fetch(`/api/social/refresh/${id}`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to refresh token')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-accounts'] }),
  })
}

// hooks/usePublish.ts
import { useMutation } from '@tanstack/react-query'

export function usePublishNow() {
  return useMutation({
    mutationFn: async (payload: {
      projectId: string
      platforms: string[]
      scheduledAt?: string
    }) => {
      const res = await fetch('/api/projects/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Publish failed')
      }
      return res.json()
    },
  })
}

export function useRenderVideo() {
  return useMutation({
    mutationFn: async (projectId: string) => {
      const res = await fetch('/api/projects/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      if (!res.ok) throw new Error('Render failed')
      return res.json() as Promise<{ jobId: string; status: string }>
    },
  })
}

// hooks/useAI.ts
export function useGenerateScript() {
  return useMutation({
    mutationFn: async (payload: {
      concept: string
      numScenes?: number
      platform?: string
      style?: string
    }) => {
      const res = await fetch('/api/ai/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Script generation failed')
      return res.json()
    },
  })
}

export function useGenerateTTS() {
  return useMutation({
    mutationFn: async (payload: { text: string; voice?: string }) => {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('TTS generation failed')
      return res.json() as Promise<{ url: string; fileId: string }>
    },
  })
}

export function useGenerateImage() {
  return useMutation({
    mutationFn: async (payload: { prompt: string; aspectRatio?: string }) => {
      const res = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Image generation failed')
      return res.json() as Promise<{ url: string; fileId: string }>
    },
  })
}

export function useSuggestHashtags() {
  return useMutation({
    mutationFn: async (payload: { caption: string; platform?: string }) => {
      const res = await fetch('/api/ai/hashtags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Hashtag suggestion failed')
      return res.json() as Promise<{ hashtags: string[] }>
    },
  })
}
