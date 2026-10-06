"""Polices des sous-titres (Google Fonts, licence OFL, gratuites), téléchargées au premier usage."""
from __future__ import annotations

import subprocess

import requests

from ..paths import FONTS_DIR

_GF = "https://raw.githubusercontent.com/google/fonts/main/ofl"

# clé -> (nom de famille interne, URL, nom de fichier)
FONTS = {
    "anton": ("Anton", f"{_GF}/anton/Anton-Regular.ttf", "Anton-Regular.ttf"),
    "poppins": ("Poppins ExtraBold", f"{_GF}/poppins/Poppins-ExtraBold.ttf", "Poppins-ExtraBold.ttf"),
    "cinzel": ("Cinzel", f"{_GF}/cinzel/Cinzel%5Bwght%5D.ttf", "Cinzel-Variable.ttf"),
}
FALLBACKS = ["Inter Black", "Inter ExtraBold", "Arial Black", "DejaVu Sans"]


def font_file(key: str):
    family, url, filename = FONTS.get(key, FONTS["anton"])
    path = FONTS_DIR / filename
    if not path.exists():
        try:
            r = requests.get(url, timeout=30)
            r.raise_for_status()
            FONTS_DIR.mkdir(parents=True, exist_ok=True)
            path.write_bytes(r.content)
        except requests.RequestException:
            return None
    return path


def resolve_font(key: str) -> str:
    """Nom de famille à utiliser dans le fichier .ass."""
    family = FONTS.get(key, FONTS["anton"])[0]
    if font_file(key):
        return family
    try:
        installed = subprocess.run(["fc-list", ":", "family"], capture_output=True, text=True).stdout
    except FileNotFoundError:
        installed = ""
    for fam in FALLBACKS:
        if fam in installed:
            return fam
    return "Arial"
