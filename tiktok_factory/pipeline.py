"""Orchestration : script → voix → sous-titres → montage."""
from __future__ import annotations

import datetime as dt
import json
import re
import shutil
import unicodedata
from dataclasses import dataclass
from pathlib import Path

from .config import DATA_DIR, OUTPUT_DIR
from .fonts import resolve_font
from .render import render_video
from .script_writer import VideoScript, write_script
from .subtitles import Overlay, build_timed_words, write_ass
from .tts import synthesize

MIN_DURATION = 62.0  # TikTok Creator Rewards : vidéos de plus d'1 minute


@dataclass
class Result:
    video: Path
    caption: str
    script: VideoScript
    duration: float


def _slug(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:50] or "video"


def history_path(channel_id: str) -> Path:
    return DATA_DIR / "history" / f"{channel_id}.json"


def load_history(channel_id: str) -> list[dict]:
    p = history_path(channel_id)
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else []


def save_history(channel_id: str, entry: dict) -> None:
    hist = load_history(channel_id)
    hist.append(entry)
    p = history_path(channel_id)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(hist, ensure_ascii=False, indent=2), encoding="utf-8")


def build_caption(channel: dict, script: VideoScript) -> str:
    tags: list[str] = []
    for t in [*script.hashtags, *channel["script"].get("hashtags", [])]:
        t = "#" + t.lstrip("#").replace(" ", "")
        if t.lower() not in (x.lower() for x in tags):
            tags.append(t)
    caption = script.caption.strip()
    if channel["script"].get("disclaimer"):
        caption += f"\n{channel['script']['disclaimer']}"
    return f"{caption}\n\n{' '.join(tags[:8])}"


def produce(channel: dict, topic: str | None = None, script: VideoScript | None = None, keep_work: bool = False) -> Result:
    cid = channel["id"]
    history = load_history(cid)
    stamp = dt.datetime.now().strftime("%Y-%m-%d_%H%M")

    if script is None:
        print(f"[{cid}] ✍️  Écriture du script...")
        script = write_script(channel, topic, [h["title"] for h in history])
    print(f"[{cid}] 📝 « {script.title} » ({len(script.segments)} segments)")

    out_dir = OUTPUT_DIR / dt.date.today().isoformat() / cid
    work = out_dir / f"_work_{stamp}"
    work.mkdir(parents=True, exist_ok=True)

    print(f"[{cid}] 🎙️  Voix off...")
    spoken = [synthesize(channel, s.text, work / f"voice_{i:02d}") for i, s in enumerate(script.segments)]
    total = sum(s.duration for s in spoken)
    if total < MIN_DURATION:
        # Un peu trop court : on ralentit légèrement la voix plutôt que de tout réécrire.
        slower = max(-25, round((total / MIN_DURATION - 1) * 100) - 4 + _pct(channel["voice"].get("rate", "+0%")))
        if total >= MIN_DURATION * 0.85:
            print(f"[{cid}]    durée {total:.1f}s < {MIN_DURATION}s → voix ralentie ({slower:+d}%)")
            spoken = [
                synthesize(channel, s.text, work / f"voice_{i:02d}", rate=f"{slower:+d}%")
                for i, s in enumerate(script.segments)
            ]
            total = sum(s.duration for s in spoken)
        if total < MIN_DURATION - 2:
            raise RuntimeError(f"Vidéo trop courte ({total:.1f}s).")

    offsets, t = [], 0.0
    for s in spoken:
        offsets.append(t)
        t += s.duration

    print(f"[{cid}] 🔤 Sous-titres...")
    words = build_timed_words([s.words for s in spoken], offsets, [s.emphasis for s in script.segments])
    highlights = [
        Overlay(seg.highlight, offsets[i] + 0.1, offsets[i] + spoken[i].duration)
        for i, seg in enumerate(script.segments)
        if seg.highlight.strip()
    ]
    ass = work / "subs.ass"
    font = resolve_font(channel["style"].get("font", "anton"))
    write_ass(ass, channel, font, words, Overlay(script.hook_text, 0.0, min(3.2, total)), highlights, total + 0.8)

    print(f"[{cid}] 🎬 Montage...")
    video = out_dir / f"{stamp}_{_slug(script.title)}.mp4"
    duration = render_video(
        channel, [s.visual for s in script.segments], [s.duration for s in spoken],
        [s.audio for s in spoken], ass, work, video,
    )

    caption = build_caption(channel, script)
    video.with_suffix(".txt").write_text(caption, encoding="utf-8")
    video.with_suffix(".json").write_text(script.model_dump_json(indent=2), encoding="utf-8")
    save_history(cid, {"date": stamp, "title": script.title, "file": video.name})
    if not keep_work:
        shutil.rmtree(work, ignore_errors=True)
    print(f"[{cid}] ✅ {video} ({duration:.1f}s)")
    return Result(video, caption, script, duration)


def _pct(rate: str) -> int:
    m = re.match(r"([+-]?\d+)%", rate.strip())
    return int(m.group(1)) if m else 0
