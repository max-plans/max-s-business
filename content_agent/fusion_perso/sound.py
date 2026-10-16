"""Bande son de la Fusion perso : musique douce (pad, basse, arpège, petite rythmique), une note de mélodie et un
« bloop » juteux à chaque fusion, basses sur les grosses fusions, et TOUJOURS LE MÊME MOT dit à chaque fusion,
de plus en plus grave au fil de la taille. Réverbération + mastering. WAV stéréo 48 kHz."""
from __future__ import annotations

import math
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000


def build(events: list, final: float | None, seconds: float, nlv: int, word: np.ndarray | None, word_sr: int, out) -> None:
    N = int((seconds + 3) * SR)
    rng = np.random.default_rng(5)
    music = np.zeros((N, 2), np.float32)
    sfx = np.zeros((N, 2), np.float32)
    vox = np.zeros((N, 2), np.float32)

    def put(buf, t, w, pan=0.0, gain=1.0):
        i = int(t * SR)
        if i >= N or i < 0:
            return
        w = w[: N - i]
        l, r = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
        buf[i:i + len(w), 0] += w * l * gain * 1.414
        buf[i:i + len(w), 1] += w * r * gain * 1.414

    def lp(x, f, order=2):
        return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x).astype(np.float32)

    def hp(x, f, order=2):
        return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x).astype(np.float32)

    def env(n, a, dec=None, rel=0.05):
        t = np.arange(n) / SR
        e = np.minimum(1, t / max(a, 1e-4))
        if dec:
            e = e * np.exp(-t / dec)
        e = e * np.minimum(1, (n / SR - t) / rel)
        return e.astype(np.float32)

    def midi(m):
        return 440 * 2 ** ((m - 69) / 12)

    # ---------------- musique (La mineur, 100 bpm)
    beat = 60 / 100
    bar_len = 4 * beat
    prog = [[57, 60, 64, 71], [53, 57, 60, 64], [48, 55, 60, 64], [55, 59, 62, 67]]
    end_music = final if final else seconds

    def saw_pad(freqs, dur):
        n = int(dur * SR)
        t = np.arange(n) / SR
        w = np.zeros(n, np.float32)
        for f in freqs:
            for det in (-0.12, 0.0, 0.11):
                w += (2 * ((t * f * 2 ** (det / 12) + rng.uniform(0, 1)) % 1) - 1) * 0.33
        return lp(w, 1100) * env(n, 0.5, None, 0.6) / len(freqs)

    def pluck(f, dur=0.6):
        n = int(dur * SR)
        p = max(2, int(SR / f))
        y = np.zeros(n + p, np.float32)
        y[:p] = lp(rng.uniform(-1, 1, p).astype(np.float32), 3000, 1)
        for k in range(p, n + p, p):
            prev = y[k - p:k]
            y[k:k + p] = (0.995 * 0.5 * (prev + np.roll(prev, 1)))[: len(y[k:k + p])]
        return y[p:] * env(n, 0.002, None, 0.08)

    n = int(0.35 * SR)
    t = np.arange(n) / SR
    kick = (np.sin(2 * np.pi * (45 * t + 90 / 18 * (1 - np.exp(-t * 18)))) * np.exp(-t * 9)).astype(np.float32)
    hat = hp(rng.uniform(-1, 1, int(0.06 * SR)).astype(np.float32), 7000) * env(int(0.06 * SR), 0.001, 0.015)
    bar, t0 = 0, 0.0
    while t0 < end_music - 0.05:
        ch = prog[bar % 4]
        dur = min(bar_len, end_music - t0) + 0.6
        put(music, t0, saw_pad([midi(m) for m in ch], dur), 0, 0.22)
        nb = int(dur * SR)
        put(music, t0, (np.sin(2 * np.pi * midi(ch[0] - 12) * np.arange(nb) / SR) * env(nb, 0.03, None, 0.3)).astype(np.float32), 0, 0.2)
        arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 12, ch[1] + 12, ch[3], ch[2] + 12]
        for k in range(8):
            if t0 + k * beat / 2 < end_music - 0.1:
                put(music, t0 + k * beat / 2, pluck(midi(arp[k])), 0.35 if k % 2 else -0.35, 0.13)
        for k in range(4):
            tt = t0 + k * beat
            if tt < end_music - 0.1 and bar >= 1:
                if k in (0, 2):
                    put(music, tt, kick, 0, 0.32)
                put(music, tt + beat / 2, hat, 0.2, 0.05)
        t0 += bar_len
        bar += 1

    # ---------------- sons de fusion
    scale = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79]
    melody = [0, 2, 4, 5, 4, 2, 3, 1, 0, 2, 4, 7, 6, 4, 5, 3]

    def bell(f, dur=1.2):
        n = int(dur * SR)
        t = np.arange(n) / SR
        w = np.sin(2 * np.pi * f * t + 1.2 * np.exp(-t * 5) * np.sin(2 * np.pi * f * 3.5 * t)) * np.exp(-t * 3.2)
        w += 0.3 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 6)
        return (w * env(n, 0.003, None, 0.1)).astype(np.float32)

    def bloop(lv):
        n = int(0.22 * SR)
        t = np.arange(n) / SR
        f = 520 / (1 + lv * 0.12) * (0.55 + 0.9 * np.exp(-t * 30))
        w = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 16)
        squish = lp(hp(rng.uniform(-1, 1, n).astype(np.float32), 600), 3500) * np.exp(-t * 28) * 0.35
        return ((w + squish) * env(n, 0.002)).astype(np.float32)

    def boom(k):
        n = int(1.6 * SR)
        t = np.arange(n) / SR
        w = np.sin(2 * np.pi * (38 * t + 70 / 6 * (1 - np.exp(-t * 6)))) * np.exp(-t * max(1.2, 3.5 - k * 0.3))
        nz = lp(rng.uniform(-1, 1, n).astype(np.float32), 400) * np.exp(-t * 10) * 0.6
        return ((w + nz) * env(n, 0.004)).astype(np.float32)

    def whoosh(dur=0.6, up=True):
        n = int(dur * SR)
        x = rng.uniform(-1, 1, n).astype(np.float32)
        out_ = np.zeros(n, np.float32)
        for k in range(0, n, 2400):
            fr = k / n if up else 1 - k / n
            out_[k:k + 2400] = lp(x[k:k + 2400], 300 + 4000 * fr ** 2)
        e = np.linspace(0, 1, n) ** 2.5 if up else np.exp(-np.linspace(0, 6, n))
        return out_ * e.astype(np.float32)

    def tick():
        n = int(0.05 * SR)
        t = np.arange(n) / SR
        return (np.sin(2 * np.pi * 1400 * t) * np.exp(-t * 90) * 0.5
                + lp(rng.uniform(-1, 1, n).astype(np.float32), 2500) * np.exp(-t * 120) * 0.4).astype(np.float32)

    big = max(1, nlv - 3)                         # les 3 derniers niveaux font « boum »
    mi, last = 0, -1.0
    tk = tick()
    for e in events:
        pan = (e["x"] - 540) / 540 * 0.6
        if e["k"] == "drop":
            put(sfx, e["t"], tk, pan, 0.04)
            continue
        lv = e["lv"]
        put(sfx, e["t"], bloop(lv), pan, 0.5)
        if e["t"] - last > 0.07:
            put(sfx, e["t"], bell(midi(scale[melody[mi % len(melody)]] + 12)), pan, 0.24)
            mi += 1
            last = e["t"]
        if lv >= big:
            put(sfx, e["t"], boom(lv - big), 0, 0.3 + 0.07 * (lv - big))

    # ---------------- le même mot, de plus en plus grave
    cache: dict = {}

    def base(lv):
        if lv not in cache:
            u = (lv - 1) / max(1, nlv - 2)                      # 0 : 1re fusion … 1 : le dernier
            pitch = 1.32 * (0.48 / 1.32) ** u                   # aigu → très grave (et plus traînant)
            s = word.astype(np.float32)
            n_out = int(len(s) * SR / word_sr / pitch)
            cache[lv] = np.interp(np.linspace(0, len(s) - 1, n_out), np.arange(len(s)), s).astype(np.float32)
        return cache[lv]

    def resamp(s, f):
        """f > 1 : plus aigu / plus court ; f peut varier dans le temps (tableau)."""
        f = np.broadcast_to(np.asarray(f, np.float32), (len(s),)) if np.ndim(f) else np.full(len(s), f, np.float32)
        pos = np.cumsum(f)
        pos = pos[pos < len(s) - 1]
        return np.interp(pos, np.arange(len(s)), s).astype(np.float32)

    def wtf(s, lv, kind):
        """Effets complètement « WTF » pour que chaque fusion surprenne."""
        u = (lv - 1) / max(1, nlv - 2)
        t = np.arange(len(s)) / SR
        if kind == "begaie":                                    # « A-a-a-ananas »
            cut = s[: int(0.11 * SR)] * env(int(0.11 * SR), 0.003, None, 0.02)
            s = np.concatenate([cut, np.zeros(int(0.03 * SR), np.float32)] * int(rng.integers(2, 4)) + [s])
        elif kind == "robot":                                   # voix de robot (modulation en anneau)
            s = s * np.sin(2 * np.pi * 55 * t) * 1.6
        elif kind == "tremble":                                 # voix qui tremble / qui chevrote
            s = resamp(s, 1 + 0.09 * np.sin(2 * np.pi * 7.5 * t))
        elif kind == "yodel":                                   # monte puis redescend
            s = resamp(s, 1 + 0.35 * np.sin(np.pi * np.clip(t / (t[-1] + 1e-9), 0, 1)))
        elif kind == "envers":                                  # écho à l'envers qui « aspire » le mot
            tail = s[::-1] * np.linspace(0, 0.6, len(s)) ** 2
            s = np.concatenate([tail[: int(len(tail) * 0.8)], s])
        elif kind == "chipmunk":                                # petite voix d'écureuil
            s = resamp(s, 1.7)
        elif kind == "demon":                                   # voix de démon : octave en dessous + saturation
            low = resamp(s, 0.5)[: len(s)]
            low = np.pad(low, (0, len(s) - len(low)))
            s = np.tanh((s * 0.6 + low * 1.0) * 2.2)
        elif kind == "echo":                                    # écho qui ricoche
            out_ = np.zeros(len(s) + int(0.6 * SR), np.float32)
            for k_, g in enumerate((1, 0.6, 0.38, 0.22)):
                i = int(k_ * 0.15 * SR)
                out_[i:i + len(s)] += s * g
            s = out_
        if u > 0.6 and kind != "demon":
            s = np.tanh(s * (1.5 + u)) * 0.8                    # du grain sur les gros
        return s

    small_fx = ["normal", "begaie", "robot", "tremble", "yodel", "chipmunk", "echo", "envers"]
    big_fx = ["demon", "echo", "begaie", "tremble", "envers", "robot", "normal"]

    def voice(lv):
        if word is None:
            return None
        u = (lv - 1) / max(1, nlv - 2)
        kind = str(rng.choice(big_fx if u > 0.55 else small_fx))
        s = hp(wtf(base(lv), lv, kind), 70)
        return s / (np.max(np.abs(s)) + 1e-9)

    for e in events:
        if e["k"] == "merge":
            v = voice(e["lv"])
            if v is not None:
                put(vox, e["t"] + 0.02, v, (e["x"] - 540) / 540 * 0.35, 0.55 + 0.25 * e["lv"] / max(1, nlv - 1))

    if final:                                                   # le final : souffle, boum, grand accord
        put(sfx, final - 1.1, whoosh(1.1, True), 0, 0.5)
        put(sfx, final, boom(4), 0, 0.9)
        nn = int((seconds - final + 2) * SR)
        tt = np.arange(nn) / SR
        w = np.zeros(nn, np.float32)
        for m in [45, 57, 64, 69, 72, 76]:
            for det in (-0.08, 0.08):
                w += np.sin(2 * np.pi * midi(m) * 2 ** (det / 12) * tt + 0.6 * np.sin(2 * np.pi * midi(m) * tt)) * 0.15
        put(music, final, lp(w, 2500) * env(nn, 0.25, 4.5, 1.0), 0, 0.45)
        for k, m in enumerate([69, 72, 76, 81]):
            put(sfx, final + 0.25 + k * 0.12, bell(midi(m), 2.5), (k - 1.5) * 0.3, 0.2)

    def reverb(x, dur, wet):
        n = int(dur * SR)
        t = np.arange(n) / SR
        ir = np.stack([lp((rng.standard_normal(n) * np.exp(-t * 6.9 / dur)).astype(np.float32), 5000) for _ in range(2)], 1)
        ir /= np.sqrt(np.sum(ir ** 2, 0, keepdims=True))
        return x + np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in (0, 1)], 1) * wet

    vox = reverb(vox, 1.6, 0.35)
    sfx = reverb(sfx, 1.2, 0.22)
    music = reverb(music, 2.2, 0.25)
    k = int(0.12 * SR)
    duck = 1 - 0.45 * np.clip(np.convolve(np.abs(vox).max(1), np.ones(k) / k, "same") * 4, 0, 1)
    mix = music * duck[:, None] * 0.9 + sfx * 0.85 + vox
    mix = hp(mix.T, 30).T
    pk = np.convolve(np.abs(mix).max(1), np.ones(480) / 480, "same")
    mix *= np.where(pk > 0.35, (0.35 + (pk - 0.35) * 0.4) / (pk + 1e-9), 1.0)[:, None]
    mix /= np.max(np.abs(mix)) + 1e-9
    mix = (np.tanh(mix * 1.2) / np.tanh(1.2) * 0.93)[: int(seconds * SR)]
    with wave.open(str(out), "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes((mix * 32767).astype(np.int16).tobytes())
