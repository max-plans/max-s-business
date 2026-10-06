"""Mise à jour automatique depuis GitHub (gratuit, sans compte).

    python -m content_agent.updater      → installe la dernière version si besoin

Ne touche jamais à tes données : le dossier data/ (vidéos, base, réglages), exports/
et tes musiques sont conservés. Lancer.bat n'est pas remplacé pendant qu'il tourne.
"""
from __future__ import annotations

import io
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

import requests

from .paths import ROOT

REPO = "max-plans/max-s-business"
BRANCH = "claude/tiktok-video-generator-kod0d7"
VERSION_FILE = ROOT / ".version"
SKIP = {"data", "exports", ".git", ".version", "Lancer.bat"}


def current_version() -> str:
    return VERSION_FILE.read_text().strip() if VERSION_FILE.exists() else ""


def latest_version() -> str:
    r = requests.get(
        f"https://api.github.com/repos/{REPO}/commits/{BRANCH}",
        headers={"Accept": "application/vnd.github.sha"}, timeout=15,
    )
    r.raise_for_status()
    return r.text.strip()


def check() -> dict:
    cur = current_version()
    try:
        latest = latest_version()
    except requests.RequestException as e:
        return {"current": cur[:7], "latest": None, "available": False, "error": str(e)}
    return {"current": cur[:7] or "inconnue", "latest": latest[:7], "available": latest != cur}


def update() -> dict:
    info = check()
    if info.get("error"):
        return {"updated": False, "message": "Impossible de vérifier les mises à jour (pas d'Internet ?)."}
    if not info["available"]:
        return {"updated": False, "message": "L'application est déjà à jour."}
    latest = latest_version()
    r = requests.get(f"https://codeload.github.com/{REPO}/zip/{latest}", timeout=120)
    r.raise_for_status()
    old_req = (ROOT / "requirements.txt").read_text() if (ROOT / "requirements.txt").exists() else ""
    with zipfile.ZipFile(io.BytesIO(r.content)) as z:
        top = z.namelist()[0].split("/")[0] + "/"
        for name in z.namelist():
            rel = name[len(top):]
            if not rel or rel.split("/")[0] in SKIP:
                continue
            dest = ROOT / rel
            if name.endswith("/"):
                dest.mkdir(parents=True, exist_ok=True)
                continue
            dest.parent.mkdir(parents=True, exist_ok=True)
            with z.open(name) as src, open(dest, "wb") as out:
                shutil.copyfileobj(src, out)
    if (ROOT / "requirements.txt").read_text() != old_req:
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-r", str(ROOT / "requirements.txt")], check=False)
    VERSION_FILE.write_text(latest)
    return {"updated": True, "message": f"Mise à jour installée (version {latest[:7]})."}


if __name__ == "__main__":
    try:
        print("  " + update()["message"])
    except Exception as e:  # noqa: BLE001 — une mise à jour ratée ne doit jamais empêcher de lancer l'appli
        print(f"  Mise à jour ignorée : {e}")
