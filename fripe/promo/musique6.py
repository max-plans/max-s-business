#!/usr/bin/env python3
"""Musique de la pub 6 (pub6.html) : 23 s, mêmes sons que musique3.py, calés sur les particules et les morphings :
tourbillon et logo (0-3,2 s), morphing (3,2-4,4), ventes (4,4-8,4), carte (8,4-12,4), bordereau (12,4-16,2), total (16,2-19,4), fin."""
import wave
import numpy as np
from musique import SR, BEAT, CHORDS, rng, hat, tone, pad, boom, riser, swoosh
from musique3 import shimmer, ping, soft_kick, tick, drone

DUR = 23.0
N = int(SR * DUR)
L, R = np.zeros(N), np.zeros(N)


def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N or i < 0:
        return
    sig = sig[: N - i] * gain
    L[i:i + len(sig)] += sig * (1 - max(pan, 0))
    R[i:i + len(sig)] += sig * (1 + min(pan, 0))


def bip():
    t = np.arange(int(0.18 * SR)) / SR
    return np.sin(2 * np.pi * 2637 * t) * np.minimum(t / .005, 1) * np.exp(-t * 12) * 0.25


def hopsnd(f):
    t = np.arange(int(0.22 * SR)) / SR
    return np.sin(2 * np.pi * np.cumsum(f * (1 + 0.8 * t / 0.22)) / SR) * np.exp(-t * 12) * 0.3


# particules qui tourbillonnent puis forment le logo
add(drone(3.4, 55), 0)
add(riser(2.3), 0.1, 0.6)
add(shimmer(1.4, 1200, 3200), 0.9, 1.0)
add(boom(), 2.4, 0.7)
add(pad([220.0, 329.63, 440.0, 659.25], 1.9), 2.4, 1.1)
add(swoosh(), 3.15, 0.7)  # morphing en téléphone
add(boom(), 4.15, 0.4)

for bar in range(8):  # rythme 4,4 → 19,4 s
    t0 = 4.4 + bar * 2
    bass, ch = CHORDS[bar % 4]
    end = min(2.05, 19.4 - t0)
    if end <= 0:
        break
    add(pad(ch, end), t0, 0.75)
    add(drone(end + .05, bass), t0, 0.55)
    for b in range(4):
        tb = t0 + b * BEAT
        if tb < 19.4:
            add(soft_kick(), tb)
            add(hat(), tb + 0.25, 0.45, 0.3)
    for e in range(8):
        if t0 + e * 0.25 < 19.4:
            add(tone(ch[[0, 2, 1, 2, 0, 2, 1, 2][e]] * 2, 0.3, 3, 0.002, 0.14), t0 + e * 0.25, 0.06, (-0.5, 0.5)[e % 2])

# chiffres qui roulent : cliquetis qui ralentit
for at, dur in ((4.9, 1.8), (16.6, 2.2)):
    k = 0.0
    while k < 1:
        add(tick(), at + dur * (1 - (1 - k) ** 0.33), 0.5, rng.uniform(-0.3, 0.3))
        k += 0.035
# notifications
for i in range(3):
    add(ping(1568 * 2 ** (i * 4 / 12)), 5.2 + i * 0.65, 0.8, (-0.3, 0, 0.3)[i])
# zoom dans la photo, carte qui se retourne
add(riser(0.5), 8.75, 0.7)
add(swoosh(), 9.1, 0.7)
add(swoosh(), 10.0, 0.6, -0.3)
add(ping(2093), 11.3, 0.7)
# pliage, scanner, colis
add(swoosh(), 12.2, 0.6, 0.3)
for t in (13.35, 13.9):
    add(bip(), t, 1.0)
add(ping(2349), 14.25, 0.8)
for i in range(3):
    add(hopsnd(500 + i * 120), 14.6 + i * 0.433, 1.0)
# total : aspiration et ondes
add(riser(2.3), 16.3, 0.6)
add(boom(), 18.6, 0.8)
add(swoosh(), 19.2, 0.6)
# explosion et le mot
add(boom(), 19.45, 0.6)
add(shimmer(1.2, 3200, 1400), 19.6, 0.9)
add(pad([220.0, 329.63, 493.88, 659.25], 2.6), 20.9, 1.3)
add(drone(2.4, 55), 20.9, 0.9)
add(ping(1760), 21.4, 0.6)

mix = np.stack([L, R], 1)
mix /= np.max(np.abs(mix)) / 1.5
mix = np.tanh(mix) * 0.9
fade = np.ones(N)
fade[int(22.0 * SR):] = np.linspace(1, 0, N - int(22.0 * SR))
mix *= fade[:, None]
with wave.open(__file__.replace('musique6.py', 'musique6.wav'), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('musique6.wav', DUR, 's')
