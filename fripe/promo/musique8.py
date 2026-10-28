#!/usr/bin/env python3
"""Musique de la pub « Le chaos de Vinted » (pub8.html) : 30 s à 120 BPM, piste originale synthétisée ici (libre de droits).
Accroche : impact à la première image, une notification par carte. Problème : une frappe par mot (2 → 4 s), aspiration.
Apparition (6 s) : grand impact, puis le rythme. Démos : un clic par geste, une validation par message.
Moment wow : éclat à 21 s, un coup par mot (21,5 → 23,5 s), éclat à 24,2 s. Signature : accord final."""
import wave
import numpy as np
from musique import SR, BEAT, CHORDS, rng, kick, clap, hat, tone, pad, boom, hit, riser, swoosh
from musique3 import shimmer, ping, tick, drone
from musique7 import click, bar

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


if __name__ == '__main__':
    import musique7
    musique7.add = add  # les mesures de musique7 s'écrivent dans cette piste-ci

    # 1. accroche : impact immédiat, une notification par carte
    add(hit(), 0.0, 1.0)
    add(drone(2.0, 55), 0.0, 0.7)
    for i in range(9):
        add(ping(1568 * 2 ** ((i * 5 % 12) / 12)), (0.0 if i < 3 else 0.1 + i * 0.1), 0.35, rng.uniform(-0.6, 0.6))
    for b in range(4):
        add(kick(), b * BEAT, 0.6)
    # 2. problème : une frappe par mot, puis l'aspiration
    for i in range(5):
        t = 2.0 + i * 0.5
        add(hit(), t, 0.7 + i * 0.06)
        add(kick(), t, 0.7)
        add(ping(1760 * 2 ** (i / 12)), t + 0.02, 0.3, rng.uniform(-0.5, 0.5))
    add(drone(4.0, 55), 2.0, 0.6)
    add(riser(1.4), 4.55, 0.9)
    add(swoosh(), 5.0, 0.6)
    # 3. apparition
    add(boom(), 6.05, 1.0)
    add(pad([220.0, 329.63, 440.0, 659.25], 1.6), 6.05, 1.2)
    add(shimmer(0.8, 1400, 3000), 6.1, 0.8)
    add(swoosh(), 7.35, 0.5)
    add(hit(), 7.6, 0.5)
    # 4. démonstrations : rythme de 7,6 à 20,8 s
    for k in range(6):
        bar(7.6 + k * 2, k, end=min(9.6 + k * 2, 20.8))
    bar(19.6, 6, full=False, end=20.8)
    for t in (8.95, 11.2, 13.5, 15.9, 18.3):
        add(swoosh(), t - 0.15, 0.35, 0.2)
    add(ping(1760), 8.15, 0.6)
    add(ping(2093), 9.7, 0.6)
    for t, f in ((12.2, 1568), (14.6, 1760), (17.0, 2093)):
        add(click(), t, 1.2)
        add(ping(f), t + 0.25, 0.75)
    add(click(), 19.15, 1.2)
    for i in range(3):
        add(ping(1318.5 * 2 ** (i * 4 / 12)), 19.5 + i * 0.3, 0.55)
    add(ping(2637), 20.15, 0.6)
    # 5. moment wow
    add(riser(0.9), 20.1, 0.9)
    add(boom(), 21.0, 1.0)
    for i in range(5):
        add(hit(), 21.5 + i * 0.5, 0.9)
    for k in range(2):
        bar(21.0 + k * 2, k, end=min(23.0 + k * 2, 24.2))
    add(boom(), 24.2, 0.9)
    add(shimmer(1.0, 1200, 3200), 24.2, 0.8)
    add(pad([220.0, 329.63, 440.0, 659.25], 1.6), 24.2, 1.0)
    add(swoosh(), 25.7, 0.5)
    # 6. signature
    add(boom(), 26.05, 0.8)
    add(pad([220.0, 261.63, 329.63, 440.0], 3.8), 26.05, 1.5)
    add(drone(3.8, 55), 26.05, 0.9)
    add(hit(), 26.6, 0.6)
    add(ping(1760), 27.3, 0.6)
    for b in range(4):
        add(kick(), 26.05 + b * BEAT, 0.6)

    mix = np.stack([L, R], 1)
    mix /= np.max(np.abs(mix)) / 1.6
    mix = np.tanh(mix) * 0.9
    fade = np.ones(N)
    fade[int(29.0 * SR):] = np.linspace(1, 0, N - int(29.0 * SR))
    mix *= fade[:, None]
    with wave.open(__file__.replace('musique8.py', 'musique8.wav'), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix * 32767).astype('<i2').tobytes())
    print('musique8.wav', DUR, 's')
