"""Registre des personnages : chaque personnage a UNE fiche (description fixe + graine + image de référence)
qui est réutilisée dans toutes les images et toutes les vidéos.

- « Panda Boss » est le personnage principal, unique, du compte Argent.
- Les autres personnages (Madoff, un banquier récurrent...) sont créés une seule fois par le script, puis
  gardés : la première description enregistrée ne change plus, pour qu'ils restent identiques dans les futures vidéos.
Les générateurs d'images gratuits ne copient pas parfaitement un personnage ; l'image de référence sert surtout
au contrôle qualité (Claude compare chaque image à la fiche et fait refaire celles qui ne ressemblent pas).
"""
from __future__ import annotations

import hashlib
import json
import re
import threading
import unicodedata
from pathlib import Path

from .paths import ASSETS, DATA

DIR = DATA / "characters"
FILE = DIR / "characters.json"
PANDA_NAME = "Panda Boss"
PANDA_SLUG = "panda-boss"
_lock = threading.Lock()


def slug(name: str) -> str:
    s = unicodedata.normalize("NFKD", name or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:40]


def _load() -> dict:
    try:
        return json.loads(FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def _save(data: dict) -> None:
    DIR.mkdir(parents=True, exist_ok=True)
    FILE.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")


def is_panda(name: str) -> bool:
    s = slug(name)
    return s in (PANDA_SLUG, "panda", "le-panda", "panda-boss")


def register(name: str, description: str) -> str:
    """Enregistre un personnage non-panda (sans écraser un personnage existant). Renvoie son slug."""
    name = (name or "").strip()
    if not name or is_panda(name):
        return PANDA_SLUG
    key = slug(name)
    with _lock:
        data = _load()
        if key not in data and description.strip():
            data[key] = {"name": name, "description": description.strip()}
            _save(data)
    return key


def get(name: str) -> dict | None:
    """{slug, name, description} ou None (le panda est géré par accounts.PANDA)."""
    from .accounts import PANDA
    if is_panda(name):
        return {"slug": PANDA_SLUG, "name": PANDA_NAME, "description": PANDA}
    key = slug(name)
    c = _load().get(key)
    return {"slug": key, **c} if c else None


def listing() -> list[dict]:
    from .accounts import PANDA
    out = [{"slug": PANDA_SLUG, "name": PANDA_NAME, "description": PANDA}]
    out += [{"slug": k, **v} for k, v in _load().items()]
    for c in out:
        c["has_reference"] = reference_path(c["slug"]).exists()
    return out


def seed_for(key: str) -> int:
    from .accounts import MASCOT_SEED
    if key == PANDA_SLUG:
        return MASCOT_SEED
    return 1000 + int(hashlib.sha1(key.encode()).hexdigest()[:6], 16) % 90000


OFFICIAL_PANDA_VERSION = "1"   # changer ce numéro réinstalle la fiche officielle une fois chez l'utilisateur


def _install_official_panda() -> None:
    """Installe (une seule fois par version) la fiche officielle du panda choisie par l'utilisateur."""
    src = ASSETS / "characters" / f"{PANDA_SLUG}.jpg"
    marker = DIR / f"{PANDA_SLUG}.official"
    try:
        if src.exists() and (not marker.exists() or marker.read_text().strip() != OFFICIAL_PANDA_VERSION):
            DIR.mkdir(parents=True, exist_ok=True)
            import shutil
            shutil.copy(src, DIR / f"{PANDA_SLUG}.jpg")
            marker.write_text(OFFICIAL_PANDA_VERSION)
    except OSError:
        pass


def reference_path(key: str) -> Path:
    if key == PANDA_SLUG:
        _install_official_panda()
    return DIR / f"{key}.jpg"


def ensure_reference(key: str, acc: dict, style_key: str | None, cfg: dict, force: bool = False) -> Path | None:
    """Fiche de référence du personnage (une seule image, de face, fond uni). Créée une fois, puis gardée.
    Tu peux la remplacer par ta propre image (même nom de fichier dans data/characters)."""
    from .accounts import ANATOMY, IMAGE_STYLES, IMAGE_SUFFIX_TEXT
    from .video import qc, visuals
    path = reference_path(key)
    if path.exists() and not force:
        return path
    c = next((x for x in listing() if x["slug"] == key), None)
    if not c:
        return None
    style = IMAGE_STYLES.get(style_key or acc.get("image_style", "cartoon"), IMAGE_STYLES["cartoon"])[1]
    prompt = (f"Character design reference sheet, ONE single character alone: {c['description']}. Full body, standing "
              f"upright, front view, neutral friendly pose, both arms visible at the sides, plain light grey background, "
              f"no other character, no props, no text. Style: {style}. {ANATOMY}{IMAGE_SUFFIX_TEXT}")
    DIR.mkdir(parents=True, exist_ok=True)
    for attempt in range(2):
        img = visuals.ai_image(prompt, seed_for(key) + attempt * 211, cfg)
        if not img:
            return None
        bad = qc.review_reference(img, c["name"], c["description"])
        if not bad or attempt == 1:
            import shutil
            shutil.copy(img, path)
            return path
    return None


# Poses du panda : chaque pose validée est une image FIXE (identique au pixel près à chaque utilisation).
POSES: dict[str, tuple[str, str]] = {   # nom → (libellé, consigne envoyée à l'IA pour créer la pose)
    "content": ("Confiant", "standing relaxed, one hand in the pocket, confident satisfied smile"),
    "malin": ("Malin", "sly smirk with half-closed eyes, raising one index finger as if he knows a secret"),
    "surpris": ("Surpris", "very surprised, eyes wide open, mouth open, both hands raised"),
    "enerve": ("Énervé", "annoyed frown, arms crossed, tapping one foot"),
    "reflechit": ("Réfléchit", "thinking, one hand on his chin, eyes looking up"),
    "riche": ("Fier", "proud, holding a fan of green banknotes in one hand, chin up, big grin"),
}
# Ton de la phrase → pose du panda
TONE_POSE = {"surprise": "surpris", "enerve": "enerve", "question": "reflechit", "grave": "reflechit",
             "suspense": "malin", "ironique": "malin", "accroche": "malin", "energique": "riche", "chute": "content",
             "normal": "content"}
POSES_DIR = DIR / "panda-poses"
CANDIDATES_DIR = DIR / "panda-poses-candidates"


def pose_path(name: str) -> Path:
    return POSES_DIR / f"{name}.jpg"


def pose_for_tone(tone: str | None) -> Path:
    """Image validée de la pose qui correspond au ton ; sinon le panda officiel."""
    p = pose_path(TONE_POSE.get(tone or "normal", "content"))
    return p if p.exists() else reference_path(PANDA_SLUG)


def cutout(src: Path) -> Path | None:
    """Personnage détouré (fond uni retiré, petites paillettes isolées retirées), en PNG transparent. Mis en cache."""
    from PIL import Image, ImageChops, ImageDraw, ImageFilter
    if not src.exists():
        return None
    out = src.with_name(src.stem + "_cut.png")
    if out.exists() and out.stat().st_mtime >= src.stat().st_mtime:
        return out
    im = Image.open(src).convert("RGB")
    w, h = im.size
    corners = [im.getpixel(p) for p in ((2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3))]
    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))
    diff = ImageChops.difference(im, Image.new("RGB", im.size, bg)).convert("L")
    solid = diff.point(lambda v: 255 if v > 38 else 0)
    # le personnage = la plus grande zone reliée (on part du centre, puis on cherche autour si besoin)
    mask = solid.copy()
    for fx, fy in ((0.5, 0.55), (0.5, 0.45), (0.5, 0.65), (0.45, 0.55), (0.55, 0.55), (0.5, 0.3)):
        seed = (int(w * fx), int(h * fy))
        if mask.getpixel(seed) == 255:
            ImageDraw.floodfill(mask, seed, 128)
            mask = mask.point(lambda v: 255 if v == 128 else 0)
            break
    holes = mask.point(lambda v: 0 if v else 255)
    ImageDraw.floodfill(holes, (0, 0), 0)
    mask = ImageChops.lighter(mask, holes)
    mask = mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    cut = im.convert("RGBA")
    cut.putalpha(mask)
    cut = cut.crop(cut.getbbox() or (0, 0, w, h))
    cut.save(out)
    return out


def panda_cutout(tone: str | None = None, pose: str = "") -> Path | None:
    """Pose choisie par le script selon le contexte ; sinon déduite du ton ; sinon panda officiel."""
    if pose and pose_path(pose).exists():
        return cutout(pose_path(pose))
    return cutout(pose_for_tone(tone))


def generate_pose_candidates(cfg: dict, names: list[str] | None = None) -> dict[str, str]:
    """Crée une proposition par pose avec Cloudflare FLUX.2, À PARTIR du panda officiel (image de référence).
    Renvoie {pose: message d'erreur} pour celles qui ont échoué."""
    from .video import visuals
    ref = reference_path(PANDA_SLUG)
    CANDIDATES_DIR.mkdir(parents=True, exist_ok=True)
    errors = {}
    if not (cfg.get("cloudflare_account_id") and cfg.get("cloudflare_token")):
        return {n: "Cloudflare non configuré (Réglages → Visuels)" for n in (names or POSES)}
    for i, name in enumerate(names or list(POSES)):
        label, pose = POSES[name]
        prompt = (f"The exact same panda character as in the reference image, same head, same gold glasses, same black "
                  f"suit, white shirt, thin black tie, same proportions and drawing style. New pose: {pose}. Full body "
                  f"from head to shoes, centered, alone, plain light sky-blue background, nothing else")
        img = visuals.cloudflare(prompt, 9100 + i * 37 + int(__import__("time").time()) % 1000, cfg,
                                 [(PANDA_NAME, ref)])
        if img:
            import shutil
            shutil.copy(img, CANDIDATES_DIR / f"{name}.jpg")
        else:
            errors[name] = visuals.last_error or "échec"
    return errors


def poses_listing() -> list[dict]:
    return [{"name": n, "label": l, "kept": pose_path(n).exists(), "candidate": (CANDIDATES_DIR / f"{n}.jpg").exists()}
            for n, (l, _) in POSES.items()]
