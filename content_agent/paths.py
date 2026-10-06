"""Emplacements des fichiers de l'application."""
from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = Path(os.environ.get("CONTENT_AGENT_DATA", ROOT / "data"))
DB_PATH = DATA / "agent.db"
SETTINGS_PATH = DATA / "settings.json"
VIDEOS_DIR = DATA / "videos"
WORK_DIR = DATA / "work"
CACHE_DIR = DATA / "cache"
VOICES_DIR = DATA / "voices"
ASSETS = ROOT / "assets"
MUSIC_DIR = ASSETS / "music"
FONTS_DIR = ASSETS / "fonts"
WEB_DIR = Path(__file__).resolve().parent / "web"

for d in (DATA, VIDEOS_DIR, WORK_DIR, CACHE_DIR, VOICES_DIR):
    d.mkdir(parents=True, exist_ok=True)
