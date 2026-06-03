# backend/app/models/models.py
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, Enum, ForeignKey
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.dialects.postgresql import UUID
import uuid, enum
from datetime import datetime

Base = declarative_base()

def gen_uuid(): return str(uuid.uuid4())

class ProjectStatus(str, enum.Enum):
    draft = "draft"
    processing = "processing"
    ready = "ready"
    published = "published"
    scheduled = "scheduled"

class AspectRatio(str, enum.Enum):
    reel_9_16 = "9:16"
    feed_1_1  = "1:1"
    wide_16_9 = "16:9"
    story_4_5 = "4:5"

class Platform(str, enum.Enum):
    instagram = "instagram"
    tiktok    = "tiktok"
    facebook  = "facebook"
    twitter   = "twitter"
    youtube   = "youtube"
    snapchat  = "snapchat"

# ── Project ────────────────────────────────────────────────────────────────
class Project(Base):
    __tablename__ = "projects"
    id           = Column(String, primary_key=True, default=gen_uuid)
    title        = Column(String(200), nullable=False)
    status       = Column(Enum(ProjectStatus), default=ProjectStatus.draft)
    aspect_ratio = Column(Enum(AspectRatio), default=AspectRatio.reel_9_16)
    caption      = Column(Text, nullable=True)
    hashtags     = Column(Text, nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    scenes       = relationship("Scene",       back_populates="project", order_by="Scene.order", cascade="all, delete-orphan")
    audio_tracks = relationship("AudioTrack",  back_populates="project", cascade="all, delete-orphan")
    publish_jobs = relationship("PublishJob",  back_populates="project", cascade="all, delete-orphan")

# ── Scene ──────────────────────────────────────────────────────────────────
class Scene(Base):
    __tablename__ = "scenes"
    id         = Column(String, primary_key=True, default=gen_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    order      = Column(Integer, nullable=False)
    image_url  = Column(String(500), nullable=True)   # uploaded or AI-generated
    text       = Column(Text, nullable=True)           # per-scene caption
    duration_ms = Column(Integer, default=5000)        # default 5s
    transition = Column(String(50), default="fade")    # fade | slide | zoom | none
    ai_prompt  = Column(Text, nullable=True)           # prompt used if AI-generated

    project    = relationship("Project", back_populates="scenes")

# ── Audio Track ────────────────────────────────────────────────────────────
class AudioTrack(Base):
    __tablename__ = "audio_tracks"
    id         = Column(String, primary_key=True, default=gen_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    type       = Column(String(20))    # music | voice | sfx
    name       = Column(String(200))
    url        = Column(String(500))
    start_ms   = Column(Integer, default=0)
    volume     = Column(Float, default=1.0)   # 0.0–1.0
    loop       = Column(Boolean, default=False)

    project    = relationship("Project", back_populates="audio_tracks")

# ── Social Account ─────────────────────────────────────────────────────────
class SocialAccount(Base):
    __tablename__ = "social_accounts"
    id            = Column(String, primary_key=True, default=gen_uuid)
    platform      = Column(Enum(Platform), nullable=False)
    username      = Column(String(100))
    display_name  = Column(String(200))
    profile_pic   = Column(String(500), nullable=True)
    access_token  = Column(Text)               # encrypted at rest
    refresh_token = Column(Text, nullable=True)
    token_expires = Column(DateTime, nullable=True)
    page_id       = Column(String(100), nullable=True)  # Facebook Pages
    followers     = Column(Integer, default=0)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

# ── Publish Job ────────────────────────────────────────────────────────────
class JobStatus(str, enum.Enum):
    pending    = "pending"
    processing = "processing"
    published  = "published"
    failed     = "failed"
    cancelled  = "cancelled"

class PublishJob(Base):
    __tablename__ = "publish_jobs"
    id             = Column(String, primary_key=True, default=gen_uuid)
    project_id     = Column(String, ForeignKey("projects.id"), nullable=False)
    platform       = Column(Enum(Platform), nullable=False)
    account_id     = Column(String, ForeignKey("social_accounts.id"))
    status         = Column(Enum(JobStatus), default=JobStatus.pending)
    scheduled_at   = Column(DateTime, nullable=True)
    published_at   = Column(DateTime, nullable=True)
    post_url       = Column(String(500), nullable=True)
    post_id        = Column(String(200), nullable=True)   # platform's post ID
    error_msg      = Column(Text, nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)

    project        = relationship("Project", back_populates="publish_jobs")
