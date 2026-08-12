# backend/app/main.py
import os, logging
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env.local"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import projects, media, publish, social, ai_generate

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

app = FastAPI(
    title="ReelForge API",
    description="AI-powered social content factory backend",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router,    prefix="/api/projects",   tags=["Projects"])
app.include_router(media.router,       prefix="/api/media",      tags=["Media"])
app.include_router(publish.router,     prefix="/api/publish",    tags=["Publish"])
app.include_router(social.router,      prefix="/api/social",     tags=["Social Accounts"])
app.include_router(ai_generate.router, prefix="/api/ai",         tags=["AI Generate"])

@app.get("/health")
def health(): return {"status": "ok", "version": "2.0.0"}
