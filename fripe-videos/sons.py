#!/usr/bin/env python3
"""Bandes-son des 5 vidéos (17 s, 120 BPM), entièrement synthétisées ici : libres de droits.
Même ossature pour chacune : accroche (impact), tension, rideau noir (swoosh + boom), groove pendant la démo,
sons d'interface sur les taps et les apparitions, puis accord tenu sur la carte de fin. → musique-1.wav … musique-5.wav"""
import os, sys, wave
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fripe', 'promo'))
from musique import SR, BEAT, CHORDS, kick, clap, hat, tone, pad, boom, hit, riser, swoosh
from musique3 import shimmer, ping, tick, drone

DUR = 17.0
N = int(SR * DUR)

# temps de chaque vidéo (repris de video.html)
V = {
    1: dict(hook=[0.1, 0.55, 1.0], wipe=5.6, groove=(7.6, 13.6), stings=[2.85, 3.35], drop=3.85, ticks=(3.9, 4.8),
            clicks=[8.9, 9.9], pings=[10.3], words=[11.8, 12.1, 12.4], end=13.9),
    2: dict(hook=[0.1, 0.5, 0.9], wipe=5.0, groove=(7.0, 13.6), stings=[2.7, 2.88, 3.06, 3.24], drop=3.4, ticks=(7.6, 9.2),
            clicks=[], pings=[9.6, 10.15, 10.7], words=[12.2, 12.55], end=13.9),
    3: dict(hook=[0.1], wipe=8.2, groove=(8.6, 13.6), stings=[4.2, 4.8], drop=6.0, ticks=(0.1, 1.4),
            clicks=[], pings=[1.7, 9.2], words=[12.0, 12.3, 12.6], end=13.9, ticks2=(6.0, 7.0)),
    4: dict(hook=[], wipe=4.9, groove=(6.9, 13.6), stings=[3.6], drop=None, ticks=None,
            clicks=[7.9, 9.3, 10.1], pings=[10.5], words=[11.9, 12.25, 12.6], end=13.9,
            bubbles=[.15 + i * .42 for i in range(8)]),
    5: dict(hook=[.1 + i * .85 for i in range(6)], wipe=5.3, groove=(7.3, 12.8), stings=[], drop=None, ticks=None,
            clicks=[], pings=[8.5 + i * .55 for i in range(4)] + [10.9], words=[5.7, 6.05], end=13.2),
}


def render(v):
    c = V[v]
    L, R = np.zeros(N), np.zeros(N)

    def add(sig, t0, gain=1.0, pan=0.0):
        i = int(t0 * SR)
        if i >= N or i < 0:
            return
        s = sig[: N - i] * gain
        L[i:i + len(s)] += s * (1 - max(pan, 0))
        R[i:i + len(s)] += s * (1 + min(pan, 0))

    def click():
        t = np.arange(int(0.05 * SR)) / SR
        return np.sin(2 * np.pi * 1900 * t) * np.exp(-t * 120) * 0.35

    def pop(f=880):  # bulle de message
        t = np.arange(int(0.12 * SR)) / SR
        return np.sin(2 * np.pi * f * (1 + 0.6 * np.exp(-t * 40)) * t) * np.exp(-t * 30) * 0.4

    def bar(t0, ci, stop):
        bass, ch = CHORDS[ci % 4]
        add(pad(ch, min(2.05, stop - t0)), t0, 0.6)
        for b in range(4):
            tb = t0 + b * BEAT
            if tb >= stop:
                break
            add(kick(), tb, 0.85)
            if b % 2:
                add(clap(), tb, 0.6)
            add(hat(), tb + 0.25, 0.5, 0.3)
            add(hat(), tb + 0.125, 0.2, -0.3)
        for e in range(8):
            te = t0 + e * 0.25
            if te >= stop:
                break
            add(tone(bass * 2, 0.22, 8, 0.004, 0.11), te, 0.22)

    # 1. accroche et tension (bourdon grave jusqu'au rideau)
    add(drone(c['wipe'], 55), 0.0, 0.7)
    for i, t in enumerate(c['hook']):
        add(hit(), t, 0.75 + 0.05 * i)
    for t in c.get('bubbles', []):
        add(pop(700 if int(t * 10) % 2 else 940), t, 0.8, (-0.3, 0.3)[int(t * 10) % 2])
    for t in c['stings']:
        add(swoosh(), t - 0.15, 0.3, 0.2)
        add(hit(), t, 0.6)
    if c['drop'] is not None:
        add(boom(), c['drop'], 0.7)
    for rng_ in (c['ticks'], c.get('ticks2')):
        if rng_:
            for t in np.arange(rng_[0], rng_[1], 0.06):
                add(tick(), t, 0.45)
    # 2. rideau noir
    add(riser(0.9), c['wipe'] - 0.9, 0.7)
    add(swoosh(), c['wipe'] - 0.05, 0.6)
    add(boom(), c['wipe'] + 0.32, 0.9)
    add(pad([220.0, 329.63, 440.0, 659.25], 1.6), c['wipe'] + 0.32, 0.9)
    # 3. groove pendant la démo
    g0, g1 = c['groove']
    k = 0
    while g0 + k * 2 < g1:
        bar(g0 + k * 2, k, g1)
        k += 1
    for t in c['clicks']:
        add(click(), t, 1.2)
    for i, t in enumerate(c['pings']):
        add(ping(1318.5 * 2 ** ((i % 4) * 4 / 12)), t, 0.6)
    for t in c['words']:
        add(hit(), t, 0.5)
    # 4. carte de fin : éclat puis accord tenu
    e = c['end']
    add(swoosh(), e - 0.3, 0.5)
    add(boom(), e, 0.9)
    add(shimmer(1.0, 1200, 3200), e + 0.05, 0.7)
    add(pad([220.0, 261.63, 329.63, 440.0], DUR - e), e, 1.4)
    add(drone(DUR - e, 55), e, 0.7)
    for b in range(4):
        add(kick(), e + b * BEAT, 0.5)
    add(ping(1760), e + 1.5, 0.5)

    mix = np.stack([L, R], 1)
    mix /= np.max(np.abs(mix)) / 1.6
    mix = np.tanh(mix) * 0.9
    fade = np.ones(N)
    fade[int((DUR - 1.2) * SR):] = np.linspace(1, 0, N - int((DUR - 1.2) * SR))
    mix *= fade[:, None]
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), f'musique-{v}.wav')
    with wave.open(out, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix * 32767).astype('<i2').tobytes())
    print(out)


if __name__ == '__main__':
    for v in V:
        render(v)
