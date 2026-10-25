#!/usr/bin/env python3
"""Assemble les sources en UN fichier HTML pour une publication Artifact Claude.

Usage : python3 tools/build-artifact.py <fichier-de-sortie.html>
L'Artifact ajoute lui-même doctype/head/body : on n'écrit que le contenu.
La bibliothèque Supabase et config.js ne sont pas inclus (le stockage passe par la capability "db").
"""
import pathlib
import sys

root = pathlib.Path(__file__).resolve().parent.parent
read = lambda name: (root / name).read_text(encoding='utf-8')
for name in ('style.css', 'app.js', 'tycoon.js'):
    assert '</script' not in read(name) and '</style' not in read(name), f'{name} contient une balise de fermeture'

html = f"""<title>Vinted Quest</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
{read('style.css')}
</style>
<div id="app"></div>
<dialog id="dlg"></dialog>
<div id="toast" role="status" aria-live="polite"></div>
<script>
{read('tycoon.js')}
</script>
<script>
{read('app.js')}
</script>
"""
pathlib.Path(sys.argv[1]).write_text(html, encoding='utf-8')
print(f'{sys.argv[1]} : {len(html.encode("utf-8"))} octets')
