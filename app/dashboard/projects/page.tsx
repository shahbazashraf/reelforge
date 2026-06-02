// app/dashboard/projects/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useProjects, useCreateProject, useDeleteProject } from '@/hooks/useProjects'
import { PLATFORMS } from '@/lib/platforms'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import type { Project } from '@/types'

const STATUS_CONFIG = {
  draft:      { label: 'Draft',      bg: 'var(--bg-overlay)',   color: 'var(--text-secondary)' },
  processing: { label: 'Rendering',  bg: 'var(--brand-dim)',    color: 'var(--brand-light)' },
  ready:      { label: 'Ready',      bg: 'var(--success-bg)',   color: 'var(--success)' },
  published:  { label: 'Published',  bg: 'var(--success-bg)',   color: 'var(--success)' },
  scheduled:  { label: 'Scheduled',  bg: 'var(--warning-bg)',   color: 'var(--warning)' },
}

export default function ProjectsPage() {
  const router = useRouter()
  const { data: projects, isLoading } = useProjects()
  const createProject = useCreateProject()
  const deleteProject = useDeleteProject()
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  async function handleCreate() {
    const p = await createProject.mutateAsync({ title: 'Untitled Project', status: 'draft', aspect_ratio: '9:16' })
    router.push(`/dashboard/studio?project=${p.id}`)
  }

  async function handleDelete(id: string) {
    await deleteProject.mutateAsync(id)
    setDeleteConfirm(null)
    toast.success('Project deleted')
  }

  const filtered = (projects || []).filter(p => {
    if (filter !== 'all' && p.status !== filter) return false
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const counts = (projects || []).reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>
            Projects
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {projects?.length || 0} total · {counts.published || 0} published
          </p>
        </div>
        <button
          onClick={handleCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            borderRadius: 10, background: 'var(--brand)', color: '#fff', border: 'none',
            fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(124,92,252,0.3)',
          }}
        >
          <i className="ti ti-plus" /> New Project
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{
          flex: 1, maxWidth: 280, display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
          borderRadius: 9, padding: '8px 12px',
        }}>
          <i className="ti ti-search" style={{ fontSize: 14, color: 'var(--text-tertiary)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..."
            style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { key: 'all', label: `All (${projects?.length || 0})` },
            { key: 'draft', label: `Draft (${counts.draft || 0})` },
            { key: 'published', label: `Published (${counts.published || 0})` },
            { key: 'scheduled', label: `Scheduled (${counts.scheduled || 0})` },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '7px 14px', borderRadius: 99, fontSize: 12, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s', border: 'none',
                background: filter === f.key ? 'var(--brand-dim)' : 'var(--bg-surface)',
                color: filter === f.key ? 'var(--brand-light)' : 'var(--text-secondary)',
                outline: filter === f.key ? '1px solid rgba(124,92,252,0.3)' : '1px solid var(--border-subtle)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ borderRadius: 14, overflow: 'hidden', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ aspectRatio: '16/9', background: 'linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-overlay) 50%, var(--bg-elevated) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
              <div style={{ padding: 14 }}>
                <div style={{ height: 14, borderRadius: 4, background: 'var(--bg-overlay)', marginBottom: 8 }} />
                <div style={{ height: 10, borderRadius: 4, background: 'var(--bg-overlay)', width: '60%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: '80px 20px' }}
        >
          <i className="ti ti-folder-off" style={{ fontSize: 48, color: 'var(--text-tertiary)', display: 'block', marginBottom: 16 }} />
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            {search ? 'No projects found' : 'No projects yet'}
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
            {search ? 'Try a different search term.' : 'Create your first reel and start publishing.'}
          </p>
          {!search && (
            <button onClick={handleCreate} style={{
              padding: '11px 24px', borderRadius: 10, background: 'var(--brand)',
              color: '#fff', border: 'none', fontFamily: 'Syne, sans-serif',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
              Create first project
            </button>
          )}
        </motion.div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <AnimatePresence>
            {filtered.map((project, i) => {
              const statusCfg = STATUS_CONFIG[project.status]
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                    borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                    transition: 'border-color 0.2s, transform 0.2s',
                  }}
                  whileHover={{ y: -3, borderColor: 'var(--border-strong)' }}
                  onClick={() => router.push(`/dashboard/studio?project=${project.id}`)}
                >
                  {/* Thumbnail */}
                  <div style={{ aspectRatio: '16/9', background: project.thumbnail_url ? `url(${project.thumbnail_url}) center/cover` : 'linear-gradient(135deg, var(--bg-elevated), var(--bg-overlay))', position: 'relative' }}>
                    {!project.thumbnail_url && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="ti ti-photo-film" style={{ fontSize: 28, color: 'var(--text-tertiary)' }} />
                      </div>
                    )}
                    <div style={{ position: 'absolute', top: 8, left: 8 }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: 6,
                        background: statusCfg.bg, color: statusCfg.color,
                        fontSize: 10, fontWeight: 700,
                      }}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 3 }}>
                      {project.publish_jobs?.slice(0, 4).map(job => {
                        const cfg = PLATFORMS[job.platform]
                        return cfg ? (
                          <div key={job.id} style={{
                            width: 18, height: 18, borderRadius: 5,
                            background: cfg.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <i className={`ti ${cfg.icon}`} style={{ fontSize: 9, color: job.platform === 'snapchat' ? '#000' : '#fff' }} />
                          </div>
                        ) : null
                      })}
                    </div>
                    {project.status === 'processing' && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                        <i className="ti ti-loader" style={{ fontSize: 28, color: 'var(--brand-light)', animation: 'spin 1s linear infinite' }} />
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {project.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text-tertiary)' }}>
                      <span><i className="ti ti-photo" style={{ fontSize: 11, marginRight: 3 }} />{project.scenes?.length || 0} scenes</span>
                      <span><i className="ti ti-aspect-ratio" style={{ fontSize: 11, marginRight: 3 }} />{project.aspect_ratio}</span>
                      {project.total_views > 0 && (
                        <span style={{ color: 'var(--success)' }}><i className="ti ti-eye" style={{ fontSize: 11, marginRight: 3 }} />{project.total_views.toLocaleString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ padding: '8px 14px 12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/dashboard/studio?project=${project.id}`)}
                        style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border-default)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
                      >
                        <i className="ti ti-edit" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(project.id)}
                        style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border-default)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
                      >
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* New project card */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.01 }}
            onClick={handleCreate}
            style={{
              background: 'transparent', border: '1.5px dashed var(--border-strong)',
              borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 8, minHeight: 180,
            }}
          >
            <i className="ti ti-plus" style={{ fontSize: 28, color: 'var(--text-tertiary)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>New Project</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>From scratch or template</span>
          </motion.div>
        </div>
      )}

      {/* Delete confirm modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteConfirm(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 16, padding: 28, maxWidth: 360, width: '100%' }}
            >
              <i className="ti ti-trash" style={{ fontSize: 32, color: 'var(--danger)', display: 'block', marginBottom: 14 }} />
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Delete project?</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
                This will permanently delete the project, all its scenes, audio, and publish history.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '10px', borderRadius: 9, background: 'none', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1, padding: '10px', borderRadius: 9, background: 'var(--danger)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
