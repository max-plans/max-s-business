# -*- coding: utf-8 -*-
"""
Paroles à l'écran au style Tralalune.

1) Convertir un SRT (paroles minutées) en sous-titres stylés ASS (Fredoka, blanc, contour bleu nuit,
   le texte passe progressivement en jaune pendant qu'il est chanté — effet karaoké) :
     python3 _outils/karaoke.py paroles.srt paroles.ass
2) Incruster directement dans une vidéo (ffmpeg requis) :
     python3 _outils/karaoke.py paroles.srt paroles.ass --video montage.mp4 --out final.mp4

Astuce : recalez d'abord le SRT sur la musique finale (Subtitle Edit, Aegisub ou DaVinci Resolve),
le fichier paroles_ecran_BROUILLON.srt de chaque vidéo n'est qu'une estimation.
"""
import os
import re
import subprocess
import sys

FONTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "01_IDENTITE", "charte_graphique", "polices")

HEADER = """[Script Info]
Title: Tralalune - paroles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Paroles,Fredoka,78,&H003FD2FF,&H00FFFFFF,&H006E2D2B,&H64000000,-1,0,0,0,100,100,1,0,1,6,2,2,120,120,80,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
# Couleurs ASS en &HAABBGGRR : primaire = jaune soleil #FFD23F (texte déjà chanté),
# secondaire = blanc (texte à venir), contour = bleu nuit #2B2D6E.


def t2s(t):
    h, m, rest = t.split(":")
    s, ms = rest.split(",")
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000


def s2ass(x):
    h = int(x // 3600)
    m = int(x % 3600 // 60)
    s = x % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def parse_srt(path):
    blocks = re.split(r"\n\s*\n", open(path, encoding="utf-8").read().strip())
    out = []
    for b in blocks:
        lines = b.strip().splitlines()
        if len(lines) < 3:
            continue
        a, z = [t.strip() for t in lines[1].split("-->")]
        out.append((t2s(a), t2s(z), " ".join(lines[2:])))
    return out


def karaoke_line(start, end, text):
    words = text.split()
    total_cs = max(1, int((end - start) * 100 * 0.9))
    weights = [max(1, len(w)) for w in words]
    tot = sum(weights)
    parts = [f"{{\\kf{max(1, int(total_cs * w / tot))}}}{word}" for w, word in zip(weights, words)]
    return " ".join(parts)


def srt_to_ass(srt, ass):
    ev = []
    for a, z, txt in parse_srt(srt):
        ev.append(f"Dialogue: 0,{s2ass(a)},{s2ass(z)},Paroles,,0,0,0,,{{\\fad(150,150)}}{karaoke_line(a, z, txt)}")
    open(ass, "w", encoding="utf-8").write(HEADER + "\n".join(ev) + "\n")
    return ass


def burn(video, ass, out):
    # Les polices woff2 sont converties à la volée par libass si fontconfig les trouve ;
    # pour un rendu garanti, installez Fredoka (TTF) depuis fonts.google.com.
    vf = f"subtitles={ass}:fontsdir={FONTS_DIR}"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", video, "-vf", vf, "-c:a", "copy", out], check=True)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    srt_to_ass(sys.argv[1], sys.argv[2])
    if "--video" in sys.argv:
        burn(sys.argv[sys.argv.index("--video") + 1], sys.argv[2], sys.argv[sys.argv.index("--out") + 1])
    print("OK")
