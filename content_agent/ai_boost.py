"""IA pour les vidéos satisfaisantes (trois interrupteurs indépendants, tout est gardé en cache) :

- textes : Claude (abonnement Claude Code, gratuit) écrit l'accroche et la légende de chaque vidéo ;
- images : Pollinations / Cloudflare / AI Horde (déjà configurés dans l'appli) peignent le fond de la vidéo et
  les personnages de Fusion (vraies planètes, vrais chatons…) ;
- sons : ElevenLabs (clé déjà dans l'appli) fabrique de vrais bruitages (miaou, rugissement, verre…) et la voix.

Si un service ne répond pas, la vidéo garde ses sons et dessins calculés sur le PC : elle ne casse jamais.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from . import settings
from .paths import DATA

CACHE = DATA / "ia_satisfaisant"
DOWN: dict = {}           # service tombé pendant cette vidéo : on ne le rappelle plus (pas d'attente inutile)
DEFAULT = {"texts": True, "images": False, "sounds": False}


def config() -> dict:
    return {**DEFAULT, **(settings.load().get("sat_ai") or {})}


def status() -> dict:
    """Ce qui est disponible pour chaque interrupteur (pour l'interface)."""
    cfg = settings.load()
    from . import llm
    claude_ok, claude_msg = llm.claude_available()
    img_ok = bool(cfg.get("pollinations_token") or (cfg.get("cloudflare_account_id") and cfg.get("cloudflare_token"))
                  or cfg.get("horde_enabled", True))
    return {**config(),
            "texts_ok": claude_ok, "texts_info": "Claude Code" if claude_ok else claude_msg,
            "images_ok": img_ok,
            "images_info": "Pollinations" if cfg.get("pollinations_token") else
            "Cloudflare" if cfg.get("cloudflare_token") else "AI Horde (gratuit, plus lent)",
            "sounds_ok": bool(cfg.get("elevenlabs_key")),
            "sounds_info": "ElevenLabs" if cfg.get("elevenlabs_key") else "Ajoute une clé ElevenLabs dans les réglages"}


def _h(*parts) -> str:
    return hashlib.sha1("|".join(str(p) for p in parts).encode()).hexdigest()[:16]


# ------------------------------------------------------------------ textes (Claude)

def hook_and_caption(concept: str, label: str, details: str) -> dict | None:
    """Accroche (courte, dans la vidéo) + légende TikTok écrites par Claude pour CETTE vidéo."""
    from . import llm
    schema = {"type": "object", "properties": {
        "hook": {"type": "string", "description": "accroche affichée en haut de la vidéo, 2 à 7 mots, sans emoji"},
        "caption": {"type": "string", "description": "légende TikTok : 1 phrase qui donne envie de commenter + 1-2 emojis"},
        "hashtags": {"type": "array", "items": {"type": "string"}, "description": "4 à 6 hashtags français et anglais"},
    }, "required": ["hook", "caption", "hashtags"]}
    system = ("Tu écris pour un compte TikTok de vidéos satisfaisantes (ASMR visuel) très viral. "
              "L'accroche doit arrêter le scroll dans les 3 premières secondes : question, défi, pari, suspense. "
              "Français familier, jamais de mensonge sur ce qu'on voit, pas de majuscules partout. "
              "N'utilise AUCUN chiffre sauf ceux donnés dans les détails.")
    prompt = (f"Vidéo : « {label} » (concept {concept}). Détails : {details}.\n"
              "Écris l'accroche (2 à 7 mots), la légende et les hashtags.")
    try:
        r = llm.generate_json(system, prompt, schema, task="sat_hook")
    except Exception as e:  # noqa: BLE001
        print(f"  ! textes IA indisponibles ({type(e).__name__}: {e})")
        return None
    hook = str(r.get("hook", "")).strip().strip('"«» ')
    if not (2 <= len(hook.split()) <= 9) or len(hook) > 48:
        return None
    tags = [("#" + t.lstrip("#").replace(" ", "")) for t in r.get("hashtags", [])][:6]
    return {"hook": hook, "caption": str(r.get("caption", "")).strip(), "tags": tags}


# ------------------------------------------------------------------ images (Pollinations / Cloudflare / Horde)

BG_PROMPTS = {
    "default": "dreamy abstract neon background, soft glowing bokeh lights, deep {c} and violet tones, smooth gradient, "
               "cinematic, vertical 9:16, empty center, no text, no people",
    "fusion": "deep space nebula background, stars, soft glowing {c} cosmic clouds, cinematic, vertical 9:16, no text",
    "billes": "colorful neon arcade background, soft blurred lights, {c} glow, depth of field, vertical 9:16, no text",
    "dominos": "cozy luxury wooden table top view, soft warm light, shallow depth of field, vertical 9:16, no text",
}


def _ai_image(prompt: str, seed: int) -> Path | None:
    from .video import visuals
    CACHE.mkdir(parents=True, exist_ok=True)
    dest = CACHE / f"img_{_h(prompt, seed)}.jpg"
    if dest.exists():
        return dest
    if DOWN.get("images"):
        return None
    try:
        p = visuals.ai_image(prompt, seed, settings.load())
    except Exception as e:  # noqa: BLE001
        print(f"  ! image IA indisponible ({type(e).__name__}: {e})")
        DOWN["images"] = True
        return None
    if not p:
        print(f"  ! image IA indisponible ({getattr(visuals, 'last_error', '')})")
        DOWN["images"] = True
        return None
    Image.open(p).convert("RGB").save(dest, quality=93)
    return dest


def background(concept: str, color_word: str, seed: int, size: tuple[int, int]) -> Image.Image | None:
    """Fond peint par l'IA, assombri et adouci pour que l'animation reste bien lisible devant."""
    prompt = BG_PROMPTS.get(concept, BG_PROMPTS["default"]).format(c=color_word)
    p = _ai_image(prompt, seed % 50)                 # 50 variantes par concept, puis le cache les réutilise
    if not p:
        return None
    im = Image.open(p).convert("RGB")
    w, h = size
    s = max(w / im.width, h / im.height)
    im = im.resize((int(im.width * s) + 1, int(im.height * s) + 1), Image.LANCZOS)
    im = im.crop(((im.width - w) // 2, (im.height - h) // 2, (im.width - w) // 2 + w, (im.height - h) // 2 + h))
    im = im.filter(ImageFilter.GaussianBlur(6))
    return Image.blend(im, Image.new("RGB", size, (6, 7, 14)), 0.5)


CHAR_PROMPTS = {
    "planetes": "photorealistic {n} planet seen from space, NASA style, perfectly centered, whole planet visible, "
                "pure black background, high detail",
    "chats": "adorable {n} cat face portrait, fluffy, big shiny eyes, perfectly centered, looking at camera, "
             "studio light, plain dark background, high detail",
    "fruits": "cute glossy 3D {n} fruit with a tiny happy kawaii face, perfectly centered, studio light, plain dark background",
    "monstres": "cute round 3D pixar style little monster named {n}, perfectly centered, studio light, plain dark background",
}
NAMES_EN = {"LUNE": "the Moon", "MERCURE": "Mercury", "MARS": "Mars", "VÉNUS": "Venus", "TERRE": "Earth",
            "NEPTUNE": "Neptune", "URANUS": "Uranus", "SATURNE": "Saturn with its rings", "JUPITER": "Jupiter",
            "SOLEIL": "the Sun star glowing", "CHATON": "tiny kitten", "MINOU": "ginger kitten", "MATOU": "black cat",
            "SIAMOIS": "siamese", "PERSAN": "white persian", "MAINE COON": "maine coon", "LYNX": "lynx",
            "PUMA": "puma", "TIGRE": "tiger", "LION": "majestic lion", "CERISE": "cherry", "FRAISE": "strawberry",
            "RAISIN": "grape", "CLÉMENTINE": "clementine", "ORANGE": "orange", "POMME": "apple", "POIRE": "pear",
            "PÊCHE": "peach", "ANANAS": "pineapple", "PASTÈQUE": "watermelon"}


def character(theme: str, lvl: int, name: str, rp: int) -> Image.Image | None:
    """Personnage de Fusion fait par l'IA (une fois par perso), découpé en rond avec contour et reflet."""
    if theme not in CHAR_PROMPTS:
        return None
    prompt = CHAR_PROMPTS[theme].format(n=NAMES_EN.get(name, name.lower()))
    p = _ai_image(prompt, 7 + lvl)
    if not p:
        return None
    im = Image.open(p).convert("RGB")
    side = int(min(im.width, im.height) * (0.8 if theme == "planetes" else 0.72))
    cx, cy = im.width // 2, im.height // 2
    im = im.crop((cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2)).resize((2 * rp, 2 * rp), Image.LANCZOS)
    arr = np.asarray(im, np.float32)
    yy, xx = np.mgrid[0:2 * rp, 0:2 * rp].astype(np.float32)
    d = np.sqrt((xx - rp + 0.5) ** 2 + (yy - rp + 0.5) ** 2) / rp
    shade = 1.0 - 0.25 * np.clip(d, 0, 1) ** 3
    hl = np.exp(-(((xx - rp * 0.62) / rp) ** 2 + ((yy - rp * 0.55) / rp) ** 2) / 0.03) * 0.3
    rgb = np.clip(arr * shade[..., None] + 255 * hl[..., None], 0, 255)
    alpha = np.clip((1 - d) * rp, 0, 1) * 255
    out = Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8), "RGBA")
    ImageDraw.Draw(out).ellipse([1, 1, 2 * rp - 2, 2 * rp - 2], outline=(12, 12, 20, 255), width=max(2, rp // 16))
    return out


# ------------------------------------------------------------------ sons (ElevenLabs)

def sfx(prompt: str, seconds: float = 1.0, sr: int = 44100) -> np.ndarray | None:
    """Bruitage fabriqué par l'IA ElevenLabs (texte -> son), gardé en cache."""
    import requests
    from .video.elevenlabs import BASE
    key = settings.load().get("elevenlabs_key", "")
    if not key:
        return None
    CACHE.mkdir(parents=True, exist_ok=True)
    mp3 = CACHE / f"sfx_{_h(prompt, seconds)}.mp3"
    if not mp3.exists():
        if DOWN.get("sounds"):
            return None
        try:
            r = requests.post(f"{BASE}/v1/sound-generation", headers={"xi-api-key": key},
                              json={"text": prompt, "duration_seconds": max(0.5, min(5.0, seconds)), "prompt_influence": 0.55},
                              timeout=60)
            if not r.ok:
                print(f"  ! son IA refusé ({r.status_code}) : {r.text[:120]}")
                DOWN["sounds"] = True
                return None
            mp3.write_bytes(r.content)
        except Exception as e:  # noqa: BLE001
            print(f"  ! son IA indisponible ({type(e).__name__}: {e})")
            DOWN["sounds"] = True
            return None
    return _decode(mp3, sr)


def _decode(path: Path, sr: int) -> np.ndarray | None:
    try:
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(sr),
                              "-af", "lowpass=f=7000", "-f", "s16le", "-"], capture_output=True, check=True).stdout
    except Exception:  # noqa: BLE001
        return None
    x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
    return x / (np.max(np.abs(x)) or 1) if len(x) else None


ELEVEN_VOICE = {"planetes": "pNInz6obpgDQGcFmaJgB", "fruits": "EXAVITQu4vr4xnVDxMlj", "monstres": "TxGEqnHWrfWFTfGW9XjX"}


def voice(theme: str, text: str, sr: int = 44100) -> np.ndarray | None:
    """Voix d'annonceur ElevenLabs (plus naturelle que la voix gratuite), gardée en cache."""
    cfg = settings.load()
    key = cfg.get("elevenlabs_key", "")
    if not key or theme not in ELEVEN_VOICE:
        return None
    CACHE.mkdir(parents=True, exist_ok=True)
    out = CACHE / f"voix_{_h(theme, text)}.mp3"
    if not out.exists():
        if DOWN.get("voice"):
            return None
        try:
            from .video.elevenlabs import synthesize
            mp3, _ = synthesize(key, ELEVEN_VOICE[theme], text, out, "eleven_multilingual_v2")
            if Path(mp3) != out:
                Path(mp3).replace(out)
        except Exception as e:  # noqa: BLE001
            print(f"  ! voix IA indisponible ({type(e).__name__}: {e})")
            DOWN["voice"] = True
            return None
    return _decode(out, sr)


MERGE_SFX = {
    "chats": ["tiny kitten meow, cute, close mic", "small cat meow, cute", "cat meow", "siamese cat meow", "fluffy cat meow",
              "big cat meow, deep", "lynx growl short", "puma growl", "tiger roar short", "lion roar, epic, short"],
    "fruits": ["juicy fruit squish pop, satisfying, asmr"] * 5 + ["big juicy fruit squish, satisfying"] * 5,
    "planetes": ["soft cosmic whoosh with deep boom, satisfying"] * 6 + ["huge deep cosmic boom, epic, satisfying"] * 4,
    "monstres": ["cute cartoon creature says wah, funny"] * 5 + ["big cartoon monster grunt, funny"] * 5,
}


def merge_sound(theme: str, lvl: int) -> np.ndarray | None:
    lst = MERGE_SFX.get(theme)
    if not lst:
        return None
    return sfx(lst[min(lvl, len(lst) - 1)], 1.0 if lvl < 8 else 1.6)


def save_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
