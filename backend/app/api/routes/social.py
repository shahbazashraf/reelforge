# backend/app/api/routes/social.py
from fastapi import APIRouter
from fastapi.responses import RedirectResponse
import os

router = APIRouter()

FRONTEND = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Each platform's OAuth flow: redirect → callback → store token
# Tokens stored encrypted in DB (use cryptography.fernet in prod)

@router.get("/{platform}/auth")
def oauth_start(platform: str):
    """Redirect user to platform's OAuth consent screen."""
    urls = {
        "instagram": (
            "https://api.instagram.com/oauth/authorize"
            "?client_id={}&redirect_uri={}/api/social/instagram/callback"
            "&scope=instagram_basic,instagram_content_publish,instagram_manage_insights"
            "&response_type=code"
        ).format(os.getenv("INSTAGRAM_APP_ID",""), FRONTEND),
        "tiktok": (
            "https://www.tiktok.com/v2/auth/authorize/"
            "?client_key={}&redirect_uri={}/api/social/tiktok/callback"
            "&scope=user.info.basic,video.publish&response_type=code"
        ).format(os.getenv("TIKTOK_CLIENT_KEY",""), FRONTEND),
        "facebook": (
            "https://www.facebook.com/v19.0/dialog/oauth"
            "?client_id={}&redirect_uri={}/api/social/facebook/callback"
            "&scope=pages_manage_posts,pages_read_engagement,pages_show_list"
            "&response_type=code"
        ).format(os.getenv("FACEBOOK_APP_ID",""), FRONTEND),
        "twitter": (
            "https://twitter.com/i/oauth2/authorize"
            "?client_id={}&redirect_uri={}/api/social/twitter/callback"
            "&scope=tweet.write+offline.access&response_type=code&code_challenge=challenge&code_challenge_method=plain"
        ).format(os.getenv("TWITTER_CLIENT_ID",""), FRONTEND),
        "youtube": (
            "https://accounts.google.com/o/oauth2/v2/auth"
            "?client_id={}&redirect_uri={}/api/social/youtube/callback"
            "&scope=https://www.googleapis.com/auth/youtube.upload"
            "&response_type=code&access_type=offline"
        ).format(os.getenv("GOOGLE_CLIENT_ID",""), FRONTEND),
    }
    url = urls.get(platform)
    if not url:
        return {"error": f"Platform {platform} not supported"}
    return RedirectResponse(url)

@router.get("/{platform}/callback")
async def oauth_callback(platform: str, code: str = ""):
    """
    Exchange code for access token, store in DB.
    In production: exchange code, refresh token, store encrypted.
    """
    # TODO: exchange `code` for tokens, save SocialAccount to DB
    return RedirectResponse(f"{FRONTEND}/accounts?connected={platform}")


# ── ai_generate.py ─────────────────────────────────────────────────────────
