#!/usr/bin/env python3
"""Assemble les sources en UN fichier HTML pour une publication Artifact Claude.

Usage : python3 tools/build-artifact.py <fichier-de-sortie.html>
L'Artifact ajoute lui-même doctype/head/body : on n'écrit que le contenu.
Three.js est chargé depuis cdnjs (version fixée) ; la bibliothèque Supabase et config.js ne sont pas inclus (le stockage passe par la capability "db").
"""
import pathlib
import sys

root = pathlib.Path(__file__).resolve().parent.parent
read = lambda name: (root / name).read_text(encoding='utf-8')
for name in ('style.css', 'app.js', 'world.js'):
    assert '</script' not in read(name) and '</style' not in read(name), f'{name} contient une balise de fermeture'

html = f"""<title>Vinted Quest</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
{read('style.css')}
</style>
<div id="world" aria-label="Ta boutique en 3D"></div>
<div id="hud" hidden>
  <div class="hud-top">
    <div class="hud-info">
      <div class="hud-coins" id="h-coins">🪙 0</div>
      <div class="hud-sub" id="h-sub"></div>
      <div class="hud-hint" id="h-hint"></div>
    </div>
    <div class="hud-btns">
      <button class="hbtn" data-action="quick" aria-label="Ajout rapide d’un article">＋<span>Ajout</span></button>
      <button class="hbtn" data-action="sheet" data-v="home" aria-label="Ouvrir le menu">☰<span>Menu</span></button>
    </div>
  </div>
  <div id="joy" aria-hidden="true"><div id="joy-knob"></div></div>
  <button id="act" hidden><span class="act-ico">✋</span><span id="act-lbl">Voir</span></button>
</div>
<div id="app"></div>
<dialog id="sheet"></dialog>
<dialog id="dlg"></dialog>
<div id="toast" popover="manual" role="status" aria-live="polite"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
{read('world.js')}
</script>
<script>
{read('app.js')}
</script>
"""
pathlib.Path(sys.argv[1]).write_text(html, encoding='utf-8')
print(f'{sys.argv[1]} : {len(html.encode("utf-8"))} octets')
