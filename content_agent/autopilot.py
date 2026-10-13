"""Pilote automatique : l'application crée toute seule ses vidéos satisfaisantes.

Tant que l'application est ouverte, toutes les 5 minutes : s'il manque des vidéos pour atteindre
l'objectif du jour (N vidéos par jour), elle lance leur création (concept au hasard, jamais deux fois
la même vidéo grâce à l'historique de satisfying.py). 100 % local : aucune API, aucun crédit.
"""
from __future__ import annotations

import datetime as dt
import threading
import time
import traceback

from . import db, jobs, settings

DEFAULT = {"enabled": False, "per_day": 3, "seconds": 45, "logo": ""}
INTERVAL = 300
_wake = threading.Event()
_last = {"msg": ""}


def config() -> dict:
    return {**DEFAULT, **(settings.load().get("sat_autopilot") or {})}


def made_today() -> int:
    d = jobs.export_dir() / "satisfaisant"
    if not d.exists():
        return 0
    day0 = dt.datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).timestamp()
    return sum(1 for f in d.glob("*.mp4") if not f.stem.endswith("_mail") and f.stat().st_mtime >= day0)


def tick() -> str:
    c = config()
    if not c["enabled"]:
        return "désactivé"
    if db.query("SELECT id FROM jobs WHERE kind='satisfying' AND status IN ('queued','running')"):
        msg = "création en cours"
    else:
        missing = int(c["per_day"]) - made_today()
        if missing > 0:
            jobs.enqueue("satisfying", account="satisfaisant",
                         params={"concept": "aleatoire", "seconds": int(c["seconds"]), "count": missing,
                                 "logo": c.get("logo", "")})
            msg = f"{missing} vidéo(s) lancée(s)"
        else:
            msg = "objectif du jour atteint"
    _last["msg"] = f"{dt.datetime.now():%H:%M} — {msg}"
    return msg


def status() -> dict:
    return {**config(), "today": made_today(), "last": _last["msg"]}


def wake() -> None:
    _wake.set()


def _loop() -> None:
    time.sleep(10)
    while True:
        try:
            tick()
        except Exception:  # noqa: BLE001
            traceback.print_exc()
        _wake.wait(INTERVAL)
        _wake.clear()


def start() -> None:
    threading.Thread(target=_loop, name="autopilot", daemon=True).start()
