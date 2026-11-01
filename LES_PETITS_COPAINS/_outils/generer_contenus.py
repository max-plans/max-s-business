# -*- coding: utf-8 -*-
"""
Génère, à partir de videos_data.py, tous les fichiers de production des 10 vidéos :
  04_VIDEOS/VIDEO_XX/FICHE_VIDEO.md + paroles_ecran_BROUILLON.srt
  05_MUSIQUES/VIDEO_XX_musique.md + maquettes/VIDEO_XX_refrain.(mid|mp3)
  06_PAROLES/VIDEO_XX_paroles.md + VIDEO_XX_paroles_pour_IA_musique.txt
  07_STORYBOARDS/VIDEO_XX_storyboard.md + VIDEO_XX_storyboard.png
  08_PROMPTS/VIDEO_XX_prompts.md + PROMPTS_MAITRES_PERSONNAGES.md
  09_SEO/SEO_10_VIDEOS.md
Usage : python3 _outils/generer_contenus.py
"""
import math
import os
import struct
import subprocess
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from art import CHARS, POSES, EXPRS, place  # noqa: E402
import scenes as S  # noqa: E402
from common import ROOT, svg_page, run  # noqa: E402
from videos_data import VIDEOS  # noqa: E402

D = lambda *p: os.path.join(ROOT, *p)  # noqa: E731
CHANNEL = "Tralalune"
HANDLE = "@Tralalune"

THUMB_FILES = {
    1: "M01_bonjour_les_amis.png", 2: "M02_couleurs_avec_milo.png", 3: "M03_chiffres_1_2_3.png",
    4: "M04_danse_des_animaux.png", 5: "M05_pipo_fait_la_fete.png", 6: "M06_chanson_des_emotions.png",
    7: "M07_ferme_des_copains.png", 8: "M08_brossage_des_dents.png", 9: "M09_bonne_nuit_luna.png",
    10: "M10_tous_ensemble_on_danse.png",
}

# -----------------------------------------------------------------------------
# VERROUS DE PERSONNAGES (anglais : meilleure compréhension par les IA d'image)
# -----------------------------------------------------------------------------
STYLE = ("High-end 3D animated children's cartoon, feature-film quality render, soft rounded shapes, plush-like fur "
         "with subtle subsurface scattering, big glossy expressive eyes with two white catchlights, warm soft global "
         "illumination, gentle rim light, vivid yet harmonious pastel palette, shallow depth of field, clean uncluttered "
         "background, cozy magical atmosphere, original character design, 16:9")
NEG = ("text, letters, subtitles, logo, watermark, signature, extra limbs, extra fingers, deformed face, asymmetrical eyes, "
       "scary, horror, sharp teeth, realistic animal, weapons, clutter, different character design, color change, "
       "clothing change, added accessories, human characters")
LOCKS = {
    "milo": ("MILO: chibi baby lion cub, big round head (about 55% of total height), golden-orange fur (#FFB23E) with soft yellow "
             "highlights, very large round fluffy scalloped mane in bright orange (#F2771A) framing the whole face, two small round "
             "ears inside the mane, small orange tuft on top of the head, big glossy warm-brown eyes, small rounded dark-brown nose, "
             "cream muzzle (#FFF1D2) and cream oval belly, rosy cheeks, short rounded arms and legs with cream paw pads, thin tail "
             "ending in an orange tuft, no clothes"),
    "luna": ("LUNA: chibi baby unicorn standing upright, big round head (55% of height), pure white fur with soft lavender shading, "
             "mane and tail in three distinct pastel locks pink (#FF86C3), violet (#A66BFF) and turquoise (#3DD6CF), small golden "
             "spiral horn (#FFC83D), pointed white ears with pink inner, big glossy violet eyes (#8B50E8), pale pink rounded muzzle "
             "with two small nostrils, rosy cheeks, small glowing cream-white feathered wings on her back, pink hooves, no clothes"),
    "bibou": ("BIBOU: chibi baby bear cub, big round head (55% of height), light caramel-brown fur (#C98C58), large perfectly round "
              "ears with cream inner, round chubby cheeks, cream muzzle and big cream round belly (#F8E6C9), small oval dark-brown "
              "nose, big glossy dark-chocolate eyes, rosy cheeks, short rounded limbs with cream paw pads, tiny round tail, no clothes"),
    "pipo": ("PIPO: chibi baby dinosaur, big wide slightly oval head (55% of height), apple-green skin (#6DCB5E) with lighter green "
             "highlights, small rounded spikes on the head, back and tail alternating turquoise (#2EC4C8) and yellow (#FFD23F), "
             "light-green belly and lower face (#D6F6B4), big glossy deep-teal eyes, two tiny nostrils, rosy cheeks, short rounded "
             "limbs, short thick rounded tail, no clothes"),
    "nounou": ("NOUNOU: chibi baby bunny, big round head (55% of height), white and cream fur, very long floppy lop ears hanging "
               "down beside the face with soft pink inner, big glossy blue eyes (#3E6FB8), small pink triangle nose, cream two-lobed "
               "muzzle, rosy pink cheeks, light-blue overalls (#4A8FE7) with a front bib and two round yellow buttons (#FFD23F), "
               "cotton-ball tail, short rounded limbs"),
}
POSE_EN = {"debout": "standing relaxed", "coucou": "waving hello with one paw raised high", "saut": "jumping joyfully with both arms up",
           "danse": "dancing, leaning to the side with one arm up", "montre": "pointing to the side as if explaining",
           "calin": "hugging herself/himself tenderly"}
EXPR_EN = {"neutre": "soft gentle smile", "joyeux": "joyful open-mouth smile", "rire": "laughing with happy closed eyes",
           "clin": "playful wink and smile", "surpris": "surprised round eyes and small open mouth", "triste": "sad eyes with one small tear (gentle, not dramatic)",
           "endormi": "eyes closed, peacefully asleep", "fache": "mildly grumpy pout, frowning brows (cute, not scary)"}
MOTION_EN = {"debout": "gentle idle breathing, natural blinking, small head bob on the beat",
             "coucou": "waves the raised paw side to side, happy little bounce",
             "saut": "crouches then jumps up joyfully, soft squash-and-stretch landing",
             "danse": "bouncy dance, sways left and right on the beat, arms swinging",
             "montre": "points to the side then turns to camera and nods",
             "calin": "slow gentle sway while hugging self, calm breathing"}
BG_EN = {
    "matin": "sunny morning on Tralalune island: soft blue sky, smiling sun with rays, fluffy clouds, rolling green hills with pastel flowers",
    "couleurs": "cream-pink sky with a big bright rainbow, playful colorful paint splashes floating in the air, fluffy clouds",
    "chiffres": "bright light-blue sky with big fluffy clouds at the bottom and little golden stars, airy and clean",
    "jungle": "friendly jungle clearing: big rounded green leaves framing the shot, soft light beam in the center, pastel flowers",
    "fete": "festive purple room with bunting garlands, floating balloons, confetti, soft party lights",
    "emotions": "soft pastel pink-to-lavender backdrop with big blurred colored bubbles, calm and gentle",
    "ferme": "cute farm: red barn with white trims, white wooden fence, green hills, blue sky with a small sun",
    "salle_de_bain": "bright cozy children's bathroom: pale blue tiles, round mirror, soap bubbles floating",
    "nuit": "calm night sky over Tralalune: deep indigo to violet gradient, glowing golden crescent moon, many soft twinkling stars, lavender clouds",
    "scene": "colorful little theater stage: pink-violet backdrop, three soft spotlights, music notes and confetti in the air",
    "ile": "the floating island of Tralalune in a pastel sky: grassy top, a little pink-roofed house, a round tree, flowers, clouds below",
    "maison": "warm cozy interior of the copains' house: window with soft daylight, wooden floor, peach walls",
}
SECTION_TAG = {"Intro": "[Intro]", "Couplet": "[Verse]", "Refrain": "[Chorus]", "Pont": "[Bridge]", "Outro": "[Outro]",
               "Final": "[Final Chorus]", "Devinettes": "[Verse]", "Chute": "[Bridge]", "En haut": "[Verse]", "En bas": "[Verse]",
               "Devant": "[Verse]", "Au fond": "[Verse]"}


def parse_char(s):
    t = s.split()
    k = t[0]
    pose, expr, nums, flip = "debout", "neutre", [], False
    for w in t[1:]:
        if w in POSES:
            pose = w
        elif w in EXPRS:
            expr = w
        elif w == "f":
            flip = True
        else:
            nums.append(float(w))
    x, h = (nums + [640, 400])[:2]
    return dict(k=k, pose=pose, expr=expr, x=x, h=h, flip=flip)


def pos_word(x):
    return "on the left" if x < 450 else ("on the right" if x > 830 else "in the center")


def secs(tc):
    m, s = tc.split(":")
    return int(m) * 60 + int(s)


def dur_to_s(d):
    m = d.split(" min")[0]
    rest = d.split(" min")[1].strip().split(" ")[0] if " min" in d else "0"
    try:
        return int(m) * 60 + (int(rest) if rest.isdigit() else 0)
    except ValueError:
        return 180


def tag_for(label):
    for k, v in SECTION_TAG.items():
        if label.startswith(k):
            return v
    return "[Verse]"


# -----------------------------------------------------------------------------
# MAQUETTES MUSICALES (MIDI + MP3 synthétisé localement)
# -----------------------------------------------------------------------------
NOTE_BASE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def note_midi(n):
    name = n[0]
    acc = 0
    i = 1
    if len(n) > 2 and n[1] in "#b":
        acc = 1 if n[1] == "#" else -1
        i = 2
    octave = int(n[i:])
    return 12 * (octave + 1) + NOTE_BASE[name] + acc


def parse_melody(s):
    out = []
    for tok in s.replace("|", " ").split():
        if ":" in tok:
            n, d = tok.split(":")
            d = float(d)
        else:
            n, d = tok, 1.0
        out.append((None if n == "R" else note_midi(n), d))
    return out


def chord_notes(c):
    minor = c.endswith("m")
    r = c[:-1] if minor else c
    root = NOTE_BASE[r[0]] + (1 if "#" in r else -1 if (len(r) > 1 and r[1] == "b") else 0)
    base = 48 + root
    return [base, base + (3 if minor else 4), base + 7]


def write_midi(path, melody, chords, bpm, beats_per_bar):
    tpq = 480

    def vlq(n):
        b = [n & 0x7F]
        n >>= 7
        while n:
            b.insert(0, (n & 0x7F) | 0x80)
            n >>= 7
        return bytes(b)

    events = []  # (tick, bytes)
    t = 0
    for n, d in melody:
        ticks = int(d * tpq)
        if n is not None:
            events.append((t, bytes([0x90, n, 96])))
            events.append((t + ticks - 10, bytes([0x80, n, 0])))
        t += ticks
    total = t
    bar = beats_per_bar * tpq
    ci = 0
    for start in range(0, total, bar):
        ch = chords[ci % len(chords)]
        ci += 1
        for n in chord_notes(ch):
            events.append((start, bytes([0x91, n, 60])))
            events.append((start + bar - 10, bytes([0x81, n, 0])))
    events.sort(key=lambda e: (e[0], e[1][0] & 0xF0 == 0x90))
    track = bytearray()
    tempo = int(60_000_000 / bpm)
    track += vlq(0) + b"\xFF\x51\x03" + tempo.to_bytes(3, "big")
    track += vlq(0) + bytes([0xC0, 10])  # programme 11 : glockenspiel/boîte à musique
    track += vlq(0) + bytes([0xC1, 0])   # piano pour les accords
    last = 0
    for tick, ev in events:
        track += vlq(max(0, tick - last)) + ev
        last = max(last, tick)
    track += vlq(0) + b"\xFF\x2F\x00"
    with open(path, "wb") as f:
        f.write(b"MThd" + struct.pack(">IHHH", 6, 0, 1, tpq))
        f.write(b"MTrk" + struct.pack(">I", len(track)) + track)


def synth(path_mp3, melody, chords, bpm, beats_per_bar, lullaby=False):
    sr = 44100
    spb = 60.0 / bpm
    total_beats = sum(d for _, d in melody)
    nbars = math.ceil(total_beats / beats_per_bar)
    # 2 tours : refrain joué deux fois (avec 1 mesure de décompte)
    count_in = beats_per_bar
    length = int(sr * spb * (count_in + 2 * nbars * beats_per_bar + 2))
    buf = np.zeros(length)

    def tone(freq, dur, amp, kind):
        n = int(sr * dur)
        t = np.arange(n) / sr
        if kind == "bell":
            env = np.exp(-t * (2.2 if lullaby else 3.0)) * np.minimum(1, t / 0.005)
            w = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(4 * np.pi * freq * t) + 0.12 * np.sin(6 * np.pi * freq * t)
        elif kind == "pad":
            env = np.minimum(1, t / 0.25) * np.minimum(1, (dur - t) / 0.3).clip(0, 1)
            w = np.sin(2 * np.pi * freq * t) + 0.2 * np.sin(4 * np.pi * freq * t)
        elif kind == "bass":
            env = np.exp(-t * 2.5) * np.minimum(1, t / 0.01)
            w = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(4 * np.pi * freq * t)
        else:  # click
            env = np.exp(-t * 60)
            w = np.sin(2 * np.pi * freq * t)
        return amp * env * w

    def add(start_s, sig):
        i = int(start_s * sr)
        j = min(length, i + len(sig))
        buf[i:j] += sig[: j - i]

    f = lambda m: 440.0 * 2 ** ((m - 69) / 12)  # noqa: E731
    for b in range(count_in):
        add(b * spb, tone(1500 if b == 0 else 1000, 0.05, 0.25, "click"))
    for rep in range(2):
        off = (count_in + rep * nbars * beats_per_bar) * spb
        t = 0.0
        for n, d in melody:
            if n is not None:
                add(off + t * spb, tone(f(n + 12 if lullaby else n), d * spb + 0.6, 0.30, "bell"))
            t += d
        for bi in range(nbars):
            ch = chords[bi % len(chords)]
            notes = chord_notes(ch)
            bs = off + bi * beats_per_bar * spb
            for n in notes:
                add(bs, tone(f(n), beats_per_bar * spb, 0.07, "pad"))
            add(bs, tone(f(notes[0] - 12), spb * 1.5, 0.22, "bass"))
            if not lullaby and beats_per_bar == 4:
                add(bs + 2 * spb, tone(f(notes[0] - 12), spb * 1.5, 0.18, "bass"))
            if not lullaby:
                for k in range(beats_per_bar):
                    add(bs + k * spb, tone(3000, 0.03, 0.04 if k % 2 else 0.07, "click"))
    buf /= max(1e-6, np.abs(buf).max()) / 0.85
    wav = path_mp3[:-4] + ".wav"
    with wave.open(wav, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((buf * 32767).astype(np.int16).tobytes())
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-codec:a", "libmp3lame", "-b:a", "128k", path_mp3], check=True)
    os.remove(wav)


# -----------------------------------------------------------------------------
# STORYBOARD ILLUSTRÉ
# -----------------------------------------------------------------------------
def panel_svg(sc):
    tc, section, bgname, chars, action, camera, props = sc
    o = S.bg(bgname)
    for p in props:
        fn = getattr(S, p[0])
        o += fn(*p[1:])
    for c in sorted([parse_char(c) for c in chars], key=lambda c: c["h"]):
        o += place(c["k"], c["x"], 690 if c["h"] < 360 else 700, c["h"] * 1.25, expr=c["expr"], pose=c["pose"], flip=c["flip"])
    return o


def storyboard_png(v):
    scs = v["scenes"]
    cols = 3
    pw, ph = 600, 338
    rows = math.ceil(len(scs) / cols)
    W = 60 + cols * (pw + 40)
    H = 190 + rows * (ph + 170)
    o = f'<rect width="{W}" height="{H}" fill="#FFF6E5"/>'
    o += (f'<text x="60" y="80" font-family="Baloo2" font-weight="800" font-size="54" fill="#2B2D6E">'
          f'Storyboard — Vidéo {v["n"]:02d} : {v["titre"]}</text>')
    o += (f'<text x="60" y="130" font-family="Nunito" font-weight="700" font-size="26" fill="#666">'
          f'{v["duree"]} · {v["bpm"]} BPM · {v["mesure"]} · {len(scs)} scènes · Tralalune</text>')
    for i, sc in enumerate(scs):
        x = 60 + (i % cols) * (pw + 40)
        y = 170 + (i // cols) * (ph + 170)
        o += f'<rect x="{x - 6}" y="{y - 6}" width="{pw + 12}" height="{ph + 12}" rx="14" fill="#2B2D6E"/>'
        o += (f'<svg x="{x}" y="{y}" width="{pw}" height="{ph}" viewBox="0 0 1280 720" overflow="hidden">'
              f'{panel_svg(sc)}</svg>')
        o += (f'<rect x="{x + 10}" y="{y + 10}" width="190" height="44" rx="22" fill="#FFFFFF" opacity="0.92"/>'
              f'<text x="{x + 24}" y="{y + 41}" font-family="Fredoka" font-weight="700" font-size="26" fill="#2B2D6E">'
              f'#{i + 1}  ·  {sc[0]}</text>')
        o += (f'<text x="{x}" y="{y + ph + 40}" font-family="Fredoka" font-weight="700" font-size="25" fill="#A66BFF">'
              f'{sc[1]}</text>')
        words = sc[4].split()
        lines, cur = [], ""
        for w in words:
            if len(cur) + len(w) > 50:
                lines.append(cur)
                cur = w
            else:
                cur = (cur + " " + w).strip()
        lines.append(cur)
        for j, ln in enumerate(lines[:3]):
            ln = ln.replace("&", "&amp;").replace("<", "&lt;")
            o += (f'<text x="{x}" y="{y + ph + 74 + j * 28}" font-family="Nunito" font-weight="700" font-size="22" '
                  f'fill="#333">{ln}</text>')
        cam = sc[5].replace("&", "&amp;")
        o += (f'<text x="{x}" y="{y + ph + 74 + min(3, len(lines)) * 28}" font-family="Nunito" font-weight="400" '
              f'font-style="italic" font-size="20" fill="#777">🎥 {cam[:70]}</text>')
    svg_page(o, W, H, D("07_STORYBOARDS", f"VIDEO_{v['n']:02d}_storyboard.png"))


# -----------------------------------------------------------------------------
# TEXTES
# -----------------------------------------------------------------------------
import re


def clean(ln):
    """Retire les noms de personnages et les indications scéniques (pour l'IA musicale et l'écran)."""
    ln = re.sub(r"^(Milo|Luna|Bibou|Pipo|Nounou|Tous) : ", "", ln)
    ln = re.sub(r"\s*\([^)]*\)", "", ln).strip()
    return ln


def lyrics_md(v, for_ai=False):
    out = []
    for label, lines in v["paroles"]:
        if for_ai:
            out.append(tag_for(label))
            if lines == ["(bis)"] or (lines and lines[0].startswith("(bis")):
                ref = next(l for lab, l in v["paroles"] if lab.startswith("Refrain") and not l[0].startswith("(bis"))
                out.extend(clean(x) for x in ref)
            else:
                for ln in lines:
                    c = clean(ln)
                    out.append(c if c else "[Break]")
            out.append("")
        else:
            out.append(f"**{label}**  ")
            out.extend(f"{ln}  " for ln in lines)
            out.append("")
    return "\n".join(out)


def full_lyrics_lines(v):
    seq = []
    ref = next(l for lab, l in v["paroles"] if lab.startswith("Refrain") and not l[0].startswith("(bis"))
    for label, lines in v["paroles"]:
        if lines and lines[0].startswith("(bis"):
            n = 2 if "x2" in lines[0] else 1
            for _ in range(n):
                seq.extend((label, clean(ln)) for ln in ref)
        else:
            seq.extend((label, clean(ln)) for ln in lines if clean(ln))
    return seq


def srt(v):
    bpb = 3 if v["mesure"].startswith("3") else 4
    line_s = 2 * bpb * 60.0 / v["bpm"]
    t = 4.0
    out = []

    def fmt(x):
        h = int(x // 3600)
        m = int(x % 3600 // 60)
        s = x % 60
        return f"{h:02d}:{m:02d}:{int(s):02d},{int((s % 1) * 1000):03d}"

    for i, (label, ln) in enumerate(full_lyrics_lines(v), 1):
        d = 3.5 if "parlé" in label.lower() else line_s
        out.append(f"{i}\n{fmt(t)} --> {fmt(t + d - 0.1)}\n{ln}\n")
        t += d
    return "\n".join(out)


def description(v):
    chap = []
    seen = set()
    for sc in v["scenes"]:
        if sc[1] not in seen:
            seen.add(sc[1])
            chap.append(f"{sc[0]} {sc[1]}")
    if not chap[0].startswith("0:00"):
        chap.insert(0, "0:00 Intro")
    lyr = "\n".join(ln for _, ln in full_lyrics_lines(v)[:12])
    persos = sorted({parse_char(c)["k"] for sc in v["scenes"] for c in sc[3]})
    names = ", ".join(CHARS[k]["name"] for k in persos)
    hashtags = "#comptine #chansonpourenfants #Tralalune"
    return f"""{v['description_intro']}

🎵 Avec : {names}
⏱️ Chapitres :
{chr(10).join(chap)}

📝 Paroles (extrait) :
{lyr}
…

🌙 Bienvenue à Tralalune ! Des comptines originales, douces et joyeuses pour les 0-6 ans, avec Milo le petit lion, Luna la petite licorne, Bibou le petit ourson, Pipo le petit dinosaure et Nounou le petit lapin.
👉 Abonne-toi pour retrouver les copains : https://www.youtube.com/{HANDLE}

👨‍👩‍👧 Pour les parents : chansons et personnages 100 % originaux. Nous vous conseillons de regarder avec votre enfant et de limiter le temps d'écran selon son âge.
© {CHANNEL} – Tous droits réservés. Paroles originales.

{hashtags}"""


def fiche_video(v):
    n = v["n"]
    persos = sorted({parse_char(c)["k"] for sc in v["scenes"] for c in sc[3]})
    return f"""# VIDÉO {n:02d} — {v['titre']}

> Personnage principal : **{CHARS[v['lead']]['name']}** · Personnages présents : {", ".join(CHARS[k]['name'] for k in persos)}

## 1. Concept
{v['concept']}

**Objectif pour l'enfant :** {v['objectif']}

## 2. Fiche technique
| Élément | Valeur |
|---|---|
| Titre YouTube | **{v['titre_yt'].replace('|', chr(92) + '|')}** ({len(v['titre_yt'])} caractères) |
| Durée cible | {v['duree']} |
| Tempo | {v['bpm']} BPM ({v['mesure']}) |
| Tonalité conseillée | {v['tonalite']} |
| Style musical | {v['style']} |
| Instruments | {", ".join(v['instruments'])} |
| Voix & chant | {v['voix']} |
| Miniature | [`03_MINIATURES/{THUMB_FILES[n]}`](../../03_MINIATURES/{THUMB_FILES[n]}) |
| Paroles | [`06_PAROLES/VIDEO_{n:02d}_paroles.md`](../../06_PAROLES/VIDEO_{n:02d}_paroles.md) |
| Musique (prompts + maquette) | [`05_MUSIQUES/VIDEO_{n:02d}_musique.md`](../../05_MUSIQUES/VIDEO_{n:02d}_musique.md) |
| Storyboard | [`07_STORYBOARDS/VIDEO_{n:02d}_storyboard.md`](../../07_STORYBOARDS/VIDEO_{n:02d}_storyboard.md) (+ PNG) |
| Prompts image & animation | [`08_PROMPTS/VIDEO_{n:02d}_prompts.md`](../../08_PROMPTS/VIDEO_{n:02d}_prompts.md) |
| Sous-titres paroles (brouillon) | `paroles_ecran_BROUILLON.srt` (à recaler sur la musique finale) |
| Animatique (storyboard minuté + paroles) | `animatique_VIDEO_{n:02d}.mp4` — à regarder avant toute génération IA |

## 3. Structure musicale
{chr(10).join(f"{i + 1}. **{a}** — {b}" for i, (a, b) in enumerate(v['structure']))}

## 4. Refrain (à mémoriser)
{chr(10).join("> " + ln for ln in next(l for lab, l in v['paroles'] if lab.startswith('Refrain') and not l[0].startswith('(bis')))}

## 5. Liste des scènes
| # | Temps | Partie | Personnages | Action | Caméra |
|---|---|---|---|---|---|
{chr(10).join(f"| {i + 1} | {sc[0]} | {sc[1]} | {', '.join(CHARS[parse_char(c)['k']]['name'] for c in sc[3]) or '—'} | {sc[4]} | {sc[5]} |" for i, sc in enumerate(v['scenes']))}

## 6. Description YouTube (à copier-coller)
```
{description(v)}
```

## 7. Tags
`{", ".join(v['tags'])}`

## 8. Paramètres de mise en ligne
- **Audience : « Oui, cette vidéo est conçue pour les enfants »** (obligatoire — COPPA / règles YouTube).
- Catégorie : *Éducation* (vidéos 2, 3, 6, 8) ou *Divertissement* (les autres).
- Langue de la vidéo et des sous-titres : Français. Ajouter le fichier de sous-titres des paroles recalé.
- Contenu modifié ou synthétique : non requis pour une animation cartoon manifestement irréaliste (vérifier l'aide YouTube au moment de la publication).
- Playlist : voir `09_SEO/PLAYLISTS_ET_MODELES_SEO.md`.
- Écrans de fin, fiches, commentaires, notifications et « Enregistrer dans une playlist » sont **désactivés** sur les vidéos « conçues pour les enfants » (aide YouTube « Fonctionnalités concernées par la COPPA »). L'enchaînement se fait donc par : playlists de la chaîne, compilations longues, et un plan final qui annonce oralement la prochaine chanson (sans lien cliquable).

## 9. Checklist de production
- [ ] Musique générée et validée (voix, paroles exactes, pas d'artefacts)
- [ ] Illustrations de toutes les scènes (cohérence des 5 personnages vérifiée avec les planches officielles)
- [ ] Animations générées scène par scène
- [ ] Montage calé sur la musique, paroles à l'écran (karaoké)
- [ ] Contrôle qualité : pas de flash, volume normalisé (-14 LUFS), aucune image incohérente
- [ ] Export 1920×1080 (ou 3840×2160), 24/25 fps, H.264, 16:9
- [ ] Miniature, titre, description, tags, chapitres
- [ ] Version Short (vertical 9:16, 30-50 s, refrain) préparée
"""


def musique_md(v):
    n = v["n"]
    style_line = (f"{v['style']}, French children's song, {v['bpm']} BPM, {v['mesure']}, {v['tonalite']}, "
                  f"{', '.join(v['instruments'][:5])}, clear and slow French diction, warm, joyful, high quality mix")
    return f"""# Musique — Vidéo {n:02d} : {v['titre']}

## Brief musical
- **Style :** {v['style']}
- **Tempo :** {v['bpm']} BPM · **Mesure :** {v['mesure']} · **Tonalité :** {v['tonalite']}
- **Instruments :** {", ".join(v['instruments'])}
- **Voix :** {v['voix']}
- **Durée cible :** {v['duree']}

## Structure
{chr(10).join(f"{i + 1}. **{a}** — {b}" for i, (a, b) in enumerate(v['structure']))}

## Prompt « style » (Suno, ElevenLabs Music ou équivalent) — max ~200 caractères recommandés
```
{style_line}
```

## Prompt de voix
```
{v['voix']} Chant en français, articulation très nette, aucune voix agressive, timbre doux et souriant, adapté aux 0-6 ans.
```

## Paroles formatées pour l'outil IA
Copier le fichier : `06_PAROLES/VIDEO_{n:02d}_paroles_pour_IA_musique.txt` (balises [Verse]/[Chorus] incluses).

## Maquette du refrain (générée localement — guide mélodique, PAS la musique finale)
- `maquettes/VIDEO_{n:02d}_refrain.mp3` : décompte + refrain joué 2 fois (mélodie + accords + basse).
- `maquettes/VIDEO_{n:02d}_refrain.mid` : à ouvrir dans un logiciel de musique (GarageBand, LMMS, MuseScore, FL Studio…).
- Mélodie : `{v['refrain_melodie']}`
- Accords (1 par mesure) : `{v['accords']}`

> Utilisation : donner la maquette à un compositeur, ou l'utiliser comme référence « audio upload/cover » dans un outil IA qui le permet (vérifier les droits : vous êtes l'auteur de cette mélodie).

## Contrôle qualité audio
- [ ] Paroles chantées **exactement** comme écrites (corriger/régénérer sinon)
- [ ] Prononciation française naturelle, pas d'accent étrange
- [ ] Pas de son strident ni de basse saturée (écoute au casque + petit haut-parleur de téléphone)
- [ ] Normalisation -14 LUFS intégrés, crête max -1 dBTP
- [ ] Export WAV 48 kHz 24 bits pour le montage + MP3 pour archive
- [ ] Capture d'écran / reçu de la génération + plan d'abonnement conservés (preuve de licence commerciale)
"""


def prompts_md(v):
    n = v["n"]
    out = [f"# Prompts de génération — Vidéo {n:02d} : {v['titre']}\n",
           "> Méthode : 1) générer l'image fixe de chaque scène en joignant les **planches officielles** des personnages présents "
           "(`02_PERSONNAGES/<NOM>/<nom>_vue_face.png` + `_planche_rotation.png`) comme images de référence ; "
           "2) animer l'image validée avec le prompt d'animation (image → vidéo). "
           "Les verrous des personnages sont en anglais (meilleure fidélité) ; la ligne « Story beat » est en français "
           "(acceptée par la plupart des outils récents — traduisez-la pour Midjourney).\n",
           f"**Style commun (à garder identique sur toute la chaîne) :**\n```\n{STYLE}\n```\n",
           f"**Prompt négatif commun :**\n```\n{NEG}\n```\n"]
    scs = v["scenes"]
    for i, sc in enumerate(scs):
        tc, section, bgname, chars, action, camera, props = sc
        action = action.rstrip(".")
        nxt = secs(scs[i + 1][0]) if i + 1 < len(scs) else dur_to_s(v["duree"])
        d = max(4, nxt - secs(tc))
        cs = [parse_char(c) for c in chars]
        who = "; ".join(f"{LOCKS[c['k']].split(':')[0]} {pos_word(c['x'])}, {POSE_EN[c['pose']]}, {EXPR_EN[c['expr']]}" for c in cs) or "no character"
        locks = "\n".join(LOCKS[k] for k in dict.fromkeys(c["k"] for c in cs))
        motion = "; ".join(f"{LOCKS[c['k']].split(':')[0]}: {MOTION_EN[c['pose']]}" for c in cs) or "slow ambient motion only"
        ref = ", ".join(f"02_PERSONNAGES/{c['k'].upper()}/{c['k']}_vue_face.png" for c in {c['k']: c for c in cs}.values()) or "—"
        out.append(f"""---
## Scène {i + 1} — {tc} · {section} (≈ {d} s)
**Personnages :** {", ".join(CHARS[c['k']]['name'] for c in cs) or "aucun"} · **Décor :** {bgname} · **Caméra :** {camera}
**Références à joindre :** {ref}

**Prompt image :**
```
{STYLE}.
Setting: {BG_EN[bgname]}.
Characters: {who}.
{locks}
Story beat (FR): {action}
Camera: {camera}. Characters fully visible, clear readable silhouettes, eye-level child perspective, no text.
```
**Prompt animation (image → vidéo, {min(10, d)} s par plan{", enchaîner plusieurs plans" if d > 10 else ""}) :**
```
Animate this exact image. {motion}. Story beat (FR): {action}. Camera: {camera}.
Smooth 24 fps cartoon animation with soft squash and stretch, mouths moving gently in sync with a {v['bpm']} BPM children's song,
keep every character's design, colors, proportions and outfit EXACTLY identical to the reference, no morphing,
no new characters, no text, no flicker, no flashing lights.
```
""")
    return "\n".join(out)


def storyboard_md(v):
    n = v["n"]
    rows = []
    for i, sc in enumerate(v["scenes"]):
        cs = [parse_char(c) for c in sc[3]]
        who = ", ".join(f"{CHARS[c['k']]['name']} ({c['pose']}, {c['expr']})" for c in cs) or "—"
        rows.append(f"| {i + 1} | {sc[0]} | {sc[1]} | {sc[2]} | {who} | {sc[4]} | {sc[5]} |")
    return f"""# Storyboard — Vidéo {n:02d} : {v['titre']}

![Storyboard](VIDEO_{n:02d}_storyboard.png)

*Planche générée automatiquement avec les personnages officiels (cadrage et composition de référence). La version finale sera produite avec les prompts de `08_PROMPTS/VIDEO_{n:02d}_prompts.md`.*

| # | Temps | Partie | Décor | Personnages (pose, expression) | Action | Caméra |
|---|---|---|---|---|---|---|
{chr(10).join(rows)}

## Règles de mise en scène (toutes vidéos)
- Plans longs (3 à 8 s) : pas de montage épileptique, rythme calme et lisible pour les 0-6 ans.
- Personnages toujours entièrement lisibles, regard caméra fréquent pour créer le lien.
- Les gestes à imiter sont filmés **de face**, plan entier, fixes.
- Aucun flash, aucun clignotement rapide, aucun bruit soudain fort.
- Le « plan signature » des 5 copains alignés (ordre : Luna, Bibou, Milo, Pipo, Nounou) revient dans chaque vidéo.
"""


def master_prompts_md():
    out = ["# Prompts maîtres des personnages (verrouillage visuel)\n",
           "À coller **tels quels** dans chaque prompt, avec les images de référence officielles. Ne jamais reformuler.\n",
           f"## Style commun\n```\n{STYLE}\n```\n", f"## Prompt négatif commun\n```\n{NEG}\n```\n"]
    for k, l in LOCKS.items():
        out.append(f"## {CHARS[k]['name']}\n```\n{l}\n```\nRéférences : `02_PERSONNAGES/{k.upper()}/` (face, profil, dos, planche de rotation, expressions, poses)\n")
    out.append("## Image de groupe\n```\n" + STYLE + ".\nSetting: " + BG_EN["ile"] + ".\nCharacters from left to right: LUNA, BIBOU, MILO (center, slightly bigger, front), PIPO, NOUNOU, all waving and smiling at camera.\n" + "\n".join(LOCKS.values()) + "\n```\n")
    return "\n".join(out)


def main():
    os.makedirs(D("05_MUSIQUES", "maquettes"), exist_ok=True)
    seo = ["# SEO des 10 premières vidéos (titres, descriptions, tags)\n"]
    for v in VIDEOS:
        n = v["n"]
        vd = D("04_VIDEOS", f"VIDEO_{n:02d}")
        os.makedirs(vd, exist_ok=True)
        open(os.path.join(vd, "FICHE_VIDEO.md"), "w").write(fiche_video(v))
        open(os.path.join(vd, "paroles_ecran_BROUILLON.srt"), "w").write(srt(v))
        open(D("05_MUSIQUES", f"VIDEO_{n:02d}_musique.md"), "w").write(musique_md(v))
        open(D("06_PAROLES", f"VIDEO_{n:02d}_paroles.md"), "w").write(
            f"# Paroles — {v['titre']}\n\n*Paroles originales © {CHANNEL}. Tempo {v['bpm']} BPM, {v['mesure']}.*\n\n" + lyrics_md(v))
        open(D("06_PAROLES", f"VIDEO_{n:02d}_paroles_pour_IA_musique.txt"), "w").write(lyrics_md(v, for_ai=True))
        open(D("07_STORYBOARDS", f"VIDEO_{n:02d}_storyboard.md"), "w").write(storyboard_md(v))
        open(D("08_PROMPTS", f"VIDEO_{n:02d}_prompts.md"), "w").write(prompts_md(v))
        storyboard_png(v)
        mel = parse_melody(v["refrain_melodie"])
        chords = v["accords"].split()
        bpb = 3 if v["mesure"].startswith("3") else 4
        write_midi(D("05_MUSIQUES", "maquettes", f"VIDEO_{n:02d}_refrain.mid"), mel, chords, v["bpm"], bpb)
        synth(D("05_MUSIQUES", "maquettes", f"VIDEO_{n:02d}_refrain.mp3"), mel, chords, v["bpm"], bpb, lullaby=(n == 9))
        seo.append(f"## Vidéo {n:02d}\n**Titre :** {v['titre_yt']}\n\n**Tags :** {', '.join(v['tags'])}\n\n**Description :**\n```\n{description(v)}\n```\n")
    open(D("09_SEO", "SEO_10_VIDEOS.md"), "w").write("\n".join(seo))
    open(D("08_PROMPTS", "PROMPTS_MAITRES_PERSONNAGES.md"), "w").write(master_prompts_md())
    run()


if __name__ == "__main__":
    main()
