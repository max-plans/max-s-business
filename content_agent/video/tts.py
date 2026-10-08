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


def synthesize(voice_cfg: dict, text: str, out: Path, engine: str = "edge",
               tone: str | None = None, emphasis: list[str] | tuple = ()) -> Spoken:
    """Lit `text` avec le ton demandé (accroche, suspense...) et les mots clés `emphasis` mis en valeur."""
    from . import delivery
    from .spoken import speakable
    text = speakable(text)  # chiffres, prix, pourcentages → mots prononcés comme un humain
    if engine == "elevenlabs":
        from . import elevenlabs
        el = {**voice_cfg["eleven"], "prev": speakable(voice_cfg["eleven"].get("prev", "")),
              "next": speakable(voice_cfg["eleven"].get("next", ""))}
        try:
            mp3, words = elevenlabs.synthesize(el["key"], el["voice"], text, out, el["model"], el.get("prev", ""),
                                               el.get("next", ""), el.get("speed", 1.0), tone, emphasis)
            return _finalize(mp3, out, [Word(w, s, e) for w, s, e in words], "elevenlabs")
        except elevenlabs.ElevenError as e:
            print(f"  ! {e} → voix gratuite Edge")
            engine = "edge"
    voice_cfg = delivery.with_tone(voice_cfg, tone, text)
    if engine == "edge":
        try:
            return _edge(voice_cfg, text, out, tone, emphasis)
        except Exception as e:  # noqa: BLE001 — réseau, service indisponible...
            print(f"  ! Edge TTS indisponible ({type(e).__name__}: {e}) → bascule sur Piper (local)")
    return _piper(voice_cfg, text, out)


# ------------------------------------------------------------------ lecture continue

CHUNK_SENTENCES = 7      # phrases lues d'un trait (au-delà, on enchaîne un nouveau bloc avec le contexte)
CHUNK_CHARS = 900


def synthesize_script(voice_cfg: dict, scenes: list[dict], work: Path, engine: str) -> list[Spoken] | None:
    """Lit le script PAR BLOCS DE PLUSIEURS PHRASES d'un seul trait, puis découpe l'audio scène par scène.

    Un humain ne relance pas son intonation à zéro à chaque phrase : il enchaîne, respire, garde l'élan. Lire
    chaque phrase séparément donne des débuts plats et des fins « posées » toutes identiques. Ici la voix voit
    toute la suite : liaisons, élan, fins de phrases naturelles. Renvoie None si ce n'est pas possible
    (le rendu repasse alors en phrase par phrase)."""
    from . import delivery
    from .spoken import speakable

    if engine not in ("edge", "elevenlabs") or not scenes:
        return None
    texts = [speakable(sc["voice"]) for sc in scenes]
    chunks: list[list[int]] = [[]]
    for i, t in enumerate(texts):
        cur = chunks[-1]
        if cur and (len(cur) >= CHUNK_SENTENCES or sum(len(texts[j]) for j in cur) + len(t) > CHUNK_CHARS):
            chunks.append([])
        chunks[-1].append(i)
    out: list[Spoken | None] = [None] * len(scenes)
    for c, idx in enumerate(chunks):
        items = [(texts[i], scenes[i].get("tone"), scenes[i].get("emphasis") or []) for i in idx]
        base = work / f"voicechunk_{c:02d}"
        try:
            if engine == "elevenlabs":
                from . import elevenlabs
                el = voice_cfg["eleven"]
                prev = " ".join(texts[max(0, idx[0] - 3):idx[0]])
                nxt = " ".join(texts[idx[-1] + 1:idx[-1] + 3])
                mp3, ws = elevenlabs.synthesize(el["key"], el["voice"], " ".join(t for t, _, _ in items), base,
                                                el["model"], prev, nxt, el.get("speed", 1.0), "narration", (),
                                                prepared=delivery.eleven_block(items, el["model"]))
                words = [Word(w, s, e) for w, s, e in ws]
            else:
                mp3, words = asyncio.run(_edge_block(voice_cfg, items, base))
        except Exception as e:  # noqa: BLE001
            print(f"  ! lecture continue impossible ({type(e).__name__}: {e}) → phrase par phrase")
            return None
        pieces = _split(mp3, words, [texts[i] for i in idx], [scenes[i].get("tone") for i in idx], work, idx[0])
        if not pieces:
            print("  ! lecture continue : découpage incertain → phrase par phrase")
            return None
        for i, sp in zip(idx, pieces):
            sp.engine = engine
            out[i] = sp
    return out  # type: ignore[return-value]


async def _edge_block(voice_cfg: dict, items: list, base: Path) -> tuple[Path, list[Word]]:
    import edge_tts

    from . import delivery

    mp3 = base.with_suffix(".mp3")
    words: list[Word] = []
    rich_ssml = delivery.edge_block(items, delivery.pct(voice_cfg.get("rate")), delivery.pct(voice_cfg.get("pitch")))
    plain = " ".join(t for t, _, _ in items)
    for attempt, rich in enumerate((True, True, False, False)):
        words.clear()
        try:
            if rich:   # vitesse / hauteur fixées phrase par phrase dans le SSML
                comm = edge_tts.Communicate(plain, voice_cfg["edge"], rate="+0%", pitch="+0Hz", boundary="WordBoundary")
                comm.texts = [rich_ssml]
            else:
                comm = edge_tts.Communicate(plain, voice_cfg["edge"], rate=voice_cfg.get("rate", "+0%"),
                                            pitch=voice_cfg.get("pitch", "+0Hz"), boundary="WordBoundary")
            with mp3.open("wb") as f:
                async for chunk in comm.stream():
                    if chunk["type"] == "audio":
                        f.write(chunk["data"])
                    elif chunk["type"] == "WordBoundary":
                        start = chunk["offset"] / 1e7
                        words.append(Word(chunk["text"], start, start + chunk["duration"] / 1e7))
            if mp3.stat().st_size == 0 or not words:
                raise RuntimeError("audio ou timings vides")
            return mp3, words
        except Exception:
            if attempt == 3:
                raise
            await asyncio.sleep(min(2 ** attempt, 4))
    raise RuntimeError("Edge indisponible")


def _key(w: str) -> str:
    from .delivery import norm
    return norm(clean_word(w))


def _split(src: Path, words: list[Word], texts: list[str], tones: list, work: Path, first: int) -> list[Spoken] | None:
    """Rattache chaque mot prononcé à sa phrase (alignement tolérant), puis coupe l'audio entre les phrases,
    au milieu de la respiration, en raccourcissant les silences trop longs."""
    import difflib

    from .delivery import DEFAULT_GAP, MAX_GAP, POLISH

    words = [w for w in words if _key(w.text)]
    script: list[tuple[str, int]] = [(_key(t), k) for k, text in enumerate(texts) for t in text.split() if _key(t)]
    if not words or not script:
        return None
    sm = difflib.SequenceMatcher(None, [k for k, _ in script], [_key(w.text) for w in words], autojunk=False)
    owner: list[int | None] = [None] * len(words)
    matched = 0
    for a, b, size in sm.get_matching_blocks():
        for o in range(size):
            owner[b + o] = script[a + o][1]
            matched += 1
    if matched < 0.75 * len(script):
        return None
    last = 0
    for i, o in enumerate(owner):           # mots non reconnus (« vingt-six » coupé en deux...) → phrase voisine
        if o is None:
            owner[i] = last
        else:
            last = o
    groups: list[list[Word]] = [[] for _ in texts]
    for w, o in zip(words, owner):
        groups[min(max(o, 0), len(texts) - 1)].append(w)
    # phrase sans mot reconnu = découpage douteux
    if any(not g for g in groups):
        return None
    for k in range(1, len(groups)):          # l'ordre doit être croissant
        if groups[k][0].start < groups[k - 1][-1].start:
            return None
    starts, ends = [0.0] * len(groups), [0.0] * len(groups)
    starts[0] = max(0.0, groups[0][0].start - 0.03)
    ends[-1] = groups[-1][-1].end + 0.15
    for k in range(len(groups) - 1):
        e, s = groups[k][-1].end, groups[k + 1][0].start
        keep = min(max(0.0, s - e), MAX_GAP.get(tones[k] or "", DEFAULT_GAP))
        # la phrase k garde ~65 % de la respiration, la suivante démarre avec le reste (silence trop long raccourci)
        ends[k] = e + keep * 0.65
        starts[k + 1] = max(ends[k], s - keep * 0.35)
    pieces: list[Spoken] = []
    for k, g in enumerate(groups):
        wav = work / f"voice_{first + k:02d}.wav"
        a0, a1 = starts[k], max(ends[k], starts[k] + 0.2)
        run(["ffmpeg", "-y", "-i", str(src), "-ss", f"{a0:.3f}", "-t", f"{a1 - a0:.3f}", "-af", POLISH,
             "-ar", "48000", "-ac", "2", str(wav)])
        ws = [Word(clean_word(w.text), w.start - a0, w.end - a0) for w in g]
        pieces.append(Spoken(wav, probe_duration(wav), [w for w in ws if w.text]))
    return pieces


# ------------------------------------------------------------------ Edge (phrase par phrase)

def _edge(voice_cfg: dict, text: str, out: Path, tone: str | None = None, emphasis: list[str] | tuple = ()) -> Spoken:
    return asyncio.run(_edge_async(voice_cfg, text, out, tone, emphasis))


async def _edge_async(voice_cfg: dict, text: str, out: Path, tone: str | None = None,
                      emphasis: list[str] | tuple = ()) -> Spoken:
    import edge_tts

    from . import delivery

    mp3 = out.with_suffix(".mp3")
    words: list[Word] = []
    # 2 essais en lecture « riche » (pauses, accents), puis 3 essais en lecture simple si le service refuse le SSML.
    for attempt, rich in enumerate((True, True, False, False, False)):
        words.clear()
        try:
            comm = edge_tts.Communicate(
                text, voice_cfg["edge"], rate=voice_cfg.get("rate", "+0%"), pitch=voice_cfg.get("pitch", "+0Hz"),
                boundary="WordBoundary",
            )
            if rich:
                comm.texts = [delivery.edge_ssml(text, tone, emphasis)]
            with mp3.open("wb") as f:
                async for chunk in comm.stream():
                    if chunk["type"] == "audio":
                        f.write(chunk["data"])
                    elif chunk["type"] == "WordBoundary":
                        start = chunk["offset"] / 1e7
                        words.append(Word(chunk["text"], start, start + chunk["duration"] / 1e7))
            if mp3.stat().st_size == 0:
                raise RuntimeError("audio vide")
            if not words:
                raise RuntimeError("pas de timings de mots")
            break
        except Exception:
            if attempt == 4:
                raise
            await asyncio.sleep(min(2 ** attempt, 4))
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
    # noise_scale / noise_w élevés = intonation et rythme plus variés (moins « plat »)
    cfg = SynthesisConfig(speaker_id=speaker, length_scale=voice_cfg.get("piper_speed", 1.0),
                          noise_scale=0.85, noise_w_scale=1.0)
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
        pause = (0.34 if phrase[-1] == "…" else 0.2 if phrase[-1] in ".!?" else 0.12 if phrase[-1] in ",;:" else 0.04)
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
        lead = max(0.0, float(words[0].start) - 0.03)
        end = float(words[-1].end) + 0.12
        cut = ["-ss", f"{lead:.3f}", "-t", f"{end - lead:.3f}"]
        for w in words:
            w.start, w.end = float(w.start) - lead, float(w.end) - lead
    from .delivery import POLISH
    # traitement « voix de narrateur » (compression douce, chaleur, présence) : même rendu d'une phrase à l'autre
    run(["ffmpeg", "-y", "-i", str(src), *cut, "-af", POLISH, "-ar", "48000", "-ac", "2", str(wav)])
    for w in words:
        w.text = clean_word(w.text)
    return Spoken(wav, probe_duration(wav), [w for w in words if w.text], engine)


def clean_word(text: str) -> str:
    text = text.strip().strip("«»\"“”()[]")
    text = re.sub(r"[.,;:…]+$", "", text)
    return text if any(c.isalnum() for c in text) else ""   # « — » et autres symboles ne sont pas des mots


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
