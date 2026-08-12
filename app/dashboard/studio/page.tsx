'use client'
import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'
import { PLATFORMS, ASPECT_RATIOS, TTS_VOICES } from '@/lib/platforms'
import { useStudioStore } from '@/store'
import type { Scene, AudioTrack } from '@/types'

const TRANSITIONS = ['fade','slide','zoom','none']
const DURATIONS = [3000,4000,5000,6000,7000,8000,10000]

export default function StudioPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>Loading studio...</div>}>
      <StudioContent />
    </Suspense>
  )
}

function StudioContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const projectId = searchParams.get('project')
  const store = useStudioStore()
  const sb = createClient()

  // Local UI state
  const [saving, setSaving] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [uploadingScene, setUploadingScene] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [scheduleAt, setScheduleAt] = useState('')
  const [activeTab, setActiveTab] = useState<'scenes'|'audio'|'captions'|'subtitles'>('scenes')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)

  // Load project if ID passed
  useEffect(() => {
    if (projectId) loadProject(projectId)
    else store.resetStudio()
  }, [projectId])

  async function loadProject(id: string) {
    const { data, error } = await sb.from('projects').select('*,scenes(*),audio_tracks(*)').eq('id', id).single()
    if (error) { toast.error('Project not found'); return }
    store.setProject(id)
    store.setTitle(data.title)
    store.setAspectRatio(data.aspect_ratio)
    store.setCaption(data.caption || '')
    store.setHashtags(data.hashtags || '')
    store.setScenes((data.scenes as Scene[]).sort((a,b) => a.order - b.order))
    store.setAudioTracks(data.audio_tracks as AudioTrack[])
  }

  // Auto-save debounced
  const saveProject = useCallback(async () => {
    setSaving(true)
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { setSaving(false); return }

    let id: string | null = store.projectId
    if (!id) {
      const { data } = await sb.from('projects').insert({ user_id: user.id, title: store.title, aspect_ratio: store.aspectRatio, caption: store.caption, hashtags: store.hashtags, status: 'draft' }).select().single()
      if (data) { id = data.id; store.setProject(id as string) }
    } else {
      await sb.from('projects').update({ title: store.title, aspect_ratio: store.aspectRatio, caption: store.caption, hashtags: store.hashtags, updated_at: new Date().toISOString() }).eq('id', id)
    }

    if (id) {
      // Upsert all scenes
      for (const scene of store.scenes) {
        await sb.from('scenes').upsert({ ...scene, project_id: id }, { onConflict: 'id' })
      }
      // Upsert audio tracks
      for (const track of store.audioTracks) {
        await sb.from('audio_tracks').upsert({ ...track, project_id: id }, { onConflict: 'id' })
      }
    }
    setSaving(false)
    toast.success('Saved')
  }, [store, sb])

  // Upload image for scene
  async function handleImageUpload(files: FileList | null) {
    if (!files?.length) return
    setUploadingScene(true)
    for (const file of Array.from(files)) {
      const form = new FormData()
      form.append('file', file)
      form.append('bucket', 'media')
      const res = await fetch('/api/media/upload', { method: 'POST', body: form })
      if (!res.ok) { toast.error(`Failed to upload ${file.name}`); continue }
      const { url } = await res.json()
      const newScene: Scene = {
        id: crypto.randomUUID(),
        project_id: store.projectId || '',
        order: store.scenes.length,
        image_url: url,
        text: '',
        duration_ms: 5000,
        transition: 'fade',
        ai_prompt: null,
        created_at: new Date().toISOString(),
      }
      store.addScene(newScene)
    }
    setUploadingScene(false)
    toast.success(`${files.length} scene${files.length > 1 ? 's' : ''} added`)
  }

  // Upload audio
  async function handleAudioUpload(files: FileList | null) {
    if (!files?.length) return
    for (const file of Array.from(files)) {
      const form = new FormData()
      form.append('file', file)
      form.append('bucket', 'media')
      const res = await fetch('/api/media/upload', { method: 'POST', body: form })
      if (!res.ok) { toast.error(`Failed to upload ${file.name}`); continue }
      const { url } = await res.json()
      const track: AudioTrack = {
        id: crypto.randomUUID(),
        project_id: store.projectId || '',
        type: 'music',
        name: file.name.replace(/\.[^.]+$/, ''),
        url,
        start_ms: 0,
        volume: 0.8,
        loop: true,
        created_at: new Date().toISOString(),
      }
      store.addAudioTrack(track)
    }
    toast.success('Audio added')
  }

  // AI script generation
  async function generateScript() {
    if (!aiPrompt.trim()) { toast.error('Enter a concept first'); return }
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept: aiPrompt, numScenes: 6, platform: store.selectedPlatforms[0] || 'instagram' }),
      })
      const { script } = await res.json()
      if (script) {
        store.setTitle(script.title)
        store.setCaption(script.caption)
        store.setHashtags(script.hashtags)
        // Update scene texts
        script.scenes.forEach((s: any, i: number) => {
          if (store.scenes[i]) store.updateScene(store.scenes[i].id, { text: s.text, ai_prompt: s.image_prompt })
        })
        toast.success('Script generated!')
      }
    } catch { toast.error('Script generation failed') }
    setAiLoading(false)
  }

  // Suggest hashtags
  async function suggestHashtags() {
    if (!store.caption) { toast.error('Add a caption first'); return }
    const res = await fetch('/api/ai/hashtags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caption: store.caption, platform: store.selectedPlatforms[0] || 'instagram' }) })
    const { hashtags } = await res.json()
    if (hashtags?.length) { store.setHashtags(hashtags.join(' ')); toast.success('Hashtags suggested') }
  }

  // Publish
  async function handlePublish() {
    if (!store.projectId) { toast.error('Save project first'); await saveProject(); return }
    if (!store.selectedPlatforms.length) { toast.error('Select at least one platform'); return }
    if (!store.scenes.length) { toast.error('Add at least one scene'); return }
    setPublishing(true)
    try {
      await saveProject()
      const res = await fetch('/api/projects/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: store.projectId, platforms: store.selectedPlatforms, scheduledAt: scheduleAt || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(scheduleAt ? `Scheduled for ${new Date(scheduleAt).toLocaleString()}` : `Publishing to ${data.jobCount} platform${data.jobCount > 1 ? 's' : ''}...`)
      router.push('/dashboard/projects')
    } catch (e: any) {
      toast.error(e.message || 'Publish failed')
    }
    setPublishing(false)
  }

  // Render and Download
  const [rendering, setRendering] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  async function handleRender() {
    if (!store.projectId) { toast.error('Save project first'); await saveProject(); return }
    if (!store.scenes.length) { toast.error('Add at least one scene'); return }
    setRendering(true)
    setDownloadUrl(null)
    try {
      await saveProject()
      const res = await fetch('/api/projects/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: store.projectId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Rendering started — generating TTS and assembling video...')

      const jobId = data.jobId
      let pollCount = 0
      const interval = setInterval(async () => {
        pollCount++
        if (pollCount > 120) {
          clearInterval(interval)
          setRendering(false)
          toast.error('Render timed out after 6 minutes. Check backend logs.')
          return
        }
        try {
          const statusRes = await fetch(`/api/projects/render/${jobId}`)
          if (statusRes.ok) {
            const statusData = await statusRes.json()
            if (statusData.status === 'ready' && statusData.download_url) {
              clearInterval(interval)
              setRendering(false)
              setDownloadUrl(statusData.download_url)
              toast.success('Video ready for download!')
            } else if (statusData.status === 'error') {
              clearInterval(interval)
              setRendering(false)
              toast.error(statusData.error || 'Render failed')
            }
          }
        } catch (e) {}
      }, 3000)
    } catch (e: any) {
      toast.error(e.message || 'Render failed')
      setRendering(false)
    }
  }

  const activeScene = store.scenes[store.activeSceneIndex]
  const totalDuration = store.scenes.reduce((a, s) => a + s.duration_ms, 0)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--bg-base)' }}>

      {/* ── LEFT PANEL ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border-subtle)' }}>

        {/* Topbar */}
        <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', flexShrink: 0 }}>
          <input value={store.title} onChange={e => store.setTitle(e.target.value)}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, outline: 'none', fontFamily: 'Syne,sans-serif', flex: 1, minWidth: 0 }}
            placeholder="Untitled Project" />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{store.scenes.length} scenes · {Math.round(totalDuration/1000)}s</span>
            <button onClick={saveProject} disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'none', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
              {saving ? <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 13 }} /> : <i className="ti ti-device-floppy" style={{ fontSize: 13 }} />}
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Format + platform row */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {Object.entries(ASPECT_RATIOS).map(([ratio, cfg]) => (
              <button key={ratio} onClick={() => store.setAspectRatio(ratio as any)}
                style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${store.aspectRatio === ratio ? 'var(--brand)' : 'var(--border-default)'}`, background: store.aspectRatio === ratio ? 'var(--brand-dim)' : 'transparent', color: store.aspectRatio === ratio ? 'var(--brand-light)' : 'var(--text-secondary)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                {ratio}
              </button>
            ))}
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--border-default)' }} />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.values(PLATFORMS).map(p => {
              const on = store.selectedPlatforms.includes(p.id)
              return (
                <button key={p.id} onClick={() => store.togglePlatform(p.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, border: `1px solid ${on ? p.color + '40' : 'var(--border-subtle)'}`, background: on ? p.color + '18' : 'transparent', color: on ? p.color : 'var(--text-tertiary)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                  <i className={`ti ${p.icon}`} style={{ fontSize: 12 }} /> {p.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', flexShrink: 0 }}>
          {[['scenes','Scenes','ti-photo-film'],['audio','Audio','ti-music'],['captions','Captions','ti-text-size'],['subtitles','Subtitles','ti-closed-caption']].map(([k,l,ic]) => (
            <button key={k} onClick={() => setActiveTab(k as any)}
              style={{ padding: '10px 18px', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab===k?'var(--brand)':'transparent'}`, color: activeTab===k?'var(--brand-light)':'var(--text-secondary)', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className={`ti ${ic}`} style={{ fontSize: 13 }} /> {l}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>

          {/* AI prompt bar - always visible */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 9, padding: '8px 12px' }}>
              <i className="ti ti-sparkles" style={{ fontSize: 14, color: 'var(--brand-light)', flexShrink: 0 }} />
              <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyDown={e => e.key==='Enter' && generateScript()}
                placeholder="Describe your content concept... (press Enter)"
                style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'DM Sans,sans-serif' }} />
            </div>
            <button onClick={generateScript} disabled={aiLoading}
              style={{ padding: '8px 16px', borderRadius: 9, background: 'var(--brand)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              {aiLoading ? <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 13 }} /> : <i className="ti ti-wand" style={{ fontSize: 13 }} />}
              {aiLoading ? 'Generating...' : 'Generate'}
            </button>
          </div>

          {/* SCENES TAB */}
          <AnimatePresence mode="wait">
          {activeTab === 'scenes' && (
            <motion.div key="scenes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Upload zone */}
              <input ref={fileInputRef} type="file" accept="image/*,video/mp4" multiple style={{ display: 'none' }} onChange={e => handleImageUpload(e.target.files)} />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleImageUpload(e.dataTransfer.files) }}
                style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 12, padding: '24px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 16, background: 'var(--bg-elevated)', transition: 'all 0.2s' }}
              >
                {uploadingScene
                  ? <><i className="ti ti-loader" style={{ fontSize: 24, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite', color: 'var(--brand-light)' }} /><span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Uploading...</span></>
                  : <><i className="ti ti-cloud-upload" style={{ fontSize: 26, display: 'block', marginBottom: 8, color: 'var(--text-tertiary)' }} /><strong style={{ fontSize: 13 }}>Drop images or videos</strong><p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>JPG, PNG, MP4 · up to 50MB each · multiple OK</p></>
                }
              </div>

              {/* Scene cards */}
              {store.scenes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>
                  Upload images above to add scenes
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {store.scenes.map((scene, i) => (
                    <motion.div key={scene.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      style={{ display: 'flex', gap: 10, padding: 12, borderRadius: 12, background: store.activeSceneIndex===i ? 'var(--brand-dim)' : 'var(--bg-elevated)', border: `1px solid ${store.activeSceneIndex===i?'rgba(124,92,252,0.3)':'var(--border-subtle)'}`, cursor: 'pointer' }}
                      onClick={() => store.setActiveScene(i)}>
                      {/* Thumb */}
                      <div style={{ width: 48, aspectRatio: '9/16', borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-overlay)' }}>
                        {scene.image_url && <img src={scene.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)' }}>Scene {String(i+1).padStart(2,'0')}</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <select value={scene.transition} onChange={e => store.updateScene(scene.id, { transition: e.target.value as any })}
                              style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)', borderRadius: 5, color: 'var(--text-secondary)', fontSize: 10, padding: '2px 4px' }}>
                              {TRANSITIONS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <select value={scene.duration_ms} onChange={e => store.updateScene(scene.id, { duration_ms: +e.target.value })}
                              style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)', borderRadius: 5, color: 'var(--text-secondary)', fontSize: 10, padding: '2px 4px' }}>
                              {DURATIONS.map(d => <option key={d} value={d}>{d/1000}s</option>)}
                            </select>
                          </div>
                        </div>
                        <input value={scene.text || ''} onChange={e => store.updateScene(scene.id, { text: e.target.value })}
                          placeholder="Scene text / caption overlay..."
                          style={{ width: '100%', background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)', borderRadius: 7, padding: '6px 10px', color: 'var(--text-primary)', fontSize: 12, outline: 'none', fontFamily: 'DM Sans,sans-serif' }} />
                      </div>
                      <button onClick={e => { e.stopPropagation(); store.removeScene(scene.id) }}
                        style={{ width: 28, height: 28, borderRadius: 7, background: 'none', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="ti ti-trash" style={{ fontSize: 12 }} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* AUDIO TAB */}
          {activeTab === 'audio' && (
            <motion.div key="audio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <input ref={audioInputRef} type="file" accept="audio/*" multiple style={{ display: 'none' }} onChange={e => handleAudioUpload(e.target.files)} />
              <div onClick={() => audioInputRef.current?.click()}
                style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 12, padding: '24px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 16, background: 'var(--bg-elevated)' }}>
                <i className="ti ti-file-music" style={{ fontSize: 26, display: 'block', marginBottom: 8, color: 'var(--text-tertiary)' }} />
                <strong style={{ fontSize: 13 }}>Upload audio tracks</strong>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>MP3, WAV, AAC · Background music or voiceover</p>
              </div>
              {store.audioTracks.map(track => (
                <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: track.type==='music'?'rgba(124,92,252,0.2)':'rgba(20,184,166,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`ti ${track.type==='music'?'ti-music':'ti-microphone'}`} style={{ fontSize: 16, color: track.type==='music'?'var(--brand-light)':'var(--teal, #14B8A6)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.name}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                      <select value={track.type} onChange={e => store.updateAudioTrack(track.id, { type: e.target.value as any })}
                        style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)', borderRadius: 5, color: 'var(--text-secondary)', fontSize: 10, padding: '2px 6px' }}>
                        {['music','voice','sfx'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input type="range" min={0} max={1} step={0.05} value={track.volume} onChange={e => store.updateAudioTrack(track.id, { volume: +e.target.value })}
                        style={{ flex: 1, accentColor: 'var(--brand)' }} />
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{Math.round(track.volume*100)}%</span>
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={track.loop} onChange={e => store.updateAudioTrack(track.id, { loop: e.target.checked })} /> Loop
                  </label>
                  <button onClick={() => store.removeAudioTrack(track.id)} style={{ width: 28, height: 28, borderRadius: 7, background: 'none', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="ti ti-trash" style={{ fontSize: 12 }} />
                  </button>
                </div>
              ))}
              {store.audioTracks.length === 0 && <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>No audio tracks yet</div>}
            </motion.div>
          )}

          {/* CAPTIONS TAB */}
          {activeTab === 'captions' && (
            <motion.div key="captions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Post caption</label>
                <textarea value={store.caption} onChange={e => store.setCaption(e.target.value)} rows={4} placeholder="Write your post caption with emojis..."
                  style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 9, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'DM Sans,sans-serif', lineHeight: 1.6 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: store.caption.length>2200?'var(--danger)':'var(--text-tertiary)' }}>{store.caption.length} / 2200</span>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Hashtags</label>
                  <button onClick={suggestHashtags} style={{ fontSize: 11, color: 'var(--brand-light)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <i className="ti ti-sparkles" style={{ fontSize: 12 }} /> AI suggest
                  </button>
                </div>
                <input value={store.hashtags} onChange={e => store.setHashtags(e.target.value)} placeholder="#morning #motivation #entrepreneur ..."
                  style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 9, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'DM Sans,sans-serif' }} />
              </div>
            </motion.div>
          )}

          {/* SUBTITLES TAB */}
          {activeTab === 'subtitles' && (
            <motion.div key="subtitles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <p style={{ marginBottom: 16 }}>Subtitles are generated from your scene text overlays during video rendering. Each scene's text field becomes a timed caption.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Bold Centered','Bottom Bar','Word-by-word Karaoke','Top Banner','No subtitles'].map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 9, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {s === 'Bold Centered' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand)' }} />}
                    </div>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── RIGHT PANEL — Preview + Publish ── */}
      <div style={{ width: 300, display: 'flex', flexDirection: 'column', overflow: 'auto', background: 'var(--bg-surface)' }}>

        {/* Phone preview */}
        <div style={{ padding: '16px 16px 0', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>PREVIEW</div>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 0 16px' }}>
            <div style={{ width: 140, borderRadius: 24, background: '#000', border: '2px solid #2A2A38', overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.7)' }}>
              <div style={{ aspectRatio: '9/16', position: 'relative', overflow: 'hidden', background: 'var(--bg-overlay)' }}>
                {activeScene?.image_url
                  ? <img src={activeScene.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1a0533,#2d0a5e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="ti ti-photo" style={{ fontSize: 28, color: 'rgba(255,255,255,0.15)' }} />
                    </div>
                }
                {activeScene?.text && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent,rgba(0,0,0,0.85))', padding: '18px 10px 12px' }}>
                    <div style={{ fontSize: 8, color: '#fff', lineHeight: 1.5, fontWeight: 600 }}>{activeScene.text}</div>
                  </div>
                )}
                <div style={{ position: 'absolute', right: 6, bottom: 36, display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'center' }}>
                  {[['ti-heart','12K'],['ti-message-circle','240'],['ti-share','']].map(([ic,v]) => (
                    <div key={ic} style={{ textAlign: 'center' }}>
                      <i className={`ti ${ic}`} style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)' }} />
                      {v && <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.7)' }}>{v}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Publish panel */}
        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>PUBLISH TO</div>
          {Object.values(PLATFORMS).map(p => {
            const on = store.selectedPlatforms.includes(p.id)
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: 'var(--bg-elevated)', border: `1px solid ${on?p.color+'30':'var(--border-subtle)'}` }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: p.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ti ${p.icon}`} style={{ fontSize: 13, color: p.id==='snapchat'?'#000':'#fff' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{p.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{store.aspectRatio} · {p.maxDurationS}s max</div>
                </div>
                <div onClick={() => store.togglePlatform(p.id)} style={{ width: 32, height: 18, borderRadius: 99, background: on?'var(--brand)':'var(--bg-overlay)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', width: 14, height: 14, top: 2, left: on?16:2, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </div>
              </div>
            )
          })}

          {/* Schedule */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>SCHEDULE (optional)</label>
            <input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-primary)', fontSize: 12, outline: 'none' }} />
          </div>

          {/* Render and Download */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            {!downloadUrl ? (
              <motion.button
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                onClick={handleRender}
                disabled={rendering}
                style={{ flex: 1, padding: '13px', borderRadius: 11, background: rendering?'var(--bg-overlay)':'var(--bg-elevated)', color: rendering?'var(--text-tertiary)':'var(--text-primary)', border: '1px solid var(--border-strong)', fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, cursor: rendering?'not-allowed':'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {rendering
                  ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> Rendering...</>
                  : <><i className="ti ti-movie" /> Render Video</>
                }
              </motion.button>
            ) : (
              <motion.a
                href={downloadUrl}
                download
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                style={{ flex: 1, textDecoration: 'none', padding: '13px', borderRadius: 11, background: 'var(--teal, #14B8A6)', color: '#fff', border: 'none', fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <i className="ti ti-download" /> Download Video
              </motion.a>
            )}
          </div>

          {/* Publish button */}
          <motion.button
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            onClick={handlePublish}
            disabled={publishing || !store.selectedPlatforms.length}
            style={{ width: '100%', padding: '13px', borderRadius: 11, background: publishing?'#5B3FE0':'linear-gradient(135deg,var(--brand),#5B3FE0)', color: '#fff', border: 'none', fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 800, cursor: publishing?'not-allowed':'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(124,92,252,0.35)' }}>
            {publishing
              ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> Publishing...</>
              : scheduleAt
              ? <><i className="ti ti-calendar-clock" /> Schedule Post</>
              : <><i className="ti ti-send" /> Publish Now — {store.selectedPlatforms.length} platform{store.selectedPlatforms.length !== 1 ? 's' : ''}</>
            }
          </motion.button>

          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.5 }}>
            Video renders server-side with FFmpeg after publish. You'll receive a notification when live.
          </p>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
