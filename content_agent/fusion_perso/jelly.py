"""Planètes « en gelée » (style des vidéos virales « jelly planets ») : couleurs très saturées, tourbillons
marbrés, bord lumineux, gros reflet brillant, halo coloré, anneaux translucides. RGBA prémultiplié float32."""
import math

import cv2
import numpy as np

NAMES = ["Lune", "Mercure", "Mars", "Vénus", "Terre", "Neptune", "Uranus", "Saturne", "Jupiter", "Soleil"]
# (couleur sombre, couleur claire, couleur du halo, style)
PAL = [((70, 72, 82), (215, 215, 225), (190, 195, 215), "craters"),
       ((120, 70, 40), (230, 170, 110), (255, 170, 90), "swirl"),
       ((150, 20, 5), (255, 95, 35), (255, 70, 30), "swirl"),
       ((200, 80, 0), (255, 200, 60), (255, 150, 30), "swirl"),
       ((10, 60, 170), (60, 170, 255), (80, 170, 255), "earth"),
       ((15, 35, 160), (90, 140, 255), (70, 110, 255), "bands"),
       ((0, 130, 140), (120, 245, 235), (60, 230, 230), "smooth"),
       ((170, 120, 50), (255, 225, 150), (255, 210, 120), "bands"),
       ((150, 70, 30), (250, 205, 150), (255, 160, 90), "bands"),
       ((230, 90, 0), (255, 235, 120), (255, 170, 30), "sun")]
RINGS = {7, 6}


def _noise(rng, n, cells):
    g = rng.standard_normal((cells + 1, cells + 1)).astype(np.float32)
    return cv2.resize(g, (n, n), interpolation=cv2.INTER_CUBIC)


def _fbm(rng, n, base=3, octaves=5):
    out = np.zeros((n, n), np.float32)
    amp = 1.0
    for o in range(octaves):
        out += _noise(rng, n, base * 2 ** o) * amp
        amp *= 0.5
    return out / 1.9


def planet(lv, r, seed=7, ss=2):
    """Sprite de la planète `lv` (0..9) au rayon r (px). Toile = 2.9 r (halo compris ; 4.6 r pour les anneaux)."""
    rng = np.random.default_rng(seed * 31 + lv)
    dark, light, halo, style = PAL[lv]
    dark, light, halo = (np.array(c, np.float32) / 255 for c in (dark, light, halo))
    R = r * ss
    ring = lv in RINGS
    n = int((4.6 if ring else (3.6 if style == "sun" else 3.0)) * R) // 2 * 2
    c = n / 2
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    x, y = (xx - c) / R, (yy - c) / R
    d = np.sqrt(x * x + y * y)
    z = np.sqrt(np.clip(1 - d * d, 0, 1))
    body = np.clip((1 - d) * R + 0.5, 0, 1)
    # ---- motif (projeté sur la sphère pour l'effet de rondeur)
    m = int(2.2 * R)
    w1, w2 = _fbm(rng, m, 2, 4), _fbm(rng, m, 2, 4)
    base = _fbm(rng, m, 3, 5)
    gy, gx = np.mgrid[0:m, 0:m].astype(np.float32) / m * 2 - 1
    sx = (x / (1 + 0.35 * (1 - z))).clip(-1, 1)            # léger « bombé »
    sy = (y / (1 + 0.35 * (1 - z))).clip(-1, 1)
    u = ((sx + 1) / 2 * (m - 1)).astype(np.float32)
    v = ((sy + 1) / 2 * (m - 1)).astype(np.float32)

    def samp(img):
        return cv2.remap(img, u, v, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

    if style == "swirl":                                     # marbre tourbillonnant (domain warping)
        t = np.sin((gy * 3.2 + w1 * 2.2 + np.sin(gx * 2 + w2 * 3)) * 3.0) * 0.5 + 0.5
        t = samp(t) * 0.75 + samp(base) * 0.25
    elif style == "bands":                                   # bandes ondulées (géantes gazeuses)
        t = np.sin((gy * 7 + w1 * 1.3) * 1.6) * 0.5 + 0.5
        t = samp(t) * 0.8 + samp(base) * 0.2
    elif style == "earth":
        land = np.clip((samp(base) - 0.15) * 4, 0, 1)
        t = samp(w1) * 0.3 + 0.5
    elif style == "craters":
        t = samp(base) * 0.6 + 0.4
    elif style == "sun":
        t = np.sin((gy * 2 + w1 * 2.6 + w2) * 4) * 0.5 + 0.5
        t = samp(t) * 0.6 + samp(base) * 0.4
    else:
        t = 0.55 + samp(w1) * 0.15
    t = np.clip(t, 0, 1)
    col = dark[None, None] * (1 - t[..., None]) + light[None, None] * t[..., None]
    if style == "earth":                                     # continents verts + nuages blancs
        green = np.array([0.25, 0.75, 0.3]) * (0.7 + 0.3 * t[..., None])
        col = col * (1 - land[..., None]) + green * land[..., None]
        clouds = np.clip((samp(w2) - 0.35) * 3, 0, 1) * 0.8
        col = col * (1 - clouds[..., None]) + clouds[..., None]
    if style == "craters":
        for _ in range(9):
            cx_, cy_, cr = rng.uniform(-0.6, 0.6), rng.uniform(-0.6, 0.6), rng.uniform(0.08, 0.22)
            dd = np.sqrt((x - cx_) ** 2 + (y - cy_) ** 2) / cr
            col *= 1 - 0.28 * np.clip(1 - dd, 0, 1)[..., None] ** 0.8
    # ---- éclairage « gelée » : peu d'ombre, bord lumineux, reflet glossy
    shade = 0.78 + 0.22 * np.clip(-x * 0.5 - y * 0.6 + z * 0.6, 0, 1)
    col = col * shade[..., None]
    fres = np.clip(1 - z, 0, 1) ** 2.2
    col = col * (1 - fres[..., None] * 0.3) + (light * 0.6 + halo * 0.6)[None, None] * fres[..., None] * 0.9
    if style == "sun":
        col = col * 1.15 + 0.15
    # gros reflet en croissant (haut-gauche) + petit éclat
    hx, hy = x + 0.32, y + 0.42
    hl = np.exp(-((hx * 1.25) ** 2 + (hy * 2.1) ** 2) * 9) * (d < 0.92)
    crescent = np.exp(-((d - 0.8) ** 2) / 0.006) * np.clip(-x - y - 0.25, 0, 1)
    spark = np.exp(-((x + 0.55) ** 2 + (y + 0.12) ** 2) * 900)
    col = col + (hl * 0.75 + crescent * 0.55 + spark * 1.2)[..., None]
    col = np.clip(col, 0, 1.35)
    img = np.zeros((n, n, 4), np.float32)
    img[..., :3] = col * body[..., None]
    img[..., 3] = body
    # ---- halo coloré autour
    glow = np.exp(-np.clip(d - 1.0, 0, None) ** 2 / (0.05 if style != "sun" else 0.09)) * (d >= 0.98)
    glow = cv2.GaussianBlur(glow.astype(np.float32), (0, 0), R * 0.05 + 1)
    gk = 0.28 if style != "sun" else 0.45                    # halo discret
    img[..., :3] += (1 - body)[..., None] * glow[..., None] * halo[None, None] * gk
    img[..., 3] = np.clip(img[..., 3] + (1 - body) * glow * gk * 0.85, 0, 1)
    if ring:                                                 # anneau translucide en verre
        img = _ring(img, R, c, halo, light, x, y, body)
    out = cv2.resize(img, (n // ss, n // ss), interpolation=cv2.INTER_AREA)
    return out.astype(np.float32)


def _ring(img, R, c, halo, light, x, y, body):
    tilt = 0.32
    xr = x * math.cos(0.35) + y * math.sin(0.35)
    yr = -x * math.sin(0.35) + y * math.cos(0.35)
    e = np.sqrt(xr ** 2 + (yr / tilt) ** 2)
    band = np.clip(1 - np.abs(e - 1.65) / 0.28, 0, 1)
    edge = np.exp(-((e - 1.4) ** 2) / 0.002) + np.exp(-((e - 1.9) ** 2) / 0.002)
    a = np.clip(band * 0.45 + edge * 0.9, 0, 1)
    front = yr > 0                                          # moitié avant : par-dessus la planète
    back = ~front & (body > 0.5)
    a = np.where(back, 0, a)
    colr = halo * 0.7 + light * 0.4 + 0.15
    img[..., :3] = img[..., :3] * (1 - a[..., None] * 0.85) + colr[None, None] * a[..., None]
    img[..., 3] = np.clip(img[..., 3] + a * (1 - img[..., 3]), 0, 1)
    return img
