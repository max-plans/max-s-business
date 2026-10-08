"""Visuels de chaque scène — uniquement des sources gratuites.

- ai     : images IA (FLUX), avec plusieurs sources gratuites essayées dans l'ordre :
           Pollinations (clé gratuite, crédit hebdomadaire) puis Cloudflare Workers AI (compte gratuit,
           quota quotidien). Une source épuisée est sautée jusqu'à sa recharge. Nécessite Internet.
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


def scene_visual(acc: dict, scene: dict, idx: int, video_id: int, cfg: dict, local_panda: bool,
                 attempt: int = 0, hint: str = "") -> tuple[Path, str, str]:
    """Renvoie (fichier, 'image'|'video', source utilisée)."""
    source = cfg["visual_source"].get(acc["id"], "ai")
    order = {"ai": ["ai", "pexels", "local"], "pexels": ["pexels", "ai", "local"], "local": ["local"]}[source]
    for src in order:
        try:
            if src == "ai":
                style_key = (cfg.get("image_styles") or {}).get(acc["id"]) or None
                # même graine pour toute la vidéo → personnage et style plus cohérents d'une scène à l'autre
                from .. import characters
                base = video_id * 7 + 1
                if acc.get("mascot") and scene.get("with_panda", True):
                    base = characters.seed_for(characters.PANDA_SLUG)
                else:
                    named = [characters.get(n) for n in scene.get("characters") or []]
                    named = [c for c in named if c]
                    if named:
                        base = characters.seed_for(named[0]["slug"])
                seed = base + attempt * 1013 + (idx * 17 if attempt else 0)
                p = ai_image(_ai_prompt(acc, scene, local_panda, style_key, hint), seed, cfg)
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


def _ai_prompt(acc: dict, scene: dict, local_panda: bool, style_key: str | None = None, hint: str = "") -> str:
    from ..accounts import image_prompt

    desc = scene.get("image_prompt") or scene.get("visual") or acc["theme"]
    if acc.get("mascot") and local_panda and scene.get("with_panda", True):
        # Le panda animé est ajouté par-dessus : on ne génère que le décor.
        desc = re.sub(r"\b(the |a )?panda('s)?\b", "", desc, flags=re.I).strip(" ,")
        return f"{desc}, luxurious elegant interior or city background, empty scene, no people, no animals, cinematic lighting, bokeh, vertical 9:16, no text"
    from .. import characters
    named = [characters.get(n) for n in scene.get("characters") or [] if not characters.is_panda(n)]
    chars = [(c["name"], c["description"]) for c in named if c]
    return image_prompt(acc, desc, style_key, scene.get("with_panda", True), hint, chars)


# ------------------------------------------------------------------ choix de la source d'images IA

last_error = ""
last_provider = ""


def ai_image(prompt: str, seed: int, cfg: dict) -> Path | None:
    """Image IA 9:16 depuis la première source disponible : Pollinations, Cloudflare, puis AI Horde."""
    global last_error, last_provider
    from .. import keystatus
    errors = []
    token = cfg.get("pollinations_token", "")
    cf_ok = bool(cfg.get("cloudflare_account_id") and cfg.get("cloudflare_token"))
    if token and not keystatus.blocked("pollinations", token):
        p = pollinations(prompt, seed, token)
        if p:
            last_provider = "pollinations"
            return p
        errors.append(f"Pollinations : {last_error}")
    if cf_ok and not keystatus.blocked("cloudflare", cfg["cloudflare_token"]):
        p = cloudflare(prompt, seed, cfg)
        if p:
            last_provider = "cloudflare"
            return p
        errors.append(f"Cloudflare : {last_error}")
    if cfg.get("horde_enabled", True):   # dernier recours gratuit et sans quota (plus lent)
        p = horde(prompt, seed, cfg)
        if p:
            last_provider = "horde"
            return p
        errors.append(f"AI Horde : {last_error}")
    if not token and not cf_ok:   # aucune clé : ancienne adresse publique (peu fiable)
        p = pollinations(prompt, seed, "")
        if p:
            last_provider = "pollinations"
            return p
        errors.append(last_error)
    if not errors:
        errors = [s for s in (
            f"Pollinations : {keystatus.get('pollinations').get('message')}" if token else "",
            f"Cloudflare : {keystatus.get('cloudflare').get('message')}" if cf_ok else "") if s]
    last_error = " · ".join(e for e in errors if e) or "aucune source d'images disponible"
    return None


# ------------------------------------------------------------------ AI Horde (communautaire, gratuit, sans limite)

HORDE_BASE = __import__("os").environ.get("HORDE_BASE", "https://aihorde.net")
HORDE_ANON = "0000000000"
# Modèles préférés, dans l'ordre (on prend le premier servi en ce moment par la communauté).
HORDE_MODELS = ["Flux.1-Schnell fp8 (Compact)", "AlbedoBase XL (SDXL)", "Juggernaut XL", "DreamShaper XL",
                "Dreamshaper"]
_horde_models_cache: dict = {"t": 0.0, "list": []}


def _horde_model(headers: dict) -> str:
    if time.time() - _horde_models_cache["t"] > 1800:
        try:
            r = requests.get(f"{HORDE_BASE}/api/v2/status/models", params={"type": "image"}, headers=headers, timeout=30)
            live = {m["name"]: m.get("count", 0) for m in r.json()} if r.ok else {}
            _horde_models_cache.update(t=time.time(), list=[m for m in HORDE_MODELS if live.get(m, 0) > 0])
        except Exception:  # noqa: BLE001
            _horde_models_cache.update(t=time.time() - 1500, list=[])
    return (_horde_models_cache["list"] or HORDE_MODELS[1:2])[0]


def horde(prompt: str, seed: int, cfg: dict, timeout: int = 420) -> Path | None:
    """AI Horde : des bénévoles prêtent leur carte graphique. Gratuit et sans quota, mais plus lent (souvent
    20 s à 2 min par image ; une clé gratuite sur aihorde.net/register donne la priorité)."""
    global last_error
    from .. import keystatus
    key = (cfg.get("horde_key") or "").strip() or HORDE_ANON
    headers = {"apikey": key, "Client-Agent": "tiktok-content-agent:1.0:local"}
    model = _horde_model(headers)
    cache = CACHE_DIR / "ai" / (hashlib.sha1(f"horde{model}{seed}{prompt}".encode()).hexdigest() + ".jpg")
    if cache.exists():
        return cache
    from ..accounts import NEGATIVE
    flux = "flux" in model.lower()
    params = {"width": 576, "height": 1024, "n": 1, "seed": str(seed % 2_000_000_000), "karras": True,
              "steps": 4 if flux else 26, "cfg_scale": 1 if flux else 6.5,
              "sampler_name": "k_euler" if flux else "k_dpmpp_2m"}
    body = {"prompt": prompt[:1800] + ("" if flux else f" ### {NEGATIVE}"), "params": params, "models": [model],
            "nsfw": False, "censor_nsfw": True, "r2": True, "shared": False}
    try:
        r = requests.post(f"{HORDE_BASE}/api/v2/generate/async", headers=headers, json=body, timeout=60)
        if r.status_code == 401:
            last_error = "clé AI Horde invalide"
            keystatus.mark("horde", "invalid", last_error, key=key)
            return None
        if not r.ok:
            last_error = f"AI Horde a refusé la demande ({r.status_code}) {r.text[:120]}"
            return None
        job = r.json()["id"]
        t0 = time.time()
        while time.time() - t0 < timeout:
            time.sleep(5)
            c = requests.get(f"{HORDE_BASE}/api/v2/generate/check/{job}", headers=headers, timeout=30).json()
            if c.get("faulted") or c.get("is_possible") is False:
                last_error = "aucun ordinateur AI Horde disponible pour ce modèle en ce moment"
                break
            if c.get("done"):
                st = requests.get(f"{HORDE_BASE}/api/v2/generate/status/{job}", headers=headers, timeout=60).json()
                gens = st.get("generations") or []
                if not gens or gens[0].get("censored"):
                    last_error = "image refusée par le filtre AI Horde"
                    return None
                img_ref = gens[0]["img"]
                if img_ref.startswith("http"):
                    raw = requests.get(img_ref, timeout=60).content
                else:
                    import base64
                    raw = base64.b64decode(img_ref)
                img = _fit_vertical(Image.open(io.BytesIO(raw)).convert("RGB"))
                cache.parent.mkdir(parents=True, exist_ok=True)
                img.save(cache, quality=92)
                keystatus.used("horde", key)
                last_error = ""
                return cache
        else:
            last_error = "AI Horde trop lent en ce moment (file d'attente)"
        try:
            requests.delete(f"{HORDE_BASE}/api/v2/generate/status/{job}", headers=headers, timeout=15)
        except requests.RequestException:
            pass
    except (requests.RequestException, ValueError, KeyError) as e:
        last_error = f"AI Horde injoignable ({type(e).__name__})"
    except Exception as e:  # noqa: BLE001
        last_error = f"AI Horde : image illisible ({type(e).__name__})"
    return None


# ------------------------------------------------------------------ Cloudflare Workers AI

CF_BASE = __import__("os").environ.get("CLOUDFLARE_BASE", "https://api.cloudflare.com")
# klein 4B d'abord : le moins cher par image (le quota gratuit du jour fait ainsi plusieurs vidéos).
CF_MODELS = ["@cf/black-forest-labs/flux-2-klein-4b", "@cf/black-forest-labs/flux-2-klein-9b",
             "@cf/black-forest-labs/flux-1-schnell"]
# Le prix dépend du nombre de carrés de 512 px : 512x912 = 2 carrés (≈ 6 fois moins cher que 1088x1920).
# L'image est ensuite agrandie et affinée en 1080x1920 ; le style cartoon (aplats + contours) le supporte très bien.
CF_W, CF_H = 512, 912
_cf_bad_models: set[str] = set()


def cloudflare(prompt: str, seed: int, cfg: dict) -> Path | None:
    """FLUX sur Cloudflare Workers AI (compte gratuit : quota quotidien remis à zéro à minuit UTC)."""
    global last_error
    import base64

    from .. import keystatus
    acc_id, token = cfg["cloudflare_account_id"].strip(), cfg["cloudflare_token"].strip()
    models = [m for m in [cfg.get("cloudflare_model") or CF_MODELS[0]] + CF_MODELS if m not in _cf_bad_models]
    models = list(dict.fromkeys(models))
    for model in models:
        cache = CACHE_DIR / "ai" / (hashlib.sha1(f"cf{model}{CF_W}x{CF_H}{seed}{prompt}".encode()).hexdigest() + ".jpg")
        if cache.exists():
            return cache
        url = f"{CF_BASE}/client/v4/accounts/{acc_id}/ai/run/{model}"
        headers = {"Authorization": f"Bearer {token}"}
        text = prompt[:2000]
        try:
            if "flux-2" in model:   # FLUX.2 : formulaire multipart, taille libre
                form = {"prompt": (None, text), "width": (None, str(CF_W)), "height": (None, str(CF_H)),
                        "seed": (None, str(seed % 2_000_000_000))}
                r = requests.post(url, headers=headers, files=form, timeout=180)
            else:                   # FLUX.1 schnell : JSON, image carrée recadrée ensuite
                r = requests.post(url, headers=headers, timeout=180,
                                  json={"prompt": text, "num_steps": 4, "seed": seed % 2_000_000_000})
        except requests.RequestException as e:
            last_error = f"Cloudflare injoignable ({type(e).__name__})"
            return None
        body = r.text[:400].lower()
        if r.status_code in (401, 403) or "authentication" in body:
            last_error = "clé Cloudflare invalide (vérifie l'Account ID et le jeton avec la permission Workers AI)"
            keystatus.mark("cloudflare", "invalid", last_error, key=token)
            return None
        if r.status_code == 429 or "4006" in body or "daily free allocation" in body or "neurons" in body and "limit" in body:
            last_error = "quota gratuit Cloudflare du jour épuisé (recharge cette nuit, vers 1 h ou 2 h du matin)"
            keystatus.mark("cloudflare", "exhausted", last_error, until=keystatus.next_utc_midnight(), key=token)
            return None
        if r.status_code in (400, 404) and ("model" in body or "no such" in body or "not found" in body):
            _cf_bad_models.add(model)        # modèle indisponible sur ce compte : on essaie le suivant
            last_error = f"modèle {model.split('/')[-1]} indisponible"
            continue
        if not r.ok:
            last_error = f"Cloudflare : erreur {r.status_code} {r.text[:120]}"
            return None
        try:
            if r.headers.get("content-type", "").startswith("image/"):
                raw = r.content
            else:
                res = r.json().get("result") or {}
                raw = base64.b64decode(res.get("image") if isinstance(res, dict) else res)
            img = Image.open(io.BytesIO(raw)).convert("RGB")
        except Exception:  # noqa: BLE001
            last_error = "réponse Cloudflare invalide (pas une image)"
            return None
        img = _fit_vertical(img)
        cache.parent.mkdir(parents=True, exist_ok=True)
        img.save(cache, quality=92)
        keystatus.used("cloudflare", token)
        last_error = ""
        return cache
    return None


def _fit_vertical(img: Image.Image) -> Image.Image:
    """Recadre au centre en 9:16 puis met en 1080x1920."""
    w, h = img.size
    target = WIDTH / HEIGHT
    if w / h > target:
        nw = int(h * target)
        img = img.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    elif w / h < target:
        nh = int(w / target)
        img = img.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    small = img.width < WIDTH * 0.8
    img = img.resize((WIDTH, HEIGHT), Image.LANCZOS)
    if small:   # image agrandie : on redonne du piqué aux contours
        img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=90, threshold=2))
    return img


# ------------------------------------------------------------------ Pollinations


def pollinations(prompt: str, seed: int, token: str = "") -> Path | None:
    """Image IA via Pollinations.

    Avec une clé gratuite (enter.pollinations.ai, crédit hebdomadaire offert, sans carte bancaire) on utilise
    l'API officielle gen.pollinations.ai ; sans clé, l'ancienne adresse publique (de moins en moins fiable).
    """
    global _last_poll, _poll_down_until, last_error
    q = urllib.parse.quote(prompt[:2200])
    from ..accounts import NEGATIVE
    params = (f"width={WIDTH}&height={HEIGHT}&seed={seed}&model=flux&nologo=true&safe=true"
              f"&negative_prompt={urllib.parse.quote(NEGATIVE)}")
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
            from .. import keystatus
            exhausted = r.status_code == 402 or "balance" in r.text.lower() or "pollen" in r.text.lower()
            last_error = (("crédit Pollinations épuisé (pollen) : il se recharge avec le temps" if exhausted
                           else "clé Pollinations invalide ou expirée : recrée-en une sur enter.pollinations.ai") if token
                          else "Pollinations demande maintenant une clé gratuite (enter.pollinations.ai)")
            if token:   # on ne réessaie pas cette clé avant 6 h (épuisée) ; une clé invalide attend d'être changée
                keystatus.mark("pollinations", "exhausted" if exhausted else "invalid", last_error,
                               until=time.time() + 6 * 3600 if exhausted else None, key=token)
            else:
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
        if token:
            from .. import keystatus
            keystatus.used("pollinations", token)
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
