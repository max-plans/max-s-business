"""Visuels de chaque scène — uniquement des sources gratuites.

- ai     : images IA (FLUX), avec plusieurs sources gratuites essayées dans l'ordre :
           Pollinations (clé gratuite, crédit hebdomadaire) puis Cloudflare Workers AI (compte gratuit,
           quota quotidien). Une source épuisée est sautée jusqu'à sa recharge. Nécessite Internet.
- pexels : vidéos libres de droits Pexels (clé API gratuite).
- local  : fonds générés sur ton ordinateur (dégradés, bokeh, particules) — toujours disponible.
On essaie dans cet ordre la source choisie puis les suivantes, jusqu'au fond local.
"""
from __future__ import annotations

from ..accounts import scene_has_panda

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
                 attempt: int = 0, hint: str = "", safe: bool = False) -> tuple[Path, str, str]:
    """safe=True : image de secours sans aucun humain (décor + objets), quand les essais ont tous un défaut d'anatomie."""
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
                if acc.get("mascot") and scene_has_panda(scene):
                    base = characters.seed_for(characters.PANDA_SLUG)
                else:
                    named = [characters.get(n) for n in scene.get("characters") or []]
                    named = [c for c in named if c]
                    if named:
                        base = characters.seed_for(named[0]["slug"])
                seed = base + attempt * 1013 + (idx * 17 if attempt else 0)
                fixed = panda_fixed(acc, scene, cfg, local_panda)
                if safe and not fixed:
                    p = ai_image(_ai_prompt(acc, dict(scene, characters=[]), local_panda, style_key, "", False,
                                            decor_only=True), seed, cfg, None)
                    if p:
                        return p, "image", "ai"
                    continue
                if fixed:   # panda identique au pixel près et SEUL : l'IA fait le décor vide, on colle le panda officiel
                    bg_scene = dict(scene, with_panda=False, characters=[],
                                    image_prompt=_strip_panda(scene.get("image_prompt") or scene.get("visual") or ""))
                    p = ai_image(_ai_prompt(acc, bg_scene, local_panda, style_key, hint, False, decor_only=True,
                                            side="left" if idx % 2 == 0 else "right"), seed, cfg, None)
                    if p:
                        return compose_panda(p, left=bool(idx % 2), tone=scene.get("tone"), pose=scene.get("pose") or ""), "image", "ai"
                    continue
                refs = character_refs(acc, scene, local_panda)
                p = ai_image(_ai_prompt(acc, scene, local_panda, style_key, hint, bool(refs)), seed, cfg, refs)
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


def character_refs(acc: dict, scene: dict, local_panda: bool) -> list[tuple[str, Path]]:
    """Fiches de référence [(nom, fichier)] des personnages de la scène : le panda d'abord, puis les autres (max 3)."""
    from .. import characters
    out: list[tuple[str, Path]] = []
    if acc.get("mascot") and not local_panda and scene_has_panda(scene):
        pr = characters.reference_path(characters.PANDA_SLUG)
        if pr.exists():
            out.append((characters.PANDA_NAME, pr))
    for n in scene.get("characters") or []:
        c = characters.get(n)
        if c and not characters.is_panda(n) and characters.reference_path(c["slug"]).exists():
            out.append((c["name"], characters.reference_path(c["slug"])))
    return out[:3]


def panda_fixed(acc: dict, scene: dict, cfg: dict, local_panda: bool) -> bool:
    """Panda collé (identique au pixel près) : compte à mascotte, la phrase parle du panda, option active."""
    return bool(acc.get("mascot")) and not local_panda and cfg.get("panda_fixed", True) and scene_has_panda(scene)


def _strip_panda(desc: str) -> str:
    desc = re.sub(r"\b(panda boss|the panda|a panda|panda)('s)?\b", "", desc, flags=re.I)
    return re.sub(r"\s{2,}", " ", desc).strip(" ,.")


COMPOSED: dict[str, tuple[Path, bool]] = {}


def panda_box(cut: Image.Image, left: bool) -> tuple[int, int, int, int]:
    """Taille et position du panda collé : grand, debout, sur un côté."""
    h = int(HEIGHT * 0.68)
    w = int(cut.width * h / cut.height)
    return w, h, (40 if left else WIDTH - w - 40), HEIGHT - h - 100   # image composée → (fond seul, panda à gauche ?) pour l'animation


def compose_panda(bg_path: Path, left: bool = False, tone: str | None = None, pose: str = "") -> Path:
    """Colle le panda officiel (détouré) sur l'image : même visage, même corps, au pixel près."""
    from .. import characters
    cut_path = characters.panda_cutout(tone, pose)
    if not cut_path:
        return bg_path
    out = CACHE_DIR / "composed" / (hashlib.sha1(f"{bg_path}{cut_path}{cut_path.stat().st_mtime}{left}".encode()).hexdigest() + ".jpg")
    COMPOSED[str(out)] = (bg_path, left)
    if out.exists():
        return out
    bg = Image.open(bg_path).convert("RGB").resize((WIDTH, HEIGHT)).convert("RGBA")
    cut = Image.open(cut_path).convert("RGBA")
    w, h, x, y = panda_box(cut, left)
    cut = cut.resize((w, h), Image.LANCZOS)
    if left:
        cut = cut.transpose(Image.FLIP_LEFT_RIGHT)
    shadow = Image.new("RGBA", bg.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse([x + w * 0.1, y + h - 30, x + w * 0.9, y + h + 25], fill=(0, 0, 0, 70))
    bg.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(12)))
    bg.alpha_composite(cut, (x, y))
    out.parent.mkdir(parents=True, exist_ok=True)
    bg.convert("RGB").save(out, quality=93)
    COMPOSED[str(out)] = (bg_path, left)
    return out


def _ai_prompt(acc: dict, scene: dict, local_panda: bool, style_key: str | None = None, hint: str = "",
               with_refs: bool = False, decor_only: bool = False, side: str = "") -> str:
    from ..accounts import image_prompt

    desc = scene.get("image_prompt") or scene.get("visual") or acc["theme"]
    if acc.get("mascot") and local_panda and scene_has_panda(scene):
        # Le panda animé est ajouté par-dessus : on ne génère que le décor.
        desc = re.sub(r"\b(the |a )?panda('s)?\b", "", desc, flags=re.I).strip(" ,")
        return f"{desc}, luxurious elegant interior or city background, empty scene, no people, no animals, cinematic lighting, bokeh, vertical 9:16, no text"
    from .. import characters
    named = [characters.get(n) for n in scene.get("characters") or [] if not characters.is_panda(n)]
    chars = [(c["name"], c["description"]) for c in named if c]
    if decor_only:   # décor seul, sans aucun personnage (le panda est collé ensuite, ou image de secours sans risque)
        return image_prompt(acc, desc, style_key, False, hint, [], decor_only=True, side=side)
    if not scene_has_panda(scene):   # aucun mot « panda » dans une image sans panda
        desc = re.sub(r"\b(panda boss|the panda|a panda|panda)\b", "a man in a suit", desc, flags=re.I)
    return image_prompt(acc, desc, style_key, scene_has_panda(scene), hint, chars)


# ------------------------------------------------------------------ choix de la source d'images IA

last_error = ""
last_provider = ""


def ai_image(prompt: str, seed: int, cfg: dict, refs: list[tuple[str, Path]] | None = None) -> Path | None:
    """Image IA 9:16 depuis la première source disponible : Pollinations, Cloudflare, puis AI Horde.
    Avec des fiches de référence (`refs`), Cloudflare passe en premier : FLUX.2 y accepte les images de référence,
    donc le panda (ou un autre personnage) est redessiné à partir de SA fiche et reste le même d'une image à l'autre."""
    global last_error, last_provider
    from .. import keystatus
    errors = []
    token = cfg.get("pollinations_token", "")
    cf_ok = bool(cfg.get("cloudflare_account_id") and cfg.get("cloudflare_token"))
    cf_usable = cf_ok and not keystatus.blocked("cloudflare", cfg["cloudflare_token"])
    steps = ["pollinations", "cloudflare"]
    if refs and cf_usable:
        steps = ["cloudflare", "pollinations"]
    for step in steps:
        if step == "pollinations" and token and not keystatus.blocked("pollinations", token):
            p = pollinations(prompt, seed, token)
            if p:
                last_provider = "pollinations"
                return p
            errors.append(f"Pollinations : {last_error}")
        elif step == "cloudflare" and cf_usable:
            p = cloudflare(prompt, seed, cfg, refs)
            if p:
                last_provider = "cloudflare"
                return p
            errors.append(f"Cloudflare : {last_error}")
    if cfg.get("horde_enabled", True):   # dernier recours gratuit et sans quota (plus lent, sans fiche de référence)
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
    prompt_txt = prompt[:1800] + ("" if flux else f" ### {NEGATIVE}")
    try:
        # Si l'AI Horde refuse la demande (taille ou modèle non permis aux utilisateurs anonymes...), on réessaie
        # avec une demande plus simple : 576x1024 → 448x768 → 384x640 → 512x512 sans choisir de modèle.
        r = None
        for w, h, pick_model in ((576, 1024, True), (448, 768, True), (384, 640, False), (512, 512, False)):
            params = {"width": w, "height": h, "n": 1, "seed": str(seed % 2_000_000_000),
                      "steps": 4 if flux and pick_model else 25, "cfg_scale": 1 if flux and pick_model else 7}
            body = {"prompt": prompt_txt if pick_model else prompt[:1800] + f" ### {NEGATIVE}", "params": params,
                    "nsfw": False, "censor_nsfw": True, "r2": True, "shared": False}
            if pick_model:
                body["models"] = [model]
            r = requests.post(f"{HORDE_BASE}/api/v2/generate/async", headers=headers, json=body, timeout=60)
            if r.status_code not in (400, 403, 422):
                break
        if r.status_code == 401:
            last_error = "clé AI Horde invalide"
            keystatus.mark("horde", "invalid", last_error, key=key)
            return None
        if not r.ok:
            last_error = f"AI Horde a refusé la demande ({r.status_code}) : {r.text[:200]}"
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


def cloudflare(prompt: str, seed: int, cfg: dict, refs: list[tuple[str, Path]] | None = None) -> Path | None:
    """FLUX sur Cloudflare Workers AI (compte gratuit : quota quotidien remis à zéro à minuit UTC)."""
    global last_error
    import base64

    from .. import keystatus
    acc_id, token = cfg["cloudflare_account_id"].strip(), cfg["cloudflare_token"].strip()
    models = [m for m in [cfg.get("cloudflare_model") or CF_MODELS[0]] + CF_MODELS if m not in _cf_bad_models]
    models = list(dict.fromkeys(models))
    ref_blobs = [(name, _ref_jpeg(path)) for name, path in (refs or [])]
    ref_blobs = [(n, b) for n, b in ref_blobs if b]
    ref_key = "".join(hashlib.sha1(b).hexdigest()[:8] for _, b in ref_blobs)
    for model in models:
        use_refs = ref_blobs if "flux-2" in model else []
        cache = CACHE_DIR / "ai" / (hashlib.sha1(f"cf{model}{CF_W}x{CF_H}{seed}{ref_key if use_refs else ''}{prompt}".encode()).hexdigest() + ".jpg")
        if cache.exists():
            return cache
        url = f"{CF_BASE}/client/v4/accounts/{acc_id}/ai/run/{model}"
        headers = {"Authorization": f"Bearer {token}"}
        text = prompt[:2000]
        if use_refs:   # « image 0 » = fiche du 1er personnage, « image 1 » = 2e...
            who = "; ".join(f"image {i} is the character sheet of {n}" for i, (n, _) in enumerate(use_refs))
            text = (f"Reference images: {who}. Draw each of these characters in the new scene EXACTLY as in its reference "
                    f"image (same face, same body proportions, same outfit and colors, same glasses), only the pose, "
                    f"expression and setting change. Keep one single copy of each character. New scene: {prompt}")[:2000]
        attempts = ([("flux2", {"prompt": text, "width": str(CF_W), "height": str(CF_H), "seed": str(seed % 2_000_000_000)}),
                     ("flux2", {"prompt": text})] if "flux-2" in model else
                    [("json", {"prompt": text, "num_steps": 4, "seed": seed % 2_000_000_000}),
                     ("json", {"prompt": text})])
        r = None
        for kind, fields in attempts:
            try:
                if kind == "flux2":   # FLUX.2 : formulaire multipart (+ images de référence input_image_0..3)
                    files = {k: (None, v) for k, v in fields.items()}
                    for i, (_, blob) in enumerate(use_refs):
                        files[f"input_image_{i}"] = (f"ref{i}.jpg", blob, "image/jpeg")
                    r = requests.post(url, headers=headers, files=files, timeout=180)
                else:                 # FLUX.1 schnell : JSON
                    r = requests.post(url, headers=headers, json=fields, timeout=180)
            except requests.RequestException as e:
                last_error = f"Cloudflare injoignable ({type(e).__name__}: {str(e)[:100]})"
                return None
            if r.status_code not in (400, 422):   # paramètres refusés : on retente avec la demande minimale
                break
        body = r.text[:600].lower()
        if r.status_code in (401, 403) or "authentication error" in body:
            last_error = (f"clé Cloudflare refusée ({r.status_code}) : vérifie l'Account ID (32 caractères) et que le jeton "
                          f"a la permission « Workers AI » — réponse : {r.text[:160]}")
            keystatus.mark("cloudflare", "invalid", last_error, key=token)
            return None
        if r.status_code == 429 or "4006" in body or "daily free allocation" in body or ("neurons" in body and "limit" in body):
            last_error = "quota gratuit Cloudflare du jour épuisé (recharge cette nuit, vers 1 h ou 2 h du matin)"
            keystatus.mark("cloudflare", "exhausted", last_error, until=keystatus.next_utc_midnight(), key=token)
            return None
        if r.status_code == 404 or "no such model" in body or "5007" in body:
            _cf_bad_models.add(model)        # modèle indisponible sur ce compte : on essaie le suivant
            last_error = f"modèle {model.split('/')[-1]} indisponible ({r.status_code}) : {r.text[:120]}"
            continue
        if not r.ok:
            last_error = f"Cloudflare : erreur {r.status_code} — {r.text[:200]}"
            if r.status_code >= 500 or r.status_code in (400, 422):
                continue                      # problème propre à ce modèle : on essaie le suivant
            return None
        try:
            if r.headers.get("content-type", "").startswith("image/"):
                raw = r.content
            else:
                res = r.json().get("result") or {}
                raw = base64.b64decode(res.get("image") if isinstance(res, dict) else res)
            img = Image.open(io.BytesIO(raw)).convert("RGB")
        except Exception:  # noqa: BLE001
            last_error = f"réponse Cloudflare invalide (pas une image) : {r.text[:160]}"
            continue
        img = _fit_vertical(img)
        cache.parent.mkdir(parents=True, exist_ok=True)
        img.save(cache, quality=92)
        keystatus.used("cloudflare", token)
        last_error = ""
        return cache
    return None


def _ref_jpeg(path: Path) -> bytes | None:
    """Fiche de référence réduite pour Cloudflare (les images d'entrée doivent faire moins de 512x512)."""
    try:
        im = Image.open(path).convert("RGB")
        im.thumbnail((448, 448), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=90)
        return buf.getvalue()
    except Exception:  # noqa: BLE001
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
