# backend/app/api/routes/ai_generate.py
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
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
    try:
        b64 = await generate_image(req.prompt, req.aspect_ratio)
        fid = str(uuid.uuid4())
        path = os.path.join(TMP, f"{fid}.png")
        with open(path, "wb") as f:
            f.write(base64.b64decode(b64))
        return {"file_id": fid, "path": path, "b64": b64}
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/tts")
async def gen_tts(req: TTSRequest):
    try:
        fid = str(uuid.uuid4())
        path = os.path.join(TMP, f"{fid}.mp3")
        out = await generate_tts(req.text, req.voice, path)
        return {"file_id": fid, "path": out}
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/tts/{file_id}")
def serve_audio(file_id: str):
    path = os.path.join(TMP, f"{file_id}.mp3")
    if not os.path.exists(path): raise HTTPException(404, "Not found")
    return FileResponse(path, media_type="audio/mpeg")

@router.post("/hashtags")
async def hashtags(req: HashtagRequest):
    try:
        tags = await suggest_hashtags(req.caption, req.platform)
        return {"hashtags": tags}
    except Exception as e:
        raise HTTPException(500, str(e))
