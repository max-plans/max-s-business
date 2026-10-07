"""« Panda Boss » : mascotte du compte Argent, dessinée et animée 100 % localement.

Le panda est dessiné en vectoriel avec Pillow (aucune image externe) en plusieurs variantes :
3 poses (bras le long du corps, doigt levé, pièce d'or) × yeux ouverts/fermés × 3 positions de bouche.
L'animation (bouche synchronisée sur le volume de la voix, clignements, respiration) est assemblée par ffmpeg.
"""
from __future__ import annotations

import math
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from ..paths import CACHE_DIR

SS = 2                      # suréchantillonnage pour un rendu lisse
W, H = 900, 1150            # taille finale d'un sprite
POSES = ("idle", "point", "coin")
SPRITE_VERSION = 5

BLACK = (22, 22, 26, 255)
WHITE = (250, 250, 247, 255)
SHADE = (228, 229, 234, 255)
NAVY = (30, 30, 36, 255)      # costume noir (comme le héros des vidéos de référence)
NAVY_D = (14, 14, 18, 255)
TIE = (10, 10, 12, 255)
GOLD = (226, 183, 64, 255)
GOLD_D = (168, 128, 30, 255)
MOUTH = (92, 24, 32, 255)
TONGUE = (232, 106, 120, 255)
BLUSH = (255, 150, 160, 90)
OUT = (12, 12, 14, 255)


def _s(v: float) -> int:
    return int(round(v * SS))


def _ell(d: ImageDraw.ImageDraw, cx, cy, rx, ry, fill, outline=OUT, width=6):
    d.ellipse([_s(cx - rx), _s(cy - ry), _s(cx + rx), _s(cy + ry)], fill=fill, outline=outline, width=_s(width) if outline else 0)


def _rot_ell(img: Image.Image, cx, cy, rx, ry, angle, fill, outline=None, width=0):
    layer = Image.new("RGBA", (_s(rx * 2 + 20), _s(ry * 2 + 20)), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.ellipse([_s(10), _s(10), _s(10 + rx * 2), _s(10 + ry * 2)], fill=fill, outline=outline, width=_s(width) if outline else 0)
    layer = layer.rotate(angle, resample=Image.BICUBIC, expand=True)
    img.alpha_composite(layer, (_s(cx) - layer.width // 2, _s(cy) - layer.height // 2))


def _limb(d: ImageDraw.ImageDraw, p0, p1, width, fill):
    """Bras/manche : segment épais aux extrémités arrondies, avec contour."""
    for w, col in ((width + 12, OUT), (width, fill)):
        d.line([_s(p0[0]), _s(p0[1]), _s(p1[0]), _s(p1[1])], fill=col, width=_s(w))
        for (x, y) in (p0, p1):
            d.ellipse([_s(x - w / 2), _s(y - w / 2), _s(x + w / 2), _s(y + w / 2)], fill=col)


def _coin(d: ImageDraw.ImageDraw, cx, cy, r):
    _ell(d, cx, cy, r, r, GOLD, width=6)
    _ell(d, cx, cy, r * 0.74, r * 0.74, None, outline=GOLD_D, width=5)
    # symbole €
    d.arc([_s(cx - r * 0.42), _s(cy - r * 0.45), _s(cx + r * 0.38), _s(cy + r * 0.45)], 40, 320, fill=GOLD_D, width=_s(9))
    for dy in (-0.1, 0.1):
        d.line([_s(cx - r * 0.55), _s(cy + r * dy), _s(cx + r * 0.05), _s(cy + r * dy)], fill=GOLD_D, width=_s(7))


def draw_panda(pose: str = "idle", eyes_open: bool = True, mouth: int = 0) -> Image.Image:
    img = Image.new("RGBA", (_s(W), _s(H)), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # ---- corps / costume
    body = [(150, 1150), (165, 860), (230, 760), (450, 720), (670, 760), (735, 860), (750, 1150)]
    d.polygon([(_s(x), _s(y)) for x, y in body], fill=NAVY, outline=OUT, width=_s(6))
    # chemise blanche en V + cravate
    d.polygon([(_s(370), _s(740)), (_s(530), _s(740)), (_s(450), _s(960))], fill=WHITE, outline=OUT, width=_s(4))
    d.polygon([(_s(436), _s(760)), (_s(464), _s(760)), (_s(470), _s(792)), (_s(450), _s(800)), (_s(430), _s(792))], fill=TIE, outline=OUT, width=_s(3))
    d.polygon([(_s(442), _s(798)), (_s(458), _s(798)), (_s(468), _s(930)), (_s(450), _s(950)), (_s(432), _s(930))], fill=TIE, outline=OUT, width=_s(3))
    # revers de veste
    d.polygon([(_s(370), _s(740)), (_s(300), _s(780)), (_s(400), _s(900)), (_s(450), _s(960))], fill=NAVY_D, outline=OUT, width=_s(4))
    d.polygon([(_s(530), _s(740)), (_s(600), _s(780)), (_s(500), _s(900)), (_s(450), _s(960))], fill=NAVY_D, outline=OUT, width=_s(4))
    # pochette dorée + boutons
    d.polygon([(_s(585), _s(905)), (_s(655), _s(895)), (_s(650), _s(925)), (_s(590), _s(932))], fill=GOLD, outline=OUT, width=_s(3))
    for by in (1010, 1080):
        _ell(d, 450, by, 11, 11, GOLD_D, width=3)

    # ---- bras
    if pose in ("idle", "coin"):
        _limb(d, (205, 820), (175, 1060), 92, NAVY)
        _ell(d, 175, 1085, 58, 52, BLACK)
    if pose in ("idle", "point"):
        _limb(d, (695, 820), (725, 1060), 92, NAVY)
        _ell(d, 725, 1085, 58, 52, BLACK)
        # montre en or
        d.rounded_rectangle([_s(690), _s(1030), _s(760), _s(1052)], radius=_s(8), fill=GOLD, outline=OUT, width=_s(3))
    if pose == "point":
        _limb(d, (215, 820), (95, 640), 92, NAVY)
        _ell(d, 90, 600, 56, 56, BLACK)
        _limb(d, (90, 575), (90, 470), 30, BLACK)          # index levé
    if pose == "coin":
        _limb(d, (690, 820), (805, 660), 92, NAVY)
        _ell(d, 810, 625, 56, 56, BLACK)
        _coin(d, 800, 520, 82)

    # ---- tête
    for ex in (225, 675):                                   # oreilles
        _ell(d, ex, 190, 98, 92, BLACK)
    _ell(d, 450, 430, 305, 272, WHITE)
    _rot_ell(img, 450, 560, 230, 110, 0, SHADE)              # ombre douce sous les joues
    d = ImageDraw.Draw(img)
    _ell(d, 450, 430, 305, 272, None)                        # recontour
    for cx, ang in ((330, -28), (570, 28)):                  # taches autour des yeux
        _rot_ell(img, cx, 415, 82, 112, ang, BLACK)
    d = ImageDraw.Draw(img)
    for cx in (300, 600):                                    # joues roses
        _rot_ell(img, cx, 545, 48, 26, 0, BLUSH)
    d = ImageDraw.Draw(img)

    if eyes_open:
        for cx in (342, 558):
            _ell(d, cx, 405, 40, 42, WHITE, outline=None)
            _ell(d, cx + (6 if cx < 450 else -6), 412, 24, 26, BLACK, outline=None)
            _ell(d, cx + (14 if cx < 450 else 2), 400, 9, 9, WHITE, outline=None)
    else:
        for cx in (342, 558):
            d.arc([_s(cx - 36), _s(380), _s(cx + 36), _s(440)], 15, 165, fill=WHITE, width=_s(9))

    # lunettes rondes dorées (look « boss »)
    for cx in (342, 558):
        _ell(d, cx, 408, 66, 66, None, outline=GOLD, width=9)
    d.arc([_s(400), _s(392), _s(500), _s(430)], 200, 340, fill=GOLD, width=_s(8))
    # nez
    d.rounded_rectangle([_s(412), _s(500), _s(488), _s(545)], radius=_s(22), fill=BLACK)
    _ell(d, 438, 512, 10, 6, (90, 90, 96, 255), outline=None)
    # bouche
    if mouth == 0:
        d.arc([_s(400), _s(530), _s(452), _s(585)], 20, 160, fill=OUT, width=_s(7))
        d.arc([_s(448), _s(530), _s(500), _s(585)], 20, 160, fill=OUT, width=_s(7))
    else:
        h = 30 if mouth == 1 else 58
        _ell(d, 450, 572 + h / 3, 40 if mouth == 1 else 50, h / 2 + 8, MOUTH, width=6)
        _ell(d, 450, 580 + h / 1.6, 24, 10 + h / 6, TONGUE, outline=None)

    img = img.resize((W, H), Image.LANCZOS)
    # légère ombre portée pour détacher le panda du fond
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    shadow.putalpha(img.getchannel("A").point(lambda a: int(a * 0.45)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.alpha_composite(shadow, (8, 14))
    out.alpha_composite(img)
    return out


def sprites_dir() -> Path:
    d = CACHE_DIR / f"panda_v{SPRITE_VERSION}"
    if not (d / "idle_o_0.png").exists():
        d.mkdir(parents=True, exist_ok=True)
        for pose in POSES:
            for eo in (True, False):
                for m in (0, 1, 2):
                    draw_panda(pose, eo, m).save(d / f"{pose}_{'o' if eo else 'c'}_{m}.png")
    return d


def pose_for_scene(scene: dict, index: int) -> str:
    text = f"{scene.get('on_screen', '')} {scene.get('voice', '')}"
    if index == 0:
        return "point"
    if any(c.isdigit() for c in scene.get("on_screen", "")) or "€" in text or "euro" in text.lower():
        return "coin"
    if "?" in scene.get("on_screen", "") or "règle" in text.lower() or "!" in text:
        return "point"
    return "idle"


def build_track(envelope: np.ndarray, scene_bounds: list[tuple[float, float, str]], fps: int, total: float, out: Path) -> Path:
    """Écrit une liste ffmpeg (concat) d'images du panda, image par image."""
    d = sprites_dir()
    n = int(math.ceil(total * fps))
    rnd = random.Random(7)
    blink = np.zeros(n, dtype=bool)
    t = rnd.uniform(1.0, 3.0)
    while t < total:
        i = int(t * fps)
        blink[i:i + 4] = True
        t += rnd.uniform(2.5, 5.0)

    def pose_at(sec: float) -> str:
        for a, b, p in scene_bounds:
            if a <= sec < b:
                return p
        return "idle"

    names: list[str] = []
    for f in range(n):
        level = envelope[f] if f < len(envelope) else 0.0
        mouth = 0 if level < 0.12 else 1 if level < 0.45 else 2
        names.append(f"{pose_at(f / fps)}_{'c' if blink[f] else 'o'}_{mouth}.png")

    lines = []
    run_name, run_len = names[0], 0
    for name in names + [None]:
        if name == run_name:
            run_len += 1
            continue
        lines.append(f"file '{(d / run_name).resolve().as_posix()}'\nduration {run_len / fps:.4f}\n")
        run_name, run_len = name, 1
    lines.append(f"file '{(d / names[-1]).resolve().as_posix()}'\n")
    out.write_text("".join(lines))
    return out
