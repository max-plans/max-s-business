"""Physique de la fiole : toujours le même petit objet tombe par le goulot, deux identiques qui se touchent
fusionnent en l'objet suivant. Gravité « terrestre » : ça tombe vite et rien ne remonte.
Le nombre de niveaux, les tailles et le rythme s'adaptent au nombre d'images choisies."""
import math

import numpy as np

W, H = 1080, 1920
FCX, FCY, FR = 540.0, 1190.0, 500.0     # fiole ronde
NECK = 92.0                             # demi-largeur du goulot
NECK_Y = FCY - math.sqrt(FR ** 2 - NECK ** 2)
G = 1700.0                              # vraie gravité (même partout) : on part à l'arrêt et on accélère
PULL = 3e5
FALL_V = 950.0            # vitesse limite (résistance de l'air) : atteinte en douceur, jamais d'arrêt net
DRAG = G / FALL_V ** 2    # frottement de l'air (quadratique, comme en vrai)
MERGE_HOLD = 0.0         # deux identiques qui se cognent fusionnent tout de suite
DROP_GAP = 0.6           # un objet toutes les 0,6 s : la file est bien espacée


class Sim:
    def __init__(self, seed, nlv: int, gap: float, sub: int = 8, r0: float | None = None, gr: float | None = None):
        self.rng = np.random.default_rng(seed)
        self.nlv = nlv
        self.gap = gap
        self.sub = sub
        # le dernier fait ~42 % du rayon de la fiole ; le premier passe dans le goulot
        self.r0 = r0 or min(58.0, 210.0 / 1.38 ** (nlv - 1))
        self.gr = gr or (210.0 / self.r0) ** (1 / max(1, nlv - 1))
        self.x = np.zeros(0)
        self.y = np.zeros(0)
        self.vx = np.zeros(0)
        self.vy = np.zeros(0)
        self.lv = np.zeros(0, int)
        self.rot = np.zeros(0)
        self.born = np.zeros(0)
        self.sq = np.zeros(0)
        self.sqv = np.zeros(0)
        self.free = np.zeros(0, bool)
        self.uid = np.zeros(0, int)
        self._next_uid = 0
        self.touch: dict = {}
        self.next_drop = 0.0
        self.t = 0.0
        self.next_drop = 0.0
        self.best = 0
        self.reach = {}
        self.events = []
        self.wait = np.zeros(nlv)

    def prefill(self):
        """La file est déjà en route à la 1re image : chaque objet est là où il serait s'il avait été lâché
        toutes les DROP_GAP secondes (même chute réaliste que pendant la vidéo)."""
        bottom = FCY + FR - self.r0 - 30
        y, v, t, k, h = -self.r0, 0.0, 0.0, 0, 1 / 480
        pts = []
        while y < bottom:
            if t >= k * DROP_GAP - 1e-9:
                pts.append((y, v))
                k += 1
            v += (G - DRAG * v * abs(v)) * h
            y += v * h
            t += h
        for y_, v_ in pts:
            self._add(FCX + self.rng.uniform(-0.8, 0.8), y_, 0.0, v_, 0)
        self.next_drop = DROP_GAP

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
        self.sq = np.append(self.sq, 0.0)
        self.sqv = np.append(self.sqv, 0.0)
        self.free = np.append(self.free, rot is None)
        self.uid = np.append(self.uid, self._next_uid)
        self._next_uid += 1

    def _drop(self):
        x = FCX + self.rng.uniform(-0.8, 0.8)                # pile au centre (comme les vidéos virales)
        self._add(x, -self.r0, 0.0, 0.0, 0)                  # lâché à l'arrêt
        self.events.append(("drop", 0, x, -self.r0, self.t))

    def step(self, dt):
        # flot régulier : un objet toutes les 0,345 s, pile au centre (si le haut n'est pas bouché)
        if self.t >= self.next_drop:
            if not len(self.y) or np.all(self.y - self.rad(self.lv) > 4):
                self._drop()
                self.next_drop = self.t + DROP_GAP
            else:
                self.next_drop = self.t + 0.05
        prev_vx, prev_vy = self.vx.copy(), self.vy.copy()
        cnt = np.bincount(self.lv, minlength=self.nlv) if len(self.lv) else np.zeros(self.nlv, int)
        self.wait = np.where(cnt[: self.nlv] >= 2, self.wait + dt, 0.0)
        h = dt / self.sub
        for _ in range(self.sub):
            self._substep(h)
        self.t += dt
        if len(self.x):                                    # effet « gelée » : ça s'écrase au choc puis rebondit
            n0 = len(prev_vx)
            dv = np.hypot(self.vx[:n0] - prev_vx, self.vy[:n0] - prev_vy)
            self.sqv[:n0] += np.minimum(dv, 900) * 0.0011
            self.sqv += (-260.0 * self.sq - 9.0 * self.sqv) * dt
            self.sq = np.clip(self.sq + self.sqv * dt, -0.22, 0.22)
        self._merge()
        if len(self.x):                                    # jamais immobile : un objet posé reçoit une petite secousse
            sp = np.hypot(self.vx, self.vy)
            rest = (sp < 70) & ~self.free & (self.y > NECK_Y)
            kick = rest & (self.rng.random(len(self.x)) < 1.6 * dt)
            if kick.any():
                k_ = int(kick.sum())
                self.vx[kick] += self.rng.uniform(-460, 460, k_)
                self.vy[kick] -= self.rng.uniform(480, 800, k_)

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
            boost = np.clip(self.wait[np.minimum(self.lv, top)] - 3.0, 0, 3.0)   # aimant seulement si une paire reste bloquée longtemps
            a = np.where(same, PULL * boost[:, None] / np.maximum(d, 60.0), 0.0)
            self.vx += np.sum(a * dx / d, 1) * h
        self.vy += (G - DRAG * self.vy * np.abs(self.vy)) * h   # gravité + résistance de l'air
        self.vx -= DRAG * self.vx * np.abs(self.vx) * h
        if self.free.any():                                # pas encore touché : descente régulière, bien droite
            self.vx[self.free] = 0.0
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
                    hit = np.zeros(n, bool)                # au premier contact, la physique normale prend le relais
                    hit[i] = True
                    hit[j] = True
                    both_free = self.free[i] & self.free[j]
                    hit[i[both_free]] = False              # deux objets de la file qui se frôlent : ils restent dans la file
                    hit[j[both_free]] = False
                    landed = hit & self.free                # vient de toucher : il glisse d'un côté (gauche ou droite)
                    if landed.any():
                        k_ = int(landed.sum())
                        self.vx[landed] += self.rng.choice([-1.0, 1.0], k_) * self.rng.uniform(180, 320, k_)
                    self.free &= ~hit
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
                    jimp = np.where(vn < 0, -1.72 * vn / (1 / mi + 1 / mj), 0.0)   # chocs bien rebondissants
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
            self.free &= ~out
            if out.any():
                nx, ny = dx[out] / d[out], dy[out] / d[out]
                self.x[out] = FCX + nx * (FR - r[out])
                self.y[out] = FCY + ny * (FR - r[out])
                vn = self.vx[out] * nx + self.vy[out] * ny
                hit = vn > 0
                self.vx[out] -= np.where(hit, 1.62 * vn * nx, 0)
                self.vy[out] -= np.where(hit, 1.62 * vn * ny, 0)
                self.vx[out] *= 0.995
            neck = self.y < NECK_Y + r
            lo = neck & (self.x - r < FCX - NECK)
            self.x[lo] = FCX - NECK + r[lo]
            self.vx[lo] = np.abs(self.vx[lo]) * 0.6
            hi = neck & (self.x + r > FCX + NECK)
            self.x[hi] = FCX + NECK - r[hi]
            self.vx[hi] = -np.abs(self.vx[hi]) * 0.6

    def _merge(self):
        n = len(self.x)
        if n < 2:
            return
        r = self.rad(self.lv)
        dx = self.x[None, :] - self.x[:, None]
        dy = self.y[None, :] - self.y[:, None]
        d = np.sqrt(dx * dx + dy * dy)
        same = (self.lv[:, None] == self.lv[None, :]) & (d < r[:, None] + r[None, :] + 7.0) & (self.lv[:, None] < self.nlv - 1)
        iu = np.triu_indices(n, 1)
        touching = [(i, j) for i, j in zip(*iu) if same[i, j]]
        # « galère » : il faut rester collés ~0,3 s pour fusionner ; un rebond et c'est raté
        now = {}
        for i, j in touching:
            key = (int(min(self.uid[i], self.uid[j])), int(max(self.uid[i], self.uid[j])))
            now[key] = self.touch.get(key, 0.0) + 1 / 60
        self.touch = now
        cand = [(i, j) for i, j in touching                 # les petits fusionnent direct (accroche rapide),
                if self.lv[i] == 0 or                       # les plus gros doivent tenir le contact
                now[(int(min(self.uid[i], self.uid[j])), int(max(self.uid[i], self.uid[j])))] >= MERGE_HOLD]
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
            vx = (self.vx[i] + self.vx[j]) * 0.3 + self.rng.choice([-1.0, 1.0]) * self.rng.uniform(120, 260)
            vy = max(0.0, (self.vy[i] + self.vy[j]) / 2) * 0.3
            self._add(x, y, vx, vy, lv, rot=self.rot[i])
            rn = float(self.rad(lv))                      # onde de choc : les voisins sont repoussés
            ddx, ddy = self.x[:-1] - x, self.y[:-1] - y
            dd = np.hypot(ddx, ddy) + 1e-6
            near = dd < 2.4 * rn
            push = np.where(near, 420 * (1 - dd / (2.4 * rn)), 0.0)
            self.vx[:-1] += push * ddx / dd
            self.vy[:-1] += push * ddy / dd
            self.events.append(("merge", lv, x, y, self.t))
            if lv > self.best:
                self.best = lv
                self.reach[lv] = self.t
        keep = np.ones(len(self.x), bool)
        keep[kill] = False
        for a in ("x", "y", "vx", "vy", "lv", "rot", "born", "sq", "sqv", "free", "uid"):
            setattr(self, a, getattr(self, a)[keep])


def probe(seed, nlv, gap, until):
    s = Sim(seed, nlv, gap)
    s.prefill()
    while s.t < until and (nlv - 1) not in s.reach:
        s.step(1 / 60)
        s.events.clear()
    return s.reach.get(nlv - 1)


FIX_R0, FIX_GR, FIX_MAX = 33.0, 1.33, 7     # objets par défaut : tailles fixes (lune ~ mesurée sur la vidéo virale)


def plan(nlv: int | None, seconds: float, rnd) -> tuple[int, int]:
    """Le rythme est fixe (une chute toutes les 0,6 s) : on choisit le tirage et, pour les objets par défaut,
    le plus grand nombre de niveaux dont le dernier arrive avant la fin. Renvoie (graine, niveaux)."""
    seeds = [rnd.randrange(10 ** 6) for _ in range(4)]
    if nlv:                                                 # tes images : le tirage qui finit le mieux
        best, err = seeds[0], 1e9
        for sd in seeds:
            got = probe(sd, nlv, 0.0, seconds)
            e = abs(got - (seconds - 3.5)) if got is not None else 1e6
            if e < err:
                best, err = sd, e
            if e < 2:
                break
        return best, nlv
    best = (-1, 1e9, seeds[0])                              # (niveaux, écart, graine)
    for sd in seeds:
        sim = Sim(sd, FIX_MAX, 0.0, r0=FIX_R0, gr=FIX_GR)
        sim.prefill()
        while sim.t < seconds - 2.0:
            sim.step(1 / 60)
            sim.events.clear()
        n = max([k + 1 for k in sim.reach if k >= 2] + [3])
        e = abs(sim.reach.get(n - 1, seconds) - (seconds - 3.5))
        if (n, -e) > (best[0], -best[1]):
            best = (n, e, sd)
    return best[2], best[0]
