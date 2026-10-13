"""Logos pour les vidéos satisfaisantes : drapeaux dessinés par l'app (libres de droits) + tes propres logos.

Tes logos sont rangés dans data/logos (une image + un nom). Attention : les logos de marques et de clubs sont
protégés ; les utiliser dans des vidéos monétisées peut entraîner un retrait ou une réclamation.
"""
from __future__ import annotations

import json
import math
import re
import unicodedata
from pathlib import Path

from PIL import Image, ImageDraw

from .paths import DATA

DIR = DATA / "logos"
INDEX = DIR / "logos.json"


def slug(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:40] or "logo"


# ------------------------------------------------------------------ drapeaux (formes simples)

def _bands(colors, vertical=True):
    def draw(d, w, h):
        n = len(colors)
        for i, c in enumerate(colors):
            if vertical:
                d.rectangle([w * i / n, 0, w * (i + 1) / n, h], fill=c)
            else:
                d.rectangle([0, h * i / n, w, h * (i + 1) / n], fill=c)
    return draw


def _star(d, cx, cy, r, fill, outline_only=False):
    pts = []
    for k in range(10):
        a = -math.pi / 2 + k * math.pi / 5
        rr = r if k % 2 == 0 else r * 0.4
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    if outline_only:
        d.line(pts + [pts[0]], fill=fill, width=max(2, int(r / 6)))
    else:
        d.polygon(pts, fill=fill)


def _japon(d, w, h):
    d.rectangle([0, 0, w, h], fill=(255, 255, 255))
    r = h * 0.3
    d.ellipse([w / 2 - r, h / 2 - r, w / 2 + r, h / 2 + r], fill=(188, 0, 45))


def _maroc(d, w, h):
    d.rectangle([0, 0, w, h], fill=(193, 39, 45))
    _star(d, w / 2, h / 2, h * 0.3, (0, 98, 51), outline_only=True)


def _algerie(d, w, h):
    d.rectangle([0, 0, w / 2, h], fill=(0, 98, 51))
    d.rectangle([w / 2, 0, w, h], fill=(255, 255, 255))
    r = h * 0.3
    d.ellipse([w / 2 - r, h / 2 - r, w / 2 + r, h / 2 + r], fill=(210, 16, 52))
    d.ellipse([w / 2 - r * 0.6, h / 2 - r * 0.8, w / 2 + r * 1.0, h / 2 + r * 0.8], fill=(255, 255, 255))
    _star(d, w / 2 + r * 0.55, h / 2, r * 0.45, (210, 16, 52))


def _senegal(d, w, h):
    _bands([(0, 133, 63), (253, 239, 66), (227, 27, 35)])(d, w, h)
    _star(d, w / 2, h / 2, h * 0.17, (0, 133, 63))


def _bresil(d, w, h):
    d.rectangle([0, 0, w, h], fill=(0, 156, 59))
    d.polygon([(w * 0.08, h / 2), (w / 2, h * 0.1), (w * 0.92, h / 2), (w / 2, h * 0.9)], fill=(255, 223, 0))
    r = h * 0.24
    d.ellipse([w / 2 - r, h / 2 - r, w / 2 + r, h / 2 + r], fill=(0, 39, 118))


def _suisse(d, w, h):
    d.rectangle([0, 0, w, h], fill=(218, 41, 28))
    a, b = h * 0.12, h * 0.36
    d.rectangle([w / 2 - a, h / 2 - b, w / 2 + a, h / 2 + b], fill=(255, 255, 255))
    d.rectangle([w / 2 - b, h / 2 - a, w / 2 + b, h / 2 + a], fill=(255, 255, 255))


def _suede(d, w, h):
    d.rectangle([0, 0, w, h], fill=(0, 106, 167))
    d.rectangle([w * 0.31, 0, w * 0.44, h], fill=(254, 204, 0))
    d.rectangle([0, h * 0.42, w, h * 0.58], fill=(254, 204, 0))


def _usa(d, w, h):
    for i in range(13):
        d.rectangle([0, h * i / 13, w, h * (i + 1) / 13], fill=(178, 34, 52) if i % 2 == 0 else (255, 255, 255))
    d.rectangle([0, 0, w * 0.4, h * 7 / 13], fill=(60, 59, 110))
    for i in range(5):
        for j in range(6):
            x, y = w * 0.4 * (j + 0.5) / 6, h * 7 / 13 * (i + 0.5) / 5
            d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=(255, 255, 255))


FLAGS = {
    "france": ("France", _bands([(0, 85, 164), (255, 255, 255), (239, 65, 53)])),
    "italie": ("Italie", _bands([(0, 146, 70), (255, 255, 255), (206, 43, 55)])),
    "belgique": ("Belgique", _bands([(20, 20, 20), (253, 218, 36), (239, 51, 64)])),
    "allemagne": ("Allemagne", _bands([(20, 20, 20), (221, 0, 0), (255, 206, 0)], vertical=False)),
    "pays-bas": ("Pays-Bas", _bands([(174, 28, 40), (255, 255, 255), (33, 70, 139)], vertical=False)),
    "espagne": ("Espagne", _bands([(170, 21, 27), (241, 191, 0), (241, 191, 0), (170, 21, 27)], vertical=False)),
    "ukraine": ("Ukraine", _bands([(0, 87, 183), (255, 215, 0)], vertical=False)),
    "irlande": ("Irlande", _bands([(22, 155, 98), (255, 255, 255), (255, 136, 62)])),
    "cote-d-ivoire": ("Côte d'Ivoire", _bands([(255, 130, 0), (255, 255, 255), (0, 158, 96)])),
    "japon": ("Japon", _japon), "maroc": ("Maroc", _maroc), "algerie": ("Algérie", _algerie),
    "senegal": ("Sénégal", _senegal), "bresil": ("Brésil", _bresil), "suisse": ("Suisse", _suisse),
    "suede": ("Suède", _suede), "usa": ("États-Unis", _usa),
}


def _flag_image(key: str) -> Image.Image:
    img = Image.new("RGB", (600, 400), (255, 255, 255))
    FLAGS[key][1](ImageDraw.Draw(img), 600, 400)
    return img


# ------------------------------------------------------------------ bibliothèque

def _index() -> dict:
    try:
        return json.loads(INDEX.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def listing() -> list[dict]:
    mine = [{"id": k, "name": v["name"], "kind": "perso"} for k, v in _index().items()]
    return mine + [{"id": f"flag:{k}", "name": n, "kind": "drapeau"} for k, (n, _) in FLAGS.items()]


def add(name: str, img: Image.Image) -> str:
    DIR.mkdir(parents=True, exist_ok=True)
    k = slug(name)
    img.convert("RGBA").save(DIR / f"{k}.png")
    idx = _index()
    idx[k] = {"name": name.strip()}
    INDEX.write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding="utf-8")
    return k


def remove(key: str) -> None:
    idx = _index()
    idx.pop(key, None)
    INDEX.write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding="utf-8")
    (DIR / f"{key}.png").unlink(missing_ok=True)


def load(key: str) -> tuple[str, Image.Image] | None:
    """(nom, image RGBA) du logo, ou None."""
    if key.startswith("flag:"):
        k = key[5:]
        return (FLAGS[k][0], _flag_image(k).convert("RGBA")) if k in FLAGS else None
    p = DIR / f"{key}.png"
    if not p.exists():
        return None
    return _index().get(key, {}).get("name", key), Image.open(p).convert("RGBA")


def preview(key: str) -> Path | None:
    got = load(key)
    if not got:
        return None
    out = DIR / "_previews" / f"{slug(key)}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    im = got[1].copy()
    im.thumbnail((240, 240))
    im.save(out)
    return out


def pick_auto(history: list[dict], rnd) -> str:
    """Choix autonome : le logo le moins utilisé récemment (tes logos d'abord s'il y en a)."""
    ids = [x["id"] for x in listing()]
    mine = [i for i in ids if not i.startswith("flag:")]
    pool = mine or ids
    recent = [h.get("logo") for h in history[-20:]]
    return min(pool, key=lambda i: (recent.count(i), rnd.random()))
