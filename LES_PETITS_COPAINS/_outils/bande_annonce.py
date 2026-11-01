# -*- coding: utf-8 -*-
"""
BANDE-ANNONCE DE LA CHAÎNE (≈ 55 s, 1920x1080, 25 i/s) :
personnages animés (rebonds, coucou, danse), bulles de dialogue, extraits des miniatures,
musique instrumentale originale (jingle + thème « Tous ensemble, on danse ! »).

Usage : python3 _outils/bande_annonce.py
Sortie : 04_VIDEOS/BANDE_ANNONCE/bande_annonce_Tralalune_1080p.mp4 (+ script voix, SRT, miniature)
"""
import json
import math
import os
import subprocess
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import art  # noqa: E402
from art import defs, place  # noqa: E402
import scenes as S  # noqa: E402
from common import ROOT, BUILD, FONT_CSS, TOOLS  # noqa: E402

FPS = 25
DUR = 55.0
BPM = 124
BEAT = 60.0 / BPM
OUT = os.path.join(ROOT, "04_VIDEOS", "BANDE_ANNONCE")
os.makedirs(OUT, exist_ok=True)
LOGO_COLS = ["#FF9F1C", "#FF86C3", "#A66BFF", "#5CC85A", "#2EC4C8", "#4A8FE7", "#FFD23F", "#FF86C3", "#FF9F1C"]

# Poses supplémentaires (uniquement pour l'animation, sans modifier le design)
art.POSES["coucou_b"] = (18, -118, 0, 0)
art.POSES["danse_b"] = (38, -132, -9, 0)

# (début, fin, décor)
SCENES = [(0.0, 5.5, "ile"), (5.5, 12.5, "matin"), (12.5, 20.0, "nuit"), (20.0, 27.5, "fete"),
          (27.5, 35.0, "chiffres"), (35.0, 46.0, "vitrine"), (46.0, 55.0, "scene")]

# Répliques (bulles + script voix)
LINES = [
    (6.4, 12.0, "Milo", "Coucou ! Bienvenue à Tralalune, l'île qui chante !"),
    (13.6, 19.6, "Luna", "Ici, quand on chante, tout se met à briller !"),
    (21.0, 27.2, "Bibou", "On rigole…"),
    (23.2, 27.2, "Pipo", "… et on danse ! Rooar !"),
    (30.0, 34.7, "Nounou", "Et on apprend les couleurs, les chiffres, les émotions !"),
    (47.6, 54.5, "Tous", "Chante, danse et rêve avec les copains !"),
]


def bubble(x, y, w, h, text, tail="left", size=40, col="#2B2D6E"):
    tx = x + 60 if tail == "left" else x + w - 60
    d = f"M {tx - 22} {y + h - 4} L {tx + (-50 if tail == 'left' else 50)} {y + h + 46} L {tx + 22} {y + h - 4} Z"
    words = text.split()
    lines, cur = [], ""
    maxc = int(w / (size * 0.52))
    for wd in words:
        if len(cur) + len(wd) + 1 > maxc:
            lines.append(cur)
            cur = wd
        else:
            cur = (cur + " " + wd).strip()
    lines.append(cur)
    ty0 = y + h / 2 - (len(lines) - 1) * size * 0.6 + size * 0.35
    t = "".join(f'<text x="{x + w / 2}" y="{ty0 + i * size * 1.2:.0f}" text-anchor="middle" font-family="Fredoka" '
                f'font-weight="700" font-size="{size}" fill="{col}">{ln}</text>' for i, ln in enumerate(lines))
    return (f'<g filter="url(#softshadow)"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{h / 2.4:.0f}" fill="#FFFFFF"/>'
            f'<path d="{d}" fill="#FFFFFF"/></g>{t}')


def bub(id_, x, y, w, h, text, t0, tail="left", size=40):
    """Bulle qui « pope » depuis son centre."""
    cx, cy = x + w / 2, y + h / 2
    return anim(id_, f'<g transform="translate({-cx} {-cy})">' + bubble(x, y, w, h, text, tail, size) + "</g>", "pop", cx, cy, t0)


def anim(id_, body, cls, x, y, t0=0.0, extra=""):
    """Élément animé : groupe extérieur fixe (position) + groupe intérieur piloté par le JS."""
    return (f'<g transform="translate({x} {y})"><g id="{id_}" class="{cls}" data-t="{t0}" {extra}>{body}</g></g>')


def char(id_, k, x, base, h, poses, expr, t0, flip=False, period=0.25):
    """Personnage animé : alterne entre plusieurs poses (pour simuler le mouvement)."""
    sub = "".join(f'<g class="frame" style="display:{"inline" if i == 0 else "none"}">'
                  f'{place(k, 0, 0, h, expr=expr, pose=p, flip=flip)}</g>' for i, p in enumerate(poses))
    return anim(id_, sub, "pop bob alt", x, base, t0, f'data-period="{period}"')


def build_svg():
    o = []
    # Scène 1 – l'île
    s = S.bg("ile") + S.sparkles([(180, 160, 22), (1100, 140, 26), (980, 300, 16), (300, 320, 14)])
    s += anim("logo1", S.multicolor_title(0, 0, "Tralalune", 170, LOGO_COLS, "#2B2D6E", 16, -3, 2), "pop", 640, 200, 0.6)
    s += anim("sub1", '<rect x="-300" y="-40" width="600" height="64" rx="32" fill="#2B2D6E"/>'
              '<text x="0" y="5" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="34" fill="#fff">'
              'Comptines &amp; chansons pour enfants</text>', "pop", 640, 290, 1.6)
    o.append(f'<g id="sc0" class="scene">{s}</g>')
    # Scène 2 – Milo
    s = S.bg("matin") + char("milo2", "milo", 400, 690, 560, ["coucou", "coucou_b"], "joyeux", 5.8)
    s += bub("b2", 640, 140, 560, 190, LINES[0][3], LINES[0][0])
    o.append(f'<g id="sc1" class="scene">{s}</g>')
    # Scène 3 – Luna
    s = S.bg("nuit") + char("luna3", "luna", 880, 690, 520, ["danse", "danse_b"], "joyeux", 12.8, period=0.48)
    s += anim("tw3", S.sparkles([(700, 260, 26), (1060, 240, 30), (1150, 420, 20), (640, 480, 18), (980, 120, 16)], "#FFF3B0"), "twinkle", 0, 0, 13.0)
    s += bub("b3", 90, 150, 520, 190, LINES[1][3], LINES[1][0], tail="right")
    o.append(f'<g id="sc2" class="scene">{s}</g>')
    # Scène 4 – Bibou & Pipo
    s = S.bg("fete") + char("bibou4", "bibou", 360, 690, 440, ["danse", "saut"], "rire", 20.3, period=0.48)
    s += char("pipo4", "pipo", 920, 690, 440, ["saut", "danse"], "joyeux", 22.6, flip=True, period=0.48)
    s += bub("b4a", 140, 120, 360, 130, LINES[2][3], LINES[2][0])
    s += bub("b4b", 650, 120, 540, 130, LINES[3][3], LINES[3][0], tail="right")
    o.append(f'<g id="sc3" class="scene">{s}</g>')
    # Scène 5 – Nounou
    s = S.bg("chiffres") + char("nounou5", "nounou", 330, 700, 540, ["montre", "debout"], "joyeux", 27.8, period=0.97)
    for i, (n, c) in enumerate([("1", "#FF5A5F"), ("2", "#5CC85A"), ("3", "#3D8BFD")]):
        s += anim(f"tile5{i}", S.number_tile(0, 0, n, c, 1.1), "pop bobsoft", 760 + i * 160, 470, 28.6 + i * 0.4)
    s += bub("b5", 600, 110, 620, 190, LINES[4][3], LINES[4][0])
    o.append(f'<g id="sc4" class="scene">{s}</g>')
    # Scène 6 – vitrine des comptines (miniatures réelles)
    i, d = S.radial(["#6A4FD8", "#3B2E9A", "#1B1D4E"], 0.5, 0.5, 0.8)
    s = d + '<rect width="1280" height="720" fill="url(#%s)"/>' % i
    s += S.confetti(30, 4)
    thumbs = ["M01_bonjour_les_amis.png", "M02_couleurs_avec_milo.png", "M03_chiffres_1_2_3.png",
              "M05_pipo_fait_la_fete.png", "M08_brossage_des_dents.png", "M09_bonne_nuit_luna.png"]
    for k, f in enumerate(thumbs):
        x = 70 + (k % 3) * 390
        y = 110 + (k // 3) * 235
        href = "file://" + os.path.join(ROOT, "03_MINIATURES", f)
        body = (f'<rect x="-174" y="-99" width="348" height="198" rx="18" fill="#FFFFFF"/>'
                f'<image href="{href}" x="-168" y="-94.5" width="336" height="189" clip-path="inset(0 round 14px)"/>')
        s += anim(f"th{k}", body, "pop", x + 174, y + 99, 35.3 + k * 0.85)
    s += anim("cap6", '<rect x="-540" y="-44" width="1080" height="76" rx="38" fill="#FFD23F"/>'
              '<text x="0" y="8" text-anchor="middle" font-family="Baloo2" font-weight="800" font-size="44" fill="#2B2D6E">'
              'Des comptines 100 % originales pour les 0-6 ans</text>', "pop", 640, 650, 40.8)
    o.append(f'<g id="sc5" class="scene">{s}</g>')
    # Scène 7 – final
    s = S.bg("scene")
    for k, x, h, fl, t0 in [("luna", 240, 300, False, 46.2), ("bibou", 430, 300, False, 46.4), ("pipo", 850, 300, True, 46.6),
                            ("nounou", 1040, 300, True, 46.8), ("milo", 640, 360, False, 46.0)]:
        s += char(f"{k}7", k, x, 690, h, ["saut", "danse"] if k != "milo" else ["saut", "coucou"], "rire", t0, fl, 0.48)
    s += anim("logo7", S.multicolor_title(0, 0, "Tralalune", 130, LOGO_COLS, "#2B2D6E", 13, -3, 2), "pop", 640, 140, 46.5)
    s += anim("slog7", '<rect x="-400" y="-42" width="800" height="72" rx="36" fill="#FFFFFF"/>'
              '<text x="0" y="8" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="40" fill="#2B2D6E">'
              'Chante, danse et rêve avec les copains !</text>', "pop", 640, 232, LINES[5][0])
    s += anim("badge7", '<rect x="-330" y="-34" width="660" height="60" rx="30" fill="#FF9F1C" stroke="#fff" stroke-width="5"/>'
              '<text x="0" y="8" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="32" fill="#fff">'
              'Une nouvelle comptine chaque mercredi</text>', "pop", 640, 312, 49.5)
    o.append(f'<g id="sc6" class="scene">{s}</g>')
    o.append('<rect id="fade" width="1280" height="720" fill="#000" opacity="0"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1280 720">'
            f'{defs()}{"".join(o)}</svg>')


JS = """
const SC = %s, BEAT = %f, DUR = %f;
function easeOutBack(x){const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2);}
window.setT = function(t){
  SC.forEach((s,i)=>{const g=document.getElementById('sc'+i);
    let op = (t>=s[0]-0.35 && t<s[1]+0.35) ? Math.min(1,(t-(s[0]-0.35))/0.35, ((s[1]+0.35)-t)/0.35) : 0;
    if(i===0) op = t<s[1]+0.35 ? Math.min(1,((s[1]+0.35)-t)/0.35) : 0;
    if(i===SC.length-1) op = t>=s[0]-0.35 ? Math.min(1,(t-(s[0]-0.35))/0.35) : 0;
    g.style.opacity = Math.max(0,op); g.style.display = op>0 ? 'inline':'none';});
  document.querySelectorAll('.pop, .twinkle, .bobsoft').forEach(el=>{
    const t0 = parseFloat(el.dataset.t||0); let sc = 1, dy = 0, sy = 1, op = 1;
    if(el.classList.contains('pop')){ const p = Math.min(1, Math.max(0,(t-t0)/0.5)); sc = p<=0?0:easeOutBack(p); }
    if(el.classList.contains('bob') && t>t0+0.5){ const ph = ((t-t0)/BEAT)%%1; dy = -Math.abs(Math.sin(Math.PI*ph))*14; sy = 1-0.035*Math.cos(2*Math.PI*ph); }
    if(el.classList.contains('bobsoft') && t>t0+0.5){ dy = Math.sin((t-t0)*3)*8; }
    if(el.classList.contains('twinkle')){ op = t<t0?0:0.55+0.45*Math.sin((t-t0)*6); }
    el.setAttribute('transform', `translate(0 ${dy.toFixed(2)}) scale(${(sc*(2-sy)).toFixed(4)} ${(sc*sy).toFixed(4)})`);
    el.style.opacity = op;
    if(el.classList.contains('alt')){ const per = parseFloat(el.dataset.period); const fr = el.querySelectorAll(':scope > .frame');
      const idx = t<t0+0.5 ? 0 : Math.floor((t-t0)/per)%%fr.length; fr.forEach((f,j)=>f.style.display = j===idx?'inline':'none'); }
  });
  document.getElementById('fade').setAttribute('opacity', Math.max(0, Math.min(1,(t-(DUR-1.0))/1.0)).toFixed(3));
};
"""

RENDER_JS = """
const { chromium } = require('playwright');
(async () => {
  const [,, html, outdir, n, fps] = process.argv;
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1920,height:1080}});
  await p.goto('file://' + html); await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  for (let i = 0; i < +n; i++) {
    await p.evaluate(t => window.setT(t), i / +fps);
    await p.screenshot({ path: `${outdir}/f${String(i).padStart(5,'0')}.jpg`, type: 'jpeg', quality: 92 });
  }
  await b.close();
})();
"""


# ---------------------------------------------------------------------------- musique
NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def midi(n):
    acc = 1 if "#" in n else (-1 if len(n) > 2 and n[1] == "b" else 0)
    return 12 * (int(n[-1]) + 1) + NOTE[n[0]] + acc


def music(path):
    sr = 44100
    N = int(sr * DUR)
    buf = np.zeros(N)
    f = lambda m: 440 * 2 ** ((m - 69) / 12)  # noqa: E731

    def add(t, sig):
        i = int(t * sr)
        j = min(N, i + len(sig))
        if i < N:
            buf[i:j] += sig[: j - i]

    def bell(fr, d, a):
        t = np.arange(int(sr * d)) / sr
        return a * np.exp(-t * 3) * np.minimum(1, t / 0.004) * (np.sin(2 * np.pi * fr * t) + 0.35 * np.sin(4 * np.pi * fr * t) + 0.1 * np.sin(6 * np.pi * fr * t))

    def pad(fr, d, a):
        t = np.arange(int(sr * d)) / sr
        return a * np.minimum(1, t / 0.2) * np.clip((d - t) / 0.25, 0, 1) * (np.sin(2 * np.pi * fr * t) + 0.25 * np.sin(4 * np.pi * fr * t))

    def bass(fr, d, a):
        t = np.arange(int(sr * d)) / sr
        return a * np.exp(-t * 3) * (np.sin(2 * np.pi * fr * t) + 0.3 * np.sin(4 * np.pi * fr * t))

    def kick(a):
        t = np.arange(int(sr * 0.25)) / sr
        return a * np.exp(-t * 18) * np.sin(2 * np.pi * (120 * np.exp(-t * 20) + 45) * t)

    def hat(a):
        t = np.arange(int(sr * 0.05)) / sr
        return a * np.exp(-t * 80) * np.random.default_rng(1).uniform(-1, 1, len(t))

    def clap(a):
        t = np.arange(int(sr * 0.12)) / sr
        return a * np.exp(-t * 35) * np.random.default_rng(2).uniform(-1, 1, len(t))

    # Jingle « Tra-la-lu-ne » (4 notes montantes) + carillon
    for k, n in enumerate(["C5", "E5", "G5", "C6"]):
        add(0.6 + k * 0.22, bell(f(midi(n)), 1.6, 0.35))
    for k in range(6):
        add(2.0 + k * 0.09, bell(f(midi("C6")) * (1 + k * 0.12), 0.8, 0.08))
    # Thème : refrain de « Tous ensemble, on danse ! » en boucle, à partir de 5,5 s
    mel = ("G4:.5 G4:.5 B4 D5 D5:.5 E5:.5 D5 B4:2 C5:.5 C5:.5 E5 G5 E5 D5 C5 B4:2 "
           "G4:.5 G4:.5 B4 D5 D5:.5 E5:.5 D5 B4:2 C5 E5 D5 A4 G4:4").split()
    chords = {"G": ["G3", "B3", "D4"], "C": ["C3", "E3", "G3"], "D": ["D3", "F#3", "A3"]}
    prog = "G C D G G C D G".split()
    start = 5.5
    t = start
    rep = 0
    while t < DUR - 2:
        tm = t
        for tok in mel:
            n, d = (tok.split(":") + ["1"])[:2]
            add(tm, bell(f(midi(n)), float(d) * BEAT + 0.5, 0.26 if 35 <= tm < 46 or rep % 2 == 0 else 0.20))
            tm += float(d) * BEAT
        for b, ch in enumerate(prog):
            bt = t + b * 4 * BEAT
            for n in chords[ch]:
                add(bt, pad(f(midi(n)), 4 * BEAT, 0.05))
            add(bt, bass(f(midi(chords[ch][0]) - 12), 1.5 * BEAT, 0.22))
            add(bt + 2 * BEAT, bass(f(midi(chords[ch][0]) - 12), 1.5 * BEAT, 0.18))
            for q in range(4):
                add(bt + q * BEAT, kick(0.35) if q % 2 == 0 else clap(0.12))
                add(bt + q * BEAT + BEAT / 2, hat(0.05))
        t += 32 * BEAT
        rep += 1
    # accord final
    for n in ["G3", "B3", "D4", "G4"]:
        add(DUR - 2.4, pad(f(midi(n)), 2.3, 0.07))
    add(DUR - 2.4, bell(f(midi("G5")), 2.0, 0.3))
    fade = np.ones(N)
    fade[-sr:] = np.linspace(1, 0, sr)
    buf *= fade
    buf /= np.abs(buf).max() / 0.85
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((buf * 32767).astype(np.int16).tobytes())


def fmt(x):
    return f"00:00:{int(x):02d},{int((x % 1) * 1000):03d}"


def main():
    html = os.path.join(BUILD, "bande_annonce.html")
    with open(html, "w", encoding="utf-8") as fh:
        fh.write(f"<!DOCTYPE html><html><head><meta charset='utf-8'><style>{FONT_CSS}html,body{{margin:0;background:#000}}"
                 f".scene{{display:none}}</style></head><body>{build_svg()}"
                 f"<script>{JS % (json.dumps([[a, b] for a, b, _ in SCENES]), BEAT, DUR)}</script></body></html>")
    frames = os.path.join(BUILD, "ba_frames")
    os.makedirs(frames, exist_ok=True)
    for f in os.listdir(frames):
        os.remove(os.path.join(frames, f))
    rj = os.path.join(TOOLS, "render_frames.js")
    open(rj, "w").write(RENDER_JS)
    n = int(DUR * FPS)
    subprocess.run(["node", rj, html, frames, str(n), str(FPS)], check=True)
    wav = os.path.join(BUILD, "ba_music.wav")
    music(wav)
    out = os.path.join(OUT, "bande_annonce_Tralalune_1080p.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(frames, "f%05d.jpg"),
                    "-i", wav, "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-af", "loudnorm=I=-14:TP=-1.5", "-shortest", "-movflags", "+faststart", out], check=True)
    # vignette (image de la scène finale)
    subprocess.run(["cp", os.path.join(frames, f"f{int(51 * FPS):05d}.jpg"), os.path.join(OUT, "image_bande_annonce.jpg")], check=True)
    # sous-titres / script voix
    with open(os.path.join(OUT, "sous_titres_repliques.srt"), "w") as fh:
        for i, (a, b, who, txt) in enumerate(LINES, 1):
            fh.write(f"{i}\n{fmt(a)} --> {fmt(b)}\n{txt}\n\n")
    print("OK", out)


if __name__ == "__main__":
    main()
