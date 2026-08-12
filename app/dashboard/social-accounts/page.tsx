// app/dashboard/social-accounts/page.tsx
'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { PLATFORMS, getOAuthUrl } from '@/lib/platforms'
import type { SocialAccount } from '@/types'
import { toast } from 'sonner'
import {
  Plug,
  ShieldCheck,
  RefreshCw,
  Unlink,
  AlertTriangle,
  Check,
  Clock,
  ImageUp,
  BarChart3,
  User,
  Loader2,
  ExternalLink,
} from 'lucide-react'

const PLATFORM_ORDER = ['instagram', 'tiktok', 'facebook', 'twitter', 'youtube', 'snapchat']

export default function SocialAccountsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-sm text-gray-400">Loading...</div>}>
      <SocialAccountsContent />
    </Suspense>
  )
}

function SocialAccountsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState<string | null>(null)

  const sb = createClient()

  useEffect(() => {
    loadAccounts()

    // Handle OAuth callback result (params set by callback route)
    const connected = searchParams.get('connected')
    const username = searchParams.get('username')
    const error = searchParams.get('error')
    const platform = searchParams.get('platform')

    if (connected) {
      const label = PLATFORMS[connected]?.label || connected
      const handle = username ? ` as @${username}` : ''
      toast.success(`${label} connected${handle}! ✓`)
    }
    if (error && error !== 'oauth_denied') {
      const raw = decodeURIComponent(error)
      const label = platform ? PLATFORMS[platform]?.label : 'account'
      const msg = raw.length < 120 ? raw : `Failed to connect ${label}. Check your Meta App settings.`
      toast.error(msg)
    } else if (error === 'oauth_denied') {
      toast.info('Connection cancelled.')
    }

    // Clean URL so params don't persist on page refresh
    if (connected || error) {
      router.replace('/dashboard/social-accounts', { scroll: false })
    }
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
    <div className="p-7 md:p-8 max-w-[960px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 mb-1.5">
              Social Accounts
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Connect your social accounts once. Publish to all platforms with one click.
            </p>
          </div>
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold border ${
            connectedCount > 0
              ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
              : 'bg-slate-50 border-slate-200 text-slate-400'
          }`}>
            <Plug className="w-3.5 h-3.5" />
            {connectedCount} of 6 connected
          </div>
        </div>
      </motion.div>

      {/* Security banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-4 px-5 py-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl mb-7"
      >
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-emerald-700 mb-0.5">
            Official OAuth 2.0 — Your passwords never touch our servers
          </div>
          <div className="text-xs text-slate-500">
            Tokens are encrypted at rest. Revoke access from your social platform settings anytime.
          </div>
        </div>
      </motion.div>

      {/* Platform grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              className={`bg-white rounded-2xl overflow-hidden shadow-sm border transition-colors ${
                isError || isTokenExpired
                  ? 'border-red-200'
                  : isConnected
                    ? 'border-emerald-200/60'
                    : 'border-slate-100'
              }`}
            >
              {/* Card header */}
              <div className="p-5 flex items-center gap-3.5">
                {/* Platform logo / avatar */}
                <div
                  className="w-11 h-11 rounded-xl shrink-0 overflow-hidden"
                  style={{
                    boxShadow: isConnected ? `0 4px 16px ${config.color}30` : 'none',
                  }}
                >
                  {isConnected && account.profile_pic ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={account.profile_pic}
                      alt={account.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-lg font-bold"
                      style={{
                        background: config.gradient,
                        color: platformId === 'snapchat' ? '#000' : '#fff',
                      }}
                    >
                      {config.label.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-slate-800">{config.label}</div>
                  {isConnected
                    ? <div className="text-xs text-slate-500">@{account.username}</div>
                    : <div className="text-xs text-slate-400">Not connected</div>
                  }
                </div>

                {/* Status badge */}
                {isConnected && (
                  (isError || isTokenExpired) ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-500 text-[11px] font-semibold">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      Token expired
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-[11px] font-semibold">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </div>
                  )
                )}
              </div>

              {/* Stats (if connected) */}
              {isConnected && !isError && !isTokenExpired && (
                <div className="grid grid-cols-3 border-t border-b border-slate-100">
                  {[
                    { label: 'Followers', value: account.followers > 0 ? (account.followers >= 1000 ? `${(account.followers/1000).toFixed(1)}K` : account.followers) : '—' },
                    { label: 'Formats', value: config.formats.join(', ') },
                    { label: 'Max Duration', value: `${config.maxDurationS}s` },
                  ].map(stat => (
                    <div key={stat.label} className="px-4 py-2.5 text-center">
                      <div className="font-display text-sm font-bold text-slate-800">{stat.value}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error banner */}
              {(isError || isTokenExpired) && account && (
                <div className="mx-4 my-3 px-3.5 py-2.5 bg-red-50 rounded-lg flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-red-600 mb-0.5">
                      {isTokenExpired ? 'Access token expired' : 'Authentication error'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Reconnect this account to resume publishing.
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="p-4 flex gap-2">
                {!isConnected ? (
                  <a
                    href={getOAuthUrl(platformId)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold no-underline shadow-sm hover:opacity-90 hover:-translate-y-0.5 transform transition-all duration-150"
                    style={{
                      background: config.gradient,
                      color: platformId === 'snapchat' ? '#000' : '#fff',
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Connect {config.label}
                  </a>
                ) : (
                  <>
                    {(isError || isTokenExpired) ? (
                      <a
                        href={getOAuthUrl(platformId)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#E11D48] text-white text-xs font-semibold no-underline hover:bg-[#BE123C] transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Reconnect
                      </a>
                    ) : (
                      <button
                        onClick={() => refreshToken(account)}
                        disabled={refreshing === account.id}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-transparent text-slate-500 border border-slate-200 text-xs font-medium cursor-pointer hover:bg-slate-50 hover:text-slate-700 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing === account.id ? 'animate-spin' : ''}`} />
                        {refreshing === account.id ? 'Refreshing...' : 'Refresh token'}
                      </button>
                    )}
                    <button
                      onClick={() => disconnect(account)}
                      disabled={disconnecting === account.id}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-transparent text-red-400 border border-red-200/60 text-xs font-medium cursor-pointer hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      {disconnecting === account.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <><Unlink className="w-3.5 h-3.5" /> Disconnect</>
                      }
                    </button>
                  </>
                )}
              </div>

              {/* Token expiry footer */}
              {account?.token_expires && !isTokenExpired && (
                <div className="px-4 pb-3 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Token expires: {new Date(account.token_expires).toLocaleDateString()}
                </div>
              )}
              {account && !account.token_expires && (
                <div className="px-4 pb-3 text-[11px] text-emerald-500 flex items-center gap-1.5">
                  <Check className="w-3 h-3" />
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
        className="mt-8 p-6 bg-white border border-slate-100 rounded-2xl shadow-sm"
      >
        <div className="font-display text-sm font-bold text-slate-800 mb-4">
          What we access
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: ImageUp, label: 'Post content', desc: 'Publish photos, videos, reels on your behalf' },
            { icon: BarChart3, label: 'Read insights', desc: 'View post analytics and engagement data' },
            { icon: User, label: 'Basic profile', desc: 'Username, follower count, profile picture' },
          ].map(p => {
            const Icon = p.icon
            return (
              <div key={p.label} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#E11D48] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-700">{p.label}</div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">{p.desc}</div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-4 text-[11px] text-slate-400">
          We never post without your explicit action. We never access DMs, contacts, or financial data.
        </div>
      </motion.div>
    </div>
  )
}
