"""Concept « Fusion perso » : le style des vidéos virales « every merge = new … ».

Fond noir, fiole ronde au contour néon, toujours le même petit objet qui tombe par le goulot, deux identiques
qui se touchent fusionnent en l'objet suivant (anneau fin, « bloop », note de musique), et la voix dit
TOUJOURS LE MÊME MOT, de plus en plus grave, avec des effets complètement « WTF ».

Les objets sont TES images (data/fusion_perso, du plus petit au plus gros) ; sans image, des fruits.
Le mot est choisi dans l'appli ; vide = un mot qui va avec les objets (« Planète », « Fruit »…).
"""
from __future__ import annotations

import json
import math
import random
import re
import subprocess
from pathlib import Path

import numpy as np

from ..paths import DATA

DIR = DATA / "fusion_perso"
CFG = DIR / "config.json"
MAX_IMAGES = 12
DEFAULT_WORD = ""                                     # vide = un mot qui va avec les objets
AUTO_WORD = {"planetes": "Planète", "fruits": "Fruit", "images": "Wahou"}
THEMES = {"planetes": "Planètes en gelée", "fruits": "Fruits"}
FPS = 60


# ------------------------------------------------------------------ réglages : images + mot
def _cfg() -> dict:
    try:
        c = json.loads(CFG.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        c = {}
    c.setdefault("word", DEFAULT_WORD)
    c.setdefault("order", [])
    c.setdefault("theme", "planetes")
    files = {p.name for p in DIR.glob("*.png")} if DIR.exists() else set()
    c["order"] = [f for f in c["order"] if f in files] + sorted(files - set(c["order"]))
    return c


def _save(c: dict) -> None:
    DIR.mkdir(parents=True, exist_ok=True)
    CFG.write_text(json.dumps({"word": c["word"], "order": c["order"], "theme": c.get("theme", "planetes")}, ensure_ascii=False, indent=1), encoding="utf-8")


def listing() -> dict:
    c = _cfg()
    return {"word": c["word"], "auto_word": spoken_word(c), "theme": c["theme"], "images": [{"id": f, "level": i + 1} for i, f in enumerate(c["order"])], "max": MAX_IMAGES}


def add_image(img, name: str = "") -> str:
    from PIL import Image
    c = _cfg()
    if len(c["order"]) >= MAX_IMAGES:
        raise ValueError(f"{MAX_IMAGES} images maximum.")
    img = img.convert("RGBA")
    img.thumbnail((900, 900), Image.LANCZOS)
    stem = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:30] or "image"
    k = 1
    while (DIR / f"{stem}-{k}.png").exists():
        k += 1
    DIR.mkdir(parents=True, exist_ok=True)
    fname = f"{stem}-{k}.png"
    img.save(DIR / fname)
    c["order"].append(fname)
    _save(c)
    return fname


def remove_image(fid: str) -> None:
    c = _cfg()
    if fid in c["order"]:
        (DIR / fid).unlink(missing_ok=True)
        c["order"].remove(fid)
        _save(c)


def move_image(fid: str, delta: int) -> None:
    c = _cfg()
    if fid in c["order"]:
        i = c["order"].index(fid)
        j = max(0, min(len(c["order"]) - 1, i + delta))
        c["order"].insert(j, c["order"].pop(i))
        _save(c)


def spoken_word(c: dict) -> str:
    """Le mot dit à chaque fusion : le tien, sinon un mot qui a du sens avec les objets."""
    if c.get("word"):
        return c["word"]
    if len(c.get("order", [])) >= 3:
        return AUTO_WORD["images"]
    return AUTO_WORD.get(c.get("theme", "planetes"), "Wahou")


def set_theme(theme: str) -> None:
    c = _cfg()
    c["theme"] = theme if theme in THEMES else "planetes"
    _save(c)


def set_word(word: str) -> None:
    c = _cfg()
    c["word"] = (word or "").strip()[:40]
    _save(c)


def image_path(fid: str) -> Path | None:
    p = DIR / Path(fid).name
    return p if p.exists() else None


# ------------------------------------------------------------------ sprites
def _user_sprite(path: Path, r: float):
    """Image de l'utilisateur → sprite RGBA prémultiplié (float) qui tient dans le cercle physique.
    Avec transparence : on garde la silhouette. Sans transparence : on la découpe en rond (« sticker »)."""
    import cv2
    from PIL import Image
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im)[..., 3]
    if a.min() > 250:                                          # pas de transparence : pastille ronde
        s = min(im.size)
        im = im.crop(((im.width - s) // 2, (im.height - s) // 2, (im.width + s) // 2, (im.height + s) // 2))
        arr = np.asarray(im).astype(np.float32) / 255
        n = arr.shape[0]
        yy, xx = np.mgrid[0:n, 0:n]
        d = np.hypot(xx - n / 2 + 0.5, yy - n / 2 + 0.5) / (n / 2)
        arr[..., 3] = np.clip((1 - d) * n / 2, 0, 1)
    else:
        bbox = im.getbbox()
        im = im.crop(bbox)
        arr = np.asarray(im).astype(np.float32) / 255
    h, w = arr.shape[:2]
    size = 2 * r * 1.12                                        # léger débord : plus vivant
    k = size / max(h, w)
    nw, nh = max(2, int(w * k)), max(2, int(h * k))
    arr = cv2.resize(arr, (nw, nh), interpolation=cv2.INTER_AREA if k < 1 else cv2.INTER_CUBIC)
    side = int(math.hypot(nw, nh)) + 4                         # toile carrée assez grande pour tourner
    out = np.zeros((side, side, 4), np.float32)
    y0, x0 = (side - nh) // 2, (side - nw) // 2
    out[y0:y0 + nh, x0:x0 + nw] = arr
    out[..., :3] *= out[..., 3:4]
    return out


def _sprites(sim, files: list[Path], theme: str, tex: int = 7) -> tuple[list, list, bool]:
    """Renvoie (sprites, couleurs des particules, rotation ?)."""
    if files:
        spr = [_user_sprite(f, float(sim.rad(lv))) for lv, f in enumerate(files)]
        cols = []
        for sp in spr:                                       # couleur moyenne de l'image (pour les éclats)
            a = sp[..., 3:4]
            m = (sp[..., :3].sum((0, 1)) / max(1e-6, float(a.sum()))).clip(0, 1)
            cols.append(tuple(float(v) for v in (0.4 + 0.6 * m)))
        return spr, cols, True
    if theme == "fruits":
        from . import fruits as Fr
        pick = {3: [0, 4, 9], 4: [0, 3, 5, 9], 5: [0, 1, 4, 8, 9], 6: [0, 1, 3, 5, 8, 9], 7: [0, 1, 3, 4, 5, 8, 9]}
        keys = pick.get(sim.nlv, list(range(10))[: sim.nlv])
        return ([Fr.fruit(k, float(sim.rad(lv)), face=False, seed=tex) for lv, k in enumerate(keys)],
                [tuple(v / 255 for v in Fr.GLOW[k]) for k in keys], True)
    from . import jelly as J                                 # planètes en gelée (le reflet reste en haut : pas de rotation)
    pick = {3: [0, 4, 9], 4: [0, 2, 4, 9], 5: [0, 2, 4, 7, 9], 6: [0, 2, 3, 4, 7, 9], 7: [0, 2, 3, 4, 6, 7, 9],
            8: [0, 1, 2, 3, 4, 6, 7, 9], 9: [0, 1, 2, 3, 4, 5, 6, 7, 9]}
    keys = pick.get(sim.nlv, list(range(10))[: sim.nlv])
    return ([J.planet(k, float(sim.rad(lv)), seed=tex) for lv, k in enumerate(keys)],
            [tuple(v / 255 for v in J.PAL[k][2]) for k in keys], False)


# ------------------------------------------------------------------ rendu
FLASKS = [((0.15, 0.85, 1.0), (0.45, 0.3, 1.0), (1.0, 0.25, 0.85)),      # cyan → violet → rose
          ((1.0, 0.55, 0.15), (1.0, 0.25, 0.45), (0.75, 0.25, 1.0)),     # orange → framboise → violet
          ((0.3, 1.0, 0.55), (0.15, 0.75, 1.0), (0.4, 0.35, 1.0)),       # menthe → azur → indigo
          ((1.0, 0.85, 0.3), (1.0, 0.45, 0.2), (1.0, 0.2, 0.55)),        # or → corail → rose
          ((0.85, 0.75, 1.0), (1.0, 0.7, 0.9), (0.95, 0.85, 1.0)),       # lavande pastel (comme les « jelly »)
          ((0.2, 0.6, 1.0), (0.2, 1.0, 0.85), (0.6, 1.0, 0.3)),          # bleu → turquoise → citron vert
          ((1.0, 0.3, 0.3), (1.0, 0.65, 0.2), (1.0, 0.95, 0.4))]         # rouge → orange → jaune


def _flask_layer(W, H, cols=FLASKS[0]):
    import cv2

    from . import sim as S
    ss = 2
    line = np.zeros((H * ss, W * ss, 3), np.float32)
    th = 7 * ss
    cx, cy, R, nk = S.FCX * ss, S.FCY * ss, (S.FR + 6) * ss, (S.NECK + 6) * ss
    a0 = math.asin(nk / R)
    cyan, violet, pink = (np.array(v) for v in cols)
    n = 400
    pts = [(cx + R * math.cos(-math.pi / 2 - a0 - k / (n - 1) * (2 * math.pi - 2 * a0)),
            cy + R * math.sin(-math.pi / 2 - a0 - k / (n - 1) * (2 * math.pi - 2 * a0))) for k in range(n)]
    for k in range(n - 1):
        u = k / (n - 1)
        c = cyan + (violet - cyan) * (u / 0.5) if u < 0.5 else violet + (pink - violet) * ((u - 0.5) / 0.5)
        cv2.line(line, (int(pts[k][0]), int(pts[k][1])), (int(pts[k + 1][0]), int(pts[k + 1][1])), c.tolist(), th, cv2.LINE_AA)
    ytop = cy - math.sqrt(R ** 2 - nk ** 2)
    cv2.line(line, (int(cx - nk), 0), (int(cx - nk), int(ytop)), cyan.tolist(), th, cv2.LINE_AA)
    cv2.line(line, (int(cx + nk), 0), (int(cx + nk), int(ytop)), pink.tolist(), th, cv2.LINE_AA)
    line = cv2.resize(line, (W, H), interpolation=cv2.INTER_AREA)
    return line + cv2.GaussianBlur(line, (0, 0), 9) * 0.9 + cv2.GaussianBlur(line, (0, 0), 3) * 0.6


def _blend(dst, src, x, y):
    h, w = src.shape[:2]
    x0, y0 = int(round(x - w / 2)), int(round(y - h / 2))
    ax0, ay0 = max(0, x0), max(0, y0)
    ax1, ay1 = min(dst.shape[1], x0 + w), min(dst.shape[0], y0 + h)
    if ax1 <= ax0 or ay1 <= ay0:
        return
    s = src[ay0 - y0:ay1 - y0, ax0 - x0:ax1 - x0]
    d = dst[ay0:ay1, ax0:ax1]
    d *= 1 - s[..., 3:4]
    d += s[..., :3]


def _glow_add(frame, x, y, half, draw, corner=False):
    """Dessine (via `draw(patch, centre)`) sur un petit calque AJOUTÉ à l'image : lumineux, jamais sale."""
    half = int(half) + 2
    x0, y0 = int(x) - half, int(y) - half
    patch = np.zeros((2 * half, 2 * half, 3), np.float32)
    draw(patch, (half, half) if not corner else None)
    ax0, ay0 = max(0, x0), max(0, y0)
    ax1, ay1 = min(frame.shape[1], x0 + 2 * half), min(frame.shape[0], y0 + 2 * half)
    if ax1 > ax0 and ay1 > ay0:
        frame[ay0:ay1, ax0:ax1] += patch[ay0 - y0:ay1 - y0, ax0 - x0:ax1 - x0]


def _word_audio(word: str, ai_voice: bool):
    """Le mot dit une fois (voix IA ElevenLabs si activée, sinon voix gratuite), en tableau numpy."""
    from .. import satisfying as Sat
    from .. import satisfying_more as M
    Sat.V["vai"] = ai_voice
    x = M._speak(word + " !")
    return (x, Sat.SR) if x is not None else (None, Sat.SR)


def render(out: Path, seconds: float = 20, seed: int | None = None, progress=None, ai_voice: bool = False) -> dict:
    from ..deps import ensure
    if progress:
        progress(1, "Vérification des modules…")
    ensure("cv2", "scipy")                                    # installés automatiquement s'ils manquent
    import cv2

    from . import sim as S
    from . import sound
    c = _cfg()
    files = [DIR / f for f in c["order"]]
    files = files if len(files) >= 3 else []
    rnd = random.Random(seed)
    if progress:
        progress(2, "Calcul du timing (le dernier arrive juste avant la fin)…")
    sd, nlv = S.plan(len(files) or None, seconds, rnd)
    sim = S.Sim(sd, nlv, 0.0) if files else S.Sim(sd, nlv, 0.0, r0=S.FIX_R0, gr=S.FIX_GR)
    sim.prefill()
    spr, pcol, spin = _sprites(sim, files, c["theme"], rnd.randrange(10 ** 6))   # motifs différents à chaque vidéo
    W, H = S.W, S.H
    flask = _flask_layer(W, H, rnd.choice(FLASKS))           # nuances différentes à chaque vidéo
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".video.mp4")
    ff = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
                           "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", str(tmp)],
                          stdin=subprocess.PIPE)
    events, rings, final_t = [], [], None
    parts = []                                                 # petits éclats colorés à chaque fusion
    prng = np.random.default_rng(sd)
    frames = int(seconds * FPS)
    try:
        for f in range(frames):
            tv = f / FPS
            speed = 0.45 if final_t is not None and tv - final_t < 1.0 else 1.0     # petit ralenti sur le final
            sim.step(speed / FPS)
            for kind, lv, x, y, _ in sim.events:
                events.append({"k": kind, "lv": int(lv), "x": float(x), "y": float(y), "t": tv})
                if kind == "merge":
                    rings.append((x, y, tv, float(sim.rad(lv))))
                    for _ in range(8 + 2 * lv):
                        an = prng.uniform(0, 6.283)
                        sp_ = prng.uniform(60, 220) * (1 + lv * 0.15)
                        parts.append([x + math.cos(an) * sim.rad(lv) * 0.8, y + math.sin(an) * sim.rad(lv) * 0.8,
                                      math.cos(an) * sp_, math.sin(an) * sp_, prng.uniform(0.6, 1.2), pcol[lv], prng.uniform(4, 9)])
                    if lv == nlv - 1 and final_t is None:
                        final_t = tv
            sim.events.clear()
            frame = np.zeros((H, W, 3), np.float32)
            for i in np.argsort(sim.lv)[::-1]:
                lv = int(sim.lv[i])
                age = sim.t - sim.born[i]
                sc = 1 - 0.25 * math.exp(-age * 12) * math.cos(age * 30) if age < 0.4 else 1.0
                sp = spr[lv]
                h, w = sp.shape[:2]
                M = cv2.getRotationMatrix2D((w / 2, h / 2), -math.degrees(sim.rot[i]) if spin else 0.0, sc)
                q = float(sim.sq[i])                               # écrasement « gelée »
                if sim.vy[i] > 250 and sim.free[i]:                # en pleine chute : légèrement étiré (vitesse)
                    q -= 0.05 * min(1.0, (sim.vy[i] - 250) / 700)
                if abs(q) > 0.005:
                    M[0] *= 1 + q
                    M[1] *= 1 - q
                    M[:, 2] += np.array([w / 2, h / 2]) - M[:, :2] @ np.array([w / 2, h / 2]) - M[:, 2]
                _blend(frame, cv2.warpAffine(sp, M, (w, h), flags=cv2.INTER_LINEAR, borderValue=0), sim.x[i], sim.y[i])
            keep = []
            for x, y, t0, r in rings:                              # anneau fin qui s'agrandit et s'efface
                a = tv - t0
                if a > 0.55:
                    continue
                keep.append((x, y, t0, r))
                k = 1 - a / 0.55
                rr = int(r * (1.05 + a * 1.3))
                _glow_add(frame, x, y, rr + 6, lambda pt, c0, rr=rr, k=k: cv2.circle(pt, c0, rr, (0.75 * k, 0.65 * k, 0.8 * k), 3, cv2.LINE_AA))
            rings = keep
            alive = []
            for p in parts:                                        # éclats hexagonaux qui dérivent et s'effacent
                p[4] -= 1 / FPS
                if p[4] <= 0:
                    continue
                p[0] += p[2] / FPS
                p[1] += p[3] / FPS
                p[2] *= 0.97
                p[3] *= 0.97
                k = min(1.0, p[4] * 1.5) * 0.8
                sz = p[6]
                hexa = np.array([[int(sz) + 4 + sz * math.cos(a_), int(sz) + 4 + sz * math.sin(a_)] for a_ in np.linspace(0, 6.283, 7)[:-1]], np.int32)
                _glow_add(frame, p[0], p[1], int(sz) + 2, lambda pt, c0, hexa=hexa, k=k, col=p[5]: cv2.fillConvexPoly(
                    pt, hexa, tuple(v * k for v in col), cv2.LINE_AA), corner=True)
                alive.append(p)
            parts = alive
            frame += flask
            ff.stdin.write((np.clip(frame, 0, 1) * 255).astype(np.uint8).tobytes())
            if progress and f % FPS == 0:
                progress(5 + int(f / frames * 85), f"Image {f}/{frames}")
    finally:
        ff.stdin.close()
        ff.wait()
    if progress:
        progress(92, f"La voix dit « {spoken_word(c)} »…")
    word, wsr = _word_audio(spoken_word(c), ai_voice)
    wav = out.with_suffix(".wav")
    sound.build(events, final_t, seconds, nlv, word, wsr, wav)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(tmp), "-i", str(wav), "-c:v", "copy", "-c:a", "aac", "-b:a", "256k",
                    "-shortest", str(out)], check=True)
    tmp.unlink(missing_ok=True)
    wav.unlink(missing_ok=True)
    return {"duration": seconds, "final": final_t, "levels": nlv, "word": spoken_word(c), "custom": bool(files)}
