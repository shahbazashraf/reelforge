# backend/app/api/routes/publish.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.integrations.publisher import publish_to_platform, PublishPayload
import logging, os, httpx, tempfile

logger = logging.getLogger("reelforge.routes.publish")
router = APIRouter()


class PublishRequest(BaseModel):
    job_id: Optional[str] = None
    platform: str
    video_path: str
    caption: str
    hashtags: str = ""
    access_token: str
    page_id: Optional[str] = None
    ig_user_id: Optional[str] = None


@router.post("/now")
async def publish_now(req: PublishRequest):
    logger.info(f"publish_start platform={req.platform} job_id={req.job_id}")

    # If video_path is a URL (from our download endpoint), resolve to local file
    video_path = req.video_path
    if video_path.startswith("http"):
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                r = await client.get(video_path)
                r.raise_for_status()
                tmp_path = os.path.join(tempfile.gettempdir(), f"publish_{req.job_id or 'tmp'}.mp4")
                with open(tmp_path, "wb") as f:
                    f.write(r.content)
                video_path = tmp_path
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Cannot download video for publishing: {e}")

    if not os.path.exists(video_path):
        raise HTTPException(status_code=400, detail=f"Video file not found at {video_path}. Ensure the video has been rendered.")

    payload = PublishPayload(
        video_path=video_path,
        caption=req.caption,
        hashtags=req.hashtags,
    )
    result = await publish_to_platform(
        req.platform, payload, req.access_token,
        page_id=req.page_id or "",
        ig_user_id=req.ig_user_id or "",
    )
    if not result.success:
        logger.error(f"publish_failed platform={req.platform} error={result.error}")
        raise HTTPException(status_code=502, detail=f"Publishing to {req.platform} failed: {result.error}")

    logger.info(f"publish_success platform={req.platform} post_id={result.post_id}")
    return {"post_id": result.post_id, "post_url": result.post_url}
