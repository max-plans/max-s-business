# -*- coding: utf-8 -*-
"""Assemble la charte graphique en PDF (pages 1600x900) à partir des visuels générés."""
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import ROOT, BUILD, FONT_CSS, html_job, run  # noqa: E402


def jpg(rel, maxw=1500):
    src = os.path.join(ROOT, rel)
    im = Image.open(src).convert("RGB")
    if im.width > maxw:
        im = im.resize((maxw, int(im.height * maxw / im.width)))
    out = os.path.join(BUILD, rel.replace("/", "_") + ".jpg")
    im.save(out, quality=86)
    return "file://" + out


def pg(title, body, bg="#FFFFFF"):
    return (f'<section style="background:{bg}"><h1>{title}</h1>{body}'
            f'<div class="foot">Tralalune · Charte graphique v1 · 2026</div></section>')


pages = [
    f'<section style="background:#FFF6E5;display:flex;flex-direction:column;align-items:center;justify-content:center">'
    f'<img src="{jpg("01_IDENTITE/logo/logo_officiel_2000x1100.png")}" style="width:1100px">'
    f'<div style="font:800 54px Baloo2;color:#2B2D6E;margin-top:10px">Charte graphique</div>'
    f'<div style="font:700 28px Fredoka;color:#A66BFF">« Chante, danse et rêve avec les copains ! »</div></section>',
    pg("Logo et variantes",
       f'<div class="row"><img src="{jpg("01_IDENTITE/logo/logo_officiel_2000x1100.png", 900)}" style="width:700px;background:#FFF6E5;border-radius:20px">'
       f'<div><img src="{jpg("01_IDENTITE/logo/logo_simplifie_fond_nuit.png", 900)}" style="width:640px;border-radius:20px"><br>'
       f'<p>Zone de protection = hauteur du « a ». Taille mini : 240 px (officiel), 120 px (simplifié), 32 px (monogramme).<br>'
       f'Ne jamais déformer, recolorer, retirer le contour bleu nuit ni changer la police.</p></div></div>'),
    pg("Palette officielle", f'<img src="{jpg("01_IDENTITE/charte_graphique/palette_officielle.png")}" style="width:1450px">'
       '<p>Jamais de noir pur : le Bleu Nuit #2B2D6E le remplace. 3 couleurs dominantes maximum par image.</p>'),
    pg("Typographies", f'<img src="{jpg("01_IDENTITE/charte_graphique/typographies.png")}" style="width:1300px">', "#FFF6E5"),
    pg("Les 5 copains — échelle officielle", f'<img src="{jpg("02_PERSONNAGES/lineup_echelle_officielle.png")}" style="width:1450px">'
       '<p>Ordre sur les plans de groupe : Luna, Bibou, Milo (centre), Pipo, Nounou. Tête = 55 % de la hauteur.</p>'),
    pg("Bannière et zones de sécurité", f'<img src="{jpg("01_IDENTITE/banniere/banniere_GUIDE_zones_securite.png")}" style="width:1250px">'),
    pg("Photo de profil", f'<div class="row"><img src="{jpg("01_IDENTITE/photo_profil/photo_profil_800x800.png", 700)}" style="width:520px;border-radius:50%">'
       f'<img src="{jpg("01_IDENTITE/photo_profil/test_lisibilite_petit_format.png", 900)}" style="width:800px"></div>'),
    pg("Système de miniatures", f'<img src="{jpg("03_MINIATURES/planche_controle_10_miniatures.png")}" style="width:1450px">'
       '<p>Repère de marque en haut à gauche · 1 personnage dominant à l\'expression forte · 2 à 3 mots maximum · fond contrasté propre à chaque thème.</p>', "#111"),
]

css = (FONT_CSS + "@page{size:1600px 900px;margin:0}body{margin:0}section{width:1600px;height:900px;box-sizing:border-box;"
       "padding:50px 70px;page-break-after:always;position:relative;overflow:hidden}"
       "h1{font:800 56px Baloo2;color:#2B2D6E;margin:0 0 24px}p{font:700 24px Nunito;color:#444;max-width:1400px}"
       ".row{display:flex;gap:40px;align-items:center}.foot{position:absolute;bottom:22px;right:40px;font:700 18px Nunito;color:#999}")
html = f"<!DOCTYPE html><html><head><meta charset='utf-8'><style>{css}</style></head><body>{''.join(pages)}</body></html>"
html_job(html, 1600, 900, os.path.join(ROOT, "01_IDENTITE", "charte_graphique", "charte_graphique_Tralalune.pdf"), pdf=True)
run()
