#!/usr/bin/env bash
# Régénère tous les fichiers du projet Tralalune à partir des sources (_outils/*.py).
# Prérequis : Python 3 (numpy, Pillow, openpyxl), Node.js + Playwright (Chromium), ffmpeg.
set -e
cd "$(dirname "$0")/.."
python3 _outils/generer_visuels.py            # logo, profil, bannière, personnages, miniatures
python3 _outils/generer_fiches_personnages.py # fiches texte + prompts maîtres + bible
python3 _outils/generer_contenus.py           # fiches vidéo, paroles, musiques, storyboards, prompts, SEO
python3 _outils/animatique.py                 # 10 animatiques MP4
python3 _outils/generer_charte_pdf.py         # charte graphique PDF
echo "⚠️  Le tableau de bord n'est PAS régénéré automatiquement (il contient vos données)."
echo "    Pour un fichier vierge : python3 _outils/generer_planning_et_tableau.py"
