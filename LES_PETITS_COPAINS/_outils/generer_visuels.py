# -*- coding: utf-8 -*-
"""
Génère TOUS les visuels du projet Tralalune.
Usage :  python3 _outils/generer_visuels.py
(Nécessite Node + Playwright + Chromium ; voir README.)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from art import CHARS, ORDER, EXPRS, EXPR_LABELS, POSES, POSE_LABELS, place, head, E, P, G, mix  # noqa: E402
import scenes as S  # noqa: E402
from common import ROOT, svg_page, html_job, run, page, FONT_CSS  # noqa: E402

BRAND = "Tralalune"
SLOGAN = "Chante, danse et rêve avec les copains !"
SUB = "Comptines &amp; chansons pour enfants"
NAVY = "#2B2D6E"
PALETTE = [
    ("Orange Milo", "#FF9F1C", "Couleur principale, boutons, accents"),
    ("Jaune Soleil", "#FFD23F", "Lumière, étoiles, joie"),
    ("Rose Luna", "#FF86C3", "Magie, douceur"),
    ("Violet Luna", "#A66BFF", "Rêve, soirée, berceuses"),
    ("Vert Pipo", "#5CC85A", "Nature, découverte, danse"),
    ("Turquoise Pipo", "#2EC4C8", "Fraîcheur, énergie"),
    ("Bleu Nounou", "#4A8FE7", "Apprentissage, calme"),
    ("Brun Bibou", "#C98C58", "Câlins, quotidien, gourmandise"),
    ("Bleu Nuit", "#2B2D6E", "Textes, contours des titres"),
    ("Crème Tralalune", "#FFF6E5", "Fonds clairs, respiration"),
]
LOGO_COLS = ["#FF9F1C", "#FF86C3", "#A66BFF", "#5CC85A", "#2EC4C8", "#4A8FE7", "#FFD23F", "#FF86C3", "#FF9F1C"]

D = lambda *p: os.path.join(ROOT, *p)  # noqa: E731


# =============================================================================
# 1. IDENTITÉ
# =============================================================================
def logo_svg(cx, cy, scale=1.0, with_chars=True, with_sub=True):
    s = scale
    o = []
    if with_chars:
        # les 5 copains qui « dépassent » au-dessus du nom
        for k, dx, dy, sz, fl in [("luna", -330, -120, 230, False), ("bibou", -150, -150, 220, False),
                                  ("milo", 30, -175, 270, False), ("pipo", 215, -150, 220, True),
                                  ("nounou", 380, -120, 220, True)]:
            o.append(head(k, cx + dx * s, cy + dy * s, sz * s, "joyeux", flip=fl))
    # croissant de lune + note (signature Tralalune)
    o.append(S.moon(cx + 560 * s, cy - 120 * s, 55 * s, "#FFD23F"))
    o.append(S.note(cx - 560 * s, cy - 60 * s, 1.0 * s, "#A66BFF", -12))
    o.append(S.star(cx + 640 * s, cy - 200 * s, 24 * s, "#FFD23F", 12))
    o.append(S.star(cx - 470 * s, cy - 190 * s, 16 * s, "#FF86C3", 12, stroke="#E0609E"))
    o.append(S.multicolor_title(cx, cy + 110 * s, BRAND, int(250 * s), LOGO_COLS, NAVY, int(22 * s), -3, 2))
    if with_sub:
        w = 760 * s
        o.append(f'<rect x="{cx - w / 2}" y="{cy + 150 * s}" width="{w}" height="{74 * s}" rx="{37 * s}" fill="{NAVY}"/>')
        o.append(f'<text x="{cx}" y="{cy + 200 * s}" text-anchor="middle" font-family="Fredoka" font-weight="700" '
                 f'font-size="{40 * s:.0f}" fill="#FFFFFF">{SUB}</text>')
    return "".join(o)


def identite():
    # Logo officiel (fond crème), transparent, simplifié, monogramme
    svg_page(f'<rect width="2000" height="1100" fill="#FFF6E5"/>' + logo_svg(1000, 560, 1.15), 2000, 1100,
             D("01_IDENTITE", "logo", "logo_officiel_2000x1100.png"))
    svg_page(logo_svg(1000, 560, 1.15), 2000, 1100, D("01_IDENTITE", "logo", "logo_officiel_transparent.png"), transparent=True)
    simp = (S.moon(1000 + 560, 330, 60, "#FFD23F") + S.star(1000 + 640, 250, 26, "#FFD23F", 10) +
            S.multicolor_title(1000, 470, BRAND, 280, LOGO_COLS, NAVY, 24, -3, 2))
    svg_page(simp, 2000, 700, D("01_IDENTITE", "logo", "logo_simplifie_transparent.png"), transparent=True)
    svg_page('<rect width="2000" height="700" fill="#2B2D6E"/>' + simp, 2000, 700, D("01_IDENTITE", "logo", "logo_simplifie_fond_nuit.png"))
    mono = ('<circle cx="500" cy="500" r="480" fill="#2B2D6E"/>' + S.moon(470, 470, 300, "#FFD23F") +
            S.note(560, 640, 2.6, "#FF86C3", -10) + S.star(760, 260, 50, "#FFFFFF", 8, stroke="#FFFFFF"))
    svg_page(mono, 1000, 1000, D("01_IDENTITE", "logo", "monogramme_lune_note.png"), transparent=True)

    # Photo de profil 800x800 — 3 variantes, la principale = « Nuit » (contraste maximal)
    from art import draw, G as _G
    def char_head(k, cx, cy, size, expr="joyeux", flip=False):
        """Tête seule, détourée proprement (sans morceaux de corps)."""
        s = size / 290.0
        cid = f"ch{k}{int(cx)}{int(cy)}{int(size)}"
        clip = {"milo": '<circle cx="200" cy="190" r="143"/>', "luna": '<ellipse cx="200" cy="175" rx="150" ry="150"/>',
                "nounou": '<ellipse cx="200" cy="200" rx="135" ry="128"/>'}.get(k, '<ellipse cx="200" cy="185" rx="140" ry="122"/>')
        f = " translate(400 0) scale(-1 1)" if flip else ""
        return (f'<clipPath id="{cid}">{clip}</clipPath>' +
                _G(f'<g clip-path="url(#{cid})">' + draw(k, "front", expr, "debout", shadow=False) + "</g>",
                   f"translate({cx - 200 * s:.1f} {cy - 190 * s:.1f}) scale({s:.4f}){f}"))

    def milo_head(cx, cy, size, expr="joyeux"):
        return char_head("milo", cx, cy, size, expr)

    def pp_nuit():
        i, d = S.radial(["#6A4FD8", "#3B2E9A", "#1B1D4E"], 0.5, 0.45, 0.72)
        o = d + f'<rect width="800" height="800" fill="url(#{i})"/>'
        for x, y, r in [(150, 230, 10), (650, 150, 8), (690, 560, 11), (120, 560, 7), (560, 690, 7), (250, 120, 6), (300, 700, 8)]:
            o += S.star(x, y, r, "#FFF3B0", x % 40, 0.95, "#FFF3B0")
        o += S.moon(420, 380, 300, "#FFD23F")
        o += '<circle cx="400" cy="425" r="245" fill="#FFFFFF" opacity="0.35" filter="url(#glow)"/>'
        o += milo_head(400, 425, 520)
        return o

    def pp_ciel():
        i, d = S.radial(["#E6F6FF", "#8FD3FF", "#3D8BFD"], 0.5, 0.4, 0.75)
        o = d + f'<rect width="800" height="800" fill="url(#{i})"/>'
        o += S.cloud(170, 640, 1.3) + S.cloud(660, 650, 1.3)
        o += S.moon(615, 180, 62, "#FFD23F") + S.star(170, 180, 24, "#FFFFFF", 10, stroke="#FFFFFF")
        o += '<circle cx="400" cy="425" r="240" fill="#FFFFFF" opacity="0.45" filter="url(#glow)"/>'
        o += milo_head(400, 425, 520)
        return o

    def pp_groupe():
        """PHOTO DE PROFIL OFFICIELLE : les 5 copains en arc autour de Milo, fond nuit + lune."""
        i, d = S.radial(["#6A4FD8", "#3B2E9A", "#1B1D4E"], 0.5, 0.5, 0.72)
        o = d + f'<rect width="800" height="800" fill="url(#{i})"/>'
        for x, y, r in [(110, 280, 8), (690, 280, 8), (400, 60, 9), (95, 560, 7), (705, 560, 7), (240, 90, 6), (560, 90, 6)]:
            o += S.star(x, y, r, "#FFF3B0", x % 40, 0.95, "#FFF3B0")
        o += S.moon(400, 92, 44, "#FFD23F")
        for k, x, y, sz, e, fl in [("luna", 165, 345, 215, "joyeux", False), ("bibou", 280, 200, 205, "rire", False),
                                   ("pipo", 520, 200, 205, "joyeux", True), ("nounou", 635, 345, 210, "joyeux", True),
                                   ("milo", 400, 380, 330, "joyeux", False)]:
            o += f'<circle cx="{x}" cy="{y}" r="{sz * 0.42:.0f}" fill="#FFFFFF" opacity="0.30" filter="url(#glow)"/>'
            o += char_head(k, x, y, sz, e, fl)
        # Nom de la chaîne, bien lisible, dans la partie basse du cercle
        o += '<rect x="95" y="555" width="610" height="150" rx="75" fill="#1B1D4E" opacity="0.55"/>'
        o += S.multicolor_title(400, 668, BRAND, 128, LOGO_COLS, NAVY, 13, -3, 1)
        return o

    pp = pp_groupe()
    svg_page(pp, 800, 800, D("01_IDENTITE", "photo_profil", "photo_profil_800x800.png"))
    svg_page(pp_nuit(), 800, 800, D("01_IDENTITE", "photo_profil", "variante_milo_seul_nuit_800x800.png"))
    svg_page(pp_ciel(), 800, 800, D("01_IDENTITE", "photo_profil", "variante_milo_seul_ciel_800x800.png"))
    # aperçu rond (comme sur YouTube) à 196 / 72 / 40 px, sur fond clair ET sombre
    def apercu(img, y, bg):
        o = f'<rect x="0" y="{y}" width="800" height="250" fill="{bg}"/>'
        for k, (cx, r) in enumerate([(160, 98), (420, 36), (600, 20)]):
            sc = 2 * r / 800
            o += (f'<clipPath id="ap{y}{k}"><circle cx="{cx}" cy="{y + 125}" r="{r}"/></clipPath>'
                  f'<g clip-path="url(#ap{y}{k})"><g transform="translate({cx - r} {y + 125 - r}) scale({sc:.4f})">{img}</g></g>')
        return o
    svg_page(apercu(pp, 0, "#FFFFFF") + apercu(pp, 250, "#0F0F0F") +
             f'<text x="400" y="535" text-anchor="middle" font-family="Nunito" font-weight="700" font-size="22" fill="#555">'
             f'Recadrage rond YouTube : 196 · 72 · 40 px (thème clair et sombre)</text>',
             800, 560, D("01_IDENTITE", "photo_profil", "test_lisibilite_petit_format.png"))

    # Bannière 2560x1440
    def banner(guides=False):
        i, d = S.lin(["#6EC8FF", "#B9E6FF", "#FFE6F2"])
        o = d + f'<rect width="2560" height="1440" fill="url(#{i})"/>'
        o += S.rainbow(1280, 1200, 900, 40, 0.35)
        for x, y, sc in [(300, 470, 1.6), (2250, 480, 1.7), (900, 1010, 1.4), (1700, 1030, 1.5)]:
            o += S.cloud(x, y, sc, 0.9)
        o += P("M 0 960 Q 640 860 1280 940 T 2560 920 L 2560 1440 L 0 1440 Z", "#8FDB72")
        o += P("M 0 1030 Q 900 960 2560 1040 L 2560 1440 L 0 1440 Z", "#6CC857")
        for x, c in [(420, "#FF86C3"), (560, "#FFD23F"), (2000, "#3DD6CF"), (2140, "#A66BFF"), (1180, "#FF86C3"), (1400, "#FFD23F")]:
            o += S.flower(x, 960, 1.3, c)
        o += S.sparkles([(1000, 560, 18), (1620, 580, 22), (720, 600, 14), (1880, 620, 14)])
        o += S.moon(1660, 600, 40, "#FFD23F")
        o += place("milo", 615, 930, 390, expr="joyeux", pose="coucou")
        o += place("luna", 790, 925, 300, expr="joyeux", pose="debout")
        o += place("bibou", 1770, 925, 300, expr="rire", pose="saut")
        o += place("pipo", 1945, 925, 310, expr="joyeux", pose="danse", flip=True)
        o += place("nounou", 2170, 930, 330, expr="joyeux", pose="coucou", flip=True)
        o += S.multicolor_title(1280, 745, BRAND, 165, LOGO_COLS, NAVY, 18, -2, 2)
        o += (f'<rect x="900" y="785" width="760" height="78" rx="39" fill="{NAVY}"/>'
              f'<text x="1280" y="838" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="40" fill="#FFFFFF">{SLOGAN}</text>')
        if guides:
            zones = [(0, 0, 2560, 1440, "#FF0000", "TV : 2560 × 1440 (image entière)", 24, 50),
                     (507, 508, 1546, 423, "#00A000", "ZONE DE SÉCURITÉ : 1546 × 423 (visible partout)", 530, 470),
                     (0, 508, 2560, 423, "#0050FF", "Ordinateur : 2560 × 423", 24, 990),
                     (353, 508, 1855, 423, "#FF8C00", "Tablette : 1855 × 423", 1700, 990)]
            for x, y, w, h, c, label, lx, ly in zones:
                o += f'<rect x="{x + 4}" y="{y + 4}" width="{w - 8}" height="{h - 8}" fill="none" stroke="{c}" stroke-width="8" stroke-dasharray="30 14"/>'
                o += f'<text x="{lx}" y="{ly}" font-family="Nunito" font-weight="800" font-size="38" fill="{c}" stroke="#fff" stroke-width="6" paint-order="stroke">{label}</text>'
        return o
    svg_page(banner(), 2560, 1440, D("01_IDENTITE", "banniere", "banniere_youtube_2560x1440.png"))
    svg_page(banner(True), 2560, 1440, D("01_IDENTITE", "banniere", "banniere_GUIDE_zones_securite.png"))

    # Palette officielle
    pal = '<rect width="2000" height="900" fill="#FFFFFF"/>'
    pal += f'<text x="80" y="110" font-family="Baloo2" font-weight="800" font-size="72" fill="{NAVY}">Palette officielle Tralalune</text>'
    for n, (name, hx, use) in enumerate(PALETTE):
        x = 80 + (n % 5) * 372
        y = 180 + (n // 5) * 350
        pal += f'<rect x="{x}" y="{y}" width="330" height="200" rx="28" fill="{hx}" stroke="#E5E5EF" stroke-width="3"/>'
        pal += f'<text x="{x}" y="{y + 245}" font-family="Fredoka" font-weight="700" font-size="34" fill="{NAVY}">{name}</text>'
        pal += f'<text x="{x}" y="{y + 285}" font-family="Nunito" font-weight="800" font-size="28" fill="#555">{hx}</text>'
        pal += f'<text x="{x}" y="{y + 318}" font-family="Nunito" font-weight="400" font-size="22" fill="#777">{use}</text>'
    svg_page(pal, 2000, 900, D("01_IDENTITE", "charte_graphique", "palette_officielle.png"))

    # Planche typographies
    ty = '<rect width="2000" height="1000" fill="#FFF6E5"/>'
    rows = [("Baloo 2 ExtraBold — TITRES &amp; LOGO", "Baloo2", 800, 96, "Tralalune : Bonjour les amis !"),
            ("Fredoka SemiBold/Bold — SOUS-TITRES &amp; PAROLES À L'ÉCRAN", "Fredoka", 700, 80, "Un, deux, trois, on chante !"),
            ("Nunito Regular/ExtraBold — TEXTES, DESCRIPTIONS", "Nunito", 400, 56, "Des comptines originales pour les 0-6 ans.")]
    for n, (lab, fam, w, size, sample) in enumerate(rows):
        y = 170 + n * 280
        ty += f'<text x="80" y="{y}" font-family="Nunito" font-weight="800" font-size="30" fill="#A66BFF">{lab}</text>'
        ty += f'<text x="80" y="{y + size + 20}" font-family="{fam}" font-weight="{w}" font-size="{size}" fill="{NAVY}">{sample}</text>'
    ty += f'<text x="80" y="950" font-family="Nunito" font-weight="400" font-size="26" fill="#666">Polices libres (licence SIL Open Font License) — usage commercial autorisé. Fichiers : 01_IDENTITE/charte_graphique/polices/</text>'
    svg_page(ty, 2000, 1000, D("01_IDENTITE", "charte_graphique", "typographies.png"))


# =============================================================================
# 2. PERSONNAGES
# =============================================================================
INFO = {
    "milo": dict(role="Personnage principal &amp; mascotte", perso="Courageux · drôle · enthousiaste · protecteur",
                 traits=["Fourrure orange doré", "Grande crinière ronde orange vif", "Yeux marron brillants", "Petit nez rond brun", "Queue à pompon"],
                 dom="Orange &amp; jaune"),
    "luna": dict(role="Chansons magiques, émotions, histoires du soir", perso="Douce · rêveuse · imaginative · gentille",
                 traits=["Pelage blanc", "Crinière rose, violette, turquoise", "Corne dorée torsadée", "Yeux violets", "Petites ailes lumineuses"],
                 dom="Rose &amp; violet"),
    "bibou": dict(role="Chansons amusantes &amp; quotidien", perso="Gourmand · rigolo · câlin · maladroit",
                  traits=["Fourrure brun clair", "Grandes oreilles rondes", "Ventre et museau crème", "Joues rondes", "Grands yeux chocolat"],
                  dom="Marron &amp; crème"),
    "pipo": dict(role="Apprendre, danser, découvrir", perso="Curieux · énergique · joueur · aventurier",
                 traits=["Peau vert pomme", "Épines turquoise &amp; jaunes", "Ventre vert clair", "Queue arrondie", "Grands yeux sarcelle"],
                 dom="Vert &amp; turquoise"),
    "nounou": dict(role="Apprentissage : chiffres, couleurs, savoirs", perso="Calme · intelligent · gentil · attentif",
                   traits=["Fourrure blanche &amp; crème", "Grandes oreilles tombantes", "Salopette bleue à boutons jaunes", "Joues roses", "Yeux bleus"],
                   dom="Bleu &amp; blanc"),
}


def char_color(k):
    return {"milo": "#FF9F1C", "luna": "#A66BFF", "bibou": "#C98C58", "pipo": "#5CC85A", "nounou": "#4A8FE7"}[k]


def personnages():
    for k in ORDER:
        c = CHARS[k]
        folder = D("02_PERSONNAGES", k.upper())
        col = char_color(k)
        name = c["name"]
        # Illustration officielle
        i, d = S.radial(["#FFFFFF", mix(col, "#FFFFFF", 0.55), col], 0.5, 0.42, 0.8)
        o = d + f'<rect width="1600" height="1600" fill="url(#{i})"/>'
        o += S.sparkles([(260, 300, 30), (1330, 260, 36), (1360, 900, 24), (220, 980, 22)])
        o += S.star(1250, 420, 30, "#FFD23F", 12) + S.star(330, 520, 22, "#FFFFFF", 0, stroke="#FFFFFF")
        o += place(k, 800, 1330, 1150, expr="joyeux", pose="coucou")
        o += S.title(800, 1500, name.upper(), 150, "#FFFFFF", NAVY, 22)
        svg_page(o, 1600, 1600, os.path.join(folder, f"{k}_illustration_officielle.png"))
        # Vues individuelles (fond blanc : idéal comme image de référence pour l'IA)
        for v, lab in [("front", "face"), ("profile", "profil"), ("back", "dos")]:
            svg_page('<rect width="1000" height="1200" fill="#FFFFFF"/>' + place(k, 500, 1120, 1050, view=v),
                     1000, 1200, os.path.join(folder, f"{k}_vue_{lab}.png"))
        svg_page(place(k, 500, 1120, 1050, view="front"), 1000, 1200, os.path.join(folder, f"{k}_vue_face_transparent.png"), transparent=True)
        # Planche de rotation (turnaround) avec repères de proportions
        o = '<rect width="2400" height="1300" fill="#FFFFFF"/>'
        for y in (250, 520, 1140):
            o += f'<line x1="60" y1="{y}" x2="2340" y2="{y}" stroke="#D8DCF0" stroke-width="3" stroke-dasharray="14 10"/>'
        o += f'<text x="70" y="240" font-family="Nunito" font-weight="700" font-size="26" fill="#9AA0C8">sommet de la tête</text>'
        o += f'<text x="70" y="510" font-family="Nunito" font-weight="700" font-size="26" fill="#9AA0C8">menton (tête = 55 % de la hauteur)</text>'
        o += f'<text x="70" y="1170" font-family="Nunito" font-weight="700" font-size="26" fill="#9AA0C8">sol</text>'
        for n, (v, lab) in enumerate([("front", "FACE"), ("profile", "PROFIL"), ("back", "DOS")]):
            o += place(k, 450 + n * 750, 1140, 1000, view=v)
            o += S.title(450 + n * 750, 1250, lab, 60, col, "#FFFFFF", 0)
        o += S.title(1200, 110, f"{name} — planche de rotation officielle", 80, NAVY, "#FFFFFF", 0)
        svg_page(o, 2400, 1300, os.path.join(folder, f"{k}_planche_rotation.png"))
        # Expressions
        o = f'<rect width="2400" height="1350" fill="{mix(col, "#FFFFFF", 0.85)}"/>'
        o += S.title(1200, 100, f"{name} — expressions officielles", 76, NAVY, "#FFFFFF", 0)
        for n, e in enumerate(EXPRS):
            x = 300 + (n % 4) * 600
            y = 160 + (n // 4) * 590
            o += f'<rect x="{x - 260}" y="{y}" width="520" height="540" rx="40" fill="#FFFFFF"/>'
            o += head(k, x, y + 250, 430, e)
            o += S.title(x, y + 515, EXPR_LABELS[e], 48, col, "#FFFFFF", 0)
        svg_page(o, 2400, 1350, os.path.join(folder, f"{k}_expressions.png"))
        # Poses
        o = f'<rect width="2400" height="1100" fill="{mix(col, "#FFFFFF", 0.88)}"/>'
        o += S.title(1200, 100, f"{name} — poses de référence", 76, NAVY, "#FFFFFF", 0)
        pose_expr = {"debout": "neutre", "coucou": "joyeux", "saut": "rire", "danse": "joyeux", "montre": "joyeux", "calin": "neutre"}
        for n, p in enumerate(POSES):
            x = 200 + n * 400
            o += place(k, x, 960, 680, expr=pose_expr[p], pose=p)
            o += S.title(x, 1050, POSE_LABELS[p], 44, col, "#FFFFFF", 0)
        svg_page(o, 2400, 1100, os.path.join(folder, f"{k}_poses.png"))
        # Fiche d'identité visuelle
        inf = INFO[k]
        o = f'<rect width="1920" height="1080" fill="#FFFFFF"/><rect x="0" y="0" width="760" height="1080" fill="{mix(col, "#FFFFFF", 0.8)}"/>'
        o += place(k, 380, 1000, 860, expr="joyeux", pose="debout")
        o += f'<text x="840" y="140" font-family="Baloo2" font-weight="800" font-size="110" fill="{col}" stroke="{NAVY}" stroke-width="5" paint-order="stroke">{name.upper()}</text>'
        o += f'<text x="840" y="200" font-family="Fredoka" font-weight="700" font-size="44" fill="{NAVY}">{c["espece"].capitalize()} · {inf["role"]}</text>'
        o += f'<text x="840" y="270" font-family="Nunito" font-weight="800" font-size="34" fill="#666">Personnalité : {inf["perso"]}</text>'
        o += f'<text x="840" y="350" font-family="Fredoka" font-weight="700" font-size="38" fill="{NAVY}">Signes distinctifs (à ne jamais modifier)</text>'
        for n, t in enumerate(inf["traits"]):
            o += f'<circle cx="860" cy="{398 + n * 52}" r="10" fill="{col}"/><text x="886" y="{410 + n * 52}" font-family="Nunito" font-weight="700" font-size="32" fill="#333">{t}</text>'
        o += f'<text x="840" y="700" font-family="Fredoka" font-weight="700" font-size="38" fill="{NAVY}">Couleurs verrouillées</text>'
        sw = [("Base", c["base"]), ("Lumière", c["light"]), ("Ombre", c["shade"]), ("Contour", c["line"]), ("Ventre/museau", c["belly"]), ("Yeux", c["eye"])]
        extra = lambda: {"milo": [("Crinière", c.get("mane", ""))], "luna": [("Rose", c.get("pink", "")), ("Violet", c.get("violet", "")), ("Turquoise", c.get("turq", "")), ("Corne", c.get("horn", ""))],
                 "pipo": [("Épine 1", CHARS["pipo"]["spikes"][0]), ("Épine 2", CHARS["pipo"]["spikes"][1])], "nounou": [("Salopette", c.get("overall", "")), ("Boutons", c.get("button", ""))], "bibou": [("Nez", c["nose"])]}
        ex = {"milo": [("Crinière", CHARS["milo"]["mane"])], "luna": [("Rose", c.get("pink")), ("Violet", c.get("violet")), ("Turquoise", c.get("turq")), ("Corne", c.get("horn"))],
              "pipo": [("Épine 1", CHARS["pipo"]["spikes"][0]), ("Épine 2", CHARS["pipo"]["spikes"][1])],
              "nounou": [("Salopette", c.get("overall")), ("Boutons", c.get("button"))], "bibou": [("Nez", c["nose"])]}[k]
        for n, (lab, hx) in enumerate(sw + ex):
            x = 840 + (n % 6) * 170
            y = 730 + (n // 6) * 160
            o += f'<rect x="{x}" y="{y}" width="140" height="80" rx="16" fill="{hx}" stroke="#CCC" stroke-width="2"/>'
            o += f'<text x="{x}" y="{y + 108}" font-family="Nunito" font-weight="800" font-size="22" fill="#333">{lab}</text>'
            o += f'<text x="{x}" y="{y + 134}" font-family="Nunito" font-weight="400" font-size="21" fill="#666">{hx}</text>'
        svg_page(o, 1920, 1080, os.path.join(folder, f"{k}_fiche_identite.png"))

    # Image de groupe officielle
    o = S.bg("ile")
    o += S.sparkles([(200, 200, 24), (1080, 160, 28), (980, 300, 16)])
    o += place("bibou", 360, 650, 330, expr="rire", pose="saut")
    o += place("luna", 520, 610, 330, expr="joyeux", pose="danse")
    o += place("nounou", 920, 650, 330, expr="joyeux", pose="coucou", flip=True)
    o += place("pipo", 770, 610, 320, expr="rire", pose="saut")
    o += place("milo", 640, 690, 400, expr="joyeux", pose="coucou")
    o += S.multicolor_title(640, 140, BRAND, 120, LOGO_COLS, NAVY, 12, -2)
    svg_page(o, 1280, 720, D("02_PERSONNAGES", "groupe_officiel_1280x720.png"))
    o2 = '<rect width="2400" height="1100" fill="#FFFFFF"/>'
    for n, k in enumerate(ORDER):
        o2 += place(k, 260 + n * 470, 960, 760, expr="joyeux")
        o2 += S.title(260 + n * 470, 1060, CHARS[k]["name"].upper(), 64, char_color(k), NAVY, 8)
    o2 += S.title(1200, 110, "Line-up officiel — échelle relative respectée", 64, NAVY, "#FFFFFF", 0)
    svg_page(o2, 2400, 1100, D("02_PERSONNAGES", "lineup_echelle_officielle.png"))


# =============================================================================
# 3. MINIATURES (1280 x 720)
# =============================================================================
def badge(text, x=1150, y=70, col="#FF5A5F"):
    return (f'<rect x="{x - 110}" y="{y - 40}" width="220" height="70" rx="35" fill="{col}" stroke="#FFFFFF" stroke-width="6"/>'
            f'<text x="{x}" y="{y + 12}" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="36" fill="#FFFFFF">{text}</text>')


def brand_tag():
    """Petit repère de marque, toujours au même endroit (coin haut gauche)."""
    return (f'<rect x="22" y="22" width="250" height="62" rx="31" fill="#FFFFFF" opacity="0.92"/>' +
            S.moon(58, 53, 18, "#FFB020") +
            S.multicolor_title(165, 70, BRAND, 40, LOGO_COLS, NAVY, 4, 0, 0, inner_white=False))


THUMBS = {}


def thumb(n):
    def deco(f):
        THUMBS[n] = f
        return f
    return deco


@thumb(1)
def t1():
    return (S.bg("matin") + place("bibou", 230, 640, 300, expr="joyeux", pose="coucou") +
            place("nounou", 1080, 650, 300, expr="joyeux", pose="coucou", flip=True) +
            place("milo", 640, 760, 640, expr="joyeux", pose="coucou") +
            S.title(640, 160, "BONJOUR !", 160, "#FFD23F", NAVY, 20, -3))


@thumb(2)
def t2():
    o = S.bg("couleurs")
    o += S.splash(330, 470, 120, "#FF5A5F", 7) + S.splash(960, 470, 120, "#3D8BFD", 8) + S.splash(640, 250, 90, "#FFD23F", 9)
    o += place("milo", 640, 730, 560, expr="surpris", pose="saut")
    o += S.multicolor_title(640, 660, "LES COULEURS", 130, ["#FF5A5F", "#FF9F1C", "#FFD23F", "#5CC85A", "#3D8BFD", "#A66BFF"], NAVY, 12, -2)
    return o


@thumb(3)
def t3():
    o = S.bg("chiffres")
    o += S.balloon(700, 200, "#FF5A5F", "1", 1.25) + S.balloon(900, 250, "#5CC85A", "2", 1.25) + S.balloon(1110, 200, "#3D8BFD", "3", 1.25)
    o += place("nounou", 330, 720, 600, expr="joyeux", pose="montre")
    o += S.title(900, 610, "1, 2, 3 !", 160, "#FFD23F", NAVY, 20, -3)
    return o


@thumb(4)
def t4():
    o = S.bg("jungle")
    o += place("bibou", 380, 690, 480, expr="rire", pose="danse")
    o += place("pipo", 900, 690, 480, expr="joyeux", pose="danse", flip=True)
    o += S.note(640, 330, 1.3, "#FF86C3", -10) + S.note(140, 260, 1.0, "#FFD23F", 10)
    o += S.title(640, 150, "LA DANSE", 140, "#FFFFFF", NAVY, 18, -3) + S.title(640, 250, "DES ANIMAUX", 90, "#FFD23F", NAVY, 14, -3)
    return o


@thumb(5)
def t5():
    o = S.bg("fete")
    o += S.cake(980, 640, 1.1)
    o += place("pipo", 470, 700, 560, expr="rire", pose="saut")
    o += S.party_hat(470, 190, -8, 0.95)
    o += S.title(860, 210, "C'EST LA FÊTE !", 110, "#FFD23F", NAVY, 16, -4)
    return o


@thumb(6)
def t6():
    o = S.bg("emotions")
    cells = [("milo", "joyeux", 330, 210, "#FFE3A3"), ("luna", "triste", 950, 210, "#CFE3FF"),
             ("bibou", "fache", 330, 530, "#FFC9C9"), ("pipo", "surpris", 950, 530, "#D7F5C9")]
    for k, e, x, y, bgc in cells:
        o += f'<rect x="{x - 210}" y="{y - 150}" width="420" height="300" rx="40" fill="{bgc}" stroke="#FFFFFF" stroke-width="10"/>'
        o += head(k, x, y + 10, 330, e)
    o += f'<circle cx="640" cy="370" r="140" fill="#FFFFFF" stroke="{NAVY}" stroke-width="10"/>'
    o += S.heart(640, 300, 1.2) + S.title(640, 420, "ÉMOTIONS", 52, "#A66BFF", NAVY, 8)
    return o


@thumb(7)
def t7():
    o = S.bg("ferme")
    o += S.cow(1020, 640, 0.9) + S.sheep(160, 650, 0.9)
    o += place("bibou", 560, 720, 520, expr="rire", pose="coucou")
    o += S.chick(560, 232, 1.0)
    o += S.title(940, 190, "LA FERME", 140, "#FFFFFF", "#A52A2F", 18, -3)
    return o


@thumb(8)
def t8():
    o = S.bg("salle_de_bain")
    o += place("nounou", 470, 730, 600, expr="joyeux", pose="montre")
    o += S.toothbrush(860, 470, 25, 1.5)
    o += S.sparkles([(940, 260, 30), (1010, 340, 20), (880, 200, 18)], "#FFFFFF")
    o += S.title(960, 590, "BROSSE", 120, "#3DD6CF", NAVY, 16, -3) + S.title(960, 690, "TES DENTS !", 100, "#FFFFFF", NAVY, 14, -3)
    return o


@thumb(9)
def t9():
    o = S.bg("nuit")
    o += S.bed_cloud(640, 640, 1.7)
    o += place("luna", 610, 600, 470, expr="endormi", pose="calin")
    o += S.title(640, 130, "Bonne nuit", 120, "#FFE89A", "#1B1D4E", 14, 0, font="Baloo 2")
    o += S.title(640, 215, "berceuse douce", 52, "#FFFFFF", "#1B1D4E", 8)
    return o


@thumb(10)
def t10():
    o = S.bg("scene")
    for k, x, p, fl, h in [("luna", 230, "danse", False, 340), ("bibou", 430, "saut", False, 340),
                           ("pipo", 850, "saut", True, 340), ("nounou", 1050, "danse", True, 340)]:
        o += place(k, x, 660, h, expr="rire" if p == "saut" else "joyeux", pose=p, flip=fl)
    o += place("milo", 640, 700, 440, expr="joyeux", pose="saut")
    o += S.title(640, 140, "TOUS ENSEMBLE", 120, "#FFD23F", NAVY, 16, -3)
    o += S.title(640, 230, "ON DANSE !", 80, "#FFFFFF", NAVY, 12, -3)
    return o


THUMB_FILES = {
    1: "M01_bonjour_les_amis.png", 2: "M02_couleurs_avec_milo.png", 3: "M03_chiffres_1_2_3.png",
    4: "M04_danse_des_animaux.png", 5: "M05_pipo_fait_la_fete.png", 6: "M06_chanson_des_emotions.png",
    7: "M07_ferme_des_copains.png", 8: "M08_brossage_des_dents.png", 9: "M09_bonne_nuit_luna.png",
    10: "M10_tous_ensemble_on_danse.png",
}


def miniatures():
    allsvg = []
    for n, f in THUMBS.items():
        s = f() + brand_tag()
        svg_page(s, 1280, 720, D("03_MINIATURES", THUMB_FILES[n]))
        allsvg.append(s)
    # Planche de contrôle (comme dans les résultats de recherche YouTube)
    o = '<rect width="2000" height="1200" fill="#0F0F0F"/>'
    for n, s in enumerate(allsvg):
        x = 40 + (n % 5) * 392
        y = 70 + (n // 5) * 270
        o += f'<g transform="translate({x} {y}) scale({360 / 1280:.4f})"><svg width="1280" height="720" viewBox="0 0 1280 720" overflow="hidden">{s}</svg></g>'
    o += '<text x="40" y="40" font-family="Nunito" font-weight="800" font-size="28" fill="#FFFFFF">Planche de contrôle : les 10 miniatures à la taille d\'un écran de téléphone</text>'
    svg_page(o, 2000, 560, D("03_MINIATURES", "planche_controle_10_miniatures.png"))


if __name__ == "__main__":
    what = sys.argv[1:] or ["identite", "personnages", "miniatures"]
    if "identite" in what:
        identite()
    if "personnages" in what:
        personnages()
    if "miniatures" in what:
        miniatures()
    run()
