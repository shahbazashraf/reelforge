'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { PLATFORMS } from '@/lib/platforms'
import {
  Eye,
  Send,
  Plug,
  Clock,
  Lightbulb,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react'

interface Stats { totalViews: number; totalPosts: number; platforms: Record<string,number>; recentJobs: any[] }

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats>({ totalViews: 0, totalPosts: 0, platforms: {}, recentJobs: [] })
  const [loading, setLoading] = useState(true)
  const sb = createClient()

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    setLoading(true)
    const { data: projects } = await sb.from('projects').select('total_views,publish_jobs(*)')
    const { data: jobs } = await sb.from('publish_jobs').select('*').order('created_at', { ascending: false }).limit(20)

    const totalViews = (projects || []).reduce((a, p) => a + (p.total_views || 0), 0)
    const totalPosts = (jobs || []).filter(j => j.status === 'published').length
    const platforms: Record<string,number> = {}
    ;(jobs || []).filter(j => j.status === 'published').forEach(j => { platforms[j.platform] = (platforms[j.platform] || 0) + 1 })

    setStats({ totalViews, totalPosts, platforms, recentJobs: jobs || [] })
    setLoading(false)
  }

  const statCards = [
    { label: 'Total Views', value: stats.totalViews >= 1000 ? `${(stats.totalViews/1000).toFixed(1)}K` : stats.totalViews, icon: Eye, iconColor: 'text-[#E11D48]', iconBg: 'bg-rose-50' },
    { label: 'Posts Published', value: stats.totalPosts, icon: Send, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50' },
    { label: 'Platforms Active', value: Object.keys(stats.platforms).length, icon: Plug, iconColor: 'text-amber-600', iconBg: 'bg-amber-50' },
    { label: 'Pending Jobs', value: stats.recentJobs.filter(j=>j.status==='pending'||j.status==='processing').length, icon: Clock, iconColor: 'text-blue-600', iconBg: 'bg-blue-50' },
  ]

  const STATUS_STYLES: Record<string, string> = {
    published: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    pending: 'bg-amber-50 text-amber-600 border-amber-200',
    processing: 'bg-rose-50 text-rose-500 border-rose-200',
    failed: 'bg-red-50 text-red-500 border-red-200',
    cancelled: 'bg-slate-100 text-slate-400 border-slate-200',
  }

  return (
    <div className="p-7 md:p-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 mb-1.5">Analytics</h1>
        <p className="text-sm text-slate-500">Cross-platform performance overview</p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {statCards.map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-display text-3xl font-extrabold tracking-tight text-slate-900">
                    {loading ? '—' : s.value}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{s.label}</div>
                </div>
                <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${s.iconColor}`} />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Platform breakdown + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-7">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm"
        >
          <div className="font-display text-sm font-bold text-slate-800 mb-5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#E11D48]" />
            Posts by platform
          </div>
          {Object.keys(stats.platforms).length === 0
            ? <div className="text-sm text-slate-400 text-center py-8">No published posts yet</div>
            : Object.entries(PLATFORMS).map(([id, cfg]) => {
                const count = stats.platforms[id] || 0
                const max = Math.max(...Object.values(stats.platforms), 1)
                return (
                  <div key={id} className="flex items-center gap-3 mb-3 last:mb-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs text-white font-bold"
                      style={{ background: cfg.gradient }}
                    >
                      {cfg.label.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-medium text-slate-700">{cfg.label}</span>
                        <span className="text-xs text-slate-400">{count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(count/max)*100}%` }}
                          transition={{ delay: 0.5, duration: 0.7 }}
                          className="h-full rounded-full"
                          style={{ background: cfg.gradient }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })
          }
        </motion.div>

        {/* Recent activity */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm"
        >
          <div className="font-display text-sm font-bold text-slate-800 mb-5 flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            Recent publish jobs
          </div>
          {stats.recentJobs.length === 0
            ? <div className="text-sm text-slate-400 text-center py-8">No jobs yet — publish your first project</div>
            : <div className="space-y-0">
                {stats.recentJobs.slice(0,8).map(job => {
                  const cfg = PLATFORMS[job.platform]
                  const statusClass = STATUS_STYLES[job.status] || STATUS_STYLES.cancelled
                  return (
                    <div key={job.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100/60 last:border-0">
                      {cfg && (
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[9px] text-white font-bold"
                          style={{ background: cfg.gradient }}
                        >
                          {cfg.label.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-700 truncate">{cfg?.label || job.platform}</div>
                        <div className="text-[10px] text-slate-400">{new Date(job.created_at).toLocaleDateString()}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize border ${statusClass}`}>
                        {job.status}
                      </span>
                    </div>
                  )
                })}
              </div>
          }
        </motion.div>
      </div>

      {/* Tip */}
      <div className="flex gap-3 p-4 bg-rose-50/60 border border-rose-100 rounded-xl items-start">
        <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
          <Lightbulb className="w-4 h-4 text-[#E11D48]" />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-800 mb-1">Connect more platforms to see richer analytics</div>
          <div className="text-xs text-slate-500 leading-relaxed">
            Real engagement data (likes, comments, reach) is pulled directly from each platform&apos;s API. Go to{' '}
            <a href="/dashboard/social-accounts" className="text-[#E11D48] hover:underline font-medium">Social Accounts</a>{' '}
            to connect Instagram, TikTok, Facebook and more.
          </div>
        </div>
      </div>
    </div>
  )
}
