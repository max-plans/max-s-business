"""Concept « Infini » : zoom hypnotique sans fin dans la fractale de Mandelbrot.

Comme les vidéos « trippy art » virales : on plonge vers un point du bord de la fractale, le fond change de
couleur en permanence, des « bijoux » brillants en relief défilent, des spirales apparaissent... et ça ne
s'arrête jamais. Chaque vidéo plonge vers un point différent (choisi au hasard et vérifié), avec ses couleurs.

Technique : on calcule une image clé à chaque fois que le zoom double (1,5x la définition de la vidéo), puis
chaque image de la vidéo est un recadrage de l'image clé, avec la suivante (plus nette) collée au centre.
Plusieurs plongées enchaînées (un endroit et des couleurs différents toutes les ~10 s) pour ne jamais lasser.
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
KS = 1.25                                  # définition des images clés (x1,25 : net partout, calcul raisonnable)
if not fractal.HAVE_NUMBA:                 # sans numba (calcul lent) : images clés plus légères
    KS = 0.6
KW, KH = int(OW * KS), int(OH * KS)
W0 = 3.2                                   # largeur de départ (toute la fractale)
DEPTH = 6e-13                              # limite de précision des nombres (float64) : ~42 doublements de zoom

IKITS = ["piano", "rhodes", "kalimba", "boite", "marimba", "guitare"]
XF = 0.35                                  # durée du fondu entre deux plongées (s)


def variant(rnd: random.Random) -> dict:
    return {"iseed": rnd.randrange(10 ** 6), "ispeed": round(rnd.uniform(2.5, 3.2), 2), "idive": rnd.choice([9.0, 10.5, 12.0]),
            "kit": rnd.choice(IKITS), "bed": "nappe"}


class Infini:
    """Plusieurs plongées enchaînées (une toutes les ~10 s), chacune vers un endroit différent de la fractale avec
    ses propres couleurs : jamais le temps de s'habituer. Entre deux plongées : flash + fondu + son « whoosh »."""
    direct = True              # la scène fournit directement l'image finale (pas de fond, pas de physique)

    def __init__(self, rnd: random.Random, audio):
        self.audio = audio
        self.sec = float(V.get("seconds", 60))
        r = random.Random(V.get("iseed", rnd.randrange(10 ** 6)))
        n = max(2, round(self.sec / V.get("idive", 10.5)))
        lens = np.array([r.uniform(0.85, 1.15) for _ in range(n)])
        lens = lens / lens.sum() * (self.sec + XF * (n - 1))
        self.dives, t0, seen = [], 0.0, []
        for i in range(n):
            got = fractal.pick_target(r, 1e-11, avoid=tuple(seen))
            if got is None:                                        # filet de sécurité : point connu et vérifié
                got = (complex(0.28389329468061625, -0.009760398440230331), {"s": 0.04})
            c, info = got
            seen.append(c)
            w0 = W0 if i == 0 else info.get("s", 0.05) * r.uniform(0.6, 1.4)   # 1re plongée : on part de toute la fractale
            dur = float(lens[i])
            levels = min(math.log2(w0 / DEPTH) - 1.1, V.get("ispeed", 2.8) * dur)
            ts = np.linspace(0, dur, int(dur * FPS) + 2)
            ph = r.uniform(0, 6.28)
            v = 1 + 0.4 * np.sin(2 * np.pi * ts / r.uniform(3.5, 5.5) + ph)     # accélère / ralentit en vagues
            if i == 0:
                v = v + 1.2 * np.exp(-ts / 1.2)                   # accroche : ça part très vite
            L = np.concatenate([[0], np.cumsum((v[1:] + v[:-1]) / 2 * np.diff(ts))])
            self.dives.append({"c": c, "w0": w0, "t0": t0, "dur": dur, "ts": ts, "L": L / L[-1] * levels,
                               "hue": r.random(), "hs": r.uniform(0.006, 0.018), "light": r.uniform(0.1, 0.9),
                               "gem": r.choice([0.7, 1.0, 1.3]), "spin": r.choice([0.0, 0.04, -0.04, 0.08])})
            t0 += dur - XF
        self.keys: dict[tuple, Image.Image] = {}
        self.done_at = None
        self._sound(r)

    # ------------------------------------------------------------ son
    def _sound(self, r: random.Random):
        notes = S.NOTES or _notes("pentatonique", 220.0)
        seq = [notes[i % len(notes)] * (2 ** (i // len(notes))) for i in range(len(notes) * 2)]
        melody = seq + seq[-2:0:-1]                              # monte puis redescend, en boucle
        shift = [1.0, 2 ** (5 / 12), 2 ** (7 / 12), 2 ** (-2 / 12), 2 ** (3 / 12)]
        for i, d in enumerate(self.dives):                       # chaque plongée change de tonalité
            tr = shift[i % len(shift)]
            for k in range(1, int(d["L"][-1]) + 1):
                t = d["t0"] + float(np.interp(k, d["L"], d["ts"]))
                if t >= self.sec:
                    break
                self.audio.note(t, melody[k % len(melody)] * tr, vol=0.26, dur=0.9, key=f"fin{k % 2}")
            if i:                                                # passage à la plongée suivante : whoosh + coup doux
                self.audio.riser(max(0.0, d["t0"] - 0.6), d["t0"] + XF * 0.7, vol=0.12)
                self.audio.impact(d["t0"] + XF * 0.7, vol=0.3)

    # ------------------------------------------------------------ images
    def _key(self, i: int, k: int) -> Image.Image:
        if (i, k) not in self.keys:
            d = self.dives[i]
            w = d["w0"] / 2 ** k
            mu, nx, ny = fractal.compute(d["c"].real, d["c"].imag, w, KW, KH, fractal.iters_for(w))
            rgb = fractal.colorize(mu, nx, ny, hue0=d["hue"], hs=d["hs"], light=d["light"], gems=d["gem"])
            self.keys[(i, k)] = Image.fromarray(rgb)
            for old in [x for x in self.keys if x[0] < i - 1 or (x[0] == i and x[1] < k - 1)]:
                del self.keys[old]
        return self.keys[(i, k)]

    def _dive_frame(self, i: int, tv: float) -> Image.Image:
        d = self.dives[i]
        lv = float(np.interp(tv - d["t0"], d["ts"], d["L"]))
        k = int(lv)
        r = 2 ** (lv - k)                                        # 1 → 2 : zoom dans l'image clé k
        a = self._key(i, k)
        cw, ch = KW / r, KH / r
        x0, y0 = (KW - cw) / 2, (KH - ch) / 2
        img = a.resize((OW, OH), Image.BICUBIC, box=(x0, y0, x0 + cw, y0 + ch))
        b = self._key(i, k + 1)                                  # la suivante, 2x plus nette, au centre
        sw, sh = round(OW * r / 2), round(OH * r / 2)
        img.paste(b.resize((sw, sh), Image.BILINEAR), ((OW - sw) // 2, (OH - sh) // 2))
        if d["spin"]:                                            # les couleurs tournent (effet hypnotique)
            img = _hue_rotate(img, (tv - d["t0"]) * d["spin"] * 2 * math.pi)
        return img

    def frame(self, tv: float) -> Image.Image:
        i = max(j for j, d in enumerate(self.dives) if d["t0"] <= tv or j == 0)
        img = self._dive_frame(i, tv)
        if i + 1 < len(self.dives):
            nxt = self.dives[i + 1]
            if tv >= nxt["t0"]:                                  # fondu vers la plongée suivante + flash
                a = (tv - nxt["t0"]) / XF
                img = Image.blend(img, self._dive_frame(i + 1, tv), min(1.0, a))
        for d in self.dives[1:]:
            f = 1 - abs(tv - (d["t0"] + XF * 0.7)) / 0.18
            if f > 0:
                img = Image.blend(img, Image.new("RGB", img.size, (255, 255, 255)), 0.45 * f)
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
