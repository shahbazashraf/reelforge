# backend/app/services/video_assembler.py
import asyncio, os, tempfile, random, logging, time
from pathlib import Path
from typing import List, Optional
from dataclasses import dataclass, field

logger = logging.getLogger("reelforge.video")
FFMPEG = os.environ.get("FFMPEG_BIN", "ffmpeg")

# Safe zones for text placement (TikTok/Instagram UI overlays)
SAFE_TOP_PX = 250
SAFE_BOTTOM_PX = 350


@dataclass
class SceneSpec:
    image_path: str
    duration_ms: int
    text: Optional[str] = None
    transition: str = "fade"
    tts_path: Optional[str] = None

@dataclass
class AudioSpec:
    path: str
    type: str = "music"
    volume: float = 1.0
    loop: bool = False
    start_ms: int = 0

@dataclass
class SubtitleStyle:
    font: str = "Arial"
    size: int = 48
    color: str = "white"
    position: str = "bottom"
    style: str = "bold"


PLATFORM_PRESETS = {
    "instagram_reel": {"ratio": "9:16", "max_duration_s": 90,  "max_size_mb": 100},
    "instagram_feed": {"ratio": "1:1",  "max_duration_s": 60,  "max_size_mb": 100},
    "tiktok":         {"ratio": "9:16", "max_duration_s": 600, "max_size_mb": 1000},
    "facebook_reel":  {"ratio": "9:16", "max_duration_s": 90,  "max_size_mb": 1000},
    "youtube_short":  {"ratio": "9:16", "max_duration_s": 60,  "max_size_mb": 256000},
    "twitter":        {"ratio": "16:9", "max_duration_s": 140, "max_size_mb": 512},
    "snapchat":       {"ratio": "9:16", "max_duration_s": 60,  "max_size_mb": 32},
}


class RenderValidationError(Exception):
    pass


def validate_render_inputs(scenes: List[SceneSpec], audio_tracks: List[AudioSpec]):
    if not scenes:
        raise RenderValidationError("No scenes provided. Add at least one scene before rendering.")
    for i, scene in enumerate(scenes):
        if not scene.image_path:
            raise RenderValidationError(f"Scene {i+1} has no image path.")
        if scene.duration_ms < 500:
            raise RenderValidationError(f"Scene {i+1} duration too short ({scene.duration_ms}ms). Minimum 500ms.")
        if scene.duration_ms > 30000:
            raise RenderValidationError(f"Scene {i+1} duration too long ({scene.duration_ms}ms). Maximum 30s per scene.")
    for i, track in enumerate(audio_tracks):
        if not track.path:
            raise RenderValidationError(f"Audio track {i+1} has no file path.")


def validate_output(output_path: str):
    if not os.path.exists(output_path):
        raise RenderValidationError(f"Render produced no output file at {output_path}")
    size = os.path.getsize(output_path)
    if size < 10000:
        raise RenderValidationError(f"Output file too small ({size} bytes) — likely corrupt.")


async def assemble_video(
    scenes: List[SceneSpec],
    audio_tracks: List[AudioSpec],
    output_path: str,
    aspect_ratio: str = "9:16",
    subtitle_style: Optional[SubtitleStyle] = None,
    project_id: str = "",
) -> str:
    render_id = os.path.basename(output_path).replace(".mp4", "")
    start_time = time.time()
    logger.info(f"render_start project_id={project_id} render_id={render_id} scenes={len(scenes)} audio_tracks={len(audio_tracks)} ratio={aspect_ratio}")

    validate_render_inputs(scenes, audio_tracks)

    import httpx
    w, h = _dimensions(aspect_ratio)

    with tempfile.TemporaryDirectory() as tmp:
        # Download remote images & audio
        async with httpx.AsyncClient(timeout=60.0) as client:
            for i, scene in enumerate(scenes):
                if scene.image_path and scene.image_path.startswith("http"):
                    local_path = os.path.join(tmp, f"img_{i}.jpg")
                    try:
                        r = await client.get(scene.image_path)
                        r.raise_for_status()
                        with open(local_path, "wb") as f:
                            f.write(r.content)
                        scene.image_path = local_path
                    except Exception as e:
                        raise RenderValidationError(f"Failed to download image for scene {i+1}: {e}")
            for i, track in enumerate(audio_tracks):
                if track.path and track.path.startswith("http"):
                    ext = ".mp3" if "mp3" in track.path else ".wav"
                    local_path = os.path.join(tmp, f"aud_{i}{ext}")
                    try:
                        r = await client.get(track.path)
                        r.raise_for_status()
                        with open(local_path, "wb") as f:
                            f.write(r.content)
                        track.path = local_path
                    except Exception as e:
                        logger.warning(f"Failed to download audio track {i}: {e}")

        # Build per-scene video clips with Ken Burns + smart crop + subtitles
        scene_clips = []
        for i, scene in enumerate(scenes):
            clip_path = os.path.join(tmp, f"scene_{i:03d}.mp4")
            await _render_scene_advanced(scene, clip_path, w, h, subtitle_style, i)
            scene_clips.append(clip_path)

        # Concatenate scenes
        concat_path = os.path.join(tmp, "concat.mp4")
        await _concat_clips(scene_clips, concat_path, tmp)

        # Mix audio tracks
        if audio_tracks:
            mixed_path = os.path.join(tmp, "mixed.mp4")
            await _mix_audio(concat_path, audio_tracks, mixed_path, _total_duration_ms(scenes))
            final_source = mixed_path
        else:
            final_source = concat_path

        # Final encode — H.264 High, CRF 18-22, 30fps, AAC 192k
        await _final_encode(final_source, output_path, w, h)

    validate_output(output_path)
    duration_s = time.time() - start_time
    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    logger.info(f"render_complete project_id={project_id} render_id={render_id} duration={duration_s:.1f}s output_size={size_mb:.1f}MB")
    return output_path


def _dimensions(ratio: str):
    mapping = {
        "9:16": (1080, 1920),
        "1:1":  (1080, 1080),
        "16:9": (1920, 1080),
        "4:5":  (1080, 1350),
    }
    return mapping.get(ratio, (1080, 1920))


def _total_duration_ms(scenes: List[SceneSpec]) -> int:
    return sum(s.duration_ms for s in scenes)


def _smart_crop_and_resize(image_path: str, w: int, h: int, out_path: str):
    from PIL import Image
    img = Image.open(image_path).convert("RGB")
    iw, ih = img.size

    target_ratio = w / h
    img_ratio = iw / ih

    if abs(img_ratio - target_ratio) < 0.05:
        img = img.resize((w, h), Image.LANCZOS)
    else:
        # Try to detect subject/face for smart crop center
        cx, cy = iw // 2, ih // 2
        try:
            from PIL import ImageFilter
            # Simple subject detection: find highest-energy region
            gray = img.convert("L")
            edges = gray.filter(ImageFilter.FIND_EDGES)
            # Divide into 3x3 grid and find brightest quadrant
            grid_w, grid_h = iw // 3, ih // 3
            max_energy = 0
            for gx in range(3):
                for gy in range(3):
                    box = (gx*grid_w, gy*grid_h, (gx+1)*grid_w, (gy+1)*grid_h)
                    region = edges.crop(box)
                    energy = sum(region.getdata()) / (grid_w * grid_h)
                    if energy > max_energy:
                        max_energy = energy
                        cx = gx * grid_w + grid_w // 2
                        cy = gy * grid_h + grid_h // 2
        except Exception:
            pass

        # Crop to target aspect ratio centered on subject
        if img_ratio > target_ratio:
            new_w = int(ih * target_ratio)
            left = max(0, min(cx - new_w // 2, iw - new_w))
            img = img.crop((left, 0, left + new_w, ih))
        else:
            new_h = int(iw / target_ratio)
            top = max(0, min(cy - new_h // 2, ih - new_h))
            img = img.crop((0, top, iw, top + new_h))

        img = img.resize((w, h), Image.LANCZOS)

    img.save(out_path, "JPEG", quality=95)


def _burn_subtitles(image_path: str, text: str, style: SubtitleStyle, w: int, h: int, out_path: str):
    from PIL import Image, ImageDraw, ImageFont
    import textwrap

    img = Image.open(image_path).convert("RGB")
    if img.size != (w, h):
        img = img.resize((w, h), Image.LANCZOS)
    draw = ImageDraw.Draw(img)

    font_size = style.size
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except Exception:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except Exception:
            font = ImageFont.load_default()

    max_chars = max(12, w // (font_size // 2 + 2))
    lines = textwrap.wrap(text, width=max_chars)
    line_h = font_size + 12
    total_h = line_h * len(lines)

    # Position text in safe zone
    if style.position == "bottom":
        y_start = h - SAFE_BOTTOM_PX + (SAFE_BOTTOM_PX - total_h) // 2
        y_start = max(h - SAFE_BOTTOM_PX + 20, min(y_start, h - total_h - 40))
    elif style.position == "top":
        y_start = SAFE_TOP_PX - total_h - 20
        y_start = max(20, y_start)
    else:
        y_start = (h - total_h) // 2

    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font)
        text_w = bbox[2] - bbox[0]
        x = (w - text_w) // 2
        y = y_start + i * line_h
        # Background pill for readability
        padding = 8
        draw.rounded_rectangle(
            [x - padding, y - 4, x + text_w + padding, y + font_size + 4],
            radius=8, fill=(0, 0, 0, 180)
        )
        draw.text((x, y), line, font=font, fill="white")

    img.save(out_path, "JPEG", quality=95)


def _get_ken_burns_filter(w: int, h: int, dur: float, scene_index: int) -> str:
    effects = [
        # Slow zoom in
        f"zoompan=z='min(zoom+0.0008,1.12)':d={int(dur*30)}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}:fps=30",
        # Slow zoom out
        f"zoompan=z='if(eq(on,1),1.12,max(zoom-0.0008,1.0))':d={int(dur*30)}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}:fps=30",
        # Pan left to right
        f"zoompan=z='1.05':d={int(dur*30)}:x='if(eq(on,1),0,min(x+2,(iw-iw/zoom)))':y='ih/2-(ih/zoom/2)':s={w}x{h}:fps=30",
        # Pan right to left
        f"zoompan=z='1.05':d={int(dur*30)}:x='if(eq(on,1),(iw-iw/zoom),max(x-2,0))':y='ih/2-(ih/zoom/2)':s={w}x{h}:fps=30",
    ]
    random.seed(scene_index * 42)
    return random.choice(effects)


async def _render_scene_advanced(scene: SceneSpec, out: str, w: int, h: int, style: Optional[SubtitleStyle], scene_idx: int):
    dur = scene.duration_ms / 1000.0
    tmp_dir = os.path.dirname(out)

    # Smart crop to target dimensions
    cropped_path = os.path.join(tmp_dir, f"crop_{scene_idx:03d}.jpg")
    _smart_crop_and_resize(scene.image_path, w, h, cropped_path)

    # Burn text/subtitles with Pillow
    if scene.text and style and style.style != "none":
        txt_path = os.path.join(tmp_dir, f"txt_{scene_idx:03d}.jpg")
        _burn_subtitles(cropped_path, scene.text, style, w, h, txt_path)
        image_path = txt_path
    else:
        image_path = cropped_path

    # Ken Burns cinematic motion
    vf = _get_ken_burns_filter(w, h, dur, scene_idx)

    cmd = [
        FFMPEG, "-y",
        "-loop", "1", "-i", image_path,
        "-t", str(dur),
        "-vf", vf,
        "-r", "30",
        "-c:v", "libx264", "-preset", "fast", "-crf", "20",
        "-pix_fmt", "yuv420p",
        out
    ]
    await _run(cmd, context=f"scene_{scene_idx}")


async def _concat_clips(clips: List[str], out: str, tmp: str):
    list_file = os.path.join(tmp, "clips.txt")
    with open(list_file, "w") as f:
        for c in clips:
            f.write(f"file '{c}'\n")
    cmd = [FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", list_file, "-c", "copy", out]
    await _run(cmd, context="concat")


async def _mix_audio(video: str, tracks: List[AudioSpec], out: str, total_ms: int):
    dur = total_ms / 1000.0
    inputs = ["-i", video]
    valid_tracks = []
    for t in tracks:
        if os.path.exists(t.path):
            inputs += ["-i", t.path]
            valid_tracks.append(t)
        else:
            logger.warning(f"audio_track_missing path={t.path}")

    if not valid_tracks:
        # No valid audio — just copy video as-is
        import shutil
        shutil.copy2(video, out)
        return

    n = len(valid_tracks)
    filter_parts = []
    for i, t in enumerate(valid_tracks):
        idx = i + 1
        loop_flag = "aloop=loop=-1:size=2e+09:start=0," if t.loop else ""
        filter_parts.append(f"[{idx}:a]{loop_flag}atrim=0:{dur},volume={t.volume}[a{i}]")

    mix_inputs = "".join(f"[a{i}]" for i in range(n))
    filter_parts.append(f"{mix_inputs}amix=inputs={n}:normalize=0[amix]")
    af = ";".join(filter_parts)

    cmd = [
        FFMPEG, "-y", *inputs,
        "-filter_complex", af,
        "-map", "0:v", "-map", "[amix]",
        "-t", str(dur),
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
        out
    ]
    await _run(cmd, context="mix_audio")


async def _final_encode(src: str, out: str, w: int, h: int):
    cmd = [
        FFMPEG, "-y", "-i", src,
        "-c:v", "libx264", "-profile:v", "high", "-preset", "medium", "-crf", "20",
        "-r", "30",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        "-vf", f"scale={w}:{h}",
        out
    ]
    await _run(cmd, context="final_encode")


async def _run(cmd: List[str], context: str = ""):
    logger.debug(f"ffmpeg_exec context={context} cmd={' '.join(cmd[:6])}...")
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        error_tail = stderr.decode()[-1500:]
        logger.error(f"ffmpeg_failed context={context} returncode={proc.returncode} stderr={error_tail[:200]}")
        raise RuntimeError(f"FFmpeg failed during {context}: {error_tail}")
