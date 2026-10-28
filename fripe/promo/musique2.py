#!/usr/bin/env python3
"""Musique de la pub 2 (pub2.html) : 32 s à 120 BPM, mêmes instruments que musique.py, calée sur ses temps forts :
ventes avec « ka-ching » (0-3 s), arrêt et basse lourde sur le bazar (3-6 s), boum du logo (6 s), groove (8-24 s),
un impact par mot du slogan (24-27 s), fin (28-32 s)."""
import wave
import numpy as np
from musique import SR, BEAT, CHORDS, rng, kick, clap, hat, tone, pad, boom, hit, riser, swoosh

DUR = 32.0
N = int(SR * DUR)
L, R = np.zeros(N), np.zeros(N)


def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    L[i:i + len(sig)] += sig * (1 - max(pan, 0))
    R[i:i + len(sig)] += sig * (1 + min(pan, 0))


def ching():  # caisse enregistreuse : deux clochettes rapprochées
    t = np.arange(int(0.7 * SR)) / SR
    bell = lambda f: sum(np.sin(2 * np.pi * f * k * t) * a for k, a in ((1, 1), (2.76, .35), (5.4, .15))) * np.exp(-t * 7)
    s = bell(1568) * 0.5
    j = int(0.07 * SR)
    s[j:] += bell(2093)[: len(s) - j] * 0.6
    return s * 0.35


def drop():  # chute de hauteur pour l'arrêt sur le bazar
    t = np.arange(int(0.5 * SR)) / SR
    return np.sin(2 * np.pi * np.cumsum(300 * np.exp(-t * 6) + 40) / SR) * np.exp(-t * 3) * 0.5


def bar_groove(t0, bar, full=True):
    bass, ch = CHORDS[bar % 4]
    add(pad(ch, 2.05), t0, 0.8)
    for b in range(4):
        tb = t0 + b * BEAT
        add(kick(), tb)
        if b % 2:
            add(clap(), tb, 0.85)
        add(hat(), tb + 0.25, 0.75, 0.3)
        if full:
            add(hat(), tb + 0.125, 0.3, -0.3)
            add(hat(), tb + 0.375, 0.3, -0.3)
    for e in range(8):
        add(tone(bass * 2, 0.22, 8, 0.004, 0.11), t0 + e * 0.25, 0.25)
        if full:
            add(tone(ch[[0, 1, 2, 1, 2, 0, 1, 2][e]] * 2, 0.2, 4, 0.003, 0.09, 0.002), t0 + e * 0.25, 0.07, (-0.4, 0.4)[e % 2])


# accroche : la batterie démarre tout de suite, un « ka-ching » par vente
add(hit(), 0.0, 0.9)
for bar in range(2):
    bar_groove(bar * 2, bar, full=False)
for i in range(4):
    add(ching(), 0.55 + i * 0.5, 1.0, (-0.3, 0.3)[i % 2])
add(riser(0.5), 2.5, 0.8)

# le bazar : coupure, basse lourde, la stampe et le tremblement
add(drop(), 3.0, 0.9)
for i in range(6):
    add(tone(55, 0.45, 10, 0.005, 0.3), 3.0 + i * 0.5, 0.35)
    add(kick(), 3.0 + i * 0.5, 0.7)
add(hit(), 4.0, 1.1)
add(riser(1.0), 5.0, 1.0)

# logo
add(boom(), 6.0, 1.0)
add(pad([220.0, 329.63, 440.0, 523.25], 2.2), 6.0, 1.4)
for b in range(4):
    add(kick(), 7.0 + b * 0.25, 0.4 + b * 0.15)  # roulement vers le groove

# fonctions : groove complet, souffle sur chaque rotation du téléphone, ka-ching sur l'argent
for bar in range(8):
    bar_groove(8 + bar * 2, bar)
for t in (11.85, 15.85, 19.85):
    add(swoosh(), t - 0.1, 0.4, 0.2)
for t in (9.4, 9.75, 10.1, 10.45, 14.6, 23.45):
    add(ching(), t, 0.8)
add(riser(0.9), 23.0, 0.8)

# slogan : un impact par mot, puis l'explosion de pièces
for i in range(3):
    add(hit(), 24.0 + i, 1.1)
    add(pad(CHORDS[i][1], 1.0), 24.0 + i, 0.9)
    for b in range(2):
        add(kick(), 24.5 + i + b * 0.25, 0.6)
add(ching(), 26.1, 1.0)
add(boom(), 27.0, 0.6)
add(riser(0.9), 27.1, 0.6)

# fin
add(boom(), 28.0, 0.9)
add(pad([220.0, 261.63, 329.63, 440.0], 4.0), 28.0, 1.5)
add(tone(110, 3.5, 8, 0.01, 1.2), 28.0, 0.25)
for b in range(4):
    add(kick(), 28 + b * BEAT, 0.8)
    add(hat(), 28 + b * BEAT + 0.25, 0.5)
add(ching(), 29.0, 0.8)

mix = np.stack([L, R], 1)
mix /= np.max(np.abs(mix)) / 1.6
mix = np.tanh(mix) * 0.9
fade = np.ones(N)
fade[int(30.8 * SR):] = np.linspace(1, 0, N - int(30.8 * SR))
mix *= fade[:, None]
with wave.open(__file__.replace('musique2.py', 'musique2.wav'), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('musique2.wav', DUR, 's')
