"""Fruits « kawaii » premium : rendu 3D éclairé (diffus, reflet brillant, contre-jour), motifs propres
à chaque fruit, tige / feuilles / couronne, petit visage mignon. RGBA prémultiplié float32."""
import math

import cv2
import numpy as np

NAMES = ["Cerise", "Fraise", "Raisin", "Citron", "Orange", "Pomme", "Pêche", "Ananas", "Melon", "Pastèque"]
GLOW = [(255, 60, 90), (255, 70, 80), (190, 100, 255), (255, 235, 90), (255, 160, 40),
        (255, 80, 70), (255, 170, 140), (255, 210, 70), (190, 255, 120), (90, 255, 120)]
JUICE = [(200, 10, 40), (240, 40, 60), (150, 60, 200), (250, 230, 80), (255, 150, 20),
         (250, 240, 200), (255, 190, 120), (255, 220, 90), (200, 240, 140), (255, 70, 90)]
GLOSS = [1.0, 0.7, 0.9, 0.55, 0.5, 0.9, 0.25, 0.35, 0.3, 0.6]
L = np.array([-0.5, -0.65, 0.57])
L /= np.linalg.norm(L)


def _noise(rng, n, scale):
    g = rng.standard_normal((max(2, n // scale), max(2, n // scale))).astype(np.float32)
    return cv2.resize(g, (n, n), interpolation=cv2.INTER_CUBIC)


def fruit(lv, r, ss=3, seed=3, face=True):
    rng = np.random.default_rng(seed + lv)
    R = r * ss
    n = int(2.9 * R) // 2 * 2
    c = n / 2
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    x, y = (xx - c) / R, (yy - c) / R
    d2 = x * x + y * y
    z = np.sqrt(np.clip(1 - d2, 0, 1))
    body_a = np.clip((1 - np.sqrt(d2)) * R + 0.5, 0, 1)
    col = np.zeros((n, n, 3), np.float32)
    nz = _noise(rng, n, max(4, int(R / 6)))
    fine = cv2.GaussianBlur(_noise(rng, n, max(2, int(R / 30))), (0, 0), max(1.0, R / 60))
    ang = np.arctan2(y, x)
    if lv == 0:      # cerise
        col[:] = np.array([200, 18, 45]) / 255
        col *= (0.85 + 0.15 * nz[..., None] * 0.5)[..., :1]
    elif lv == 1:    # fraise
        col[:] = np.array([235, 40, 55]) / 255
        seeds = np.zeros((n, n), np.float32)
        step = 0.28
        for iy, sy in enumerate(np.arange(-1.1, 1.1, step * 0.87)):
            for sx in np.arange(-1.1, 1.1, step):
                px, py = sx + (iy % 2) * step / 2, sy
                if px * px + py * py < 0.85:
                    cv2.ellipse(seeds, (int(c + px * R), int(c + py * R)), (max(1, int(R * 0.035)), max(1, int(R * 0.055))),
                                0, 0, 360, 1.0, -1, cv2.LINE_AA)
        col = col * (1 - seeds[..., None]) + np.array([255, 225, 110]) / 255 * seeds[..., None]
    elif lv == 2:    # raisin
        col[:] = np.array([125, 55, 170]) / 255
        bloom = np.clip(fine * 0.5 + 0.5, 0, 1) * 0.25
        col = col * (1 - bloom[..., None]) + np.array([210, 190, 235]) / 255 * bloom[..., None]
    elif lv == 3:    # citron
        col[:] = np.array([255, 222, 55]) / 255
        col *= (0.92 + 0.08 * np.clip(fine, -1, 1))[..., None]
    elif lv == 4:    # orange
        col[:] = np.array([255, 140, 18]) / 255
        col *= (0.9 + 0.1 * np.clip(fine, -1, 1))[..., None]
    elif lv == 5:    # pomme
        t = np.clip(0.5 + 0.5 * nz * 0.6 + 0.25 * y, 0, 1)
        col = (np.array([220, 30, 45]) / 255) * (1 - t[..., None] * 0.35) + np.array([250, 200, 80]) / 255 * (t[..., None] * 0.35)
        streak = np.clip(np.sin(ang * 22 + nz * 2) * 0.5 + 0.5, 0, 1) * 0.12
        col *= (1 - streak[..., None])
    elif lv == 6:    # pêche
        t = np.clip(0.5 - 0.45 * x + 0.35 * y + nz * 0.15, 0, 1)
        col = np.array([255, 205, 140]) / 255 * (1 - t[..., None]) + np.array([245, 95, 100]) / 255 * t[..., None]
        crease = np.exp(-((x + 0.25 * np.sin(y * 2.2)) ** 2) / 0.0025) * (y < 0.6) * 0.35
        col *= (1 - crease[..., None])
    elif lv == 7:    # ananas
        col[:] = np.array([240, 175, 40]) / 255
        a1 = np.abs(((x + y) * 5.5) % 1 - 0.5)
        a2 = np.abs(((x - y) * 5.5) % 1 - 0.5)
        line = np.clip((0.07 - np.minimum(a1, a2)) / 0.03, 0, 1)
        col = col * (1 - line[..., None] * 0.55) + np.array([140, 85, 10]) / 255 * line[..., None] * 0.55
        dots = np.clip((0.12 - np.hypot(a1 - 0.5, a2 - 0.5) * 0 - np.hypot(a1, a2)) / 0.04, 0, 1)
        col = col * (1 - dots[..., None] * 0.5) + np.array([255, 230, 120]) / 255 * dots[..., None] * 0.5
    elif lv == 8:    # melon (filet)
        col[:] = np.array([175, 215, 105]) / 255
        net = np.zeros((n, n), np.float32)
        for _ in range(int(60)):
            p0 = rng.uniform(-1, 1, 2)
            p1 = p0 + rng.uniform(-0.45, 0.45, 2)
            cv2.line(net, (int(c + p0[0] * R), int(c + p0[1] * R)), (int(c + p1[0] * R), int(c + p1[1] * R)), 1.0,
                     max(1, int(R * 0.025)), cv2.LINE_AA)
        net = cv2.GaussianBlur(net, (0, 0), R * 0.006 + 0.5)
        col = col * (1 - net[..., None] * 0.6) + np.array([240, 245, 210]) / 255 * net[..., None] * 0.6
    else:            # pastèque
        stripes = np.clip(np.sin(x * 9 / np.maximum(z, 0.25) ** 0.3 + nz * 1.4) * 1.8, -1, 1) * 0.5 + 0.5
        col = np.array([18, 95, 35]) / 255 * stripes[..., None] + np.array([95, 175, 60]) / 255 * (1 - stripes[..., None])
    # éclairage
    ndl = np.clip(x * L[0] + y * L[1] + z * L[2], 0, 1)
    col = col * (0.32 + 0.82 * ndl[..., None])
    hv = L + np.array([0, 0, 1.0])
    hv /= np.linalg.norm(hv)
    spec = np.clip(x * hv[0] + y * hv[1] + z * hv[2], 0, 1) ** 45
    col += spec[..., None] * GLOSS[lv] * 0.9
    soft = np.clip(x * hv[0] + y * hv[1] + z * hv[2], 0, 1) ** 8
    col += soft[..., None] * GLOSS[lv] * 0.12
    rim = (1 - z) ** 2.5 * np.clip(-(x * L[0] + y * L[1]) + 0.3, 0, 1)
    col += rim[..., None] * np.array(GLOW[lv]) / 255 * 0.5
    ao = 1 - 0.35 * (1 - z) ** 4
    col *= ao[..., None]
    img = np.dstack([np.clip(col, 0, 1.4) * body_a[..., None], body_a]).astype(np.float32)

    deco = np.zeros((n, n, 4), np.float32)

    def stroke(pts, color, w):
        layer = np.zeros((n, n), np.float32)
        cv2.polylines(layer, [np.array(pts, np.int32)], False, 1.0, max(1, int(w)), cv2.LINE_AA)
        _over(deco, layer, np.array(color, np.float32) / 255)

    def poly(pts, color, shade=True):
        layer = np.zeros((n, n), np.float32)
        cv2.fillPoly(layer, [np.array(pts, np.int32)], 1.0, cv2.LINE_AA)
        cc = np.array(color, np.float32) / 255
        if shade:
            g = np.clip(0.75 + 0.45 * (-(yy - c) / R - (xx - c) / R * 0.3), 0.5, 1.2)
            _over(deco, layer, cc[None, None] * g[..., None], raw=True)
        else:
            _over(deco, layer, cc)

    top = (c, c - R * 0.93)
    if lv in (0, 5, 6, 4, 2):                                          # tige
        h = R * (0.9 if lv == 0 else 0.35)
        pts = [(top[0] + R * 0.02 * k, top[1] - h * k / 10 + (R * 0.12 if lv == 0 else 0) * math.sin(k / 10 * 2.5)) for k in range(11)]
        pts = [(px + (R * 0.25 * (k / 10) ** 2 if lv == 0 else 0), py) for k, (px, py) in enumerate(pts)]
        stroke(pts, (110, 75, 35) if lv != 0 else (95, 150, 50), R * (0.07 if lv == 0 else 0.09))
    if lv in (5, 6, 4, 0):                                             # feuille
        bx, by = top[0] + R * (0.05 if lv != 0 else 0.3), top[1] - R * (0.2 if lv != 0 else 0.75)
        lw, lh = R * (0.5 if lv != 0 else 0.42), R * 0.22
        pts = [(bx + lw * t, by - lh * math.sin(t * math.pi) - lw * 0.25 * t) for t in np.linspace(0, 1, 16)]
        pts += [(bx + lw * t, by + lh * 0.6 * math.sin(t * math.pi) - lw * 0.25 * t) for t in np.linspace(1, 0, 16)]
        poly(pts, (70, 170, 60))
        stroke([(bx, by), (bx + lw * 0.95, by - lw * 0.24)], (40, 110, 35), R * 0.025)
    if lv == 1:                                                        # collerette de la fraise : 6 feuilles en étoile
        cx0, cy0 = top[0], top[1] + R * 0.08
        for k in range(6):
            a = math.radians(195 + k * 30)
            ln = R * 0.5
            tip = (cx0 + math.cos(a) * ln * 1.15, cy0 - math.sin(a) * ln * 0.55)
            wv = R * 0.13
            pa = (cx0 + math.cos(a + 1.5) * wv, cy0 - math.sin(a + 1.5) * wv * 0.5)
            pb = (cx0 + math.cos(a - 1.5) * wv, cy0 - math.sin(a - 1.5) * wv * 0.5)
            poly([pa, tip, pb], (55 + k * 6, 160 + k * 4, 50))
        stroke([(cx0, cy0), (cx0 + R * 0.05, cy0 - R * 0.3)], (80, 140, 50), R * 0.07)
    if lv == 7:                                                        # couronne de l'ananas
        for k in range(7):
            a = (k - 3) / 3 * 0.75
            ln = R * (0.75 - abs(k - 3) * 0.1)
            bx = top[0] + (k - 3) * R * 0.09
            tip = (bx + math.sin(a) * ln, top[1] + R * 0.1 - math.cos(a) * ln)
            poly([(bx - R * 0.09, top[1] + R * 0.15), tip, (bx + R * 0.09, top[1] + R * 0.15)], (55 + k * 8, 150 + k * 6, 55))
    if face:
        ex = R * 0.3
        ey = c + R * 0.05
        er = R * 0.11
        for sx in (-1, 1):
            layer = np.zeros((n, n), np.float32)
            cv2.ellipse(layer, (int(c + sx * ex), int(ey)), (int(er * 0.85), int(er * 1.15)), 0, 0, 360, 1.0, -1, cv2.LINE_AA)
            _over(deco, layer, (0.08, 0.05, 0.08))
            layer = np.zeros((n, n), np.float32)
            cv2.circle(layer, (int(c + sx * ex - er * 0.3), int(ey - er * 0.45)), max(1, int(er * 0.38)), 1.0, -1, cv2.LINE_AA)
            _over(deco, layer, (1, 1, 1))
            layer = np.zeros((n, n), np.float32)                       # joues roses
            cv2.ellipse(layer, (int(c + sx * ex * 1.45), int(ey + er * 1.9)), (int(er * 1.1), int(er * 0.55)), 0, 0, 360, 1.0, -1, cv2.LINE_AA)
            layer = cv2.GaussianBlur(layer, (0, 0), er * 0.3) * 0.45
            _over(deco, layer, (1.0, 0.45, 0.55))
        layer = np.zeros((n, n), np.float32)                           # sourire
        cv2.ellipse(layer, (int(c), int(ey + er * 1.3)), (int(er * 1.0), int(er * 0.75)), 0, 15, 165, 1.0, max(1, int(er * 0.32)), cv2.LINE_AA)
        _over(deco, layer, (0.08, 0.05, 0.08))
    a = deco[..., 3:4]
    img = img * (1 - a) + deco
    img = cv2.resize(img, (n // ss, n // ss), interpolation=cv2.INTER_AREA)
    return img.astype(np.float32)


def _over(dst, alpha, color, raw=False):
    a = alpha[..., None]
    cc = color if raw else np.array(color, np.float32)[None, None]
    dst[..., :3] = dst[..., :3] * (1 - a) + cc * a
    dst[..., 3:4] = dst[..., 3:4] * (1 - a) + a


def glow(r, color, strength=1.0, size=2.2):
    n = int(2 * r * size)
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    d = np.sqrt((xx - n / 2) ** 2 + (yy - n / 2) ** 2) / r
    g = np.exp(-np.clip(d - 0.9, 0, None) ** 2 * 2.2) * (d > 0.7) + np.exp(-d * d * 0.25) * 0.15
    return (np.array(color, np.float32)[None, None] / 255 * (g * strength)[..., None]).astype(np.float32)
