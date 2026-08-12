# backend/app/services/ai_service.py
import httpx, os, asyncio, logging, time
from typing import Optional

logger = logging.getLogger("reelforge.ai")

GROQ_KEY       = os.getenv("GROQ_API_KEY", "")
OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENAI_KEY     = os.getenv("OPENAI_API_KEY", "")
ELEVENLABS_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE = os.getenv("ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")

LLM_PROVIDER   = os.getenv("LLM_PROVIDER", "openai")
IMAGE_PROVIDER = os.getenv("IMAGE_PROVIDER", "pollinations")
IMAGE_MODEL    = os.getenv("IMAGE_MODEL", "dall-e-3")


def _get_llm_config():
    if GROQ_KEY and GROQ_KEY != "gsk_your-groq-key-here":
        return "https://api.groq.com/openai/v1", GROQ_KEY, os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    if OPENROUTER_KEY and len(OPENROUTER_KEY) > 10:
        return "https://openrouter.ai/api/v1", OPENROUTER_KEY, os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.1-8b-instruct:free")
    if OPENAI_KEY and len(OPENAI_KEY) > 10:
        return "https://api.openai.com/v1", OPENAI_KEY, "gpt-4o-mini"
    raise ValueError("No LLM API key configured. Set GROQ_API_KEY, OPENROUTER_API_KEY, or OPENAI_API_KEY in .env.local")


# ── Script / Caption generation ───────────────────────────────────────────
async def generate_script(
    concept: str,
    num_scenes: int = 6,
    style: str = "engaging, short-form social media",
    platform: str = "instagram"
) -> dict:
    import json
    api_base, api_key, model = _get_llm_config()
    logger.info(f"generate_script provider={api_base.split('/')[2]} model={model} scenes={num_scenes}")

    system = f"""You are a viral social media content strategist for {platform}.
Generate a {num_scenes}-scene reel script in JSON format.
Style: {style}.
Return ONLY valid JSON, no markdown fences."""

    user = f"""Concept: {concept}

Return JSON with this structure:
{{
  "title": "short catchy title",
  "caption": "post caption under 150 chars with emojis",
  "hashtags": "#tag1 #tag2 #tag3 (8-12 relevant hashtags)",
  "scenes": [
    {{
      "text": "on-screen text for this scene (max 10 words)",
      "image_prompt": "detailed visual description for image generation"
    }}
  ]
}}"""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "ReelForge",
    }
    start = time.time()
    async with httpx.AsyncClient(timeout=30.0) as c:
        r = await c.post(f"{api_base}/chat/completions", headers=headers, json={
            "model": model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        })
        r.raise_for_status()
        content = r.json()["choices"][0]["message"]["content"]
        content = content.strip().strip("```json").strip("```").strip()
        logger.info(f"generate_script completed in {time.time()-start:.1f}s")
        return json.loads(content)


# ── Image generation ──────────────────────────────────────────────────────
async def generate_image(prompt: str, aspect_ratio: str = "9:16") -> str:
    size_map = {"9:16": "1024x1792", "1:1": "1024x1024", "16:9": "1792x1024", "4:5": "1024x1280"}
    size = size_map.get(aspect_ratio, "1024x1792")

    if IMAGE_PROVIDER == "openai" and OPENAI_KEY:
        return await _dalle_generate(prompt, size)
    return await _pollinations_generate(prompt, size)


async def _pollinations_generate(prompt: str, size: str) -> str:
    import urllib.parse, base64
    w, h = size.split('x')
    safe_prompt = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{safe_prompt}?width={w}&height={h}&nologo=true"
    async with httpx.AsyncClient(timeout=60.0) as c:
        r = await c.get(url)
        r.raise_for_status()
        return base64.b64encode(r.content).decode('utf-8')


async def _dalle_generate(prompt: str, size: str) -> str:
    async with httpx.AsyncClient(timeout=60.0) as c:
        r = await c.post("https://api.openai.com/v1/images/generations",
            headers={"Authorization": f"Bearer {OPENAI_KEY}"},
            json={"model": IMAGE_MODEL, "prompt": prompt, "size": size, "response_format": "b64_json", "quality": "standard"})
        r.raise_for_status()
        return r.json()["data"][0]["b64_json"]


# ── Text-to-Speech — Cascade: ElevenLabs → OpenAI TTS → edge-tts ─────────
async def generate_tts(text: str, output_path: str, voice: str = "en-US-AriaNeural") -> str:
    logger.info(f"generate_tts text_len={len(text)} output={output_path}")

    if ELEVENLABS_KEY and len(ELEVENLABS_KEY) > 10:
        try:
            result = await _elevenlabs_tts(text, ELEVENLABS_VOICE, output_path)
            logger.info("tts_provider=elevenlabs status=success")
            return result
        except Exception as e:
            logger.warning(f"tts_provider=elevenlabs status=failed error={e}")

    if OPENAI_KEY and len(OPENAI_KEY) > 10:
        try:
            result = await _openai_tts(text, output_path)
            logger.info("tts_provider=openai status=success")
            return result
        except Exception as e:
            logger.warning(f"tts_provider=openai status=failed error={e}")

    try:
        result = await _edge_tts(text, voice, output_path)
        logger.info("tts_provider=edge-tts status=success")
        return result
    except Exception as e:
        logger.error(f"tts_provider=edge-tts status=failed error={e}")
        raise RuntimeError(f"All TTS providers failed. Last error: {e}")


async def _elevenlabs_tts(text: str, voice_id: str, out: str) -> str:
    async with httpx.AsyncClient(timeout=30.0) as c:
        r = await c.post(f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
            headers={"xi-api-key": ELEVENLABS_KEY, "Content-Type": "application/json"},
            json={"text": text, "model_id": "eleven_monolingual_v1",
                  "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}})
        r.raise_for_status()
        with open(out, "wb") as f:
            f.write(r.content)
    return out


async def _openai_tts(text: str, out: str) -> str:
    async with httpx.AsyncClient(timeout=30.0) as c:
        r = await c.post("https://api.openai.com/v1/audio/speech",
            headers={"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"},
            json={"model": "tts-1", "input": text, "voice": "nova", "response_format": "mp3"})
        r.raise_for_status()
        with open(out, "wb") as f:
            f.write(r.content)
    return out


async def _edge_tts(text: str, voice: str, out: str) -> str:
    try:
        proc = await asyncio.create_subprocess_exec(
            "edge-tts", "--voice", voice, "--text", text, "--write-media", out,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            err = stderr.decode()[:600]
            raise RuntimeError(f"edge-tts failed: {err}")
        if not os.path.exists(out) or os.path.getsize(out) < 100:
            raise RuntimeError("edge-tts produced no output (network unreachable?)")
        return out
    except Exception as e:
        raise RuntimeError(f"edge-tts failed: {e}")


# ── Audio duration probe ──────────────────────────────────────────────────
async def get_audio_duration_ms(path: str) -> int:
    proc = await asyncio.create_subprocess_exec(
        "ffprobe", "-v", "quiet", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", path,
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stdout, _ = await proc.communicate()
    try:
        return int(float(stdout.decode().strip()) * 1000)
    except (ValueError, AttributeError):
        return 5000


# ── Auto-hashtags ─────────────────────────────────────────────────────────
async def suggest_hashtags(caption: str, platform: str = "instagram") -> list[str]:
    import json
    api_base, api_key, model = _get_llm_config()
    system = "You are a hashtag expert. Return only a JSON array of 10 hashtags, no explanation."
    user = f"Generate hashtags for this {platform} post: {caption}"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=20.0) as c:
        r = await c.post(f"{api_base}/chat/completions", headers=headers, json={
            "model": model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        })
        r.raise_for_status()
        content = r.json()["choices"][0]["message"]["content"]
        content = content.strip().strip("```json").strip("```").strip()
        result = json.loads(content)
        return result if isinstance(result, list) else result.get("hashtags", [])
