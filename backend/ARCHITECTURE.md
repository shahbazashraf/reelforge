# ReelForge — Project Architecture

## Vision
AI-powered social content factory. Input: text, images, audio. Output: reels, posts, stories published to every major platform.

---

## Tech Stack

### Frontend
- React 18 + Vite
- Tailwind CSS (utility-first)
- Zustand (state)
- React Query (server state)
- FFmpeg.wasm (client-side video assembly — no server needed for basic ops)
- Wavesurfer.js (audio waveform preview)

### Backend
- Python FastAPI
- Celery + Redis (async job queue)
- FFmpeg (server-side video processing)
- PostgreSQL (projects, media, jobs, social connections)

### AI Integrations (Module-by-module)
| Module | AI Provider | Purpose |
|--------|-------------|---------|
| Text → Script | OpenAI / Ollama / DeepSeek | Story/caption generation |
| Image Gen | FLUX / DALL-E / Aliyun | Frame generation |
| TTS | ElevenLabs / Edge-TTS / Coqui | Voice narration |
| Video Gen (later) | Wan 2.2 / LTX-Video | Motion clips |
| Captions | Whisper | Auto-subtitle |

### Social Publishing
- Meta Graph API (Instagram, Facebook Pages)
- TikTok Content Posting API
- Twitter/X API v2
- Snapchat Story API
- YouTube Data API v3

---

## Module Roadmap

### ✅ Module 1 — Content Creator UI (NOW)
- Project dashboard
- Upload images / audio
- Text input for script/caption
- Basic slideshow video assembly (images + audio + subtitles)
- Preview player
- Export (MP4)

### 🔜 Module 2 — AI Content Engine
- Text → full script via LLM
- Text/prompt → images via image gen API
- TTS audio generation
- Auto captions via Whisper

### 🔜 Module 3 — Social Publisher
- OAuth connections: Instagram, Facebook, TikTok, Twitter, YouTube, Snap
- Platform-specific format presets (9:16 Reels, 1:1 Feed, 16:9 YouTube)
- Scheduling + queue
- Analytics (views, likes, reach per platform)

### 🔜 Module 4 — Video Generation
- Swap image slideshow → Wan 2.2 / LTX-Video clip per scene
- ViMax orchestration layer for multi-scene narrative

---

## Data Models

### Project
```
id, title, status, style(reel|post|story), aspect_ratio, created_at
```

### Scene
```
id, project_id, order, image_url, text, duration_ms, transition
```

### AudioTrack
```
id, project_id, type(music|voice|sfx), url, start_ms, volume
```

### SocialAccount
```
id, platform, username, access_token, refresh_token, expires_at
```

### PublishJob
```
id, project_id, platform, status, scheduled_at, published_at, post_url
```

---

## Directory Structure
```
reelforge/
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route-level pages
│   │   ├── hooks/         # Custom React hooks
│   │   ├── store/         # Zustand stores
│   │   ├── services/      # API clients
│   │   └── utils/         # FFmpeg helpers, formatters
│   └── public/
├── backend/
│   ├── app/
│   │   ├── api/           # FastAPI routes
│   │   ├── models/        # SQLAlchemy models
│   │   ├── services/      # Business logic
│   │   ├── workers/       # Celery tasks
│   │   └── integrations/  # Social platform clients
│   └── alembic/           # DB migrations
└── docs/
```
