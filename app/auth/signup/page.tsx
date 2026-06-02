'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const sb = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    const { error } = await sb.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard/studio')
  }

  async function handleOAuth(provider: 'google' | 'github') {
    setOauthLoading(provider)
    await sb.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/auth/callback` } })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse 80% 60% at 80% 0%,rgba(236,72,153,0.15) 0%,transparent 60%),#07070A', padding: 20 }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: 420, background: '#0F0F14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ padding: '32px 32px 24px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, margin: '0 auto 16px', background: 'linear-gradient(135deg,#7C5CFC,#EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-sparkles" style={{ color: '#fff', fontSize: 22 }} />
          </div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>Create your account</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Start publishing to all platforms for free</p>
        </div>

        <div style={{ padding: '24px 32px 32px' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {(['google','github'] as const).map(p => (
              <button key={p} onClick={() => handleOAuth(p)} disabled={!!oauthLoading}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: '#161620', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                {oauthLoading === p ? <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 15 }} /> : <i className={`ti ti-brand-${p}`} style={{ fontSize: 16 }} />}
                {p === 'google' ? 'Google' : 'GitHub'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} /> or <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
          </div>

          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Full name', val: name, set: setName, type: 'text', ph: 'Your name' },
              { label: 'Email address', val: email, set: setEmail, type: 'email', ph: 'you@example.com' },
              { label: 'Password', val: password, set: setPassword, type: 'password', ph: '8+ characters' },
            ].map(f => (
              <div key={f.label}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>{f.label}</label>
                <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} required placeholder={f.ph}
                  style={{ width: '100%', background: '#161620', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'DM Sans,sans-serif' }} />
              </div>
            ))}

            {error && (
              <div style={{ padding: '10px 12px', borderRadius: 9, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-alert-circle" style={{ fontSize: 15 }} /> {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: 12, borderRadius: 10, background: '#7C5CFC', color: '#fff', border: 'none', fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(124,92,252,0.3)', marginTop: 4 }}>
              {loading ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> Creating account...</> : <><i className="ti ti-user-plus" /> Create account</>}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 20 }}>
            Already have an account?{' '}
            <Link href="/auth/login" style={{ color: '#9B80FF', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
          <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 14 }}>
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </motion.div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
