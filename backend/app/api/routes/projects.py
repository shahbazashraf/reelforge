# backend/app/api/routes/projects.py
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from app.services.video_assembler import assemble_video, SceneSpec, AudioSpec, SubtitleStyle, PLATFORM_PRESETS
from app.services.ai_service import generate_script
import uuid, os

router = APIRouter()

OUTPUT_DIR = os.environ.get("OUTPUT_DIR", "/tmp/reelforge_outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)


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
    subtitle_size: int = 28
    subtitle_position: str = "bottom"

class GenerateScriptRequest(BaseModel):
    concept: str
    num_scenes: int = 6
    style: str = "engaging, short-form social media"
    platform: str = "instagram"


# ── Endpoints ─────────────────────────────────────────────────────────────
@router.post("/assemble")
async def assemble(req: AssembleRequest, bg: BackgroundTasks):
    """
    Kick off video assembly as a background job.
    Returns a job_id to poll for status.
    """
    job_id = str(uuid.uuid4())
    output_path = os.path.join(OUTPUT_DIR, f"{job_id}.mp4")

    scenes = [SceneSpec(s.image_path, s.duration_ms, s.text, s.transition) for s in req.scenes]
    audios = [AudioSpec(a.path, a.type, a.volume, a.loop) for a in req.audio_tracks]
    style  = SubtitleStyle(font=req.subtitle_font, size=req.subtitle_size, position=req.subtitle_position)

    bg.add_task(assemble_video, scenes, audios, output_path, req.aspect_ratio, style)
    return {"job_id": job_id, "status": "processing", "output_path": output_path}


@router.get("/output/{job_id}")
async def get_output(job_id: str):
    path = os.path.join(OUTPUT_DIR, f"{job_id}.mp4")
    if not os.path.exists(path):
        return {"status": "processing"}
    size = os.path.getsize(path)
    return {"status": "ready", "path": path, "size_bytes": size}

from fastapi.responses import FileResponse
@router.get("/download/{job_id}")
async def download_output(job_id: str):
    path = os.path.join(OUTPUT_DIR, f"{job_id}.mp4")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, media_type="video/mp4", filename=f"reelforge_{job_id}.mp4")


@router.post("/generate-script")
async def generate(req: GenerateScriptRequest):
    """AI-generate a full reel script with scene texts and image prompts."""
    try:
        script = await generate_script(req.concept, req.num_scenes, req.style, req.platform)
        return {"success": True, "script": script}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/presets")
def presets():
    """Return platform-specific export presets."""
    return PLATFORM_PRESETS
