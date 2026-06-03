# backend/app/api/routes/publish.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.integrations.publisher import publish_to_platform, PublishPayload

router = APIRouter()

class PublishRequest(BaseModel):
    platform: str
    video_path: str
    caption: str
    hashtags: str = ""
    access_token: str
    page_id: Optional[str] = None
    ig_user_id: Optional[str] = None

@router.post("/now")
async def publish_now(req: PublishRequest):
    payload = PublishPayload(
        video_path=req.video_path,
        caption=req.caption,
        hashtags=req.hashtags,
    )
    result = await publish_to_platform(
        req.platform, payload, req.access_token,
        page_id=req.page_id or "",
        ig_user_id=req.ig_user_id or "",
    )
    if not result.success:
        raise HTTPException(status_code=502, detail=result.error)
    return {"post_id": result.post_id, "post_url": result.post_url}
