"""Vidéos « satisfaisantes » 100 % locales : physique, couleurs et sons générés sur ton PC.

Aucune IA, aucune API, aucun crédit : une simulation est calculée image par image (Pillow + numpy), chaque choc
joue une petite note (gamme pentatonique → ça sonne toujours juste), puis ffmpeg assemble le MP4 9:16 en 60 i/s.

Concepts :
- anneaux : une bille rebondit dans des anneaux qui tournent ; quand elle passe par la brèche, l'anneau explose.
- plinko  : des billes de 4 couleurs dévalent une planche à clous ; quelle couleur remplit le plus le jackpot ?
- mur     : des balles cassent un mur arc-en-ciel pixel par pixel ; elles se multiplient en chemin.
- gelees  : des petites gelées rebondissent de marche en marche, en boucle infinie.
"""
from __future__ import annotations

import colorsys
import math
import re
import random
import subprocess
import wave
from pathlib import Path
from typing import Callable

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from .paths import FONTS_DIR

W, H = 540, 960          # coordonnées de la simulation
SS = 2                   # suréchantillonnage : dessin en 2160x3840 puis réduction → contours lisses (anti-crénelage)
K = 2 * SS               # facteur de dessin (540x960 → 2160x3840)
FPS = 60
SR = 44100
SUB = 6                  # sous-pas de physique par image

CONCEPTS = {
    "anneaux": ("Évasion des anneaux", "Une bille doit s'échapper de 14 anneaux qui tournent. Chaque anneau explose."),
    "plinko": ("Course de couleurs", "4 couleurs dévalent une planche à clous : laquelle remplit le jackpot ?"),
    "mur": ("Mur arc-en-ciel", "Des balles cassent un mur de couleurs bloc par bloc et se multiplient."),
    "gelees": ("Gelées en cascade", "De petites gelées rebondissent de marche en marche, en boucle."),
}
HOOKS = {
    "anneaux": ["Elle va s'échapper ?", "Regarde jusqu'à la fin", "Combien d'anneaux elle casse ?"],
    "plinko": ["Quelle couleur gagne ?", "Choisis ta couleur", "Commente ta couleur"],
    "mur": ["Ça casse tout", "Regarde le mur disparaître", "Combien de balles à la fin ?"],
    "gelees": ["Impossible d'arrêter de regarder", "Tellement satisfaisant", "Choisis ta gelée"],
}
CAPTIONS = {
    "anneaux": "La bille va-t-elle s'échapper ? 👀 Reste jusqu'à la fin !",
    "plinko": "Quelle couleur va gagner ? Dis-le en commentaire avant la fin 👇",
    "mur": "Le mur ne fait pas le poids 💥 Combien de balles à la fin ?",
    "gelees": "Impossible d'arrêter de regarder 😌 Laquelle tu préfères ?",
}
TAGS = ["#satisfaisant", "#satisfying", "#asmr", "#oddlysatisfying", "#relax", "#fyp", "#pourtoi"]


# ------------------------------------------------------------------ son : petites notes justes

SCALES = {   # gammes « qui sonnent toujours juste »
    "pentatonique": [0, 2, 4, 7, 9], "mineure": [0, 3, 5, 7, 10], "japonaise": [0, 1, 5, 7, 8],
    "lydienne": [0, 2, 4, 6, 7, 9, 11], "arabe": [0, 1, 4, 5, 7, 8, 11], "blues": [0, 3, 5, 6, 7, 10],
}


def _notes(scale: str, root: float) -> list[float]:
    steps = SCALES[scale]
    out = [root * 2 ** ((o * 12 + st) / 12) for o in range(4) for st in steps]
    return (out * 2)[:20]


NOTES = _notes("pentatonique", 261.63)

PALETTES = {   # dégradés (positions 0 → 1)
    "arc-en-ciel": None, "néon": [(255, 0, 170), (0, 240, 255), (180, 255, 0)],
    "pastel": [(255, 179, 186), (255, 223, 186), (186, 255, 201), (186, 225, 255), (220, 190, 255)],
    "coucher de soleil": [(255, 94, 77), (255, 166, 0), (255, 220, 110), (200, 60, 140)],
    "océan": [(0, 90, 160), (0, 180, 200), (120, 230, 220), (230, 255, 250)],
    "bonbon": [(255, 105, 180), (255, 182, 255), (140, 220, 255), (255, 240, 120)],
    "or": [(140, 90, 20), (230, 180, 60), (255, 230, 150), (255, 250, 220)],
    "lave": [(120, 0, 20), (230, 40, 20), (255, 140, 0), (255, 230, 80)],
    "forêt": [(20, 90, 50), (60, 170, 80), (170, 220, 90), (240, 230, 140)],
    "glace": [(90, 130, 255), (150, 200, 255), (220, 240, 255), (180, 160, 255)],
    "cyber": [(120, 0, 255), (255, 0, 120), (255, 200, 0), (0, 255, 160)],
}
NAMED = [((255, 80, 90), "ROUGE"), ((70, 150, 255), "BLEU"), ((90, 220, 120), "VERT"), ((255, 205, 60), "JAUNE"),
         ((190, 110, 255), "VIOLET"), ((255, 150, 60), "ORANGE"), ((255, 120, 200), "ROSE"), ((70, 230, 230), "CYAN")]
V: dict = {"palette": "arc-en-ciel", "hue": 0.0}   # variante en cours de rendu


def pal(x: float, light: float = 1.0) -> tuple:
    """Couleur de la palette de la vidéo (x entre 0 et 1, boucle)."""
    stops = PALETTES.get(V.get("palette"))
    if not stops:
        r, g, b = colorsys.hsv_to_rgb((x + V.get("hue", 0)) % 1, 0.78, 1.0)
        c = (r * 255, g * 255, b * 255)
    else:
        x = x % 1 * (len(stops))
        i = int(x) % len(stops)
        j = (i + 1) % len(stops)
        f = x - int(x)
        c = tuple(stops[i][k] * (1 - f) + stops[j][k] * f for k in range(3))
    return tuple(int(min(255, v * light)) for v in c)


# Kits de sons : chaque vidéo pioche un timbre différent (l'agent varie, comme pour les couleurs).
KITS = ["cristal", "marimba", "pluck", "bulle", "goutte", "verre", "synth", "clic"]
POPKITS = ["pop", "crack", "eclats", "bulle"]
BEDS = ["aucun", "nappe", "pulse", "nappe+pulse"]
_WAVES: dict = {}


def _kit_wave(kit: str, freq: float, dur: float) -> np.ndarray:
    key = (kit, freq, round(dur, 2))
    if key in _WAVES:
        return _WAVES[key]
    n = int(dur * SR)
    x = np.arange(n) / SR
    tau = 2 * np.pi
    if kit == "marimba":       # bois : grave chaud + partiels très courts
        w = np.sin(tau * freq * x) * np.exp(-x * 11) + 0.45 * np.sin(tau * 3.93 * freq * x) * np.exp(-x * 45) \
            + 0.15 * np.sin(tau * 9.2 * freq * x) * np.exp(-x * 90)
    elif kit == "pluck":       # corde pincée (Karplus-Strong)
        p = max(2, int(SR / freq))
        rng = np.random.default_rng(int(freq * 10))
        y = np.zeros(n + p)
        y[:p] = rng.uniform(-1, 1, p)
        for k in range(p, n + p, p):
            prev = y[k - p:k]
            y[k:k + p] = (0.996 * 0.5 * (prev + np.roll(prev, 1)))[: len(y[k:k + p])]
        w = y[p:] * 0.9
    elif kit == "bulle":       # bulle qui « ploppe » (le son monte)
        f = freq * (0.7 + 0.9 * (1 - np.exp(-x * 28)))
        w = np.sin(tau * np.cumsum(f) / SR) * np.exp(-x * 13)
    elif kit == "goutte":      # goutte d'eau (glissé rapide vers le bas)
        f = freq * (1 + 1.2 * np.exp(-x * 40))
        w = np.sin(tau * np.cumsum(f) / SR) * np.exp(-x * 16)
    elif kit == "verre":       # verre / clochette : partiels inharmoniques
        w = sum(a * np.sin(tau * freq * m * x) * np.exp(-x * dcy) for m, a, dcy in ((1, 1, 5), (2.76, 0.5, 9), (5.4, 0.25, 15), (8.93, 0.12, 22)))
    elif kit == "synth":       # piano électrique (FM)
        w = np.sin(tau * freq * x + 1.6 * np.exp(-x * 6) * np.sin(tau * 2 * freq * x)) * np.exp(-x * 7)
    elif kit == "clic":        # petit clic de bois accordé (parfait pour les dominos)
        rng = np.random.default_rng(int(freq))
        nz = np.diff(rng.uniform(-1, 1, n + 1)) * np.exp(-x * 160) * 0.6
        w = nz + np.sin(tau * 2 * freq * x) * np.exp(-x * 55) * 0.8 + np.sin(tau * freq * x) * np.exp(-x * 20) * 0.3
    else:                      # cristal (son d'origine)
        w = (np.sin(tau * freq * x) + 0.35 * np.sin(2 * tau * freq * x) * np.exp(-x * 14)
             + 0.12 * np.sin(3 * tau * freq * x) * np.exp(-x * 20)) * np.exp(-x * 9)
    w = w * np.minimum(1, x / 0.004)
    w = (w / (np.max(np.abs(w)) or 1)).astype(np.float32)        # même volume pour tous les timbres
    _WAVES[key] = w
    return w


def _pop_wave(kind: str) -> np.ndarray:
    n = int(0.16 * SR)
    x = np.arange(n) / SR
    noise = np.convolve(np.random.uniform(-1, 1, n), np.ones(6) / 6, mode="same")
    if kind == "crack":        # craquement sec
        return noise * 1.6 * np.exp(-x * 60) + np.sin(2 * np.pi * 90 * x) * np.exp(-x * 25) * 0.7
    if kind == "eclats":       # éclats de verre
        return sum(np.sin(2 * np.pi * f0 * x) * np.exp(-x * d0) for f0, d0 in
                   ((np.random.uniform(2500, 5200), 30), (np.random.uniform(3000, 6000), 45), (np.random.uniform(1800, 3800), 25))) * 0.3 \
            + noise * np.exp(-x * 70) * 0.6
    if kind == "bulle":        # gros « blop »
        f = 180 + 420 * (1 - np.exp(-x * 35))
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 18) * 0.9
    return noise * np.exp(-x * 35) + np.sin(2 * np.pi * 140 * x) * np.exp(-x * 30) * 0.6


class Audio:
    def __init__(self, seconds: float):
        self.buf = np.zeros(int((seconds + 8) * SR), dtype=np.float32)
        self.last: dict[str, float] = {}
        self.tv, self.ts, self.sp = 0.0, 0.0, 1.0

    def sync(self, tv: float, ts: float, sp: float):
        """Le tempo varie : les scènes parlent en temps « simulation », on place le son en temps « vidéo »."""
        self.tv, self.ts, self.sp = tv, ts, sp

    def _v(self, t: float) -> float:
        return self.tv + (t - self.ts) / self.sp

    def riser(self, t0: float, t1: float, vol: float = 0.16):
        """Montée de tension (souffle + son qui grimpe) pendant que ça ré-accélère."""
        n = int(max(0.3, t1 - t0) * SR)
        f = np.linspace(0, 1, n)
        freq = 180 + 520 * f ** 2
        tone = np.sin(2 * np.pi * np.cumsum(freq) / SR) * 0.5 + np.sin(4 * np.pi * np.cumsum(freq) / SR) * 0.15
        noise = np.convolve(np.random.uniform(-1, 1, n), np.ones(24) / 24, mode="same") * 3
        env = f ** 2.2 * np.minimum(1, (n - np.arange(n)) / (0.05 * SR))
        self._add(t0, (tone * 0.6 + noise * 0.4) * env * vol)

    def impact(self, t: float, vol: float = 0.55):
        """Coup sourd + éclat : le moment du résultat."""
        n = int(0.9 * SR)
        x = np.arange(n) / SR
        boom = np.sin(2 * np.pi * (55 + 60 * np.exp(-x * 9)) * x) * np.exp(-x * 4.5)
        shine = sum(np.sin(2 * np.pi * f0 * x) for f0 in (1318.5, 1975.5, 2637.0)) / 3 * np.exp(-x * 3.5) * 0.35
        self._add(t, (boom + shine) * vol)

    def note(self, t: float, freq: float, vol: float = 0.35, dur: float = 0.35, key: str = "n", gap: float = 0.035):
        t = self._v(t)
        if t - self.last.get(key, -1) < gap:      # pas de mitraillage : une note par canal toutes les 35 ms
            return
        self.last[key] = t
        self._add(t, _kit_wave(V.get("kit", "cristal"), round(freq, 2), dur) * vol)

    def pop(self, t: float, vol: float = 0.4, key: str = "p"):
        t = self._v(t)
        if t - self.last.get(key, -1) < 0.03:
            return
        self.last[key] = t
        self._add(t, _pop_wave(V.get("popkit", "pop")) * vol)

    def thump(self, t: float, vol: float = 0.22):
        """Battement sourd (le « cœur » de la vidéo, il suit le rythme)."""
        x = np.arange(int(0.25 * SR)) / SR
        self._add(t, np.sin(2 * np.pi * (48 + 40 * np.exp(-x * 30)) * x) * np.exp(-x * 14) * vol)

    def pad(self, seconds: float, root: float, vol: float = 0.05):
        """Nappe douce (fondamentale, quinte, octave) qui respire lentement."""
        n = int(seconds * SR)
        x = np.arange(n) / SR
        w = sum(a * np.sin(2 * np.pi * root * m * x + ph) for m, a, ph in ((0.5, 1.0, 0), (0.75, 0.6, 1.1), (1.0, 0.45, 2.3), (1.5, 0.2, 0.7)))
        env = (0.65 + 0.35 * np.sin(2 * np.pi * x / 6.0)) * np.minimum(1, x / 2.0) * np.minimum(1, (seconds - x) / 2.0)
        self._add(0.0, w * env * vol)

    def _add(self, t: float, w: np.ndarray):
        i = int(t * SR)
        if i >= len(self.buf) or i < 0:
            return
        j = min(len(self.buf), i + len(w))
        self.buf[i:j] += w[: j - i].astype(np.float32)

    def save(self, path: Path, seconds: float):
        b = self.buf[: int(seconds * SR)]
        # petite réverbération (échos doux) pour un son plus « plein »
        out = b.copy()
        for delay, g in ((0.043, 0.25), (0.089, 0.16), (0.137, 0.1)):
            d = int(delay * SR)
            out[d:] += b[:-d] * g
        peak = np.max(np.abs(out)) or 1
        out = np.tanh(out / peak * 1.4) * 0.85
        with wave.open(str(path), "wb") as f:
            f.setnchannels(1)
            f.setsampwidth(2)
            f.setframerate(SR)
            f.writeframes((out * 32767).astype(np.int16).tobytes())


# ------------------------------------------------------------------ dessin commun

def _font(size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(str(FONTS_DIR / "Poppins-ExtraBold.ttf"), size)
    except OSError:
        return ImageFont.load_default()


def _bg(top: tuple, bottom: tuple, style: str = "uni", seed: int = 0) -> Image.Image:
    g = np.linspace(0, 1, H * K)[:, None, None]
    arr = (np.array(top) * (1 - g) + np.array(bottom) * g).astype(np.uint8)
    img = Image.fromarray(np.repeat(arr, W * K, axis=1), "RGB")
    d = ImageDraw.Draw(img)
    r = random.Random(seed)
    if style == "etoiles":
        for _ in range(160):
            x, y, s = r.uniform(0, W * K), r.uniform(0, H * K), r.choice([1, 1, 2, 3])
            c = 120 + r.randrange(100)
            d.ellipse([x, y, x + s, y + s], fill=(c, c, min(255, c + 40)))
    elif style == "grille":
        for x in range(0, W * K, 60):
            d.line([x, 0, x, H * K], fill=tuple(min(255, v + 14) for v in top), width=1)
        for y in range(0, H * K, 60):
            d.line([0, y, W * K, y], fill=tuple(min(255, v + 14) for v in top), width=1)
    elif style == "halo":
        halo = Image.new("L", img.size, 0)
        ImageDraw.Draw(halo).ellipse([W * K * 0.1, H * K * 0.25, W * K * 0.9, H * K * 0.75], fill=60)
        from PIL import ImageFilter
        img = Image.composite(Image.new("RGB", img.size, tuple(min(255, v + 50) for v in bottom)), img,
                              halo.filter(ImageFilter.GaussianBlur(120)))
    return img


class SDraw:
    """Dessine en 1080x1920 avec les coordonnées 540x960 de la simulation (tout est multiplié par K)."""

    def __init__(self, img: Image.Image):
        self.d = ImageDraw.Draw(img)

    @staticmethod
    def _xy(xy):
        return [v * K for v in xy] if not isinstance(xy[0], (tuple, list)) else [(a * K, b * K) for a, b in xy]

    def ellipse(self, xy, fill=None, outline=None, width=1):
        self.d.ellipse(self._xy(xy), fill=fill, outline=outline, width=int(width * K))

    def rectangle(self, xy, fill=None, outline=None, width=1):
        self.d.rectangle(self._xy(xy), fill=fill, outline=outline, width=int(width * K))

    def rounded_rectangle(self, xy, radius, fill=None, outline=None, width=1):
        self.d.rounded_rectangle(self._xy(xy), radius * K, fill=fill, outline=outline, width=int(width * K))

    def line(self, xy, fill=None, width=1):
        self.d.line(self._xy(xy), fill=fill, width=int(width * K), joint="curve")

    def arc(self, xy, start, end, fill=None, width=1):
        self.d.arc(self._xy(xy), start, end, fill=fill, width=int(width * K))

    def text(self, xy, txt, font, fill, anchor, stroke_width, stroke_fill):
        self.d.text((xy[0] * K, xy[1] * K), txt, font=font, fill=fill, anchor=anchor, stroke_width=stroke_width * K,
                    stroke_fill=stroke_fill)


def _text(d: "SDraw", xy, txt: str, size: int, fill=(255, 255, 255), anchor="mm"):
    """Texte centré qui ne déborde jamais : il rétrécit, puis passe sur 2 lignes si besoin."""
    maxw = (W - 36) * K
    for sz in (size, int(size * 0.85), int(size * 0.72)):
        if _font(sz * K).getlength(txt) <= maxw:
            d.text(xy, txt, font=_font(sz * K), fill=fill, anchor=anchor, stroke_width=max(2, sz // 9), stroke_fill=(0, 0, 0))
            return
    words = txt.split()
    cut = max(1, len(words) // 2)
    sz = int(size * 0.8)
    for k, line in enumerate((" ".join(words[:cut]), " ".join(words[cut:]))):
        d.text((xy[0], xy[1] + (k - 0.5) * sz * 1.15), line, font=_font(sz * K), fill=fill, anchor=anchor,
               stroke_width=max(2, sz // 9), stroke_fill=(0, 0, 0))


def _hsv(h: float, s: float = 0.8, v: float = 1.0) -> tuple:
    r, g, b = colorsys.hsv_to_rgb(h % 1, s, v)
    return int(r * 255), int(g * 255), int(b * 255)


_SPRITES: dict = {}


def sphere(r: float, color: tuple, glow: bool = True) -> Image.Image:
    """Bille brillante (dégradé radial, reflet, bord sombre) + halo lumineux, en RGBA, mise en cache."""
    rp = max(2, int(r * K))
    key = (rp // 2, color, glow)
    if key in _SPRITES:
        return _SPRITES[key]
    pad = int(rp * 0.9) if glow else 2
    size = 2 * (rp + pad)
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    c = size / 2
    dist = np.sqrt((xx - c) ** 2 + (yy - c) ** 2) / rp
    hx, hy = c - rp * 0.35, c - rp * 0.4
    hd = np.sqrt((xx - hx) ** 2 + (yy - hy) ** 2) / rp
    col = np.array(color, dtype=np.float32)
    shade = np.clip(1.15 - dist * 0.55, 0.45, 1.1)[..., None]           # plus sombre vers le bord
    rgb = col * shade + np.clip(1 - hd / 0.45, 0, 1)[..., None] ** 2 * (255 - col) * 0.9   # reflet blanc
    alpha = np.clip((1 - dist) * rp * 0.9, 0, 1)                         # bord net mais lisse
    if glow:
        halo = np.clip(1 - (dist - 1) / 0.9, 0, 1) ** 2 * 0.55 * (dist > 0.98)
        a = np.maximum(alpha, halo)
        rgb = np.where((alpha > 0)[..., None], rgb, col * 1.1)
    else:
        a = alpha
    out = np.dstack([np.clip(rgb, 0, 255), a * 255]).astype(np.uint8)
    img = Image.fromarray(out, "RGBA")
    if len(_SPRITES) > 600:
        _SPRITES.clear()
    _SPRITES[key] = img
    return img


def paste_sphere(img: Image.Image, x: float, y: float, r: float, color: tuple, glow: bool = True):
    if r > 55:   # grosse bille : dessin vectoriel en couches (bien plus rapide qu'un sprite géant)
        d = SDraw(img)
        if glow:
            for k, f in ((14, 0.18), (8, 0.3), (3, 0.45)):
                rr = r + k
                d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=tuple(int(v * f) + 10 for v in color))
        dark = tuple(int(v * 0.55) for v in color)
        d.ellipse([x - r, y - r, x + r, y + r], fill=dark)
        for k, f in ((0.92, 0.75), (0.8, 0.9), (0.62, 1.0)):
            rr = r * k
            ox, oy = -r * (1 - k) * 0.5, -r * (1 - k) * 0.6
            d.ellipse([x + ox - rr, y + oy - rr, x + ox + rr, y + oy + rr], fill=tuple(min(255, int(v * f + 18 * (1 - k))) for v in color))
        hx, hy, hr = x - r * 0.38, y - r * 0.42, r * 0.2
        d.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=(255, 255, 255))
        return
    sp = sphere(r, color, glow)
    img.paste(sp, (int(x * K - sp.width / 2), int(y * K - sp.height / 2)), sp)


class Particles:
    def __init__(self):
        self.p: list[list] = []      # x, y, vx, vy, vie, couleur, taille

    def burst(self, x, y, color, n=12, speed=260, size=3):
        for _ in range(n):
            a = random.uniform(0, 2 * math.pi)
            s = random.uniform(0.3, 1) * speed
            self.p.append([x, y, math.cos(a) * s, math.sin(a) * s, 1.0, color, size])

    def step(self, dt, g=700):
        for q in self.p:
            q[0] += q[2] * dt
            q[1] += q[3] * dt
            q[3] += g * dt
            q[4] -= dt * 1.3
        self.p = [q for q in self.p if q[4] > 0 and q[1] < H + 20]

    def draw(self, d):
        for x, y, _, _, life, c, s in self.p:
            r = s * (0.4 + life * 0.6)
            d.rectangle([x - r, y - r, x + r, y + r], fill=c)


# ------------------------------------------------------------------ 1. anneaux

class Rings:
    def __init__(self, rnd: random.Random, audio: Audio):
        self.rnd, self.audio = rnd, audio
        self.cx, self.cy = W / 2, H * 0.55
        n = V.get("rings", 14)
        step = min(17, 210 / n)
        spin, gap = V.get("spin", 1.0), V.get("gap", 0.95)
        self.thick = V.get("thick", 5)
        self.rings = [{"r": 48 + i * step, "a": rnd.uniform(0, 6.28),
                       "w": (1 if (i % 2 or V.get("mode") == "meme_sens") else -1) * (1.2 + i * 0.06) * spin,
                       "gap": gap - i * 0.012, "col": pal(i / n), "alive": True}
                      for i in range(n)]
        self.bx, self.by = self.cx + rnd.uniform(-8, 8), self.cy - 10
        a = rnd.uniform(0, 6.28)
        self.vx, self.vy = math.cos(a) * 320, math.sin(a) * 320
        self.br = V.get("ball", 8)
        self.grav = V.get("grav", 650)
        self.hue = rnd.random()
        self.parts = Particles()
        self.note_i = 0
        self.done_at = None
        self.trail: list[tuple] = []
        self.shake = -9.0
        self.shards: list[dict] = []
        self.waves: list[tuple] = []

    @property
    def broken(self):
        return sum(not r["alive"] for r in self.rings)

    def _shatter(self, ring, t):
        """L'anneau éclate en vrais morceaux d'anneau qui tournoient et tombent, avec une onde de choc."""
        n = 14
        span = 2 * math.pi - ring["gap"]
        for k in range(n):
            a0 = ring["a"] + ring["gap"] + span * k / n
            a1 = a0 + span / n * 0.82
            am = (a0 + a1) / 2
            out = self.rnd.uniform(70, 200)
            tang = ring["w"] * ring["r"]                       # garde l'élan de la rotation
            self.shards.append({
                "x": self.cx + math.cos(am) * ring["r"], "y": self.cy + math.sin(am) * ring["r"],
                "vx": math.cos(am) * out - math.sin(am) * tang, "vy": math.sin(am) * out + math.cos(am) * tang - 120,
                "ang": am, "spin": self.rnd.uniform(-5, 5), "len": ring["r"] * span / n * 0.82,
                "col": ring["col"], "life": 1.0})
        self.waves.append((t, ring["r"], ring["col"]))
        self.shake = t
        self.audio.pop(t, 0.55)
        self.audio.pop(t + 0.04, 0.3, key="p2")
        base = min(14, 5 + self.broken)
        for i, step in enumerate((0, 2, 4)):                    # petit arpège montant : « cling-cling-cling »
            self.audio.note(t + i * 0.055, NOTES[min(19, base + step)], 0.4, 0.7, key=f"b{i}", gap=0)

    def step(self, t, dt):
        for r in self.rings:
            r["a"] += r["w"] * dt
        self.vy += self.grav * dt
        self.bx += self.vx * dt
        self.by += self.vy * dt
        inner = next((r for r in self.rings if r["alive"]), None)
        if inner:
            dx, dy = self.bx - self.cx, self.by - self.cy
            dist = math.hypot(dx, dy) or 1
            if dist + self.br >= inner["r"] - 3:
                ang = (math.atan2(dy, dx) - inner["a"]) % (2 * math.pi)
                if ang < inner["gap"]:                              # elle passe par la brèche : l'anneau explose
                    inner["alive"] = False
                    self.shake = t
                    self._shatter(inner, t)
                    if self.broken == len(self.rings):
                        self.done_at = t
                else:                                               # rebond sur l'anneau
                    nx, ny = dx / dist, dy / dist
                    dot = self.vx * nx + self.vy * ny
                    if dot > 0:
                        self.vx -= 2 * dot * nx
                        self.vy -= 2 * dot * ny
                        sp = math.hypot(self.vx, self.vy)
                        target = max(sp * 1.01, 420)
                        self.vx, self.vy = self.vx / sp * target, self.vy / sp * target
                        self.vx += self.rnd.uniform(-20, 20)
                        self.hue += 0.05
                        self.audio.note(t, NOTES[self.note_i % 15], 0.32)
                        inner["hit"] = t
                        self.note_i += 1
                    k = (inner["r"] - 3 - self.br) / dist
                    self.bx, self.by = self.cx + dx * k, self.cy + dy * k
        else:   # tout est cassé : la bille rebondit sur les bords
            if self.bx < self.br or self.bx > W - self.br:
                self.vx = -self.vx
            if self.by > H - self.br:
                self.vy = -abs(self.vy) * 0.9
        for sh in self.shards:
            sh["x"] += sh["vx"] * dt
            sh["y"] += sh["vy"] * dt
            sh["vy"] += 520 * dt
            sh["vx"] *= 1 - 0.4 * dt
            sh["ang"] += sh["spin"] * dt
            sh["life"] -= dt * 0.45
        self.shards = [sh for sh in self.shards if sh["life"] > 0 and sh["y"] < H + 40]
        self.parts.step(dt)

    def draw(self, img, t):
        d = SDraw(img)
        for r in self.rings:
            if not r["alive"]:
                continue
            a0 = math.degrees(r["a"] + r["gap"])
            a1 = math.degrees(r["a"] + 2 * math.pi)
            sh = max(0.0, 1 - (t - self.shake) / 0.25) * 6            # petite secousse quand un anneau explose
            ox, oy = (self.rnd.uniform(-sh, sh), self.rnd.uniform(-sh, sh)) if sh else (0, 0)
            box = [self.cx - r["r"] + ox, self.cy - r["r"] + oy, self.cx + r["r"] + ox, self.cy + r["r"] + oy]
            lit = max(0.0, 1 - (t - r.get("hit", -9)) / 0.18)          # flash quand la bille le touche
            col = tuple(int(c + (255 - c) * lit) for c in r["col"])
            d.arc(box, a0, a1, fill=col, width=self.thick + 3 * lit)
        self.trail = (self.trail + [(self.bx, self.by)])[-14:]
        for i, (x, y) in enumerate(self.trail):
            rr = self.br * (i + 1) / len(self.trail) * 0.8
            d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=pal(self.hue, 0.6))
        d.ellipse([self.bx - self.br, self.by - self.br, self.bx + self.br, self.by + self.br],
                  fill=pal(self.hue), outline=(255, 255, 255), width=2)
        for (t0, r0, col) in self.waves:                       # onde de choc qui s'élargit
            f = (t - t0) / 0.4
            if 0 <= f < 1:
                rr = r0 + 70 * f
                c = tuple(int(255 + (v - 255) * f) for v in col)
                d.ellipse([self.cx - rr, self.cy - rr, self.cx + rr, self.cy + rr], outline=c, width=max(1, int(6 * (1 - f))))
        for sh in self.shards:                                  # morceaux d'anneau
            hl = sh["len"] / 2
            dx, dy = -math.sin(sh["ang"]) * hl, math.cos(sh["ang"]) * hl
            c = tuple(int(v * (0.35 + 0.65 * sh["life"])) for v in sh["col"])
            d.line([sh["x"] - dx, sh["y"] - dy, sh["x"] + dx, sh["y"] + dy], fill=c, width=self.thick + 3)
        self.parts.draw(d)
        _text(d, (W / 2, 210), f"{self.broken} / {len(self.rings)}", 30, pal(0.15))
        if self.done_at is not None:
            _text(d, (W / 2, H * 0.55), "LIBRE !", 64, _hsv(t * 0.5))

    def finished(self, t):
        return self.done_at is not None and t - self.done_at > 2.5


# ------------------------------------------------------------------ 2. plinko

class Plinko:
    COLORS = [((255, 80, 90), "ROUGE"), ((70, 150, 255), "BLEU"), ((90, 220, 120), "VERT"), ((255, 205, 60), "JAUNE")]

    def __init__(self, rnd: random.Random, audio: Audio, total: int = 140):
        self.rnd, self.audio = rnd, audio
        self.COLORS = V.get("pcolors") or self.COLORS
        self.rows = V.get("rows", 13)
        self.peg = V.get("peg", "round")
        total = V.get("balls", total)
        self.pegs = []
        for row in range(self.rows):
            y = 300 + row * 34
            off = 0 if row % 2 == 0 else 17
            for k in range(-8, 9):
                x = W / 2 + k * 34 + off
                if 30 < x < W - 30:
                    self.pegs.append((x, y, row))
        self.bins_y = 300 + self.rows * 34 + 20
        self.nbins = V.get("bins", 7)
        self.bin_w = (W - 40) / self.nbins
        self.balls: list[dict] = []
        self.total = total
        self.spawned = 0
        self.next_spawn = 0.4
        self.score = [0] * len(self.COLORS)
        self.br = 7
        self.done_at = None
        self.flash: dict[int, float] = {}

    def step(self, t, dt):
        if self.spawned < self.total and t >= self.next_spawn:
            c = self.spawned % len(self.COLORS)
            self.balls.append({"x": W / 2 + self.rnd.uniform(-14, 14), "y": 240, "vx": self.rnd.uniform(-30, 30),
                               "vy": 0, "c": c, "rest": False, "counted": False})
            self.spawned += 1
            self.next_spawn = t + 0.11
        jack = self.nbins // 2
        for b in self.balls:
            if b["rest"]:
                continue
            b["vy"] += 900 * dt
            b["x"] += b["vx"] * dt
            b["y"] += b["vy"] * dt
            if b["y"] < self.bins_y:
                for (px, py, row) in self.pegs:
                    dx, dy = b["x"] - px, b["y"] - py
                    dd = dx * dx + dy * dy
                    if dd < (self.br + 4) ** 2:
                        dist = math.sqrt(dd) or 1
                        nx, ny = dx / dist, dy / dist
                        dot = b["vx"] * nx + b["vy"] * ny
                        if dot < 0:
                            b["vx"] -= 1.5 * dot * nx
                            b["vy"] -= 1.5 * dot * ny
                            b["vx"] += self.rnd.uniform(-25, 25)
                            self.flash[(px, py)] = t
                            self.audio.note(t, NOTES[14 - min(row, 12)], 0.12, 0.2, key=f"p{row % 3}", gap=0.05)
                        b["x"], b["y"] = px + nx * (self.br + 4), py + ny * (self.br + 4)
            if b["x"] < 20 + self.br:
                b["x"], b["vx"] = 20 + self.br, abs(b["vx"]) * 0.6
            if b["x"] > W - 20 - self.br:
                b["x"], b["vx"] = W - 20 - self.br, -abs(b["vx"]) * 0.6
            if b["y"] > self.bins_y:   # dans les cases : murs de séparation
                i = int((b["x"] - 20) / self.bin_w)
                i = max(0, min(self.nbins - 1, i))
                left, right = 20 + i * self.bin_w + 3, 20 + (i + 1) * self.bin_w - 3
                if b["x"] < left + self.br:
                    b["x"], b["vx"] = left + self.br, abs(b["vx"]) * 0.3
                if b["x"] > right - self.br:
                    b["x"], b["vx"] = right - self.br, -abs(b["vx"]) * 0.3
                if not b["counted"]:
                    b["counted"] = True
                    if i == jack:
                        self.score[b["c"]] += 1
                        self.audio.note(t, NOTES[5 + b["c"] * 2], 0.4, 0.5, key="j")
                    else:
                        self.audio.note(t, NOTES[2], 0.18, 0.3, key="bin")
            floor = H - 70
            if b["y"] > floor - self.br:
                b["y"], b["vy"] = floor - self.br, -b["vy"] * 0.2
                b["vx"] *= 0.7
                if abs(b["vy"]) < 30:
                    b["rest"] = True
        # empilement simple dans les cases
        moving = [b for b in self.balls if b["y"] > self.bins_y - 10]
        for _ in range(2):
            for i, a in enumerate(moving):
                for b in moving[i + 1:]:
                    dx, dy = b["x"] - a["x"], b["y"] - a["y"]
                    dd = dx * dx + dy * dy
                    if 0 < dd < (2 * self.br) ** 2:
                        dist = math.sqrt(dd)
                        push = (2 * self.br - dist) / 2
                        nx, ny = dx / dist, dy / dist
                        if not a["rest"]:
                            a["x"] -= nx * push
                            a["y"] -= ny * push
                        if not b["rest"]:
                            b["x"] += nx * push
                            b["y"] += ny * push
                        if ny > 0.5 and not b["rest"] and a["rest"] and abs(b["vy"]) < 80:
                            b["rest"] = True
        if self.spawned == self.total and self.done_at is None and all(b["rest"] or b["y"] > H for b in self.balls):
            self.done_at = t
            self.audio.note(t, NOTES[12], 0.5, 0.9, key="win")
            self.audio.note(t + 0.15, NOTES[16], 0.5, 0.9, key="win2")

    def draw(self, img, t):
        d = SDraw(img)
        jack = self.nbins // 2
        for i in range(self.nbins):
            x0 = 20 + i * self.bin_w
            if i == jack:
                d.rectangle([x0, self.bins_y, x0 + self.bin_w, H - 70], fill=(70, 55, 20))
            d.line([x0, self.bins_y, x0, H - 70], fill=(200, 200, 230), width=3)
        d.line([20 + self.nbins * self.bin_w, self.bins_y, 20 + self.nbins * self.bin_w, H - 70], fill=(200, 200, 230), width=3)
        d.line([20, H - 70, W - 20, H - 70], fill=(200, 200, 230), width=3)
        _text(d, (20 + (jack + 0.5) * self.bin_w, self.bins_y + 18), "JACKPOT", 13, (255, 215, 90))
        for (px, py, _) in self.pegs:
            lit = t - self.flash.get((px, py), -9) < 0.15
            r = 5 if lit else 4
            col = (255, 255, 255) if lit else pal(py / H, 0.8)
            if self.peg == "diamond":
                d.d.polygon([((px) * K, (py - r) * K), ((px + r) * K, py * K), (px * K, (py + r) * K), ((px - r) * K, py * K)], fill=col)
            else:
                d.ellipse([px - r, py - r, px + r, py + r], fill=col)
        for b in self.balls:
            c = self.COLORS[b["c"]][0]
            d.ellipse([b["x"] - self.br, b["y"] - self.br, b["x"] + self.br, b["y"] + self.br], fill=c)
        nc = len(self.COLORS)
        bw = (W - 40) / nc
        for k, ((c, name), s) in enumerate(zip(self.COLORS, self.score)):
            x = 20 + bw * (k + 0.5)
            d.rounded_rectangle([x - bw / 2 + 6, 150, x + bw / 2 - 6, 196], 12, fill=c)
            _text(d, (x, 173), str(s), 26)
        if self.done_at is not None:
            win = max(range(len(self.COLORS)), key=lambda k: self.score[k])
            _text(d, (W / 2, 250), f"{self.COLORS[win][1]} GAGNE !", 42, self.COLORS[win][0])

    def finished(self, t):
        return self.done_at is not None and t - self.done_at > 3


# ------------------------------------------------------------------ 3. mur arc-en-ciel

class Wall:
    def __init__(self, rnd: random.Random, audio: Audio):
        self.rnd, self.audio = rnd, audio
        self.cs = V.get("cell", 15)
        self.cols = W // self.cs
        self.y0 = 160
        self.rows = int(630 // self.cs)
        self.pattern = V.get("pattern", "bandes")
        self.split_every = V.get("split", 7)
        self.speed = V.get("speed", 700)
        self.hue0 = rnd.random()
        self.logo_px = None
        if V.get("logo_img") is not None:   # le mur dessine le logo, bloc par bloc
            im = V["logo_img"]
            fit = im.copy()
            fit.thumbnail((self.cols - 2, self.rows - 2), Image.LANCZOS)
            canvas = Image.new("RGBA", (self.cols, self.rows), (0, 0, 0, 0))
            canvas.alpha_composite(fit, ((self.cols - fit.width) // 2, (self.rows - fit.height) // 2))
            self.logo_px = np.array(canvas)
        self.grid = np.ones((self.rows, self.cols), dtype=bool)
        self.total = int(self.grid.sum())
        self.broken = 0
        nb = V.get("start", 3)
        self.balls = [self._ball(W / 2 + (k - (nb - 1) / 2) * 40, H - 100, -math.pi / 2 + rnd.uniform(-0.6, 0.6)) for k in range(nb)]
        self.parts = Particles()
        self.br = 6
        self.done_at = None

    def _ball(self, x, y, a, speed=None):
        speed = speed or self.speed
        return {"x": x, "y": y, "vx": math.cos(a) * speed, "vy": math.sin(a) * speed, "h": self.rnd.random()}

    def color(self, r, c):
        if self.logo_px is not None:
            px = self.logo_px[r, c]
            if px[3] > 100:
                return int(px[0]), int(px[1]), int(px[2])
            return pal(r / self.rows * 0.3, 0.35)   # autour du logo : couleur discrète de la palette
        p = self.pattern
        if p == "verticales":
            x = c / self.cols
        elif p == "diagonale":
            x = (r / self.rows + c / self.cols) / 2
        elif p == "cercles":
            x = math.hypot(r - self.rows / 2, (c - self.cols / 2) * 1.2) / max(self.rows, self.cols) * 1.6
        elif p == "damier":
            x = (r // 4 + c // 4) % 2 * 0.5 + r / self.rows * 0.4
        else:
            x = r / self.rows * 0.9 + c / self.cols * 0.06
        return pal(x, 0.95)

    def step(self, t, dt):
        new = []
        for b in self.balls:
            ox, oy = b["x"], b["y"]
            b["x"] += b["vx"] * dt
            b["y"] += b["vy"] * dt
            if b["x"] < self.br or b["x"] > W - self.br:
                b["vx"] = -b["vx"]
                b["x"] = min(max(b["x"], self.br), W - self.br)
            if b["y"] < 120 + self.br or b["y"] > H - 60 - self.br:
                b["vy"] = -b["vy"]
                b["y"] = min(max(b["y"], 120 + self.br), H - 60 - self.br)
            c, r = int(b["x"] // self.cs), int((b["y"] - self.y0) // self.cs)
            if 0 <= r < self.rows and 0 <= c < self.cols and self.grid[r, c]:
                self.grid[r, c] = False
                self.broken += 1
                col = self.color(r, c)
                self.parts.burst(c * self.cs + self.cs / 2, self.y0 + r * self.cs + self.cs / 2, col, n=4, speed=160, size=2.5)
                pc, pr = int(ox // self.cs), int((oy - self.y0) // self.cs)
                if pc != c:
                    b["vx"] = -b["vx"]
                if pr != r or pc == c:
                    b["vy"] = -b["vy"]
                b["x"], b["y"] = ox, oy
                self.audio.note(t, NOTES[(r * 3 + c) % 15 + 3], 0.16, 0.22, key=f"w{len(self.balls) % 4}", gap=0.03)
                if self.broken % self.split_every == 0 and len(self.balls) + len(new) < 90:   # la balle se divise
                    a = math.atan2(b["vy"], b["vx"]) + self.rnd.uniform(0.5, 1.2)
                    new.append(self._ball(b["x"], b["y"], a))
                    self.audio.pop(t, 0.3)
        self.balls += new
        self.parts.step(dt)
        if self.broken >= self.total and self.done_at is None:
            self.done_at = t
            self.audio.note(t, NOTES[15], 0.5, 0.9, key="end")

    def draw(self, img, t):
        d = SDraw(img)
        cs = self.cs
        rr, cc = np.nonzero(self.grid)
        for r, c in zip(rr, cc):
            x, y = c * cs, self.y0 + r * cs
            d.rectangle([x + 1, y + 1, x + cs - 1, y + cs - 1], fill=self.color(r, c))
        self.parts.draw(d)
        for b in self.balls:
            d.ellipse([b["x"] - self.br, b["y"] - self.br, b["x"] + self.br, b["y"] + self.br], fill=(255, 255, 255))
        _text(d, (W / 2, 130), f"{len(self.balls)} balles  ·  {100 * self.broken // self.total} %", 24, pal(0.2))
        if self.done_at is not None:
            _text(d, (W / 2, H * 0.45), "MUR DÉTRUIT !", 50, _hsv(t * 0.5))

    def finished(self, t):
        return self.done_at is not None and t - self.done_at > 2.5


# ------------------------------------------------------------------ 4. gelées en cascade

class Jellies:
    """Gelées qui dévalent un escalier imprévisible : marches de tailles différentes, parcours propre à chaque
    gelée (elle saute parfois 2 marches), couleur qui change à chaque atterrissage, éclaboussure et marche qui s'allume."""

    def __init__(self, rnd: random.Random, audio: Audio):
        self.rnd, self.audio = rnd, audio
        self.hop = V.get("hop", 0.62)
        self.n = V.get("jn", 5)
        self.TW, self.DY = V.get("tw", 108), V.get("dy", 74)
        self.shape = V.get("jshape", "rond")
        self.base = [k / self.n + rnd.random() * 0.1 for k in range(self.n)]
        self.faces = [rnd.choice(["happy", "calm", "wow"]) for _ in range(self.n)]
        self.height = [rnd.uniform(42, 82) for _ in range(self.n)]
        self.landed = [-1] * self.n
        self.lands = [0] * self.n
        self._steps: list[tuple[float, float, float]] = []   # (début x, fin x, y)
        self._dir, self._run = 1, 0
        self._plans: list[list[int]] = [[0] for _ in range(self.n)]
        self.glow: dict[int, tuple[float, tuple]] = {}
        self.parts = Particles()
        self.cam = None

    def tread(self, k: int):
        while len(self._steps) <= k:
            i = len(self._steps)
            w = self.TW * self.rnd.uniform(0.75, 1.3)
            if i == 0:
                xs, y = W / 2 - w / 2, 0.0
                self._run = self.rnd.randint(2, 4)
            else:
                pxs, pxe, py = self._steps[-1]
                xs = pxe
                y = py + self.DY * self.rnd.uniform(0.7, 1.4)
                self._run -= 1
                nxt = xs + self._dir * w
                if self._run <= 0 or nxt < 30 or nxt > W - 30:     # demi-tour : nouvelle longueur de volée
                    self._dir = -self._dir
                    self._run = self.rnd.randint(2, 4)
            self._steps.append((xs, xs + self._dir * w, y))
        return self._steps[k]

    def plan(self, j: int, i: int) -> int:
        """Marche où la gelée j atterrit à son i-ème saut (elle saute parfois 2 marches d'un coup)."""
        p = self._plans[j]
        while len(p) <= i:
            p.append(p[-1] + (2 if self.rnd.random() < 0.22 else 1))
        return p[i]

    def color(self, j: int, lands: int | None = None) -> tuple:
        n = self.lands[j] if lands is None else lands
        return pal(self.base[j] + n * 0.137)

    def jelly_state(self, j: int, t: float):
        p = t / self.hop - j * 1.25
        if p < 0:
            return None
        i, f = int(p), p - int(p)
        ka, kb = self.plan(j, i), self.plan(j, i + 1)
        rest = 0.35                                   # posée sur la marche un instant, puis saute
        if f < rest:
            a = self.tread(ka)
            sq = 0.72 + 0.28 * (f / rest) if f < rest * 0.6 else 1 - 0.12 * ((f - rest * 0.6) / (rest * 0.4))
            return (a[0] + a[1]) / 2, a[2], sq, ka, i
        f = (f - rest) / (1 - rest)
        a, b = self.tread(ka), self.tread(kb)
        x0, x1 = (a[0] + a[1]) / 2, (b[0] + b[1]) / 2
        y0, y1 = a[2], b[2]
        x = x0 + (x1 - x0) * f
        hh = self.height[j] * (1.4 if kb - ka > 1 else 1)
        y = y0 + (y1 - y0) * f * f - math.sin(math.pi * f) * hh       # saut en cloche
        squash = 1 + 0.14 * math.sin(math.pi * f)                      # s'étire en l'air
        return x, y, squash, ka, i

    def step(self, t, dt):
        for j in range(self.n):
            s = self.jelly_state(j, t)
            if s and s[4] != self.landed[j]:
                self.landed[j] = s[4]
                if s[4] > 0:
                    self.lands[j] += 1
                    col = self.color(j)
                    a = self.tread(s[3])
                    self.glow[s[3]] = (t, col)
                    for _ in range(10):   # éclaboussure de la nouvelle couleur
                        self.parts.burst((a[0] + a[1]) / 2 + self.rnd.uniform(-20, 20), a[2], col, n=1, speed=170, size=2.6)
                self.audio.note(t, NOTES[(s[3] + j * 2) % 15 + 2], 0.3, 0.4, key=f"j{j}", gap=0.02)
        self.parts.step(dt, g=900)

    def draw(self, img, t):
        d = SDraw(img)
        states = [s for s in (self.jelly_state(j, t) for j in range(self.n)) if s]
        target = (sum(s[1] for s in states) / len(states) if states else 0) - H * 0.45
        self.cam = target if self.cam is None else self.cam + (target - self.cam) * 0.08
        cam = self.cam
        k0 = 0
        while self.tread(k0 + 1)[2] < cam - 60:
            k0 += 1
        k = k0
        while self.tread(k)[2] < cam + H + 80:
            xs, xe, y = self.tread(k)
            _, _, ny = self.tread(k + 1)
            col, wdt = (245, 245, 255), 4
            g = self.glow.get(k)
            if g and t - g[0] < 0.6:                     # la marche s'allume de la couleur de la gelée
                f = 1 - (t - g[0]) / 0.6
                col = tuple(int(245 + (c - 245) * f) for c in g[1])
                wdt = 4 + 4 * f
            d.line([xs, y - cam, xe, y - cam], fill=col, width=wdt)
            d.line([xe, y - cam, xe, ny - cam], fill=(245, 245, 255), width=4)
            k += 1
        # particules (coordonnées monde → écran)
        for q in self.parts.p:
            x, y, life, c, sz = q[0], q[1] - cam, q[4], q[5], q[6]
            r = sz * (0.4 + life * 0.6)
            d.ellipse([x - r, y - r, x + r, y + r], fill=c)
        for j in range(self.n):
            s = self.jelly_state(j, t)
            if not s:
                continue
            x, y, sq, _, _ = s
            y -= cam
            fill = self.color(j)
            w, h = 30 / sq ** 0.5, 30 * sq
            if self.shape == "carre":
                d.rounded_rectangle([x - w, y - 2 * h, x + w, y], 12, fill=fill)
            elif self.shape == "goutte":
                d.d.polygon([(x * K, (y - 2.6 * h) * K), ((x + w * 0.7) * K, (y - 1.4 * h) * K), ((x - w * 0.7) * K, (y - 1.4 * h) * K)], fill=fill)
                d.ellipse([x - w, y - 2 * h, x + w, y], fill=fill)
            else:
                d.ellipse([x - w, y - 2 * h, x + w, y], fill=fill, outline=(70, 45, 45), width=3)
            ey = y - h * 1.15
            ink = (45, 30, 30)
            if self.faces[j] == "calm":
                for ex in (-10, 10):
                    d.line([x + ex - 5, ey, x + ex + 5, ey], fill=ink, width=3)
            else:
                for ex in (-10, 10):
                    d.ellipse([x + ex - 4, ey - 5, x + ex + 4, ey + 5], fill=ink)
            if self.faces[j] == "wow" or sq > 1.1:             # bouche « oh » en plein saut
                d.ellipse([x - 4, ey + 8, x + 4, ey + 16], fill=ink)
            else:
                d.arc([x - 7, ey + 3, x + 7, ey + 13], 20, 160, fill=ink, width=3)
            d.ellipse([x - w * 0.6, y - 1.75 * h, x - w * 0.3, y - 1.5 * h], fill=(255, 255, 255))

    def finished(self, t):
        return False


# ------------------------------------------------------------------ variantes : jamais deux fois la même vidéo

HOOKS_ALL = {
    "anneaux": ["Elle va s'échapper ?", "Regarde jusqu'à la fin", "Combien d'anneaux elle casse ?", "Pari : elle sort ?",
                "Le dernier anneau est le pire", "Tu tiens jusqu'à la fin ?", "Ça devient fou à la fin"],
    "plinko": ["Quelle couleur gagne ?", "Choisis ta couleur", "Commente ta couleur", "Ta couleur gagne ?",
               "Personne ne devine le gagnant", "Pari avant la fin", "Qui remplit le jackpot ?"],
    "mur": ["Ça casse tout", "Regarde le mur disparaître", "Combien de balles à la fin ?", "Ça devient incontrôlable",
            "Attends les dernières secondes", "Le mur ne tiendra pas", "Satisfaisant jusqu'au bout"],
    "gelees": ["Impossible d'arrêter de regarder", "Tellement satisfaisant", "Choisis ta gelée", "Laquelle est la tienne ?",
               "Mets le son", "Regarde-les jusqu'en bas", "Ça détend direct"],
}
BG_STYLES = ["uni", "etoiles", "grille", "halo"]
HISTORY = None   # fichier d'historique (défini par l'appelant)


# Rythme de la vidéo : vitesse de la simulation au fil du temps (1 = normal).
# Rapide au début (on accroche), ralenti au milieu (suspense), ré-accélération vers le résultat.
TEMPOS = {
    "vague": [(0, 1.45), (0.2, 1.25), (0.42, 0.6), (0.6, 0.62), (0.82, 1.5), (1, 1.25)],
    "double": [(0, 1.5), (0.18, 0.7), (0.36, 1.35), (0.56, 0.55), (0.8, 1.55), (1, 1.2)],
    "suspense": [(0, 1.6), (0.15, 1.3), (0.5, 0.5), (0.68, 0.55), (0.88, 1.6), (1, 1.35)],
    "montee": [(0, 1.35), (0.3, 0.75), (0.5, 0.6), (0.7, 1.0), (0.9, 1.6), (1, 1.4)],
    "constant": [(0, 1.0), (1, 1.0)],
}
STEADY = {"maths", "billes", "fusion"}       # concepts à vitesse constante : pas de ralenti (ni suspense, ni sur le résultat)


class Tempo:
    def __init__(self, keys: list, seconds: float):
        self.k, self.sec = keys, seconds
        self.norm = 1 / float(np.mean([self._raw(u) for u in np.linspace(0, 1, 801)]))   # durée totale inchangée

    def _raw(self, u: float) -> float:
        u = min(max(u, 0.0), 1.0)
        for (u0, s0), (u1, s1) in zip(self.k, self.k[1:]):
            if u <= u1:
                f = (u - u0) / (u1 - u0)
                return s0 + (s1 - s0) * f * f * (3 - 2 * f)
        return self.k[-1][1]

    def speed(self, tv: float) -> float:
        return self._raw(tv / self.sec) * self.norm

    def riser_window(self) -> tuple[float, float]:
        """Du creux le plus lent (2e moitié) jusqu'au pic de vitesse suivant, en secondes vidéo."""
        us = np.linspace(0.35, 1, 300)
        sp = np.array([self._raw(u) for u in us])
        i = int(np.argmin(sp))
        j = i + int(np.argmax(sp[i:]))
        return float(us[i] * self.sec), float(us[j] * self.sec)


_VIG: dict = {}


def _vignette(level: int) -> Image.Image:
    """Assombrit les bords (8 niveaux précalculés) : l'œil est attiré au centre pendant le suspense."""
    if level not in _VIG:
        w, h = W * K // SS, H * K // SS
        yy, xx = np.mgrid[0:h, 0:w]
        d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 * 0.8 + ((yy - h / 2) / (h / 2)) ** 2)
        m = 1 - np.clip(d - 0.55, 0, 1) ** 1.6 * (0.09 * level)
        _VIG[level] = Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8)).convert("RGB")
    return _VIG[level]


def make_variant(concept: str, rnd: random.Random) -> dict:
    v = {"concept": concept, "palette": rnd.choice(list(PALETTES)), "hue": round(rnd.random(), 2),
         "bg": rnd.randrange(len(BACKGROUNDS)), "bg_style": rnd.choice(BG_STYLES),
         "scale": rnd.choice(list(SCALES)), "root": rnd.choice([220.0, 246.94, 261.63, 293.66, 329.63]),
         "hook": rnd.choice(HOOKS_ALL[concept]),
         "tempo": "constant" if concept in STEADY else rnd.choice([k for k in TEMPOS if k != "constant"]),
         "kit": rnd.choice(KITS), "popkit": rnd.choice(POPKITS), "bed": rnd.choice(BEDS)}
    if concept == "anneaux":
        v |= {"rings": rnd.randint(9, 18), "gap": round(rnd.uniform(0.7, 1.15), 2), "spin": round(rnd.uniform(0.6, 1.8), 2),
              "ball": rnd.choice([6, 8, 10, 12]), "thick": rnd.choice([3, 5, 7]), "grav": rnd.choice([450, 650, 850]),
              "mode": rnd.choice(["alterne", "meme_sens"])}
    elif concept == "plinko":
        n = rnd.choice([2, 3, 4, 4])
        v |= {"pcolors": rnd.sample(NAMED, n), "rows": rnd.randint(10, 15), "bins": rnd.choice([5, 7, 9]),
              "balls": rnd.choice([100, 140, 180]), "peg": rnd.choice(["round", "diamond"])}
    elif concept == "mur":
        v |= {"cell": rnd.choice([10, 12, 15, 18]), "start": rnd.randint(1, 4), "split": rnd.choice([5, 7, 10, 14]),
              "speed": rnd.choice([550, 700, 850]), "pattern": rnd.choice(["bandes", "verticales", "diagonale", "cercles", "damier"])}
    elif concept not in ("anneaux", "plinko", "mur", "gelees"):
        from . import satisfying_more
        v |= satisfying_more.variant(concept, rnd)
    elif concept == "gelees":
        v |= {"jn": rnd.randint(3, 7), "jshape": rnd.choice(["rond", "carre", "goutte"]), "hop": rnd.choice([0.5, 0.62, 0.75]),
              "tw": rnd.choice([96, 108, 130]), "dy": rnd.choice([60, 74, 90])}
    return v


def _signature(v: dict) -> dict:
    return {k: (str(x) if not isinstance(x, (int, float)) else x) for k, x in v.items() if k not in ("hue", "logo_img")}


def _distance(a: dict, b: dict) -> float:
    """0 = identiques, 1 = complètement différentes."""
    keys = set(a) | set(b)
    diff = 0.0
    for k in keys:
        x, y = a.get(k), b.get(k)
        if isinstance(x, (int, float)) and isinstance(y, (int, float)):
            diff += min(1.0, abs(x - y) / (abs(x) + abs(y) + 1e-9) * 2)
        else:
            diff += 0.0 if x == y else 1.0
    return diff / max(len(keys), 1)


def _load_history() -> list[dict]:
    import json
    try:
        return json.loads(HISTORY.read_text(encoding="utf-8")) if HISTORY and HISTORY.exists() else []
    except (OSError, ValueError):
        return []


def _save_history(hist: list[dict]) -> None:
    import json
    if HISTORY:
        HISTORY.parent.mkdir(parents=True, exist_ok=True)
        HISTORY.write_text(json.dumps(hist[-500:], ensure_ascii=False), encoding="utf-8")


def pick_concept(rnd: random.Random) -> str:
    """« Au hasard » intelligent : le concept le moins utilisé récemment."""
    recent = [h.get("concept") for h in _load_history()[-12:]]
    return min(CONCEPTS, key=lambda c: (recent.count(c), rnd.random()))


def choose_variant(concept: str, rnd: random.Random, tries: int = 40) -> dict:
    """Tire beaucoup de variantes et garde celle qui ressemble le MOINS aux vidéos déjà faites."""
    hist = [h for h in _load_history() if h.get("concept") == concept]
    best, best_d = None, -1.0
    for _ in range(tries):
        v = make_variant(concept, rnd)
        sig = _signature(v)
        d = min((_distance(sig, h) for h in hist), default=1.0)
        if d > best_d:
            best, best_d = v, d
    best["novelty"] = round(best_d, 2)
    return best


# ------------------------------------------------------------------ rendu

SCENES: dict[str, Callable] = {"anneaux": Rings, "plinko": Plinko, "mur": Wall, "gelees": Jellies}


def _register_more():
    """Ajoute les 5 concepts de satisfying_more (bocal, pendules, grossit, dominos, tri)."""
    from . import satisfying_more as m
    SCENES.update(m.SCENES)
    CONCEPTS.update(m.CONCEPTS)
    HOOKS_ALL.update(m.HOOKS)
    CAPTIONS.update(m.CAPTIONS)
BACKGROUNDS = [((18, 16, 48), (52, 18, 70)), ((10, 24, 40), (14, 60, 80)), ((25, 12, 30), (70, 20, 50)),
               ((8, 8, 14), (30, 30, 46)), ((12, 30, 22), (20, 70, 50)), ((40, 18, 10), (90, 40, 20)),
               ((14, 14, 40), (10, 70, 110)), ((30, 10, 50), (10, 40, 90))]


LOGO_HOOKS = ["{name} va tomber", "Combien de balles pour casser {name} ?", "Fan de {name} ? Reste jusqu'à la fin",
              "{name} contre 90 balles", "{name} ou les balles : qui gagne ?", "Regarde {name} disparaître"]


MIN_SECONDS = {"pendules": 45, "grossit": 45, "dominos": 45, "maths": 35, "billes": 30, "fusion": 30}   # ces concepts ont besoin de temps pour être satisfaisants


def render(concept: str, out: Path, seconds: float = 40, seed: int | None = None,
           progress: Callable[[int, str], None] | None = None, logo: str = "", teams: str = "auto",
           countries: list | None = None) -> dict:
    """Calcule la vidéo et l'écrit en MP4 1080x1920 60 i/s. Renvoie {path, duration, caption, hook}."""
    seed = seed if seed is not None else random.randrange(1_000_000)
    rnd = random.Random(seed)
    random.seed(seed)
    np.random.seed(seed % (2 ** 32))
    global NOTES
    if concept == "aleatoire":
        concept = pick_concept(rnd)
    variant = choose_variant(concept, rnd)
    seconds = max(seconds, MIN_SECONDS.get(concept, 0))
    logo_name = None
    if concept == "mur" and logo:
        from . import logos
        key = logos.pick_auto(_load_history(), rnd) if logo == "auto" else logo
        got = logos.load(key)
        if got:
            logo_name, logo_img = got
            variant["logo"] = key
            variant["hook"] = rnd.choice(LOGO_HOOKS).format(name=logo_name)
    if concept == "fusion":
        from .satisfying_more import FTHEMES
        _, h1, h2 = FTHEMES[variant.get("ftheme", "planetes")]
        variant["hook"] = rnd.choice([f"{h1}, {h2.lower()}", f"{h2} !", h1])
    if concept == "billes":                                       # course de billes : pays ou couleurs (choix de l'utilisateur)
        from .satisfying_more import pick_countries
        if teams == "couleurs":
            variant.pop("bflags", None)
        elif teams == "pays" or any(countries or []):
            variant["bflags"] = pick_countries(rnd, countries)
    if concept == "billes" and variant.get("bflags"):            # course de pays : l'accroche les nomme
        from .logos import FLAGS
        a, b, c = (FLAGS[k][0].upper() for k in variant["bflags"])
        variant["hook"] = rnd.choice([f"{a} vs {b} vs {c}", f"Qui gagne : {a}, {b} ou {c} ?",
                                      f"{a}, {b} ou {c} : choisis ton pays"])
    V.clear()
    V.update(variant)
    V["seconds"] = seconds
    if logo_name:
        V["logo_img"] = logo_img
    NOTES = _notes(variant["scale"], variant["root"])
    audio = Audio(seconds + 6)
    sim = SCENES[concept](rnd, audio)
    hook = variant["hook"]
    bg = _bg(*BACKGROUNDS[variant["bg"]], style=variant["bg_style"], seed=seed)
    out.parent.mkdir(parents=True, exist_ok=True)
    wav = out.with_suffix(".wav")
    tmp = out.with_suffix(".video.mp4")
    ff = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W * K // SS}x{H * K // SS}",
                           "-r", str(FPS), "-i", "-", "-c:v", "libx264",
                           "-preset", "medium", "-crf", "12", "-maxrate", "40M", "-bufsize", "80M",
                           "-x264-params", "deblock=-1,-1:aq-mode=3:psy-rd=1.0,0.15", "-pix_fmt", "yuv420p", str(tmp)],
                          stdin=subprocess.PIPE)
    dt = 1 / FPS
    frames = int(seconds * FPS)
    tempo = Tempo(TEMPOS[variant.get("tempo", "vague")], seconds)
    if concept not in STEADY:
        r0, r1 = tempo.riser_window()
        audio.riser(r0, r1)
    bed = variant.get("bed", "aucun")
    if "nappe" in bed:
        audio.pad(seconds + 4, NOTES[0])
    beat = 0.0
    hook_layer = Image.new("RGBA", (W * K, 150 * K), (0, 0, 0, 0))     # accroche fixe, dessinée une seule fois
    _text(SDraw(hook_layer), (W / 2, 72), hook, 32)
    hook_layer = hook_layer.reduce(SS)
    from PIL import ImageChops
    white = Image.new("RGB", (W * K // SS, H * K // SS), (255, 255, 255))
    t = 0.0            # temps de la simulation
    tv = 0.0           # temps de la vidéo
    n = 0
    zoom, climax = 1.0, None
    try:
        while n < frames + 4 * FPS:
            sp = tempo.speed(tv)
            done = getattr(sim, "done_at", None)
            if climax is None and done is not None and t >= done:
                climax = tv
                audio.impact(tv)
            if climax is not None and concept not in STEADY:    # ralenti sur le résultat, puis retour à la normale
                sp = sp * (0.35 + 0.65 * min(1.0, (tv - climax) / 1.6))
            audio.sync(tv, t, sp)
            if "pulse" in bed and climax is None:          # battement : plus le rythme s'emballe, plus il tape vite
                beat += dt * sp * 2.0
                if beat >= 1:
                    beat -= 1
                    audio.thump(tv)
            for _ in range(SUB):
                sim.step(t, dt * sp / SUB)
                t += dt * sp / SUB
            img = bg.copy()
            sim.draw(img, t)
            # tension : léger zoom et bords assombris quand ça ralentit, « coup » de zoom au résultat
            tension = min(1.0, max(0.0, (1.0 - tempo.speed(tv)) / 0.45))
            target = 1.05 if tension > 0.5 else 1.0     # 2 paliers : le zoom ne bouge que pendant de courtes transitions
            kick = 0.0
            if climax is not None:
                k = tv - climax
                kick = 0.07 * math.exp(-k * 3.5) * min(1.0, k * 12)
                target = 1.0
            zoom += (target - zoom) * 0.05
            if abs(target - zoom) < 0.0008:
                zoom = target
            z = zoom + kick
            bw, bh = img.size
            fw, fh = bw // SS, bh // SS
            if z > 1.002:            # zoom pris dans l'image haute définition (pas d'agrandissement = pas de flou)
                sx = sy = 0.0
                if climax is not None and tv - climax < 0.45:      # petite secousse
                    a = (0.45 - (tv - climax)) * 18 * SS
                    sx, sy = math.sin(tv * 90) * a, math.cos(tv * 77) * a
                cw, ch = bw / z, bh / z
                x0 = min(max(0.0, (bw - cw) / 2 + sx), bw - cw)
                y0 = min(max(0.0, (bh - ch) / 2 + sy), bh - ch)
                frame = img.resize((fw, fh), Image.BICUBIC, box=(x0, y0, x0 + cw, y0 + ch))
            else:
                frame = img.reduce(SS)
            lvl = (3 if tension > 0.5 else 0) if climax is None else 0
            if lvl:
                frame = ImageChops.multiply(frame, _vignette(lvl))
            if climax is not None and 0 <= tv - climax < 0.25:    # flash
                frame = Image.blend(frame, white, 0.32 * (1 - (tv - climax) / 0.25))
            frame.paste(hook_layer, (0, 0), hook_layer)
            ff.stdin.write(frame.tobytes())
            n += 1
            tv += dt
            if progress and n % FPS == 0:
                progress(min(95, int(n / frames * 95)), f"Image {n}/{frames}")
            if n >= frames and (sim.finished(t) or n >= frames + 4 * FPS or concept == "gelees"):
                break
            if sim.finished(t) and n > 8 * FPS:
                break
    finally:
        ff.stdin.close()
        ff.wait()
    duration = n / FPS
    audio.save(wav, duration)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(tmp), "-i", str(wav), "-c:v", "copy", "-c:a", "aac",
                    "-b:a", "160k", "-shortest", str(out)], check=True)
    tmp.unlink(missing_ok=True)
    wav.unlink(missing_ok=True)
    caption = f"{CAPTIONS[concept]}\n\n{' '.join(TAGS)}"
    if logo_name:
        tag = "#" + re.sub(r"[^A-Za-z0-9]", "", logo_name.title())
        caption = (f"{logo_name} contre les balles 💥 Combien il en faut pour tout casser ? Dis-le en commentaire 👇"
                   f"\n\n{tag} {' '.join(TAGS)}")
    if concept == "billes" and variant.get("bflags"):
        from .logos import FLAGS
        names = [FLAGS[k][0] for k in variant["bflags"]]
        tags = " ".join("#" + re.sub(r"[^A-Za-z0-9]", "", n) for n in names)
        caption = (f"{' vs '.join(names)} 🏁 Quel pays gagne la course ? Dis-le en commentaire 👇\n\n{tags} {' '.join(TAGS)}")
    hist = _load_history()
    hist.append(_signature(variant))
    _save_history(hist)
    return {"path": out, "duration": round(duration, 1), "caption": caption, "hook": hook, "seed": seed,
            "concept": concept, "variant": variant}


_register_more()
