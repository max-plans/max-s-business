"""5 concepts satisfaisants supplémentaires (même moteur que satisfying.py : physique + sons générés).

- bocal    : des bonbons tombent et remplissent un bocal en verre jusqu'au bord.
- pendules : une vague de pendules qui dessine des motifs hypnotiques, puis se réaligne (boucle parfaite).
- grossit  : une bille rebondit dans un cercle et grossit à chaque rebond… jusqu'à ne plus rentrer.
- dominos  : un parcours de 1000+ dominos (lignes, embranchements, champs qui révèlent un dessin), la caméra suit.
- tri      : des barres de couleur se trient sous tes yeux, chaque comparaison joue une note.
"""
from __future__ import annotations

import math
import random

import numpy as np

from . import satisfying as S
from .satisfying import H, K, W, Audio, Particles, SDraw, V, _text, pal, paste_sphere


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
        self.done_at = self.cycle                             # le réalignement = le moment du résultat
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
        pts = []
        for i in range(self.n):
            x, y, _ = self.xy(i, t)
            pts.append((x, y))
            if self.trail:      # traînée en ruban qui s'affine et s'éteint
                h = self.hist[i]
                h.append((x, y))
                del h[:-14]
                for k in range(1, len(h)):
                    f = k / len(h)
                    d.line([h[k - 1][0], h[k - 1][1], h[k][0], h[k][1]], fill=pal(i / self.n, 0.25 + 0.6 * f), width=2 + 9 * f)
            d.line([x, 336, x, y], fill=(150, 160, 200), width=1.5)
        d.line(pts, fill=(255, 255, 255), width=1)               # fil qui relie les billes : la vague se voit mieux
        d.rounded_rectangle([34, 322, W - 34, 338], 8, fill=(205, 210, 230))      # barre métallique
        d.rounded_rectangle([34, 322, W - 34, 328], 6, fill=(245, 248, 255))
        for i, (x, y) in enumerate(pts):
            d.ellipse([x - 3.5, 326.5, x + 3.5, 333.5], fill=(120, 125, 150))
            paste_sphere(img, x, y, 14, pal(i / self.n))
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
                # taille calée sur le temps : le cercle est rempli vers 93 % de la vidéo, pas avant
                goal = 9 + (self.R - 6 - 9) * min(1.0, t / (V.get("seconds", 30) * 0.93))
                self.r = max(self.r + 0.3, min(self.r + 10, goal))
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
        ring = pal(self.bounces * 0.07)
        for k, (w, f) in enumerate(((22, 0.18), (14, 0.35), (8, 0.6), (4, 1.0))):     # anneau néon (halo)
            c = tuple(int(v * f + 20 * (1 - f)) for v in ring)
            rr = self.R + 2
            d.ellipse([self.cx - rr, self.cy - rr, self.cx + rr, self.cy + rr], outline=c if k < 3 else (255, 255, 255), width=w)
        for (t0, x, y, c) in self.stamps[-40:]:
            f = min(1, (t - t0) / 0.6)
            rr = 6 + 34 * f
            if f < 1:
                d.ellipse([x - rr, y - rr, x + rr, y + rr], outline=c, width=max(1, 5 * (1 - f)))
        self.ghost = (getattr(self, "ghost", []) + [(self.x, self.y)])[-6:]
        for k, (gx, gy) in enumerate(self.ghost[:-1]):                                # traînée fantôme
            gr = self.r * (0.5 + k * 0.08)
            d.ellipse([gx - gr, gy - gr, gx + gr, gy + gr], fill=pal(self.bounces * 0.07, 0.25 + k * 0.05))
        paste_sphere(img, self.x, self.y, self.r, pal(self.bounces * 0.07))
        for q in self.parts.p:
            paste_sphere(img, q[0], q[1], 2.5 + 2 * q[4], q[5], glow=False)
        _text(d, (W / 2, 210), f"{self.bounces} rebonds", 30, pal(0.2))
        if self.done_at is not None:
            _text(d, (W / 2, H * 0.84), "ELLE NE RENTRE PLUS !", 40, pal(t * 0.4))

    def finished(self, t):
        return self.done_at is not None and t - self.done_at > 2.5


# ------------------------------------------------------------------ 4. parcours de dominos (la caméra descend)
# Un long parcours qui enchaîne : lignes qui ondulent, embranchements en 2-3 voies, et des champs de dominos
# qui tombent en vague et révèlent un dessin. ~30 dominos par seconde, plus de 1000 par vidéo.

PIX = {"R": (240, 55, 75), "Y": (255, 205, 40), "K": (28, 28, 40), "W": (250, 250, 255), "B": (60, 150, 255),
       "O": (255, 140, 30), "P": (255, 80, 170), "G": (60, 215, 110)}
PICTURES = {
    "coeur": ("UN CŒUR !", ["..RR...RR..", ".RRRR.RRRR.", "RRRRRRRRRRR", "RRRRRRRRRRR", "RRRRRRRRRRR",
                           ".RRRRRRRRR.", "..RRRRRRR..", "...RRRRR...", "....RRR....", ".....R....."]),
    "etoile": ("UNE ÉTOILE !", [".....Y.....", "....YYY....", "....YYY....", "YYYYYYYYYYY", ".YYYYYYYYY.",
                               "..YYYYYYY..", "..YYYYYYY..", ".YYYY.YYYY.", ".YYY...YYY.", "YY.......YY"]),
    "smiley": ("UN SMILEY !", ["...YYYYY...", "..YYYYYYY..", ".YYKYYYKYY.", "YYYKYYYKYYY", "YYYYYYYYYYY",
                              "YKYYYYYYYKY", "YYKYYYYYKYY", ".YYKKKKKYY.", "..YYYYYYY..", "...YYYYY..."]),
    "eclair": ("UN ÉCLAIR !", ["......OOO..", ".....OOO...", "....OOO....", "...OOO.....", "..OOOOOOO..",
                              ".....OOO...", "....OOO....", "...OOO.....", "..OO.......", ".O........."]),
    "couronne": ("UNE COURONNE !", ["Y....Y....Y", "YY..YYY..YY", "YYY.YYY.YYY", "YYYYYYYYYYY", "YYRYYBYYRYY",
                                   "YYYYYYYYYYY", "YYYYYYYYYYY"]),
    "diamant": ("UN DIAMANT !", ["..BBBBBBB..", ".BWBBBBBWB.", "BBBBBBBBBBB", ".BBBBBBBBB.", "..BBBBBBB..",
                                "...BBBBB...", "....BBB....", ".....B....."]),
    "trefle": ("UN TRÈFLE !", ["...GG.GG...", "..GGGGGGG..", "...GGGGG...", "GG..GGG..GG", "GGGGGGGGGGG",
                              "GG..GGG..GG", "....GGG....", "....GG.....", "...GG......", "..........."]),
}
STAND = (226, 230, 242)          # domino debout dans un champ : neutre, la couleur arrive en tombant
FIELD_BG = (40, 42, 66)


class Dominos:
    SP = 19.0          # écart sur une ligne : chaque domino touche le suivant
    G = 25.0           # maille d'un champ

    def __init__(self, rnd: random.Random, audio: Audio):
        self.rnd, self.audio = rnd, audio
        self.d: list[list] = []      # [x, y, ux, uy, demi-largeur, couleur debout, couleur couché, t, note, canal]
        self.labels: list[list] = []  # [t fin du champ, texte, joué ?]
        self.fields: list[list] = []  # [t début, t fin + pause, y du centre] : la caméra s'y arrête
        self.dt = 1.0 / V.get("drate", 32.0)
        self.start = 0.8
        target = V.get("seconds", 45) - 3.5 - self.start
        x, y, t, hue, k = W / 2, 330.0, 0.0, rnd.random(), 0
        pics = list(PICTURES)
        rnd.shuffle(pics)
        while t < target:
            x, y, t = self._line(x, y, t, rnd.randint(40, 80), hue)
            hue += 0.17
            if t >= target:
                break
            if k % 2 == 0:
                x, y, t = self._field(x, y, t, pics[(k // 2) % len(pics)])
            else:
                x, y, t = self._split(x, y, t, rnd.choice([2, 3]), hue)
                hue += 0.17
            k += 1
        f = target / max(q[7] for q in self.d)            # cale la fin pile sur la durée voulue
        for q in self.d:
            q[7] = self.start + q[7] * f
        for lb in self.labels:
            lb[0] = self.start + lb[0] * f
        for fd in self.fields:
            fd[0], fd[1] = self.start + fd[0] * f, self.start + fd[1] * f
        self.d.sort(key=lambda q: q[7])
        self.times = [q[7] for q in self.d]
        self.ys = np.array([q[1] for q in self.d])
        self.front = np.maximum.accumulate(self.ys)
        self.fallen = -1
        self.done_at = None
        self.cam = 0.0

    def _add(self, x, y, ux, uy, hw, cs, cf, t, note, key):
        self.d.append([x, y, ux, uy, hw, cs, cf, t, note, key])

    def _place(self, pts, first_arc):
        """Points espacés de SP le long d'une courbe dense, à partir de la longueur first_arc."""
        out, acc, nxt = [], 0.0, first_arc
        for (ax, ay), (bx, by) in zip(pts, pts[1:]):
            seg = math.hypot(bx - ax, by - ay)
            while acc + seg >= nxt and seg > 0:
                f = (nxt - acc) / seg
                out.append((ax + (bx - ax) * f, ay + (by - ay) * f, (bx - ax) / seg, (by - ay) / seg))
                nxt += self.SP
            acc += seg
        return out

    def _line(self, x0, y0, t0, n, hue):
        rnd = self.rnd
        amp = min(rnd.uniform(90, 190), x0 - 60, W - 60 - x0) if 60 < x0 < W - 60 else 0
        per, sgn = rnd.uniform(55, 100), rnd.choice([-1, 1])
        pts = [(x0 + sgn * amp * math.sin(i * 0.6 / per), y0 + i * 0.6) for i in range(int(n * self.SP * 3))]
        pl = self._place(pts, 0.0)[:n]
        for i, (x, y, ux, uy) in enumerate(pl):
            c = pal(hue + i / 260)
            self._add(x, y, ux, uy, 11, c, tuple(int(v * 0.8) for v in c), t0 + i * self.dt, 2 + i % 14, f"d{i % 3}")
        x, y, ux, uy = pl[-1]
        return x + ux * self.SP, y + uy * self.SP, t0 + len(pl) * self.dt

    def _field(self, sx, sy, t0, pic):
        name, rows_s = PICTURES[pic]
        cols = 17
        rows = max(6, round(cols * len(rows_s) / len(rows_s[0])))
        top = sy + 22
        left = W / 2 - cols * self.G / 2 + self.G / 2
        v = 290.0                                   # vitesse de la vague (px/s)
        t_exit, t_end = None, t0
        for r in range(rows):
            for c in range(cols):
                x, y = left + c * self.G, top + r * self.G
                ch = rows_s[int(r * len(rows_s) / rows)][int(c * len(rows_s[0]) / cols)]
                dx, dy = x - sx, y - sy + self.SP
                dist = math.hypot(dx, dy) or 1
                tt = t0 + dist / v + self.rnd.uniform(0, 0.012)
                ring = int(dist / 38)
                self._add(x, y, dx / dist, dy / dist, 10, STAND, PIX.get(ch, FIELD_BG), tt, min(19, 2 + ring), f"f{ring % 3}")
                t_end = max(t_end, tt)
                if r == rows - 1 and c == cols // 2:
                    t_exit = tt
        self.labels.append([t_end + 0.25, name, False])
        self.fields.append([t0, t_end + 1.5, top + (rows - 1) * self.G / 2])
        return W / 2, top + (rows - 1) * self.G + 24, t_exit + self.dt

    def _split(self, sx, sy, t0, k, hue):
        L = self.rnd.uniform(520, 700)
        offs = [-150, 150] if k == 2 else [-175, 0, 175]
        ends = []
        self._add(sx, sy, 0, 1, 11, (255, 255, 255), (200, 200, 210), t0, 2, "d0")     # le domino qui fait la fourche
        for b, off in enumerate(offs):
            pts = []
            for i in range(900):
                u = i / 999                         # s'arrête à 90 % : les voies restent séparées
                sm = u * u * (3 - 2 * u)
                x = sx + (W / 2 - sx) * sm + off * math.sin(math.pi * u) ** 0.8
                pts.append((min(W - 40, max(40, x)), sy + u * L))
            pl = self._place(pts, self.SP * 1.3)
            for j, (x, y, ux, uy) in enumerate(pl):
                c = pal(hue + b * 0.18 + j / 300)
                self._add(x, y, ux, uy, 11, c, tuple(int(v * 0.8) for v in c), t0 + (j + 1) * self.dt,
                          min(19, 2 + j % 10 + b * 4), f"s{b}")
            ends.append(t0 + len(pl) * self.dt)
        return W / 2, sy + 0.9 * L + 24, min(ends) + self.dt

    def step(self, t, dt):
        n = len(self.d)
        while self.fallen + 1 < n and t >= self.times[self.fallen + 1]:
            self.fallen += 1
            q = self.d[self.fallen]
            self.audio.note(t, notes()[q[8]], 0.16, 0.22, key=q[9], gap=0.028)
        for lb in self.labels:
            if not lb[2] and t >= lb[0]:
                lb[2] = True
                self.audio.note(t, notes()[19], 0.4, 0.8, key="pic")
                self.audio.note(t + 0.09, notes()[16], 0.3, 0.7, key="pic2")
        if self.fallen == n - 1 and self.done_at is None:
            self.done_at = t + 0.3
            self.audio.note(t + 0.3, notes()[17], 0.5, 0.9, key="end")
        front = self.front[self.fallen] if self.fallen >= 0 else self.ys[0]
        target = max(0.0, front - H * 0.58)               # la caméra suit le front qui tombe...
        for t0, t1, cy in self.fields:                    # ...et s'arrête sur le dessin pendant qu'il se révèle
            if t0 <= t <= t1:
                target = max(0.0, cy - H * 0.5)
        self.cam += (target - self.cam) * min(1.0, dt * 3.0)

    def draw(self, img, t):
        d = SDraw(img)
        cam = self.cam
        vis = np.nonzero((self.ys > cam - 40) & (self.ys < cam + H + 40))[0]
        for i in vis:
            x, y, tx, ty, hw, cs, cf, t0, _, _ = self.d[i]
            y -= cam
            f = max(0.0, min(1.0, (t - t0) / 0.16))
            nx, ny = -ty, tx
            thick = 3.5
            length = thick + 23 * math.sin(f * math.pi / 2)            # vu du dessus : il « s'allonge » en tombant
            ox, oy = x + tx * (length - thick) / 2, y + ty * (length - thick) / 2
            pts = [(ox + tx * length / 2 + nx * hw, oy + ty * length / 2 + ny * hw),
                   (ox + tx * length / 2 - nx * hw, oy + ty * length / 2 - ny * hw),
                   (ox - tx * length / 2 - nx * hw, oy - ty * length / 2 - ny * hw),
                   (ox - tx * length / 2 + nx * hw, oy - ty * length / 2 + ny * hw)]
            c = tuple(int(a + (b - a) * f) for a, b in zip(cs, cf))
            P = lambda q, dx=0.0, dy=0.0: [((px + dx) * K, (py + dy) * K) for px, py in q]
            if f < 1:
                d.d.polygon(P(pts, 3, 5), fill=(10, 10, 18))                               # ombre portée
            d.d.polygon(P(pts, 0, 3.5), fill=tuple(int(v * 0.55) for v in c))             # épaisseur (côté)
            d.d.polygon(P(pts), fill=c, outline=tuple(min(255, int(v * 1.2)) for v in c))
            if hw < 11:
                continue
            if f < 0.5:      # debout : on voit le dessus avec ses 2 points blancs
                for s_ in (-0.45, 0.45):
                    px, py = ox + nx * hw * s_, oy + ny * hw * s_
                    d.ellipse([px - 1.6, py - 1.6, px + 1.6, py + 1.6], fill=(255, 255, 255))
            else:            # couché : la ligne du milieu et des points
                d.line([ox - nx * hw * 0.9, oy - ny * hw * 0.9, ox + nx * hw * 0.9, oy + ny * hw * 0.9],
                       fill=tuple(int(v * 0.6) for v in c), width=1)
                for a_, b_ in ((0.25, 0.4), (-0.25, -0.4), (0.25, -0.4)):
                    px, py = ox + tx * length * a_ + nx * hw * b_, oy + ty * length * a_ + ny * hw * b_
                    d.ellipse([px - 1.7, py - 1.7, px + 1.7, py + 1.7], fill=(255, 255, 255))
        _text(d, (W / 2, 150), f"{self.fallen + 1} / {len(self.d)}", 30, pal(0.2))
        for t_end, name, _ in self.labels:
            if 0 <= t - t_end < 1.25:
                _text(d, (W / 2, 205), name, 34, pal(t * 0.5))
        if self.done_at is not None and t >= self.done_at:
            _text(d, (W / 2, H * 0.88), "TOUS TOMBÉS !", 44, pal(t * 0.4))

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


SCENES = {"pendules": Pendulums, "grossit": Grow, "dominos": Dominos}
CONCEPTS = {
    "pendules": ("Vague de pendules", "Des pendules dessinent des vagues hypnotiques puis se réalignent."),
    "grossit": ("La bille qui grossit", "Elle grossit à chaque rebond… jusqu'à ne plus rentrer."),
    "dominos": ("Dominos en cascade", "Plus de 1000 dominos : lignes, embranchements et dessins cachés qui se révèlent."),
}
HOOKS = {
    "pendules": ["Regarde la vague se former", "Attends le réalignement", "Impossible de décrocher", "Hypnotique"],
    "grossit": ["Combien de rebonds avant qu'elle bloque ?", "Elle va exploser ?", "Devine le nombre de rebonds"],
    "dominos": ["Devine ce que les dominos dessinent", "Attends de voir les dessins", "Pas un seul ne doit rater",
                "Combien de dessins cachés ?"],
}
CAPTIONS = {
    "pendules": "Attends la fin, la vague se réaligne 🤯 Mets le son 🔊",
    "grossit": "Elle grossit à chaque rebond 😳 Combien de rebonds avant qu'elle bloque ?",
    "dominos": "Plus de 1000 dominos et des dessins cachés 😳 Tu les as tous trouvés ?",
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
        return {"drate": rnd.choice([28.0, 32.0, 36.0])}
    if concept == "tri":
        return {"bars": rnd.choice([32, 48, 64]), "algo": rnd.choice(list(ALGO_NAMES)), "sortdur": rnd.choice([20.0, 24.0])}
    return {}
