"""Recherche et téléchargement de vidéos d'illustration libres de droits (Pexels)."""
from __future__ import annotations

import os
import random
from pathlib import Path

import requests

from .config import CACHE_DIR

PEXELS_URL = "https://api.pexels.com/videos/search"


class FootagePicker:
    """Choisit des plans différents pour chaque passage d'une même vidéo."""

    def __init__(self, fallback_queries: list[str]):
        self.key = os.environ.get("PEXELS_API_KEY")
        self.fallback_queries = fallback_queries
        self.used: set[int] = set()
        self.cache_dir = CACHE_DIR / "footage"
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    @property
    def enabled(self) -> bool:
        return bool(self.key)

    def pick(self, query: str, min_duration: float) -> Path | None:
        if not self.key:
            return None
        for q in [query, *random.sample(self.fallback_queries, len(self.fallback_queries))]:
            try:
                clip = self._search(q, min_duration)
            except requests.RequestException as e:
                print(f"  ! Pexels indisponible pour « {q} » : {e}")
                continue
            if clip:
                return clip
        return None

    def _search(self, query: str, min_duration: float) -> Path | None:
        r = requests.get(
            PEXELS_URL,
            headers={"Authorization": self.key},
            params={"query": query, "orientation": "portrait", "size": "medium", "per_page": 20},
            timeout=30,
        )
        r.raise_for_status()
        videos = [
            v for v in r.json().get("videos", [])
            if v["id"] not in self.used and v.get("duration", 0) >= min_duration
        ]
        random.shuffle(videos)
        for v in videos[:5]:
            f = _best_file(v.get("video_files", []))
            if not f:
                continue
            self.used.add(v["id"])
            return self._download(v["id"], f["link"])
        return None

    def _download(self, vid: int, url: str) -> Path:
        path = self.cache_dir / f"{vid}.mp4"
        if path.exists() and path.stat().st_size > 0:
            return path
        tmp = path.with_suffix(".part")
        with requests.get(url, stream=True, timeout=120) as r:
            r.raise_for_status()
            with tmp.open("wb") as f:
                for chunk in r.iter_content(1 << 20):
                    f.write(chunk)
        tmp.rename(path)
        return path


def _best_file(files: list[dict]) -> dict | None:
    """Fichier vertical le plus proche de 1080x1920, sans télécharger de la 4K inutile."""
    portrait = [f for f in files if f.get("width") and f.get("height") and f["height"] > f["width"]]
    if not portrait:
        return None
    good = [f for f in portrait if f["width"] >= 720]
    pool = good or portrait
    return min(pool, key=lambda f: abs(f["width"] - 1080))
