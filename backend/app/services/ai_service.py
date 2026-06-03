# backend/app/services/ai_service.py
"""
AI generation layer.
All providers are swappable via env vars — no hard lock-in.
Phase 1: text + TTS + image gen.
Phase 2 (later): add Wan 2.2 / LTX-Video for real motion clips.
"""
import httpx, os, asyncio
from typing import Optional

# ── Config (set in .env) ──────────────────────────────────────────────────
LLM_PROVIDER   = os.getenv("LLM_PROVIDER", "openai")       # openai | ollama | deepseek
OPENAI_KEY     = os.getenv("OPENAI_API_KEY", "")
OLLAMA_URL     = os.getenv("OLLAMA_URL", "http://localhost:11434")
OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY", "")

# Smart model selection: OpenAI if key exists, otherwise fallback to free OpenRouter Llama
_llm_model = os.getenv("LLM_MODEL")
if _llm_model:
    LLM_MODEL = _llm_model
elif OPENAI_KEY:
    LLM_MODEL = "gpt-4o-mini"
else:
    LLM_MODEL = "meta-llama/llama-3.1-8b-instruct:free"

IMAGE_PROVIDER = os.getenv("IMAGE_PROVIDER", "openai")      # openai | flux | aliyun
IMAGE_MODEL    = os.getenv("IMAGE_MODEL", "dall-e-3")
ALIYUN_KEY     = os.getenv("ALIYUN_API_KEY", "")

TTS_PROVIDER   = os.getenv("TTS_PROVIDER", "edge")          # edge | elevenlabs | coqui
ELEVENLABS_KEY = os.getenv("ELEVENLABS_API_KEY", "")


# ── Script / Caption generation ───────────────────────────────────────────
async def generate_script(
    concept: str,
    num_scenes: int = 6,
    style: str = "engaging, short-form social media",
    platform: str = "instagram"
) -> dict:
    """
    Returns: { "title": str, "caption": str, "hashtags": str,
                "scenes": [{ "text": str, "image_prompt": str }] }
    """
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

    if LLM_PROVIDER == "openai":
        return await _openai_chat(system, user)
    elif LLM_PROVIDER == "ollama":
        return await _ollama_chat(system, user)
    elif LLM_PROVIDER == "deepseek":
        return await _deepseek_chat(system, user)
    else:
        raise ValueError(f"Unknown LLM_PROVIDER: {LLM_PROVIDER}")


async def _openai_chat(system: str, user: str) -> dict:
    import json
    api_key = OPENAI_KEY or OPENROUTER_KEY
    if not api_key:
        raise ValueError("No OPENAI_API_KEY or OPENROUTER_API_KEY set. Set one in .env")

    api_base = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1").rstrip("/")
    if not api_key.startswith("sk-proj-") and not api_base.endswith("openai.com/v1"):
        api_base = "https://openrouter.ai/api/v1"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "ReelForge",
    }
    async with httpx.AsyncClient() as c:
        r = await c.post(f"{api_base}/chat/completions",
            headers=headers,
            json={"model": LLM_MODEL, "messages": [
                {"role": "system", "content": system},
                {"role": "user",   "content": user}
            ], "response_format": {"type": "json_object"} if LLM_MODEL.startswith("gpt-") else None},
            timeout=30)
        r.raise_for_status()
        return json.loads(r.json()["choices"][0]["message"]["content"])


async def _ollama_chat(system: str, user: str) -> dict:
    import json
    async with httpx.AsyncClient() as c:
        r = await c.post(f"{OLLAMA_URL}/api/chat",
            json={"model": LLM_MODEL, "stream": False,
                  "messages": [{"role": "system", "content": system},
                                {"role": "user",   "content": user}]},
            timeout=60)
        r.raise_for_status()
        return json.loads(r.json()["message"]["content"])


async def _deepseek_chat(system: str, user: str) -> dict:
    import json
    async with httpx.AsyncClient() as c:
        r = await c.post("https://api.deepseek.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {os.getenv('DEEPSEEK_API_KEY','')}"},
            json={"model": "deepseek-chat", "messages": [
                {"role": "system", "content": system},
                {"role": "user",   "content": user}
            ]}, timeout=30)
        r.raise_for_status()
        content = r.json()["choices"][0]["message"]["content"]
        return json.loads(content.strip().strip("```json").strip("```"))


# ── Image generation ──────────────────────────────────────────────────────
async def generate_image(prompt: str, aspect_ratio: str = "9:16") -> str:
    """Returns base64 PNG string."""
    size_map = {"9:16": "1024x1792", "1:1": "1024x1024", "16:9": "1792x1024", "4:5": "1024x1280"}
    size = size_map.get(aspect_ratio, "1024x1792")

    if IMAGE_PROVIDER == "openai":
        return await _dalle_generate(prompt, size)
    elif IMAGE_PROVIDER == "pollinations":
        return await _pollinations_generate(prompt, size)
    else:
        raise ValueError(f"IMAGE_PROVIDER '{IMAGE_PROVIDER}' not yet integrated")

async def _pollinations_generate(prompt: str, size: str) -> str:
    import urllib.parse, base64
    w, h = size.split('x')
    safe_prompt = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{safe_prompt}?width={w}&height={h}&nologo=true"
    
    async with httpx.AsyncClient() as c:
        r = await c.get(url, timeout=60)
        r.raise_for_status()
        return base64.b64encode(r.content).decode('utf-8')


async def _dalle_generate(prompt: str, size: str) -> str:
    api_base = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1").rstrip("/")
    async with httpx.AsyncClient() as c:
        r = await c.post(f"{api_base}/images/generations",
            headers={"Authorization": f"Bearer {OPENAI_KEY}", "HTTP-Referer": "http://localhost:3000", "X-Title": "ReelForge"},
            json={"model": IMAGE_MODEL, "prompt": prompt, "size": size,
                  "response_format": "b64_json", "quality": "standard"},
            timeout=60)
        r.raise_for_status()
        return r.json()["data"][0]["b64_json"]


# ── Text-to-Speech ────────────────────────────────────────────────────────
async def generate_tts(text: str, voice: str = "en-US-AriaNeural",
                        output_path: str = "/tmp/voice.mp3") -> str:
    """Returns local path to audio file."""
    if TTS_PROVIDER == "edge":
        return await _edge_tts(text, voice, output_path)
    elif TTS_PROVIDER == "elevenlabs":
        return await _elevenlabs_tts(text, voice, output_path)
    else:
        raise ValueError(f"TTS_PROVIDER '{TTS_PROVIDER}' not supported")


async def _edge_tts(text: str, voice: str, out: str) -> str:
    """edge-tts: free, no API key, runs locally."""
    proc = await asyncio.create_subprocess_exec(
        "edge-tts", "--voice", voice, "--text", text, "--write-media", out,
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    await proc.communicate()
    return out


async def _elevenlabs_tts(text: str, voice_id: str, out: str) -> str:
    async with httpx.AsyncClient() as c:
        r = await c.post(f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
            headers={"xi-api-key": ELEVENLABS_KEY, "Content-Type": "application/json"},
            json={"text": text, "model_id": "eleven_monolingual_v1",
                  "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}},
            timeout=30)
        r.raise_for_status()
        with open(out, "wb") as f:
            f.write(r.content)
    return out


# ── Auto-hashtags ─────────────────────────────────────────────────────────
async def suggest_hashtags(caption: str, platform: str = "instagram") -> list[str]:
    system = "You are a hashtag expert. Return only a JSON array of 10 hashtags, no explanation."
    user = f"Generate hashtags for this {platform} post: {caption}"
    result = await _openai_chat(system, user) if LLM_PROVIDER == "openai" else await _ollama_chat(system, user)
    return result if isinstance(result, list) else result.get("hashtags", [])
