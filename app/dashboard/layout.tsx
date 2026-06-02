// app/dashboard/layout.tsx
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'

const NAV = [
  { href: '/dashboard/studio',          icon: 'ti-wand',            label: 'Studio',       sub: 'Create content' },
  { href: '/dashboard/projects',        icon: 'ti-layout-grid',     label: 'Projects',     sub: 'All your content' },
  { href: '/dashboard/analytics',       icon: 'ti-chart-bar',       label: 'Analytics',    sub: 'Views & reach' },
  { href: '/dashboard/social-accounts', icon: 'ti-plug-connected',  label: 'Accounts',     sub: 'Social connections' },
]

const BOTTOM_NAV = [
  { href: '/dashboard/settings',  icon: 'ti-settings',   label: 'Settings' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser] = useState<{ name: string; email: string; avatar?: string } | null>(null)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/auth/login'); return }
      setUser({
        name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
        email: data.user.email || '',
        avatar: data.user.user_metadata?.avatar_url,
      })
    })
  }, [router])

  const handleSignOut = async () => {
    const sb = createClient()
    await sb.auth.signOut()
    router.push('/')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 224 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        style={{
          background: 'var(--bg2)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '18px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #7C5CFC, #EC4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <i className="ti ti-sparkles" style={{ color: '#fff', fontSize: 17 }} />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}
              >
                Reel<span style={{ color: 'var(--brand-light)' }}>Forge</span>
              </motion.span>
            )}
          </AnimatePresence>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              marginLeft: 'auto', width: 26, height: 26, borderRadius: 7,
              background: 'none', border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <i className={`ti ${collapsed ? 'ti-layout-sidebar-right' : 'ti-layout-sidebar'}`} style={{ fontSize: 13 }} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map((item) => {
            const active = path === item.href || path.startsWith(item.href + '/')
            return (
              <Link href={item.href} key={item.href} style={{ textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ x: 2 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: collapsed ? '9px 10px' : '9px 12px',
                    borderRadius: 9, cursor: 'pointer',
                    background: active ? 'var(--brand-dim)' : 'transparent',
                    color: active ? 'var(--brand-light)' : 'var(--text-secondary)',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    transition: 'background 0.15s, color 0.15s',
                    position: 'relative',
                  }}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      style={{
                        position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                        width: 3, height: 18, borderRadius: 99,
                        background: 'var(--brand)',
                      }}
                    />
                  )}
                  <i className={`ti ${item.icon}`} style={{ fontSize: 17, width: 17, textAlign: 'center', flexShrink: 0 }} />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{ duration: 0.18 }}
                        style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border-subtle)' }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 9, cursor: 'pointer',
            }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--brand), var(--pink))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <AnimatePresence>
              {!collapsed && user && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ flex: 1, minWidth: 0 }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                </motion.div>
              )}
            </AnimatePresence>
            {!collapsed && (
              <button
                onClick={handleSignOut}
                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4, flexShrink: 0 }}
                title="Sign out"
              >
                <i className="ti ti-logout" style={{ fontSize: 14 }} />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <motion.div
          key={path}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          style={{ flex: 1, overflow: 'auto', height: '100%' }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
}
