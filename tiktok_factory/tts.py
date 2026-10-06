"""Voix off : Edge TTS (gratuit) ou ElevenLabs (premium), avec timings mot par mot."""
from __future__ import annotations

import asyncio
import base64
import os
import re
from dataclasses import dataclass, field
from pathlib import Path

import requests

from .media import probe_duration, run


@dataclass
class Word:
    text: str
    start: float
    end: float


@dataclass
class SpokenSegment:
    audio: Path
    duration: float
    words: list[Word] = field(default_factory=list)  # temps relatifs au début du segment


def synthesize(channel: dict, text: str, out: Path, rate: str | None = None) -> SpokenSegment:
    v = channel["voice"]
    if v.get("engine") == "elevenlabs" and os.environ.get("ELEVENLABS_API_KEY") and v.get("elevenlabs_voice_id"):
        return _elevenlabs(v["elevenlabs_voice_id"], text, out)
    return asyncio.run(_edge(v["edge_voice"], text, out, rate or v.get("rate", "+0%"), v.get("pitch", "+0Hz")))


async def _edge(voice: str, text: str, out: Path, rate: str, pitch: str) -> SpokenSegment:
    import edge_tts

    mp3 = out.with_suffix(".mp3")
    words: list[Word] = []
    for attempt in range(4):
        words.clear()
        try:
            comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
            with mp3.open("wb") as f:
                async for chunk in comm.stream():
                    if chunk["type"] == "audio":
                        f.write(chunk["data"])
                    elif chunk["type"] == "WordBoundary":
                        start = chunk["offset"] / 1e7
                        words.append(Word(chunk["text"], start, start + chunk["duration"] / 1e7))
            break
        except Exception:  # erreurs réseau transitoires du service Edge
            if attempt == 3:
                raise
            await asyncio.sleep(2 ** attempt)
    return _finalize(mp3, out, words)


def _elevenlabs(voice_id: str, text: str, out: Path) -> SpokenSegment:
    r = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps",
        headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"]},
        json={
            "text": text,
            "model_id": os.environ.get("ELEVENLABS_MODEL", "eleven_multilingual_v2"),
            "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.3},
        },
        timeout=120,
    )
    r.raise_for_status()
    data = r.json()
    mp3 = out.with_suffix(".mp3")
    mp3.write_bytes(base64.b64decode(data["audio_base64"]))

    al = data["alignment"]
    words: list[Word] = []
    cur, start, end = "", None, 0.0
    for ch, s, e in zip(al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]):
        if ch.isspace():
            if cur:
                words.append(Word(cur, start, end))
            cur, start = "", None
            continue
        if start is None:
            start = s
        cur += ch
        end = e
    if cur:
        words.append(Word(cur, start, end))
    return _finalize(mp3, out, words)


def _finalize(mp3: Path, out: Path, words: list[Word]) -> SpokenSegment:
    wav = out.with_suffix(".wav")
    run(["ffmpeg", "-y", "-i", str(mp3), "-ar", "48000", "-ac", "2", str(wav)])
    for w in words:
        w.text = clean_word(w.text)
    words = [w for w in words if w.text]
    return SpokenSegment(wav, probe_duration(wav), words)


def clean_word(text: str) -> str:
    # On garde ? et ! qui donnent du rythme, on retire le reste de la ponctuation.
    text = text.strip().strip("«»\"“”()[]")
    return re.sub(r"[.,;:…]+$", "", text)
