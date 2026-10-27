#!/usr/bin/env python3
"""Assemble Fripe : page.html (Artifact Claude, tout inline) et site/ (fichiers statiques pour Vercel)."""
import os, re
R = os.path.dirname(os.path.abspath(__file__)); S = lambda f: open(f'{R}/src/{f}', encoding='utf-8').read()
head, css, body, libs, app, imp, scn = S('head.html'), S('style.css'), S('body.html'), S('libs.txt'), S('app.js'), S('import.js'), S('scene.js')
open(f'{R}/page.html', 'w', encoding='utf-8').write(f'{head}<style>\n{css}</style>\n\n{body}\n{libs}<script>\n{scn}</script>\n<script>\n{app}</script>\n<script>\n{imp}</script>\n')
os.makedirs(f'{R}/site', exist_ok=True)
site_head = head.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
title = re.search(r'<title>.*?</title>', site_head).group(0)
rest = site_head.replace(title, '')
doc = ('<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
       '<meta name="theme-color" content="#060812">\n<meta name="description" content="Fripe : le poste de pilotage des revendeurs Vinted. Chiffre d\'affaires, stock, commandes, livraisons et messages.">\n'
       f'{title}\n{rest}<link rel="stylesheet" href="style.css">\n</head>\n<body>\n{body}\n{libs}<script src="scene.js"></script>\n<script src="app.js"></script>\n<script src="import.js"></script>\n</body>\n</html>\n')
open(f'{R}/site/index.html', 'w', encoding='utf-8').write(doc)
for f, t in (('style.css', css), ('scene.js', scn), ('app.js', app), ('import.js', imp)): open(f'{R}/site/{f}', 'w', encoding='utf-8').write(t)
print('ok', len(open(f'{R}/page.html').read()))
