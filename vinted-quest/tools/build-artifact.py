#!/usr/bin/env python3
"""Assemble les sources en UN fichier HTML pour une publication Artifact Claude.

Usage : python3 tools/build-artifact.py <fichier-de-sortie.html>
L'Artifact ajoute lui-même doctype/head/body : on n'écrit que le contenu.
Three.js est chargé depuis cdnjs (version fixée) ; la bibliothèque Supabase et config.js ne sont pas inclus (le stockage passe par la capability "db").
"""
import base64
import pathlib
import sys

root = pathlib.Path(__file__).resolve().parent.parent
read = lambda name: (root / name).read_text(encoding='utf-8')
for name in ('style.css', 'app.js', 'city-gfx.js', 'city-build.js', 'city.js'):
    assert '</script' not in read(name) and '</style' not in read(name), f'{name} contient une balise de fermeture'

def data_uri(name):
    return 'data:image/png;base64,' + base64.b64encode((root / 'icons' / name).read_bytes()).decode()


html = f"""<title>Vinted Quest</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="icon" type="image/png" href="{data_uri('favicon-64.png')}">
<link rel="apple-touch-icon" href="{data_uri('apple-touch-180.png')}">
<style>
{read('style.css')}
</style>
<div id="splash"><img src="{data_uri('logo-192.png')}" alt="" width="132" height="132"><div class="splash-name">Vinted Quest</div><div class="splash-sub">Ouverture de la boutique…</div></div>
<div id="world" aria-label="Ta ville vue du ciel"></div>
<div id="vignette"></div>
<div id="hud" hidden>
  <div class="hud-top">
    <div class="hud-info">
      <div class="hud-coins" id="h-coins">🪙 0</div>
      <div class="hud-sub" id="h-sub"></div>
      <div class="hud-sub" id="h-place"></div>
      <div class="hud-hint" id="h-hint"></div>
    </div>
    <div class="hud-btns">
      <button class="hbtn" data-action="quick" aria-label="Ajout rapide d’un article">＋<span>Ajout</span></button>
      <button class="hbtn" data-action="sheet" data-v="empire" aria-label="Ouvrir l’empire">🏢<span>Empire</span></button>
      <button class="hbtn" data-action="sheet" data-v="home" aria-label="Ouvrir le menu">☰<span>Menu</span></button>
    </div>
  </div>
  <div class="cambtns">
    <button class="cbtn" data-action="cam" data-v="center" aria-label="Recentrer la vue">⌖</button>
    <button class="cbtn" data-action="cam" data-v="zin" aria-label="Zoom avant">＋</button>
    <button class="cbtn" data-action="cam" data-v="zout" aria-label="Zoom arrière">－</button>
    <button class="cbtn" data-action="cam" data-v="rotl" aria-label="Tourner à gauche">↺</button>
    <button class="cbtn" data-action="cam" data-v="rotr" aria-label="Tourner à droite">↻</button>
  </div>
  <div id="bpanel" hidden></div>
</div>
<div id="bubbles"></div>
<div id="fx"></div>
<div id="app"></div>
<dialog id="sheet"></dialog>
<dialog id="dlg"></dialog>
<div id="toast" popover="manual" role="status" aria-live="polite"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
{read('city-gfx.js')}
</script>
<script>
{read('city-build.js')}
</script>
<script>
{read('city.js')}
</script>
<script>
{read('app.js')}
</script>
"""
pathlib.Path(sys.argv[1]).write_text(html, encoding='utf-8')
print(f'{sys.argv[1]} : {len(html.encode("utf-8"))} octets')
