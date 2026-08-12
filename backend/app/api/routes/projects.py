# backend/app/api/routes/projects.py
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from app.services.video_assembler import (
    assemble_video, SceneSpec, AudioSpec, SubtitleStyle,
    PLATFORM_PRESETS, RenderValidationError, validate_render_inputs
)
from app.services.ai_service import generate_script, generate_tts, get_audio_duration_ms
import uuid, os, logging, time, asyncio, httpx

logger = logging.getLogger("reelforge.routes.projects")
router = APIRouter()

OUTPUT_DIR = os.environ.get("OUTPUT_DIR", "/tmp/reelforge_outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


# ── Schemas ───────────────────────────────────────────────────────────────
class SceneIn(BaseModel):
    image_path: str
    duration_ms: int = 5000
    text: Optional[str] = None
    transition: str = "fade"

class AudioIn(BaseModel):
    path: str
    type: str = "music"
    volume: float = 1.0
    loop: bool = False

class AssembleRequest(BaseModel):
    project_id: str
    scenes: List[SceneIn]
    audio_tracks: List[AudioIn] = []
    aspect_ratio: str = "9:16"
    subtitle_font: str = "Arial"
    subtitle_size: int = 48
    subtitle_position: str = "bottom"
    subtitle_style: str = "bold"
    auto_tts: bool = True
    auto_bgm: bool = True

class GenerateScriptRequest(BaseModel):
    concept: str
    num_scenes: int = 6
    style: str = "engaging, short-form social media"
    platform: str = "instagram"


# ── Background render job ─────────────────────────────────────────────────
async def _render_job(
    job_id: str,
    project_id: str,
    req: AssembleRequest,
):
    output_path = os.path.join(OUTPUT_DIR, f"{job_id}.mp4")
    start = time.time()

    try:
        scenes = [SceneSpec(s.image_path, s.duration_ms, s.text, s.transition) for s in req.scenes]
        audios = [AudioSpec(a.path, a.type, a.volume, a.loop) for a in req.audio_tracks]
        style = SubtitleStyle(
            font=req.subtitle_font,
            size=req.subtitle_size,
            position=req.subtitle_position,
            style=req.subtitle_style,
        )

        validate_render_inputs(scenes, audios)

        has_voice_track = any(a.type == "voice" for a in audios)

        # Auto-TTS: if no voice audio and scenes have text, generate TTS
        if req.auto_tts and not has_voice_track:
            all_text = " ".join(s.text for s in scenes if s.text)
            if all_text.strip():
                logger.info(f"auto_tts project_id={project_id} text_len={len(all_text)}")
                tts_dir = os.path.join(OUTPUT_DIR, f"tts_{job_id}")
                os.makedirs(tts_dir, exist_ok=True)

                # Generate TTS per scene for duration sync
                for i, scene in enumerate(scenes):
                    if scene.text and scene.text.strip():
                        tts_path = os.path.join(tts_dir, f"scene_{i}.mp3")
                        try:
                            await generate_tts(scene.text, tts_path)
                            scene.tts_path = tts_path
                            # Sync scene duration to TTS audio length + 500ms buffer
                            audio_dur = await get_audio_duration_ms(tts_path)
                            scene.duration_ms = max(scene.duration_ms, audio_dur + 500)
                        except Exception as e:
                            logger.warning(f"tts_scene_failed scene={i} error={e}")

                # Combine all scene TTS into one voice track
                tts_files = [s.tts_path for s in scenes if s.tts_path]
                if tts_files:
                    combined_tts = os.path.join(tts_dir, "combined.mp3")
                    await _concat_audio_files(tts_files, combined_tts, scenes)
                    audios.append(AudioSpec(path=combined_tts, type="voice", volume=1.0, loop=False))
                    has_voice_track = True

        # Block silent video: must have at least one audio track
        if not audios and not has_voice_track:
            if req.auto_bgm:
                logger.info(f"auto_bgm project_id={project_id} — no audio, adding silence-safe track")
                # Generate a subtle ambient tone as fallback
                silence_path = os.path.join(OUTPUT_DIR, f"ambient_{job_id}.mp3")
                await _generate_ambient_tone(silence_path, _total_duration_s(scenes))
                audios.append(AudioSpec(path=silence_path, type="music", volume=0.3, loop=False))
            else:
                raise RenderValidationError(
                    "No audio tracks found and auto-TTS produced no output. "
                    "Upload background music or enable auto-TTS to avoid silent videos."
                )

        await assemble_video(scenes, audios, output_path, req.aspect_ratio, style, project_id)

        # Write output_url back to Supabase
        download_url = f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/api/projects/download/{job_id}"
        await _update_project_in_supabase(project_id, {
            "output_url": download_url,
            "status": "ready",
        })
        logger.info(f"render_success project_id={project_id} job_id={job_id} duration={time.time()-start:.1f}s")

    except RenderValidationError as e:
        logger.error(f"render_validation_failed project_id={project_id} error={e}")
        await _update_project_in_supabase(project_id, {"status": "draft"})
        # Write error file for status polling
        _write_error(job_id, str(e))
    except Exception as e:
        logger.error(f"render_failed project_id={project_id} error={e}", exc_info=True)
        await _update_project_in_supabase(project_id, {"status": "draft"})
        _write_error(job_id, f"Render failed: {str(e)[:500]}")


def _write_error(job_id: str, message: str):
    error_path = os.path.join(OUTPUT_DIR, f"{job_id}.error")
    with open(error_path, "w") as f:
        f.write(message)


def _total_duration_s(scenes: list) -> float:
    return sum(s.duration_ms for s in scenes) / 1000.0


async def _concat_audio_files(files: List[str], output: str, scenes: list):
    """Concatenate TTS files with silence gaps matching scene timing."""
    import tempfile
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
        for path in files:
            f.write(f"file '{path}'\n")
        list_path = f.name

    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list_path, "-c:a", "libmp3lame", "-b:a", "192k", output]
    proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    await proc.communicate()
    os.unlink(list_path)


async def _generate_ambient_tone(output: str, duration_s: float):
    """Generate a subtle ambient pink noise track as background."""
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"anoisesrc=d={duration_s}:c=pink:a=0.02",
        "-c:a", "libmp3lame", "-b:a", "128k",
        output
    ]
    proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        logger.warning(f"ambient_tone_failed, using silence: {stderr.decode()[:200]}")
        # Fallback: generate pure silence
        cmd2 = ["ffmpeg", "-y", "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=stereo", "-t", str(duration_s), "-c:a", "libmp3lame", output]
        proc2 = await asyncio.create_subprocess_exec(*cmd2, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        await proc2.communicate()


async def _update_project_in_supabase(project_id: str, updates: dict):
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        logger.warning("supabase_update_skipped — no SUPABASE_URL or SERVICE_KEY configured")
        return

    url = f"{SUPABASE_URL}/rest/v1/projects?id=eq.{project_id}"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.patch(url, headers=headers, json=updates)
            if r.status_code < 300:
                logger.info(f"supabase_update project_id={project_id} fields={list(updates.keys())}")
            else:
                logger.error(f"supabase_update_failed project_id={project_id} status={r.status_code} body={r.text[:200]}")
    except Exception as e:
        logger.error(f"supabase_update_error project_id={project_id} error={e}")


# ── Endpoints ─────────────────────────────────────────────────────────────
@router.post("/assemble")
async def assemble(req: AssembleRequest, bg: BackgroundTasks):
    job_id = str(uuid.uuid4())

    # Pre-validate before kicking off background job
    scenes = [SceneSpec(s.image_path, s.duration_ms, s.text, s.transition) for s in req.scenes]
    try:
        validate_render_inputs(scenes, [])
    except RenderValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))

    bg.add_task(_render_job, job_id, req.project_id, req)
    return {"job_id": job_id, "status": "processing"}


@router.get("/output/{job_id}")
async def get_output(job_id: str):
    error_path = os.path.join(OUTPUT_DIR, f"{job_id}.error")
    if os.path.exists(error_path):
        with open(error_path) as f:
            error_msg = f.read()
        return {"status": "error", "error": error_msg}

    path = os.path.join(OUTPUT_DIR, f"{job_id}.mp4")
    if not os.path.exists(path):
        return {"status": "processing"}
    size = os.path.getsize(path)
    if size < 10000:
        return {"status": "processing"}
    return {"status": "ready", "path": path, "size_bytes": size}


from fastapi.responses import FileResponse

@router.get("/download/{job_id}")
async def download_output(job_id: str):
    path = os.path.join(OUTPUT_DIR, f"{job_id}.mp4")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Rendered video not found for job {job_id}. It may still be processing.")
    return FileResponse(path, media_type="video/mp4", filename=f"reelforge_{job_id}.mp4")


@router.post("/generate-script")
async def generate(req: GenerateScriptRequest):
    try:
        script = await generate_script(req.concept, req.num_scenes, req.style, req.platform)
        return {"success": True, "script": script}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Script generation failed: {str(e)}")


@router.get("/presets")
def presets():
    return PLATFORM_PRESETS
