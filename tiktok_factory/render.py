"""Montage final : plans vidéo + étalonnage + voix + musique + sous-titres → MP4 9:16."""
from __future__ import annotations

import math
import random
from pathlib import Path

from .config import ASSETS_DIR, FPS, HEIGHT, WIDTH
from .footage import FootagePicker
from .fonts import FONTS_DIR
from .media import probe_duration, run

MAX_SHOT = 4.5          # secondes max par plan : coupe régulière = meilleure rétention
TAIL = 0.8              # petit silence à la fin
ENC = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(FPS)]

# Fonds animés de secours (sans clé Pexels) : couleurs par compte
GRADIENTS = {
    "mindset": ("0x0b0b12", "0x2a0f14"),
    "stoic": ("0x14110c", "0x3a3020"),
    "finance": ("0x061a14", "0x0b2e4a"),
}


def split_shots(duration: float) -> list[float]:
    n = max(1, math.ceil(duration / MAX_SHOT))
    return [duration / n] * n


def make_shot(clip: Path | None, d: float, grade: str, out: Path, variant: int, channel_id: str) -> None:
    if clip is None:
        c0, c1 = GRADIENTS.get(channel_id, ("0x101010", "0x303030"))
        run([
            "ffmpeg", "-y", "-f", "lavfi",
            "-i", f"gradients=s={WIDTH}x{HEIGHT}:c0={c0}:c1={c1}:speed=0.02:d={d:.3f}:r={FPS}",
            "-t", f"{d:.3f}", "-vf", "format=yuv420p", *ENC, "-an", str(out),
        ])
        return

    src_dur = probe_duration(clip)
    pre = []
    if src_dur > d + 0.5:
        pre = ["-ss", f"{random.uniform(0, src_dur - d - 0.2):.2f}"]
    elif src_dur < d:
        pre = ["-stream_loop", "-1"]

    # Effet « Ken Burns » : léger zoom puis panoramique lent, sens alterné à chaque plan.
    sw, sh = int(WIDTH * 1.12) // 2 * 2, int(HEIGHT * 1.12) // 2 * 2
    if variant % 3 == 0:
        x, y = f"(in_w-out_w)*t/{d:.3f}", "(in_h-out_h)/2"
    elif variant % 3 == 1:
        x, y = f"(in_w-out_w)*(1-t/{d:.3f})", "(in_h-out_h)/2"
    else:
        x, y = "(in_w-out_w)/2", f"(in_h-out_h)*(1-t/{d:.3f})"
    vf = (
        f"scale={sw}:{sh}:force_original_aspect_ratio=increase,crop={sw}:{sh},"
        f"crop={WIDTH}:{HEIGHT}:x='{x}':y='{y}',fps={FPS},{grade},setsar=1,format=yuv420p"
    )
    run(["ffmpeg", "-y", *pre, "-i", str(clip), "-t", f"{d:.3f}", "-vf", vf, *ENC, "-an", str(out)])


def concat(files: list[Path], out: Path, work: Path, reencode_audio: bool = False) -> None:
    lst = work / f"{out.stem}_list.txt"
    lst.write_text("".join(f"file '{f.resolve()}'\n" for f in files))
    codec = ["-c:a", "pcm_s16le"] if reencode_audio else ["-c", "copy"]
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), *codec, str(out)])


def build_audio(channel: dict, voice_files: list[Path], total: float, work: Path) -> Path:
    voice = work / "voice.wav"
    concat(voice_files, voice, work, reencode_audio=True)
    out = work / "mix.m4a"
    music_dir = ASSETS_DIR / "music" / channel["id"]
    tracks = [p for p in music_dir.glob("*") if p.suffix.lower() in {".mp3", ".wav", ".m4a", ".ogg"}]
    vol = channel["style"].get("music_volume", 0.12)
    if tracks:
        track = random.choice(tracks)
        fc = (
            f"[0:a]apad=pad_dur={TAIL},asplit=2[v1][v2];"
            f"[1:a]volume={vol},afade=t=in:d=1.5,afade=t=out:st={max(total - 2.5, 0):.2f}:d=2.5[m];"
            f"[m][v1]sidechaincompress=threshold=0.04:ratio=5:attack=15:release=350[md];"
            f"[v2][md]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]"
        )
        run([
            "ffmpeg", "-y", "-i", str(voice), "-stream_loop", "-1", "-i", str(track),
            "-filter_complex", fc, "-map", "[a]", "-t", f"{total:.3f}", "-ar", "48000",
            "-c:a", "aac", "-b:a", "192k", str(out),
        ])
    else:
        run([
            "ffmpeg", "-y", "-i", str(voice), "-af", f"apad=pad_dur={TAIL},loudnorm=I=-14:TP=-1.5:LRA=11",
            "-t", f"{total:.3f}", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", str(out),
        ])
    return out


def render_video(
    channel: dict,
    visuals: list[str],
    durations: list[float],
    voice_files: list[Path],
    ass_file: Path,
    work: Path,
    out: Path,
) -> float:
    st = channel["style"]
    grade = st.get("grade") or "null"
    picker = FootagePicker(channel["footage"]["fallback_queries"])
    if not picker.enabled:
        print("  ! PEXELS_API_KEY absente : fond animé de secours à la place des vidéos.")

    shots: list[Path] = []
    durations = list(durations)
    durations[-1] += TAIL
    for si, (query, dur) in enumerate(zip(visuals, durations)):
        for k, d in enumerate(split_shots(dur)):
            clip = picker.pick(query, d)
            shot = work / f"shot_{len(shots):03d}.mp4"
            make_shot(clip, d, grade, shot, len(shots), channel["id"])
            shots.append(shot)
    video = work / "video.mp4"
    concat(shots, video, work)

    total = sum(durations)
    audio = build_audio(channel, voice_files, total, work)

    post = []
    if st.get("vignette"):
        post.append("vignette=PI/4.5")
    if st.get("grain"):
        post.append(f"noise=alls={int(st['grain'])}:allf=t")
    post.append(f"ass='{ass_file.resolve()}':fontsdir='{FONTS_DIR.resolve()}'")
    out.parent.mkdir(parents=True, exist_ok=True)
    run([
        "ffmpeg", "-y", "-i", str(video), "-i", str(audio),
        "-vf", ",".join(post), "-map", "0:v", "-map", "1:a",
        "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-maxrate", "4500k", "-bufsize", "9000k",
        "-pix_fmt", "yuv420p", "-r", str(FPS), "-c:a", "copy", "-movflags", "+faststart",
        "-t", f"{total:.3f}", str(out),
    ])
    return total
