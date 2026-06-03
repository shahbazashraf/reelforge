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
import {
  Plus,
  Search,
  FolderOpen,
  Image as ImageIcon,
  Ratio,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  draft:      { label: 'Draft',     classes: 'bg-slate-100 text-slate-600 border-slate-200' },
  processing: { label: 'Rendering', classes: 'bg-rose-50 text-rose-600 border-rose-200' },
  ready:      { label: 'Ready',     classes: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  published:  { label: 'Published', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  scheduled:  { label: 'Scheduled', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
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

  const filters = [
    { key: 'all', label: `All (${projects?.length || 0})` },
    { key: 'draft', label: `Draft (${counts.draft || 0})` },
    { key: 'published', label: `Published (${counts.published || 0})` },
    { key: 'scheduled', label: `Scheduled (${counts.scheduled || 0})` },
  ]

  return (
    <div className="p-7 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 mb-1">
            Projects
          </h1>
          <p className="text-sm text-slate-500">
            {projects?.length || 0} total · {counts.published || 0} published
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E11D48] text-white text-sm font-bold shadow-md hover:bg-[#BE123C] hover:shadow-lg hover:-translate-y-0.5 transform transition-all duration-150 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex-1 max-w-[280px] flex items-center gap-2 bg-white border border-slate-200/60 rounded-xl px-3.5 py-2.5 shadow-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="flex-1 bg-transparent border-none text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-1.5">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-150 border ${
                filter === f.key
                  ? 'bg-rose-50 text-[#E11D48] border-rose-200 font-semibold'
                  : 'bg-white text-slate-500 border-slate-200/60 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-sm">
              <div className="aspect-video skeleton" />
              <div className="p-4">
                <div className="h-4 rounded-md skeleton mb-2.5 w-3/4" />
                <div className="h-3 rounded-md skeleton w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20 px-5"
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
            <FolderOpen className="w-7 h-7 text-slate-400" />
          </div>
          <div className="font-display text-lg font-bold text-slate-800 mb-2">
            {search ? 'No projects found' : 'No projects yet'}
          </div>
          <p className="text-sm text-slate-500 mb-6">
            {search ? 'Try a different search term.' : 'Create your first reel and start publishing.'}
          </p>
          {!search && (
            <button
              onClick={handleCreate}
              className="px-6 py-2.5 rounded-xl bg-[#E11D48] text-white text-sm font-bold cursor-pointer hover:bg-[#BE123C] transition-colors shadow-md"
            >
              Create first project
            </button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((project, i) => {
              const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white border border-slate-100 rounded-2xl overflow-hidden cursor-pointer shadow-sm card-hover group"
                  onClick={() => router.push(`/dashboard/studio?project=${project.id}`)}
                >
                  {/* Thumbnail */}
                  <div
                    className="aspect-video bg-gradient-to-br from-slate-100 to-emerald-50 relative"
                    style={project.thumbnail_url ? { backgroundImage: `url(${project.thumbnail_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                  >
                    {!project.thumbnail_url && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ImageIcon className="w-7 h-7 text-slate-300" />
                      </div>
                    )}
                    <div className="absolute top-2.5 left-2.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusCfg.classes}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    {project.status === 'processing' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <Loader2 className="w-7 h-7 text-rose-400 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="px-4 py-3">
                    <div className="font-semibold text-sm text-slate-800 truncate mb-1.5 group-hover:text-[#E11D48] transition-colors">
                      {project.title}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" />{project.scenes?.length || 0} scenes</span>
                      <span className="flex items-center gap-1"><Ratio className="w-3.5 h-3.5" />{project.aspect_ratio}</span>
                      {project.total_views > 0 && (
                        <span className="flex items-center gap-1 text-emerald-500"><Eye className="w-3.5 h-3.5" />{project.total_views.toLocaleString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
                    </span>
                    <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/dashboard/studio?project=${project.id}`)}
                        className="w-7 h-7 rounded-lg border border-slate-200 bg-transparent text-slate-400 hover:text-[#E11D48] hover:border-rose-200 flex items-center justify-center transition-all cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(project.id)}
                        className="w-7 h-7 rounded-lg border border-slate-200 bg-transparent text-slate-400 hover:text-red-500 hover:border-red-200 flex items-center justify-center transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
            className="border-2 border-dashed border-rose-200/60 rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-2.5 min-h-[200px] hover:border-[#E11D48]/40 hover:bg-rose-50/30 transition-all duration-200"
          >
            <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center">
              <Plus className="w-5 h-5 text-[#E11D48]" />
            </div>
            <span className="text-sm font-semibold text-slate-600">New Project</span>
            <span className="text-xs text-slate-400">From scratch or template</span>
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200]"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white border border-slate-200 rounded-2xl p-7 max-w-[360px] w-full shadow-xl"
            >
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <div className="font-display text-lg font-bold text-slate-900 mb-2">Delete project?</div>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                This will permanently delete the project, all its scenes, audio, and publish history.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl bg-transparent border border-slate-200 text-slate-600 text-sm font-medium cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 border-none text-white text-sm font-semibold cursor-pointer hover:bg-red-600 transition-colors"
                >
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
