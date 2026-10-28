#!/usr/bin/env python3
"""Musique de la boucle (fripe-loop.html) : 14 s à 120 BPM = 7 mesures = 28 temps, piste originale synthétisée ici.
Le tampon fait exactement une période et chaque son qui dépasse la fin repart au début (addition modulo P) :
la fin s'enchaîne sur le début sans coupure, aussi longtemps qu'on boucle.
Groove feutré (grosse caisse douce, charleston, basse, nappe), un clic par clic du curseur, un souffle par morphing,
un « ping » sur chaque confirmation (annonce envoyée, bordereau ouvert, message envoyé) et un éclat sur le logo."""
import os
import sys
import wave
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from musique import SR, rng, kick, clap, hat, tone, pad, swoosh  # noqa: E402
from musique3 import shimmer, ping  # noqa: E402

P, BEAT = 14.0, 0.5
N = int(SR * P)
L, R = np.zeros(N), np.zeros(N)

# mêmes repères que fripe-loop.html
SEQ = [0, .55, 2.55, 3.55, 4.55, 5.55, 7.05, 7.55, 8.05, 10.05, 10.7, 10.85, 12.05, 12.95, 13.68]
CLICKS = [.5, 1.0, 1.7, 2.0, 2.5, 3.0, 4.0, 6.0, 6.5, 7.5, 8.5, 9.5, 10.0, 12.5]
KEYS = [(1.05, 1.55, 21), (1.75, 1.85, 2), (2.05, 2.15, 2), (8.56, 9.1, 18)] + [(q, q, 1) for q in (10.5, 10.65, 10.8, 10.95)]
CONFIRM = [(4.6, 1568), (7.6, 1760), (9.55, 2093)]
# 7 mesures : Fmaj7 · Am7 · Dm9 · G6 · Fmaj7 · Em7 · G(sus) — la dernière mesure ramène sur la première
BARS = [(43.65, [174.61, 220.00, 261.63, 329.63]), (55.00, [196.00, 220.00, 261.63, 329.63]),
        (36.71, [174.61, 220.00, 261.63, 329.63]), (49.00, [196.00, 246.94, 293.66, 329.63]),
        (43.65, [174.61, 220.00, 261.63, 329.63]), (41.20, [164.81, 196.00, 246.94, 293.66]),
        (49.00, [196.00, 261.63, 293.66, 392.00])]


def add(sig, t0, gain=1.0, pan=0.0):
    """Ajoute un son à t0 ; ce qui dépasse la fin de la période revient au début."""
    sig = sig * gain
    idx = (int(round(t0 * SR)) + np.arange(len(sig))) % N
    np.add.at(L, idx, sig * (1 - max(pan, 0)))
    np.add.at(R, idx, sig * (1 + min(pan, 0)))


def click():  # clic d'interface, sec et feutré
    t = np.arange(int(0.04 * SR)) / SR
    return (np.sin(2 * np.pi * 2300 * t) * 0.6 + rng.uniform(-1, 1, len(t)) * 0.4) * np.exp(-t * 160) * 0.3


def key():  # frappe de clavier très courte
    t = np.arange(int(0.02 * SR)) / SR
    return rng.uniform(-1, 1, len(t)) * np.exp(-t * 300) * 0.12


def soft_swoosh():
    s = swoosh()
    return np.convolve(s, np.ones(12) / 12, 'same') * 0.7


if __name__ == '__main__':
    for b, (bass, chord) in enumerate(BARS):
        t0 = b * 2.0
        add(pad(chord, 2.6), t0 - .05, 0.75)
        for k, beat in enumerate((0, 1.5, 2.5, 3)):  # basse syncopée
            add(tone(bass * (2 if k == 2 else 1), .45, harm=4, a=.008, d=.22), t0 + beat * BEAT, 0.32)
        for i in range(4):
            tb = t0 + i * BEAT
            if i in (0, 2):
                add(kick(), tb, 0.42)
            if i in (1, 3):
                add(clap(), tb, 0.16, 0.1)
            add(hat(), tb + BEAT / 2, 0.22, -0.25)
            add(hat(), tb + BEAT * 0.75, 0.08, 0.3)
        # arpège discret, deux notes par temps
        for i in range(8):
            f = chord[(i * 3 + b) % len(chord)] * 2
            add(tone(f, .3, harm=3, a=.004, d=.12), t0 + i * BEAT / 2, 0.045, 0.4 if i % 2 else -0.4)

    for t in SEQ:
        add(soft_swoosh(), t - .2, 0.18)
    for t in CLICKS:
        add(click(), t, 1.0)
    for a, b, n in KEYS:
        for j in range(n):
            add(key(), a + (b - a) * j / max(n - 1, 1), 1.0, rng.uniform(-.3, .3))
    for t, f in CONFIRM:
        add(ping(f), t, 0.7)
        add(ping(f * 1.5), t + .08, 0.35)
    add(shimmer(.9, 1200, 2600), 12.75, 1.0)  # le logo apparaît
    add(ping(2637), 13.0, 0.45)

    mix = np.stack([L, R], axis=1)
    mix = np.tanh(mix * 1.2) / np.tanh(1.2)  # légère saturation douce, garde des crêtes rondes
    mix *= 0.89 / np.abs(mix).max()
    with wave.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'musique-loop.wav'), 'wb') as w:
        w.setnchannels(2), w.setsampwidth(2), w.setframerate(SR)
        w.writeframes((mix * 32767).astype('<i2').tobytes())
    print('musique-loop.wav', len(mix) / SR, 's')
