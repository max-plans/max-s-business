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
