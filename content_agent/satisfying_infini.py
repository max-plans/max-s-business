"""Concept « Infini » : zoom hypnotique sans fin dans la fractale de Mandelbrot.

Comme les vidéos « trippy art » virales : on plonge vers un point du bord de la fractale, le fond change de
couleur en permanence, des « bijoux » brillants en relief défilent, des spirales apparaissent... et ça ne
s'arrête jamais. Chaque vidéo plonge vers un point différent (choisi au hasard et vérifié), avec ses couleurs.

Technique : on calcule une image clé à chaque fois que le zoom double (1,5x la définition de la vidéo), puis
chaque image de la vidéo est un recadrage de l'image clé, avec la suivante (plus nette) collée au centre.
Le son : une nappe douce + une note à chaque palier franchi (une mélodie qui descend dans l'infini).
"""
from __future__ import annotations

import math
import random

import numpy as np
from PIL import Image

from . import fractal
from . import satisfying as S
from .satisfying import FPS, H, K, SS, V, W, _notes

OW, OH = W * K // SS, H * K // SS          # 1080 x 1920
KS = 1.5                                   # définition des images clés (x1,5 : net partout, même en bord d'image)
if not fractal.HAVE_NUMBA:                 # sans numba (calcul lent) : images clés plus légères
    KS = 0.6
KW, KH = int(OW * KS), int(OH * KS)
W0 = 3.2                                   # largeur de départ (toute la fractale)
DEPTH = 6e-13                              # limite de précision des nombres (float64) : ~42 doublements de zoom

IKITS = ["piano", "rhodes", "kalimba", "boite", "marimba", "guitare"]


def variant(rnd: random.Random) -> dict:
    return {"iseed": rnd.randrange(10 ** 6), "ihs": round(rnd.uniform(0.007, 0.016), 4), "ilight": round(rnd.uniform(0.15, 0.85), 2),
            "ihue": round(rnd.random(), 2), "ispin": round(rnd.choice([0.0, 0.015, 0.03, -0.02]), 3),
            "igem": rnd.choice([0.7, 1.0, 1.3]), "kit": rnd.choice(IKITS), "bed": "nappe"}


class Infini:
    direct = True              # la scène fournit directement l'image finale (pas de fond, pas de physique)

    def __init__(self, rnd: random.Random, audio):
        self.audio = audio
        self.sec = float(V.get("seconds", 60))
        r = random.Random(V.get("iseed", rnd.randrange(10 ** 6)))
        got = fractal.pick_target(r, DEPTH)
        if got is None:                                            # filet de sécurité : point connu et vérifié
            got = (complex(0.28389329468061625, -0.009760398440230331), {})
        self.c = got[0]
        self.lmax = math.log2(W0 / DEPTH)
        # vitesse du zoom (en doublements / s) : démarrage rapide (accroche), puis des vagues lentes / rapides
        ts = np.linspace(0, self.sec, int(self.sec * FPS) + 1)
        v = 1 + 0.38 * np.sin(2 * np.pi * ts / 9.0 + 0.6) + 1.6 * np.exp(-ts / 1.6)
        L = np.concatenate([[0], np.cumsum((v[1:] + v[:-1]) / 2 * np.diff(ts))])
        self.L = L / L[-1] * (self.lmax - 1.05)
        self.ts = ts
        self.keys: dict[int, Image.Image] = {}
        self.done_at = None
        self.hue = float(V.get("ihue", 0.0))
        self._sound()

    # ------------------------------------------------------------ son
    def _sound(self):
        notes = S.NOTES or _notes("pentatonique", 220.0)
        seq = [notes[i % len(notes)] * (2 ** (i // len(notes))) for i in range(len(notes) * 2)]
        melody = seq + seq[-2:0:-1]                              # monte puis redescend, en boucle
        for k in range(1, int(self.lmax)):
            t = float(np.interp(k, self.L, self.ts))
            if t >= self.sec:
                break
            f = melody[k % len(melody)]
            self.audio.note(t, f, vol=0.3, dur=1.1, key=f"fin{k % 2}")
            th = float(np.interp(k + 0.5, self.L, self.ts))      # petite note d'écho à mi-palier
            if th < self.sec:
                self.audio.note(th, f * 1.5, vol=0.12, dur=0.8, key=f"fin_e{k % 2}")

    # ------------------------------------------------------------ images
    def _key(self, k: int) -> Image.Image:
        if k not in self.keys:
            w = W0 / 2 ** k
            mu, nx, ny = fractal.compute(self.c.real, self.c.imag, w, KW, KH, fractal.iters_for(w))
            rgb = fractal.colorize(mu, nx, ny, hue0=self.hue, hs=V.get("ihs", 0.012), light=V.get("ilight", 0.8),
                                   gems=V.get("igem", 1.0))
            self.keys[k] = Image.fromarray(rgb)
            for old in [x for x in self.keys if x < k - 1]:
                del self.keys[old]
        return self.keys[k]

    def level(self, tv: float) -> float:
        return float(np.interp(tv, self.ts, self.L))

    def frame(self, tv: float) -> Image.Image:
        lv = self.level(tv)
        k = int(lv)
        r = 2 ** (lv - k)                                        # 1 → 2 : zoom dans l'image clé k
        a = self._key(k)
        cw, ch = KW / r, KH / r
        x0, y0 = (KW - cw) / 2, (KH - ch) / 2
        img = a.resize((OW, OH), Image.BICUBIC, box=(x0, y0, x0 + cw, y0 + ch))
        b = self._key(k + 1)                                     # la suivante, 2x plus nette, au centre
        sw, sh = round(OW * r / 2), round(OH * r / 2)
        small = b.resize((sw, sh), Image.BILINEAR)
        img.paste(small, ((OW - sw) // 2, (OH - sh) // 2))
        spin = V.get("ispin", 0.0)
        if spin:                                                 # les couleurs tournent doucement (effet hypnotique)
            img = _hue_rotate(img, tv * spin * 2 * math.pi)
        return img

    # ------------------------------------------------------------ interface commune des scènes
    def step(self, t: float, dt: float):
        pass

    def draw(self, img, t: float):
        pass

    def finished(self, t: float) -> bool:
        return t >= self.sec


def _hue_rotate(img: Image.Image, a: float) -> Image.Image:
    """Rotation de teinte (matrice RGB → RGB, calcul fait en C par Pillow : très rapide)."""
    c, s = math.cos(a), math.sin(a)
    k = 1 / 3
    sq = math.sqrt(k)
    m = [[c + (1 - c) * k, k * (1 - c) - sq * s, k * (1 - c) + sq * s],
         [k * (1 - c) + sq * s, c + k * (1 - c), k * (1 - c) - sq * s],
         [k * (1 - c) - sq * s, k * (1 - c) + sq * s, c + k * (1 - c)]]
    return img.convert("RGB", (*m[0], 0, *m[1], 0, *m[2], 0))


SCENES = {"infini": Infini}
CONCEPTS = {"infini": ("Infini", "Un zoom hypnotique sans fin dans une fractale : couleurs qui changent, bijoux en relief, spirales.")}
HOOKS = {"infini": ["Ça ne s'arrête jamais", "Tu tiens combien de temps ?", "Zoom infini", "Essaie de ne pas cligner des yeux",
                    "Plus tu regardes, plus ça descend", "Regarde jusqu'au bout"]}
CAPTIONS = {"infini": "Ça ne s'arrête jamais 🌀 Tu as tenu jusqu'où ? Mets le son 🔊 #fractale #trippy #hypnotique #mandelbrot"}
