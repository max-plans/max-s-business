"""Modules Python nécessaires : on vérifie ce qui manque et on l'installe UN PAR UN.

Avant, `pip install -r requirements.txt` installait tout d'un coup : si un seul module échouait (par exemple
numba, absent pour certaines versions de Python), plus rien n'était installé et l'appli affichait
« No module named … ». Ici chaque module est installé séparément, et réessayé au lancement suivant.
"""
from __future__ import annotations

import importlib
import importlib.util
import subprocess
import sys

# nom à importer → paquet pip
PACKAGES = {
    "fastapi": "fastapi>=0.110",
    "uvicorn": "uvicorn>=0.29",
    "edge_tts": "edge-tts>=7.2",
    "piper": "piper-tts>=1.3",
    "numpy": "numpy>=1.26",
    "PIL": "pillow>=10.0",
    "requests": "requests>=2.31",
    "cv2": "opencv-python-headless>=4.8",
    "scipy": "scipy>=1.11",
    "numba": "numba>=0.60",
}


def missing() -> list[str]:
    return [m for m in PACKAGES if importlib.util.find_spec(m) is None]


def install(mod: str) -> bool:
    """Installe le paquet du module `mod` ; renvoie True s'il est importable ensuite."""
    if importlib.util.find_spec(mod) is not None:
        return True
    pkg = PACKAGES.get(mod, mod)
    print(f"  Installation de {pkg.split('>')[0]}…", flush=True)
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", pkg], check=False)
    importlib.invalidate_caches()
    ok = importlib.util.find_spec(mod) is not None
    if not ok:
        print(f"  ! Impossible d'installer {pkg} (connexion Internet ? version de Python ?)", flush=True)
    return ok


def ensure(*mods: str) -> None:
    """À appeler avant d'utiliser un module : l'installe s'il manque, sinon message clair."""
    bad = [m for m in mods if not install(m)]
    if bad:
        names = ", ".join(PACKAGES.get(m, m).split(">")[0] for m in bad)
        raise RuntimeError(f"Module manquant : {names}. Vérifie ta connexion Internet puis relance l'appli "
                           f"(elle réessaiera de l'installer), ou tape : python -m pip install {names}")


def ensure_all() -> None:
    for m in missing():
        install(m)


if __name__ == "__main__":
    ensure_all()
