# -*- coding: utf-8 -*-
"""
STUDIO GRATUIT TRALALUNE — transforme une chanson (MP3/WAV) en dessin animé musical.

  python3 _outils/studio_gratuit.py kit    V01_bonjour_les_amis   → KIT_SUNO.md + KIT_ELEVENLABS.md (style + paroles exactes)
  python3 _outils/studio_gratuit.py video  V01_bonjour_les_amis   → vidéo 1080p + Short 1080x1920 + miniature
  python3 _outils/studio_gratuit.py short  V01_bonjour_les_amis   → refait seulement le Short (habillage Tralalune)

Entrées (dans PRODUCTION_VIDEO/<ID>/) :
  production.json        plan : sections, paroles, qui chante, décors, personnages, caméra
  MUSIQUE/chanson.mp3    la chanson chantée (ElevenLabs, ou votre propre enregistrement)
  MUSIQUE/calage.json    (optionnel mais recommandé) début de chaque ligne, créé avec outils/calage_paroles.html
Sans calage.json, les temps sont ESTIMÉS automatiquement (à vérifier).

Tout est local et gratuit : personnages officiels (art.py), décors (scenes.py), bouche animée selon
l'énergie de la voix, rebonds sur le tempo, caméra, transitions, paroles karaoké, effets sonores, FFmpeg.
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
import karaoke  # noqa: E402
from common import ROOT, BUILD, FONT_CSS, TOOLS, svg_page, run  # noqa: E402

FPS = 25
PROD = os.path.join(ROOT, "PRODUCTION_VIDEO")
LOGO_COLS = ["#FF9F1C", "#FF86C3", "#A66BFF", "#5CC85A", "#2EC4C8", "#4A8FE7", "#FFD23F", "#FF86C3", "#FF9F1C"]
ALL = ["milo", "luna", "bibou", "pipo", "nounou"]

# Variantes d'animation (aucune modification du design des personnages)
art.POSES.update({"coucou_b": (18, -118, 0, 0), "danse_b": (38, -132, -9, 0), "chante_b": (24, -24, 2, 0),
                  "bras_haut": (150, -150, 0, 0), "bras_bas": (-10, 10, 0, 0)})
art.EXPRS.update({"bouche0": ("open", "neutral", "smile"), "bouche1": ("open", "neutral", "open_smile"),
                  "bouche2": ("open", "up", "laugh")})
POSESETS = {"chante": ["debout", "chante_b"], "coucou": ["coucou", "coucou_b"], "danse": ["danse", "danse_b"],
            "saut": ["saut", "danse"], "gestes": ["bras_haut", "bras_bas"]}
STYLE_KIT = ("Joyful French children's nursery rhyme, acoustic kids pop, {bpm} BPM, major key, ukulele, glockenspiel, "
             "hand claps, soft round bass, light brushed drums, birds chirping in the intro. Lead vocal: bright, warm, "
             "cheerful young cartoon voice singing in French with slow, very clear diction. Chorus sung together by a "
             "small group of children's voices. Happy, gentle, reassuring, made for toddlers.")


def load(vid):
    d = os.path.join(PROD, vid)
    with open(os.path.join(d, "production.json"), encoding="utf-8") as f:
        return d, json.load(f)


# ------------------------------------------------------------------------------------------- KIT
def kit(vid):
    d, p = load(vid)
    lyr = []
    for s in p["sections"]:
        lyr.append(s["tag"])
        if s["lignes"]:
            lyr.extend(s["lignes"])
        lyr.append("")
    lyrics = "\n".join(lyr).strip()
    style = STYLE_KIT.format(bpm=p["bpm"])
    md = f"""# Kit ElevenLabs — {p['titre']} (vidéo pilote, compte GRATUIT = test non commercial)

> ⚠️ Compte gratuit ElevenLabs : **usage non commercial uniquement**. La vidéo de test reste **privée** (ou non répertoriée, pour vous seul). Si le résultat vous plaît, passez à une offre payante et **régénérez** la chanson avec l'offre payante avant toute publication.

## Étapes (10 minutes)
1. Connectez-vous sur **elevenlabs.io** → menu **Music** (Eleven Music).
2. Collez le **prompt de style** ci-dessous.
3. Collez les **paroles** ci-dessous dans le champ des paroles (si l'interface génère d'abord un plan de chanson, ouvrez chaque section et **remplacez son texte** par les lignes correspondantes, sans rien modifier).
4. Durée visée : **environ 2 minutes** (accepter entre 1 min 40 et 2 min 30).
5. Générez **2 ou 3 versions** (surveillez votre compteur de crédits gratuits) et écoutez :
   - toutes les paroles sont-elles chantées **exactement** et compréhensibles ?
   - pas de mots inventés, pas de passage en anglais ?
   - voix douce, joyeuse, adaptée aux tout-petits ?
6. Téléchargez la meilleure en **MP3 (qualité maximale)** et renommez-la **`chanson.mp3`**.
7. Envoyez-la-moi (voir « Me transmettre la chanson » dans `PRODUCTION_VIDEO/README.md`).
8. (Recommandé) Calez les paroles avec `PRODUCTION_VIDEO/outils/calage_paroles.html` (2 minutes, sans installation) → `calage.json`.

## Prompt de style (à coller tel quel, en anglais = meilleure compréhension du modèle)
```
{style}
```

## Paroles exactes (à coller telles quelles)
```
{lyrics}
```

## Ce qu'il ne faut PAS accepter
- Une version qui change, saute ou invente des paroles → régénérer.
- Une voix adulte « rock » ou agressive, une batterie lourde → régénérer en insistant sur « gentle, made for toddlers ».
- Des paroles mal prononcées sur le refrain (c'est le passage le plus entendu).
"""
    open(os.path.join(d, "KIT_ELEVENLABS.md"), "w", encoding="utf-8").write(md)
    suno_style = p.get("style_suno") or (f"French children's nursery rhyme, joyful acoustic kids pop, {p['bpm']} BPM, ukulele, glockenspiel, "
                  "hand claps, bright cheerful cartoon voice, kids choir on chorus, clear French diction, gentle, medium tempo")
    suno = f"""# Kit Suno — {p['titre']}

> Outil musical retenu pour Tralalune (paroles françaises très fidèles). **Compte gratuit = test privé uniquement** ;
> pour publier : régénérer avec **Suno Pro/Premier** (droits commerciaux pour les morceaux créés pendant l'abonnement).

1. suno.com → **Create** → mode **Custom**.
2. **Lyrics** : coller les paroles ci-dessous (balises incluses).
3. **Style of Music** : coller le style ci-dessous.
4. **Title** : `{p['titre']}`
5. Écouter les 2 versions : paroles exactes, voix douce, refrain clair. Télécharger la meilleure en **MP3** → `MUSIQUE/chanson.mp3`.
6. Conserver dans `MUSIQUE/` une capture de l'écran du morceau (date, plan d'abonnement) = preuve de licence.

## Style of Music
```
{suno_style}
```

## Lyrics
```
{lyrics}
```
"""
    open(os.path.join(d, "KIT_SUNO.md"), "w", encoding="utf-8").write(suno)
    open(os.path.join(d, "MUSIQUE", "paroles_pour_elevenlabs.txt"), "w", encoding="utf-8").write(lyrics + "\n")
    print("OK", os.path.join(d, "KIT_ELEVENLABS.md"))


# ------------------------------------------------------------------------------------------- AUDIO
def decode(path, sr=22050):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32), sr


def voice_envelope(x, sr):
    """Énergie de la bande « voix » (250-3500 Hz), une valeur par image, normalisée 0..1."""
    hop = sr // FPS
    win = 2048
    n = len(x) // hop
    freqs = np.fft.rfftfreq(win, 1 / sr)
    band = (freqs > 250) & (freqs < 3500)
    w = np.hanning(win)
    env = np.zeros(n)
    xp = np.pad(x, (win // 2, win))
    for i in range(n):
        seg = xp[i * hop:i * hop + win] * w
        env[i] = np.sqrt(np.sum(np.abs(np.fft.rfft(seg))[band] ** 2))
    env = np.convolve(env, np.ones(3) / 3, mode="same")
    ref = np.percentile(env, 95) or 1.0
    return np.clip(env / ref, 0, 1.2)


def detect_beats(x, sr, bpm_hint):
    """Tempo réel + position du premier temps (flux spectral + autocorrélation), gratuit et local."""
    hop = 512
    win = 2048
    n = (len(x) - win) // hop
    w = np.hanning(win)
    prev = None
    flux = np.zeros(n)
    for i in range(n):
        mag = np.log1p(np.abs(np.fft.rfft(x[i * hop:i * hop + win] * w)))
        if prev is not None:
            flux[i] = np.sum(np.maximum(0, mag - prev))
        prev = mag
    flux -= np.convolve(flux, np.ones(16) / 16, mode="same")
    flux = np.maximum(flux, 0)
    fps_o = sr / hop
    ac = np.correlate(flux, flux, mode="full")[len(flux) - 1:]
    best, best_bpm = -1, bpm_hint
    for bpm in np.arange(55, 180, 0.5):
        lag = 60 * fps_o / bpm
        score = np.interp(lag, np.arange(len(ac)), ac) + 0.5 * np.interp(2 * lag, np.arange(len(ac)), ac)
        score *= np.exp(-0.5 * (np.log2(bpm / bpm_hint) / 0.4) ** 2)  # préférence douce pour le tempo prévu
        if score > best:
            best, best_bpm = score, bpm
    period = 60 * fps_o / best_bpm
    phases = np.arange(0, period, 0.5)
    sc = [flux[np.arange(ph, len(flux) - 1, period).astype(int)].sum() for ph in phases]
    phase = phases[int(np.argmax(sc))] / fps_o
    return float(best_bpm), float(phase)


KEYWORDS = [  # mot dans les paroles -> effet visuel synchronisé sur le mot
    ("clap", "claps"), ("tape dans", "claps"), ("tape des pieds", "stomp"), ("tap tap", "stomp"), ("saut", "jump"), ("hop", "jump"),
    ("bonds", "jump"), ("tour", "spin"), ("lève les bras", "arms_up"), ("haut", "arms_up"), ("soleil", "sun"),
    ("oiseaux", "birds"), ("cui", "birds"), ("fleurs", "flowers"), ("miel", "honey"), ("pomme", "apple"),
    ("crac", "apple"), ("coucou", "hearts"), ("sourit", "hearts"), ("ouaaah", "sun"), ("bonjour les amis", "sparkles"),
    ("rouge", "splash_FF5A5F"), ("jaune", "splash_FFD23F"), ("bleu", "splash_3D8BFD"), ("vert", "splash_5CC85A"),
    ("orange", "splash_FF9F1C"), ("violet", "splash_A66BFF"), ("arc-en-ciel", "rainbow"), ("pinceau", "sparkles"),
    ("fraise", "strawberry"),
]


def word_events(lines):
    ev = []
    for li, l in enumerate(lines):
        low = l["txt"].lower()
        span = max(0.5, l["t1"] - l["t0"])
        used = set()
        for kw, fx in KEYWORDS:
            pos = low.find(kw)
            if pos >= 0 and fx not in used:
                used.add(fx)
                ev.append(dict(t=round(l["t0"] + span * 0.9 * pos / max(1, len(low)), 2), fx=fx, line=li))
    return ev


def syllables(line):
    return max(1, sum(1 for c in line.lower() if c in "aeiouyéèêàâîôûœ"))


def estimate_timing(p, env, dur):
    """Estimation sans calage : lignes réparties (poids = syllabes) entre le début et la fin de la voix,
    puis chaque frontière est recalée sur le creux d'énergie le plus proche (respirations)."""
    lines = [(si, li, l) for si, s in enumerate(p["sections"]) for li, l in enumerate(s["lignes"])]
    instru = {si for si, s in enumerate(p["sections"]) if not s["lignes"] and si > 0}
    act = np.where(env > 0.35)[0]
    t_start = max(3.0, act[0] / FPS) if len(act) else 4.0
    t_end = min(dur - 1.5, act[-1] / FPS) if len(act) else dur - 2
    weights = []
    prev = None
    for si, li, l in lines:
        gap = 3.0 if (prev is not None and si != prev) else 0.0
        if prev is not None and si != prev:
            gap += 10.0 * sum(1 for x in instru if prev < x < si)  # place réservée aux pauses instrumentales
        weights.append((gap, syllables(l)))
        prev = si
    tot = sum(g + w for g, w in weights)
    scale = (t_end - t_start) / tot
    t = t_start
    starts = []
    for g, w in weights:
        t += g * scale
        starts.append(t)
        t += w * scale
    sm = np.convolve(env, np.ones(9) / 9, mode="same")
    out = []
    for k, st in enumerate(starts):
        a, b = int((st - 0.8) * FPS), int((st + 0.8) * FPS)
        a, b = max(0, a), min(len(sm) - 1, b)
        if k > 0 and b > a:
            st = (a + int(np.argmin(sm[a:b]))) / FPS + 0.1
        out.append(round(st, 2))
    return out


def align_from_vocals(p, voc, sr, dur):
    """Calage automatique sur la voix ISOLÉE : zones chantées / pauses instrumentales, puis chaque ligne
    est accrochée au début de phrase détecté le plus proche de sa position attendue."""
    hop = sr // 100
    n = len(voc) // hop
    e = np.array([np.sqrt(np.mean(voc[i * hop:(i + 1) * hop] ** 2)) for i in range(n)])
    e = np.convolve(e, np.ones(5) / 5, mode="same")
    e /= (np.percentile(e, 95) or 1)
    active = e > 0.10
    # pauses instrumentales (≥ 3,5 s sans voix)
    gaps, i = [], 0
    while i < n:
        if not active[i]:
            j = i
            while j < n and not active[j]:
                j += 1
            if (j - i) / 100 >= 3.5:
                gaps.append((i / 100, j / 100))
            i = j
        else:
            i += 1
    v0 = next((g[1] for g in gaps if g[0] < 0.5), np.argmax(active) / 100)
    v1 = next((g[0] for g in gaps if g[1] > dur - 0.5), (n - np.argmax(active[::-1])) / 100)
    mid = [g for g in gaps if g[0] > v0 + 1 and g[1] < v1 - 1]
    # groupes de lignes séparés par les sections instrumentales du plan
    groups, cur = [], []
    for si, sec in enumerate(p["sections"]):
        if not sec["lignes"]:
            if cur and si > 0:
                groups.append(cur)
                cur = []
            continue
        cur.extend((si, l) for l in sec["lignes"])
    if cur:
        groups.append(cur)
    if len(mid) == len(groups) - 1:
        bounds = [v0] + [x for g in mid for x in g] + [v1]
        regions = [(bounds[2 * k], bounds[2 * k + 1]) for k in range(len(groups))]
    else:
        groups = [[x for g in groups for x in g]]
        regions = [(v0, v1)]
    # débuts de phrases : remontée de la voix après un creux
    cand = []
    low = e < 0.18
    for k in range(10, n):
        if e[k] > 0.30 and low[k - 10:k].any() and (not cand or k / 100 - cand[-1] > 0.5):
            dip = k - 10 + int(np.argmin(e[k - 10:k]))
            cand.append(dip / 100)
    cand = np.array(cand)
    starts = []
    for grp, (a, b) in zip(groups, regions):
        # positions attendues : lignes régulières (une comptine suit une grille), petit écart entre sections
        w, prev_si = [], None
        for si, l in grp:
            w.append((0.5 if prev_si is not None and si != prev_si else 0.0, 1.0))
            prev_si = si
        tot = sum(g + x for g, x in w)
        t, exp = a, []
        for g, x in w:
            t += g * (b - a) / tot
            exp.append(t)
            t += x * (b - a) / tot
        step = (b - a) / tot
        c = cand[(cand >= a - 0.4) & (cand <= b)] if len(cand) else np.array([])
        m, nl = len(c), len(exp)
        if m < nl:
            starts.extend(round(x, 2) for x in exp)
            continue
        # programmation dynamique : proximité de la position attendue + régularité de l'espacement
        INF = 1e18
        cost = np.full((nl, m), INF)
        back = np.zeros((nl, m), dtype=int)
        cost[0] = ((c - exp[0]) / step) ** 2
        for i in range(1, nl):
            dexp = exp[i] - exp[i - 1]
            for j in range(i, m):
                prev = cost[i - 1, :j]
                dd = c[j] - c[:j]
                reg = ((dd - dexp) / step) ** 2 * 2.0 + np.where(dd < 0.7, INF, 0)
                tot_c = prev + reg
                k = int(np.argmin(tot_c))
                cost[i, j] = tot_c[k] + 0.5 * ((c[j] - exp[i]) / step) ** 2
                back[i, j] = k
        j = int(np.argmin(cost[-1]))
        sel = [j]
        for i in range(nl - 1, 0, -1):
            j = back[i, j]
            sel.append(j)
        starts.extend(round(float(c[k]), 2) for k in reversed(sel))
    return starts, dict(voix=(round(v0, 2), round(v1, 2)), pauses=[(round(a, 1), round(b, 1)) for a, b in mid],
                        debuts_detectes=len(cand))


def get_timing(d, p, env, dur):
    cal = os.path.join(d, "MUSIQUE", "calage.json")
    n = sum(len(s["lignes"]) for s in p["sections"])
    if os.path.exists(cal):
        c = json.load(open(cal, encoding="utf-8"))
        starts = [float(x) for x in c["debuts"]]
        if len(starts) == n:
            return starts, "calage manuel"
        print(f"⚠️ calage.json contient {len(starts)} temps pour {n} lignes : estimation automatique utilisée.")
    voc_path = os.path.join(d, "STEMS", "voix.wav")
    if os.path.exists(voc_path):
        voc, sr = decode(voc_path)
        starts, info = align_from_vocals(p, voc, sr, dur)
        print("Calage automatique sur la voix isolée :", info)
        return starts, "calage automatique (voix isolée)"
    return estimate_timing(p, env, dur), "estimation automatique"


# ------------------------------------------------------------------------------------------- PLAN
def build_timeline(p, starts, dur):
    lines = []
    k = 0
    for si, s in enumerate(p["sections"]):
        for li, txt in enumerate(s["lignes"]):
            lines.append(dict(si=si, li=li, txt=txt, t0=starts[k]))
            k += 1
    for i, l in enumerate(lines):
        nxt = lines[i + 1]["t0"] if i + 1 < len(lines) else dur - 0.5
        l["t1"] = min(nxt - 0.12, l["t0"] + 6.0)
    # bornes des sections
    sec_t = []
    for si, s in enumerate(p["sections"]):
        ls = [l for l in lines if l["si"] == si]
        sec_t.append(ls[0]["t0"] - 0.6 if ls else None)
    sec_t[0] = 0.0
    for si in range(len(sec_t)):
        if sec_t[si] is None:  # section instrumentale : commence après la dernière ligne chantée précédente
            prev = [l for l in lines if l["si"] < si]
            sec_t[si] = (prev[-1]["t1"] + 0.3) if prev else sec_t[si - 1] + 4.0
    bounds = [(sec_t[i], sec_t[i + 1] if i + 1 < len(sec_t) else dur) for i in range(len(sec_t))]
    shots = []
    for si, s in enumerate(p["sections"]):
        a, b = bounds[si]
        ls = [l for l in lines if l["si"] == si]
        plans = s["plans"]
        for pi, pl in enumerate(plans):
            if "lignes" in pl and ls:
                idx = pl["lignes"]
                t0 = a if pi == 0 else ls[idx[0]]["t0"] - 0.3
                t1 = b if pi == len(plans) - 1 else ls[plans[pi + 1]["lignes"][0]]["t0"] - 0.3
            else:
                t0 = a + (b - a) * pi / len(plans)
                t1 = a + (b - a) * (pi + 1) / len(plans)
            singers = pl.get("chante", [])
            singers = ALL if "tous" in singers else singers
            if t1 - t0 < 0.8:  # plan trop court (ex. pause instrumentale absente de la chanson) : ignoré
                if shots:
                    shots[-1]["t1"] = round(max(shots[-1]["t1"], t1), 2)
                continue
            shots.append(dict(plan=pl, si=si, t0=round(t0, 2), t1=round(t1, 2), singers=singers))
    for l in lines:
        s = p["sections"][l["si"]]
        ch = s.get("chanteurs", [])
        if ch and len(ch) == len(s["lignes"]) and len(ch) > 1:
            l["singers"] = ALL if ch[l["li"]] == "tous" else [ch[l["li"]]]
        elif "tous" in ch:
            l["singers"] = ALL
        else:
            l["singers"] = ch
    return lines, shots


# ------------------------------------------------------------------------------------------- RENDU
def char_group(k, poseset, x, h, flip, sings, base_expr="joyeux"):
    poses = POSESETS.get(poseset, ["debout", "debout"])
    mouths = ["bouche0", "bouche1", "bouche2"] if sings else [base_expr]
    sub = []
    for pi, pz in enumerate(poses):
        for mi, ex in enumerate(mouths):
            sub.append(f'<g class="v" data-p="{pi}" data-m="{mi}" style="display:none">'
                       f'{place(k, 0, 0, h, expr=ex, pose=pz, flip=flip)}</g>')
    bob = "bob" if poseset in ("danse", "saut", "coucou") else "sway"
    return (f'<g transform="translate({x} {690 if h < 360 else 700})"><g class="ch {bob}" data-k="{k}" '
            f'data-nm="{len(mouths)}">{"".join(sub)}</g></g>')


def fx_svg(e):
    t = e["t"]
    fx = e["fx"]
    if fx in ("jump", "spin", "arms_up"):
        return ""  # effets de mouvement : gérés directement sur les personnages
    body = ""
    if fx == "claps":
        body = S.star(560, 260, 34, "#FFD23F", 10) + S.star(720, 230, 28, "#FF86C3", 20, stroke="#E0609E") + \
            S.sparkles([(640, 200, 30), (500, 320, 20), (790, 310, 22)], "#FFFFFF")
    elif fx == "stomp":
        body = "".join(S.E(x, 690, 46, 16, "#FFFFFF", extra='opacity="0.75"') for x in (300, 520, 760, 980))
    elif fx == "sun":
        body = '<circle cx="1080" cy="140" r="130" fill="#FFF3A0" opacity="0.55" filter="url(#glow)"/>' + S.sparkles([(1000, 90, 24), (1160, 210, 20)], "#FFFFFF")
    elif fx == "birds":
        body = "".join(S.P(f"M {x - 22} {y} q 11 -14 22 0 q 11 -14 22 0", stroke="#2B2D6E", sw=5) for x, y in [(380, 150), (470, 110), (560, 160)])
    elif fx == "flowers":
        body = "".join(S.flower(x, 600, 1.6, c) for x, c in [(150, "#FF86C3"), (260, "#A66BFF"), (1030, "#3DD6CF"), (1140, "#FFD23F")])
    elif fx == "honey":
        body = '<g transform="translate(980 470)"><rect x="-55" y="-60" width="110" height="110" rx="30" fill="#FFB020" stroke="#C97A00" stroke-width="6"/>' \
               '<rect x="-62" y="-78" width="124" height="28" rx="12" fill="#E8A040"/>' \
               '<text x="0" y="18" text-anchor="middle" font-family="Baloo2" font-weight="800" font-size="40" fill="#FFF3C4">miel</text></g>'
    elif fx == "apple":
        body = '<g transform="translate(990 460)"><circle r="60" fill="#FF5A5F" stroke="#B5262B" stroke-width="6"/>' \
               + S.P("M 0 -58 q 6 -26 22 -34", stroke="#7A4C26", sw=8) + S.E(26, -70, 22, 12, "#5CC85A", extra='transform="rotate(-25 26 -70)"') + "</g>"
    elif fx.startswith("splash_"):
        import zlib
        col = "#" + fx.split("_")[1]
        sd = zlib.crc32(f"{t}".encode()) % 97
        x = 300 + (sd * 37) % 680
        body = S.splash(x, 230 + (sd * 13) % 120, 85, col, sd)
    elif fx == "rainbow":
        body = S.rainbow(640, 560, 520, 40, 0.9)
    elif fx == "strawberry":
        body = ('<g transform="translate(990 300)"><path d="M -60 -30 Q 0 -70 60 -30 Q 50 60 0 90 Q -50 60 -60 -30 Z" fill="#FF5A5F" stroke="#B5262B" stroke-width="6"/>'
                + "".join(S.E(x, y, 4, 6, "#FFE08A") for x, y in [(-25, -10), (10, -20), (30, 10), (-10, 25), (15, 45), (-30, 30)])
                + S.P("M -40 -40 L -10 -55 L 0 -80 L 12 -55 L 40 -42 L 10 -45 Z", "#5CC85A", "#3E9B3A", 3) + "</g>")
    elif fx == "hearts":
        body = S.heart(470, 200, 0.9) + S.heart(810, 170, 0.7, "#FF86C3") + S.heart(640, 120, 0.6, "#A66BFF")
    elif fx == "sparkles":
        body = S.sparkles([(200, 160, 30), (1080, 150, 34), (640, 90, 26), (330, 330, 18), (950, 330, 20)], "#FFFFFF")
    return f'<g class="fx" data-t="{t}" style="display:none">{body}</g>'


def build_svg(p, shots, events=()):
    out = []
    for i, sh in enumerate(shots):
        pl = sh["plan"]
        body = S.bg(pl["decor"])
        if pl.get("titre"):
            body += (f'<g class="pop" data-t="{sh["t0"] + 0.4}" data-x="640" data-y="210"><g transform="translate(-640 -210)">'
                     f'{S.multicolor_title(640, 190, "Tralalune", 120, LOGO_COLS, "#2B2D6E", 12, -3, 2)}'
                     f'{S.title(640, 300, p["titre"], 80, "#FFD23F", "#2B2D6E", 11, -2)}</g></g>')
        if pl.get("fin"):
            body += (f'<g class="pop" data-t="{sh["t0"] + 0.6}" data-x="640" data-y="150"><g transform="translate(-640 -150)">'
                     f'{S.multicolor_title(640, 150, "Tralalune", 110, LOGO_COLS, "#2B2D6E", 11, -3, 2)}'
                     f'{S.title(640, 240, "À bientôt les copains !", 56, "#FFFFFF", "#2B2D6E", 9, -2)}</g></g>')
        for c in sorted(pl["persos"], key=lambda c: c[3]):
            k, ps, x, h = c[:4]
            flip = len(c) > 4 and c[4]
            out_sings = k in sh["singers"]
            body += char_group(k, ps, x, h, flip, out_sings)
        out.append(f'<g id="shot{i}" class="shot" data-cam="{pl.get("camera", "static")}" style="display:none">'
                   f'<g class="cam">{body}</g></g>')
    out.extend(fx_svg(e) for e in events)
    out.append('<rect id="fade" width="1280" height="720" fill="#000" opacity="0"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1280 720">'
            f'{defs()}{"".join(out)}</svg>')


JS = r"""
const SHOTS = __SHOTS__, LINES = __LINES__, ENV = __ENV__, BEAT = __BEAT__, DUR = __DUR__, FPS = __FPS__, PHASE = __PHASE__, EVENTS = __EVENTS__;
function moveFx(t, type){ return EVENTS.find(e => e.fx===type && t>=e.t && t<e.t+0.9); }
function easeOutBack(x){const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2);}
const shotEls = SHOTS.map((s,i)=>document.getElementById('shot'+i));
window.setT = function(t){
  const f = Math.min(ENV.length-1, Math.floor(t*FPS));
  const line = LINES.find(l => t>=l.t0 && t<l.t1);
  SHOTS.forEach((s,i)=>{
    const el = shotEls[i]; const x = 0.3;
    let op = (t>=s.t0-x && t<s.t1+x) ? Math.min(1,(t-(s.t0-x))/x, ((s.t1+x)-t)/x) : 0;
    if(i===0 && t<s.t1) op = 1; if(i===SHOTS.length-1 && t>=s.t0) op = 1;
    el.style.display = op>0 ? 'inline' : 'none'; el.style.opacity = Math.max(0,op);
    if(op<=0) return;
    const u = Math.max(0, Math.min(1,(t-s.t0)/Math.max(0.1,s.t1-s.t0)));
    const cam = el.dataset.cam; let z=1, dx=0;
    if(cam==='zoom_in') z = 1+0.08*u; else if(cam==='zoom_out') z = 1.08-0.08*u; else if(cam==='pan'){ z=1.06; dx = -30+60*u; }
    el.querySelector('.cam').setAttribute('transform', `translate(${640+dx} 360) scale(${z.toFixed(4)}) translate(-640 -360)`);
    el.querySelectorAll('.ch').forEach(ch=>{
      const k = ch.dataset.k, nm = +ch.dataset.nm;
      const ph = Math.max(0,(t-PHASE)/BEAT);
      let pi = Math.floor(ph)%2, mi = 0;
      if(nm>1 && line && line.singers.includes(k) && s.singers.includes(k)){
        const e = ENV[f]; mi = e>0.62 ? 2 : (e>0.28 ? 1 : 0);
      }
      ch.querySelectorAll(':scope > .v').forEach(v=>{ v.style.display = (+v.dataset.p===pi && +v.dataset.m===mi) ? 'inline':'none'; });
      let dy=0, sx=1, sy=1, rot=0;
      if(ch.classList.contains('bob')){ const q = ph%1; dy = -Math.abs(Math.sin(Math.PI*q))*16; sy = 1-0.04*Math.cos(2*Math.PI*q); sx = 2-sy; }
      else { rot = Math.sin(ph*Math.PI)*2.5; dy = -Math.abs(Math.sin(ph*Math.PI))*4; }
      const jf = moveFx(t,'jump'), sp = moveFx(t,'spin');
      if(jf){ const q=(t-jf.t)/0.9; dy = -Math.sin(Math.PI*q)*70; sy = 1+0.06*Math.sin(Math.PI*q); sx = 2-sy; }
      if(sp){ const q=(t-sp.t)/0.9; sx = Math.cos(2*Math.PI*q); if(Math.abs(sx)<0.08) sx = 0.08*Math.sign(sx||1); }
      ch.setAttribute('transform', `translate(0 ${dy.toFixed(2)}) rotate(${rot.toFixed(2)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)})`);
    });
    el.querySelectorAll('.pop').forEach(g=>{ const p = Math.max(0,Math.min(1,(t-parseFloat(g.dataset.t))/0.5));
      const sc = p<=0?0:easeOutBack(p); g.setAttribute('transform', `translate(${g.dataset.x} ${g.dataset.y}) scale(${sc.toFixed(4)})`); });
  });
  document.querySelectorAll('.fx').forEach(g=>{ const t0=parseFloat(g.dataset.t), u=(t-t0)/1.3;
    if(u<0||u>1){ g.style.display='none'; return; } g.style.display='inline';
    const sc = u<0.25 ? easeOutBack(u/0.25) : 1; g.style.opacity = u>0.7 ? (1-u)/0.3 : 1;
    g.setAttribute('transform', `translate(640 360) scale(${sc.toFixed(3)}) translate(-640 ${(-360 - 20*u).toFixed(1)})`); });
  document.getElementById('fade').setAttribute('opacity', Math.max(0, Math.min(1,(t-(DUR-0.8))/0.8)).toFixed(3));
};
"""


def sfx(path, shots, dur, sr=44100):
    """Effets sonores originaux synthétisés : « whoosh » doux à chaque changement de plan, carillon au titre."""
    N = int(sr * dur)
    buf = np.zeros(N)
    rng = np.random.default_rng(7)
    for sh in shots[1:]:
        t0 = sh["t0"] - 0.25
        n = int(sr * 0.5)
        noise = rng.uniform(-1, 1, n)
        env = np.sin(np.linspace(0, np.pi, n)) ** 2
        k = np.ones(40) / 40
        sig = np.convolve(noise, k, mode="same") * env * 0.10
        i = int(t0 * sr)
        if 0 <= i < N:
            buf[i:i + n] += sig[: max(0, min(n, N - i))]
    for k, fr in enumerate([1046.5, 1318.5, 1568.0, 2093.0]):
        t = np.arange(int(sr * 1.2)) / sr
        sig = 0.10 * np.exp(-t * 3) * np.sin(2 * np.pi * fr * t)
        i = int((0.6 + k * 0.12) * sr)
        buf[i:i + len(sig)] += sig[: max(0, min(len(sig), N - i))]
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((np.clip(buf, -1, 1) * 32767).astype(np.int16).tobytes())


def write_ass(lines, path):
    ev = []
    for l in lines:
        ev.append(f"Dialogue: 0,{karaoke.s2ass(l['t0'])},{karaoke.s2ass(l['t1'])},Paroles,,0,0,0,,"
                  f"{{\\fad(150,150)}}{karaoke.karaoke_line(l['t0'], l['t1'], l['txt'])}")
    open(path, "w", encoding="utf-8").write(karaoke.HEADER + "\n".join(ev) + "\n")


def video(vid, max_seconds=None):
    d, p = load(vid)
    song = None
    for name in ("chanson.mp3", "chanson.wav", "chanson.m4a"):
        if os.path.exists(os.path.join(d, "MUSIQUE", name)):
            song = os.path.join(d, "MUSIQUE", name)
    if not song:
        sys.exit(f"Aucune chanson trouvée : déposez MUSIQUE/chanson.mp3 dans {d}")
    x, sr = decode(song)
    dur = len(x) / sr
    if max_seconds:
        dur = min(dur, max_seconds)
    voc_path = os.path.join(d, "STEMS", "voix.wav")
    if not os.path.exists(voc_path):
        try:
            import separation_voix
            print("Séparation voix / musique (locale)…")
            separation_voix.separate(song, os.path.join(d, "STEMS"))
        except Exception as ex:  # noqa: BLE001
            print("Séparation impossible, analyse sur le mélange :", ex)
    if os.path.exists(voc_path):
        xv, _ = decode(voc_path, sr)
        env = voice_envelope(xv, sr)
    else:
        env = voice_envelope(x, sr)
    starts, mode = get_timing(d, p, env, dur)
    lines, shots = build_timeline(p, starts, dur)
    bpm, phase = detect_beats(x, sr, p["bpm"])
    beat = 60.0 / bpm
    events = word_events(lines)
    print(f"Tempo détecté : {bpm:.1f} BPM (1er temps à {phase:.2f} s) · {len(events)} effets synchronisés sur les paroles")
    rendu = os.path.join(d, "RENDU")
    os.makedirs(rendu, exist_ok=True)
    json.dump(dict(mode_calage=mode, tempo_detecte=bpm, premier_temps=phase, effets=events, lignes=lines, plans=[{k: v for k, v in s.items() if k != "plan"} | {"decor": s["plan"]["decor"]} for s in shots]),
              open(os.path.join(rendu, "timeline.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    js = (JS.replace("__SHOTS__", json.dumps([dict(t0=s["t0"], t1=s["t1"], singers=s["singers"]) for s in shots]))
          .replace("__LINES__", json.dumps([dict(t0=l["t0"], t1=l["t1"], singers=l["singers"]) for l in lines]))
          .replace("__ENV__", json.dumps([round(float(v), 2) for v in env]))
          .replace("__BEAT__", str(beat)).replace("__DUR__", str(dur)).replace("__FPS__", str(FPS))
          .replace("__PHASE__", str(phase)).replace("__EVENTS__", json.dumps(events)))
    html = os.path.join(BUILD, f"studio_{vid}.html")
    open(html, "w", encoding="utf-8").write(
        f"<!DOCTYPE html><html><head><meta charset='utf-8'><style>{FONT_CSS}html,body{{margin:0;background:#000}}</style>"
        f"</head><body>{build_svg(p, shots, events)}<script>{js}</script></body></html>")
    frames = os.path.join(BUILD, f"frames_{vid}")
    os.makedirs(frames, exist_ok=True)
    for f in os.listdir(frames):
        os.remove(os.path.join(frames, f))
    n = int(dur * FPS)
    print(f"Rendu de {n} images ({dur:.1f} s, calage : {mode})…")
    subprocess.run(["node", os.path.join(TOOLS, "render_frames.js"), html, frames, str(n), str(FPS)], check=True)
    ass = os.path.join(BUILD, f"studio_{vid}.ass")
    write_ass(lines, ass)
    fx = os.path.join(BUILD, f"studio_{vid}_sfx.wav")
    sfx(fx, shots, dur)
    final = os.path.join(rendu, f"{vid}_1080p.mp4")
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(frames, "f%05d.jpg"),
        "-i", song, "-i", fx, "-filter_complex",
        f"[0:v]subtitles={ass}:fontsdir={karaoke.FONTS_DIR},format=yuv420p[v];"
        f"[1:a]atrim=0:{dur},afade=t=out:st={max(0, dur - 1.5)}:d=1.5[m];[m][2:a]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5[a]",
        "-map", "[v]", "-map", "[a]", "-t", str(dur), "-c:v", "libx264", "-preset", "medium", "-crf", "19",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", final], check=True)
    short = make_short(vid)
    thumb = os.path.join(ROOT, p["miniature"])
    if os.path.exists(thumb):
        subprocess.run(["cp", thumb, os.path.join(rendu, f"{vid}_miniature_1280x720.png")], check=True)
    print("OK", final)
    print("OK", short)

def short_overlay(p, path):
    """Habillage du Short (1080x1920, transparent) : logo + titre en haut, appel en bas. La vidéo (zone centrale recadrée) occupe y 555-1365."""
    o = ('<rect x="40" y="120" width="1000" height="430" rx="60" fill="#2B2D6E" opacity="0.55"/>' +
         S.multicolor_title(540, 300, "Tralalune", 170, LOGO_COLS, "#2B2D6E", 16, -3, 2) +
         S.title(540, 460, p["titre"], 92 if len(p["titre"]) < 20 else 72, "#FFD23F", "#2B2D6E", 12, -2) +
         '<rect x="90" y="1400" width="900" height="250" rx="60" fill="#FFFFFF" opacity="0.92"/>' +
         S.title(540, 1505, "Chante avec les copains !", 64, "#FF9F1C", "#2B2D6E", 8, 0) +
         S.title(540, 1600, "La chanson complète sur la chaîne", 46, "#2B2D6E", "#FFFFFF", 0, 0) +
         S.sparkles([(130, 640, 26), (950, 600, 30), (160, 1320, 22), (930, 1340, 26)], "#FFFFFF"))
    svg_page(o, 1080, 1920, path, transparent=True)
    run()


def make_short(vid):
    """Short 30-50 s : du premier refrain à la dernière fin de plan avant 50 s, vidéo au centre, habillage Tralalune."""
    d, p = load(vid)
    rendu = os.path.join(d, "RENDU")
    tl = json.load(open(os.path.join(rendu, "timeline.json"), encoding="utf-8"))
    final = os.path.join(rendu, f"{vid}_1080p.mp4")
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", final],
                               capture_output=True, text=True, check=True).stdout)
    plans = tl["plans"]
    ref = next((x for x in plans if p["sections"][x["si"]]["nom"].startswith("Refrain")), plans[0])
    ss = max(0, ref["t0"] - 0.5)
    ends = [x["t1"] for x in plans if ss + 30 < x["t1"] <= ss + 50]
    sd = (max(ends) - ss) if ends else min(50, dur - ss)
    ov = os.path.join(BUILD, f"short_overlay_{vid}.png")
    short_overlay(p, ov)
    short = os.path.join(rendu, f"{vid}_SHORT_1080x1920.mp4")
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error", "-ss", str(ss), "-t", str(sd), "-i", final, "-i", ov, "-filter_complex",
        "[0:v]split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:5,eq=brightness=-0.08[bg];"
        "[b]crop=1440:1080:240:0,scale=1080:810[fg];[bg][fg]overlay=0:555[m];[m][1:v]overlay=0:0,format=yuv420p[v];"
        f"[0:a]afade=t=in:d=0.3,afade=t=out:st={max(0, sd - 1)}:d=1[a]",
        "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "20", "-c:a", "aac", "-b:a", "160k",
        "-movflags", "+faststart", short], check=True)
    print(f"Short : {sd:.1f} s (à partir de {ss:.1f} s)")
    return short


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    cmd, vid = sys.argv[1], sys.argv[2]
    if cmd == "kit":
        kit(vid)
    elif cmd == "short":
        print("OK", make_short(vid))
    elif cmd == "video":
        video(vid, float(sys.argv[3]) if len(sys.argv) > 3 else None)
