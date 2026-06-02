// hooks/useProjects.ts
'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import type { Project, Scene, AudioTrack } from '@/types'

const sb = () => createClient()

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await sb()
        .from('projects')
        .select('*, scenes(*), audio_tracks(*), publish_jobs(*)')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data as Project[]
    },
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const { data, error } = await sb()
        .from('projects')
        .select('*, scenes(*), audio_tracks(*), publish_jobs(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Project
    },
    enabled: !!id,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Project>) => {
      const { data: project, error } = await sb()
        .from('projects')
        .insert(data)
        .select()
        .single()
      if (error) throw error
      return project as Project
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { data, error } = await sb()
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Project
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['projects', data.id] })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from('projects').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

// Scenes
export function useUpsertScene() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (scene: Partial<Scene> & { project_id: string }) => {
      const { data, error } = await sb()
        .from('scenes')
        .upsert(scene, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      return data as Scene
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['projects', data.project_id] }),
  })
}

export function useDeleteScene() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await sb().from('scenes').delete().eq('id', id)
      if (error) throw error
      return projectId
    },
    onSuccess: (projectId) => qc.invalidateQueries({ queryKey: ['projects', projectId] }),
  })
}

// Audio tracks
export function useUpsertAudio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (track: Partial<AudioTrack> & { project_id: string }) => {
      const { data, error } = await sb()
        .from('audio_tracks')
        .upsert(track, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      return data as AudioTrack
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['projects', data.project_id] }),
  })
}
