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
import random
import subprocess
import wave
from pathlib import Path
from typing import Callable

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from .paths import FONTS_DIR

W, H = 540, 960          # coordonnées de la simulation
K = 2                    # dessin en pleine résolution 1080x1920 (net, pas d'agrandissement flou)
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

PENTA = [0, 2, 4, 7, 9]
NOTES = [261.63 * 2 ** ((o * 12 + s) / 12) for o in range(4) for s in PENTA]   # 20 notes, do pentatonique


class Audio:
    def __init__(self, seconds: float):
        self.buf = np.zeros(int((seconds + 2) * SR), dtype=np.float32)
        self.last: dict[str, float] = {}

    def note(self, t: float, freq: float, vol: float = 0.35, dur: float = 0.35, key: str = "n", gap: float = 0.035):
        if t - self.last.get(key, -1) < gap:      # pas de mitraillage : une note par canal toutes les 35 ms
            return
        self.last[key] = t
        n = int(dur * SR)
        x = np.arange(n) / SR
        env = np.exp(-x * 9) * np.minimum(1, x / 0.004)
        w = (np.sin(2 * np.pi * freq * x) + 0.35 * np.sin(4 * np.pi * freq * x) * np.exp(-x * 14)
             + 0.12 * np.sin(6 * np.pi * freq * x) * np.exp(-x * 20)) * env * vol
        self._add(t, w)

    def pop(self, t: float, vol: float = 0.4, key: str = "p"):
        if t - self.last.get(key, -1) < 0.03:
            return
        self.last[key] = t
        n = int(0.12 * SR)
        x = np.arange(n) / SR
        noise = np.convolve(np.random.uniform(-1, 1, n), np.ones(6) / 6, mode="same")
        self._add(t, noise * np.exp(-x * 35) * vol + np.sin(2 * np.pi * 140 * x) * np.exp(-x * 30) * vol * 0.6)

    def _add(self, t: float, w: np.ndarray):
        i = int(t * SR)
        if i >= len(self.buf):
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


def _bg(top: tuple, bottom: tuple) -> Image.Image:
    g = np.linspace(0, 1, H * K)[:, None, None]
    arr = (np.array(top) * (1 - g) + np.array(bottom) * g).astype(np.uint8)
    return Image.fromarray(np.repeat(arr, W * K, axis=1), "RGB")


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

    def rounded_rectangle(self, xy, radius, fill=None):
        self.d.rounded_rectangle(self._xy(xy), radius * K, fill=fill)

    def line(self, xy, fill=None, width=1):
        self.d.line(self._xy(xy), fill=fill, width=int(width * K), joint="curve")

    def arc(self, xy, start, end, fill=None, width=1):
        self.d.arc(self._xy(xy), start, end, fill=fill, width=int(width * K))

    def text(self, xy, txt, font, fill, anchor, stroke_width, stroke_fill):
        self.d.text((xy[0] * K, xy[1] * K), txt, font=font, fill=fill, anchor=anchor, stroke_width=stroke_width * K,
                    stroke_fill=stroke_fill)


def _text(d: "SDraw", xy, txt: str, size: int, fill=(255, 255, 255), anchor="mm"):
    d.text(xy, txt, font=_font(size * K), fill=fill, anchor=anchor, stroke_width=max(2, size // 9), stroke_fill=(0, 0, 0))


def _hsv(h: float, s: float = 0.8, v: float = 1.0) -> tuple:
    r, g, b = colorsys.hsv_to_rgb(h % 1, s, v)
    return int(r * 255), int(g * 255), int(b * 255)


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
        n = 14
        self.rings = [{"r": 52 + i * 15, "a": rnd.uniform(0, 6.28), "w": (1 if i % 2 else -1) * (1.2 + i * 0.06),
                       "gap": 0.95 - i * 0.012, "col": _hsv(i / n + rnd.random() * 0.1), "alive": True}
                      for i in range(n)]
        self.bx, self.by = self.cx + rnd.uniform(-8, 8), self.cy - 10
        a = rnd.uniform(0, 6.28)
        self.vx, self.vy = math.cos(a) * 320, math.sin(a) * 320
        self.br = 8
        self.hue = rnd.random()
        self.parts = Particles()
        self.note_i = 0
        self.done_at = None
        self.trail: list[tuple] = []

    @property
    def broken(self):
        return sum(not r["alive"] for r in self.rings)

    def step(self, t, dt):
        for r in self.rings:
            r["a"] += r["w"] * dt
        self.vy += 650 * dt
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
                    for k in range(70):
                        a = k / 70 * 2 * math.pi
                        self.parts.burst(self.cx + math.cos(a) * inner["r"], self.cy + math.sin(a) * inner["r"],
                                         inner["col"], n=1, speed=220, size=2.6)
                    self.audio.pop(t, 0.5)
                    self.audio.note(t, NOTES[min(19, 8 + self.broken)], 0.45, 0.6, key="b")
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
                        self.note_i += 1
                    k = (inner["r"] - 3 - self.br) / dist
                    self.bx, self.by = self.cx + dx * k, self.cy + dy * k
        else:   # tout est cassé : la bille rebondit sur les bords
            if self.bx < self.br or self.bx > W - self.br:
                self.vx = -self.vx
            if self.by > H - self.br:
                self.vy = -abs(self.vy) * 0.9
        self.parts.step(dt)

    def draw(self, img, t):
        d = SDraw(img)
        for r in self.rings:
            if not r["alive"]:
                continue
            a0 = math.degrees(r["a"] + r["gap"])
            a1 = math.degrees(r["a"] + 2 * math.pi)
            box = [self.cx - r["r"], self.cy - r["r"], self.cx + r["r"], self.cy + r["r"]]
            d.arc(box, a0, a1, fill=r["col"], width=5)
        self.trail = (self.trail + [(self.bx, self.by)])[-14:]
        for i, (x, y) in enumerate(self.trail):
            rr = self.br * (i + 1) / len(self.trail) * 0.8
            d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=_hsv(self.hue, 0.5, 0.6))
        d.ellipse([self.bx - self.br, self.by - self.br, self.bx + self.br, self.by + self.br],
                  fill=_hsv(self.hue, 0.6, 1), outline=(255, 255, 255), width=2)
        self.parts.draw(d)
        _text(d, (W / 2, 210), f"{self.broken} / {len(self.rings)}", 30, (255, 230, 120))
        if self.done_at is not None:
            _text(d, (W / 2, H * 0.55), "LIBRE !", 64, _hsv(t * 0.5))

    def finished(self, t):
        return self.done_at is not None and t - self.done_at > 2.5


# ------------------------------------------------------------------ 2. plinko

class Plinko:
    COLORS = [((255, 80, 90), "ROUGE"), ((70, 150, 255), "BLEU"), ((90, 220, 120), "VERT"), ((255, 205, 60), "JAUNE")]

    def __init__(self, rnd: random.Random, audio: Audio, total: int = 140):
        self.rnd, self.audio = rnd, audio
        self.pegs = []
        for row in range(13):
            y = 300 + row * 34
            off = 0 if row % 2 == 0 else 17
            for k in range(-8, 9):
                x = W / 2 + k * 34 + off
                if 30 < x < W - 30:
                    self.pegs.append((x, y, row))
        self.bins_y = 300 + 13 * 34 + 20
        self.nbins = 7
        self.bin_w = (W - 40) / self.nbins
        self.balls: list[dict] = []
        self.total = total
        self.spawned = 0
        self.next_spawn = 0.4
        self.score = [0, 0, 0, 0]
        self.br = 7
        self.done_at = None
        self.flash: dict[int, float] = {}

    def step(self, t, dt):
        if self.spawned < self.total and t >= self.next_spawn:
            c = self.spawned % 4
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
            d.ellipse([px - r, py - r, px + r, py + r], fill=(255, 255, 255) if lit else (160, 170, 210))
        for b in self.balls:
            c = self.COLORS[b["c"]][0]
            d.ellipse([b["x"] - self.br, b["y"] - self.br, b["x"] + self.br, b["y"] + self.br], fill=c)
        for k, ((c, name), s) in enumerate(zip(self.COLORS, self.score)):
            x = 70 + k * 133
            d.rounded_rectangle([x - 55, 150, x + 55, 196], 12, fill=c)
            _text(d, (x, 173), str(s), 26)
        if self.done_at is not None:
            win = max(range(4), key=lambda k: self.score[k])
            _text(d, (W / 2, 250), f"{self.COLORS[win][1]} GAGNE !", 42, self.COLORS[win][0])

    def finished(self, t):
        return self.done_at is not None and t - self.done_at > 3


# ------------------------------------------------------------------ 3. mur arc-en-ciel

class Wall:
    def __init__(self, rnd: random.Random, audio: Audio):
        self.rnd, self.audio = rnd, audio
        self.cs = 15
        self.cols = W // self.cs
        self.y0, self.rows = 160, 42
        self.hue0 = rnd.random()
        self.grid = np.ones((self.rows, self.cols), dtype=bool)
        self.total = int(self.grid.sum())
        self.broken = 0
        self.balls = [self._ball(W / 2 + k * 40 - 40, H - 100, -math.pi / 2 + rnd.uniform(-0.6, 0.6)) for k in range(3)]
        self.parts = Particles()
        self.br = 6
        self.done_at = None

    def _ball(self, x, y, a, speed=700):
        return {"x": x, "y": y, "vx": math.cos(a) * speed, "vy": math.sin(a) * speed, "h": self.rnd.random()}

    def color(self, r, c):
        return _hsv(self.hue0 + r / self.rows * 0.8 + c / self.cols * 0.08, 0.75, 0.95)

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
                if self.broken % 7 == 0 and len(self.balls) + len(new) < 90:   # la balle se divise
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
        _text(d, (W / 2, 130), f"{len(self.balls)} balles  ·  {100 * self.broken // self.total} %", 24, (255, 240, 150))
        if self.done_at is not None:
            _text(d, (W / 2, H * 0.45), "MUR DÉTRUIT !", 50, _hsv(t * 0.5))

    def finished(self, t):
        return self.done_at is not None and t - self.done_at > 2.5


# ------------------------------------------------------------------ 4. gelées en cascade

class Jellies:
    TW, DY, RUN = 108, 74, 4          # largeur d'une marche, hauteur, marches par direction

    def __init__(self, rnd: random.Random, audio: Audio):
        self.rnd, self.audio = rnd, audio
        self.hop = 0.62
        self.n = 5
        self.cols = [_hsv(rnd.random() + k * 0.19, 0.5, 1) for k in range(self.n)]
        self.faces = [rnd.choice(["happy", "calm", "wow"]) for _ in range(self.n)]
        self.landed = [-1] * self.n
        self._steps: list[tuple[float, float, float]] = []   # (début x, fin x, y)
        self.cam = None

    def tread(self, k: int):
        while len(self._steps) <= k:
            i = len(self._steps)
            if i == 0:
                xs, d = (W - self.RUN * self.TW) / 2, 1
            else:
                pxs, pxe, _ = self._steps[-1]
                xs = pxe
                d = (1 if pxe > pxs else -1) * (-1 if i % self.RUN == 0 else 1)
            self._steps.append((xs, xs + d * self.TW, i * self.DY))
        return self._steps[k]

    def jelly_state(self, j: int, t: float):
        p = t / self.hop - j * 1.25
        if p < 0:
            return None
        k, f = int(p), p - int(p)
        rest = 0.35                                   # posée sur la marche un instant, puis saute
        if f < rest:
            a = self.tread(k)
            sq = 0.72 + 0.28 * (f / rest) if f < rest * 0.6 else 1 - 0.12 * ((f - rest * 0.6) / (rest * 0.4))
            return (a[0] + a[1]) / 2, a[2], sq, k
        f = (f - rest) / (1 - rest)
        a, b = self.tread(k), self.tread(k + 1)
        x0, x1 = (a[0] + a[1]) / 2, (b[0] + b[1]) / 2
        y0, y1 = a[2], b[2]
        x = x0 + (x1 - x0) * f
        y = y0 + (y1 - y0) * f * f - math.sin(math.pi * f) * 55          # saut en cloche
        squash = 1 + 0.14 * math.sin(math.pi * f)                         # s'étire en l'air
        return x, y, squash, k

    def step(self, t, dt):
        for j in range(self.n):
            s = self.jelly_state(j, t)
            if s and s[3] != self.landed[j]:
                self.landed[j] = s[3]
                self.audio.note(t, NOTES[(s[3] + j * 2) % 15 + 2], 0.3, 0.4, key=f"j{j}", gap=0.02)

    def draw(self, img, t):
        d = SDraw(img)
        states = [s for s in (self.jelly_state(j, t) for j in range(self.n)) if s]
        target = (sum(s[1] for s in states) / len(states) if states else 0) - H * 0.45
        self.cam = target if self.cam is None else self.cam + (target - self.cam) * 0.08
        cam = self.cam
        k0 = max(0, int(cam // self.DY) - 3)
        for k in range(k0, k0 + 18):
            xs, xe, y = self.tread(k)
            _, _, ny = self.tread(k + 1)
            d.line([xs, y - cam, xe, y - cam], fill=(245, 245, 255), width=4)
            d.line([xe, y - cam, xe, ny - cam], fill=(245, 245, 255), width=4)
        for j in range(self.n):
            s = self.jelly_state(j, t)
            if not s:
                continue
            x, y, sq, _ = s
            y -= cam
            w, h = 30 / sq ** 0.5, 30 * sq
            d.ellipse([x - w, y - 2 * h, x + w, y], fill=self.cols[j], outline=(70, 45, 45), width=3)
            ey = y - h * 1.15
            ink = (45, 30, 30)
            if self.faces[j] == "calm":
                for ex in (-10, 10):
                    d.line([x + ex - 5, ey, x + ex + 5, ey], fill=ink, width=3)
            else:
                for ex in (-10, 10):
                    d.ellipse([x + ex - 4, ey - 5, x + ex + 4, ey + 5], fill=ink)
            if self.faces[j] == "wow":
                d.ellipse([x - 4, ey + 8, x + 4, ey + 16], fill=ink)
            else:
                d.arc([x - 7, ey + 3, x + 7, ey + 13], 20, 160, fill=ink, width=3)
            d.ellipse([x - w * 0.6, y - 1.75 * h, x - w * 0.3, y - 1.5 * h], fill=(255, 255, 255))

    def finished(self, t):
        return False


# ------------------------------------------------------------------ rendu

SCENES: dict[str, Callable] = {"anneaux": Rings, "plinko": Plinko, "mur": Wall, "gelees": Jellies}
BACKGROUNDS = [((18, 16, 48), (52, 18, 70)), ((10, 24, 40), (14, 60, 80)), ((25, 12, 30), (70, 20, 50)),
               ((8, 8, 14), (30, 30, 46))]


def render(concept: str, out: Path, seconds: float = 40, seed: int | None = None,
           progress: Callable[[int, str], None] | None = None) -> dict:
    """Calcule la vidéo et l'écrit en MP4 1080x1920 60 i/s. Renvoie {path, duration, caption, hook}."""
    seed = seed if seed is not None else random.randrange(1_000_000)
    rnd = random.Random(seed)
    random.seed(seed)
    np.random.seed(seed % (2 ** 32))
    audio = Audio(seconds + 4)
    sim = SCENES[concept](rnd, audio)
    hook = rnd.choice(HOOKS[concept])
    bg = _bg(*BACKGROUNDS[rnd.randrange(len(BACKGROUNDS))])
    out.parent.mkdir(parents=True, exist_ok=True)
    wav = out.with_suffix(".wav")
    tmp = out.with_suffix(".video.mp4")
    ff = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W * K}x{H * K}",
                           "-r", str(FPS), "-i", "-", "-c:v", "libx264",
                           "-preset", "veryfast", "-crf", "16", "-tune", "animation", "-pix_fmt", "yuv420p", str(tmp)],
                          stdin=subprocess.PIPE)
    dt = 1 / FPS
    frames = int(seconds * FPS)
    t = 0.0
    n = 0
    try:
        while n < frames + 4 * FPS:
            for _ in range(SUB):
                sim.step(t, dt / SUB)
                t += dt / SUB
            img = bg.copy()
            sim.draw(img, t)
            if t < 4 or n % (FPS * 2) < FPS * 1.6:   # accroche en haut (toujours au début, puis en pointillés)
                _text(SDraw(img), (W / 2, 72), hook, 32)
            ff.stdin.write(img.tobytes())
            n += 1
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
    return {"path": out, "duration": round(duration, 1), "caption": caption, "hook": hook, "seed": seed}
