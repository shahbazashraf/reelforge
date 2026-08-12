'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { PLATFORMS } from '@/lib/platforms'
import { 
  Sparkles, 
  Wand2, 
  Mic, 
  Film, 
  Send, 
  Calendar, 
  BarChart2, 
  Check, 
  ArrowRight, 
  Play, 
  Rocket, 
  ShieldCheck, 
  Lock, 
  RefreshCw, 
  Unlink, 
  Plus, 
  X, 
  Heart, 
  MessageCircle, 
  Share2,
  AlertCircle
} from 'lucide-react'

const FEATURES = [
  { icon: Wand2, color: '#E11D48', bg: 'rgba(225,29,72,0.06)', title: 'AI Script Engine', desc: 'Describe your concept — get a full script, scene captions, hashtag packs and image prompts in seconds.', tag: 'GPT-4o · Gemini · DeepSeek' },
  { icon: Mic, color: '#10B981', bg: 'rgba(16,185,129,0.06)', title: 'AI Voiceover', desc: '50+ voices in 30+ languages. Free Edge-TTS included. Plug in ElevenLabs with one env var.', tag: 'Free Edge-TTS included' },
  { icon: Film, color: '#8B5CF6', bg: 'rgba(139,92,246,0.06)', title: 'Images → Video', desc: 'Your photos become polished video with Ken Burns motion, smooth transitions and synced captions.', tag: 'FFmpeg · No upload limit' },
  { icon: Send, color: '#3B82F6', bg: 'rgba(59,130,246,0.06)', title: 'One-click Publish', desc: 'Publish simultaneously to Reels, TikTok, Facebook, Twitter, YouTube Shorts and Snapchat Stories.', tag: '6 platforms · OAuth 2.0' },
  { icon: Calendar, color: '#F59E0B', bg: 'rgba(245,158,11,0.06)', title: 'Smart Scheduling', desc: 'AI picks the best post time per platform. Schedule your week in minutes.', tag: 'Best-time heatmaps' },
  { icon: BarChart2, color: '#EC4899', bg: 'rgba(236,72,153,0.06)', title: 'Unified Analytics', desc: 'Views, reach and engagement from every platform in one clean dashboard.', tag: 'Real-time · Cross-platform' },
]

const STEPS = [
  { n: '01', title: 'Upload or generate', desc: 'Upload your photos or use AI to generate scenes from a text prompt.' },
  { n: '02', title: 'Add audio & script', desc: 'Drop in music, generate AI voiceover, auto-caption every frame.' },
  { n: '03', title: 'Preview on device', desc: 'See exactly how it looks as a Reel, Feed post or Story.' },
  { n: '04', title: 'Publish everywhere', desc: 'One click pushes to Instagram, TikTok, Facebook, Twitter, YouTube, Snapchat.' },
]

const CONTAINER_VARIANTS = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } }
}

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1] } }
}

export default function LandingPage() {
  const [navScrolled, setNavScrolled] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [demoPlaying, setDemoPlaying] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setNavScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-900 overflow-x-hidden font-sans relative">
      
      {/* Background Mesh Overlays */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,rgba(16,185,129,0.08)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_100%,rgba(225,29,72_0.06)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:56px_56px]" />
      </div>

      {/* Floating Header Navbar */}
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 h-16 px-6 md:px-12 flex items-center justify-between border-b border-slate-200/50 transition-all duration-300 ${
          navScrolled ? 'bg-[#FAF9F5]/90 backdrop-blur-md shadow-sm' : 'bg-transparent'
        }`}
      >
        <div className="flex items-center gap-8">
          <Link href="#" className="flex items-center gap-2.5 text-slate-900 hover:opacity-90 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#E11D48] to-[#FB7185] flex items-center justify-center shadow-md">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-display text-lg font-extrabold tracking-tight">
              Reel<span className="text-[#E11D48]">Forge</span>
            </span>
          </Link>
          <div className="hidden md:flex gap-1">
            <button onClick={() => scrollToSection('how-it-works')} className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/40 text-sm font-medium transition-all">How it works</button>
            <button onClick={() => scrollToSection('features')} className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/40 text-sm font-medium transition-all">Features</button>
            <button onClick={() => scrollToSection('connect')} className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/40 text-sm font-medium transition-all">Platforms</button>
            <button onClick={() => scrollToSection('pricing')} className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/40 text-sm font-medium transition-all">Pricing</button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 text-sm font-semibold transition-all">
            Sign in
          </Link>
          <Link href="/auth/signup" className="px-4.5 py-2.5 rounded-xl bg-[#E11D48] text-white hover:bg-[#BE123C] text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 hover:-translate-y-0.5 transform duration-150">
            <Sparkles className="w-3.5 h-3.5" /> Get started free
          </Link>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 pt-28 pb-16 text-center max-w-5xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 12 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/60 border border-emerald-200/50 text-emerald-800 text-xs font-semibold mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          AI Script & Image Generation is Live
          <ArrowRight className="w-3 h-3 ml-0.5" />
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 16 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1, duration: 0.5 }}
          className="font-display text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-none text-slate-950 mb-6"
        >
          Turn ideas into<br />
          <span className="bg-gradient-to-r from-[#E11D48] via-[#F43F5E] to-[#10B981] bg-clip-text text-transparent">viral social reels</span><br />
          in minutes
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 16 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Upload your photos, write a quick concept, let OpenRouter AI craft your script — then publish to Instagram, TikTok, Facebook, Twitter, and YouTube with one click.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 12 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.3 }}
          className="flex flex-wrap gap-4 justify-center items-center mb-6"
        >
          <Link href="/auth/signup" className="px-7 py-3.5 rounded-xl bg-[#E11D48] text-white hover:bg-[#BE123C] text-base font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 hover:-translate-y-0.5 transform duration-150 font-display">
            <Rocket className="w-4 h-4" /> Start creating free
          </Link>
          <button 
            onClick={() => setDemoPlaying(!demoPlaying)} 
            className="px-7 py-3.5 rounded-xl bg-white border border-emerald-100 hover:border-emerald-300 text-slate-700 hover:text-slate-900 text-base font-bold shadow-sm hover:shadow transition-all flex items-center gap-2"
          >
            <Play className="w-4 h-4 text-emerald-500 fill-emerald-500" /> Watch demo
          </button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.4 }}
          className="flex flex-wrap justify-center gap-6 text-xs font-semibold text-slate-500 mb-16"
        >
          {['No credit card required', 'Ollama & OpenRouter Supported', 'Instant direct scheduling'].map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-500" /> {t}
            </span>
          ))}
        </motion.div>

        {/* Video / Application Interface Preview Window */}
        <motion.div 
          initial={{ opacity: 0, y: 24 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.5, duration: 0.6 }}
          className="w-full max-w-4xl relative"
        >
          <div className="absolute -inset-10 bg-radial-gradient(circle,rgba(16,185,129,0.08),transparent) pointer-events-none z-0" />
          <div className="relative bg-white border border-emerald-100/80 rounded-2xl overflow-hidden shadow-xl">
            
            {/* Window title bar */}
            <div className="h-10 bg-slate-50 border-b border-slate-100 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="flex-1 max-w-[240px] h-5 bg-slate-200/50 rounded-md mx-auto" />
            </div>

            {/* Application Mockup Layout */}
            <div className="grid grid-cols-1 md:grid-cols-4 min-h-[380px] text-left">
              
              {/* Mockup Sidebar */}
              <div className="border-r border-slate-100 p-4 bg-slate-50/50 hidden md:block">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-[#E11D48] to-[#FB7185] flex items-center justify-center"><Sparkles className="w-3 h-3 text-white" /></div>
                  <span className="font-display font-bold text-xs tracking-tight">ReelForge Studio</span>
                </div>
                <div className="flex flex-col gap-1">
                  {([['Wand2','Studio',true],['Film','Projects',false],['Send','Publish',false],['BarChart2','Analytics',false]] as [string,string,boolean][]).map(([iconName,label,active]) => {
                    const Icon = iconName === 'Wand2' ? Wand2 : iconName === 'Film' ? Film : iconName === 'Send' ? Send : BarChart2
                    return (
                      <div key={label} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                        active ? 'bg-rose-50 text-[#E11D48]' : 'text-slate-500 hover:text-slate-900'
                      }`}>
                        <Icon className="w-4 h-4" /> {label}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Mockup Editor Center */}
              <div className="col-span-2 p-5 border-r border-slate-100 flex flex-col justify-between">
                <div>
                  <div className="flex gap-2 mb-5">
                    {[1, 2, 3, 4].map(idx => (
                      <div key={idx} className={`w-14 rounded-lg border-2 ${idx === 1 ? 'border-[#E11D48]' : 'border-slate-100'} overflow-hidden relative shadow-sm`}>
                        <div className="w-full aspect-[9/16] bg-slate-100" />
                        <div className="text-[9px] text-center py-0.5 bg-slate-50 font-bold text-slate-500">0{idx}</div>
                      </div>
                    ))}
                    <div className="w-14 aspect-[9/16] rounded-lg border border-dashed border-slate-200 flex items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <Plus className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4.5 border border-slate-100 mb-4">
                    <div className="text-[10px] font-bold text-[#E11D48] mb-1.5 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> AI Script Idea</div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">Start your morning like a successful CEO 🚀 Here are the 3 habits that changed my productivity forever...</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-emerald-50/60 border border-emerald-100/80 rounded-xl p-3.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Mic className="w-5 h-5 text-emerald-600" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800">Midnight Lo-fi Beats</div>
                    <div className="flex gap-1 items-center h-4 mt-1">
                      {[3, 6, 8, 4, 10, 5, 9, 3, 7].map((h, i) => (
                        <div key={i} className="w-[3px] rounded-full bg-emerald-500" style={{ height: `${h * 10}%` }} />
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">0:30</span>
                </div>
              </div>

              {/* Mockup Preview Panel */}
              <div className="p-5 flex flex-col items-center justify-between bg-slate-50/30">
                <div className="w-full">
                  <div className="text-[10px] font-bold text-slate-400 tracking-wider mb-3">LIVE PHONE PREVIEW</div>
                  <div className="w-28 rounded-2xl bg-slate-950 p-1 mx-auto shadow-md border border-slate-800">
                    <div className="aspect-[9/16] rounded-xl relative overflow-hidden bg-gradient-to-b from-[#1E1B4B] to-slate-900">
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2.5 text-[7px] text-white font-medium leading-relaxed">
                        Start your morning like a successful CEO 🚀
                      </div>
                      <div className="absolute right-2 bottom-6 flex flex-col gap-1.5 items-center">
                        <Heart className="w-3.5 h-3.5 text-white fill-white" />
                        <span className="text-[5px] text-white/80 font-bold mb-1">12K</span>
                        <MessageCircle className="w-3.5 h-3.5 text-white fill-white" />
                        <span className="text-[5px] text-white/80 font-bold">240</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button className="w-full py-2.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-bold tracking-tight shadow-md hover:shadow transition-all">
                  Publish to 4 platforms
                </button>
              </div>

            </div>
          </div>
        </motion.div>
      </section>

      {/* Logos Strip */}
      <section className="relative z-10 border-t border-slate-200/50 py-12 max-w-5xl mx-auto px-6">
        <div className="text-center text-xs font-bold tracking-wider text-slate-400 uppercase mb-6">DIRECT SOCIAL PLATFORM SYNCING</div>
        <div className="flex flex-wrap gap-3.5 justify-center items-center">
          {Object.values(PLATFORMS).map(p => (
            <div key={p.id} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-slate-200/60 shadow-sm text-slate-700 text-sm font-semibold hover:border-slate-300 hover:text-slate-900 transition-all cursor-default">
              <span style={{ color: p.color === '#ffffff' ? '#000000' : p.color }}>
                <Sparkles className="w-4.5 h-4.5" />
              </span>
              {p.label}
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative z-10 border-t border-slate-200/50 py-24 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-widest text-[#E11D48] uppercase">Step-by-step Process</span>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950 mt-2">From concept to viral in 4 steps</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          <div className="absolute top-12 left-1/8 right-1/8 h-0.5 bg-gradient-to-r from-transparent via-slate-200 to-transparent hidden lg:block z-0" />
          {STEPS.map((s, idx) => (
            <div key={s.n} className="flex flex-col items-center text-center relative z-10 group">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm group-hover:border-[#E11D48] group-hover:shadow transition-all duration-300 flex items-center justify-center text-xl font-display font-extrabold text-[#E11D48] mb-6">
                {s.n}
              </div>
              <h3 className="font-display font-bold text-base text-slate-900 mb-2">{s.title}</h3>
              <p className="text-xs.5 text-slate-500 leading-relaxed max-w-[200px]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="relative z-10 border-t border-slate-200/50 py-24 px-6 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <span className="text-xs font-bold tracking-widest text-[#E11D48] uppercase">Feature Matrix</span>
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950 mt-2 leading-tight">Everything you need<br />to create at scale</h2>
          </div>
          <Link href="/auth/signup" className="px-5 py-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 text-sm font-bold shadow-sm transition-all flex items-center gap-1.5 group">
            Try it for free <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(f => {
            const Icon = f.icon
            return (
              <div key={f.title} className="p-7 rounded-2xl bg-white border border-slate-200/70 hover:border-[#E11D48] shadow-sm hover:shadow transition-all duration-300 flex flex-col justify-between items-start group">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-105 transition-all duration-300" style={{ backgroundColor: f.bg, color: f.color }}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-base text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-xs.5 text-slate-500 leading-relaxed mb-6">{f.desc}</p>
                </div>
                <div className="inline-flex text-[10px] font-bold px-2.5 py-1 rounded-md text-slate-600 group-hover:text-[#E11D48] transition-colors" style={{ backgroundColor: f.bg }}>
                  {f.tag}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Connect Platform Accounts section */}
      <section id="connect" className="relative z-10 border-t border-slate-200/50 bg-white py-24 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-xs font-bold tracking-widest text-[#E11D48] uppercase">Secure Integrations</span>
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950 mt-2 mb-6">Connect once.<br />Publish everywhere.</h2>
            <p className="text-slate-600 text-sm leading-relaxed mb-8 max-w-md">
              Securely link your accounts using official platform OAuth 2.0 logins. Your passwords never touch our servers, and API access tokens are encrypted with AES-256 at rest.
            </p>
            
            <div className="flex flex-col gap-3">
              {[
                { icon: ShieldCheck, text: 'Official platform API endpoints only' },
                { icon: Lock, text: 'AES-256 token encryption at rest' },
                { icon: RefreshCw, text: 'Auto token refresh, zero session interruption' },
                { icon: Unlink, text: 'Revoke access instantly anytime' },
              ].map((item, idx) => {
                const Icon = item.icon
                return (
                  <div key={idx} className="flex items-center gap-3 text-xs.5 font-semibold text-slate-600">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center"><Icon className="w-3.5 h-3.5 text-emerald-600" /></div>
                    {item.text}
                  </div>
                )
              })}
            </div>

            <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 mt-8 hover:-translate-y-0.5 transform duration-150">
              <Sparkles className="w-4.5 h-4.5" /> Connect your accounts
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {Object.values(PLATFORMS).map(p => (
              <div key={p.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/50 flex items-center gap-3.5 hover:border-slate-300 hover:bg-slate-100/50 transition-all cursor-pointer shadow-sm">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ background: p.gradient }}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800">{p.label}</div>
                  <div className="text-[10px] text-slate-500 font-medium">Connect</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 border-t border-slate-200/50 py-24 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-widest text-[#E11D48] uppercase">Simple pricing</span>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950 mt-2">Honest, straightforward plans</h2>
          <p className="text-slate-500 text-sm mt-3">Start creating for free, scale when your accounts grow.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Free plan */}
          <div className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-4">FREE FOREVER</div>
              <div className="font-display text-4xl font-extrabold text-slate-950 mb-2">$0</div>
              <div className="text-xs text-slate-500 mb-6">Enjoy basic features</div>
              <div className="flex flex-col gap-3 mb-8">
                {[
                  '5 video projects / month',
                  'Up to 3 scenes per reel',
                  'Free Edge-TTS Voiceovers',
                  'Connect up to 2 social accounts',
                ].map(f => (
                  <div key={f} className="flex items-center gap-2 text-xs.5 text-slate-600 font-medium">
                    <Check className="w-4 h-4 text-emerald-500" /> {f}
                  </div>
                ))}
              </div>
            </div>
            <Link href="/auth/signup" className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold text-center block transition-all shadow-sm">
              Get started
            </Link>
          </div>

          {/* Pro plan */}
          <div className="p-8 rounded-2xl bg-white border-2 border-[#E11D48] shadow-md relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-rose-100 text-[#E11D48] text-[9px] font-extrabold">POPULAR</div>
            <div>
              <div className="text-[10px] font-bold tracking-widest text-[#E11D48] uppercase mb-4">CREATOR PRO</div>
              <div className="font-display text-4xl font-extrabold text-slate-950 mb-2">$19</div>
              <div className="text-xs text-slate-500 mb-6">Billed monthly · Cancel anytime</div>
              <div className="flex flex-col gap-3 mb-8">
                {[
                  'Unlimited video projects',
                  'Up to 20 scenes per reel',
                  'ElevenLabs premium AI voiceover',
                  'Connect all 6 platforms',
                  'OpenRouter / Custom AI model support',
                  'Auto-scheduling & analytics heatmap',
                ].map(f => (
                  <div key={f} className="flex items-center gap-2 text-xs.5 text-slate-700 font-semibold">
                    <Check className="w-4 h-4 text-emerald-500" /> {f}
                  </div>
                ))}
              </div>
            </div>
            <Link href="/auth/signup" className="w-full py-3 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-bold text-center block transition-all shadow-md">
              Start free trial
            </Link>
          </div>

          {/* Team plan */}
          <div className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-4">FOR AGENCIES</div>
              <div className="font-display text-4xl font-extrabold text-slate-950 mb-2">$49</div>
              <div className="text-xs text-slate-500 mb-6">Billed monthly · Up to 5 users</div>
              <div className="flex flex-col gap-3 mb-8">
                {[
                  'Everything in Creator Pro',
                  'Shared collaborative team spaces',
                  'Multi-brand profile separation',
                  'Approval flow workflows',
                  'Priority processing queues',
                  'Dedicated Slack support channel',
                ].map(f => (
                  <div key={f} className="flex items-center gap-2 text-xs.5 text-slate-600 font-medium">
                    <Check className="w-4 h-4 text-emerald-500" /> {f}
                  </div>
                ))}
              </div>
            </div>
            <Link href="/auth/signup" className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold text-center block transition-all shadow-sm">
              Contact Sales
            </Link>
          </div>

        </div>
      </section>

      {/* Call to Action section */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-tr from-rose-500/10 via-[#FAF9F5] to-emerald-500/10 border border-[#E11D48]/20 p-12 md:p-16 text-center relative overflow-hidden shadow-lg">
          <div className="relative z-10">
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950 mb-4">Ready to go viral?</h2>
            <p className="text-slate-600 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
              Join thousands of content creators crafting high-performing social media video reels daily.
            </p>
            <Link href="/auth/signup" className="px-8 py-3.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-base font-bold shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2 hover:-translate-y-0.5 transform duration-150 font-display">
              <Rocket className="w-4 h-4" /> Create your first reel free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200/50 py-10 px-6 max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs.5 text-slate-500 font-medium">
        <div className="font-display font-extrabold text-slate-950 text-base">
          Reel<span className="text-[#E11D48]">Forge</span>
        </div>
        <div className="flex gap-6">
          {['Privacy', 'Terms', 'Docs', 'GitHub'].map(l => (
            <span key={l} className="hover:text-slate-900 transition-colors cursor-pointer">{l}</span>
          ))}
        </div>
        <div>© 2026 ReelForge. Built with ❤️</div>
      </footer>

      {/* Accounts Connection Modal Mockup */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 pb-0 flex justify-between items-start">
                <div>
                  <h3 className="font-display font-extrabold text-lg text-slate-950">Connect social channels</h3>
                  <p className="text-xs text-slate-500 mt-1">Official secure OAuth 2.0 links</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-2.5">
                {Object.values(PLATFORMS).map(p => (
                  <div key={p.id} className="p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition-all flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white" style={{ background: p.gradient }}>
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs.5 font-bold text-slate-900">{p.label}</div>
                        <div className="text-[10px] text-slate-500 font-medium">OAuth API permission</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-4 text-[10px] font-bold text-slate-400 uppercase">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-4.5 h-4.5 text-emerald-600" /> Secure OAuth 2.0</span>
                <span className="flex items-center gap-1.5"><Lock className="w-4.5 h-4.5 text-emerald-600" /> AES-256 Encrypted</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  )
}
