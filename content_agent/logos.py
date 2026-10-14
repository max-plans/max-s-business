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


def _rdc(d, w, h):
    d.rectangle([0, 0, w, h], fill=(0, 127, 255))
    d.polygon([(0, h * 0.78), (w * 0.86, 0), (w, 0), (w, h * 0.22), (w * 0.14, h), (0, h)], fill=(247, 216, 23))
    d.polygon([(0, h * 0.9), (w * 0.92, 0), (w, 0), (w, h * 0.1), (w * 0.08, h), (0, h)], fill=(206, 16, 33))
    _star(d, w * 0.16, h * 0.22, h * 0.14, (247, 216, 23))


def _congo(d, w, h):
    d.rectangle([0, 0, w, h], fill=(220, 36, 31))
    d.polygon([(0, 0), (w * 0.7, 0), (0, h)], fill=(0, 149, 67))
    d.polygon([(w * 0.7, 0), (w, 0), (w * 0.3, h), (0, h)], fill=(251, 222, 74))


def _portugal(d, w, h):
    d.rectangle([0, 0, w * 0.4, h], fill=(4, 106, 56))
    d.rectangle([w * 0.4, 0, w, h], fill=(218, 41, 28))
    r = h * 0.2
    d.ellipse([w * 0.4 - r, h / 2 - r, w * 0.4 + r, h / 2 + r], fill=(255, 223, 0))
    d.ellipse([w * 0.4 - r * 0.55, h / 2 - r * 0.55, w * 0.4 + r * 0.55, h / 2 + r * 0.55], fill=(218, 41, 28))


def _cameroun(d, w, h):
    _bands([(0, 122, 94), (206, 17, 38), (252, 209, 22)])(d, w, h)
    _star(d, w / 2, h / 2, h * 0.17, (252, 209, 22))


def _colombie(d, w, h):
    d.rectangle([0, 0, w, h / 2], fill=(252, 209, 22))
    d.rectangle([0, h / 2, w, h * 0.75], fill=(0, 56, 147))
    d.rectangle([0, h * 0.75, w, h], fill=(206, 17, 38))


def _argentine(d, w, h):
    _bands([(116, 172, 223), (255, 255, 255), (116, 172, 223)], vertical=False)(d, w, h)
    r = h * 0.1
    d.ellipse([w / 2 - r, h / 2 - r, w / 2 + r, h / 2 + r], fill=(246, 180, 14))


def _turquie(d, w, h):
    d.rectangle([0, 0, w, h], fill=(227, 10, 23))
    r = h * 0.25
    d.ellipse([w * 0.38 - r, h / 2 - r, w * 0.38 + r, h / 2 + r], fill=(255, 255, 255))
    d.ellipse([w * 0.43 - r * 0.8, h / 2 - r * 0.8, w * 0.43 + r * 0.8, h / 2 + r * 0.8], fill=(227, 10, 23))
    _star(d, w * 0.6, h / 2, h * 0.12, (255, 255, 255))


def _tunisie(d, w, h):
    d.rectangle([0, 0, w, h], fill=(231, 0, 19))
    r = h * 0.25
    d.ellipse([w / 2 - r, h / 2 - r, w / 2 + r, h / 2 + r], fill=(255, 255, 255))
    r2 = r * 0.7
    d.ellipse([w / 2 - r2 - r * 0.1, h / 2 - r2, w / 2 + r2 - r * 0.1, h / 2 + r2], fill=(231, 0, 19))
    d.ellipse([w / 2 - r2 + r * 0.12, h / 2 - r2 * 0.8, w / 2 + r2 * 0.8 + r * 0.12, h / 2 + r2 * 0.8], fill=(255, 255, 255))
    _star(d, w / 2 + r * 0.25, h / 2, r * 0.38, (231, 0, 19))


def _angleterre(d, w, h):
    d.rectangle([0, 0, w, h], fill=(255, 255, 255))
    d.rectangle([w / 2 - h * 0.1, 0, w / 2 + h * 0.1, h], fill=(206, 17, 36))
    d.rectangle([0, h * 0.4, w, h * 0.6], fill=(206, 17, 36))


def _chine(d, w, h):
    d.rectangle([0, 0, w, h], fill=(238, 28, 37))
    _star(d, w * 0.17, h * 0.27, h * 0.16, (255, 255, 0))
    for x, y in ((0.33, 0.1), (0.4, 0.2), (0.4, 0.35), (0.33, 0.45)):
        _star(d, w * x, h * y, h * 0.05, (255, 255, 0))


def _ghana(d, w, h):
    _bands([(206, 17, 38), (252, 209, 22), (0, 107, 63)], vertical=False)(d, w, h)
    _star(d, w / 2, h / 2, h * 0.15, (0, 0, 0))


def _croix(fond, croix):
    def draw(d, w, h):
        d.rectangle([0, 0, w, h], fill=fond)
        d.rectangle([w * 0.3, 0, w * 0.42, h], fill=croix)
        d.rectangle([0, h * 0.42, w, h * 0.58], fill=croix)
    return draw


def _grece(d, w, h):
    for i in range(9):
        d.rectangle([0, h * i / 9, w, h * (i + 1) / 9], fill=(13, 94, 175) if i % 2 == 0 else (255, 255, 255))
    d.rectangle([0, 0, h * 5 / 9, h * 5 / 9], fill=(13, 94, 175))
    d.rectangle([h * 2 / 9, 0, h * 3 / 9, h * 5 / 9], fill=(255, 255, 255))
    d.rectangle([0, h * 2 / 9, h * 5 / 9, h * 3 / 9], fill=(255, 255, 255))


def _inde(d, w, h):
    _bands([(255, 153, 51), (255, 255, 255), (19, 136, 8)], vertical=False)(d, w, h)
    r = h * 0.12
    d.ellipse([w / 2 - r, h / 2 - r, w / 2 + r, h / 2 + r], outline=(0, 0, 128), width=max(2, int(h / 60)))


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
    "rdc": ("Congo", _rdc), "congo": ("Congo-Brazza", _congo), "portugal": ("Portugal", _portugal),
    "cameroun": ("Cameroun", _cameroun),
    "mali": ("Mali", _bands([(20, 181, 58), (252, 209, 22), (206, 17, 38)])),
    "guinee": ("Guinée", _bands([(206, 17, 38), (252, 209, 22), (0, 148, 96)])),
    "nigeria": ("Nigeria", _bands([(0, 135, 81), (255, 255, 255), (0, 135, 81)])),
    "colombie": ("Colombie", _colombie),
    "pologne": ("Pologne", _bands([(255, 255, 255), (220, 20, 60)], vertical=False)),
    "argentine": ("Argentine", _argentine), "turquie": ("Turquie", _turquie), "tunisie": ("Tunisie", _tunisie),
    "haiti": ("Haïti", _bands([(0, 32, 159), (210, 16, 52)], vertical=False)),
    "angleterre": ("Angleterre", _angleterre), "chine": ("Chine", _chine), "ghana": ("Ghana", _ghana),
    "danemark": ("Danemark", _croix((200, 16, 46), (255, 255, 255))),
    "autriche": ("Autriche", _bands([(237, 41, 57), (255, 255, 255), (237, 41, 57)], vertical=False)),
    "grece": ("Grèce", _grece), "inde": ("Inde", _inde),
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
