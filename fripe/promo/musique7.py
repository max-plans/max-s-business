#!/usr/bin/env python3
"""Musique de la pub de lancement (pub7.html) : 30 s à 120 BPM, piste originale synthétisée ici (libre de droits).
Accroche : deux impacts (le nombre, puis le tampon « ≠ gagné »). Problème : une frappe sèche par ligne, tension qui monte.
Apparition (6 s) : grand impact, le groove démarre. Démos : groove + sons d'interface (clic, validation).
Montée vers le moment wow (20-21 s), un impact par mot (21,5 / 22 / 22,5 / 23 s), éclat à 23,85 s. Signature : accord final."""
import wave
import numpy as np
from musique import SR, BEAT, CHORDS, rng, kick, clap, hat, tone, pad, boom, hit, riser, swoosh
from musique3 import shimmer, ping, tick, drone

DUR = 30.0
N = int(SR * DUR)
L, R = np.zeros(N), np.zeros(N)


def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N or i < 0:
        return
    sig = sig[: N - i] * gain
    L[i:i + len(sig)] += sig * (1 - max(pan, 0))
    R[i:i + len(sig)] += sig * (1 + min(pan, 0))


def click():  # clic d'interface
    t = np.arange(int(0.05 * SR)) / SR
    return np.sin(2 * np.pi * 1900 * t) * np.exp(-t * 120) * 0.35


def bar(t0, chord_i, full=True, end=None):
    bass, ch = CHORDS[chord_i % 4]
    stop = end if end is not None else t0 + 2.0
    add(pad(ch, min(2.05, stop - t0)), t0, 0.7)
    for b in range(4):
        tb = t0 + b * BEAT
        if tb >= stop:
            break
        add(kick(), tb, 0.9)
        if b % 2:
            add(clap(), tb, 0.75)
        add(hat(), tb + 0.25, 0.6, 0.3)
        if full:
            add(hat(), tb + 0.125, 0.25, -0.3)
            add(hat(), tb + 0.375, 0.25, -0.3)
    for e in range(8):
        te = t0 + e * 0.25
        if te >= stop:
            break
        add(tone(bass * 2, 0.22, 8, 0.004, 0.11), te, 0.24)
        if full:
            add(tone(ch[[0, 1, 2, 1, 2, 0, 1, 2][e]] * 2, 0.2, 4, 0.003, 0.09), te, 0.06, (-0.4, 0.4)[e % 2])


# 1. accroche : le nombre qui compte, puis le tampon
add(hit(), 0.0, 0.9)
for i in range(10):
    add(tick(), i * 0.05, 0.7)
add(boom(), 1.06, 1.0)
add(drone(2.0, 55), 0.0, 0.8)
# 2. problème : une frappe par ligne, la tension monte jusqu'au « ??? »
for i, t in enumerate((2.5, 3.0, 3.5, 4.0)):
    add(hit(), t, 0.7 + i * 0.08)
    add(kick(), t, 0.6)
    add(swoosh(), t - 0.18, 0.3, 0.3)
add(drone(4.0, 55), 2.0, 0.6)
add(swoosh(), 4.45, 0.4)
add(hit(), 4.75, 1.0)
add(riser(1.2), 4.75, 0.8)
# 3. apparition : grand impact, puis le groove
add(boom(), 6.05, 1.0)
add(pad([220.0, 329.63, 440.0, 659.25], 1.9), 6.05, 1.2)
add(shimmer(0.8, 1400, 3000), 6.1, 0.8)
add(swoosh(), 7.7, 0.5)
for k in range(6):  # 8 → 20 s
    bar(8.0 + k * 2, k)
bar(20.0, 6, full=False, end=20.9)
# 4-6. sons d'interface
add(ping(1760), 9.05, 0.7)
add(ping(2093), 11.05, 0.7)
add(click(), 15.1, 1.2)
add(ping(1568), 15.45, 0.8)
add(click(), 18.55, 1.2)
for i in range(3):
    add(ping(1318.5 * 2 ** (i * 4 / 12)), 18.95 + i * 0.4, 0.55)
add(ping(2637), 19.9, 0.6)
for t in (10.0, 13.6, 17.2):
    add(swoosh(), t - 0.2, 0.4, 0.2)
# 7. moment wow : montée, éclat, un impact par mot, puis le groove complet
add(riser(1.0), 20.0, 0.9)
add(boom(), 21.0, 1.0)
for i in range(4):
    add(hit(), 21.5 + i * 0.5, 0.9)
for k in range(3):  # 21 → 26 s
    bar(21.0 + k * 2, k, end=min(23.0 + k * 2, 25.9))
add(boom(), 23.85, 0.8)
add(shimmer(1.0, 1200, 3200), 23.85, 0.8)
add(swoosh(), 25.6, 0.5)
# 8. signature : accord tenu, dernier ping
add(boom(), 26.05, 0.8)
add(pad([220.0, 261.63, 329.63, 440.0], 3.8), 26.05, 1.5)
add(drone(3.8, 55), 26.05, 0.9)
add(hit(), 26.6, 0.6)
add(ping(1760), 27.35, 0.6)
for b in range(4):
    add(kick(), 26.05 + b * BEAT, 0.6)

mix = np.stack([L, R], 1)
mix /= np.max(np.abs(mix)) / 1.6
mix = np.tanh(mix) * 0.9
fade = np.ones(N)
fade[int(29.0 * SR):] = np.linspace(1, 0, N - int(29.0 * SR))
mix *= fade[:, None]
with wave.open(__file__.replace('musique7.py', 'musique7.wav'), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('musique7.wav', DUR, 's')
