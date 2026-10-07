"""Pilote automatique : l'application prépare et monte les vidéos toute seule.

Pour chaque compte activé, tant que l'application est ouverte, toutes les 5 minutes :
1. s'il manque des vidéos pour les N prochains jours → crée les idées + scripts (avec recherche web) ;
2. les idées restées sans script → les fait écrire ;
3. les scripts prêts → lance le montage (au plus 2 vidéos en file par compte à la fois).
Les vidéos en erreur ne sont pas relancées en boucle (elles restent visibles pour toi).
"""
from __future__ import annotations

import datetime as dt
import threading
import time
import traceback

from . import db, jobs, planner, settings

DEFAULT = {"enabled": False, "per_day": 1, "days_ahead": 3, "duration": 60}
INTERVAL = 300
MAX_RENDER_QUEUE = 2
_wake = threading.Event()
_last_run: dict[str, str] = {}


def config(account: str) -> dict:
    return {**DEFAULT, **((settings.load().get("autopilot") or {}).get(account) or {})}


def _active(account: str, kinds: tuple[str, ...]) -> bool:
    marks = ",".join("?" * len(kinds))
    return bool(db.query(f"SELECT id FROM jobs WHERE account=? AND kind IN ({marks}) AND status IN ('queued','running')",
                         (account, *kinds)))


def tick_account(account: str) -> str:
    c = config(account)
    if not c["enabled"]:
        return "désactivé"
    today = dt.date.today()
    horizon = today + dt.timedelta(days=int(c["days_ahead"]))
    window = db.query("SELECT * FROM videos WHERE account=? AND pub_date>=? AND pub_date<? ORDER BY pub_date, slot",
                      (account, today.isoformat(), horizon.isoformat()))
    actions = []

    # 1. compléter le calendrier
    if not _active(account, ("plan", "scripts")):
        last = db.one("SELECT MAX(pub_date) AS d FROM videos WHERE account=? AND pub_date>=?", (account, today.isoformat()))
        start = dt.date.fromisoformat(last["d"]) + dt.timedelta(days=1) if last and last["d"] else today
        days = (horizon - start).days
        if days > 0:
            plan_id = planner.create_plan(account, days, int(c["per_day"]), int(c["duration"]), start.isoformat())
            jobs.enqueue("plan", account=account, plan_id=plan_id, params={"with_scripts": True})
            actions.append(f"{days * int(c['per_day'])} idées en préparation")
        else:
            # 2. idées restées sans script (ex. après une erreur passagère)
            ideas = [v["id"] for v in window if v["status"] == "idee"]
            if ideas:
                jobs.enqueue("scripts", account=account, params={"video_ids": ideas})
                actions.append(f"{len(ideas)} scripts en écriture")

    # 3. monter les vidéos dont le script est prêt
    making = sum(1 for v in window if v["status"] == "en_cours")
    for v in [v for v in window if v["status"] == "script"][: max(0, MAX_RENDER_QUEUE - making)]:
        jobs.enqueue("render", account=account, video_id=v["id"])
        actions.append(f"montage de « {v['title'][:40]} »")

    msg = ", ".join(actions) if actions else "tout est prêt"
    _last_run[account] = f"{dt.datetime.now():%H:%M} — {msg}"
    return msg


def status() -> dict:
    return {a: {**config(a), "last": _last_run.get(a, "")} for a in ("argent", "stoicisme", "reflexion")}


def wake() -> None:
    _wake.set()


def _loop() -> None:
    time.sleep(10)
    while True:
        for account in ("argent", "stoicisme", "reflexion"):
            try:
                tick_account(account)
            except Exception:  # noqa: BLE001
                traceback.print_exc()
        _wake.wait(INTERVAL)
        _wake.clear()


def start() -> None:
    threading.Thread(target=_loop, name="autopilot", daemon=True).start()
