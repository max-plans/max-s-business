#!/usr/bin/env python3
"""Musique de la pub 4 (pub4.html) : 24 s, mêmes sons que musique3.py, calés sur le nouvel ordre :
étiquette et plongée (0-3,2 s), Publie (2,5-7,2), Expédie (7,2-11,6), Encaisse (11,6-15,6), Pilote (15,6-20,4), balayage final."""
import wave
import numpy as np
from musique import SR, BEAT, CHORDS, rng, hat, tone, pad, boom, riser, swoosh
from musique3 import shimmer, ping, soft_kick, tick, drone

DUR = 24.0
N = int(SR * DUR)
L, R = np.zeros(N), np.zeros(N)


def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N or i < 0:
        return
    sig = sig[: N - i] * gain
    L[i:i + len(sig)] += sig * (1 - max(pan, 0))
    R[i:i + len(sig)] += sig * (1 + min(pan, 0))


# étiquette : le fil descend, le contour se trace, balancement, plongée dans le trou
add(drone(3.4, 55), 0)
add(shimmer(0.7, 3200, 1600), 0.05, 1.0, -0.2)
add(shimmer(1.0, 1200, 2500), 0.6, 1.0, 0.3)
add(ping(1318.5), 1.5, 0.7)
add(riser(0.9), 2.0, 0.7)
add(swoosh(), 2.45, 0.7)
add(boom(), 3.2, 0.55)

# rythme léger de 3,2 à 20,4 s
for bar in range(9):
    t0 = 3.2 + bar * 2
    if t0 >= 20.4:
        break
    bass, ch = CHORDS[bar % 4]
    add(pad(ch, 2.05), t0, 0.75)
    add(drone(2.1, bass), t0, 0.55)
    for b in range(4):
        tb = t0 + b * BEAT
        if tb < 20.4:
            add(soft_kick(), tb)
            add(hat(), tb + 0.25, 0.45, 0.3)
    for e in range(8):
        if t0 + e * 0.25 < 20.4:
            add(tone(ch[[0, 2, 1, 2, 0, 2, 1, 2][e]] * 2, 0.3, 3, 0.002, 0.14), t0 + e * 0.25, 0.06, (-0.5, 0.5)[e % 2])

# Publie : clic, trois annonces tracées
add(tick(), 3.6, 2.0)
for i in range(3):
    add(shimmer(0.55, 1400 + i * 300, 2600 + i * 300), 3.8 + i * 0.55, 0.9, (-0.4, 0, 0.4)[i])
    add(ping(1568 * 2 ** (i * 4 / 12)), 4.25 + i * 0.55, 0.45)
add(swoosh(), 6.75, 0.5)
# Expédie : la route, le bordereau
add(shimmer(2.0, 900, 2200), 7.7, 0.9, -0.2)
add(shimmer(0.8, 1500, 2700), 8.4, 0.8, 0.3)
add(ping(2093), 9.7, 0.6)
add(swoosh(), 11.15, 0.5)
# Encaisse : l'anneau se ferme, un ping par gain
add(shimmer(2.5, 700, 2100), 11.8, 0.7)
for i in range(6):
    add(ping(1760 * 2 ** ([0, 3, 7, 10, 12, 15][i] / 12)), 12.3 + i * 0.33, 0.55, (-0.4, 0.4)[i % 2])
add(boom(), 14.3, 0.5)
add(swoosh(), 15.15, 0.5)
# Pilote : la courbe traverse l'écran, les cartes apparaissent
add(shimmer(1.6, 800, 2600), 16.4, 0.9, 0.2)
for i in range(3):
    add(ping(1318.5 * 2 ** (i * 5 / 12)), 16.9 + i * 0.3, 0.45)
# fin : balayage, logo, slogan tapé
add(swoosh(), 19.9, 0.6)
add(shimmer(1.0, 600, 3400), 20.45, 1.0, -0.3)
add(boom(), 20.85, 0.8)
add(pad([220.0, 329.63, 493.88, 659.25], 3.2), 20.85, 1.3)
add(drone(3.1, 55), 20.85, 0.9)
for i in range(26):
    add(tick(), 21.3 + i * 1.1 / 26, 0.8 + 0.4 * rng.random(), rng.uniform(-0.3, 0.3))
add(ping(1760), 22.4, 0.6)

mix = np.stack([L, R], 1)
mix /= np.max(np.abs(mix)) / 1.5
mix = np.tanh(mix) * 0.9
fade = np.ones(N)
fade[int(22.9 * SR):] = np.linspace(1, 0, N - int(22.9 * SR))
mix *= fade[:, None]
with wave.open(__file__.replace('musique4.py', 'musique4.wav'), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('musique4.wav', DUR, 's')
