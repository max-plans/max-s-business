#!/usr/bin/env python3
"""Assemble Fripe : page.html (Artifact Claude, tout inline) et site/ (fichiers statiques pour Vercel)."""
import os, re
R = os.path.dirname(os.path.abspath(__file__)); S = lambda f: open(f'{R}/src/{f}', encoding='utf-8').read()
head, css, body, libs, app, imp, scn, acss, lnd, syn, acc, con = S('head.html'), S('style.css'), S('body.html'), S('libs.txt'), S('app.js'), S('import.js'), S('scene.js'), S('app.css'), S('landing.js'), S('sync.js'), S('account.js'), S('connect.js')
# le site en ligne a des comptes (Supabase Auth) ; la version Claude garde ses données dans Claude et le jumelage par clé
SB_LIB = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.109.0/dist/umd/supabase.js"></script>\n'
open(f'{R}/page.html', 'w', encoding='utf-8').write(f'{head}<style>\n{css}\n{acss}</style>\n\n{body}\n{libs}<script>\n{scn}</script>\n<script>\n{lnd}</script>\n<script>\n{syn}</script>\n<script>\n{app}</script>\n<script>\n{imp}</script>\n')
os.makedirs(f'{R}/site', exist_ok=True)
site_head = head.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
title = re.search(r'<title>.*?</title>', site_head).group(0)
rest = site_head.replace(title, '')
doc = ('<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
       '<meta name="theme-color" content="#060607">\n<link rel="apple-touch-icon" href="apple-touch-icon.png">\n<meta name="apple-mobile-web-app-title" content="Fripe">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<link rel="manifest" href="manifest.webmanifest">\n<meta name="description" content="Fripe : le poste de pilotage des revendeurs Vinted. Chiffre d\'affaires, stock, commandes, livraisons et messages.">\n'
       f'{title}\n{rest}<link rel="stylesheet" href="style.css">\n<link rel="stylesheet" href="app.css">\n</head>\n<body>\n{body}\n{libs}{SB_LIB}<script src="scene.js"></script>\n<script src="landing.js"></script>\n<script src="account.js"></script>\n<script src="app.js"></script>\n<script src="connect.js"></script>\n<script src="import.js"></script>\n</body>\n</html>\n')
open(f'{R}/site/index.html', 'w', encoding='utf-8').write(doc)
for f, t in (('style.css', css), ('app.css', acss), ('scene.js', scn), ('app.js', app), ('import.js', imp), ('landing.js', lnd), ('account.js', acc), ('connect.js', con)): open(f'{R}/site/{f}', 'w', encoding='utf-8').write(t)
import shutil; shutil.copy(f'{R}/src/apple-touch-icon.png', f'{R}/site/apple-touch-icon.png'); shutil.copy(f'{R}/src/legal.html', f'{R}/site/legal.html')
open(f'{R}/site/manifest.webmanifest', 'w', encoding='utf-8').write('{"name":"Fripe","short_name":"Fripe","start_url":"/#tableau","display":"standalone","background_color":"#060607","theme_color":"#060607","icons":[{"src":"apple-touch-icon.png","sizes":"180x180","type":"image/png"}]}\n')
# extension Fripe Connect : archive à télécharger depuis Réglages (dossier fripe-connect/ dedans)
import zipfile
with zipfile.ZipFile(f'{R}/site/fripe-connect.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for dp, _, fs in sorted(os.walk(f'{R}/extension')):
        for f in sorted(fs):
            src = os.path.join(dp, f); info = zipfile.ZipInfo('fripe-connect/' + os.path.relpath(src, f'{R}/extension').replace(os.sep, '/'), (2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED; info.external_attr = 0o644 << 16
            z.writestr(info, open(src, 'rb').read())
print('ok', len(open(f'{R}/page.html').read()))
