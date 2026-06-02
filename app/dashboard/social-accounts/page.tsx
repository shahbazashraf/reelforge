// app/dashboard/social-accounts/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { PLATFORMS, getOAuthUrl } from '@/lib/platforms'
import type { SocialAccount } from '@/types'
import { toast } from 'sonner'

const PLATFORM_ORDER = ['instagram', 'tiktok', 'facebook', 'twitter', 'youtube', 'snapchat']

export default function SocialAccountsPage() {
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState<string | null>(null)

  const sb = createClient()

  useEffect(() => {
    loadAccounts()
    // Handle OAuth callback result
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    const platform = searchParams.get('platform')
    if (connected) toast.success(`${PLATFORMS[connected]?.label || connected} connected!`)
    if (error) toast.error(`Failed to connect ${platform ? PLATFORMS[platform]?.label : 'account'}. Please try again.`)
  }, [])

  async function loadAccounts() {
    setLoading(true)
    const { data, error } = await sb.from('social_accounts').select('*').order('created_at')
    if (!error) setAccounts(data as SocialAccount[])
    setLoading(false)
  }

  async function disconnect(account: SocialAccount) {
    setDisconnecting(account.id)
    const { error } = await sb.from('social_accounts').delete().eq('id', account.id)
    if (error) { toast.error('Failed to disconnect'); setDisconnecting(null); return }
    setAccounts(prev => prev.filter(a => a.id !== account.id))
    toast.success(`${PLATFORMS[account.platform]?.label} disconnected`)
    setDisconnecting(null)
  }

  async function refreshToken(account: SocialAccount) {
    setRefreshing(account.id)
    const res = await fetch(`/api/social/${account.platform}/refresh`, { method: 'POST' })
    if (res.ok) {
      await loadAccounts()
      toast.success('Token refreshed')
    } else {
      toast.error('Token refresh failed — reconnect your account')
    }
    setRefreshing(null)
  }

  const connectedPlatforms = new Set(accounts.map(a => a.platform))
  const connectedCount = connectedPlatforms.size

  return (
    <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>
              Social Accounts
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Connect your social accounts once. Publish to all platforms with one click.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
              borderRadius: 99, background: connectedCount > 0 ? 'var(--success-bg)' : 'var(--bg3)',
              border: `1px solid ${connectedCount > 0 ? 'rgba(34,197,94,0.2)' : 'var(--border-default)'}`,
              fontSize: 13, fontWeight: 600, color: connectedCount > 0 ? 'var(--success)' : 'var(--text-tertiary)',
            }}>
              <i className="ti ti-plug-connected" style={{ fontSize: 13 }} />
              {connectedCount} of 6 connected
            </div>
          </div>
        </div>
      </motion.div>

      {/* Security banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px',
          background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)',
          borderRadius: 12, marginBottom: 28,
        }}
      >
        <i className="ti ti-shield-check" style={{ fontSize: 20, color: 'var(--success)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)', marginBottom: 2 }}>
            Official OAuth 2.0 — Your passwords never touch our servers
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Tokens are encrypted at rest. Revoke access from your social platform settings anytime.
          </div>
        </div>
      </motion.div>

      {/* Platform grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        {PLATFORM_ORDER.map((platformId, i) => {
          const config = PLATFORMS[platformId]
          const account = accounts.find(a => a.platform === platformId)
          const isConnected = !!account
          const isError = account?.status === 'error' || account?.status === 'expired'
          const isTokenExpired = account?.token_expires
            ? new Date(account.token_expires) < new Date()
            : false

          return (
            <motion.div
              key={platformId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{
                background: 'var(--bg-surface)',
                border: `1px solid ${isError || isTokenExpired ? 'rgba(239,68,68,0.25)' : isConnected ? 'rgba(34,197,94,0.2)' : 'var(--border-subtle)'}`,
                borderRadius: 16, overflow: 'hidden',
              }}
            >
              {/* Card header */}
              <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Platform logo */}
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: config.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 21, flexShrink: 0,
                  boxShadow: isConnected ? `0 4px 16px ${config.color}30` : 'none',
                }}>
                  <i className={`ti ${config.icon}`} style={{ color: platformId === 'snapchat' ? '#000' : '#fff' }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{config.label}</div>
                  {isConnected
                    ? <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>@{account.username}</div>
                    : <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Not connected</div>
                  }
                </div>

                {/* Status badge */}
                {isConnected ? (
                  (isError || isTokenExpired) ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                      borderRadius: 99, background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.2)',
                      color: 'var(--danger)', fontSize: 11, fontWeight: 600,
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)' }} />
                      Token expired
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                      borderRadius: 99, background: 'var(--success-bg)', border: '1px solid rgba(34,197,94,0.2)',
                      color: 'var(--success)', fontSize: 11, fontWeight: 600,
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', animation: 'pulse 2s infinite' }} />
                      Live
                    </div>
                  )
                ) : null}
              </div>

              {/* Stats (if connected) */}
              {isConnected && !isError && !isTokenExpired && (
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 1, background: 'var(--border-subtle)',
                  borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)',
                }}>
                  {[
                    { label: 'Followers', value: account.followers > 0 ? (account.followers >= 1000 ? `${(account.followers/1000).toFixed(1)}K` : account.followers) : '—' },
                    { label: 'Formats', value: config.formats.join(', ') },
                    { label: 'Max Duration', value: `${config.maxDurationS}s` },
                  ].map(stat => (
                    <div key={stat.label} style={{ background: 'var(--bg-surface)', padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700 }}>{stat.value}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error banner */}
              {(isError || isTokenExpired) && account && (
                <div style={{
                  margin: '12px 16px', padding: '10px 12px',
                  background: 'var(--danger-bg)', borderRadius: 9,
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                }}>
                  <i className="ti ti-alert-triangle" style={{ color: 'var(--danger)', fontSize: 14, marginTop: 1, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger)', marginBottom: 2 }}>
                      {isTokenExpired ? 'Access token expired' : 'Authentication error'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      Reconnect this account to resume publishing.
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
                {!isConnected ? (
                  <a
                    href={getOAuthUrl(platformId)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '10px 16px', borderRadius: 9,
                      background: config.gradient, color: platformId === 'snapchat' ? '#000' : '#fff',
                      fontSize: 13, fontWeight: 600, textDecoration: 'none',
                      transition: 'opacity 0.15s, transform 0.15s',
                      boxShadow: `0 4px 14px ${config.color}30`,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                  >
                    <i className={`ti ${config.icon}`} style={{ fontSize: 15 }} />
                    Connect {config.label}
                  </a>
                ) : (
                  <>
                    {(isError || isTokenExpired) ? (
                      <a
                        href={getOAuthUrl(platformId)}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          padding: '9px 14px', borderRadius: 9,
                          background: 'var(--brand)', color: '#fff',
                          fontSize: 12, fontWeight: 600, textDecoration: 'none',
                        }}
                      >
                        <i className="ti ti-refresh" /> Reconnect
                      </a>
                    ) : (
                      <button
                        onClick={() => refreshToken(account)}
                        disabled={refreshing === account.id}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                          padding: '9px 14px', borderRadius: 9,
                          background: 'transparent', color: 'var(--text-secondary)',
                          border: '1px solid var(--border-default)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        }}
                      >
                        <i className={`ti ti-refresh ${refreshing === account.id ? 'animate-spin' : ''}`} style={{ fontSize: 13 }} />
                        {refreshing === account.id ? 'Refreshing...' : 'Refresh token'}
                      </button>
                    )}
                    <button
                      onClick={() => disconnect(account)}
                      disabled={disconnecting === account.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                        padding: '9px 14px', borderRadius: 9,
                        background: 'transparent', color: 'var(--danger)',
                        border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      }}
                    >
                      {disconnecting === account.id
                        ? <i className="ti ti-loader animate-spin" style={{ fontSize: 13 }} />
                        : <><i className="ti ti-unlink" style={{ fontSize: 13 }} /> Disconnect</>
                      }
                    </button>
                  </>
                )}
              </div>

              {/* Token expiry footer */}
              {account?.token_expires && !isTokenExpired && (
                <div style={{ padding: '0 16px 12px', fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <i className="ti ti-clock" style={{ fontSize: 11 }} />
                  Token expires: {new Date(account.token_expires).toLocaleDateString()}
                </div>
              )}
              {account && !account.token_expires && (
                <div style={{ padding: '0 16px 12px', fontSize: 11, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <i className="ti ti-check" style={{ fontSize: 11 }} />
                  Long-lived token — never expires
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Permissions info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          marginTop: 32, padding: '20px 24px',
          background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
          borderRadius: 14,
        }}
      >
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
          What we access
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { icon: 'ti-photo-up', label: 'Post content', desc: 'Publish photos, videos, reels on your behalf' },
            { icon: 'ti-chart-bar', label: 'Read insights', desc: 'View post analytics and engagement data' },
            { icon: 'ti-user', label: 'Basic profile', desc: 'Username, follower count, profile picture' },
          ].map(p => (
            <div key={p.label} style={{ display: 'flex', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--brand-dim)', color: 'var(--brand-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0,
              }}>
                <i className={`ti ${p.icon}`} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{p.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text-tertiary)' }}>
          We never post without your explicit action. We never access DMs, contacts, or financial data.
        </div>
      </motion.div>
    </div>
  )
}
