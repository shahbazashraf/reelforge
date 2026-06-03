# backend/app/api/routes/media.py
from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil, os, uuid

router = APIRouter()
MEDIA_DIR = os.environ.get("MEDIA_DIR", "/tmp/reelforge_media")
os.makedirs(MEDIA_DIR, exist_ok=True)

@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    allowed = {".jpg",".jpeg",".png",".webp",".mp3",".wav",".aac",".mp4"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(400, f"File type {ext} not allowed")
    fid = str(uuid.uuid4())
    dest = os.path.join(MEDIA_DIR, f"{fid}{ext}")
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"file_id": fid, "path": dest, "filename": file.filename, "ext": ext}

@router.get("/list")
def list_media():
    files = os.listdir(MEDIA_DIR)
    return {"files": files, "count": len(files)}

@router.delete("/{file_id}")
def delete_media(file_id: str):
    for f in os.listdir(MEDIA_DIR):
        if f.startswith(file_id):
            os.remove(os.path.join(MEDIA_DIR, f))
            return {"deleted": f}
    raise HTTPException(404, "File not found")


# ── social.py (OAuth callback stubs) ──────────────────────────────────────
