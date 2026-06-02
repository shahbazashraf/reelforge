import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          DEFAULT: '#7C5CFC',
          light: '#9B80FF',
          dim: 'rgba(124,92,252,0.15)',
        },
        bg: {
          base: '#07070A',
          surface: '#0F0F14',
          elevated: '#161620',
          overlay: '#1C1C28',
          muted: '#222230',
        },
        border: {
          subtle: 'rgba(255,255,255,0.05)',
          default: 'rgba(255,255,255,0.08)',
          strong: 'rgba(255,255,255,0.14)',
        },
        platform: {
          instagram: '#E1306C',
          tiktok: '#ffffff',
          facebook: '#1877F2',
          twitter: '#1DA1F2',
          youtube: '#FF0000',
          snapchat: '#FFFC00',
        },
      },
      borderRadius: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease both',
        'float': 'float 3s ease-in-out infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'gradient': 'gradient-shift 4s ease infinite',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 12px rgba(124,92,252,0.2)' },
          '50%': { boxShadow: '0 0 28px rgba(124,92,252,0.5)' },
        },
        'gradient-shift': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #7C5CFC 0%, #EC4899 100%)',
        'gradient-warm': 'linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)',
        'gradient-cool': 'linear-gradient(135deg, #3B82F6 0%, #7C5CFC 100%)',
      },
    },
  },
  plugins: [],
}

export default config
