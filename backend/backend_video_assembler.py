# backend/app/services/video_assembler.py
"""
Core video assembly: images + audio + subtitles → MP4
Uses FFmpeg under the hood. No video generation model needed (Phase 1).
"""
import asyncio, os, tempfile, subprocess
from pathlib import Path
from typing import List, Optional
from dataclasses import dataclass

FFMPEG = os.environ.get("FFMPEG_BIN", "ffmpeg")

@dataclass
class SceneSpec:
    image_path: str       # local path or URL
    duration_ms: int      # milliseconds
    text: Optional[str]   # subtitle text for this scene
    transition: str = "fade"  # fade | slide | zoom | none

@dataclass
class AudioSpec:
    path: str
    type: str    # music | voice
    volume: float = 1.0
    loop: bool = False
    start_ms: int = 0

@dataclass
class SubtitleStyle:
    font: str = "Arial"
    size: int = 28
    color: str = "white"
    position: str = "bottom"   # bottom | center | top
    style: str = "bold"        # bold | karaoke | bar


async def assemble_video(
    scenes: List[SceneSpec],
    audio_tracks: List[AudioSpec],
    output_path: str,
    aspect_ratio: str = "9:16",
    subtitle_style: Optional[SubtitleStyle] = None,
) -> str:
    """
    Build a slideshow MP4 from images + audio.
    Returns path to the output file.
    """
    with tempfile.TemporaryDirectory() as tmp:
        # 1. Resolve dimensions
        w, h = _dimensions(aspect_ratio)

        # 2. Build per-scene video clips
        scene_clips = []
        for i, scene in enumerate(scenes):
            clip_path = os.path.join(tmp, f"scene_{i:03d}.mp4")
            await _render_scene(scene, clip_path, w, h, subtitle_style)
            scene_clips.append(clip_path)

        # 3. Concatenate scenes
        concat_path = os.path.join(tmp, "concat.mp4")
        await _concat_clips(scene_clips, concat_path, tmp)

        # 4. Mix audio tracks onto the video
        if audio_tracks:
            mixed_path = os.path.join(tmp, "mixed.mp4")
            await _mix_audio(concat_path, audio_tracks, mixed_path, _total_duration_ms(scenes))
            final_source = mixed_path
        else:
            final_source = concat_path

        # 5. Final encode — H.264 / AAC for maximum platform compatibility
        await _final_encode(final_source, output_path, w, h)

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


async def _render_scene(scene: SceneSpec, out: str, w: int, h: int, style: Optional[SubtitleStyle]):
    dur = scene.duration_ms / 1000.0

    # Base filter: scale + pad to target resolution
    vf = f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2"

    # Zoom-pan (Ken Burns) for visual interest
    if scene.transition == "zoom":
        vf += f",zoompan=z='min(zoom+0.002,1.08)':d={int(dur*25)}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}"

    # Subtitle overlay via drawtext
    if scene.text and style:
        safe_text = scene.text.replace("'", "\\'").replace(":", "\\:")
        color = style.color
        fontsize = style.size
        y_pos = "h-th-60" if style.position == "bottom" else "(h-th)/2"
        vf += f",drawtext=text='{safe_text}':fontcolor={color}:fontsize={fontsize}:x=(w-tw)/2:y={y_pos}:line_spacing=8"

    cmd = [
        FFMPEG, "-y",
        "-loop", "1", "-i", scene.image_path,
        "-t", str(dur),
        "-vf", vf,
        "-r", "25",
        "-c:v", "libx264", "-preset", "fast", "-crf", "20",
        "-pix_fmt", "yuv420p",
        out
    ]
    await _run(cmd)


async def _concat_clips(clips: List[str], out: str, tmp: str):
    list_file = os.path.join(tmp, "clips.txt")
    with open(list_file, "w") as f:
        for c in clips:
            f.write(f"file '{c}'\n")
    cmd = [FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", list_file, "-c", "copy", out]
    await _run(cmd)


async def _mix_audio(video: str, tracks: List[AudioSpec], out: str, total_ms: int):
    dur = total_ms / 1000.0
    inputs = ["-i", video]
    for t in tracks:
        inputs += ["-i", t.path]

    # Build amix filter
    n = len(tracks)
    filter_parts = []
    for i, t in enumerate(tracks):
        idx = i + 1   # 0 = video stream
        loop_flag = "loop=-1:size=2e+09:start=0," if t.loop else ""
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
    await _run(cmd)


async def _final_encode(src: str, out: str, w: int, h: int):
    cmd = [
        FFMPEG, "-y", "-i", src,
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",   # web-optimised — metadata at start
        "-vf", f"scale={w}:{h}",
        out
    ]
    await _run(cmd)


async def _run(cmd: List[str]):
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg failed:\n{stderr.decode()[-2000:]}")


# ── Platform export presets ─────────────────────────────────────────────────
PLATFORM_PRESETS = {
    "instagram_reel": {"ratio": "9:16", "max_duration_s": 90,  "max_size_mb": 100},
    "instagram_feed": {"ratio": "1:1",  "max_duration_s": 60,  "max_size_mb": 100},
    "tiktok":         {"ratio": "9:16", "max_duration_s": 600, "max_size_mb": 1000},
    "facebook_reel":  {"ratio": "9:16", "max_duration_s": 90,  "max_size_mb": 1000},
    "youtube_short":  {"ratio": "9:16", "max_duration_s": 60,  "max_size_mb": 256000},
    "twitter":        {"ratio": "16:9", "max_duration_s": 140, "max_size_mb": 512},
    "snapchat":       {"ratio": "9:16", "max_duration_s": 60,  "max_size_mb": 32},
}
