'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { 
  Sparkles, 
  Wand2, 
  LayoutGrid, 
  BarChart2, 
  Plug, 
  Settings, 
  LogOut, 
  PanelLeftClose, 
  PanelLeftOpen 
} from 'lucide-react'

const NAV = [
  { href: '/dashboard/studio',          icon: Wand2,       label: 'Studio',       sub: 'Create content' },
  { href: '/dashboard/projects',        icon: LayoutGrid,  label: 'Projects',     sub: 'All your content' },
  { href: '/dashboard/analytics',       icon: BarChart2,   label: 'Analytics',    sub: 'Views & reach' },
  { href: '/dashboard/social-accounts', icon: Plug,        label: 'Accounts',     sub: 'Social connections' },
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
    <div className="flex h-screen overflow-hidden bg-[#FAF9F5] text-slate-800">

      {/* Sidebar container */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 240 }}
        transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
        className="bg-white border-r border-slate-200/60 flex flex-col h-full shrink-0 overflow-hidden shadow-sm"
      >
        {/* Sidebar Header (Logo) */}
        <div className="h-16 px-4 border-b border-slate-200/50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#E11D48] to-[#FB7185] flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="font-display text-base font-extrabold tracking-tight text-slate-900 truncate"
                >
                  Reel<span className="text-[#E11D48]">Forge</span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900 flex items-center justify-center shrink-0 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="p-3 flex-1 flex flex-col gap-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = path === item.href || path.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link href={item.href} key={item.href} className="no-underline">
                <motion.div
                  whileHover={{ x: 2 }}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-150 relative ${
                    active 
                      ? 'bg-rose-50 text-[#E11D48] font-semibold' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
                  }`}
                  style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                >
                  {active && (
                    <motion.div
                      layoutId="active-nav-line"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-[#E11D48]"
                    />
                  )}
                  <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-[#E11D48]' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{ duration: 0.15 }}
                        className="text-xs.5 truncate"
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

        {/* Sidebar Footer User profile */}
        <div className="p-3 border-t border-slate-200/50 bg-slate-50/40 shrink-0">
          <div className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-100/50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#E11D48] to-[#FB7185] flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            
            <AnimatePresence>
              {!collapsed && user && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <div className="text-[12px] font-bold text-slate-800 truncate">{user.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {!collapsed && (
              <button
                onClick={handleSignOut}
                className="p-1.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-white text-slate-400 hover:text-[#E11D48] transition-all cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content Workspace Container */}
      <main className="flex-1 overflow-hidden flex flex-col relative z-10">
        <motion.div
          key={path}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
          className="flex-1 overflow-auto h-full"
        >
          {children}
        </motion.div>
      </main>

    </div>
  )
}
