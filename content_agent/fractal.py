"""Calcul de la fractale de Mandelbrot pour le concept « Infini » (zoom hypnotique sans fin).

Le calcul tourne en numba (gratuit, local, sur tous les cœurs du processeur). Sans numba, une version
numpy plus lente prend le relais.
"""
from __future__ import annotations

import math

import numpy as np

try:
    from numba import njit, prange
    HAVE_NUMBA = True
except ImportError:  # pragma: no cover
    HAVE_NUMBA = False


if HAVE_NUMBA:
    @njit(parallel=True, fastmath=True, cache=True)
    def _kernel(cx, cy, step, w, h, maxit, lx, ly, mu, nx, ny):
        R2 = 1e6
        for j in prange(h):
            y0 = cy + (j - h / 2 + 0.5) * step
            for i in range(w):
                x0 = cx + (i - w / 2 + 0.5) * step
                # cardioïde et bulbe principal : intérieur, inutile d'itérer
                q = (x0 - 0.25) ** 2 + y0 * y0
                if q * (q + (x0 - 0.25)) <= 0.25 * y0 * y0 or (x0 + 1) ** 2 + y0 * y0 <= 0.0625:
                    mu[j, i] = -1.0
                    continue
                zx = 0.0
                zy = 0.0
                dx = 0.0
                dy = 0.0
                px = 0.0
                py = 0.0
                per = 8
                k = 0
                out = False
                while k < maxit:
                    # dérivée : dz = 2 z dz + 1
                    ndx = 2 * (zx * dx - zy * dy) + 1
                    dy = 2 * (zx * dy + zy * dx)
                    dx = ndx
                    nzx = zx * zx - zy * zy + x0
                    zy = 2 * zx * zy + y0
                    zx = nzx
                    k += 1
                    m2 = zx * zx + zy * zy
                    if m2 > R2:
                        out = True
                        break
                    if abs(zx - px) < 1e-17 and abs(zy - py) < 1e-17:   # cycle : point intérieur
                        break
                    if k == per:
                        px = zx
                        py = zy
                        per *= 2
                if not out:
                    mu[j, i] = -1.0
                    continue
                lz = 0.5 * math.log(m2)
                mu[j, i] = k + 1 - math.log(lz / math.log(2.0)) / math.log(2.0)
                # normale pour l'éclairage 3D : u = z / dz
                d2 = dx * dx + dy * dy
                ux = (zx * dx + zy * dy) / d2
                uy = (zy * dx - zx * dy) / d2
                n = math.sqrt(ux * ux + uy * uy) + 1e-300
                nx[j, i] = ux / n
                ny[j, i] = uy / n


def compute(cx: float, cy: float, width: float, w: int, h: int, maxit: int):
    """Renvoie (mu, nx, ny) : itération lissée (-1 = intérieur) et normale de surface."""
    mu = np.empty((h, w), np.float64)
    nx = np.zeros((h, w), np.float64)
    ny = np.zeros((h, w), np.float64)
    step = width / w
    if HAVE_NUMBA:
        _kernel(cx, cy, step, w, h, maxit, 0.0, 0.0, mu, nx, ny)
        return mu, nx, ny
    xs = cx + (np.arange(w) - w / 2 + 0.5) * step
    ys = cy + (np.arange(h) - h / 2 + 0.5) * step
    c = xs[None, :] + 1j * ys[:, None]
    z = np.zeros_like(c)
    dz = np.zeros_like(c)
    mu[:] = -1
    alive = np.ones(c.shape, bool)
    for k in range(1, maxit + 1):
        dz[alive] = 2 * z[alive] * dz[alive] + 1
        z[alive] = z[alive] ** 2 + c[alive]
        esc = alive & (np.abs(z) > 1e3)
        if esc.any():
            lz = np.log(np.abs(z[esc]))
            mu[esc] = k + 1 - np.log(lz / np.log(2)) / np.log(2)
            u = z[esc] / dz[esc]
            u /= np.abs(u)
            nx[esc], ny[esc] = u.real, u.imag
            alive &= ~esc
        if not alive.any():
            break
    return mu, nx, ny


def iters_for(width: float) -> int:
    """Plus on zoome, plus il faut d'itérations pour voir les détails."""
    z = max(1.0, 3.0 / width)
    return int(min(12000, 300 + 120 * math.log2(z) + 2.2 * math.log2(z) ** 2))


def find_target(cx: float, cy: float, width: float, depth: float, rnd) -> tuple[float, float]:
    """Choisit un point du bord de la fractale où il y a des détails à TOUTES les échelles : on descend
    par paliers (×4) en restant à chaque fois sur un point très « profond » (beaucoup d'itérations mais
    hors de l'ensemble) près du centre. Le hasard (rnd) donne un chemin différent à chaque vidéo."""
    g = 96
    while width > depth:
        mu, _, _ = compute(cx, cy, width, g, g, iters_for(width))
        yy, xx = np.mgrid[0:g, 0:g]
        r = np.hypot(xx - g / 2, yy - g / 2) / (g / 2)
        ok = (mu > 0) & (r < 0.35)
        if not ok.any():
            ok = (mu > 0) & (r < 0.8)
        if not ok.any():
            break
        score = np.where(ok, mu, -1)
        flat = np.argsort(score.ravel())[::-1][:6]
        pick = flat[rnd.randrange(min(len(flat), 3 if width > 1e-3 else 2))]
        j, i = divmod(int(pick), g)
        cx += (i - g / 2 + 0.5) * width / g
        cy += (j - g / 2 + 0.5) * width / g
        width /= 4
    return cx, cy


def misiurewicz(c0: complex, k: int, p: int, iters: int = 60) -> complex | None:
    """Point de Misiurewicz (pré-périodique : l'orbite de 0 retombe sur un cycle). Autour de lui la fractale
    est auto-similaire : des spirales et des détails à TOUTES les échelles, sans fond noir qui envahit tout,
    et le calcul reste léger même très profond. Newton sur f^(k+p)(c) - f^k(c) = 0."""
    c = c0
    for _ in range(iters):
        z, dz = 0j, 0j
        zk = dzk = 0j
        for n in range(1, k + p + 1):
            dz = 2 * z * dz + 1
            z = z * z + c
            if n == k:
                zk, dzk = z, dz
            if abs(z) > 1e10:
                return None
        g, dg = z - zk, dz - dzk
        if dg == 0:
            return None
        step = g / dg
        c -= step
        if abs(step) < 1e-17 * max(1.0, abs(c)):
            break
    else:
        return None
    # rejette les centres de minibrots (orbite qui repasse par 0) et les orbites qui s'échappent
    z = 0j
    for n in range(1, 400):
        z = z * z + c
        if abs(z) > 2:
            return None
        if abs(z) < 1e-9:
            return None
    return c


REGIONS = [(-0.745, 0.11, 0.05), (-0.1, 0.95, 0.12), (0.28, 0.01, 0.04), (-1.25, 0.03, 0.08), (-0.17, 1.03, 0.04),
           (0.36, 0.6, 0.1), (-1.77, 0.01, 0.04), (-0.56, 0.64, 0.06), (0.43, 0.22, 0.08), (-1.4, 0.0, 0.05),
           (-0.04, 0.68, 0.05), (-0.7, 0.3, 0.06)]


def pick_target(rnd, depth: float = 2e-12, tries: int = 3000, avoid: tuple = ()) -> tuple[complex, dict] | None:
    """Trouve un point de Misiurewicz au hasard dans une jolie région, vérifié : du détail et des
    couleurs à toutes les profondeurs du zoom."""
    for _ in range(tries):
        x, y, s = rnd.choice(REGIONS)
        y = y * rnd.choice([1, -1])
        g = 40
        mu, _, _ = compute(x, y, s, g, g, 400)
        ok = mu > 0
        if ok.sum() < 20 or (mu < 0).sum() < 10:
            continue
        thr = np.percentile(mu[ok], 85)
        cand = np.argwhere(mu >= thr)
        j, i = cand[rnd.randrange(len(cand))]
        c0 = complex(x + (i - g / 2 + 0.5) * s / g, y + (j - g / 2 + 0.5) * s / g)
        c = misiurewicz(c0, rnd.randint(3, 22), rnd.randint(1, 8))
        if c is None or abs(c - c0) > s or any(abs(c - a) < 0.12 for a in avoid) or abs(c.imag) < 1e-6:
            continue
        stats = []
        good = True
        for w in (s / 4, 1e-5, 1e-8, depth):
            m, _, _ = compute(c.real, c.imag, w, 32, 32, iters_for(w))
            e = m[m > 0]
            inside = float((m < 0).mean())
            if len(e) < 200 or inside > 0.6 or np.ptp(e) < 2:
                good = False
                break
            stats.append((round(float(e.min())), round(float(e.max())), round(inside, 2)))
        if good:
            return c, {"stats": stats, "s": s}
    return None


def _hsv2rgb(h, s, v):
    i = np.floor(h * 6).astype(np.int32) % 6
    f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    r = np.choose(i, [v, q, p, p, t, v])
    g = np.choose(i, [t, v, v, q, p, p])
    b = np.choose(i, [p, p, t, v, v, q])
    return r, g, b


def colorize(mu, nx, ny, hue0: float = 0.0, hs: float = 0.012, light: float = 0.8, gems: float = 1.0) -> np.ndarray:
    """Couleurs « trippy » : teinte selon la profondeur (le fond change de couleur en zoomant), arc-en-ciel
    sur le bord, relief 3D brillant (lumière + reflet) qui donne l'effet « bijoux »."""
    out = mu > 0
    m = np.where(out, mu, 1.0)
    hue = (hue0 + m * hs + 0.06 * np.log(m)) % 1.0
    vx, vy, h2 = math.cos(light * math.pi), math.sin(light * math.pi), 1.4
    t = np.clip((nx * vx + ny * vy + h2) / (1 + h2), 0, 1)
    spec = t ** 24 * gems
    v = 0.35 + 0.65 * t
    s = np.clip(0.95 - 0.55 * spec, 0, 1)
    r, g, b = _hsv2rgb(hue, s, np.clip(v + 0.35 * spec, 0, 1))
    rgb = np.stack([r, g, b], -1)
    rgb[~out] = 0
    return (np.clip(rgb, 0, 1) * 255).astype(np.uint8)


def nucleus(c0: complex, p: int, iters: int = 80) -> complex | None:
    """Centre d'une mini-fractale (« minibrot ») de période p : f^p(0) = 0. En plongeant vers lui, on traverse
    spirales et bijoux puis on tombe sur une copie noire de la fractale (comme les vidéos virales)."""
    c = c0
    for _ in range(iters):
        z, dz = 0j, 0j
        for _ in range(p):
            dz = 2 * z * dz + 1
            z = z * z + c
            if abs(z) > 1e10:
                return None
        if dz == 0:
            return None
        step = z / dz
        c -= step
        if abs(step) < 1e-16 * max(1.0, abs(c)):
            break
    else:
        return None
    z = 0j                                                   # période minimale p (sinon c'est un autre bulbe)
    for n in range(1, p):
        z = z * z + c
        if abs(z) < 1e-9:
            return None
    return c


def pick_black(rnd, avoid: tuple = (), tries: int = 2500) -> tuple[complex, dict] | None:
    """Plongée qui reste longtemps près du NOIR : on vise une mini-fractale au bord de la grande, et la plongée
    s'arrête quand la mini-fractale noire remplit l'écran (~40 %)."""
    for _ in range(tries):
        x, y, s = rnd.choice(REGIONS)
        y = y * rnd.choice([1, -1])
        g = 40
        mu, _, _ = compute(x, y, s, g, g, 400)
        ok = mu > 0
        if ok.sum() < 20 or (mu < 0).sum() < 10:
            continue
        thr = np.percentile(mu[ok], 80)
        cand = np.argwhere(mu >= thr)
        j, i = cand[rnd.randrange(len(cand))]
        c0 = complex(x + (i - g / 2 + 0.5) * s / g, y + (j - g / 2 + 0.5) * s / g)
        c = nucleus(c0, rnd.randint(5, 40))
        if c is None or abs(c - c0) > s or abs(c.imag) < 1e-6 or any(abs(c - a) < 0.12 for a in avoid):
            continue
        w, w_end = s, None
        while w > 2e-11:                                     # où la mini-fractale noire remplit l'écran ?
            m, _, _ = compute(c.real, c.imag, w, 40, 40, iters_for(w))
            if float((m < 0).mean()) >= 0.38:
                w_end = w
                break
            w /= 2
        if w_end is None or s / w_end < 2 ** 12:             # trop court : peu de spectacle
            continue
        return c, {"s": s, "w_end": w_end}
    return None
