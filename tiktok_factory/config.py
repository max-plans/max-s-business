"""Chargement de la configuration des comptes (channels/*.yaml)."""
from __future__ import annotations

from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
CHANNELS_DIR = ROOT / "channels"
ASSETS_DIR = ROOT / "assets"
DATA_DIR = ROOT / "data"
OUTPUT_DIR = ROOT / "output"
CACHE_DIR = ROOT / ".cache"

WIDTH, HEIGHT, FPS = 1080, 1920, 30


def list_channels() -> list[str]:
    return sorted(p.stem for p in CHANNELS_DIR.glob("*.yaml"))


def load_channel(channel_id: str) -> dict:
    path = CHANNELS_DIR / f"{channel_id}.yaml"
    if not path.exists():
        raise SystemExit(f"Compte inconnu : {channel_id} (disponibles : {', '.join(list_channels())})")
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f)
