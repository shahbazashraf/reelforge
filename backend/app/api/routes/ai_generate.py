# backend/app/api/routes/ai_generate.py
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from app.services.ai_service import generate_image, generate_tts, suggest_hashtags
import base64, os, uuid

router = APIRouter()
TMP = "/tmp/reelforge_ai"
os.makedirs(TMP, exist_ok=True)


class ImageRequest(BaseModel):
    prompt: str
    aspect_ratio: str = "9:16"

class TTSRequest(BaseModel):
    text: str
    voice: str = "en-US-AriaNeural"

class HashtagRequest(BaseModel):
    caption: str
    platform: str = "instagram"


@router.post("/image")
async def gen_image(req: ImageRequest):
    if not req.prompt.strip():
        raise HTTPException(400, "Image prompt is required")
    try:
        b64 = await generate_image(req.prompt, req.aspect_ratio)
        fid = str(uuid.uuid4())
        path = os.path.join(TMP, f"{fid}.png")
        with open(path, "wb") as f:
            f.write(base64.b64decode(b64))
        return {"file_id": fid, "path": path, "b64": b64}
    except Exception as e:
        raise HTTPException(500, f"Image generation failed: {str(e)}")


@router.post("/tts")
async def gen_tts(req: TTSRequest):
    if not req.text.strip():
        raise HTTPException(400, "Text is required for TTS")
    try:
        fid = str(uuid.uuid4())
        path = os.path.join(TMP, f"{fid}.mp3")
        out = await generate_tts(req.text, path, req.voice)
        # Return audio bytes directly for the Next.js frontend fallback
        with open(out, "rb") as f:
            audio_bytes = f.read()
        return Response(content=audio_bytes, media_type="audio/mpeg",
                       headers={"Content-Disposition": f'attachment; filename="{fid}.mp3"'})
    except Exception as e:
        raise HTTPException(503, f"TTS generation failed: {str(e)}")


@router.get("/tts/{file_id}")
def serve_audio(file_id: str):
    path = os.path.join(TMP, f"{file_id}.mp3")
    if not os.path.exists(path):
        raise HTTPException(404, f"Audio file {file_id} not found")
    return FileResponse(path, media_type="audio/mpeg")


@router.post("/hashtags")
async def hashtags(req: HashtagRequest):
    if not req.caption.strip():
        raise HTTPException(400, "Caption is required for hashtag suggestions")
    try:
        tags = await suggest_hashtags(req.caption, req.platform)
        return {"hashtags": tags}
    except Exception as e:
        raise HTTPException(500, f"Hashtag generation failed: {str(e)}")
