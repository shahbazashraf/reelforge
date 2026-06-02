'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { PLATFORMS } from '@/lib/platforms'

const FEATURES = [
  { icon: 'ti-wand', color: '#7C5CFC', bg: 'rgba(124,92,252,0.15)', title: 'AI Script Engine', desc: 'Describe your concept — get a full script, scene captions, hashtag packs and image prompts in seconds.', tag: 'GPT-4o · Ollama · DeepSeek' },
  { icon: 'ti-microphone', color: '#14B8A6', bg: 'rgba(20,184,166,0.15)', title: 'AI Voiceover', desc: '50+ voices in 30+ languages. Free Edge-TTS included. Plug in ElevenLabs with one env var.', tag: 'Free Edge-TTS included' },
  { icon: 'ti-photo-film', color: '#EC4899', bg: 'rgba(236,72,153,0.15)', title: 'Images → Video', desc: 'Your photos become polished video with Ken Burns motion, smooth transitions and synced captions.', tag: 'FFmpeg · No upload limit' },
  { icon: 'ti-send', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', title: 'One-click Publish', desc: 'Publish simultaneously to Reels, TikTok, Facebook, Twitter, YouTube Shorts and Snapchat Stories.', tag: '6 platforms · OAuth 2.0' },
  { icon: 'ti-calendar-event', color: '#22C55E', bg: 'rgba(34,197,94,0.15)', title: 'Smart Scheduling', desc: 'AI picks the best post time per platform. Schedule your week in minutes.', tag: 'Best-time heatmaps' },
  { icon: 'ti-chart-bar', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', title: 'Unified Analytics', desc: 'Views, reach and engagement from every platform in one clean dashboard.', tag: 'Real-time · Cross-platform' },
]

const STEPS = [
  { n: '01', title: 'Upload or generate', desc: 'Upload your photos or use AI to generate scenes from a text prompt.' },
  { n: '02', title: 'Add audio & script', desc: 'Drop in music, generate AI voiceover, auto-caption every frame.' },
  { n: '03', title: 'Preview on device', desc: 'See exactly how it looks as a Reel, Feed post or Story.' },
  { n: '04', title: 'Publish everywhere', desc: 'One click pushes to Instagram, TikTok, Facebook, Twitter, YouTube, Snapchat.' },
]

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.4,0,0.2,1] } } }

export default function LandingPage() {
  const [navScrolled, setNavScrolled] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 400], [0, -60])

  useEffect(() => {
    const unsub = scrollY.on('change', v => setNavScrolled(v > 40))
    return unsub
  }, [scrollY])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', overflowX: 'hidden' }}>

      {/* Mesh background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 20% 0%,rgba(124,92,252,0.2) 0%,transparent 60%), radial-gradient(ellipse 60% 50% at 80% 100%,rgba(236,72,153,0.12) 0%,transparent 60%), #07070A' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)',
        backgroundSize: '56px 56px' }} />

      {/* NAV */}
      <motion.nav
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          height: 64, padding: '0 48px', display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: navScrolled ? 'rgba(7,7,10,0.95)' : 'rgba(7,7,10,0.6)',
          backdropFilter: 'blur(24px)',
          transition: 'background 0.3s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#7C5CFC,#EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-sparkles" style={{ color: '#fff', fontSize: 17 }} />
          </div>
          Reel<span style={{ background: 'linear-gradient(135deg,#9B80FF,#EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Forge</span>
        </div>
        <div style={{ display: 'flex', gap: 2, marginLeft: 20 }}>
          {['Features','How it works','Pricing'].map(l => (
            <button key={l} style={{ padding: '6px 14px', borderRadius: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <Link href="/auth/login" style={{ padding: '7px 16px', borderRadius: 9, background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
            Sign in
          </Link>
          <Link href="/auth/signup" style={{ padding: '7px 18px', borderRadius: 9, background: '#7C5CFC', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none', boxShadow: '0 0 20px rgba(124,92,252,0.35)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-sparkles" style={{ fontSize: 13 }} /> Get started free
          </Link>
        </div>
      </motion.nav>

      {/* HERO */}
      <motion.section ref={heroRef} style={{ y: heroY, position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 24px 60px', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 99, background: 'rgba(124,92,252,0.15)', border: '1px solid rgba(124,92,252,0.25)', color: '#9B80FF', fontSize: 13, fontWeight: 500, marginBottom: 32 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 0 3px rgba(34,197,94,0.2)' }} />
          AI script generation is live
          <i className="ti ti-arrow-right" style={{ fontSize: 12 }} />
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.55 }}
          style={{ fontFamily: 'Syne,sans-serif', fontSize: 'clamp(48px,8vw,92px)', fontWeight: 800, lineHeight: 1.04, letterSpacing: '-3px', marginBottom: 24 }}>
          Turn ideas into<br />
          <span style={{ background: 'linear-gradient(135deg,#9B80FF 0%,#EC4899 50%,#F59E0B 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>viral content</span><br />
          in minutes
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
          style={{ fontSize: 'clamp(16px,2vw,19px)', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 40px' }}>
          Upload images, add audio, let AI write your script — then publish to Instagram, TikTok, Facebook, Twitter and more with one click.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/auth/signup" style={{ padding: '14px 32px', borderRadius: 12, background: '#7C5CFC', color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 24px rgba(124,92,252,0.4)', fontFamily: 'Syne,sans-serif' }}>
            <i className="ti ti-rocket" /> Start creating free
          </Link>
          <Link href="/auth/login" style={{ padding: '14px 32px', borderRadius: 12, background: 'transparent', color: '#fff', fontSize: 15, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.12)' }}>
            <i className="ti ti-login" /> Sign in
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 18, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
          {['No credit card', 'No video model needed', 'Works instantly'].map(t => (
            <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="ti ti-check" style={{ color: '#22C55E', fontSize: 12 }} /> {t}
            </span>
          ))}
        </motion.div>

        {/* App window */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.7 }}
          style={{ position: 'relative', width: '100%', maxWidth: 880, margin: '64px auto 0' }}>
          <div style={{ position: 'absolute', inset: -60, background: 'radial-gradient(ellipse at center,rgba(124,92,252,0.2) 0%,transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', background: '#0F0F14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.8),inset 0 1px 0 rgba(255,255,255,0.06)' }}>
            {/* Titlebar */}
            <div style={{ height: 44, background: '#161620', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
              {['#FF5F57','#FFBD2E','#28C840'].map(c => <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />)}
              <div style={{ flex: 1, height: 22, background: '#1C1C28', borderRadius: 5, maxWidth: 300, margin: '0 auto' }} />
            </div>
            {/* App body */}
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 190px', minHeight: 300 }}>
              {/* Sidebar */}
              <div style={{ borderRight: '1px solid rgba(255,255,255,0.05)', padding: '14px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginBottom: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg,#7C5CFC,#EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="ti ti-sparkles" style={{ color: '#fff', fontSize: 13 }} /></div>
                  <span style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700 }}>ReelForge</span>
                </div>
                {[['ti-wand','Studio',true],['ti-layout-grid','Projects',false],['ti-send','Publish',false],['ti-plug-connected','Accounts',false],['ti-chart-bar','Analytics',false]].map(([icon,label,active]) => (
                  <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7, background: active ? 'rgba(124,92,252,0.15)' : 'transparent', color: active ? '#9B80FF' : 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 2 }}>
                    <i className={`ti ${icon}`} style={{ fontSize: 13 }} /> {label}
                  </div>
                ))}
              </div>
              {/* Center */}
              <div style={{ padding: 16, borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {[['#1a0533','#2d0a5e'],['#0a1a2e','#0d3a5c'],['#1a0e00','#3d2200'],['#001a10','#003d25']].map(([c1,c2],i) => (
                    <div key={i} style={{ width: 58, borderRadius: 7, border: `1.5px solid ${i===0?'#7C5CFC':'rgba(255,255,255,0.08)'}`, overflow: 'hidden' }}>
                      <div style={{ width: '100%', aspectRatio: '9/16', background: `linear-gradient(135deg,${c1},${c2})` }} />
                      <div style={{ padding: '3px 5px', fontSize: 9, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>0{i+1}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#161620', borderRadius: 8, padding: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 9, color: '#9B80FF', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}><i className="ti ti-sparkles" style={{ fontSize: 9 }} /> AI Caption</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>Start your morning like a CEO 🚀 These 6 habits changed everything...</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#161620', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(124,92,252,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="ti ti-music" style={{ fontSize: 10, color: '#9B80FF' }} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 500, marginBottom: 3 }}>Midnight Drive — Lo-fi</div>
                    <div style={{ display: 'flex', gap: 1.5, alignItems: 'center', height: 12 }}>
                      {[5,10,7,12,6,9,4,8].map((h,i) => <div key={i} style={{ width: 2, borderRadius: 1, background: '#7C5CFC', height: h, animation: `wave 0.9s ${i*0.1}s ease-in-out infinite` }} />)}
                    </div>
                  </div>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>0:42</span>
                </div>
              </div>
              {/* Phone preview */}
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', alignSelf: 'flex-start' }}>Live Preview</span>
                <div style={{ width: 96, borderRadius: 16, background: '#000', border: '1.5px solid #252535', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
                  <div style={{ aspectRatio: '9/16', background: 'linear-gradient(160deg,#1a0533,#2d0a5e 60%,#0d1a2e)', position: 'relative' }}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent,rgba(0,0,0,0.85))', padding: '10px 7px 9px' }}>
                      <div style={{ fontSize: 6, color: '#fff', lineHeight: 1.4 }}>Start your morning like a CEO 🚀</div>
                    </div>
                    <div style={{ position: 'absolute', right: 4, bottom: 28, display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
                      {[['ti-heart','12K'],['ti-message-circle','240'],['ti-share','']].map(([ic,v]) => (
                        <div key={ic} style={{ textAlign: 'center' }}><i className={`ti ${ic}`} style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)' }} />{v && <div style={{ fontSize: 5, color: 'rgba(255,255,255,0.6)' }}>{v}</div>}</div>
                      ))}
                    </div>
                  </div>
                </div>
                <button style={{ width: '100%', padding: 9, background: 'linear-gradient(135deg,#7C5CFC,#5B3FE0)', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'Syne,sans-serif', fontSize: 10, fontWeight: 700 }}>
                  Publish to 4 platforms
                </button>
                <div style={{ display: 'flex', gap: 5 }}>
                  {[{bg:'linear-gradient(135deg,#f09433,#dc2743,#bc1888)',ic:'ti-brand-instagram',c:'#fff'},{bg:'#000',ic:'ti-brand-tiktok',c:'#fff',border:'1px solid rgba(255,255,255,0.15)'},{bg:'#1877F2',ic:'ti-brand-facebook',c:'#fff'},{bg:'#1DA1F2',ic:'ti-brand-twitter',c:'#fff'}].map((p,i) => (
                    <div key={i} style={{ width: 20, height: 20, borderRadius: 6, background: p.bg, border: (p as any).border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className={`ti ${p.ic}`} style={{ fontSize: 10, color: p.c }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Platform pills */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} style={{ width: '100%', maxWidth: 880, marginTop: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 20 }}>Publish to all major platforms</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {Object.values(PLATFORMS).map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                <i className={`ti ${p.icon}`} style={{ fontSize: 15, color: p.color === '#ffffff' ? 'rgba(255,255,255,0.7)' : p.color }} />
                {p.label}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.section>

      {/* HOW IT WORKS */}
      <section style={{ position: 'relative', zIndex: 1, padding: '100px 48px', maxWidth: 1100, margin: '0 auto' }}>
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
          <motion.div variants={item} style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B80FF', marginBottom: 12 }}>How it works</div>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 'clamp(30px,4vw,52px)', fontWeight: 800, letterSpacing: '-1.5px' }}>Concept to posted in 4 steps</h2>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 40, left: '12.5%', right: '12.5%', height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.1) 20%,rgba(255,255,255,0.1) 80%,transparent)' }} />
            {STEPS.map((s, i) => (
              <motion.div key={s.n} variants={item} style={{ textAlign: 'center', padding: '0 20px' }}>
                <motion.div whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(124,92,252,0.4)' }}
                  style={{ width: 80, height: 80, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: '#0F0F14', margin: '0 auto 22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne,sans-serif', fontSize: 22, fontWeight: 800, color: '#9B80FF', position: 'relative', zIndex: 1, transition: 'all 0.3s' }}>
                  {s.n}
                </motion.div>
                <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 9 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>{s.desc}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* FEATURES */}
      <section style={{ position: 'relative', zIndex: 1, padding: '60px 48px 100px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)', marginBottom: 80 }} />
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          <motion.div variants={item} style={{ marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B80FF', marginBottom: 12 }}>Features</div>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 'clamp(30px,4vw,52px)', fontWeight: 800, letterSpacing: '-1.5px' }}>Everything you need<br />to create at scale</h2>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {FEATURES.map(f => (
              <motion.div key={f.title} variants={item} whileHover={{ y: -4, borderColor: 'rgba(255,255,255,0.14)' }}
                style={{ background: '#0F0F14', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 28, cursor: 'default', transition: 'all 0.25s' }}>
                <div style={{ width: 48, height: 48, borderRadius: 13, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: f.color, marginBottom: 18 }}>
                  <i className={`ti ${f.icon}`} />
                </div>
                <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, marginBottom: 14 }}>{f.desc}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 7, background: `${f.bg}`, color: f.color, fontSize: 11, fontWeight: 600 }}>{f.tag}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', zIndex: 1, padding: '0 48px 100px' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ maxWidth: 800, margin: '0 auto', background: 'linear-gradient(135deg,rgba(124,92,252,0.12),rgba(236,72,153,0.08))', border: '1px solid rgba(124,92,252,0.2)', borderRadius: 28, padding: '80px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: 320, height: 320, top: -120, left: -80, borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,92,252,0.2),transparent)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 280, height: 280, bottom: -100, right: -60, borderRadius: '50%', background: 'radial-gradient(circle,rgba(236,72,153,0.2),transparent)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 'clamp(32px,5vw,56px)', fontWeight: 800, letterSpacing: '-2px', marginBottom: 16 }}>Ready to go viral?</h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', maxWidth: 440, margin: '0 auto 36px', lineHeight: 1.7 }}>Join thousands of creators publishing smarter. No video editing skills required.</p>
            <Link href="/auth/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 12, background: '#7C5CFC', color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none', fontFamily: 'Syne,sans-serif', boxShadow: '0 4px 24px rgba(124,92,252,0.4)' }}>
              <i className="ti ti-rocket" /> Create your first reel — free
            </Link>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer style={{ position: 'relative', zIndex: 1, padding: '32px 48px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 16, fontWeight: 800, background: 'linear-gradient(135deg,#9B80FF,#EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ReelForge</div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Privacy','Terms','Docs','GitHub','Status'].map(l => <span key={l} style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>{l}</span>)}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>© 2026 ReelForge</div>
      </footer>

      <style>{`
        @keyframes wave { 0%,100%{transform:scaleY(0.35)} 50%{transform:scaleY(1)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
