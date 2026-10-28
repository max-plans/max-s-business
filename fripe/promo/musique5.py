#!/usr/bin/env python3
"""Musique de la pub 5 (pub5.html) : 25 s, mêmes sons que musique3.py, calés sur « Grâce à Fripe, je… » :
logo d'entrée (0-3 s), publier (3-7,4), bénéfice (7,4-11,9), messages (11,9-16,3), bordereaux (16,3-20,4), « Et toi ? » et fin."""
import wave
import numpy as np
from musique import SR, BEAT, CHORDS, rng, hat, tone, pad, boom, riser, swoosh
from musique3 import shimmer, ping, soft_kick, tick, drone

DUR = 25.0
N = int(SR * DUR)
L, R = np.zeros(N), np.zeros(N)


def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N or i < 0:
        return
    sig = sig[: N - i] * gain
    L[i:i + len(sig)] += sig * (1 - max(pan, 0))
    R[i:i + len(sig)] += sig * (1 + min(pan, 0))


# ouverture : comète, logo tracé, éclat, nom
add(drone(3.2, 55), 0)
add(shimmer(0.8, 1800, 3400), 0.05, 1.0, -0.4)
add(shimmer(1.05, 1300, 2600), 0.5, 1.0, 0.3)
add(riser(1.0), 0.6, 0.5)
add(boom(), 1.6, 0.8)
add(pad([220.0, 329.63, 440.0, 659.25], 1.8), 1.6, 1.1)
add(swoosh(), 2.5, 0.5)

# rythme de 3 à 20,4 s
for bar in range(9):
    t0 = 3.0 + bar * 2
    bass, ch = CHORDS[bar % 4]
    end = min(t0 + 2.05, 20.4) - t0
    if end <= 0:
        break
    add(pad(ch, end), t0, 0.75)
    add(drone(end + 0.05, bass), t0, 0.55)
    for b in range(4):
        tb = t0 + b * BEAT
        if tb < 20.4:
            add(soft_kick(), tb)
            add(hat(), tb + 0.25, 0.45, 0.3)
    for e in range(8):
        if t0 + e * 0.25 < 20.4:
            add(tone(ch[[0, 2, 1, 2, 0, 2, 1, 2][e]] * 2, 0.3, 3, 0.002, 0.14), t0 + e * 0.25, 0.06, (-0.5, 0.5)[e % 2])

add(shimmer(0.9, 900, 2400), 3.0, 1.0, 0.2)
add(tick(), 4.6, 2.0)
add(shimmer(0.85, 1500, 2800), 4.8, 1.0, 0.4)
add(ping(1568), 6.35, 0.8)
for t in (7.0, 11.5, 15.95, 19.8):
    add(swoosh(), t, 0.45, 0.2)
add(ping(1760), 9.0, 1.0)
add(ping(2093), 10.0, 1.0)
for i, t in enumerate((12.5, 13.3, 14.1)):  # bulles de messages
    add(ping(1318.5 * 2 ** ((0, 4, 7)[i] / 12)), t, 0.45, (-0.3, 0.3, -0.3)[i])
add(ping(2349), 15.0, 1.0)
add(shimmer(0.9, 1100, 2500), 16.3, 1.0, -0.3)
for i in range(4):
    add(ping(1318.5 * 2 ** (i * 3 / 12)), 17.65 + i * 0.46, 0.5)

# « Et toi ? » puis la fin
add(boom(), 20.45, 0.5)
add(riser(1.2), 20.7, 0.6)
add(boom(), 21.9, 0.85)
add(pad([220.0, 329.63, 493.88, 659.25], 3.1), 21.9, 1.3)
add(drone(3.1, 55), 21.9, 0.9)
add(ping(1760), 22.7, 0.6)

mix = np.stack([L, R], 1)
mix /= np.max(np.abs(mix)) / 1.5
mix = np.tanh(mix) * 0.9
fade = np.ones(N)
fade[int(23.9 * SR):] = np.linspace(1, 0, N - int(23.9 * SR))
mix *= fade[:, None]
with wave.open(__file__.replace('musique5.py', 'musique5.wav'), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('musique5.wav', DUR, 's')
