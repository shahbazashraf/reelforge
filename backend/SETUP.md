# ReelForge — Setup & Run Guide

## Prerequisites
- Python 3.11+
- Node 20+
- FFmpeg installed (`sudo apt install ffmpeg` or `brew install ffmpeg`)
- PostgreSQL (or use Docker)
- Redis (or use Docker)

---

## Quick Start

### 1. Clone / set up project
```bash
git clone <your-repo>
cd reelforge
```

### 2. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# → Fill in your API keys in .env

# Run DB migrations
alembic upgrade head

# Start API server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend (Vite + React)
```bash
cd frontend
npm install
npm run dev
# → Opens at http://localhost:5173
```

### 4. Celery worker (for background video jobs)
```bash
cd backend
celery -A app.workers.celery_app worker --loglevel=info
```

---

## Module Status

| Module | Status | What it does |
|--------|--------|--------------|
| Studio UI | ✅ Built | Create reel: scenes + audio + caption |
| Projects Dashboard | ✅ Built | Manage all projects, queue, stats |
| Social Accounts | ✅ Built | Connect/manage IG/TikTok/FB/Twitter |
| Video Assembler | ✅ Built | FFmpeg: images+audio → MP4 |
| Publisher | ✅ Built | Post to IG, TikTok, Facebook, Twitter |
| AI Service | ✅ Built | Script gen, image gen, TTS, hashtags |
| Analytics | 🔜 Next | Views, reach, engagement per platform |
| Scheduler | 🔜 Next | Queue posts for best-time publishing |
| Video Gen (AI) | 🔜 Phase 2 | Swap slideshow → Wan 2.2 motion clips |

---

## API Endpoints

```
POST /api/projects/assemble          — Kick off video rendering
GET  /api/projects/output/{job_id}   — Poll render status
POST /api/projects/generate-script   — AI script from concept
GET  /api/projects/presets           — Platform export presets

POST /api/media/upload               — Upload image/audio
GET  /api/media/list                 — List media library
DELETE /api/media/{file_id}          — Delete file

POST /api/publish/now                — Publish to platform immediately

GET  /api/social/{platform}/auth     — Start OAuth flow
GET  /api/social/{platform}/callback — OAuth callback

POST /api/ai/image                   — Generate image from prompt
POST /api/ai/tts                     — Text to speech MP3
GET  /api/ai/tts/{file_id}           — Stream audio file
POST /api/ai/hashtags                — Suggest hashtags for caption
```

---

## Adding Video Generation (Phase 2)

When you're ready to swap slideshows for real AI video:

1. Install Wan 2.2 locally:
```bash
git clone https://github.com/Wan-Video/Wan2.2
pip install -r Wan2.2/requirements.txt
```

2. Add to `ai_service.py`:
```python
async def generate_video_clip(prompt: str, image_path: str = None) -> str:
    # Call Wan 2.2 inference API or subprocess
    ...
```

3. In `video_assembler.py`, replace `_render_scene()` with video clip generation
   for scenes where `scene.ai_video=True`.

ViMax can be added as the **orchestration layer** on top — it manages the full
narrative pipeline and calls your local Wan 2.2 endpoint per scene.

---

## Deployment

```
Frontend:  Vercel / Netlify / Nginx static
Backend:   Railway / Render / EC2 + Nginx + Gunicorn
DB:        Railway Postgres / Supabase / RDS
Redis:     Railway Redis / Upstash
Storage:   S3 / Cloudflare R2 (swap MEDIA_DIR → S3 client)
```
