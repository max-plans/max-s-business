"""5 concepts satisfaisants supplémentaires (même moteur que satisfying.py : physique + sons générés).

- bocal    : des bonbons tombent et remplissent un bocal en verre jusqu'au bord.
- pendules : une vague de pendules qui dessine des motifs hypnotiques, puis se réaligne (boucle parfaite).
- grossit  : une bille rebondit dans un cercle et grossit à chaque rebond… jusqu'à ne plus rentrer.
- dominos  : un parcours de 1000+ dominos (lignes, embranchements, champs qui révèlent un dessin), la caméra suit.
- tri      : des barres de couleur se trient sous tes yeux, chaque comparaison joue une note.
"""
from __future__ import annotations

import bisect
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
        self.labels.append([t_end + 0.25, name, False, top + (rows - 1) * self.G + 34])   # nom affiché sous le dessin
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
        # la caméra suit en permanence les dominos qui sont en train de tomber (moyenne de leur position)
        if self.fallen >= 0:
            i0 = bisect.bisect_left(self.times, t - 0.18)
            front = float(self.ys[min(i0, self.fallen):self.fallen + 1].mean())
        else:
            front = float(self.ys[0])
        target = max(0.0, front - H * 0.5)
        self.cam += (target - self.cam) * min(1.0, dt * 5.0)

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
        for t_end, name, _, ly in self.labels:
            if 0 <= t - t_end < 1.4:
                _text(d, (W / 2, min(H - 60, max(205, ly - self.cam))), name, 34, pal(t * 0.5))
        if self.done_at is not None and t >= self.done_at:
            _text(d, (W / 2, H * 0.88), "TOUS TOMBÉS !", 44, pal(t * 0.4))

    def finished(self, t):
        return self.done_at is not None and t - self.done_at > 2.5


# ------------------------------------------------------------------ 6. la course des maths
# 3 billes, 3 règles de calcul (ex. +32, n², ×2). À chaque rebond, la bille frappe le mur sous elle avec sa valeur,
# puis sa valeur grandit selon sa règle. Première arrivée en bas = gagnante. Linéaire devant au début,
# l'exponentielle revient de loin : tout est vraiment calculé, l'agent règle juste les PV des murs.

from .satisfying import _font, _hsv  # noqa: E402

MG = 1400.0                  # gravité
MV0 = 520.0                  # vitesse de rebond (même cadence de frappe pour tous)
MR = 16                      # rayon des billes
MBARS = [335 + i * 78 for i in range(7)]
MFINISH = 893


def _fmt(v: float) -> str:
    v = float(v)
    for lim, div, suf in ((1e15, 1e15, "Q"), (1e12, 1e12, "T"), (1e9, 1e9, "B"), (1e6, 1e6, "M"), (1e4, 1e3, "k")):
        if abs(v) >= lim:
            return f"{v / div:.1f}".rstrip("0").rstrip(".").replace(".", ",") + suf
    return str(int(round(v)))


def _rules(rnd: random.Random, hits: float, n: int = 3) -> list[dict]:
    """Une règle linéaire (devant au début), une polynomiale, une exponentielle calée pour la rattraper
    au moment choisi (hits = nombre de frappes attendu sur toute la course). Avec 4 colonnes : une 2e linéaire."""
    k = int(V.get("mk", rnd.randint(7, 99)))
    lin = {"label": f"+{k}", "kind": "lin", "start": k * rnd.randint(2, 5), "k": k}
    kind = V.get("mpoly", rnd.choice(["sq", "tri", "cube"]))
    poly = {"sq": {"label": "n²", "kind": "sq", "n0": rnd.randint(2, 6)},
            "cube": {"label": "n³", "kind": "cube", "n0": 2},
            "tri": {"label": "+n", "kind": "tri", "start": rnd.randint(3, 30)}}[kind]
    nc = max(8, int(hits * V.get("mcross", rnd.uniform(0.5, 0.68)) * rnd.uniform(0.92, 1.08)))
    dmg = sum(lin["start"] + k * i for i in range(nc))           # dégâts cumulés de la linéaire au croisement
    fast = None
    for f in rnd.sample([1.3, 1.25, 1.2], 3) + [1.15, 1.1]:
        v0 = round(dmg * (f - 1) / (f ** nc - 1))
        if v0 >= 1:
            fast = {"label": ("×" + f"{f:g}").replace(".", ","), "kind": "mul", "f": f, "start": v0}
            break
    fast = fast or {"label": "×1,1", "kind": "mul", "f": 1.1, "start": 1}
    out = [lin, poly, fast]
    if n == 4:                                     # 2e linéaire : petit pas mais gros départ
        k2 = max(2, k // rnd.randint(2, 4))
        out.append({"label": f"+{k2}", "kind": "lin", "start": lin["start"] * rnd.randint(2, 3), "k": k2})
    rnd.shuffle(out)
    return out


class _MCol:
    def __init__(self, i: int, n: int, rule: dict, hps: list):
        self.i, self.rule = i, rule
        self.w = (W - 60 - (n - 1) * 15) / n
        self.left = 30 + i * (self.w + 15)
        kind = rule["kind"]
        self.n = 0
        if kind == "sq":
            self.v = rule["n0"] ** 2
        elif kind == "cube":
            self.v = rule["n0"] ** 3
        else:
            self.v = rule["start"]
        self.prev = 1                              # pour Fibonacci
        self.hp0, self.hp = list(hps), list(hps)
        self.k = 0
        self.x = self.left + self.w * (0.35 + 0.3 * (i % 2))
        self.y = 268.0 + i * 14
        self.vx, self.vy = (48 if i % 2 else -48), 0.0
        self.done = None

    def grow(self):
        r, k = self.rule, self.rule["kind"]
        self.n += 1
        if k == "lin":
            self.v += r["k"]
        elif k == "sq":
            self.v = (r["n0"] + self.n) ** 2
        elif k == "cube":
            self.v = (r["n0"] + self.n) ** 3
        elif k == "tri":
            self.v += self.n * 3
        elif k == "mul":
            self.v = math.ceil(self.v * r["f"])
        elif k == "x2":
            self.v *= 2
        elif k == "x15":
            self.v = math.ceil(self.v * 1.5)
        elif k == "fib":
            self.v, self.prev = self.v + self.prev, self.v
        elif k == "fact":
            self.v *= self.n + 1

    def progress(self) -> float:
        if self.done is not None:
            return len(self.hp) + 1
        if self.k >= len(self.hp):
            return len(self.hp) + 0.5
        return self.k + (1 - self.hp[self.k] / self.hp0[self.k])

    def step(self, t, dt, ev=None):
        if self.done is not None:
            return
        self.vy += MG * dt
        self.y += self.vy * dt
        self.x += self.vx * dt
        if self.x < self.left + MR + 4 or self.x > self.left + self.w - MR - 4:
            self.vx = -self.vx
            self.x = min(max(self.x, self.left + MR + 4), self.left + self.w - MR - 4)
        floor = MBARS[self.k] if self.k < len(self.hp) else MFINISH
        if self.vy > 0 and self.y + MR >= floor - 5:
            if self.k >= len(self.hp):
                self.done, self.y, self.vy, self.vx = t, floor - 5 - MR, 0.0, 0.0
                if ev:
                    ev("finish", self)
                return
            dmg = self.v
            self.hp[self.k] -= dmg
            self.grow()
            if self.hp[self.k] <= 0:
                self.hp[self.k] = 0
                self.k += 1
                if ev:
                    ev("break", self)
            else:
                self.y, self.vy = floor - 5 - MR, -MV0
                if ev:
                    ev("hit", self)


def _race(rules, hps, until, probe=None, first=False):
    cols = [_MCol(i, len(rules), r, hps) for i, r in enumerate(rules)]
    t, dt, early = 0.0, 1 / 90, None
    while t < until and not all(c.done is not None for c in cols):
        if first and any(c.done is not None for c in cols):
            break
        for c in cols:
            c.step(t, dt)
        t += dt
        if probe is not None and early is None and t >= probe:
            early = max(range(len(cols)), key=lambda j: cols[j].progress())
    finish = [c.done if c.done is not None else 1e9 for c in cols]
    return finish, early, [c.progress() for c in cols]


class Maths:
    def __init__(self, rnd: random.Random, audio: Audio):
        self.rnd, self.audio = rnd, audio
        target = max(12.0, V.get("seconds", 45) - 4.5)      # le gagnant arrive juste avant la fin
        n, nb = int(V.get("mcols", 3)), int(V.get("mbars", 7))
        nb = min(12, nb + max(0, round((V.get("seconds", 45) - 45) / 7.5)))   # vidéo plus longue = plus d'étages
        MBARS[:] = [335 + j * 480 / (nb - 1) for j in range(nb)]          # murs répartis sur la hauteur
        best, best_score = None, -1e9
        hits = target / (2 * MV0 / MG + 0.1)
        for _ in range(8):                          # cherche un scénario avec un retournement de situation
            rules = _rules(rnd, hits, n)
            for g in rnd.sample([1.9, 2.3, 2.7, 3.1, 3.6, 4.2], 4):
                base = [g ** j for j in range(len(MBARS))]     # petits murs d'abord, énormes à la fin
                lo, hi = math.log(0.05), math.log(1e7)
                for _ in range(22):                 # PV des murs : le gagnant arrive vers 80 % de la vidéo
                    mid = (lo + hi) / 2
                    hps = [max(1, round(math.exp(mid) * b)) for b in base]
                    fin, _e, _p = _race(rules, hps, target * 1.3, first=True)
                    if min(fin) < target:
                        lo = mid
                    else:
                        hi = mid
                hps = [max(1, round(math.exp(lo) * b)) for b in base]
                hps = [int(float(f"{h:.3g}")) if h > 999 else h for h in hps]
                fin, early, prog = _race(rules, hps, target * 1.3, probe=target * 0.35, first=True)
                win = min(range(n), key=lambda j: fin[j])
                others = sorted(p_ for j, p_ in enumerate(prog) if j != win)
                score = (3 if early is not None and early != win else 0) + min(others[0], 2.5) + 0.3 * min(others[1], 5) \
                    - abs(min(fin) - target) / 4
                if score > best_score:
                    best, best_score = (rules, hps), score
            if best_score >= 5.5:
                break
        rules, self.hps = best
        h0 = V.get("mhue", rnd.random())
        hues = [h0 + i / n + rnd.uniform(-0.04, 0.04) for i in range(n)]      # couleurs bien séparées, nouvelles à chaque vidéo
        rnd.shuffle(hues)
        self.style = V.get("mstyle", "neon")
        self.cols = [_MCol(i, n, r, self.hps) for i, r in enumerate(rules)]
        for c, h in zip(self.cols, hues):
            c.color = _hsv(h, rnd.uniform(0.62, 0.85), 1.0)
            c.flash = -1.0
            c.place = None
        self.parts = Particles()
        self.order: list = []
        self.done_at = None

    def _ev(self, kind, c):
        t = self._t
        x, y = c.x, c.y + MR
        if kind == "hit":
            c.flash = t
            self.audio.note(t, notes()[min(19, 2 + c.i * 5 + c.n % 6)], 0.26, 0.28, key=f"m{c.i}", gap=0.02)
        elif kind == "break":
            self.parts.burst(c.left + c.w / 2, MBARS[c.k - 1], c.color, n=22, speed=260)
            self.audio.pop(t, 0.45, key=f"b{c.i}")
            self.audio.note(t, notes()[min(19, 8 + c.k * 2)], 0.35, 0.5, key=f"bn{c.i}")
        elif kind == "finish":
            self.order.append(c)
            c.place = len(self.order)
            self.parts.burst(x, y, c.color, n=40, speed=360)
            if c.place == 1:
                self.done_at = t
            self.audio.note(t, notes()[19 if c.place == 1 else 14], 0.5, 0.9, key=f"f{c.i}")

    def step(self, t, dt):
        self._t = t
        for c in self.cols:
            c.step(t, dt, self._ev)
        self.parts.step(dt)

    def draw(self, img, t):
        d = SDraw(img)
        lead = max(self.cols, key=lambda c: c.progress())
        for c in self.cols:
            L, R_, col = c.left, c.left + c.w, c.color
            dim = tuple(int(v * 0.35) for v in col)
            if c is lead:                                                        # colonne en tête : halo
                for w_, f in ((9, 0.18), (5, 0.4)):
                    d.rounded_rectangle([L - 3, 248, R_ + 3, 905], 12, outline=tuple(int(v * f) for v in col), width=w_)
            panel = {"plein": tuple(int(v * 0.13) + 9 for v in col), "verre": (30, 32, 48)}.get(self.style, (16, 17, 26))
            edge = col if c is lead else ({"verre": (95, 100, 125)}.get(self.style, (55, 58, 75)))
            d.rounded_rectangle([L, 250, R_, 903], 10, fill=panel, outline=edge, width=2)
            _text(d, (L + c.w / 2, 176), c.rule["label"], 52, col)
            d.ellipse([L + c.w / 2 - 50, 216, L + c.w / 2 - 38, 228], fill=col)
            d.text((L + c.w / 2 - 31, 222), _fmt(c.v), font=_font(27 * K), fill=(255, 255, 255), anchor="lm",
                   stroke_width=2, stroke_fill=(0, 0, 0))
            for j, y in enumerate(MBARS):
                if c.hp[j] <= 0:
                    continue
                f = c.hp[j] / c.hp0[j]
                x0, x1 = L + 7, R_ - 7
                d.rounded_rectangle([x0, y - 6, x1, y + 6], 4, fill=dim)
                hot = j == c.k and t - c.flash < 0.12
                d.rounded_rectangle([x0, y - 6, x0 + (x1 - x0) * f, y + 6], 4, fill=(255, 255, 255) if hot else col)
                d.text((L + c.w / 2, y), _fmt(c.hp[j]), font=_font(19 * K), fill=(255, 255, 255), anchor="mm",
                       stroke_width=2, stroke_fill=(0, 0, 0))
            for k in range(int(c.w // 10)):                                      # ligne d'arrivée en damier
                for r in range(2):
                    if (k + r) % 2 == 0:
                        d.rectangle([L + 4 + k * 10, MFINISH + r * 5, L + 4 + k * 10 + 5, MFINISH + r * 5 + 5], fill=(235, 235, 240))
            paste_sphere(img, c.x, c.y, MR, col)
            d.text((c.x, c.y), _fmt(c.v), font=_font(13 * K), fill=(255, 255, 255), anchor="mm", stroke_width=2, stroke_fill=(0, 0, 0))
            if c.place:
                _text(d, (L + c.w / 2, 838), ("1er" if c.place == 1 else f"{c.place}e"), 30, (255, 255, 255) if c.place > 1 else (255, 215, 60))
        for q in self.parts.p:
            paste_sphere(img, q[0], q[1], 2 + 2.5 * q[4], q[5], glow=False)
        if self.done_at is not None:
            w = self.order[0]
            _text(d, (W / 2, 128), f"{w.rule['label']} GAGNE !", 36, w.color)

    def finished(self, t):
        return self.done_at is not None and t - self.done_at > 3.5


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


# ------------------------------------------------------------------ 7. course de billes
# 3 billes (couleurs ou pays) dévalent un long parcours d'obstacles, en vraie physique à pas fixe.
# L'agent teste plusieurs parcours, garde le plus disputé, puis place la ligne d'arrivée là où se trouve
# la première bille juste avant la fin de la vidéo. Rien n'est truqué : la course se rejoue à l'identique.

import colorsys  # noqa: E402

from PIL import Image as _Image, ImageDraw as _ImageDraw  # noqa: E402

from .satisfying import NAMED as _NAMED  # noqa: E402

BG_ = 1500.0           # gravité (changée à chaque vidéo)
BR = 20.0              # rayon des billes (changé à chaque vidéo)
BDT = 1 / 240          # pas de physique fixe (rejouable à l'identique)
BUCKET = 60
BKINDS = ["zigzag", "pegs", "spin", "funnel", "split", "pads", "bumpers", "cross"]
BTHEMES = ["neon", "bonbon", "metal", "nuit"]
CANDY = [(255, 120, 170), (120, 200, 255), (255, 210, 90), (150, 230, 150), (200, 150, 255), (255, 160, 110)]


def _gap() -> float:
    return 2.7 * BR        # ouverture minimale : une bille passe toujours, jamais coincée à moitié


class _Ball:
    __slots__ = ("i", "x", "y", "vx", "vy", "done", "trail", "color", "name", "best", "tbest", "sprite", "mini", "dot", "nudges", "ax", "ay", "at")

    def __init__(self, i, x, y):
        self.i, self.x, self.y, self.vx, self.vy = i, x, y, 0.0, 0.0
        self.done, self.trail, self.best, self.tbest, self.nudges = None, [], y, 0.0, 0
        self.ax, self.ay, self.at = x, y, 0.0
        self.sprite = self.mini = self.dot = None


def _seg_hit(b, ax, ay, bx, by, e, fr, svx=0.0, svy=0.0):
    dx, dy = bx - ax, by - ay
    l2 = dx * dx + dy * dy or 1.0
    u = min(1.0, max(0.0, ((b.x - ax) * dx + (b.y - ay) * dy) / l2))
    px, py = ax + u * dx, ay + u * dy
    nx, ny = b.x - px, b.y - py
    d = math.hypot(nx, ny)
    if d >= BR or d == 0:
        return 0.0
    nx, ny = nx / d, ny / d
    b.x, b.y = px + nx * BR, py + ny * BR
    rvx, rvy = b.vx - svx, b.vy - svy
    vn = rvx * nx + rvy * ny
    if vn >= 0:
        return 0.0
    tx, ty = -ny, nx
    vt = (rvx * tx + rvy * ty) * fr
    vn2 = -vn * e
    b.vx, b.vy = svx + nx * vn2 + tx * vt, svy + ny * vn2 + ty * vt
    return -vn


class _Course:
    """Obstacles : ('seg', ax, ay, bx, by, sorte) / ('peg', x, y, r) / ('bump', x, y, r) / ('spin', cx, cy, demi-long., w, phase)."""

    def __init__(self, rnd: random.Random, length: float, mix: list):
        self.obs: list[tuple] = []
        self.sections: list[tuple] = []
        self.rnd = rnd
        y = 430.0                                             # de la place sous la pente de départ (pas de coin piège)
        last = None
        self.add(("seg", 20, 250, 420, 330, "ramp"))          # pente de départ
        while y < length:
            k = rnd.choice([x for x in mix if x != last] or mix)
            last = k
            self.sections.append((y, k))
            y = getattr(self, "_" + k)(y) + 40
        self.end = y
        for y0 in range(0, int(y) + 600, 300):                # murs du parcours
            self.add(("seg", 20, y0, 20, y0 + 300, "wall"))
            self.add(("seg", W - 20, y0, W - 20, y0 + 300, "wall"))

    def add(self, o):
        self.obs.append(o)

    def _zigzag(self, y):
        n = self.rnd.randint(3, 5)
        right = self.rnd.random() < 0.5
        drop = self.rnd.uniform(55, 75)
        reach = W - 20 - max(95, _gap() + 25)
        for k in range(n):
            yy = y + k * 120
            if right:
                self.add(("seg", 20, yy, reach, yy + drop, "ramp"))
            else:
                self.add(("seg", W - 20, yy, W - reach, yy + drop, "ramp"))
            right = not right
        return y + n * 120 + 70

    def _pegs(self, y):
        rows = self.rnd.randint(4, 7)
        pr = self.rnd.choice([7, 8, 9])
        sx = 2 * pr + _gap()
        lo, hi = 20 + pr + _gap(), W - 20 - pr - _gap()
        for r in range(rows):
            x = lo + (sx / 2 if r % 2 else 0)
            while x <= hi:
                self.add(("peg", x, y + 45 + r * (sx * 0.85), pr))
                x += sx
        return y + rows * sx * 0.85 + 60

    def _spin(self, y):
        k = self.rnd.randint(2, 3)
        side = self.rnd.random() < 0.5
        for i in range(k):
            yy = y + 95 + i * 180
            cx = 190 if side else W - 190
            self.add(("seg", 20, yy - 75, 110, yy - 30, "ramp"))
            self.add(("seg", W - 20, yy - 75, W - 110, yy - 30, "ramp"))
            self.add(("spin", cx, yy, 76, self.rnd.choice([-1, 1]) * self.rnd.uniform(2.0, 3.4), self.rnd.uniform(0, 3.14)))
            side = not side
        return y + k * 180 + 60

    def _funnel(self, y):
        g = BR + 8
        gx = self.rnd.uniform(170, W - 170)
        self.add(("seg", 20, y, gx - g, y + 160, "ramp"))
        self.add(("seg", W - 20, y, gx + g, y + 160, "ramp"))
        self.add(("seg", gx - g, y + 160, gx - g, y + 200, "wall"))
        self.add(("seg", gx + g, y + 160, gx + g, y + 200, "wall"))
        return y + 220

    def _split(self, y):
        self.add(("seg", 270, y, 200, y + 70, "ramp"))
        self.add(("seg", 270, y, 340, y + 70, "ramp"))
        self.add(("seg", 270, y + 30, 270, y + 440, "wall"))
        pr = 8
        sx = 2 * pr + _gap()
        lo, hi = 20 + pr + _gap(), 270 - pr - _gap()
        for r in range(4):                                   # voie gauche : clous
            x = lo + (sx / 2 if r % 2 else 0)
            while x <= hi:
                self.add(("peg", x, y + 130 + r * 72, pr))
                x += sx
        for k in range(3):                                   # voie droite : petites rampes
            yy = y + 115 + k * 105
            if k % 2 == 0:
                self.add(("seg", 270, yy, W - 20 - _gap() - 12, yy + 45, "ramp"))
            else:
                self.add(("seg", W - 20, yy, 270 + _gap() + 12, yy + 45, "ramp"))
        return y + 460

    def _pads(self, y):
        self.add(("seg", 20, y + 60, 190, y + 130, "pad"))
        self.add(("seg", W - 20, y + 230, W - 190, y + 300, "pad"))
        for x in (300, 380):
            self.add(("bump", x, y + 125, 16))
        for x in (160, 240):
            self.add(("bump", x, y + 285, 16))
        return y + 340

    def _bumpers(self, y):
        pts: list = []
        n = self.rnd.randint(3, 5)
        for _ in range(60):
            if len(pts) >= n:
                break
            r = self.rnd.choice([20, 24, 28])
            x = self.rnd.uniform(20 + r + _gap(), W - 20 - r - _gap())
            yy = y + self.rnd.uniform(60, 360)
            if all(math.hypot(x - a, yy - b) >= r + c + _gap() for a, b, c in pts):
                pts.append((x, yy, r))
        for x, yy, r in pts:
            self.add(("bump", x, yy, r))
        return y + 420

    def _cross(self, y):
        k = self.rnd.randint(1, 2)
        for i in range(k):
            yy = y + 110 + i * 190
            cx = self.rnd.uniform(165, W - 165)
            w = self.rnd.choice([-1, 1]) * self.rnd.uniform(1.4, 2.6)
            ph = self.rnd.uniform(0, 3.14)
            self.add(("spin", cx, yy, 68, w, ph))
            self.add(("spin", cx, yy, 68, w, ph + math.pi / 2))
        return y + k * 190 + 90

    def cut(self, fy):
        """Ligne d'arrivée en fy : on retire ce qui est en dessous et on pose un bac de réception."""
        keep = []
        for o in self.obs:
            ys = (o[2], o[4]) if o[0] == "seg" else (o[2],)
            if min(ys) <= fy + 20 or (o[0] == "seg" and o[5] == "wall" and min(ys) <= fy + 400):
                keep.append(o)
        self.obs = keep
        self.add(("seg", 20, fy + 150, 270, fy + 215, "floor"))
        self.add(("seg", W - 20, fy + 150, 270, fy + 215, "floor"))

    def index(self):
        self.buckets: dict[int, list] = {}
        for o in self.obs:
            if o[0] == "seg":
                y0, y1 = min(o[2], o[4]) - BR, max(o[2], o[4]) + BR
            else:
                y0, y1 = o[2] - o[3] - BR, o[2] + o[3] + BR
            for k in range(int(y0 // BUCKET), int(y1 // BUCKET) + 1):
                self.buckets.setdefault(k, []).append(o)


class _Race:
    def __init__(self, course: _Course, gate: float = 0.9):
        self.c = course
        self.balls = [_Ball(i, 205 + i * 65, 195.0) for i in range(3)]
        self.t = 0.0
        self.gate = gate
        self.events: list = []

    def step(self, finish=None):
        t = self.t = self.t + BDT
        for b in self.balls:
            if b.done is not None and finish is not None and b.y > finish + 260:
                continue
            b.vy += BG_ * BDT
            b.x += b.vx * BDT
            b.y += b.vy * BDT
            if t < self.gate and b.y > 222:                       # barrière de départ
                b.y, b.vy = 222.0, 0.0
            for o in self.c.buckets.get(int(b.y // BUCKET), ()):
                kind = o[0]
                if kind == "seg":
                    e, fr = {"pad": (1.1, 0.99), "wall": (0.45, 0.995), "floor": (0.2, 0.97)}.get(o[5], (0.3, 0.998))
                    imp = _seg_hit(b, o[1], o[2], o[3], o[4], e, fr)
                    if imp > 160:
                        self.events.append(("pad" if o[5] == "pad" else "hit", b.i, imp, o))
                elif kind in ("peg", "bump"):
                    dx, dy = b.x - o[1], b.y - o[2]
                    d = math.hypot(dx, dy)
                    rr = BR + o[3]
                    if 0 < d < rr:
                        nx, ny = dx / d, dy / d
                        b.x, b.y = o[1] + nx * rr, o[2] + ny * rr
                        vn = b.vx * nx + b.vy * ny
                        if vn < 0:
                            if kind == "peg":
                                b.vx -= 1.55 * vn * nx
                                b.vy -= 1.55 * vn * ny
                            else:                                   # champignon : rebond qui relance
                                k = -vn * 1.9 + 90
                                b.vx += k * nx
                                b.vy += k * ny
                            if -vn > 110 or kind == "bump":
                                self.events.append((kind, b.i, -vn, o))
                else:
                    cx, cy, hl, w, ph = o[1:]
                    a = ph + w * t
                    ca, sa = math.cos(a), math.sin(a)
                    px, py = b.x - cx, b.y - cy
                    imp = _seg_hit(b, cx - ca * hl, cy - sa * hl, cx + ca * hl, cy + sa * hl, 0.55, 0.99, -w * py, w * px)
                    if imp > 120:
                        self.events.append(("spin", b.i, imp, o))
            sp = math.hypot(b.vx, b.vy)
            if sp > 1400:
                b.vx, b.vy = b.vx / sp * 1400, b.vy / sp * 1400
            # anti-blocage : immobile depuis 1 s, ou plus aucune descente depuis 3,5 s (elle tourne en rond)
            if math.hypot(b.x - b.ax, b.y - b.ay) > BR * 0.8:
                b.ax, b.ay, b.at = b.x, b.y, t
            if b.y > b.best + 25:
                b.best, b.tbest, b.nudges = b.y, t, 0
            if t > self.gate + 0.5 and b.done is None and (t - b.at > 1.0 or t - b.tbest > 3.5):
                b.nudges += 1
                if b.nudges >= 4:                                 # vraiment coincée : on la dépose juste en dessous
                    b.y += 3 * BR
                    b.x = W / 2 + (b.x - W / 2) * 0.5
                    b.vx, b.vy = 0.0, 200.0
                else:                                             # pichenette de plus en plus forte, côté alterné
                    side = 1 if (b.x < W / 2) == (b.nudges % 2 == 1) else -1
                    b.vx = side * (300.0 + 160 * b.nudges)
                    b.vy = -(320.0 + 120 * b.nudges)
                b.tbest = b.at = t
                b.ax, b.ay = b.x, b.y
            if finish is not None and b.done is None and b.y >= finish:
                b.done = t
                self.events.append(("finish", b.i, 0, None))
        bs = self.balls                                             # chocs entre billes
        for i in range(3):
            for j in range(i + 1, 3):
                a, b = bs[i], bs[j]
                dx, dy = b.x - a.x, b.y - a.y
                d = math.hypot(dx, dy)
                if 0 < d < 2 * BR:
                    nx, ny = dx / d, dy / d
                    o = (2 * BR - d) / 2
                    a.x, a.y, b.x, b.y = a.x - nx * o, a.y - ny * o, b.x + nx * o, b.y + ny * o
                    rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
                    if rv < 0:
                        jv = -1.85 * rv / 2
                        a.vx, a.vy = a.vx - jv * nx, a.vy - jv * ny
                        b.vx, b.vy = b.vx + jv * nx, b.vy + jv * ny
                        if -rv > 100:
                            self.events.append(("bump2", i, -rv, None))


def _score(course, until):
    """Rejoue la course sans dessin : (score, y de la tête au temps « until »)."""
    r = _Race(course)
    lead, changes, n, deepest = None, 0, 0, 0.0
    sample = int(0.25 / BDT)
    while r.t < until:
        r.step()
        r.events.clear()
        n += 1
        deepest = max(deepest, max(b.y for b in r.balls))    # point le plus bas atteint (une bille peut rebondir vers le haut)
        if n % sample == 0 and r.t > 2:
            ys = sorted(((b.y, b.i) for b in r.balls), reverse=True)
            if lead is None:
                lead = ys[0][1]
            elif ys[0][1] != lead and ys[0][0] - ys[1][0] > 18:
                lead, changes = ys[0][1], changes + 1
    ys = sorted((b.y for b in r.balls), reverse=True)
    gap = ys[0] - ys[1]
    return changes * 1.0 + (2.0 if gap < 120 else 1.0 if gap < 300 else 0.0) + (1.0 if ys[0] - ys[2] < 600 else 0.0), deepest


_FB: dict = {}


def _flag_ball(key: str, r: float) -> _Image.Image:
    """Bille aux couleurs d'un pays : drapeau découpé en rond, ombré comme une sphère, avec reflet."""
    from .logos import _flag_image
    rp = max(4, int(r * K))
    if (key, rp) in _FB:
        return _FB[(key, rp)]
    s = 2 * rp
    fl = _flag_image(key)
    fw = int(fl.width * s / fl.height)
    im = fl.resize((fw, s), _Image.LANCZOS).crop(((fw - s) // 2, 0, (fw - s) // 2 + s, s))
    yy, xx = np.mgrid[0:s, 0:s].astype(np.float32)
    d = np.sqrt((xx - rp + 0.5) ** 2 + (yy - rp + 0.5) ** 2) / rp
    shade = 1.0 - 0.5 * np.clip(d, 0, 1) ** 2.4
    lx, ly = (xx - s * 0.33) / rp, (yy - s * 0.28) / rp
    hl = np.exp(-(lx ** 2 + ly ** 2) / 0.045) * 0.6
    rgb = np.asarray(im, dtype=np.float32) * shade[..., None] + 255 * hl[..., None]
    alpha = np.clip((1 - d) * rp, 0, 1) * 255
    out = _Image.fromarray(np.dstack([np.clip(rgb, 0, 255), alpha]).astype(np.uint8), "RGBA")
    _ImageDraw.Draw(out).ellipse([1, 1, s - 2, s - 2], outline=(12, 12, 20, 255), width=max(2, rp // 9))
    _FB[(key, rp)] = out
    return out


def _flag_color(key: str) -> tuple:
    from .logos import _flag_image
    cols = _flag_image(key).resize((60, 40)).getcolors(5000) or []

    def score(c):
        h, s_, v = colorsys.rgb_to_hsv(*(x / 255 for x in c[1]))
        return s_ * v * math.sqrt(c[0])
    return max(cols, key=score)[1] if cols else (255, 255, 255)


def _ccol(theme: str, kind: str, y: float) -> tuple:
    if kind == "wall":
        return (70, 76, 105) if theme != "bonbon" else (110, 100, 140)
    if kind == "pad":
        return (215, 255, 70)
    if kind == "floor":
        return (150, 155, 175)
    if theme == "bonbon":
        return CANDY[int(y // 400) % len(CANDY)]
    if theme == "metal":
        return (196, 202, 218)
    if theme == "nuit":
        f = (y / 1800) % 1
        return (int(70 + 80 * f), int(120 + 60 * f), 255)
    return pal(y / 2500)


class Billes:
    def __init__(self, rnd: random.Random, audio: Audio):
        global BR, BG_
        self.rnd, self.audio = rnd, audio
        BR = float(V.get("bsize", 20))
        BG_ = float(V.get("bgrav", 1500))
        self.theme = V.get("btheme", "neon")
        mix = list(V.get("bmix", BKINDS))
        target = max(12.0, V.get("seconds", 45) - 4.5)
        best = None
        for _ in range(int(V.get("btries", 8))):                    # l'agent garde le parcours le plus disputé
            c = _Course(random.Random(rnd.random()), 280 * target + 2500, mix)
            c.index()
            sc, fy = _score(c, target)
            if best is None or sc > best[0]:
                best = (sc, c, fy)
        _, self.c, self.finish = best
        self.c.cut(self.finish)
        self.c.index()
        self.race = _Race(self.c)
        flags = V.get("bflags")
        if flags:                                                   # billes-pays
            from .logos import FLAGS
            for b, k in zip(self.race.balls, flags):
                b.name = FLAGS[k][0].upper()
                b.color = _flag_color(k)
                b.sprite, b.mini, b.dot = _flag_ball(k, BR), _flag_ball(k, 11), _flag_ball(k, 8)
        else:
            named = dict((n, c) for c, n in _NAMED)
            trio = rnd.choice([("ROUGE", "BLEU", "VERT"), ("ROUGE", "BLEU", "JAUNE"), ("ORANGE", "CYAN", "VIOLET"),
                               ("ROSE", "VERT", "BLEU"), ("JAUNE", "VIOLET", "CYAN"), ("ROUGE", "CYAN", "JAUNE"),
                               ("ORANGE", "BLEU", "VERT"), ("ROSE", "JAUNE", "CYAN")])    # couleurs bien distinctes
            for b, n in zip(self.race.balls, rnd.sample(trio, 3)):
                b.name, b.color = n, named[n]
        self.acc = 0.0
        self.cam = 0.0
        self.order: list = []
        self.done_at = None
        self.lead = None
        self.flash_over = -9.0
        self.lit: dict = {}
        self.parts = Particles()

    def step(self, t, dt):
        self.acc += dt
        r = self.race
        while self.acc >= BDT:
            self.acc -= BDT
            r.step(self.finish)
            for kind, i, imp, o in r.events:
                b = r.balls[i]
                if kind == "finish":
                    self.order.append(b)
                    self.parts.burst(b.x, self.finish, b.color, n=40, speed=380)
                    if len(self.order) == 1:
                        self.done_at = t
                    self.audio.note(t, notes()[19 if len(self.order) == 1 else 13], 0.5, 0.9, key=f"fin{i}")
                elif kind == "bump2":
                    self.audio.pop(t, 0.35, key=f"bp{i}")
                elif kind in ("pad", "bump"):
                    self.lit[id(o)] = t
                    self.audio.note(t, notes()[15 + i], 0.4, 0.5, key=f"pad{i}", gap=0.08)
                    self.parts.burst(b.x, b.y, b.color, n=8, speed=200)
                else:
                    lvl = min(1.0, imp / 700)
                    self.audio.note(t, notes()[(4 + i * 4 + int(b.y / 300)) % 15 + 2], 0.12 + 0.25 * lvl, 0.25,
                                    key=f"h{i}", gap=0.07)
            r.events.clear()
            for b in r.balls:
                b.trail.append((b.x, b.y))
                del b.trail[:-24]
        self.parts.step(dt)
        live = [b for b in r.balls if b.done is None]
        ranked = sorted(live, key=lambda b: -b.y)
        if ranked and not self.order and ranked[0] is not self.lead and t > 2:
            if self.lead is not None and len(ranked) > 1 and ranked[0].y - ranked[1].y > 10:
                self.flash_over = t
                self.audio.note(t, notes()[18], 0.3, 0.4, key="over", gap=0.4)
            self.lead = ranked[0]
        ys = sorted((b.y for b in r.balls), reverse=True)
        lead_y = min(ys[0], self.finish + 120)
        target = (lead_y + min(ys[1], self.finish + 120)) / 2 - H * 0.5
        target = max(target, lead_y - H + 190, 0.0)
        self.cam += (target - self.cam) * min(1.0, dt * 4.0)

    def _line(self, d, ax, ay, bx, by, col, w):
        dark = tuple(int(v * 0.25) for v in col)
        d.line([ax, ay, bx, by], fill=(10, 11, 18), width=w + 5)               # contour net
        d.line([ax, ay, bx, by], fill=dark if w > 9 else col, width=w)
        if w > 9:
            d.line([ax, ay, bx, by], fill=col, width=w - 5)
        d.line([ax, ay - w * 0.18, bx, by - w * 0.18], fill=tuple(min(255, int(v * 0.6 + 110)) for v in col), width=1.6)

    def _disc(self, d, x, y, r, col, lit=False):
        d.ellipse([x - r - 2.5, y - r - 2.5, x + r + 2.5, y + r + 2.5], fill=(10, 11, 18))
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255) if lit else col)
        if r > 12:
            ri = r * 0.62
            d.ellipse([x - ri, y - ri, x + ri, y + ri], fill=tuple(int(v * 0.55) for v in col))
        h = r * 0.32
        d.ellipse([x - r * 0.38 - h, y - r * 0.38 - h, x - r * 0.38 + h, y - r * 0.38 + h], fill=(255, 255, 255))

    def _paste(self, img, spr, x, y):
        img.paste(spr, (int(round(x * K - spr.width / 2)), int(round(y * K - spr.height / 2))), spr)

    def draw(self, img, t):
        d = SDraw(img)
        cam = self.cam
        y0, y1 = cam - 60, cam + H + 60
        seen = set()
        for k in range(int(y0 // BUCKET), int(y1 // BUCKET) + 1):
            for o in self.c.buckets.get(k, ()):
                if id(o) in seen:
                    continue
                seen.add(id(o))
                lit = t - self.lit.get(id(o), -9) < 0.12
                if o[0] == "seg":
                    col = (255, 255, 255) if lit else _ccol(self.theme, o[5], o[2])
                    self._line(d, o[1], o[2] - cam, o[3], o[4] - cam, col, 6 if o[5] == "wall" else 12)
                elif o[0] == "peg":
                    self._disc(d, o[1], o[2] - cam, o[3], _ccol(self.theme, "ramp", o[2] + o[1] * 3))
                elif o[0] == "bump":
                    self._disc(d, o[1], o[2] - cam, o[3], (255, 90, 160) if self.theme != "metal" else (255, 170, 60), lit)
                else:
                    cx, cy, hl, w, ph = o[1:]
                    a = ph + w * self.race.t
                    ca, sa = math.cos(a), math.sin(a)
                    c = _ccol(self.theme, "ramp", cy + 900)
                    self._line(d, cx - ca * hl, cy - sa * hl - cam, cx + ca * hl, cy + sa * hl - cam, c, 13)
                    self._disc(d, cx, cy - cam, 7, (240, 240, 250))
        fy = self.finish - cam                                       # ligne d'arrivée en damier
        if -20 < fy < H + 20:
            d.rectangle([20, fy - 13, W - 20, fy + 13], fill=(10, 11, 18))
            for k in range(25):
                for rr in range(2):
                    if (k + rr) % 2 == 0:
                        d.rectangle([20 + k * 20, fy + rr * 11 - 11, 20 + k * 20 + 10, fy + rr * 11], fill=(245, 245, 250))
        for b in self.race.balls:                                    # traînées
            tr = b.trail
            for k in range(2, len(tr), 2):
                f = k / len(tr)
                d.line([tr[k - 2][0], tr[k - 2][1] - cam, tr[k][0], tr[k][1] - cam],
                       fill=tuple(int(v * (0.25 + 0.6 * f)) for v in b.color), width=2 + BR * 0.9 * f)
        for b in self.race.balls:
            if b.sprite is not None:
                self._paste(img, b.sprite, b.x, b.y - cam)
            else:
                paste_sphere(img, b.x, b.y - cam, BR, b.color, glow=False)
        for q in self.parts.p:
            paste_sphere(img, q[0], q[1] - cam, 2 + 2.5 * q[4], q[5], glow=False)
        # classement en direct
        done = list(self.order)
        rest = sorted((b for b in self.race.balls if b not in done), key=lambda b: -b.y)
        for k, b in enumerate(done + rest):
            x = 100 + k * 170
            d.rounded_rectangle([x - 78, 128, x + 78, 172], 22, fill=(12, 13, 22), outline=b.color if k == 0 else (50, 54, 75), width=2)
            if b.mini is not None:
                self._paste(img, b.mini, x - 56, 150)
            else:
                d.ellipse([x - 67, 139, x - 45, 161], fill=b.color)
            d.text((x - 56, 150), str(k + 1), font=_font(14 * K), fill=(255, 255, 255), anchor="mm", stroke_width=2, stroke_fill=(0, 0, 0))
            sz = 19
            while sz > 11 and _font(sz * K).getlength(b.name) > 106 * K:
                sz -= 1
            d.text((x - 38, 150), b.name, font=_font(sz * K), fill=(255, 255, 255) if b.mini is not None else b.color,
                   anchor="lm", stroke_width=1, stroke_fill=(0, 0, 0))
        if t - self.flash_over < 0.9 and not self.order:
            _text(d, (W / 2, 208), "DÉPASSEMENT !", 30, (255, 230, 90))
        # mini-carte : qui est le plus près de l'arrivée
        d.line([531, 240, 531, 880], fill=(60, 64, 90), width=3)
        d.rectangle([524, 876, 538, 884], fill=(240, 240, 245))
        for b in self.race.balls:
            yy = 240 + 640 * max(0.0, min(1.0, (b.y - 200) / (self.finish - 200)))
            if b.dot is not None:
                self._paste(img, b.dot, 531, yy)
            else:
                d.ellipse([523, yy - 8, 539, yy + 8], fill=(10, 11, 18))
                d.ellipse([525, yy - 6, 537, yy + 6], fill=b.color)
        if self.done_at is not None:
            w = self.order[0]
            _text(d, (W / 2, 215), f"{w.name} GAGNE !", 44, w.color)

    def finished(self, t):
        return self.done_at is not None and t - self.done_at > 3.5


SCENES = {"billes": Billes, "pendules": Pendulums, "grossit": Grow, "dominos": Dominos, "maths": Maths}
CONCEPTS = {
    "billes": ("Course de billes", "3 billes, un parcours plein d'obstacles : laquelle passe la ligne en premier ?"),
    "pendules": ("Vague de pendules", "Des pendules dessinent des vagues hypnotiques puis se réalignent."),
    "grossit": ("La bille qui grossit", "Elle grossit à chaque rebond… jusqu'à ne plus rentrer."),
    "maths": ("Course des maths", "+32, n² ou ×2 : chaque bille frappe avec sa valeur. Laquelle arrive en bas en premier ?"),
    "dominos": ("Dominos en cascade", "Plus de 1000 dominos : lignes, embranchements et dessins cachés qui se révèlent."),
}
HOOKS = {
    "billes": ["Choisis ta bille avant le départ", "Qui va gagner ?", "Commente ta couleur", "Elle n'a aucune chance ?",
               "Attends le dernier virage"],
    "maths": ["Linéaire, quadratique ou exponentielle ?", "Qui arrive en bas en premier ?", "Choisis ta bille avant la fin",
              "Tu paries sur laquelle ?"],
    "pendules": ["Regarde la vague se former", "Attends le réalignement", "Impossible de décrocher", "Hypnotique"],
    "grossit": ["Combien de rebonds avant qu'elle bloque ?", "Elle va exploser ?", "Devine le nombre de rebonds"],
    "dominos": ["Devine ce que les dominos dessinent", "Attends de voir les dessins", "Pas un seul ne doit rater",
                "Combien de dessins cachés ?"],
}
CAPTIONS = {
    "billes": "Quelle bille gagne ? Choisis ta couleur avant la fin 👇 #marblerace #course",
    "maths": "Linéaire, quadratique ou exponentielle ? 🤯 Qui gagne la course ? Dis-le en commentaire 👇 #math #maths",
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
    if concept == "billes":
        from .logos import FLAGS
        v = {"bsize": rnd.choice([18, 20, 22]), "bgrav": rnd.choice([1300, 1500, 1700]), "btheme": rnd.choice(BTHEMES),
             "bmix": sorted(rnd.sample(BKINDS, rnd.randint(5, len(BKINDS))))}
        if rnd.random() < 0.6:                       # billes-pays : France vs Espagne vs Congo…
            hue = {k: colorsys.rgb_to_hsv(*(x / 255 for x in _flag_color(k)))[0] for k in FLAGS}
            pick = rnd.sample(sorted(FLAGS), 3)
            for _ in range(80):                      # 3 pays aux couleurs principales bien différentes
                if all(min(abs(hue[a] - hue[b]), 1 - abs(hue[a] - hue[b])) > 0.12 for a in pick for b in pick if a < b):
                    break
                pick = rnd.sample(sorted(FLAGS), 3)
            v["bflags"] = pick
        return v
    if concept == "maths":
        return {"mcols": rnd.choice([3, 3, 4]), "mbars": rnd.choice([5, 6, 7, 8]), "mk": rnd.randint(7, 99),
                "mpoly": rnd.choice(["sq", "tri", "cube"]), "mhue": round(rnd.random(), 2),
                "mcross": rnd.choice([0.45, 0.55, 0.62, 0.7]), "mstyle": rnd.choice(["neon", "plein", "verre"])}
    if concept == "dominos":
        return {"drate": rnd.choice([28.0, 32.0, 36.0])}
    if concept == "tri":
        return {"bars": rnd.choice([32, 48, 64]), "algo": rnd.choice(list(ALGO_NAMES)), "sortdur": rnd.choice([20.0, 24.0])}
    return {}
