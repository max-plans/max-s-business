"""Visuels de chaque scène — uniquement des sources gratuites.

- ai     : images générées par Pollinations.ai (gratuit, sans clé ; un jeton gratuit optionnel
           accélère et retire le filigrane). Nécessite Internet.
- pexels : vidéos libres de droits Pexels (clé API gratuite).
- local  : fonds générés sur ton ordinateur (dégradés, bokeh, particules) — toujours disponible.
On essaie dans cet ordre la source choisie puis les suivantes, jusqu'au fond local.
"""
from __future__ import annotations

import hashlib
import io
import random
import re
import threading
import time
import urllib.parse
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFilter

from ..paths import CACHE_DIR

WIDTH, HEIGHT = 1080, 1920
_poll_lock = threading.Lock()
_last_poll = 0.0
_poll_down_until = 0.0


def scene_visual(acc: dict, scene: dict, idx: int, video_id: int, cfg: dict, local_panda: bool) -> tuple[Path, str, str]:
    """Renvoie (fichier, 'image'|'video', source utilisée)."""
    source = cfg["visual_source"].get(acc["id"], "ai")
    order = {"ai": ["ai", "pexels", "local"], "pexels": ["pexels", "ai", "local"], "local": ["local"]}[source]
    for src in order:
        try:
            if src == "ai":
                style_key = (cfg.get("image_styles") or {}).get(acc["id"]) or None
                # même graine pour toute la vidéo → personnage et style plus cohérents d'une scène à l'autre
                from ..accounts import MASCOT_SEED
                seed = MASCOT_SEED if acc.get("mascot") else video_id * 7 + 1
                p = pollinations(_ai_prompt(acc, scene, local_panda, style_key), seed=seed, token=cfg.get("pollinations_token", ""))
                if p:
                    return p, "image", "ai"
            elif src == "pexels" and cfg.get("pexels_key"):
                p = pexels(scene.get("image_prompt") or scene.get("visual", ""), cfg["pexels_key"], 5)
                if p:
                    return p, "video", "pexels"
            elif src == "local":
                return local_background(acc, video_id * 37 + idx), "image", "local"
        except Exception as e:  # noqa: BLE001
            print(f"  ! source {src} indisponible : {type(e).__name__}: {e}")
    return local_background(acc, video_id * 37 + idx), "image", "local"


def _ai_prompt(acc: dict, scene: dict, local_panda: bool, style_key: str | None = None) -> str:
    from ..accounts import image_prompt

    desc = scene.get("image_prompt") or scene.get("visual") or acc["theme"]
    if acc.get("mascot") and local_panda:
        # Le panda animé est ajouté par-dessus : on ne génère que le décor.
        desc = re.sub(r"\b(the |a )?panda('s)?\b", "", desc, flags=re.I).strip(" ,")
        return f"{desc}, luxurious elegant interior or city background, empty scene, no people, no animals, cinematic lighting, bokeh, vertical 9:16, no text"
    return image_prompt(acc, desc, style_key)


# ------------------------------------------------------------------ Pollinations

last_error = ""


def pollinations(prompt: str, seed: int, token: str = "") -> Path | None:
    """Image IA via Pollinations.

    Avec une clé gratuite (enter.pollinations.ai, crédit hebdomadaire offert, sans carte bancaire) on utilise
    l'API officielle gen.pollinations.ai ; sans clé, l'ancienne adresse publique (de moins en moins fiable).
    """
    global _last_poll, _poll_down_until, last_error
    q = urllib.parse.quote(prompt[:900])
    params = f"width={WIDTH}&height={HEIGHT}&seed={seed}&model=flux&nologo=true&safe=true"
    if token:
        url = f"https://gen.pollinations.ai/image/{q}?{params}"
    else:
        url = f"https://image.pollinations.ai/prompt/{q}?{params}"
    cache = CACHE_DIR / "ai" / (hashlib.sha1((q + params).encode()).hexdigest() + ".jpg")
    if cache.exists():
        return cache
    if time.time() < _poll_down_until:
        return None
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    for attempt in range(4):
        with _poll_lock:  # respecte la limite gratuite
            wait = (2 if token else 15) - (time.time() - _last_poll)
            if wait > 0:
                time.sleep(wait)
            try:
                r = requests.get(url, headers=headers, timeout=180)
            except requests.RequestException as e:
                _last_poll = time.time()
                last_error = f"service injoignable ({type(e).__name__})"
                if attempt >= 1:
                    _poll_down_until = time.time() + 600   # service injoignable : on n'insiste pas 10 min
                    return None
                continue
            _last_poll = time.time()
        if r.status_code in (401, 402, 403):
            last_error = ("clé Pollinations invalide ou crédit épuisé" if token
                          else "Pollinations demande maintenant une clé gratuite (enter.pollinations.ai)")
            _poll_down_until = time.time() + 600
            return None
        if r.status_code == 429:
            last_error = "trop de demandes, limite gratuite atteinte"
            time.sleep(20 * (attempt + 1))
            continue
        if not r.ok:
            last_error = f"erreur {r.status_code}"
            continue
        try:
            img = Image.open(io.BytesIO(r.content)).convert("RGB")
        except Exception:  # noqa: BLE001
            last_error = "réponse invalide (pas une image)"
            continue
        cache.parent.mkdir(parents=True, exist_ok=True)
        img.save(cache, quality=92)
        last_error = ""
        return cache
    return None


# ------------------------------------------------------------------ Pexels

_pexels_used: set[int] = set()


def pexels(query: str, key: str, min_duration: float) -> Path | None:
    r = requests.get(
        "https://api.pexels.com/videos/search",
        headers={"Authorization": key},
        params={"query": query[:80], "orientation": "portrait", "size": "medium", "per_page": 15},
        timeout=30,
    )
    r.raise_for_status()
    vids = [v for v in r.json().get("videos", []) if v["id"] not in _pexels_used and v.get("duration", 0) >= min_duration]
    random.shuffle(vids)
    for v in vids[:4]:
        files = [f for f in v.get("video_files", []) if f.get("width") and f.get("height") and f["height"] > f["width"]]
        if not files:
            continue
        f = min(files, key=lambda f: abs(f["width"] - 1080))
        path = CACHE_DIR / "pexels" / f"{v['id']}.mp4"
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            with requests.get(f["link"], stream=True, timeout=120) as resp:
                resp.raise_for_status()
                with path.with_suffix(".part").open("wb") as out:
                    for chunk in resp.iter_content(1 << 20):
                        out.write(chunk)
            path.with_suffix(".part").rename(path)
        _pexels_used.add(v["id"])
        return path
    return None


# ------------------------------------------------------------------ fonds locaux

def local_background(acc: dict, seed: int) -> Path:
    tag = hashlib.sha1(str(acc["style"]["bg"]).encode()).hexdigest()[:6]
    path = CACHE_DIR / "local_bg" / f"{acc['id']}_{tag}_{seed % 24}.jpg"
    if path.exists():
        return path
    rnd = random.Random(seed % 24)
    c0, c1, accent = acc["style"]["bg"]
    w, h = WIDTH // 2, HEIGHT // 2
    img = Image.new("RGB", (w, h))
    px = img.load()
    angle = rnd.uniform(0, 1)
    for y in range(h):
        for x in range(0, w):
            t = min(1.0, max(0.0, (y / h) * (1 - angle) + (x / w) * angle))
            px[x, y] = tuple(int(c0[i] + (c1[i] - c0[i]) * t) for i in range(3))
    # halos lumineux (bokeh)
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for _ in range(rnd.randint(14, 26)):
        r = rnd.randint(8, 70)
        x, y = rnd.randint(0, w), rnd.randint(0, h)
        a = rnd.randint(25, 80)
        gd.ellipse([x - r, y - r, x + r, y + r], fill=(*accent, a))
    glow = glow.filter(ImageFilter.GaussianBlur(10))
    img = img.convert("RGBA")
    img.alpha_composite(glow)
    # grand halo central
    halo = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(halo).ellipse([w * 0.1, h * 0.15, w * 0.9, h * 0.6], fill=(*accent, 40))
    img.alpha_composite(halo.filter(ImageFilter.GaussianBlur(80)))
    img = img.convert("RGB").resize((WIDTH, HEIGHT), Image.BICUBIC)
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, quality=92)
    return path
