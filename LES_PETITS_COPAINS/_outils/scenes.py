# -*- coding: utf-8 -*-
"""Décors et accessoires originaux de l'univers Tralalune (repère 1280 x 720)."""
import math
import random
from art import E, P, G, uid, mix

W, H = 1280, 720

NAVY = "#2B2D6E"
CREAM = "#FFF6E5"
SUN = "#FFD23F"


def lin(cols, vertical=True):
    i = uid("bg")
    xy = 'x1="0" y1="0" x2="0" y2="1"' if vertical else 'x1="0" y1="0" x2="1" y2="0"'
    n = len(cols) - 1
    stops = "".join(f'<stop offset="{j / n:.2f}" stop-color="{c}"/>' for j, c in enumerate(cols))
    return i, f'<defs><linearGradient id="{i}" {xy}>{stops}</linearGradient></defs>'


def radial(cols, cx=0.5, cy=0.5, r=0.7):
    i = uid("rbg")
    n = len(cols) - 1
    stops = "".join(f'<stop offset="{j / n:.2f}" stop-color="{c}"/>' for j, c in enumerate(cols))
    return i, f'<defs><radialGradient id="{i}" cx="{cx}" cy="{cy}" r="{r}">{stops}</radialGradient></defs>'


def sky(cols):
    i, d = lin(cols)
    return d + f'<rect width="{W}" height="{H}" fill="url(#{i})"/>'


def cloud(x, y, s=1.0, op=0.95, col="#FFFFFF"):
    o = "".join(E(x + dx * s, y + dy * s, r * s, r * 0.8 * s, col) for dx, dy, r in
                [(-60, 10, 42), (-15, -18, 55), (40, -5, 48), (80, 14, 36), (10, 22, 60)])
    return f'<g opacity="{op}">{o}</g>'


def star(x, y, r, col=SUN, rot=0, op=1, stroke="#F2A900"):
    pts = []
    for i in range(10):
        a = math.pi / 5 * i - math.pi / 2
        rr = r if i % 2 == 0 else r * 0.48
        pts.append(f"{x + math.cos(a) * rr:.1f},{y + math.sin(a) * rr:.1f}")
    return (f'<polygon points="{" ".join(pts)}" fill="{col}" stroke="{stroke}" stroke-width="{max(1, r / 10):.1f}" '
            f'stroke-linejoin="round" opacity="{op}" transform="rotate({rot} {x} {y})"/>')


def note(x, y, s=1.0, col="#A66BFF", rot=0):
    d = (f"M 0 0 L 0 -60 L 34 -70 L 34 -12")
    o = (P(d, stroke=col, sw=7) + E(-10, 2, 15, 11, col, extra='transform="rotate(-20 -10 2)"') +
         E(24, -10, 15, 11, col, extra='transform="rotate(-20 24 -10)"'))
    return G(o, f"translate({x} {y}) rotate({rot}) scale({s})")


def hills(cols=("#8FDB72", "#6CC857", "#58B548"), y=520):
    o = [P(f"M 0 {y} Q 320 {y - 110} 640 {y - 20} T 1280 {y - 40} L 1280 720 L 0 720 Z", cols[0]),
         P(f"M 0 {y + 70} Q 400 {y - 20} 820 {y + 60} T 1280 {y + 50} L 1280 720 L 0 720 Z", cols[1]),
         P(f"M 0 {y + 150} Q 500 {y + 90} 1280 {y + 140} L 1280 720 L 0 720 Z", cols[2])]
    return "".join(o)


def flower(x, y, s=1.0, col="#FF86C3"):
    petals = "".join(E(x + math.cos(a) * 11 * s, y + math.sin(a) * 11 * s, 9 * s, 9 * s, col)
                     for a in [i * math.pi * 2 / 5 for i in range(5)])
    return P(f"M {x} {y} L {x} {y + 34 * s}", stroke="#3E9B3A", sw=4 * s) + petals + E(x, y, 7 * s, 7 * s, SUN)


def sun(x, y, r=90):
    i, d = radial(["#FFF6B0", "#FFD23F", "#FFB020"])
    rays = "".join(P(f"M {x + math.cos(a) * (r + 18)} {y + math.sin(a) * (r + 18)} L {x + math.cos(a) * (r + 48)} {y + math.sin(a) * (r + 48)}",
                     stroke="#FFD23F", sw=14) for a in [k * math.pi / 6 for k in range(12)])
    return d + rays + f'<circle cx="{x}" cy="{y}" r="{r}" fill="url(#{i})"/>'


def moon(x, y, r=80, col="#FFE89A", bgcol="#2B2D6E"):
    i = uid("moon")
    return (f'<defs><mask id="{i}"><rect x="{x - r - 5}" y="{y - r - 5}" width="{2 * r + 10}" height="{2 * r + 10}" fill="#fff"/>'
            f'<circle cx="{x + r * 0.45}" cy="{y - r * 0.25}" r="{r * 0.85}" fill="#000"/></mask></defs>'
            f'<circle cx="{x}" cy="{y}" r="{r * 1.35}" fill="{col}" opacity="0.18" filter="url(#glow)"/>'
            f'<circle cx="{x}" cy="{y}" r="{r}" fill="{col}" mask="url(#{i})"/>')


def balloon(x, y, col, label="", s=1.0):
    o = (P(f"M {x} {y + 70 * s} q -12 40 6 80 q 14 30 -4 60", stroke="#FFFFFF", sw=3) +
         E(x, y, 55 * s, 68 * s, col, mix(col, "#000000", 0.25), 3) +
         E(x - 18 * s, y - 26 * s, 12 * s, 20 * s, "#FFFFFF", extra='opacity="0.45" transform="rotate(25 %s %s)"' % (x - 18 * s, y - 26 * s)) +
         P(f"M {x - 8 * s} {y + 74 * s} L {x + 8 * s} {y + 74 * s} L {x} {y + 64 * s} Z", mix(col, "#000000", 0.25)))
    if label:
        o += (f'<text x="{x}" y="{y + 26 * s}" text-anchor="middle" font-family="Baloo2" font-weight="800" '
              f'font-size="{78 * s:.0f}" fill="#FFFFFF" stroke="{NAVY}" stroke-width="{8 * s:.0f}" paint-order="stroke">{label}</text>')
    return o


def confetti(n=60, seed=3, area=(0, 0, W, H)):
    r = random.Random(seed)
    cols = ["#FF86C3", "#A66BFF", "#3DD6CF", "#FFD23F", "#FF9F1C", "#5CC85A", "#3D8BFD"]
    o = []
    for _ in range(n):
        x = r.uniform(area[0], area[2]); y = r.uniform(area[1], area[3])
        c = r.choice(cols); a = r.uniform(0, 180)
        if r.random() < 0.5:
            o.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="16" height="8" rx="3" fill="{c}" transform="rotate({a:.0f} {x:.0f} {y:.0f})"/>')
        else:
            o.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="6" fill="{c}"/>')
    return "".join(o)


def sparkles(pts, col="#FFFFFF"):
    o = []
    for x, y, s in pts:
        d = f"M {x} {y - s} Q {x} {y} {x + s} {y} Q {x} {y} {x} {y + s} Q {x} {y} {x - s} {y} Q {x} {y} {x} {y - s} Z"
        o.append(P(d, col, extra='opacity="0.95"'))
    return "".join(o)


def rainbow(cx, cy, r, w=34, op=1.0):
    cols = ["#FF5A5F", "#FF9F1C", "#FFD23F", "#5CC85A", "#3D8BFD", "#A66BFF"]
    return "".join(P(f"M {cx - (r - i * w)} {cy} A {r - i * w} {r - i * w} 0 0 1 {cx + (r - i * w)} {cy}",
                     stroke=c, sw=w + 1, extra=f'stroke-linecap="butt" opacity="{op}"') for i, c in enumerate(cols))


def splash(x, y, r, col, seed=1):
    rnd = random.Random(seed)
    o = [E(x, y, r, r * 0.92, col)]
    for i in range(9):
        a = i * math.pi * 2 / 9 + rnd.uniform(-0.2, 0.2)
        d = r * rnd.uniform(0.85, 1.25)
        o.append(E(x + math.cos(a) * d, y + math.sin(a) * d, r * rnd.uniform(0.22, 0.38), r * rnd.uniform(0.22, 0.38), col))
    o.append(E(x - r * 0.35, y - r * 0.35, r * 0.25, r * 0.15, "#FFFFFF", extra='opacity="0.35"'))
    return "".join(o)


def toothbrush(x, y, rot=0, s=1.0):
    o = (f'<rect x="-14" y="-10" width="28" height="200" rx="14" fill="#3DD6CF" stroke="#1E9C96" stroke-width="4"/>'
         f'<rect x="-18" y="-80" width="36" height="80" rx="10" fill="#FFFFFF" stroke="#9BB7D4" stroke-width="4"/>'
         + "".join(f'<rect x="{-14 + i * 7}" y="-112" width="5" height="36" rx="2" fill="#FFFFFF" stroke="#9BB7D4" stroke-width="1.5"/>' for i in range(5))
         + E(0, -120, 26, 16, "#FFFFFF", "#BFD9F2", 3) + E(-14, -128, 12, 9, "#FFFFFF", "#BFD9F2", 2) + E(14, -130, 10, 8, "#FFFFFF", "#BFD9F2", 2))
    return G(o, f"translate({x} {y}) rotate({rot}) scale({s})")


def bubbles(pts):
    return "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#FFFFFF" fill-opacity="0.35" stroke="#FFFFFF" stroke-width="3"/>'
                   f'<circle cx="{x - r * 0.35}" cy="{y - r * 0.35}" r="{r * 0.2}" fill="#fff"/>' for x, y, r in pts)


def barn(x, y, s=1.0):
    o = (P("M -170 0 L -170 -200 L 0 -310 L 170 -200 L 170 0 Z", "#E5484D", "#A52A2F", 6) +
         P("M -190 -190 L 0 -330 L 190 -190", stroke="#FFFFFF", sw=18) +
         '<rect x="-70" y="-150" width="140" height="150" fill="#A52A2F" stroke="#FFFFFF" stroke-width="10"/>'
         + P("M -70 -150 L 70 0 M 70 -150 L -70 0", stroke="#FFFFFF", sw=8) +
         '<circle cx="0" cy="-225" r="34" fill="#FFF3C4" stroke="#FFFFFF" stroke-width="8"/>')
    return G(o, f"translate({x} {y}) scale({s})")


def fence(y=600, col="#FFFFFF"):
    o = [f'<rect x="0" y="{y - 40}" width="{W}" height="14" rx="6" fill="{col}" stroke="#C9B79A" stroke-width="2"/>',
         f'<rect x="0" y="{y}" width="{W}" height="14" rx="6" fill="{col}" stroke="#C9B79A" stroke-width="2"/>']
    for x in range(20, W, 90):
        o.append(f'<rect x="{x}" y="{y - 80}" width="26" height="110" rx="10" fill="{col}" stroke="#C9B79A" stroke-width="2"/>')
    return "".join(o)


def chick(x, y, s=1.0):
    o = (E(0, 0, 40, 36, "#FFE45C", "#E0B000", 3) + E(0, -40, 28, 26, "#FFE45C", "#E0B000", 3) +
         E(-9, -44, 4, 5, "#2B1B10") + E(9, -44, 4, 5, "#2B1B10") +
         P("M -7 -34 L 7 -34 L 0 -24 Z", "#FF9F1C", "#E07A00", 2) + E(-34, -4, 14, 8, "#FFD12E") + E(34, -4, 14, 8, "#FFD12E") +
         P("M 0 -66 q -6 -12 4 -16 M 0 -66 q 8 -10 14 -4", stroke="#E0B000", sw=3))
    return G(o, f"translate({x} {y}) scale({s})")


def sheep(x, y, s=1.0):
    wool = "".join(E(dx, dy, 30, 28, "#FFFFFF", "#D6D0E6", 3) for dx, dy in
                   [(-40, -10), (0, -26), (40, -10), (-24, 16), (24, 16), (0, 0)])
    o = (f'<rect x="-34" y="20" width="14" height="40" rx="6" fill="#4A3B55"/><rect x="20" y="20" width="14" height="40" rx="6" fill="#4A3B55"/>'
         + wool + E(56, -20, 26, 30, "#4A3B55") + E(48, -26, 4, 5, "#fff") + E(64, -26, 4, 5, "#fff") +
         E(56, -48, 22, 12, "#FFFFFF", "#D6D0E6", 2))
    return G(o, f"translate({x} {y}) scale({s})")


def cow(x, y, s=1.0):
    o = (E(0, 0, 70, 46, "#FFFFFF", "#7A6A64", 3) + E(-24, -10, 22, 16, "#3B2A26") + E(30, 12, 16, 12, "#3B2A26") +
         ''.join(f'<rect x="{dx}" y="30" width="16" height="40" rx="7" fill="#FFFFFF" stroke="#7A6A64" stroke-width="3"/>' for dx in (-50, -20, 14, 40)) +
         E(80, -30, 36, 34, "#FFFFFF", "#7A6A64", 3) + E(86, -8, 28, 18, "#FFB8C6", "#E58FA2", 2) +
         E(78, -10, 3, 3, "#7A3B4A") + E(94, -10, 3, 3, "#7A3B4A") + E(72, -40, 4, 5, "#2B1B10") + E(92, -40, 4, 5, "#2B1B10") +
         P("M 60 -60 q -10 -16 -2 -24 M 100 -60 q 10 -16 2 -24", stroke="#E8D9A8", sw=8))
    return G(o, f"translate({x} {y}) scale({s})")


def piglet(x, y, s=1.0):
    o = (E(0, 0, 56, 42, "#FFB8C6", "#E58FA2", 3) + E(48, -18, 34, 32, "#FFB8C6", "#E58FA2", 3) +
         E(64, -12, 16, 12, "#FF9AB0", "#E58FA2", 2) + E(60, -12, 3, 4, "#B4566C") + E(68, -12, 3, 4, "#B4566C") +
         E(40, -28, 4, 5, "#2B1B10") + E(58, -30, 4, 5, "#2B1B10") +
         P("M 30 -46 l -6 -18 l 18 10 Z M 56 -48 l 4 -18 l 12 14 Z", "#FFB8C6", "#E58FA2", 2) +
         P("M -56 -6 q -18 -10 -10 -22 q 8 -6 4 6", stroke="#E58FA2", sw=3) +
         ''.join(f'<rect x="{dx}" y="28" width="16" height="24" rx="7" fill="#FFB8C6" stroke="#E58FA2" stroke-width="3"/>' for dx in (-36, -6, 20)))
    return G(o, f"translate({x} {y}) scale({s})")


def car(x, y, col="#FF5A5F", s=1.0):
    o = (P("M -120 0 L -120 -50 Q -110 -70 -80 -72 L -50 -120 L 60 -120 L 100 -72 Q 125 -70 125 -40 L 125 0 Z", col, mix(col, "#000", 0.3), 5) +
         P("M -40 -110 L 0 -110 L 0 -76 L -64 -76 Z M 14 -110 L 52 -110 L 84 -76 L 14 -76 Z", "#BFE6FF", "#7FB0D6", 3) +
         E(-70, 4, 30, 30, "#3A3550") + E(-70, 4, 13, 13, "#DDE3F0") + E(75, 4, 30, 30, "#3A3550") + E(75, 4, 13, 13, "#DDE3F0") +
         E(118, -46, 9, 7, "#FFF3A0"))
    return G(o, f"translate({x} {y}) scale({s})")


def cake(x, y, s=1.0):
    o = ('<rect x="-110" y="-90" width="220" height="90" rx="20" fill="#FFB8D9" stroke="#E07AAE" stroke-width="5"/>'
         '<rect x="-80" y="-160" width="160" height="74" rx="18" fill="#FFF0F7" stroke="#E07AAE" stroke-width="5"/>'
         + P("M -110 -60 q 20 22 40 0 q 20 22 40 0 q 20 22 40 0 q 20 22 40 0 q 20 22 40 0 q 10 12 30 0", stroke="#FFFFFF", sw=8)
         + "".join(f'<rect x="{dx - 7}" y="-210" width="14" height="52" rx="5" fill="{c}"/>' + E(dx, -222, 9, 14, "#FFC83D", extra='opacity="0.95"')
                   for dx, c in [(-45, "#3DD6CF"), (0, "#A66BFF"), (45, "#5CC85A")])
         + "".join(E(dx, -126, 9, 9, c) for dx, c in [(-50, "#FF5A5F"), (-17, "#FFD23F"), (17, "#3D8BFD"), (50, "#FF9F1C")]))
    return G(o, f"translate({x} {y}) scale({s})")


def party_hat(x, y, rot=0, s=1.0):
    o = (P("M -40 0 L 0 -110 L 40 0 Z", "#A66BFF", "#6E3FD0", 4) +
         P("M -26 -36 L 26 -36 M -14 -70 L 14 -70", stroke="#FFD23F", sw=8) + E(0, -114, 14, 14, "#FF86C3"))
    return G(o, f"translate({x} {y}) rotate({rot}) scale({s})")


def spotlight(x, top, bottom_w, col="#FFF6C9", op=0.35):
    return P(f"M {x - 30} {top} L {x + 30} {top} L {x + bottom_w / 2} 720 L {x - bottom_w / 2} 720 Z", col, extra=f'opacity="{op}"')


def bed_cloud(x, y, s=1.0):
    o = "".join(E(dx, dy, r, r * 0.7, "#F3EEFF", "#C9BFF0", 3) for dx, dy, r in
                [(-150, 0, 80), (-60, -30, 95), (50, -25, 100), (150, 0, 80), (0, 20, 130)])
    return G(o, f"translate({x} {y}) scale({s})")


def number_tile(x, y, n, col, s=1.0):
    return (f'<rect x="{x - 55 * s}" y="{y - 55 * s}" width="{110 * s}" height="{110 * s}" rx="{24 * s}" fill="{col}" '
            f'stroke="#FFFFFF" stroke-width="{8 * s}"/>'
            f'<text x="{x}" y="{y + 30 * s}" text-anchor="middle" font-family="Baloo2" font-weight="800" font-size="{92 * s:.0f}" '
            f'fill="#FFFFFF" stroke="{NAVY}" stroke-width="{6 * s:.0f}" paint-order="stroke">{n}</text>')


def heart(x, y, s, col="#FF5A8A"):
    return G(P("M 0 30 C -50 -5 -35 -45 0 -20 C 35 -45 50 -5 0 30 Z", col, mix(col, "#000", 0.2), 3), f"translate({x} {y}) scale({s})")


def island(x, y, s=1.0):
    """L'île flottante de Tralalune (élément emblématique de l'univers)."""
    o = (P("M -260 0 Q -200 160 0 210 Q 200 160 260 0 Z", "#B88A5A", "#8A6038", 5) +
         P("M -200 60 Q -100 120 0 130 Q 110 120 200 60", stroke="#9C7046", sw=6) +
         E(0, 0, 270, 48, "#7ED36A", "#4FA846", 5) +
         P("M -120 -10 Q -122 -110 -100 -150", stroke="#8A6038", sw=14) +
         E(-100, -170, 60, 44, "#5CC85A", "#3E9B3A", 4) + E(-140, -150, 40, 30, "#6CD45E", "#3E9B3A", 4) +
         P("M 60 -20 L 60 -90 L 130 -90 L 130 -20 Z", "#FFF0D6", "#C9A57A", 4) +
         P("M 50 -88 L 95 -135 L 140 -88 Z", "#FF86C3", "#D45E9C", 4) + '<rect x="84" y="-60" width="22" height="40" rx="6" fill="#A66BFF"/>' +
         flower(-30, -30, 0.9, "#FF86C3") + flower(10, -24, 0.8, "#3DD6CF") + flower(180, -26, 0.8, "#FFD23F"))
    return G(o, f"translate({x} {y}) scale({s})")


# ----------------------------------------------------------------------------
# DÉCORS COMPLETS
# ----------------------------------------------------------------------------
def bg(name):
    if name == "matin":
        return (sky(["#7FD3FF", "#BDE9FF", "#FFE7B8"]) + sun(1040, 190, 95) + cloud(260, 150, 1.1) + cloud(700, 110, 0.8) +
                hills() + "".join(flower(x, 640 + (x % 3) * 18, 1.1, c) for x, c in
                                  [(80, "#FF86C3"), (190, "#A66BFF"), (1100, "#3DD6CF"), (1210, "#FF86C3"), (980, "#FFD23F")]))
    if name == "couleurs":
        return (sky(["#FFF6E5", "#FFE3F1"]) + rainbow(640, 720, 620, 46, 0.9) + cloud(160, 600, 1.4) + cloud(1120, 610, 1.4) +
                splash(140, 150, 70, "#FF5A5F", 1) + splash(1150, 140, 64, "#3D8BFD", 2) + splash(1180, 420, 46, "#FFD23F", 3) +
                splash(110, 430, 50, "#5CC85A", 4))
    if name == "chiffres":
        return (sky(["#9FD8FF", "#DDF2FF"]) + cloud(200, 620, 1.6) + cloud(1080, 640, 1.6) + cloud(640, 680, 1.8) +
                "".join(star(x, y, r, rot=x % 40) for x, y, r in [(90, 90, 26), (1200, 80, 22), (1180, 300, 16), (70, 330, 18)]))
    if name == "jungle":
        o = sky(["#5FD0A0", "#C8F5C0"])
        for x, rot, col in [(-40, 30, "#2E9E5A"), (40, 10, "#3DB86A"), (1300, -30, "#2E9E5A"), (1230, -10, "#3DB86A"),
                            (200, 160, "#2E9E5A"), (1080, 200, "#2E9E5A")]:
            o += G(P("M 0 0 Q 80 -160 0 -360 Q -80 -160 0 0 Z", col, mix(col, "#000", 0.2), 4) +
                   P("M 0 0 L 0 -340", stroke=mix(col, "#000", 0.2), sw=4), f"translate({x} 760) rotate({rot})")
        o += E(640, 700, 520, 90, "#8BD86F") + spotlight(640, 0, 700, "#FFFFFF", 0.18)
        return o + "".join(flower(x, 660, 1.2, c) for x, c in [(260, "#FF86C3"), (1010, "#FFD23F"), (330, "#A66BFF")])
    if name == "fete":
        i, d = radial(["#C59BFF", "#8B5CF6", "#5B32C9"], 0.5, 0.45, 0.75)
        o = d + f'<rect width="{W}" height="{H}" fill="url(#{i})"/>'
        o += P("M 0 60 Q 320 160 640 60 Q 960 160 1280 60", stroke="#FFFFFF", sw=4)
        cols = ["#FF86C3", "#FFD23F", "#3DD6CF", "#FF9F1C"]
        for j, x in enumerate(range(40, 1280, 80)):
            yy = 60 + 100 * math.sin(math.pi * ((x % 640) / 640)) * 0.5 + 25
            o += P(f"M {x - 22} {yy - 10} L {x + 22} {yy - 10} L {x} {yy + 34} Z", cols[j % 4])
        o += balloon(110, 300, "#FF86C3") + balloon(1170, 280, "#3DD6CF") + balloon(1060, 220, "#FFD23F", s=0.8)
        return o + confetti(70, 5) + E(640, 720, 700, 80, "#4A25A8", extra='opacity="0.5"')
    if name == "emotions":
        return (sky(["#FFF0F6", "#E8E4FF"]) + "".join(E(x, y, r, r, c, extra='opacity="0.55"') for x, y, r, c in
                [(150, 140, 110, "#FFE3A3"), (1130, 160, 120, "#CFE3FF"), (1100, 590, 140, "#FFD0E4"), (180, 600, 130, "#D7F5C9")]))
    if name == "ferme":
        return (sky(["#8FD8FF", "#D9F3FF"]) + sun(160, 120, 60) + cloud(560, 110, 0.9) + cloud(1000, 140, 0.8) +
                hills(("#A6E37E", "#86D35E", "#6CC24A"), 470) + barn(1030, 520, 0.95) + fence(650))
    if name == "salle_de_bain":
        o = f'<rect width="{W}" height="{H}" fill="#CFF1FF"/>'
        for x in range(0, W, 80):
            for y in range(0, 520, 80):
                o += f'<rect x="{x + 3}" y="{y + 3}" width="74" height="74" rx="10" fill="{"#BDE9FB" if (x + y) % 160 else "#E3F7FF"}"/>'
        o += f'<rect x="0" y="520" width="{W}" height="200" fill="#9FD9F0"/>'
        o += ('<rect x="880" y="90" width="300" height="300" rx="150" fill="#E9F8FF" stroke="#FFFFFF" stroke-width="18"/>'
              + E(980, 190, 50, 26, "#FFFFFF", extra='opacity="0.7" transform="rotate(-35 980 190)"'))
        return o + bubbles([(120, 140, 40), (220, 260, 26), (90, 380, 22), (1180, 520, 34), (820, 120, 22)])
    if name == "nuit":
        i, d = lin(["#1B1D4E", "#2B2D6E", "#5A4AA8"])
        o = d + f'<rect width="{W}" height="{H}" fill="url(#{i})"/>' + moon(1060, 170, 95)
        r = random.Random(9)
        for _ in range(55):
            o += star(r.uniform(0, W), r.uniform(0, 460), r.uniform(4, 11), "#FFF3B0", r.uniform(0, 40), r.uniform(0.5, 1), "#FFF3B0")
        return o + cloud(220, 640, 1.8, 0.35, "#C9BFF0") + cloud(1100, 660, 1.6, 0.35, "#C9BFF0")
    if name == "scene":
        i, d = radial(["#FF9BD2", "#C04FD9", "#4B1F8F"], 0.5, 0.3, 0.9)
        o = d + f'<rect width="{W}" height="{H}" fill="url(#{i})"/>'
        o += spotlight(240, 0, 520, "#FFF6C9", 0.28) + spotlight(640, 0, 640, "#FFFFFF", 0.3) + spotlight(1040, 0, 520, "#C8FFF9", 0.28)
        o += E(640, 700, 680, 110, "#2B2D6E", extra='opacity="0.55"') + E(640, 690, 560, 80, "#FFD23F", extra='opacity="0.25"')
        o += note(120, 230, 1.0, "#FFD23F", -12) + note(1150, 200, 1.1, "#3DD6CF", 10) + note(1000, 90, 0.7, "#FFFFFF", 5)
        return o + confetti(40, 11, (0, 0, W, 360))
    if name == "ile":
        i, d = lin(["#6EC8FF", "#B9E6FF", "#FFE0F0"])
        return (d + f'<rect width="{W}" height="{H}" fill="url(#{i})"/>' + cloud(200, 560, 1.4) + cloud(1100, 580, 1.5) +
                cloud(640, 690, 2.2, 0.9) + island(640, 470, 1.0))
    if name == "maison":
        return (sky(["#FFE3C2", "#FFF6E5"]) + f'<rect x="0" y="520" width="{W}" height="200" fill="#F2C99B"/>' +
                '<rect x="80" y="110" width="260" height="230" rx="20" fill="#BDE9FF" stroke="#FFFFFF" stroke-width="16"/>' +
                P("M 210 110 L 210 340 M 80 225 L 340 225", stroke="#FFFFFF", sw=12) +
                '<rect x="980" y="300" width="200" height="220" rx="20" fill="#E59C5A" stroke="#B5703A" stroke-width="5"/>')
    return f'<rect width="{W}" height="{H}" fill="{CREAM}"/>'


def title(x, y, text, size=110, fill="#FFFFFF", stroke=NAVY, sw=None, rot=0, anchor="middle", font="Baloo 2"):
    sw = sw or max(8, size // 7)
    fam = "Baloo2" if font == "Baloo 2" else font
    return (f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="{fam}" font-weight="800" font-size="{size}" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" paint-order="stroke" '
            f'transform="rotate({rot} {x} {y})" style="letter-spacing:1px">{text}</text>')


def multicolor_title(x, y, text, size, colors, stroke=NAVY, sw=None, rot=0, spacing=0.0, inner_white=True):
    """Titre lettre par lettre (couleurs des personnages), centré sur x."""
    sw = sw or max(8, size // 6)
    spans = []
    k = 0
    for ch in text:
        if ch == " ":
            spans.append(" ")
            continue
        spans.append(f'<tspan fill="{colors[k % len(colors)]}">{ch}</tspan>')
        k += 1
    inner = "".join(spans)
    base = (f'text-anchor="middle" font-family="Baloo2" font-weight="800" font-size="{size}" '
            f'transform="rotate({rot} {x} {y})" style="letter-spacing:{spacing}px"')
    o = f'<text x="{x}" y="{y}" {base} fill="{stroke}" stroke="{stroke}" stroke-width="{sw * 2}" stroke-linejoin="round">{text}</text>'
    if inner_white:
        o += f'<text x="{x}" y="{y}" {base} fill="#FFFFFF" stroke="#FFFFFF" stroke-width="{sw}" stroke-linejoin="round">{text}</text>'
    o += f'<text x="{x}" y="{y}" {base}>{inner}</text>'
    return o
