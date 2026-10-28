#!/usr/bin/env python3
"""Musique de la pub Fripe : 40 s à 120 BPM en la mineur (Am F C G), calée sur les coupes de index.html (une scène = 2 mesures = 4 s).
Tout est synthétisé ici : grosse caisse, clap, charleston, basse, nappe, arpège, impacts, montées et souffles de transition."""
import wave
import numpy as np

SR, DUR, BEAT = 44100, 40.0, 0.5
N = int(SR * DUR)
L, R = np.zeros(N), np.zeros(N)
rng = np.random.default_rng(7)
CUTS = [4, 8, 12, 16, 20, 24, 28, 32, 36]
CHORDS = [  # (basse, accord) par mesure de 2 s
    (55.00, [220.00, 261.63, 329.63]),  # Am
    (43.65, [174.61, 220.00, 261.63]),  # F
    (65.41, [261.63, 329.63, 392.00]),  # C
    (49.00, [196.00, 246.94, 293.66]),  # G
]


def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    L[i:i + len(sig)] += sig * (1 - max(pan, 0))
    R[i:i + len(sig)] += sig * (1 + min(pan, 0))


def env(n, a=0.005, d=0.2):
    t = np.arange(n) / SR
    return np.minimum(t / a, 1) * np.exp(-t / d)


def kick():
    t = np.arange(int(0.45 * SR)) / SR
    f = 45 + 110 * np.exp(-t * 35)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * 1.1


def clap():
    n = int(0.25 * SR)
    noise = rng.uniform(-1, 1, n)
    noise = np.convolve(noise, [1, -0.6], 'same')  # un peu plus brillant
    e = env(n, 0.002, 0.07)
    for k in (0.01, 0.02):  # trois claquements rapprochés
        j = int(k * SR)
        e[j:] += env(n - j, 0.001, 0.05) * 0.7
    return noise * e * 0.5


def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    noise = rng.uniform(-1, 1, n)
    noise = noise - np.convolve(noise, np.ones(6) / 6, 'same')  # passe-haut grossier
    return noise * env(n, 0.001, 0.08 if open_ else 0.015) * 0.35


def tone(freq, dur, harm=6, a=0.01, d=0.3, detune=0.0):
    t = np.arange(int(dur * SR)) / SR
    s = sum(np.sin(2 * np.pi * freq * (1 + detune) * k * t) / k for k in range(1, harm + 1))
    return s * env(len(t), a, d)


def pad(freqs, dur):
    t = np.arange(int(dur * SR)) / SR
    s = np.zeros(len(t))
    for f in freqs:
        for dt in (-0.004, 0.0, 0.005):
            s += sum(np.sin(2 * np.pi * f * (1 + dt) * k * t + k) / (k * k) for k in range(1, 5))
    a = np.minimum(t / 0.6, 1) * np.minimum((dur - t) / 0.5, 1)
    return s * a * 0.05


def boom():
    t = np.arange(int(2.2 * SR)) / SR
    f = 32 + 70 * np.exp(-t * 6)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    noise = rng.uniform(-1, 1, len(t)) * np.exp(-t * 3.5) * 0.25
    noise = np.convolve(noise, np.ones(30) / 30, 'same') * 3
    return (body + noise) * 0.9


def hit():  # impact court pour les mots
    t = np.arange(int(0.6 * SR)) / SR
    f = 60 + 160 * np.exp(-t * 25)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) + rng.uniform(-1, 1, len(t)) * np.exp(-t * 40) * 0.4) * 0.8


def riser(dur):
    t = np.arange(int(dur * SR)) / SR
    noise = rng.uniform(-1, 1, len(t) + 64)
    out, w = np.zeros(len(t)), 40
    for i in range(0, len(t), 2048):  # le bruit s'éclaircit en montant
        k = max(2, int(w * (1 - i / len(t))))
        out[i:i + 2048] = np.convolve(noise[i:i + 2048 + k], np.ones(k) / k, 'valid')[:len(out[i:i + 2048])]
    sweep = np.sin(2 * np.pi * np.cumsum(200 + 1400 * (t / dur) ** 2) / SR) * 0.15
    return (out * 2 + sweep) * (t / dur) ** 2 * 0.6


def swoosh():
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    noise = np.convolve(rng.uniform(-1, 1, n), np.ones(8) / 8, 'same')
    return noise * np.sin(np.pi * t / 0.5) ** 2 * 0.5


# --- intro : nappe, impacts sur chaque mot, charleston discret
add(pad(CHORDS[0][1], 4.2), 0)
for i in range(5):
    add(hit(), 0.3 + i * 0.5, 0.75)
for k in range(8):
    add(hat(), 2 + k * 0.25, 0.5)
add(riser(1.0), 3.0, 0.7)

# --- groove de 4 à 8 s, coupure juste avant le logo
for b in range(8):
    t = 4 + b * BEAT
    add(kick(), t)
    if b % 2:
        add(clap(), t, 0.8)
    add(hat(), t + 0.25, 0.7, 0.3)
for bar in range(2):
    bass, ch = CHORDS[bar]
    add(pad(ch, 2.0), 4 + bar * 2)
    for e in range(8):
        add(tone(bass * 2, 0.24, 8, 0.004, 0.12), 4 + bar * 2 + e * 0.25 + 0.0, 0.22)
add(riser(1.2), 6.8, 0.9)

# --- logo : grand impact, nappe qui s'ouvre, la batterie revient à 10 s
add(boom(), 8.0, 1.0)
add(pad([220.0, 329.63, 440.0, 523.25], 4.2), 8.0, 1.4)
for b in range(4):
    add(kick(), 10 + b * BEAT, 0.8)
    add(hat(), 10 + b * BEAT + 0.25, 0.6, -0.3)

# --- partie principale 12 → 36 s : 4 temps, basse en croches, arpège, nappe
ARP = [0, 1, 2, 1, 2, 0, 1, 2]
for bar in range(12):
    t0 = 12 + bar * 2
    bass, ch = CHORDS[bar % 4]
    add(pad(ch, 2.05), t0, 0.9)
    for b in range(4):
        tb = t0 + b * BEAT
        add(kick(), tb)
        if b % 2:
            add(clap(), tb, 0.85)
        add(hat(), tb + 0.25, 0.75, 0.3)
        add(hat(), tb + 0.125, 0.3, -0.3)
        add(hat(), tb + 0.375, 0.3, -0.3)
    for e in range(8):
        add(tone(bass * 2, 0.22, 8, 0.004, 0.11), t0 + e * 0.25, 0.25)
        add(tone(ch[ARP[e]] * 2, 0.2, 4, 0.003, 0.09, 0.002), t0 + e * 0.25, 0.07, (-0.4, 0.4)[e % 2])
    if t0 in (26, 30):
        add(hat(True), t0 + 1.75, 0.6)

# slogan : un impact par mot
for i, t in enumerate((32.05, 33.05, 34.05)):
    add(hit(), t, 1.0)
add(boom(), 36.0, 0.8)

# fin : accord final tenu, quelques temps puis fondu
add(pad([220.0, 261.63, 329.63, 440.0], 4.0), 36.0, 1.5)
for b in range(4):
    add(kick(), 36 + b * BEAT, 0.8)
add(tone(110, 3.5, 8, 0.01, 1.2), 36.0, 0.25)

# souffles de transition sur les coupes (sauf le logo, qui a sa montée)
for c in CUTS:
    if c != 8:
        add(swoosh(), c - 0.3, 0.35, 0.2)

# mixage : coupure nette avant le logo, compression douce, fondu final
gap = (np.arange(N) >= int(7.9 * SR)) & (np.arange(N) < int(8.0 * SR))
L[gap] *= 0.05
R[gap] *= 0.05
mix = np.stack([L, R], 1)
mix /= np.max(np.abs(mix)) / 1.6
mix = np.tanh(mix) * 0.9
fade = np.ones(N)
fade[int(38.6 * SR):] = np.linspace(1, 0, N - int(38.6 * SR))
mix *= fade[:, None]
data = (mix * 32767).astype('<i2')
with wave.open(__file__.replace('musique.py', 'musique.wav'), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(data.tobytes())
print('musique.wav', DUR, 's')
