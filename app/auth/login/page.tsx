// app/auth/login/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)

  const sb = createClient()

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard/studio')
  }

  async function handleOAuth(provider: 'google' | 'github') {
    setOauthLoading(provider)
    await sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 80% 60% at 20% 0%, rgba(124,92,252,0.18) 0%, transparent 60%), var(--bg)',
      padding: 20,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          width: '100%', maxWidth: 420,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '32px 32px 24px', textAlign: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #7C5CFC, #EC4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-sparkles" style={{ color: '#fff', fontSize: 22 }} />
          </div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Sign in to your ReelForge account</p>
        </div>

        <div style={{ padding: '24px 32px 32px' }}>
          {/* OAuth buttons */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {(['google', 'github'] as const).map(provider => (
              <button
                key={provider}
                onClick={() => handleOAuth(provider)}
                disabled={!!oauthLoading}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '10px 14px', borderRadius: 10,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {oauthLoading === provider
                  ? <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 15 }} />
                  : <i className={`ti ti-brand-${provider}`} style={{ fontSize: 16 }} />
                }
                {provider === 'google' ? 'Google' : 'GitHub'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, color: 'var(--text-tertiary)', fontSize: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            or continue with email
            <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          </div>

          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Email address
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@example.com"
                className="input-base"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Password</label>
                <a href="/auth/forgot-password" style={{ fontSize: 12, color: 'var(--brand-light)', textDecoration: 'none' }}>
                  Forgot password?
                </a>
              </div>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="input-base"
                style={{ width: '100%' }}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '10px 12px', borderRadius: 9,
                  background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.2)',
                  color: 'var(--danger)', fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <i className="ti ti-alert-circle" style={{ fontSize: 15, flexShrink: 0 }} />
                {error}
              </motion.div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: 10,
                background: 'var(--brand)', color: '#fff', border: 'none',
                fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 16px rgba(124,92,252,0.3)',
                transition: 'all 0.15s',
              }}
            >
              {loading
                ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> Signing in...</>
                : <><i className="ti ti-login" /> Sign in</>
              }
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', marginTop: 20 }}>
            No account?{' '}
            <a href="/auth/signup" style={{ color: 'var(--brand-light)', fontWeight: 600, textDecoration: 'none' }}>
              Sign up free
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
