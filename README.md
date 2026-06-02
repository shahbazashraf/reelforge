# ReelForge — AI Social Content Studio

> Turn ideas into viral reels in minutes. Upload images, add audio, AI writes the script, publish to Instagram, TikTok, Facebook, Twitter, YouTube and Snapchat with one click.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 18, TypeScript, Tailwind CSS |
| Animations | Framer Motion |
| State | Zustand + React Query |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Email + Google + GitHub OAuth) |
| Storage | Supabase Storage |
| AI — Script | OpenAI GPT-4o-mini (or Ollama / DeepSeek) |
| AI — Image | OpenAI DALL-E 3 |
| AI — TTS | Edge-TTS (free) or ElevenLabs |
| Video Render | Python FastAPI + FFmpeg (see `/backend`) |
| Social APIs | Meta Graph, TikTok Content Posting, Twitter v2, YouTube Data v3, Snapchat |

---

## Quick Start (15 minutes)

### Prerequisites

```bash
node --version   # >= 20
python --version # >= 3.11 (for backend)
ffmpeg -version  # must be installed
```

Install FFmpeg if missing:
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html and add to PATH
```

---

### 1. Clone and install

```bash
git clone https://github.com/yourusername/reelforge.git
cd reelforge

npm install
```

---

### 2. Set up Supabase (required — free tier works)

**A. Create project**
1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a region close to you
3. Save your database password somewhere safe

**B. Get API keys**
1. In your project dashboard → **Settings → API**
2. Copy **Project URL** and **anon public** key

**C. Run the database schema**
1. In Supabase dashboard → **SQL Editor → New query**
2. Paste the entire contents of `lib/schema.sql`
3. Click **Run**

**D. Create storage buckets**
1. Go to **Storage → New bucket**
2. Create bucket named `media` → Private → Max file size: 52428800 (50MB)
3. Create bucket named `outputs` → Private → Max file size: 524288000 (500MB)

**E. Set storage policies**
In Supabase dashboard → Storage → Policies, create these policies:

For **media** bucket:
```sql
-- Allow authenticated users to upload their own files
CREATE POLICY "Users upload own media" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to read their own files
CREATE POLICY "Users read own media" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own files
CREATE POLICY "Users delete own media" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
```

Apply the same three policies for the `outputs` bucket (replace `'media'` with `'outputs'`).

**F. Enable OAuth providers (optional but recommended)**
1. Supabase → **Authentication → Providers**
2. Enable **Google**: create OAuth app at [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth 2.0 Client ID → Web. Add `https://xxxx.supabase.co/auth/v1/callback` as redirect URI.
3. Enable **GitHub**: create OAuth app at [github.com/settings/developers](https://github.com/settings/developers) → New OAuth App. Callback URL: `https://xxxx.supabase.co/auth/v1/callback`

---

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in at minimum:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

For AI features (pick one):

**Option A — OpenAI (easiest, ~$0.01/request for GPT-4o-mini)**
```bash
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
```

**Option B — Ollama (free, local, no internet needed)**
```bash
# 1. Install: https://ollama.com
# 2. Pull a model:
ollama pull llama3.1
# 3. Set in .env.local:
LLM_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
```

**Option C — DeepSeek (very cheap, $0.001/request)**
```bash
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-...
```

---

### 4. Run the Next.js frontend

```bash
npm run dev
# → http://localhost:3000
```

The app is now running. Sign up, create a project, upload images, add captions. Publishing requires the backend (step 5) and social OAuth (step 6).

---

### 5. Run the Python backend (video rendering)

The backend handles FFmpeg video assembly and social platform publishing.

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install edge-tts for free TTS
pip install edge-tts

# Copy env
cp .env.example .env
# Fill in the same values as your .env.local

# Start the API server
uvicorn app.main:app --reload --port 8000
# → http://localhost:8000
# → API docs: http://localhost:8000/docs
```

Both must run simultaneously. Open two terminal tabs.

---

### 6. Social Platform OAuth Setup

You need developer accounts on each platform to publish. Each platform takes 5-15 minutes to set up.

#### Instagram + Facebook (same Meta app)

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps → Create App**
2. Choose **Business** type
3. Add products: **Facebook Login** and **Instagram Graph API**
4. Go to **App Settings → Basic**: copy **App ID** and **App Secret** into `.env.local`
5. Go to **Facebook Login → Settings → Valid OAuth Redirect URIs**, add:
   ```
   http://localhost:3000/api/social/instagram/callback
   http://localhost:3000/api/social/facebook/callback
   ```
6. Go to **App Review → Permissions**: request these permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `instagram_manage_insights`
   - `pages_manage_posts`
   - `pages_read_engagement`
   - `pages_show_list`
7. For local development, add your Instagram/Facebook account as a **Test User** in **Roles → Test Users**

> **Note:** Full production access requires Meta App Review (~2 weeks). For personal use, test users work immediately.

#### TikTok

1. Go to [developers.tiktok.com](https://developers.tiktok.com) → **Manage apps → Create app**
2. Add products: **Login Kit** and **Content Posting API**
3. In **App settings → Keys and tokens**: copy **Client key** and **Client secret**
4. In **Login Kit → Redirect URIs**, add:
   ```
   http://localhost:3000/api/social/tiktok/callback
   ```
5. Request scopes: `user.info.basic`, `video.publish`, `video.upload`
6. For sandbox: add your TikTok account as a test user

#### Twitter / X

1. Go to [developer.twitter.com](https://developer.twitter.com) → **Dashboard → Create Project + App**
2. You need **Basic access** ($100/month) or apply for **Elevated free** for research
3. In your app → **Settings → User authentication settings**:
   - App type: **Web App, Automated App or Bot**
   - Callback URI: `http://localhost:3000/api/social/twitter/callback`
   - Website URL: `http://localhost:3000`
4. Enable **OAuth 2.0** with scopes: `tweet.write`, `tweet.read`, `users.read`, `offline.access`
5. In **Keys and tokens**: copy **Client ID** and **Client Secret** (OAuth 2.0 section)

#### YouTube (Google)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **New Project**
2. Go to **APIs & Services → Library** → Enable **YouTube Data API v3**
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Authorized redirect URI: `http://localhost:3000/api/social/youtube/callback`
6. Copy **Client ID** and **Client Secret**
7. In **OAuth consent screen**, add your Google account as a test user

#### Snapchat

1. Go to [kit.snapchat.com/manage](https://kit.snapchat.com/manage) → **New App**
2. Add **Login Kit** and **Story Kit**
3. Add redirect URI: `http://localhost:3000/api/social/snapchat/callback`
4. Copy **Client ID** and **Client Secret**

---

### 7. Verify everything works

```bash
# Check Next.js is running
curl http://localhost:3000

# Check Python backend is running
curl http://localhost:8000/health
# → {"status": "ok"}

# Check AI script generation
curl -X POST http://localhost:3000/api/ai/script \
  -H "Content-Type: application/json" \
  -d '{"concept": "morning routine for entrepreneurs"}'
```

---

## Project Structure

```
reelforge/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout + providers
│   ├── globals.css                 # Design system tokens + animations
│   ├── auth/
│   │   ├── login/page.tsx          # Sign in page
│   │   ├── signup/page.tsx         # Sign up page
│   │   └── callback/route.ts       # Supabase OAuth callback
│   ├── dashboard/
│   │   ├── layout.tsx              # Animated sidebar + nav
│   │   ├── studio/page.tsx         # Main content creator
│   │   ├── projects/page.tsx       # Projects dashboard
│   │   ├── analytics/page.tsx      # Cross-platform analytics
│   │   └── social-accounts/page.tsx # OAuth connect/disconnect
│   └── api/
│       ├── ai/
│       │   ├── script/route.ts     # POST → AI script generation
│       │   ├── hashtags/route.ts   # POST → AI hashtag suggestions
│       │   ├── image/route.ts      # POST → DALL-E image generation
│       │   └── tts/route.ts        # POST → Text-to-speech
│       ├── media/
│       │   └── upload/route.ts     # POST → Supabase Storage upload
│       ├── projects/
│       │   ├── route.ts            # GET all, POST create
│       │   ├── [id]/route.ts       # GET, PATCH, DELETE by ID
│       │   ├── publish/route.ts    # POST → publish to platforms
│       │   └── render/route.ts     # POST → trigger FFmpeg render
│       └── social/
│           ├── accounts/
│           │   ├── route.ts        # GET all accounts
│           │   └── [id]/route.ts   # DELETE (disconnect)
│           └── [platform]/
│               ├── auth/route.ts   # GET → OAuth redirect
│               ├── callback/route.ts # GET → OAuth token exchange
│               └── refresh/route.ts  # POST → refresh access token
├── components/
│   ├── LandingPage.tsx             # Full animated marketing page
│   └── Providers.tsx               # React Query + Sonner wrapper
├── hooks/
│   ├── useProjects.ts              # Projects CRUD hooks
│   └── useSocial.ts                # Social accounts + AI hooks
├── lib/
│   ├── supabase.ts                 # Browser Supabase client
│   ├── supabase-server.ts          # Server Supabase client
│   ├── platforms.ts                # Platform configs + OAuth URLs
│   └── schema.sql                  # Full Supabase database schema
├── store/
│   └── index.ts                    # Zustand stores (auth, studio, social, UI)
├── types/
│   └── index.ts                    # TypeScript definitions
├── middleware.ts                    # Auth guard for /dashboard routes
├── .env.local.example              # All env vars documented
└── backend/                        # Python FastAPI video renderer
    ├── app/
    │   ├── main.py
    │   ├── models/models.py
    │   ├── services/
    │   │   ├── video_assembler.py  # FFmpeg pipeline
    │   │   └── ai_service.py       # LLM + TTS + image gen
    │   ├── integrations/
    │   │   └── publisher.py        # Platform publish clients
    │   └── api/routes/
    │       ├── projects.py
    │       ├── media.py
    │       ├── publish.py
    │       ├── social.py
    │       └── ai_generate.py
    ├── requirements.txt
    └── .env.example
```

---

## Deployment

### Vercel (recommended for Next.js)

```bash
npm i -g vercel
vercel

# Set env vars in Vercel dashboard → Settings → Environment Variables
# Copy everything from .env.local
```

For production OAuth redirect URIs, replace `http://localhost:3000` with your production URL in all platform developer consoles.

### Python Backend — Railway / Render / EC2

```bash
# Railway (easiest)
railway login
railway init
railway up

# Or Docker
docker build -t reelforge-backend ./backend
docker run -p 8000:8000 --env-file backend/.env reelforge-backend
```

### Supabase Production

Your Supabase project is already hosted. Just ensure:
1. Add your production domain to **Authentication → URL Configuration → Redirect URLs**
2. Update storage policies if needed
3. Optionally enable **pgcrypto** for token encryption at rest

---

## Cost Breakdown (approximate)

| Service | Free Tier | Paid |
|---|---|---|
| Supabase | 500MB DB, 1GB storage, 50k auth users | $25/month pro |
| OpenAI GPT-4o-mini | — | ~$0.01 per script generation |
| OpenAI DALL-E 3 | — | ~$0.04 per image |
| Ollama | Free forever (local) | $0 |
| Edge-TTS | Free forever | $0 |
| ElevenLabs | 10k chars/month | $5/month |
| Vercel | Hobby plan free | $20/month pro |

**Total for personal use: ~$0–5/month** using Ollama + Edge-TTS + Vercel hobby + Supabase free.

---

## Phase 2: AI Video Generation (future)

When you're ready to upgrade from slideshows to real motion video:

1. Install Wan 2.2 locally (requires 16GB+ VRAM GPU):
```bash
git clone https://github.com/Wan-Video/Wan2.2
pip install -r Wan2.2/requirements.txt
python Wan2.2/generate.py --task t2v-14B --prompt "..."
```

2. Add to `backend/app/services/ai_service.py`:
```python
async def generate_video_clip(prompt: str, duration_s: float = 5) -> str:
    # Call Wan 2.2 local inference server
    ...
```

3. In `backend/app/services/video_assembler.py`, replace `_render_scene()` to call the video generator instead of looping a static image.

4. Optionally add ViMax as orchestration layer:
```bash
git clone https://github.com/HKUDS/ViMax
# Configure to use your local Wan 2.2 endpoint instead of Veo
```

---

## Contributing

```bash
git checkout -b feature/my-feature
# make changes
git commit -m "feat: my feature"
git push origin feature/my-feature
# open pull request
```

---

## License

MIT — use freely, commercially or otherwise.

---

## Support

- Open an issue on GitHub
- Check the [Supabase docs](https://supabase.com/docs)
- Check the [Next.js docs](https://nextjs.org/docs)
