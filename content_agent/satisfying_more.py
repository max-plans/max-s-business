"""5 concepts satisfaisants supplémentaires (même moteur que satisfying.py : physique + sons générés).

- bocal    : des bonbons tombent et remplissent un bocal en verre jusqu'au bord.
- pendules : une vague de pendules qui dessine des motifs hypnotiques, puis se réaligne (boucle parfaite).
- grossit  : une bille rebondit dans un cercle et grossit à chaque rebond… jusqu'à ne plus rentrer.
- dominos  : une spirale de dominos colorés tombe en cascade.
- tri      : des barres de couleur se trient sous tes yeux, chaque comparaison joue une note.
"""
from __future__ import annotations

import math
import random

import numpy as np

from . import satisfying as S
from .satisfying import H, K, W, Audio, Particles, SDraw, V, _text, pal


def notes():
    return S.NOTES


# ------------------------------------------------------------------ 1. bocal de bonbons

class Jar:
    def __init__(self, rnd: random.Random, audio: Audio):
        self.rnd, self.audio = rnd, audio
        self.x0, self.x1, self.top, self.bot = 150, 390, 360, 860
        self.rmin, self.rmax = V.get("csize", (11, 17))
        ravg = (self.rmin + self.rmax) / 2
        # assez de bonbons pour remplir le bocal jusqu'au bord (compacité ~0,78 en 2D)
        self.n = int((self.x1 - self.x0) * (self.bot - self.top) * 0.80 / (math.pi * ravg * ravg))
        self.pos = np.zeros((0, 2))
        self.prev = np.zeros((0, 2))
        self.rad = np.zeros(0)
        self.col: list[tuple] = []
        self.landed: list[bool] = []
        self.spawned = 0
        self.next = 0.3
        self.done_at = None
        self.lid = 0.0

    def step(self, t, dt):
        if self.spawned < self.n and t >= self.next:
            r = self.rnd.uniform(self.rmin, self.rmax)
            x = self.rnd.uniform(self.x0 + r + 10, self.x1 - r - 10)
            p = np.array([[x, 170.0]])
            self.pos = np.vstack([self.pos, p])
            self.prev = np.vstack([self.prev, p - [self.rnd.uniform(-1, 1), -2]])
            self.rad = np.append(self.rad, r)
            self.col.append(pal(self.rnd.random()))
            self.landed.append(False)
            self.spawned += 1
            self.next = t + max(0.03, V.get("seconds", 30) * 0.7 / self.n)
        if not len(self.pos):
            return
        vel = (self.pos - self.prev) * 0.995
        self.prev = self.pos.copy()
        self.pos = self.pos + vel + np.array([0, 1500]) * dt * dt
        for _ in range(3):   # collisions (positions), vectorisées
            d = self.pos[:, None, :] - self.pos[None, :, :]
            dist = np.sqrt((d ** 2).sum(-1)) + 1e-9
            minr = self.rad[:, None] + self.rad[None, :]
            over = np.clip(minr - dist, 0, None)
            np.fill_diagonal(over, 0)
            push = (d / dist[..., None]) * (over[..., None] * 0.5)
            self.pos += push.sum(1)
            # parois du bocal
            r = self.rad
            self.pos[:, 0] = np.clip(self.pos[:, 0], self.x0 + r, self.x1 - r)
            below = self.pos[:, 1] > self.bot - r
            self.pos[below, 1] = self.bot - r[below]
        speed = np.abs((self.pos - self.prev)[:, 1]) / dt
        for i in range(len(self.pos)):
            if not self.landed[i] and self.pos[i, 1] > self.top - 40 and speed[i] < 90:
                self.landed[i] = True
                self.audio.note(t, notes()[(i * 3) % 12 + 4], 0.22, 0.3, key=f"c{i % 4}", gap=0.03)
        if self.spawned == self.n and self.done_at is None and all(self.landed) and t - self.next > 1.2:
            self.done_at = t
            self.audio.note(t, notes()[14], 0.5, 0.9, key="end")
            self.audio.pop(t + 0.35, 0.5)
        if self.done_at is not None:
            self.lid = min(1.0, (t - self.done_at) / 0.4)

    def fill(self):
        if not len(self.pos):
            return 0
        settled = [self.pos[i, 1] - self.rad[i] for i in range(len(self.pos)) if self.landed[i]]
        if not settled:
            return 0
        return int(max(0, min(100, (self.bot - min(settled)) / (self.bot - self.top) * 100)))

    def draw(self, img, t):
        d = SDraw(img)
        for i in range(len(self.pos)):
            x, y = self.pos[i]
            r = self.rad[i]
            c = self.col[i]
            d.ellipse([x - r, y - r, x + r, y + r], fill=c, outline=tuple(int(v * 0.6) for v in c), width=2)
            d.ellipse([x - r * 0.55, y - r * 0.6, x - r * 0.15, y - r * 0.2], fill=(255, 255, 255))
        glass = (220, 235, 255)
        d.line([self.x0 - 6, self.top - 40, self.x0 - 6, self.bot + 6], fill=glass, width=6)
        d.line([self.x1 + 6, self.top - 40, self.x1 + 6, self.bot + 6], fill=glass, width=6)
        d.line([self.x0 - 6, self.bot + 6, self.x1 + 6, self.bot + 6], fill=glass, width=6)
        d.line([self.x0 + 14, self.top, self.x0 + 14, self.bot - 30], fill=(255, 255, 255), width=3)   # reflet
        if self.lid > 0:
            y = self.top - 40 - (1 - self.lid) * 220
            d.rounded_rectangle([self.x0 - 20, y - 26, self.x1 + 20, y], 8, fill=pal(0.1))
        _text(d, (W / 2, 210), f"Rempli : {self.fill()} %  ·  {sum(self.landed)} bonbons", 26, pal(0.3))
        if self.done_at is not None:
            _text(d, (W / 2, 145), "PLEIN !", 52, pal(t * 0.4))

    def finished(self, t):
        return self.done_at is not None and t - self.done_at > 2.5


# ------------------------------------------------------------------ 2. vague de pendules

class Pendulums:
    def __init__(self, rnd: random.Random, audio: Audio):
        self.rnd, self.audio = rnd, audio
        self.n = V.get("pn", 18)
        self.cycle = max(15.0, V.get("seconds", 40) - 1.5)   # se réaligne pile à la fin : boucle parfaite
        self.k = V.get("pk", 20)
        self.amp = 150
        self.trail = V.get("ptrail", True)
        self.last = [0] * self.n
        self.hist: list[list[tuple]] = [[] for _ in range(self.n)]

    def xy(self, i, t):
        freq = (self.k + i) / self.cycle
        x = 60 + (W - 120) * i / (self.n - 1)
        y = 520 + self.amp * math.cos(2 * math.pi * freq * t)
        return x, y, freq

    def step(self, t, dt):
        for i in range(self.n):
            _, _, f = self.xy(i, t)
            half = int(2 * f * t)        # passage en haut ou en bas
            if half != self.last[i]:
                self.last[i] = half
                self.audio.note(t, notes()[i % 15 + 2], 0.2, 0.35, key=f"p{i}", gap=0.01)

    def draw(self, img, t):
        d = SDraw(img)
        d.line([40, 330, W - 40, 330], fill=(200, 200, 230), width=4)
        pts = []
        for i in range(self.n):
            x, y, _ = self.xy(i, t)
            col = pal(i / self.n)
            if self.trail:
                h = self.hist[i]
                h.append((x, y))
                del h[:-10]
                for k, (hx, hy) in enumerate(h[:-1]):
                    rr = 3 + k * 0.8
                    d.ellipse([hx - rr, hy - rr, hx + rr, hy + rr], fill=pal(i / self.n, 0.35 + k * 0.04))
            d.line([x, 330, x, y], fill=(120, 120, 160), width=2)
            pts.append((x, y))
            d.ellipse([x - 13, y - 13, x + 13, y + 13], fill=col, outline=(255, 255, 255), width=2)
        d.line(pts, fill=(255, 255, 255), width=1)
        left = self.cycle - (t % self.cycle)
        _text(d, (W / 2, 210), f"Réalignement dans {int(left)} s", 24, pal(0.2))

    def finished(self, t):
        return t >= self.cycle + 1.2


# ------------------------------------------------------------------ 3. la bille qui grossit

class Grow:
    def __init__(self, rnd: random.Random, audio: Audio):
        self.rnd, self.audio = rnd, audio
        self.cx, self.cy, self.R = W / 2, 540, 225
        self.r = 9.0
        self.grow = (self.R - 15) / max(10, V.get("seconds", 30) * 0.85 * 2.3) * V.get("grow", 2.2) / 2.2
        self.x, self.y = self.cx + rnd.uniform(-30, 30), self.cy - 80
        a = rnd.uniform(0, 6.28)
        self.vx, self.vy = math.cos(a) * 300, math.sin(a) * 300
        self.bounces = 0
        self.stamps: list[tuple] = []
        self.done_at = None
        self.parts = Particles()

    def step(self, t, dt):
        if self.done_at is not None:
            self.parts.step(dt)
            return
        self.vy += 900 * dt
        self.x += self.vx * dt
        self.y += self.vy * dt
        dx, dy = self.x - self.cx, self.y - self.cy
        dist = math.hypot(dx, dy) or 1
        if dist + self.r >= self.R:
            nx, ny = dx / dist, dy / dist
            dot = self.vx * nx + self.vy * ny
            if dot > 0:
                self.vx -= 2 * dot * nx
                self.vy -= 2 * dot * ny
                sp = math.hypot(self.vx, self.vy)
                tgt = max(sp, 520)
                self.vx, self.vy = self.vx / sp * tgt + self.rnd.uniform(-25, 25), self.vy / sp * tgt
                self.bounces += 1
                self.r += self.grow
                self.stamps.append((t, self.cx + nx * self.R, self.cy + ny * self.R, pal(self.bounces * 0.07)))
                self.parts.burst(self.cx + nx * self.R, self.cy + ny * self.R, pal(self.bounces * 0.07), n=6, speed=150)
                self.audio.note(t, notes()[min(19, self.bounces // 3)], 0.35, 0.45, key="g", gap=0.02)
            k = (self.R - self.r) / dist
            self.x, self.y = self.cx + dx * k, self.cy + dy * k
            if self.r >= self.R - 6:
                self.done_at = t
                self.audio.pop(t, 0.6)
                self.audio.note(t, notes()[19], 0.5, 0.9, key="end")
        self.parts.step(dt)

    def draw(self, img, t):
        d = SDraw(img)
        d.ellipse([self.cx - self.R, self.cy - self.R, self.cx + self.R, self.cy + self.R], outline=(235, 235, 255), width=5)
        for (t0, x, y, c) in self.stamps[-40:]:
            f = min(1, (t - t0) / 0.6)
            rr = 6 + 30 * f
            if f < 1:
                d.ellipse([x - rr, y - rr, x + rr, y + rr], outline=c, width=max(1, int(4 * (1 - f))))
        col = pal(self.bounces * 0.07)
        d.ellipse([self.x - self.r, self.y - self.r, self.x + self.r, self.y + self.r], fill=col, outline=(255, 255, 255), width=3)
        d.ellipse([self.x - self.r * 0.5, self.y - self.r * 0.55, self.x - self.r * 0.1, self.y - self.r * 0.15], fill=(255, 255, 255))
        self.parts.draw(d)
        _text(d, (W / 2, 210), f"{self.bounces} rebonds", 30, pal(0.2))
        if self.done_at is not None:
            _text(d, (W / 2, H * 0.84), "ELLE NE RENTRE PLUS !", 40, pal(t * 0.4))

    def finished(self, t):
        return self.done_at is not None and t - self.done_at > 2.5


# ------------------------------------------------------------------ 4. dominos en spirale

class Dominos:
    def __init__(self, rnd: random.Random, audio: Audio):
        self.rnd, self.audio = rnd, audio
        self.cx, self.cy = W / 2, 560
        self.path: list[tuple] = []
        shape = V.get("dshape", "spirale")
        n = V.get("dn", 130)
        for i in range(n):
            if shape == "spirale":
                a = i * 0.21
                r = 225 - i * 1.45
                x, y = self.cx + math.cos(a) * r, self.cy + math.sin(a) * r
                tx, ty = -math.sin(a), math.cos(a)
            elif shape == "serpent":
                row, k = divmod(i, 16)
                x = 70 + (k if row % 2 == 0 else 15 - k) * 26.7
                y = 300 + row * 62
                tx, ty = (1 if row % 2 == 0 else -1), 0
                if k == 15:
                    tx, ty = 0, 1
            else:   # vague
                x = 40 + (i % 65) * 7
                y = 330 + (i // 65) * 260 + 80 * math.sin(i * 0.12)
                tx, ty = 1, 0.12 * 80 * math.cos(i * 0.12) / 7
                nrm = math.hypot(tx, ty)
                tx, ty = tx / nrm, ty / nrm
            self.path.append((x, y, tx, ty, pal(i / n)))
        self.start = 0.8
        self.gap = max(0.03, (V.get("seconds", 30) - 4) / len(self.path)) * V.get("dgap", 0.07) / 0.07
        self.fallen = -1
        self.done_at = None

    def fall_time(self, i):
        return self.start + i * self.gap * (1 - min(0.5, i / len(self.path) * 0.5))   # accélère un peu

    def step(self, t, dt):
        while self.fallen + 1 < len(self.path) and t >= self.fall_time(self.fallen + 1):
            self.fallen += 1
            self.audio.note(t, notes()[self.fallen % 15 + 2], 0.2, 0.25, key=f"d{self.fallen % 3}", gap=0.0)
        if self.fallen == len(self.path) - 1 and self.done_at is None:
            self.done_at = t + 0.3
            self.audio.note(t + 0.3, notes()[17], 0.5, 0.9, key="end")

    def draw(self, img, t):
        d = SDraw(img)
        for i, (x, y, tx, ty, col) in enumerate(self.path):
            f = max(0.0, min(1.0, (t - self.fall_time(i)) / 0.18))
            nx, ny = -ty, tx
            half_w, thick = 11, 3.5
            length = thick + 26 * math.sin(f * math.pi / 2)             # vu du dessus : il « s'allonge » en tombant
            ox, oy = x + tx * (length - thick) / 2, y + ty * (length - thick) / 2
            pts = [(ox + tx * length / 2 + nx * half_w, oy + ty * length / 2 + ny * half_w),
                   (ox + tx * length / 2 - nx * half_w, oy + ty * length / 2 - ny * half_w),
                   (ox - tx * length / 2 - nx * half_w, oy - ty * length / 2 - ny * half_w),
                   (ox - tx * length / 2 + nx * half_w, oy - ty * length / 2 + ny * half_w)]
            c = col if f < 1 else tuple(int(v * 0.8) for v in col)
            d.d.polygon([(px * K, py * K) for px, py in pts], fill=c, outline=(30, 30, 40))
        _text(d, (W / 2, 210), f"{self.fallen + 1} / {len(self.path)}", 30, pal(0.2))
        if self.done_at is not None and t >= self.done_at:
            _text(d, (W / 2, H * 0.9), "TOUS TOMBÉS !", 44, pal(t * 0.4))

    def finished(self, t):
        return self.done_at is not None and t - self.done_at > 2.5


# ------------------------------------------------------------------ 5. le grand tri

def _sort_events(a: list[int], algo: str):
    """Génère les étapes du tri : ("cmp", i, j) ou ("swap", i, j)."""
    a = a[:]
    n = len(a)
    if algo == "bulles":
        for e in range(n - 1, 0, -1):
            for i in range(e):
                yield ("cmp", i, i + 1, a)
                if a[i] > a[i + 1]:
                    a[i], a[i + 1] = a[i + 1], a[i]
                    yield ("swap", i, i + 1, a)
    elif algo == "insertion":
        for i in range(1, n):
            j = i
            while j > 0:
                yield ("cmp", j - 1, j, a)
                if a[j - 1] > a[j]:
                    a[j - 1], a[j] = a[j], a[j - 1]
                    yield ("swap", j - 1, j, a)
                    j -= 1
                else:
                    break
    elif algo == "selection":
        for i in range(n - 1):
            m = i
            for j in range(i + 1, n):
                yield ("cmp", m, j, a)
                if a[j] < a[m]:
                    m = j
            a[i], a[m] = a[m], a[i]
            yield ("swap", i, m, a)
    else:   # rapide
        stack = [(0, n - 1)]
        while stack:
            lo, hi = stack.pop()
            if lo >= hi:
                continue
            p, i = a[hi], lo
            for j in range(lo, hi):
                yield ("cmp", j, hi, a)
                if a[j] < p:
                    a[i], a[j] = a[j], a[i]
                    yield ("swap", i, j, a)
                    i += 1
            a[i], a[hi] = a[hi], a[i]
            yield ("swap", i, hi, a)
            stack += [(lo, i - 1), (i + 1, hi)]


ALGO_NAMES = {"bulles": "TRI À BULLES", "insertion": "TRI PAR INSERTION", "selection": "TRI PAR SÉLECTION",
              "rapide": "TRI RAPIDE"}


class Sorter:
    def __init__(self, rnd: random.Random, audio: Audio):
        self.rnd, self.audio = rnd, audio
        self.n = V.get("bars", 48)
        self.algo = V.get("algo", "rapide")
        self.vals = list(range(1, self.n + 1))
        rnd.shuffle(self.vals)
        self.events = list((e, i, j, None) for e, i, j, _ in _sort_events(self.vals, self.algo))
        self.arr = self.vals[:]
        self.k = 0
        self.dur = max(8.0, V.get("seconds", 30) - 6) * V.get("sortdur", 24.0) / 24.0
        self.hi: tuple = ()
        self.done_at = None
        self.sweep = 0.0

    def step(self, t, dt):
        if self.done_at is None:
            target = int(len(self.events) * min(1.0, max(0.0, t - 0.8) / self.dur))
            while self.k < target:
                e, i, j, _ = self.events[self.k]
                if e == "swap":
                    self.arr[i], self.arr[j] = self.arr[j], self.arr[i]
                self.hi = (i, j)
                self.k += 1
                v = self.arr[j]
                self.audio.note(t, 160 * 2 ** (v / self.n * 2.6), 0.13, 0.12, key="s", gap=0.012)
            if self.k >= len(self.events) and t > 1:
                self.done_at = t
        else:   # balayage final vert, note par note
            prev = int(self.sweep)
            self.sweep = min(self.n, (t - self.done_at) / 1.6 * self.n)
            for b in range(prev, int(self.sweep)):
                self.audio.note(t, 160 * 2 ** (self.arr[b] / self.n * 2.6), 0.18, 0.15, key="sw", gap=0.0)

    def draw(self, img, t):
        d = SDraw(img)
        x0, x1, y1, hmax = 30, W - 30, 860, 520
        bw = (x1 - x0) / self.n
        for i, v in enumerate(self.arr):
            h = v / self.n * hmax
            c = pal(v / self.n)
            if self.done_at is not None and i < self.sweep:
                c = (90, 240, 140)
            elif i in self.hi and self.done_at is None:
                c = (255, 255, 255)
            d.rectangle([x0 + i * bw + 1, y1 - h, x0 + (i + 1) * bw - 1, y1], fill=c)
        _text(d, (W / 2, 210), ALGO_NAMES[self.algo], 30, pal(0.2))
        _text(d, (W / 2, 250), f"{self.k} étapes", 20, (220, 220, 240))
        if self.done_at is not None and self.sweep >= self.n:
            _text(d, (W / 2, H * 0.36), "TRIÉ !", 60, (90, 240, 140))

    def finished(self, t):
        return self.done_at is not None and t - self.done_at > 3.5


SCENES = {"bocal": Jar, "pendules": Pendulums, "grossit": Grow, "dominos": Dominos, "tri": Sorter}
CONCEPTS = {
    "bocal": ("Bocal de bonbons", "Des bonbons tombent et remplissent un bocal jusqu'au bord."),
    "pendules": ("Vague de pendules", "Des pendules dessinent des vagues hypnotiques puis se réalignent."),
    "grossit": ("La bille qui grossit", "Elle grossit à chaque rebond… jusqu'à ne plus rentrer."),
    "dominos": ("Dominos en cascade", "Une spirale de dominos colorés qui tombent un par un."),
    "tri": ("Le grand tri", "Des barres de couleur se trient en musique."),
}
HOOKS = {
    "bocal": ["Combien de bonbons pour le remplir ?", "Il va déborder ?", "Devine le nombre de bonbons", "Mets le son"],
    "pendules": ["Regarde la vague se former", "Attends le réalignement", "Impossible de décrocher", "Hypnotique"],
    "grossit": ["Combien de rebonds avant qu'elle bloque ?", "Elle va exploser ?", "Devine le nombre de rebonds"],
    "dominos": ["Pas un seul ne doit rater", "Attends le dernier domino", "Tellement satisfaisant"],
    "tri": ["Regarde le chaos devenir ordre", "Mets le son", "Le tri le plus satisfaisant", "Écoute la fin"],
}
CAPTIONS = {
    "bocal": "Combien de bonbons dans le bocal ? 🍬 Ton pronostic en commentaire 👇",
    "pendules": "Attends la fin, la vague se réaligne 🤯 Mets le son 🔊",
    "grossit": "Elle grossit à chaque rebond 😳 Combien de rebonds avant qu'elle bloque ?",
    "dominos": "Pas un seul domino ne rate 😌 Regarde jusqu'au dernier",
    "tri": "Du chaos à l'ordre parfait 🎶 Mets le son, la fin est incroyable",
}


def variant(concept: str, rnd: random.Random) -> dict:
    if concept == "bocal":
        return {"csize": rnd.choice([(9, 14), (11, 17), (13, 19)])}
    if concept == "pendules":
        return {"pn": rnd.choice([12, 15, 18, 22]), "cycle": rnd.choice([30.0, 36.0, 45.0]), "pk": rnd.choice([15, 18, 22]),
                "ptrail": rnd.random() < 0.6}
    if concept == "grossit":
        return {"grow": rnd.choice([1.6, 2.2, 3.0])}
    if concept == "dominos":
        return {"dshape": rnd.choice(["spirale", "serpent", "vague"]), "dn": rnd.choice([110, 130, 150]),
                "dgap": rnd.choice([0.06, 0.07])}
    if concept == "tri":
        return {"bars": rnd.choice([32, 48, 64]), "algo": rnd.choice(list(ALGO_NAMES)), "sortdur": rnd.choice([20.0, 24.0])}
    return {}
