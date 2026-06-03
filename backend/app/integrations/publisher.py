# backend/app/integrations/publisher.py
"""
Unified publisher — one interface, all platforms.
Each platform client handles auth, format validation, and upload.
"""
import httpx, os, asyncio
from abc import ABC, abstractmethod
from typing import Optional
from dataclasses import dataclass

@dataclass
class PublishPayload:
    video_path: str          # local path to final MP4
    caption: str
    hashtags: str = ""
    cover_image_path: Optional[str] = None
    scheduled_at: Optional[str] = None   # ISO 8601


@dataclass
class PublishResult:
    success: bool
    post_id: Optional[str] = None
    post_url: Optional[str] = None
    error: Optional[str] = None


# ── Base ──────────────────────────────────────────────────────────────────
class PlatformPublisher(ABC):
    @abstractmethod
    async def publish(self, payload: PublishPayload, access_token: str, **kwargs) -> PublishResult:
        ...


# ── Instagram (Meta Graph API) ────────────────────────────────────────────
class InstagramPublisher(PlatformPublisher):
    BASE = "https://graph.instagram.com/v19.0"

    async def publish(self, payload: PublishPayload, access_token: str, ig_user_id: str = "", **kw) -> PublishResult:
        caption = f"{payload.caption}\n\n{payload.hashtags}".strip()
        async with httpx.AsyncClient() as c:
            # Step 1 — create media container (upload via URL; video must be publicly accessible)
            r = await c.post(f"{self.BASE}/{ig_user_id}/reels", data={
                "video_url": payload.video_path,   # must be CDN URL in prod
                "caption": caption,
                "access_token": access_token,
                "share_to_feed": "true",
            })
            r.raise_for_status()
            container_id = r.json().get("id")

            # Step 2 — poll for container status
            for _ in range(20):
                await asyncio.sleep(5)
                s = await c.get(f"{self.BASE}/{container_id}", params={
                    "fields": "status_code",
                    "access_token": access_token
                })
                status = s.json().get("status_code")
                if status == "FINISHED":
                    break
                if status == "ERROR":
                    return PublishResult(success=False, error="Container processing failed")

            # Step 3 — publish
            p = await c.post(f"{self.BASE}/{ig_user_id}/media_publish", data={
                "creation_id": container_id,
                "access_token": access_token,
            })
            p.raise_for_status()
            post_id = p.json().get("id")
            return PublishResult(success=True, post_id=post_id,
                                 post_url=f"https://www.instagram.com/p/{post_id}/")


# ── TikTok (Content Posting API v2) ──────────────────────────────────────
class TikTokPublisher(PlatformPublisher):
    BASE = "https://open.tiktokapis.com/v2"

    async def publish(self, payload: PublishPayload, access_token: str, **kw) -> PublishResult:
        async with httpx.AsyncClient() as c:
            # Init upload
            r = await c.post(f"{self.BASE}/post/publish/video/init/", json={
                "post_info": {
                    "title": payload.caption[:150],
                    "privacy_level": "PUBLIC_TO_EVERYONE",
                    "disable_duet": False,
                    "disable_comment": False,
                    "disable_stitch": False,
                },
                "source_info": {
                    "source": "FILE_UPLOAD",
                    "video_size": os.path.getsize(payload.video_path),
                    "chunk_size": 10 * 1024 * 1024,
                    "total_chunk_count": 1,
                }
            }, headers={"Authorization": f"Bearer {access_token}"})
            r.raise_for_status()
            data = r.json().get("data", {})
            upload_url = data.get("upload_url")
            publish_id = data.get("publish_id")

            # Upload file
            with open(payload.video_path, "rb") as f:
                video_bytes = f.read()
            up = await c.put(upload_url, content=video_bytes,
                             headers={"Content-Range": f"bytes 0-{len(video_bytes)-1}/{len(video_bytes)}"})
            up.raise_for_status()

            return PublishResult(success=True, post_id=publish_id,
                                 post_url="https://www.tiktok.com/@me")


# ── Facebook Page (Graph API) ─────────────────────────────────────────────
class FacebookPublisher(PlatformPublisher):
    BASE = "https://graph.facebook.com/v19.0"

    async def publish(self, payload: PublishPayload, access_token: str, page_id: str = "", **kw) -> PublishResult:
        caption = f"{payload.caption}\n\n{payload.hashtags}".strip()
        async with httpx.AsyncClient() as c:
            r = await c.post(f"{self.BASE}/{page_id}/videos", data={
                "file_url": payload.video_path,
                "description": caption,
                "access_token": access_token,
            })
            r.raise_for_status()
            video_id = r.json().get("id")
            return PublishResult(success=True, post_id=video_id,
                                 post_url=f"https://www.facebook.com/{page_id}/videos/{video_id}/")


# ── Twitter/X (API v2) ────────────────────────────────────────────────────
class TwitterPublisher(PlatformPublisher):
    UPLOAD = "https://upload.twitter.com/1.1/media/upload.json"
    TWEET  = "https://api.twitter.com/2/tweets"

    async def publish(self, payload: PublishPayload, access_token: str, **kw) -> PublishResult:
        headers = {"Authorization": f"Bearer {access_token}"}
        async with httpx.AsyncClient() as c:
            # Chunked media upload
            with open(payload.video_path, "rb") as f:
                video_bytes = f.read()
            size = len(video_bytes)

            # INIT
            init = await c.post(self.UPLOAD, data={
                "command": "INIT", "total_bytes": size,
                "media_type": "video/mp4", "media_category": "tweet_video"
            }, headers=headers)
            media_id = init.json()["media_id_string"]

            # APPEND
            chunk_size = 5 * 1024 * 1024
            for i, start in enumerate(range(0, size, chunk_size)):
                chunk = video_bytes[start:start+chunk_size]
                await c.post(self.UPLOAD, data={
                    "command": "APPEND", "media_id": media_id,
                    "segment_index": i
                }, files={"media": chunk}, headers=headers)

            # FINALIZE
            await c.post(self.UPLOAD, data={"command": "FINALIZE", "media_id": media_id}, headers=headers)

            # Wait for processing
            await asyncio.sleep(5)

            # Tweet
            text = f"{payload.caption}\n{payload.hashtags}"[:280]
            t = await c.post(self.TWEET, json={"text": text, "media": {"media_ids": [media_id]}},
                             headers=headers)
            t.raise_for_status()
            tweet_id = t.json()["data"]["id"]
            return PublishResult(success=True, post_id=tweet_id,
                                 post_url=f"https://twitter.com/i/web/status/{tweet_id}")


# ── Factory ───────────────────────────────────────────────────────────────
PUBLISHERS = {
    "instagram": InstagramPublisher(),
    "tiktok":    TikTokPublisher(),
    "facebook":  FacebookPublisher(),
    "twitter":   TwitterPublisher(),
}

async def publish_to_platform(platform: str, payload: PublishPayload,
                               access_token: str, **kwargs) -> PublishResult:
    pub = PUBLISHERS.get(platform)
    if not pub:
        return PublishResult(success=False, error=f"Platform '{platform}' not supported yet")
    try:
        return await pub.publish(payload, access_token, **kwargs)
    except Exception as e:
        return PublishResult(success=False, error=str(e))
