# -*- coding: utf-8 -*-
"""
Moteur de dessin vectoriel des 5 personnages officiels de Tralalune.

Chaque personnage est défini UNE SEULE FOIS (couleurs, proportions, attributs)
dans le dictionnaire CHARS. Toutes les images (fiches, miniatures, bannière,
storyboards) appellent `draw()` : l'apparence est donc strictement identique
partout. Ne modifiez les couleurs qu'ici, et seulement après validation de la
charte graphique.

Repère natif d'un personnage : boîte 400 x 470, pieds posés vers y = 445.
"""
import math

_uid = [0]


def uid(p="u"):
    _uid[0] += 1
    return f"{p}{_uid[0]}"


# --------------------------------------------------------------------------
# FICHES COULEUR OFFICIELLES (verrouillées)
# --------------------------------------------------------------------------
CHARS = {
    "milo": dict(
        name="Milo", espece="petit lion",
        base="#FFB23E", light="#FFDC8F", shade="#E8891F", line="#B5600E",
        belly="#FFF1D2", belly_s="#F6D59B", pad="#FFE0AE",
        eye="#8A5422", nose="#7B3B1B", cheek="#FF8F66",
        mane="#F2771A", mane_l="#FFA24A", mane_s="#C9580C",
        smile="w", muzzle=True,
    ),
    "luna": dict(
        name="Luna", espece="petite licorne",
        base="#FFFFFF", light="#FFFFFF", shade="#E4DAF7", line="#A08ED4",
        belly="#FFF0F8", belly_s="#F3D3E8", pad="#F5B3DA",
        eye="#8B50E8", nose="#D98FBF", cheek="#FFA3CD",
        pink="#FF86C3", violet="#A66BFF", turq="#3DD6CF",
        horn="#FFC83D", horn_s="#E0950F", wing="#FFF6C9", wing_edge="#D5BDFF",
        smile="c", muzzle=True,
    ),
    "bibou": dict(
        name="Bibou", espece="petit ourson",
        base="#C98C58", light="#E2B080", shade="#A26A3A", line="#7A4C26",
        belly="#F8E6C9", belly_s="#E8C99C", pad="#F2D3AE",
        eye="#3D2314", nose="#3D2314", cheek="#F2967A",
        smile="w", muzzle=True,
    ),
    "pipo": dict(
        name="Pipo", espece="petit dinosaure",
        base="#6DCB5E", light="#A6E893", shade="#45A33D", line="#2E7A2B",
        belly="#D6F6B4", belly_s="#B1E38A", pad="#C2EFA0",
        eye="#1F6E6A", nose="#2E7A2B", cheek="#FF9E9E",
        spikes=["#2EC4C8", "#FFD23F"],
        smile="c", muzzle=False,
    ),
    "nounou": dict(
        name="Nounou", espece="petit lapin",
        base="#FFFFFF", light="#FFFFFF", shade="#EBDFCA", line="#B9A383",
        belly="#FFF4E2", belly_s="#F1DDBD", pad="#FFD6DE",
        eye="#3E6FB8", nose="#FF8FA6", cheek="#FF9DB5", ear_in="#FFD0DA",
        overall="#4A8FE7", overall_l="#7FB5F6", overall_s="#2E6BC0", button="#FFD23F",
        smile="w", muzzle=True,
    ),
}
ORDER = ["milo", "luna", "bibou", "pipo", "nounou"]

MOUTH_DARK = "#5B2333"
TONGUE = "#FF7D93"


def _hex(c):
    c = c.lstrip("#")
    if len(c) == 3:
        c = "".join(ch * 2 for ch in c)
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    A, B = _hex(a), _hex(b)
    return "#%02X%02X%02X" % tuple(round(A[i] + (B[i] - A[i]) * t) for i in range(3))


# --------------------------------------------------------------------------
# DÉFINITIONS (dégradés « volume 3D doux », filtres)
# --------------------------------------------------------------------------
def _rg(i, a, b, c, cx=0.36, cy=0.30, r=0.78):
    return (f'<radialGradient id="{i}" cx="{cx}" cy="{cy}" r="{r}">'
            f'<stop offset="0" stop-color="{a}"/><stop offset="0.55" stop-color="{b}"/>'
            f'<stop offset="1" stop-color="{c}"/></radialGradient>')


def _lg(i, a, b, c, vertical=True):
    xy = 'x1="0" y1="0" x2="0" y2="1"' if vertical else 'x1="0" y1="0" x2="1" y2="0"'
    return (f'<linearGradient id="{i}" {xy}><stop offset="0" stop-color="{a}"/>'
            f'<stop offset="0.6" stop-color="{b}"/><stop offset="1" stop-color="{c}"/></linearGradient>')


def defs():
    out = ['<defs>']
    for k, c in CHARS.items():
        out.append(_rg(f"{k}-fur", c["light"], c["base"], c["shade"]))
        out.append(_rg(f"{k}-belly", "#FFFFFF", c["belly"], c["belly_s"]))
        out.append(_lg(f"{k}-iris", mix(c["eye"], "#000000", 0.45), c["eye"], mix(c["eye"], "#FFFFFF", 0.45)))
    m = CHARS["milo"]
    out.append(_rg("milo-mane", m["mane_l"], m["mane"], m["mane_s"], 0.45, 0.35, 0.7))
    lu = CHARS["luna"]
    out.append(_lg("luna-horn", "#FFF0B3", lu["horn"], lu["horn_s"]))
    out.append(_rg("luna-wing", "#FFFFFF", lu["wing"], lu["wing_edge"], 0.7, 0.8, 0.9))
    for col in ("pink", "violet", "turq"):
        out.append(_rg(f"luna-{col}", mix(lu[col], "#FFFFFF", 0.45), lu[col], mix(lu[col], "#000000", 0.18)))
    n = CHARS["nounou"]
    out.append(_rg("nounou-overall", n["overall_l"], n["overall"], n["overall_s"]))
    for i, col in enumerate(CHARS["pipo"]["spikes"]):
        out.append(_rg(f"pipo-spike{i}", mix(col, "#FFFFFF", 0.5), col, mix(col, "#000000", 0.2)))
    out.append('<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">'
               '<feGaussianBlur stdDeviation="7"/></filter>')
    out.append('<filter id="blur6" x="-50%" y="-50%" width="200%" height="200%">'
               '<feGaussianBlur stdDeviation="6"/></filter>')
    out.append('<filter id="softshadow" x="-20%" y="-20%" width="140%" height="140%">'
               '<feGaussianBlur in="SourceAlpha" stdDeviation="6"/><feOffset dy="6"/>'
               '<feComponentTransfer><feFuncA type="linear" slope="0.30"/></feComponentTransfer>'
               '<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>')
    out.append('</defs>')
    return "".join(out)


# --------------------------------------------------------------------------
# PRIMITIVES
# --------------------------------------------------------------------------
def E(cx, cy, rx, ry, fill, stroke=None, sw=3, extra=""):
    s = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ""
    return f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{rx:.1f}" ry="{ry:.1f}" fill="{fill}"{s} {extra}/>'


def P(d, fill="none", stroke=None, sw=3, extra=""):
    s = f' stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"' if stroke else ""
    return f'<path d="{d}" fill="{fill}"{s} {extra}/>'


def G(inner, transform=""):
    t = f' transform="{transform}"' if transform else ""
    return f"<g{t}>{inner}</g>"


def F(k, part):
    return f"url(#{k}-{part})"


def spec(k, hx, hy):
    """Reflet spéculaire doux (rendu « 3D peluche »)."""
    return E(hx - 34, hy - 48, 30, 17, "#FFFFFF", extra='opacity="0.38" filter="url(#blur6)" '
             f'transform="rotate(-28 {hx - 34} {hy - 48})"')


def spike(x, y, s, rot, fill, line):
    d = f"M {-s} 0 Q {-s * 0.35} {-s * 1.5} 0 {-s * 1.85} Q {s * 0.35} {-s * 1.5} {s} 0 Z"
    return G(P(d, fill, line, 2.5), f"translate({x:.1f} {y:.1f}) rotate({rot:.1f})")


# --------------------------------------------------------------------------
# YEUX, SOURCILS, BOUCHE
# --------------------------------------------------------------------------
EXPRS = {
    #          yeux       sourcils   bouche
    "neutre": ("open", "neutral", "smile"),
    "joyeux": ("open", "neutral", "open_smile"),
    "rire": ("happy", "up", "laugh"),
    "clin": ("wink", "neutral", "open_smile"),
    "surpris": ("big", "high", "o"),
    "triste": ("sad", "sad", "frown"),
    "endormi": ("sleep", "none", "sleep_o"),
    "fache": ("angry", "angry", "pout"),
}
EXPR_LABELS = {
    "neutre": "Neutre / doux", "joyeux": "Joyeux", "rire": "Éclat de rire", "clin": "Clin d'œil",
    "surpris": "Surpris", "triste": "Triste", "endormi": "Endormi", "fache": "Fâché (doux)",
}


def eye(x, y, kind, c, k, side, scale=1.0, look=(0, 2)):
    line = c["line"]
    o = []
    sx, sy = 19 * scale, 24 * scale
    if kind == "wink":
        kind = "open" if side < 0 else "happy"
    if kind in ("open", "sad", "angry", "big"):
        if kind == "big":
            sx, sy = 22 * scale, 28 * scale
            ir, pr, lk = (11 * scale, 14 * scale), (6 * scale, 7 * scale), (0, 0)
        else:
            ir, pr, lk = (15 * scale, 19 * scale), (8.5 * scale, 10.5 * scale), (look[0] * scale, look[1] * scale)
            if kind == "sad":
                lk = (look[0] * scale, -2 * scale)
        o.append(E(x, y, sx, sy, "#FFFFFF", line, 2.5))
        ix, iy = x + lk[0], y + lk[1]
        o.append(E(ix, iy, ir[0], ir[1], F(k, "iris")))
        o.append(E(ix, iy + 1, pr[0], pr[1], "#1E1029"))
        o.append(f'<circle cx="{ix - 5 * scale:.1f}" cy="{iy - 7 * scale:.1f}" r="{5.5 * scale:.1f}" fill="#fff"/>')
        o.append(f'<circle cx="{ix + 5 * scale:.1f}" cy="{iy + 6 * scale:.1f}" r="{2.5 * scale:.1f}" fill="#fff"/>')
        if kind == "sad":
            o.append(f'<circle cx="{ix + 6 * scale:.1f}" cy="{iy - 4 * scale:.1f}" r="{3 * scale:.1f}" fill="#fff"/>')
        if kind == "angry":
            cid = uid("clip")
            o.append(f'<clipPath id="{cid}"><ellipse cx="{x}" cy="{y}" rx="{sx + 1}" ry="{sy + 1}"/></clipPath>')
            hi, lo = -19 * scale, -5 * scale
            a, b = (hi, lo) if side < 0 else (lo, hi)
            pts = f"{x - 26},{y - 32} {x + 26},{y - 32} {x + 26},{y + b} {x - 26},{y + a}"
            o.append(f'<polygon points="{pts}" fill="{c["base"]}" clip-path="url(#{cid})"/>')
            o.append(P(f"M {x - 21 * scale} {y + a} L {x + 21 * scale} {y + b}", stroke=line, sw=3))
    elif kind == "happy":
        o.append(P(f"M {x - 17 * scale} {y + 5 * scale} Q {x} {y - 16 * scale} {x + 17 * scale} {y + 5 * scale}",
                   stroke=line, sw=5.5 * scale))
    elif kind == "sleep":
        o.append(P(f"M {x - 17 * scale} {y - 2 * scale} Q {x} {y + 12 * scale} {x + 17 * scale} {y - 2 * scale}",
                   stroke=line, sw=5 * scale))
        ox = x + side * 17 * scale
        o.append(P(f"M {ox} {y - 2 * scale} l {side * 6 * scale} {-5 * scale}", stroke=line, sw=3 * scale))
    return "".join(o)


def brow(x, y, kind, c, side, scale=1.0):
    if kind == "none":
        return ""
    s = scale
    if kind == "neutral":
        d = f"M {x - 12 * s} {y - 35 * s} Q {x} {y - 41 * s} {x + 12 * s} {y - 36 * s}"
    elif kind == "up":
        d = f"M {x - 12 * s} {y - 38 * s} Q {x} {y - 45 * s} {x + 12 * s} {y - 39 * s}"
    elif kind == "high":
        d = f"M {x - 13 * s} {y - 45 * s} Q {x} {y - 54 * s} {x + 13 * s} {y - 46 * s}"
    elif kind == "sad":
        d = (f"M {x - 13 * s} {y - 33 * s} L {x + 12 * s} {y - 42 * s}" if side < 0
             else f"M {x - 12 * s} {y - 42 * s} L {x + 13 * s} {y - 33 * s}")
    else:  # angry
        d = (f"M {x - 13 * s} {y - 42 * s} L {x + 13 * s} {y - 33 * s}" if side < 0
             else f"M {x - 13 * s} {y - 33 * s} L {x + 13 * s} {y - 42 * s}")
    col = mix(c["line"], "#000000", 0.1)
    return P(d, stroke=col, sw=5 * s)


def mouth(mx, my, kind, c, scale=1.0):
    s = scale
    line = c["line"]
    if kind == "smile":
        if c["smile"] == "w":
            return P(f"M {mx - 17 * s} {my - 2 * s} Q {mx - 8.5 * s} {my + 9 * s} {mx} {my} "
                     f"Q {mx + 8.5 * s} {my + 9 * s} {mx + 17 * s} {my - 2 * s}", stroke=line, sw=4 * s)
        return P(f"M {mx - 16 * s} {my - 2 * s} Q {mx} {my + 13 * s} {mx + 16 * s} {my - 2 * s}", stroke=line, sw=4 * s)
    if kind in ("open_smile", "laugh"):
        w, d = (20, 28) if kind == "open_smile" else (26, 38)
        cid = uid("m")
        path = f"M {mx - w * s} {my - 2 * s} Q {mx} {my + d * s} {mx + w * s} {my - 2 * s} Z"
        return (f'<clipPath id="{cid}"><path d="{path}"/></clipPath>' + P(path, MOUTH_DARK, line, 3) +
                E(mx, my + (d * 0.55) * s, w * 0.55 * s, d * 0.28 * s, TONGUE, extra=f'clip-path="url(#{cid})"'))
    if kind == "o":
        return (E(mx, my + 6 * s, 10 * s, 13 * s, MOUTH_DARK, line, 3) +
                E(mx, my + 13 * s, 6 * s, 4 * s, TONGUE))
    if kind == "frown":
        return P(f"M {mx - 13 * s} {my + 8 * s} Q {mx} {my - 4 * s} {mx + 13 * s} {my + 8 * s}", stroke=line, sw=4 * s)
    if kind == "pout":
        return P(f"M {mx - 11 * s} {my + 6 * s} Q {mx - 5 * s} {my} {mx} {my + 3 * s} "
                 f"Q {mx + 5 * s} {my} {mx + 11 * s} {my + 6 * s}", stroke=line, sw=4 * s)
    if kind == "sleep_o":
        return E(mx, my + 4 * s, 5 * s, 4.5 * s, MOUTH_DARK, line, 2)
    return ""


# --------------------------------------------------------------------------
# MEMBRES
# --------------------------------------------------------------------------
def arm(k, sx, sy, angle, length=74, width=34):
    c = CHARS[k]
    paw = c["pad"]
    if k == "nounou":
        paw = c["belly"]
    inner = (f'<rect x="{-width / 2}" y="{-8}" width="{width}" height="{length}" rx="{width / 2}" '
             f'fill="{F(k, "fur")}" stroke="{c["line"]}" stroke-width="3"/>' +
             E(0, length - 17, width / 2 - 5, 11, paw, extra='opacity="0.9"'))
    return G(inner, f"translate({sx} {sy}) rotate({angle})")


def leg(k, x, y, dark=False):
    c = CHARS[k]
    fill = c["shade"] if dark else F(k, "fur")
    return E(x, y, 27, 26, fill, c["line"], 3) + E(x, y + 13, 18, 9, c["pad"], extra='opacity="0.95"')


# --------------------------------------------------------------------------
# ÉLÉMENTS SPÉCIFIQUES
# --------------------------------------------------------------------------
def milo_mane(cx, cy, r=104, n=15):
    out = [f'<circle cx="{cx}" cy="{cy}" r="{r + 6}" fill="url(#milo-mane)" stroke="{CHARS["milo"]["mane_s"]}" stroke-width="3"/>']
    for i in range(n):
        a = 2 * math.pi * i / n
        out.append(E(cx + math.cos(a) * r, cy + math.sin(a) * r, 33, 33, "url(#milo-mane)",
                     CHARS["milo"]["mane_s"], 3))
    out.append(f'<circle cx="{cx}" cy="{cy}" r="{r + 2}" fill="url(#milo-mane)"/>')
    return "".join(out)


def luna_wing(x, y, mirror=False, rot=0, sc=1.0):
    d = ("M 0 0 C -28 -6 -66 -32 -78 -70 C -60 -62 -52 -66 -46 -80 C -36 -62 -24 -60 -16 -70 "
         "C -12 -44 -4 -26 0 0 Z")
    m = "scale(-1 1)" if mirror else ""
    glow = P(d, CHARS["luna"]["wing"], extra='opacity="0.9" filter="url(#glow)"')
    body = P(d, "url(#luna-wing)", CHARS["luna"]["wing_edge"], 2.5)
    return G(glow + body, f"translate({x} {y}) {m} rotate({rot}) scale({sc})")


def luna_ear(x, y, rot, inner=True):
    lu = CHARS["luna"]
    o = P("M -17 0 Q -15 -42 0 -54 Q 15 -42 17 0 Z", F("luna", "fur"), lu["line"], 3)
    if inner:
        o += P("M -8 -4 Q -7 -32 0 -42 Q 7 -32 8 -4 Z", lu["pad"])
    return G(o, f"translate({x} {y}) rotate({rot})")


def luna_horn(x, y, rot=0):
    lu = CHARS["luna"]
    o = P("M -14 0 L 0 -62 L 14 0 Q 0 6 -14 0 Z", "url(#luna-horn)", lu["horn_s"], 2.5)
    for t in (12, 26, 40):
        w = 14 * (1 - t / 62)
        o += P(f"M {-w} {-t + 4} Q 0 {-t - 2} {w} {-t - 4}", stroke=lu["horn_s"], sw=2)
    return G(o, f"translate({x} {y}) rotate({rot})")


def luna_bangs(hx, hy):
    o = [E(hx - 36, hy - 76, 40, 23, "url(#luna-pink)", extra=f'transform="rotate(-24 {hx - 36} {hy - 76})"'),
         E(hx + 4, hy - 88, 34, 20, "url(#luna-violet)", extra=f'transform="rotate(8 {hx + 4} {hy - 88})"'),
         E(hx + 42, hy - 72, 27, 18, "url(#luna-turq)", extra=f'transform="rotate(36 {hx + 42} {hy - 72})"'),
         E(hx - 62, hy - 44, 18, 26, "url(#luna-violet)", extra=f'transform="rotate(20 {hx - 62} {hy - 44})"')]
    return "".join(o)


def luna_backhair(hx, hy):
    lu = "luna"
    o = [E(hx - 88, hy + 18, 40, 78, F(lu, "pink")), E(hx - 96, hy + 66, 30, 58, F(lu, "violet")),
         E(hx - 76, hy + 104, 26, 38, F(lu, "turq")),
         E(hx + 90, hy + 10, 38, 72, F(lu, "violet")), E(hx + 96, hy + 60, 28, 56, F(lu, "turq")),
         E(hx + 78, hy + 100, 24, 36, F(lu, "pink"))]
    return "".join(o)


def luna_tail(points, w=17):
    cols = ["url(#luna-pink)", "url(#luna-violet)", "url(#luna-turq)"]
    raw = [CHARS["luna"]["pink"], CHARS["luna"]["violet"], CHARS["luna"]["turq"]]
    o = []
    for i, d in enumerate(points):
        o.append(P(d, stroke=raw[i], sw=w))
    return "".join(o)


def nounou_lop(hx, hy, side, view="front"):
    n = CHARS["nounou"]
    s = side
    d = (f"M {hx + s * 22} {hy - 88} C {hx + s * 95} {hy - 100} {hx + s * 128} {hy + 10} {hx + s * 112} {hy + 92} "
         f"C {hx + s * 106} {hy + 120} {hx + s * 78} {hy + 116} {hx + s * 80} {hy + 84} "
         f"C {hx + s * 84} {hy + 20} {hx + s * 60} {hy - 50} {hx + s * 22} {hy - 60} Z")
    o = P(d, F("nounou", "fur"), n["line"], 3)
    if view == "front":
        di = (f"M {hx + s * 40} {hy - 72} C {hx + s * 92} {hy - 76} {hx + s * 114} {hy + 20} {hx + s * 102} {hy + 86} "
              f"C {hx + s * 98} {hy + 100} {hx + s * 90} {hy + 98} {hx + s * 90} {hy + 84} "
              f"C {hx + s * 94} {hy + 24} {hx + s * 78} {hy - 40} {hx + s * 40} {hy - 58} Z")
        o += P(di, n["ear_in"], extra='opacity="0.85"')
    return o


def nounou_overall_front(cid_body):
    n = CHARS["nounou"]
    o = [f'<g clip-path="url(#{cid_body})">',
         f'<rect x="120" y="345" width="160" height="120" fill="url(#nounou-overall)"/>',
         P("M 120 345 Q 200 360 280 345", stroke=n["overall_s"], sw=3), '</g>',
         f'<rect x="168" y="306" width="64" height="52" rx="12" fill="url(#nounou-overall)" stroke="{n["overall_s"]}" stroke-width="3"/>',
         f'<rect x="186" y="318" width="28" height="18" rx="6" fill="{n["overall_s"]}" opacity="0.45"/>',
         P("M 172 312 L 148 292", stroke=n["overall"], sw=11), P("M 228 312 L 252 292", stroke=n["overall"], sw=11),
         f'<circle cx="176" cy="316" r="6" fill="{n["button"]}" stroke="#D9A400" stroke-width="2"/>',
         f'<circle cx="224" cy="316" r="6" fill="{n["button"]}" stroke="#D9A400" stroke-width="2"/>']
    return "".join(o)


# --------------------------------------------------------------------------
# POSES
# --------------------------------------------------------------------------
POSES = {
    #           bras G, bras D, inclinaison, saut
    "debout": (18, -18, 0, 0),
    "coucou": (18, -150, 0, 0),
    "saut": (148, -148, 0, 46),
    "danse": (132, -38, 9, 0),
    "montre": (16, -98, -3, 0),
    "calin": (-38, 38, 0, 0),
}
POSE_LABELS = {"debout": "Debout", "coucou": "Coucou !", "saut": "Saut de joie",
               "danse": "Danse", "montre": "Montre / explique", "calin": "Câlin"}


# --------------------------------------------------------------------------
# VUES
# --------------------------------------------------------------------------
def _front(k, expr, pose):
    c = CHARS[k]
    hx, hy = 200, 185
    la, ra, tilt, jump = POSES[pose]
    ev, bv, mv = EXPRS[expr]
    o = []
    # --- arrière-plan du corps
    if k == "milo":
        o.append(P("M 248 408 Q 318 424 320 362", stroke=c["base"], sw=11))
        o.append(P("M 248 408 Q 318 424 320 362", stroke=c["line"], sw=1, extra='opacity="0.4"'))
        o.append(E(320, 352, 15, 19, "url(#milo-mane)", c["mane_s"], 2.5))
    elif k == "pipo":
        o.append(P("M 236 392 Q 300 396 352 444 Q 300 436 236 432 Z", F(k, "fur"), c["line"], 3))
        o.append(spike(300, 404, 9, 30, F(k, "spike1"), c["line"]))
        o.append(spike(326, 420, 7, 42, F(k, "spike0"), c["line"]))
    elif k == "luna":
        o.append(luna_tail(["M 246 404 Q 318 404 316 334", "M 248 412 Q 330 420 334 352",
                            "M 246 420 Q 320 438 344 392"]))
        o.append(luna_wing(146, 330, rot=8, sc=1.25))
        o.append(luna_wing(254, 330, mirror=True, rot=8, sc=1.25))
    o.append(leg(k, 168, 418))
    o.append(leg(k, 232, 418))
    cid = uid("body")
    o.append(f'<clipPath id="{cid}"><ellipse cx="200" cy="350" rx="68" ry="72"/></clipPath>')
    o.append(E(200, 350, 68, 72, F(k, "fur"), c["line"], 3))
    if k == "nounou":
        o.append(nounou_overall_front(cid))
    else:
        o.append(E(200, 362, 44, 52, F(k, "belly"), extra=f'clip-path="url(#{cid})"'))
    raised = la > 90 or ra < -90
    arms = arm(k, 146, 316, la) + arm(k, 254, 316, ra)
    if not raised:
        o.append(arms)
    # --- tête
    if k == "milo":
        o.append(milo_mane(hx, hy + 4))
        for s in (-1, 1):
            o.append(E(hx + s * 66, hy - 76, 25, 25, F(k, "fur"), c["line"], 3) + E(hx + s * 66, hy - 74, 13, 13, c["belly_s"]))
    elif k == "bibou":
        for s in (-1, 1):
            o.append(E(hx + s * 72, hy - 72, 31, 31, F(k, "fur"), c["line"], 3) + E(hx + s * 72, hy - 70, 17, 17, c["belly"]))
    elif k == "luna":
        o.append(luna_backhair(hx, hy))
        o.append(luna_ear(hx - 56, hy - 72, -24))
        o.append(luna_ear(hx + 56, hy - 72, 24))
    elif k == "pipo":
        o.append(spike(hx - 34, hy - 86, 13, -22, F(k, "spike1"), c["line"]))
        o.append(spike(hx + 34, hy - 86, 13, 22, F(k, "spike1"), c["line"]))
        o.append(spike(hx, hy - 94, 17, 0, F(k, "spike0"), c["line"]))
    if k == "pipo":
        o.append(E(hx, hy, 108, 96, F(k, "fur"), c["line"], 3))
        o.append(E(hx, hy + 48, 66, 34, F(k, "belly"), extra='opacity="0.95"'))
    elif k == "bibou":
        o.append(E(hx, hy, 104, 98, F(k, "fur"), c["line"], 3))
    else:
        o.append(E(hx, hy, 100, 100, F(k, "fur"), c["line"], 3))
    o.append(spec(k, hx, hy))
    # museau
    if k in ("milo", "bibou", "luna"):
        o.append(E(hx, hy + 50, 44, 31, F(k, "belly")))
    elif k == "nounou":
        o.append(E(hx - 14, hy + 50, 20, 16, F(k, "belly")) + E(hx + 14, hy + 50, 20, 16, F(k, "belly")))
    # joues
    if ev != "sleep" or True:
        op = "0.35" if expr == "triste" else "0.6"
        for s in (-1, 1):
            o.append(E(hx + s * 64, hy + 40, 16, 10, c["cheek"], extra=f'opacity="{op}"'))
    # yeux + sourcils
    for s in (-1, 1):
        ex, ey = hx + s * 40, hy + 6
        o.append(eye(ex, ey, ev, c, k, s))
        o.append(brow(ex, ey, bv, c, s))
    # nez
    if k == "milo":
        o.append(P(f"M {hx - 12} {hy + 32} Q {hx} {hy + 27} {hx + 12} {hy + 32} Q {hx} {hy + 48} {hx - 12} {hy + 32} Z",
                   c["nose"], c["nose"], 2))
        o.append(E(hx - 3, hy + 32, 3.5, 2, "#fff", extra='opacity="0.7"'))
    elif k == "bibou":
        o.append(E(hx, hy + 36, 14, 10, c["nose"]) + E(hx - 4, hy + 33, 4, 2.4, "#fff", extra='opacity="0.6"'))
    elif k == "luna":
        o.append(E(hx - 11, hy + 50, 3.5, 4.5, c["nose"]) + E(hx + 11, hy + 50, 3.5, 4.5, c["nose"]))
    elif k == "nounou":
        o.append(P(f"M {hx - 8} {hy + 37} L {hx + 8} {hy + 37} L {hx} {hy + 46} Z", c["nose"], c["nose"], 3))
    elif k == "pipo":
        o.append(E(hx - 10, hy + 32, 3.5, 2.6, c["nose"]) + E(hx + 10, hy + 32, 3.5, 2.6, c["nose"]))
    my = {"milo": hy + 58, "bibou": hy + 58, "luna": hy + 64, "nounou": hy + 56, "pipo": hy + 52}[k]
    if c["muzzle"] and mv in ("smile",) and k in ("milo", "bibou", "nounou"):
        top = hy + 44 if k != "nounou" else hy + 46
        o.append(P(f"M {hx} {top} L {hx} {my}", stroke=c["line"], sw=3.5))
    o.append(mouth(hx, my, mv, c))
    if expr == "triste":
        o.append(P(f"M {hx + 44} {hy + 30} q -7 12 0 17 q 7 -5 0 -17 Z", "#7CC8FF", "#4FA6E8", 1.5))
    # détails avant
    if k == "milo":
        o.append(E(hx - 8, hy - 96, 12, 20, "url(#milo-mane)", c["mane_s"], 2.5,
                   f'transform="rotate(-25 {hx - 8} {hy - 96})"'))
        o.append(E(hx + 10, hy - 98, 9, 15, "url(#milo-mane)", c["mane_s"], 2.5,
                   f'transform="rotate(25 {hx + 10} {hy - 98})"'))
    elif k == "luna":
        o.append(luna_bangs(hx, hy))
        o.append(luna_horn(hx + 2, hy - 92, 4))
    elif k == "nounou":
        o.append(nounou_lop(hx, hy, -1))
        o.append(nounou_lop(hx, hy, 1))
    if raised:
        o.append(arms)
    if pose == "coucou":
        o.append(P("M 330 150 q 14 -10 10 -26 M 345 172 q 18 -8 18 -28", stroke="#FFFFFF", sw=5,
                   extra='opacity="0.9"'))
    if expr == "endormi":
        o.append('<text x="300" y="80" font-family="Fredoka" font-weight="700" font-size="34" fill="#8C9EFF" '
                 'stroke="#fff" stroke-width="5" paint-order="stroke">z</text>'
                 '<text x="326" y="50" font-family="Fredoka" font-weight="700" font-size="26" fill="#8C9EFF" '
                 'stroke="#fff" stroke-width="5" paint-order="stroke">z</text>')
    return "".join(o), tilt, jump


def _profile(k):
    """Vue de profil (le personnage regarde vers la droite)."""
    c = CHARS[k]
    hx, hy = 190, 185
    o = []
    # queue / ailes (côté gauche = arrière)
    if k == "milo":
        o.append(P("M 140 400 Q 70 410 72 352", stroke=c["base"], sw=11))
        o.append(E(72, 342, 15, 19, "url(#milo-mane)", c["mane_s"], 2.5))
    elif k == "pipo":
        o.append(P("M 146 380 Q 80 392 30 446 Q 92 438 150 428 Z", F(k, "fur"), c["line"], 3))
        o.append(spike(96, 400, 10, -48, F(k, "spike0"), c["line"]))
        o.append(spike(64, 422, 8, -56, F(k, "spike1"), c["line"]))
    elif k == "luna":
        o.append(luna_tail(["M 140 396 Q 76 396 80 330", "M 138 404 Q 64 414 62 350", "M 140 414 Q 70 432 52 388"]))
        o.append(luna_wing(160, 320, rot=5, sc=1.3))
    elif k == "bibou":
        o.append(E(132, 384, 14, 14, F(k, "fur"), c["line"], 3))
    elif k == "nounou":
        o.append(E(128, 384, 19, 19, "#FFFFFF", c["line"], 3))
    o.append(leg(k, 172, 420, dark=True))
    cid = uid("body")
    o.append(f'<clipPath id="{cid}"><ellipse cx="190" cy="350" rx="60" ry="72"/></clipPath>')
    o.append(E(190, 350, 60, 72, F(k, "fur"), c["line"], 3))
    if k == "nounou":
        n = c
        o.append(f'<g clip-path="url(#{cid})"><rect x="120" y="345" width="150" height="120" fill="url(#nounou-overall)"/></g>')
        o.append(f'<rect x="214" y="306" width="34" height="50" rx="10" fill="url(#nounou-overall)" stroke="{n["overall_s"]}" stroke-width="3"/>')
        o.append(P("M 220 312 L 196 290", stroke=n["overall"], sw=11))
        o.append(f'<circle cx="226" cy="318" r="6" fill="{n["button"]}" stroke="#D9A400" stroke-width="2"/>')
    else:
        o.append(E(216, 362, 36, 52, F(k, "belly"), extra=f'clip-path="url(#{cid})"'))
    if k == "pipo":
        for i, (sx, sy, r) in enumerate([(132, 300, -62), (126, 336, -80), (130, 372, -100)]):
            o.insert(0, spike(sx, sy, 10, r, F(k, f"spike{i % 2}"), c["line"]))
    o.append(leg(k, 210, 422))
    # tête
    if k == "milo":
        o.append(milo_mane(hx - 14, hy + 2, r=100))
        o.append(E(hx - 30, hy - 84, 24, 24, F(k, "fur"), c["line"], 3) + E(hx - 28, hy - 82, 12, 12, c["belly_s"]))
    elif k == "bibou":
        o.append(E(hx - 34, hy - 80, 30, 30, F(k, "fur"), c["line"], 3) + E(hx - 30, hy - 78, 16, 16, c["belly"]))
    elif k == "luna":
        lu = "luna"
        o.append(E(hx - 70, hy + 40, 42, 84, F(lu, "pink")) + E(hx - 84, hy + 80, 30, 64, F(lu, "violet")) +
                 E(hx - 64, hy + 116, 26, 40, F(lu, "turq")))
        o.append(luna_ear(hx - 22, hy - 88, -12))
    elif k == "pipo":
        for i, a in enumerate([-100, -125, -150, -175]):
            r = math.radians(a)
            o.append(spike(hx + math.cos(r) * 92, hy + math.sin(r) * 86, 14 - i, a + 90,
                           F(k, f"spike{i % 2}"), c["line"]))
    if k == "pipo":
        o.append(E(hx, hy, 104, 94, F(k, "fur"), c["line"], 3))
    else:
        o.append(E(hx, hy, 100, 100, F(k, "fur"), c["line"], 3))
    o.append(spec(k, hx, hy))
    if k in ("milo", "bibou"):
        o.append(E(hx + 72, hy + 50, 40, 30, F(k, "belly"), c["line"], 0))
    elif k == "luna":
        o.append(E(hx + 80, hy + 52, 46, 32, F(k, "belly")))
    elif k == "nounou":
        o.append(E(hx + 74, hy + 46, 28, 22, F(k, "belly")))
    elif k == "pipo":
        o.append(E(hx + 60, hy + 46, 52, 30, F(k, "belly")))
    o.append(E(hx + 40, hy + 44, 15, 10, c["cheek"], extra='opacity="0.6"'))
    o.append(eye(hx + 58, hy + 2, "open", c, k, 1, scale=0.85, look=(4, 2)))
    o.append(brow(hx + 58, hy + 2, "neutral", c, 1, scale=0.85))
    if k == "milo":
        o.append(P(f"M {hx + 98} {hy + 30} q 14 2 12 14 q -10 4 -16 -6 Z", c["nose"], c["nose"], 2))
    elif k == "bibou":
        o.append(E(hx + 108, hy + 36, 10, 8, c["nose"]))
    elif k == "luna":
        o.append(E(hx + 116, hy + 48, 3.5, 4.5, c["nose"]))
    elif k == "nounou":
        o.append(P(f"M {hx + 96} {hy + 36} l 8 4 l -8 5 Z", c["nose"], c["nose"], 3))
    elif k == "pipo":
        o.append(E(hx + 100, hy + 28, 3.5, 2.6, c["nose"]))
    mx = {"milo": hx + 96, "bibou": hx + 96, "luna": hx + 104, "nounou": hx + 88, "pipo": hx + 92}[k]
    my = {"milo": hy + 60, "bibou": hy + 60, "luna": hy + 66, "nounou": hy + 56, "pipo": hy + 52}[k]
    o.append(P(f"M {mx - 16} {my - 2} Q {mx - 4} {my + 9} {mx + 8} {my - 4}", stroke=c["line"], sw=4))
    if k == "milo":
        o.append(E(hx - 2, hy - 96, 12, 20, "url(#milo-mane)", c["mane_s"], 2.5, f'transform="rotate(-10 {hx - 2} {hy - 96})"'))
    elif k == "luna":
        o.append(E(hx + 20, hy - 84, 42, 22, "url(#luna-pink)", extra=f'transform="rotate(10 {hx + 20} {hy - 84})"'))
        o.append(E(hx + 52, hy - 66, 26, 16, "url(#luna-violet)", extra=f'transform="rotate(40 {hx + 52} {hy - 66})"'))
        o.append(luna_horn(hx + 40, hy - 90, 22))
    elif k == "nounou":
        n = c
        d = (f"M {hx - 10} {hy - 92} C {hx - 70} {hy - 96} {hx - 92} {hy + 10} {hx - 80} {hy + 96} "
             f"C {hx - 76} {hy + 122} {hx - 46} {hy + 120} {hx - 46} {hy + 92} C {hx - 44} {hy + 20} {hx - 30} {hy - 50} {hx + 6} {hy - 70} Z")
        o.append(P(d, F(k, "fur"), n["line"], 3))
    o.append(arm(k, 202, 318, -6))
    return "".join(o)


def _back(k):
    c = CHARS[k]
    hx, hy = 200, 185
    o = []
    if k == "luna":
        o.append(luna_horn(hx, hy - 90, 0))
    o.append(leg(k, 168, 418, dark=True))
    o.append(leg(k, 232, 418, dark=True))
    o.append(arm(k, 146, 316, 18) + arm(k, 254, 316, -18))
    cid = uid("body")
    o.append(f'<clipPath id="{cid}"><ellipse cx="200" cy="350" rx="68" ry="72"/></clipPath>')
    o.append(E(200, 350, 68, 72, F(k, "fur"), c["line"], 3))
    if k == "nounou":
        n = c
        o.append(f'<g clip-path="url(#{cid})"><rect x="120" y="345" width="160" height="120" fill="url(#nounou-overall)"/></g>')
        o.append(P("M 150 292 L 250 352 M 250 292 L 150 352", stroke=n["overall"], sw=12))
        o.append(E(200, 392, 20, 20, "#FFFFFF", n["line"], 3))
    elif k == "milo":
        o.append(P("M 205 400 Q 230 440 262 430", stroke=c["base"], sw=11))
        o.append(E(266, 426, 15, 19, "url(#milo-mane)", c["mane_s"], 2.5))
    elif k == "bibou":
        o.append(E(200, 395, 15, 15, F(k, "fur"), c["line"], 3))
    elif k == "pipo":
        o.append(P("M 168 392 Q 200 470 232 392 Z", F(k, "fur"), c["line"], 3))
        for i, y in enumerate([300, 330, 360, 400]):
            o.append(spike(200, y, 10, 0, F(k, f"spike{i % 2}"), c["line"]))
    elif k == "luna":
        o.append(luna_tail(["M 190 390 Q 170 430 186 452", "M 200 392 Q 200 436 208 456", "M 210 390 Q 232 430 224 452"], w=16))
    if k == "luna":
        o.append(luna_ear(hx - 56, hy - 72, -24, inner=False) + luna_ear(hx + 56, hy - 72, 24, inner=False))
    elif k == "bibou":
        for s in (-1, 1):
            o.append(E(hx + s * 72, hy - 72, 31, 31, F(k, "fur"), c["line"], 3))
    elif k == "milo":
        o.append(milo_mane(hx, hy + 4))
        for s in (-1, 1):
            o.append(E(hx + s * 66, hy - 76, 25, 25, F(k, "fur"), c["line"], 3))
    if k == "pipo":
        o.append(E(hx, hy, 108, 96, F(k, "fur"), c["line"], 3))
        for i, y in enumerate([100, 140, 180, 222, 262]):
            o.append(spike(hx, y, 11 - i * 0.6, 0, F(k, f"spike{i % 2}"), c["line"]))
    elif k == "milo":
        o.append(milo_mane(hx, hy, r=86, n=13))
    else:
        o.append(E(hx, hy, 104 if k == "bibou" else 100, 98 if k == "bibou" else 100, F(k, "fur"), c["line"], 3))
    o.append(spec(k, hx, hy))
    if k == "luna":
        lu = "luna"
        o.append(E(hx, hy - 30, 96, 70, F(lu, "violet")) + E(hx - 40, hy + 40, 50, 90, F(lu, "pink")) +
                 E(hx + 42, hy + 40, 48, 88, F(lu, "turq")) + E(hx, hy + 70, 36, 80, F(lu, "violet")))
        o.append(luna_wing(166, 326, rot=0, sc=1.3))
        o.append(luna_wing(234, 326, mirror=True, rot=0, sc=1.3))
    elif k == "nounou":
        for s in (-1, 1):
            d = (f"M {hx + s * 18} {hy - 90} C {hx + s * 70} {hy - 96} {hx + s * 92} {hy + 10} {hx + s * 80} {hy + 96} "
                 f"C {hx + s * 76} {hy + 122} {hx + s * 46} {hy + 120} {hx + s * 46} {hy + 92} "
                 f"C {hx + s * 44} {hy + 20} {hx + s * 34} {hy - 50} {hx + s * 6} {hy - 66} Z")
            o.append(P(d, F(k, "fur"), c["line"], 3))
    return "".join(o)


def draw(k, view="front", expr="neutre", pose="debout", shadow=True):
    """Renvoie un groupe SVG du personnage dans sa boîte native 400x470."""
    sh = E(200, 448, 96, 13, "#2B2D6E", extra='opacity="0.18"') if shadow else ""
    if view == "front":
        body, tilt, jump = _front(k, expr, pose)
        if jump and shadow:
            sh = E(200, 448, 70, 10, "#2B2D6E", extra='opacity="0.14"')
        t = f"translate(0 {-jump}) rotate({tilt} 200 445)"
        return sh + G(body, t)
    if view == "profile":
        return sh + _profile(k)
    return sh + _back(k)


def place(k, cx, base_y, height, view="front", expr="neutre", pose="debout", flip=False, shadow=True):
    """Place le personnage : (cx, base_y) = point au sol, height = hauteur en px."""
    s = height / 470.0
    f = f" translate(400 0) scale(-1 1)" if flip else ""
    return G(draw(k, view, expr, pose, shadow), f"translate({cx - 200 * s:.1f} {base_y - 452 * s:.1f}) scale({s:.4f}){f}")


def head(k, cx, cy, size, expr="joyeux", flip=False):
    """Uniquement la tête (cadrage portrait), size = largeur en px."""
    s = size / 300.0
    f = " translate(400 0) scale(-1 1)" if flip else ""
    clip = uid("hc")
    return (f'<clipPath id="{clip}"><rect x="40" y="0" width="320" height="320"/></clipPath>' +
            G(f'<g clip-path="url(#{clip})">' + draw(k, "front", expr, "debout", shadow=False) + "</g>",
              f"translate({cx - 200 * s:.1f} {cy - 180 * s:.1f}) scale({s:.4f}){f}"))
