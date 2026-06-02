'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { PLATFORMS } from '@/lib/platforms'

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
    { label: 'Total Views', value: stats.totalViews >= 1000 ? `${(stats.totalViews/1000).toFixed(1)}K` : stats.totalViews, icon: 'ti-eye', color: '#7C5CFC', bg: 'rgba(124,92,252,0.15)' },
    { label: 'Posts Published', value: stats.totalPosts, icon: 'ti-send', color: '#22C55E', bg: 'rgba(34,197,94,0.15)' },
    { label: 'Platforms Active', value: Object.keys(stats.platforms).length, icon: 'ti-plug-connected', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
    { label: 'Pending Jobs', value: stats.recentJobs.filter(j=>j.status==='pending'||j.status==='processing').length, icon: 'ti-clock', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  ]

  const STATUS_COLOR: Record<string,string> = { published: '#22C55E', pending: '#F59E0B', processing: '#9B80FF', failed: '#EF4444', cancelled: 'rgba(255,255,255,0.3)' }

  return (
    <div style={{ padding: '28px 32px' }}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>Analytics</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Cross-platform performance overview</p>
      </motion.div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 28, fontWeight: 800, letterSpacing: '-1px' }}>{loading ? '—' : s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{s.label}</div>
              </div>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: s.color }}>
                <i className={`ti ${s.icon}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Platform breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 20 }}>
          <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 18 }}>Posts by platform</div>
          {Object.keys(stats.platforms).length === 0
            ? <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0' }}>No published posts yet</div>
            : Object.entries(PLATFORMS).map(([id, cfg]) => {
                const count = stats.platforms[id] || 0
                const max = Math.max(...Object.values(stats.platforms), 1)
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: cfg.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`ti ${cfg.icon}`} style={{ fontSize: 12, color: id==='snapchat'?'#000':'#fff' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{cfg.label}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{count}</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--bg-overlay)', borderRadius: 2 }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(count/max)*100}%` }} transition={{ delay: 0.5, duration: 0.7 }}
                          style={{ height: '100%', borderRadius: 2, background: cfg.color === '#ffffff' ? 'rgba(255,255,255,0.5)' : cfg.color }} />
                      </div>
                    </div>
                  </div>
                )
              })
          }
        </motion.div>

        {/* Recent activity */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 20 }}>
          <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 18 }}>Recent publish jobs</div>
          {stats.recentJobs.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0' }}>No jobs yet — publish your first project</div>
            : stats.recentJobs.slice(0,8).map(job => {
                const cfg = PLATFORMS[job.platform]
                return (
                  <div key={job.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    {cfg && <div style={{ width: 22, height: 22, borderRadius: 6, background: cfg.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`ti ${cfg.icon}`} style={{ fontSize: 10, color: job.platform==='snapchat'?'#000':'#fff' }} />
                    </div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cfg?.label || job.platform}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{new Date(job.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 99, background: `${STATUS_COLOR[job.status]}18`, color: STATUS_COLOR[job.status] || 'var(--text-tertiary)', fontSize: 10, fontWeight: 700 }}>
                      {job.status}
                    </div>
                  </div>
                )
              })
          }
        </motion.div>
      </div>

      {/* Tip */}
      <div style={{ padding: '16px 20px', background: 'var(--brand-dim)', border: '1px solid rgba(124,92,252,0.2)', borderRadius: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <i className="ti ti-bulb" style={{ fontSize: 18, color: 'var(--brand-light)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Connect more platforms to see richer analytics</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Real engagement data (likes, comments, reach) is pulled directly from each platform's API. Go to{' '}
            <a href="/dashboard/social-accounts" style={{ color: 'var(--brand-light)' }}>Social Accounts</a>{' '}
            to connect Instagram, TikTok, Facebook and more.
          </div>
        </div>
      </div>
    </div>
  )
}
