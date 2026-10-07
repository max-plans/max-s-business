"""Voix off gratuite avec timings mot par mot.

- edge  : voix neuronales Microsoft Edge (gratuit, sans clé, nécessite Internet). Timings exacts.
- piper : synthèse 100 % locale et open source (https://github.com/rhasspy/piper).
          Les voix (~60 Mo) sont téléchargées une fois. Timings estimés par phrase.
Si Edge échoue, on bascule automatiquement sur Piper.
"""
from __future__ import annotations

import asyncio
import logging
import re
import tarfile
import threading
import wave
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import requests

from ..paths import VOICES_DIR
from .media import probe_duration, run


@dataclass
class Word:
    text: str
    start: float
    end: float


@dataclass
class Spoken:
    audio: Path
    duration: float
    words: list[Word] = field(default_factory=list)
    engine: str = ""


def synthesize(voice_cfg: dict, text: str, out: Path, engine: str = "edge") -> Spoken:
    if engine == "elevenlabs":
        from . import elevenlabs
        el = voice_cfg["eleven"]
        try:
            mp3, words = elevenlabs.synthesize(el["key"], el["voice"], text, out, el["model"],
                                               el.get("prev", ""), el.get("next", ""), el.get("speed", 1.0))
            return _finalize(mp3, out, [Word(w, s, e) for w, s, e in words], "elevenlabs")
        except elevenlabs.ElevenError as e:
            print(f"  ! {e} → voix gratuite Edge")
            engine = "edge"
    if engine == "edge":
        try:
            return _edge(voice_cfg, text, out)
        except Exception as e:  # noqa: BLE001 — réseau, service indisponible...
            print(f"  ! Edge TTS indisponible ({type(e).__name__}: {e}) → bascule sur Piper (local)")
    return _piper(voice_cfg, text, out)


# ------------------------------------------------------------------ Edge

def _edge(voice_cfg: dict, text: str, out: Path) -> Spoken:
    return asyncio.run(_edge_async(voice_cfg, text, out))


async def _edge_async(voice_cfg: dict, text: str, out: Path) -> Spoken:
    import edge_tts

    mp3 = out.with_suffix(".mp3")
    words: list[Word] = []
    for attempt in range(3):
        words.clear()
        try:
            comm = edge_tts.Communicate(
                text, voice_cfg["edge"], rate=voice_cfg.get("rate", "+0%"), pitch=voice_cfg.get("pitch", "+0Hz"),
                boundary="WordBoundary",
            )
            with mp3.open("wb") as f:
                async for chunk in comm.stream():
                    if chunk["type"] == "audio":
                        f.write(chunk["data"])
                    elif chunk["type"] == "WordBoundary":
                        start = chunk["offset"] / 1e7
                        words.append(Word(chunk["text"], start, start + chunk["duration"] / 1e7))
            if mp3.stat().st_size == 0:
                raise RuntimeError("audio vide")
            break
        except Exception:
            if attempt == 2:
                raise
            await asyncio.sleep(2 ** attempt)
    return _finalize(mp3, out, words, "edge")


# ------------------------------------------------------------------ Piper

logging.getLogger("piper").setLevel(logging.ERROR)
logging.getLogger("piper.phoneme_ids").setLevel(logging.ERROR)

_HF = "https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR"
_GH_FALLBACK = ("fr-siwis-medium", "https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-fr-siwis-medium.tar.gz")
_voices: dict[str, object] = {}
_missing_voices: set[str] = set()
_voice_lock = threading.Lock()


def ensure_piper_voice(name: str) -> Path:
    """Télécharge la voix Piper si besoin et renvoie le chemin du .onnx."""
    path = VOICES_DIR / f"{name}.onnx"
    if path.exists() and path.with_suffix(".onnx.json").exists():
        return path
    # ex: fr_FR-tom-medium → fr_FR/tom/medium/
    try:
        if name in _missing_voices:
            raise FileNotFoundError("déjà indisponible")
        _, speaker, quality = name.split("-")
        for suffix in (".onnx", ".onnx.json"):
            _download(f"{_HF}/{speaker}/{quality}/{name}{suffix}", VOICES_DIR / f"{name}{suffix}")
        return path
    except Exception as e:  # noqa: BLE001
        if name not in _missing_voices:
            print(f"  ! Voix Piper {name} introuvable sur HuggingFace ({type(e).__name__}), voix de secours GitHub.")
        _missing_voices.add(name)
    fb_name, url = _GH_FALLBACK
    fb = VOICES_DIR / f"{fb_name}.onnx"
    if not fb.exists():
        tgz = VOICES_DIR / "fallback.tar.gz"
        _download(url, tgz)
        with tarfile.open(tgz) as t:
            for m in t.getmembers():
                if m.name.endswith((".onnx", ".onnx.json")):
                    m.name = Path(m.name).name
                    t.extract(m, VOICES_DIR)
        tgz.unlink()
    return fb


def _download(url: str, dest: Path) -> None:
    tmp = dest.with_suffix(dest.suffix + ".part")
    with requests.get(url, stream=True, timeout=60) as r:
        r.raise_for_status()
        with tmp.open("wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)
    tmp.rename(dest)


def _load_voice(path: Path):
    from piper import PiperVoice

    with _voice_lock:
        if str(path) not in _voices:
            _voices[str(path)] = PiperVoice.load(str(path))
        return _voices[str(path)]


_PHRASE = re.compile(r"[^.!?;:,…]+[.!?;:,…]*")


def _piper(voice_cfg: dict, text: str, out: Path) -> Spoken:
    from piper import SynthesisConfig

    model = ensure_piper_voice(voice_cfg.get("piper", "fr_FR-siwis-medium"))
    voice = _load_voice(model)
    speaker = voice_cfg.get("piper_speaker")
    if speaker is not None and voice.config.num_speakers <= 1:
        speaker = None
    cfg = SynthesisConfig(speaker_id=speaker, length_scale=voice_cfg.get("piper_speed", 1.0))
    rate = voice.config.sample_rate

    pieces: list[np.ndarray] = []
    words: list[Word] = []
    t = 0.0
    for phrase in (p.strip() for p in _PHRASE.findall(text)):
        if not phrase:
            continue
        audio = np.concatenate([c.audio_int16_array for c in voice.synthesize(phrase, syn_config=cfg)] or [np.zeros(1, np.int16)])
        dur = len(audio) / rate
        # timings estimés : durée de la phrase répartie selon la longueur des mots
        ws = phrase.split()
        weights = np.array([len(w) + 2 for w in ws], dtype=float)
        lead, tail = 0.06, 0.08
        usable = max(dur - lead - tail, 0.1)
        cursor = t + lead
        for w, wt in zip(ws, weights / weights.sum()):
            d = usable * wt
            words.append(Word(w, float(cursor), float(cursor + d * 0.92)))
            cursor += d
        pieces.append(audio)
        pause = 0.22 if phrase[-1] in ".!?…" else 0.1 if phrase[-1] in ",;:" else 0.04
        pieces.append(np.zeros(int(pause * rate), np.int16))
        t += dur + pause

    raw = out.with_name(out.name + "_piper.wav")
    with wave.open(str(raw), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(np.concatenate(pieces).tobytes())
    return _finalize(raw, out, words, "piper")


# ------------------------------------------------------------------ commun

def _finalize(src: Path, out: Path, words: list[Word], engine: str) -> Spoken:
    wav = out.with_suffix(".wav")
    cut = []
    if engine in ("edge", "elevenlabs") and words and words[-1].end > words[0].start:
        # On retire les blancs avant/après la phrase : enchaînement nerveux entre les scènes, comme sur TikTok.
        lead = max(0.0, float(words[0].start) - 0.04)
        end = float(words[-1].end) + 0.14
        cut = ["-ss", f"{lead:.3f}", "-t", f"{end - lead:.3f}"]
        for w in words:
            w.start, w.end = float(w.start) - lead, float(w.end) - lead
    run(["ffmpeg", "-y", "-i", str(src), *cut, "-ar", "48000", "-ac", "2", str(wav)])
    for w in words:
        w.text = clean_word(w.text)
    return Spoken(wav, probe_duration(wav), [w for w in words if w.text], engine)


def clean_word(text: str) -> str:
    text = text.strip().strip("«»\"“”()[]")
    return re.sub(r"[.,;:…]+$", "", text)


def voice_envelope(wav: Path, fps: int) -> np.ndarray:
    """Volume de la voix image par image (pour animer la bouche du panda)."""
    with wave.open(str(wav)) as w:
        n, ch, rate = w.getnframes(), w.getnchannels(), w.getframerate()
        data = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32)
    if ch > 1:
        data = data.reshape(-1, ch).mean(axis=1)
    hop = rate // fps
    frames = len(data) // hop
    if frames == 0:
        return np.zeros(0)
    rms = np.sqrt((data[: frames * hop].reshape(frames, hop) ** 2).mean(axis=1))
    peak = np.percentile(rms, 95) or 1.0
    return np.clip(rms / peak, 0, 1)
