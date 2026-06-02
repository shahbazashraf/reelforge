// store/index.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project, Scene, AudioTrack, SocialAccount } from '@/types'

// ── Auth store ─────────────────────────────────────────────────────────────
interface AuthState {
  user: { id: string; email: string; name: string; avatar?: string } | null
  setUser: (user: AuthState['user']) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    { name: 'rf-auth' }
  )
)

// ── Studio store ───────────────────────────────────────────────────────────
interface StudioState {
  // Current project being edited
  projectId: string | null
  title: string
  aspectRatio: '9:16' | '1:1' | '16:9' | '4:5'
  caption: string
  hashtags: string
  scenes: Scene[]
  audioTracks: AudioTrack[]

  // UI state
  activeSceneIndex: number
  selectedPlatforms: string[]
  isRendering: boolean
  renderProgress: number
  outputUrl: string | null

  // Actions
  setProject: (id: string) => void
  setTitle: (title: string) => void
  setAspectRatio: (ar: StudioState['aspectRatio']) => void
  setCaption: (caption: string) => void
  setHashtags: (hashtags: string) => void
  setScenes: (scenes: Scene[]) => void
  addScene: (scene: Scene) => void
  updateScene: (id: string, updates: Partial<Scene>) => void
  removeScene: (id: string) => void
  reorderScenes: (scenes: Scene[]) => void
  setAudioTracks: (tracks: AudioTrack[]) => void
  addAudioTrack: (track: AudioTrack) => void
  removeAudioTrack: (id: string) => void
  updateAudioTrack: (id: string, updates: Partial<AudioTrack>) => void
  setActiveScene: (index: number) => void
  togglePlatform: (platform: string) => void
  setRendering: (is: boolean) => void
  setRenderProgress: (p: number) => void
  setOutputUrl: (url: string | null) => void
  resetStudio: () => void
}

const defaultStudio = {
  projectId: null,
  title: 'Untitled Project',
  aspectRatio: '9:16' as const,
  caption: '',
  hashtags: '',
  scenes: [],
  audioTracks: [],
  activeSceneIndex: 0,
  selectedPlatforms: ['instagram', 'tiktok'],
  isRendering: false,
  renderProgress: 0,
  outputUrl: null,
}

export const useStudioStore = create<StudioState>()((set) => ({
  ...defaultStudio,

  setProject: (id) => set({ projectId: id }),
  setTitle: (title) => set({ title }),
  setAspectRatio: (aspectRatio) => set({ aspectRatio }),
  setCaption: (caption) => set({ caption }),
  setHashtags: (hashtags) => set({ hashtags }),
  setScenes: (scenes) => set({ scenes }),
  addScene: (scene) => set((s) => ({ scenes: [...s.scenes, scene] })),
  updateScene: (id, updates) =>
    set((s) => ({ scenes: s.scenes.map((sc) => (sc.id === id ? { ...sc, ...updates } : sc)) })),
  removeScene: (id) => set((s) => ({ scenes: s.scenes.filter((sc) => sc.id !== id) })),
  reorderScenes: (scenes) => set({ scenes }),
  setAudioTracks: (audioTracks) => set({ audioTracks }),
  addAudioTrack: (track) => set((s) => ({ audioTracks: [...s.audioTracks, track] })),
  removeAudioTrack: (id) =>
    set((s) => ({ audioTracks: s.audioTracks.filter((t) => t.id !== id) })),
  updateAudioTrack: (id, updates) =>
    set((s) => ({
      audioTracks: s.audioTracks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  setActiveScene: (activeSceneIndex) => set({ activeSceneIndex }),
  togglePlatform: (platform) =>
    set((s) => ({
      selectedPlatforms: s.selectedPlatforms.includes(platform)
        ? s.selectedPlatforms.filter((p) => p !== platform)
        : [...s.selectedPlatforms, platform],
    })),
  setRendering: (isRendering) => set({ isRendering }),
  setRenderProgress: (renderProgress) => set({ renderProgress }),
  setOutputUrl: (outputUrl) => set({ outputUrl }),
  resetStudio: () => set(defaultStudio),
}))

// ── Social accounts store ──────────────────────────────────────────────────
interface SocialState {
  accounts: SocialAccount[]
  setAccounts: (accounts: SocialAccount[]) => void
  upsertAccount: (account: SocialAccount) => void
  removeAccount: (id: string) => void
  getByPlatform: (platform: string) => SocialAccount | undefined
}

export const useSocialStore = create<SocialState>()((set, get) => ({
  accounts: [],
  setAccounts: (accounts) => set({ accounts }),
  upsertAccount: (account) =>
    set((s) => {
      const exists = s.accounts.find((a) => a.id === account.id)
      return {
        accounts: exists
          ? s.accounts.map((a) => (a.id === account.id ? account : a))
          : [...s.accounts, account],
      }
    }),
  removeAccount: (id) => set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })),
  getByPlatform: (platform) => get().accounts.find((a) => a.platform === platform),
}))

// ── UI store ───────────────────────────────────────────────────────────────
interface UIState {
  sidebarOpen: boolean
  commandPaletteOpen: boolean
  activeToast: { message: string; type: 'success' | 'error' | 'info' } | null
  setSidebarOpen: (open: boolean) => void
  setCommandPalette: (open: boolean) => void
  showToast: (message: string, type?: UIState['activeToast']['type']) => void
  clearToast: () => void
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  commandPaletteOpen: false,
  activeToast: null,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setCommandPalette: (commandPaletteOpen) => set({ commandPaletteOpen }),
  showToast: (message, type = 'info') => set({ activeToast: { message, type } }),
  clearToast: () => set({ activeToast: null }),
}))
