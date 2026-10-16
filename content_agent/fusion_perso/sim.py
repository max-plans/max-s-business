"""Physique de la fiole : toujours le même petit objet tombe par le goulot, deux identiques qui se touchent
fusionnent en l'objet suivant. Gravité « terrestre » : ça tombe vite et rien ne remonte.
Le nombre de niveaux, les tailles et le rythme s'adaptent au nombre d'images choisies."""
import math

import numpy as np

W, H = 1080, 1920
FCX, FCY, FR = 540.0, 1190.0, 500.0     # fiole ronde
NECK = 92.0                             # demi-largeur du goulot
NECK_Y = FCY - math.sqrt(FR ** 2 - NECK ** 2)
G = 3400.0                              # gravité douce : ça tombe lentement, sans jamais remonter
NECK_V = 380.0                          # dans le goulot : descente lente à vitesse constante (file régulière)
PULL = 3e5


class Sim:
    def __init__(self, seed, nlv: int, gap: float, sub: int = 8):
        self.rng = np.random.default_rng(seed)
        self.nlv = nlv
        self.gap = gap
        self.sub = sub
        # le dernier fait ~42 % du rayon de la fiole ; le premier passe dans le goulot
        self.r0 = min(58.0, 210.0 / 1.38 ** (nlv - 1))
        self.gr = (210.0 / self.r0) ** (1 / max(1, nlv - 1))
        self.x = np.zeros(0)
        self.y = np.zeros(0)
        self.vx = np.zeros(0)
        self.vy = np.zeros(0)
        self.lv = np.zeros(0, int)
        self.rot = np.zeros(0)
        self.born = np.zeros(0)
        self.fresh = np.zeros(0, bool)
        self.t = 0.0
        self.next_drop = 0.0
        self.best = 0
        self.reach = {}
        self.events = []
        self.wait = np.zeros(nlv)

    def rad(self, lv):
        return self.r0 * self.gr ** np.asarray(lv, float)

    def _add(self, x, y, vx, vy, lv, rot=None):
        self.x = np.append(self.x, x)
        self.y = np.append(self.y, y)
        self.vx = np.append(self.vx, vx)
        self.vy = np.append(self.vy, vy)
        self.lv = np.append(self.lv, lv)
        self.rot = np.append(self.rot, self.rng.uniform(0, 6.28) if rot is None else rot)
        self.born = np.append(self.born, self.t)
        self.fresh = np.append(self.fresh, rot is None)

    def _drop(self):
        x = FCX + self.rng.uniform(-3, 3)                   # presque pile au centre : une file bien droite
        self._add(x, -60.0, 0.0, NECK_V, 0)
        self.events.append(("drop", 0, x, -60.0, self.t))
        self.next_drop = self.t + self.gap                   # toujours le même rythme

    def step(self, dt):
        if self.t >= self.next_drop:
            full = len(self.y) and np.any((self.y - self.rad(self.lv) < NECK_Y - 40) & (np.abs(self.vy) < 60))
            if not full:
                self._drop()
            else:
                self.next_drop = self.t + 0.2
        cnt = np.bincount(self.lv, minlength=self.nlv) if len(self.lv) else np.zeros(self.nlv, int)
        self.wait = np.where(cnt[: self.nlv] >= 2, self.wait + dt, 0.0)
        h = dt / self.sub
        for _ in range(self.sub):
            self._substep(h)
        self.t += dt
        self._merge()

    def _substep(self, h):
        n = len(self.x)
        if not n:
            return
        r = self.rad(self.lv)
        top = self.nlv - 1
        if n > 1:                                         # aimant HORIZONTAL entre identiques (rien ne remonte)
            dx = self.x[None, :] - self.x[:, None]
            dy = self.y[None, :] - self.y[:, None]
            d = np.sqrt(dx * dx + dy * dy) + 1e-6
            same = (self.lv[:, None] == self.lv[None, :]) & (self.lv[:, None] < top)
            np.fill_diagonal(same, False)
            boost = 1 + 3.0 * np.minimum(self.wait[np.minimum(self.lv, top)], 3.0)
            a = np.where(same, PULL * boost[:, None] / np.maximum(d, 60.0), 0.0)
            self.vx += np.sum(a * dx / d, 1) * h
        self.vy += G * h
        self.vy = np.minimum(self.vy, 1500.0)              # vitesse max : chute lisible
        tube = self.y < NECK_Y - r                         # dans le goulot : file régulière, vitesse constante
        self.vy[tube] = NECK_V
        self.vx[tube] *= 0.5
        out_ = self.fresh & ~tube                          # à la sortie du goulot : part un peu à gauche ou à droite
        if out_.any():
            self.vx[out_] += self.rng.uniform(-320, 320, int(out_.sum()))
            self.fresh[out_] = False
        self.vx *= 0.9995
        self.x += self.vx * h
        self.y += self.vy * h
        self.rot += self.vx * h / r
        for _ in range(2):
            if n > 1:
                dx = self.x[None, :] - self.x[:, None]
                dy = self.y[None, :] - self.y[:, None]
                d = np.sqrt(dx * dx + dy * dy) + 1e-6
                ov = r[:, None] + r[None, :] - d
                iu = np.triu_indices(n, 1)
                m = ov[iu] > 0
                if m.any():
                    i, j = iu[0][m], iu[1][m]
                    nx, ny = dx[i, j] / d[i, j], dy[i, j] / d[i, j]
                    o = ov[i, j]
                    mi, mj = r[i] ** 2, r[j] ** 2
                    wi, wj = mj / (mi + mj), mi / (mi + mj)
                    cx = np.zeros(n)
                    cy = np.zeros(n)
                    np.add.at(cx, i, -nx * o * wi * 0.5)
                    np.add.at(cy, i, -ny * o * wi * 0.5)
                    np.add.at(cx, j, nx * o * wj * 0.5)
                    np.add.at(cy, j, ny * o * wj * 0.5)
                    self.x += cx
                    self.y += cy
                    vn = (self.vx[j] - self.vx[i]) * nx + (self.vy[j] - self.vy[i]) * ny
                    jimp = np.where(vn < 0, -1.08 * vn / (1 / mi + 1 / mj), 0.0)
                    tx, ty = -ny, nx                       # frottement : les objets roulent
                    vt = (self.vx[j] - self.vx[i]) * tx + (self.vy[j] - self.vy[i]) * ty
                    jt = -vt / (1 / mi + 1 / mj) * 0.04
                    dvx = jimp * nx + jt * tx
                    dvy = jimp * ny + jt * ty
                    np.add.at(self.vx, i, -dvx / mi)
                    np.add.at(self.vy, i, -dvy / mi)
                    np.add.at(self.vx, j, dvx / mj)
                    np.add.at(self.vy, j, dvy / mj)
            dx = self.x - FCX                              # parois : cercle + goulot
            dy = self.y - FCY
            d = np.sqrt(dx * dx + dy * dy) + 1e-9
            in_neck = (self.y < NECK_Y + r * 0.5) & (np.abs(dx) < NECK)
            out = (d > FR - r) & ~in_neck
            if out.any():
                nx, ny = dx[out] / d[out], dy[out] / d[out]
                self.x[out] = FCX + nx * (FR - r[out])
                self.y[out] = FCY + ny * (FR - r[out])
                vn = self.vx[out] * nx + self.vy[out] * ny
                hit = vn > 0
                self.vx[out] -= np.where(hit, 1.12 * vn * nx, 0)
                self.vy[out] -= np.where(hit, 1.12 * vn * ny, 0)
                self.vx[out] *= 0.995
            neck = self.y < NECK_Y + r
            lo = neck & (self.x - r < FCX - NECK)
            self.x[lo] = FCX - NECK + r[lo]
            self.vx[lo] = np.abs(self.vx[lo]) * 0.2
            hi = neck & (self.x + r > FCX + NECK)
            self.x[hi] = FCX + NECK - r[hi]
            self.vx[hi] = -np.abs(self.vx[hi]) * 0.2

    def _merge(self):
        n = len(self.x)
        if n < 2:
            return
        r = self.rad(self.lv)
        dx = self.x[None, :] - self.x[:, None]
        dy = self.y[None, :] - self.y[:, None]
        d = np.sqrt(dx * dx + dy * dy)
        same = (self.lv[:, None] == self.lv[None, :]) & (d < r[:, None] + r[None, :] + 1.5) & (self.lv[:, None] < self.nlv - 1)
        iu = np.triu_indices(n, 1)
        cand = [(i, j) for i, j in zip(*iu) if same[i, j]]
        if not cand:
            return
        cand.sort(key=lambda p: -self.lv[p[0]])
        used, kill = set(), []
        for i, j in cand:
            if i in used or j in used:
                continue
            used |= {i, j}
            kill += [i, j]
            lv = int(self.lv[i]) + 1
            x = (self.x[i] + self.x[j]) / 2
            y = max(self.y[i], self.y[j])                  # le nouveau naît en bas (pas d'envol)
            vx = (self.vx[i] + self.vx[j]) * 0.3
            vy = max(0.0, (self.vy[i] + self.vy[j]) / 2) * 0.3
            self._add(x, y, vx, vy, lv, rot=self.rot[i])
            self.events.append(("merge", lv, x, y, self.t))
            if lv > self.best:
                self.best = lv
                self.reach[lv] = self.t
        keep = np.ones(len(self.x), bool)
        keep[kill] = False
        for a in ("x", "y", "vx", "vy", "lv", "rot", "born", "fresh"):
            setattr(self, a, getattr(self, a)[keep])


def probe(seed, nlv, gap, until):
    s = Sim(seed, nlv, gap)
    while s.t < until and (nlv - 1) not in s.reach:
        s.step(1 / 60)
        s.events.clear()
    return s.reach.get(nlv - 1)


def plan(nlv: int, seconds: float, rnd) -> tuple[int, float]:
    """Choisit le rythme de chute et le tirage pour que le dernier arrive ~3,5 s avant la fin
    (comme les vidéos virales). Renvoie (graine, intervalle entre deux chutes)."""
    import time
    want = max(4.0, seconds - 3.6)
    gap = min(1.0, max(0.09, want / (1.09 * 2 ** (nlv - 1))))
    best, err, best_gap = None, 1e9, gap
    t0 = time.time()
    for k in range(16):
        if best is not None and err < 1e5 and time.time() - t0 > 45:      # assez cherché
            break
        sd = rnd.randrange(10 ** 6)
        got = probe(sd, nlv, gap, seconds)
        e = abs(got - want) if got is not None else 1e6 + k
        if e < err:
            best, err, best_gap = sd, e, gap
        if e < 1.0:
            break
        if k % 3 == 2:                                     # on recale le rythme (toujours constant) sur la cible
            gap = max(0.07, min(1.2, gap * (want / got if got else 0.8)))
    return best, best_gap
