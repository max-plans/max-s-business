"""État des clés API (images et voix) : quota épuisé, clé invalide, images faites aujourd'hui.

Sert aux rappels affichés en haut de l'application et au choix automatique de la source d'images
(une source épuisée est sautée jusqu'à sa recharge).
"""
from __future__ import annotations

import datetime as dt
import json
import threading
import time

from .paths import DATA

FILE = DATA / "key_status.json"
_lock = threading.Lock()
NAMES = {"pollinations": "Pollinations", "cloudflare": "Cloudflare", "elevenlabs": "ElevenLabs"}


def _load() -> dict:
    try:
        return json.loads(FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def _save(data: dict) -> None:
    FILE.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")


def _today() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d")


def next_utc_midnight() -> float:
    now = dt.datetime.now(dt.timezone.utc)
    return (now + dt.timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0).timestamp()


def mark(provider: str, status: str, message: str = "", until: float | None = None, key: str = "") -> None:
    """status : ok | exhausted (quota épuisé) | invalid (clé refusée)."""
    with _lock:
        data = _load()
        st = data.setdefault(provider, {})
        if status == "ok" and st.get("status") == "ok":
            return
        st.update(status=status, message=message, until=until, since=time.time(), key=key[-6:] if key else st.get("key", ""))
        _save(data)


def used(provider: str, key: str = "") -> None:
    """Compte une image (ou une voix) réussie aujourd'hui, et remet la clé en état « ok »."""
    with _lock:
        data = _load()
        st = data.setdefault(provider, {})
        if st.get("day") != _today():
            st.update(day=_today(), count=0)
        st["count"] = st.get("count", 0) + 1
        st.update(status="ok", message="", until=None, key=key[-6:] if key else st.get("key", ""))
        _save(data)


def get(provider: str, key: str = "") -> dict:
    st = dict(_load().get(provider) or {})
    if key and st.get("key") and st["key"] != key[-6:]:
        return {"status": "ok", "count": 0}          # nouvelle clé : on repart de zéro
    if st.get("until") and time.time() > st["until"]:
        st.update(status="ok", until=None)          # recharge passée
    if st.get("day") != _today():
        st["count"] = 0
    return st


def blocked(provider: str, key: str = "") -> bool:
    return get(provider, key).get("status") in ("exhausted", "invalid")


def reset(provider: str) -> None:
    with _lock:
        data = _load()
        data.pop(provider, None)
        _save(data)
