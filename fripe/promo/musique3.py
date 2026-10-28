#!/usr/bin/env python3
"""Musique de la pub 3 (pub3.html) : 24 s, ambiance cinématique sobre à 120 BPM.
Nappe grave, son cristallin qui suit chaque trait de lumière, impacts doux sur les apparitions, rythme léger de 4 à 19,6 s,
« ping » sur chaque bulle d'argent, cliquetis pendant que le slogan s'écrit."""
import wave
import numpy as np
from musique import SR, BEAT, CHORDS, rng, kick, hat, tone, pad, boom, riser, swoosh

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


def shimmer(dur, f0, f1):  # trait de lumière : glissando aigu scintillant
    t = np.arange(int(dur * SR)) / SR
    f = f0 + (f1 - f0) * (t / dur)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)
    s *= 0.6 + 0.4 * np.sin(2 * np.pi * 14 * t)
    return s * np.sin(np.pi * t / dur) ** 1.5 * 0.12


def ping(f=1760):
    t = np.arange(int(1.2 * SR)) / SR
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.01 * t) + 0.15 * np.sin(2 * np.pi * f * 3.02 * t)) * np.exp(-t * 4.5) * 0.28


def soft_kick():
    return kick() * 0.55


def tick():
    n = int(0.012 * SR)
    return rng.uniform(-1, 1, n) * np.exp(-np.arange(n) / SR * 400) * 0.25


def drone(dur, f):
    t = np.arange(int(dur * SR)) / SR
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2 * t + 1) + 0.12 * np.sin(2 * np.pi * f * 3.01 * t)
    return s * np.minimum(t / 1.5, 1) * np.minimum((dur - t) / 1.0, 1) * 0.35


if __name__ == '__main__':
    # ouverture : nappe grave, comète, logo tracé, éclat, traversée
    add(drone(3.6, 55), 0)
    add(shimmer(0.9, 1800, 3400), 0.1, 1.0, -0.4)
    add(shimmer(1.1, 1300, 2600), 0.75, 1.0, 0.3)
    add(riser(1.1), 0.8, 0.5)
    add(boom(), 1.85, 0.75)
    add(pad([220.0, 329.63, 440.0, 659.25], 2.0), 1.85, 1.1)
    add(swoosh(), 2.5, 0.6)

    # le téléphone se dessine, puis le rythme s'installe
    add(shimmer(1.0, 900, 2400), 2.95, 1.0, 0.2)
    add(boom(), 3.85, 0.35)
    for bar in range(8):  # 4 → 20 s
        t0 = 4 + bar * 2
        bass, ch = CHORDS[bar % 4]
        add(pad(ch, 2.05), t0, 0.75)
        add(drone(2.1, bass), t0, 0.6)
        for b in range(4):
            tb = t0 + b * BEAT
            add(soft_kick(), tb)
            add(hat(), tb + 0.25, 0.45, 0.3)
        for e in range(8):
            note = ch[[0, 2, 1, 2, 0, 2, 1, 2][e]] * 2
            add(tone(note, 0.3, 3, 0.002, 0.14), t0 + e * 0.25, 0.06, (-0.5, 0.5)[e % 2])

    # bulles d'argent, clic, annonce, bordereau
    for t, f in ((5.1, 1760), (6.1, 2093), (10.95, 1568), (18.8, 2349)):
        add(ping(f), t, 1.0)
    add(tick(), 9.1, 2.0)
    for t in (7.7, 11.7, 15.65, 19.15):
        add(swoosh(), t, 0.45, 0.2)
    add(shimmer(0.9, 1500, 2800), 9.3, 1.0, 0.4)
    add(shimmer(0.9, 1100, 2500), 16.0, 1.0, -0.3)
    for i in range(4):
        add(ping(1318.5 * 2 ** (i * 3 / 12)), 17.35 + i * 0.46, 0.5)

    # fin : éclat, logo, slogan tapé lettre à lettre
    add(riser(0.5), 19.45, 0.5)
    add(shimmer(0.45, 1600, 3000), 19.6, 1.0)
    add(boom(), 19.95, 0.8)
    add(pad([220.0, 329.63, 493.88, 659.25], 4.0), 19.95, 1.3)
    add(drone(4.0, 55), 19.95, 0.9)
    for i in range(34):
        add(tick(), 20.6 + i * 1.3 / 34, 0.8 + 0.4 * rng.random(), rng.uniform(-0.3, 0.3))
    add(ping(1760), 22.0, 0.6)

    mix = np.stack([L, R], 1)
    mix /= np.max(np.abs(mix)) / 1.5
    mix = np.tanh(mix) * 0.9
    fade = np.ones(N)
    fade[int(22.9 * SR):] = np.linspace(1, 0, N - int(22.9 * SR))
    mix *= fade[:, None]
    with wave.open(__file__.replace('musique3.py', 'musique3.wav'), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix * 32767).astype('<i2').tobytes())
    print('musique3.wav', DUR, 's')
