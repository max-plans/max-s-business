"""File de tâches en arrière-plan : écriture (Claude/Ollama) et rendu vidéo (ffmpeg)."""
from __future__ import annotations

import queue
import shutil
import threading
import traceback
from pathlib import Path

from . import db, planner, settings
from .paths import ROOT

_queues = {"text": queue.Queue(), "render": queue.Queue()}
KIND_QUEUE = {"plan": "text", "scripts": "text", "render": "render"}
_started = False


def enqueue(kind: str, **fields) -> int:
    params = fields.pop("params", {})
    job_id = db.insert("jobs", {"kind": kind, "status": "queued", "progress": 0, "message": "En attente...",
                                "params": params, **fields})
    if kind == "render" and fields.get("video_id"):
        db.update("videos", fields["video_id"], {"status": "en_cours", "progress": 0, "error": None})
    _queues[KIND_QUEUE[kind]].put(job_id)
    return job_id


def start_workers() -> None:
    global _started
    if _started:
        return
    _started = True
    db.reset_interrupted()
    for name, q in _queues.items():
        threading.Thread(target=_worker, args=(q,), name=f"worker-{name}", daemon=True).start()


def _worker(q: queue.Queue) -> None:
    while True:
        job_id = q.get()
        job = db.one("SELECT * FROM jobs WHERE id=?", (job_id,))
        if not job or job["status"] == "cancelled":
            continue
        db.update("jobs", job_id, {"status": "running", "message": "Démarrage..."})
        try:
            msg = HANDLERS[job["kind"]](job, _progress_fn(job))
            db.update("jobs", job_id, {"status": "done", "progress": 100, "message": msg})
            if job["kind"] in ("plan", "scripts"):
                from . import autopilot
                autopilot.wake()   # le pilote lance le montage tout de suite, sans attendre 5 min
        except Exception as e:  # noqa: BLE001
            traceback.print_exc()
            db.update("jobs", job_id, {"status": "error", "message": str(e)[:800]})
            if job.get("video_id"):
                v = db.get_video(job["video_id"])
                if v and v["status"] == "en_cours":
                    db.update("videos", v["id"], {"status": "erreur", "error": str(e)[:800], "progress": 0})


def _progress_fn(job: dict):
    def progress(pct: int, message: str) -> None:
        db.update("jobs", job["id"], {"progress": int(pct), "message": message})
        if job.get("video_id"):
            db.update("videos", job["video_id"], {"progress": int(pct)})
    return progress


# ------------------------------------------------------------------ handlers

def _plan(job: dict, progress) -> str:
    n = planner.generate_plan_ideas(job["plan_id"], progress)
    if (job.get("params") or {}).get("with_scripts"):
        ids = [v["id"] for v in db.query("SELECT id FROM videos WHERE plan_id=? AND status='idee' ORDER BY pub_date, slot", (job["plan_id"],))]
        if ids:
            enqueue("scripts", account=job["account"], plan_id=job["plan_id"], params={"video_ids": ids})
            return f"{n} idées créées — scripts en file d'attente"
    return f"{n} idées créées"


def _scripts(job: dict, progress) -> str:
    ids = (job.get("params") or {}).get("video_ids", [])
    n = planner.generate_scripts(ids, progress)
    return f"{n} scripts écrits"


def _render(job: dict, progress) -> str:
    from .video.render import render

    video = db.get_video(job["video_id"])
    if not video:
        return "Vidéo supprimée"
    if not video["scenes"]:
        progress(2, "Écriture du script...")
        planner.generate_scripts([video["id"]], lambda p, m: None)
        video = db.get_video(video["id"])
        if not video["scenes"]:
            raise RuntimeError("Impossible d'écrire le script.")
    db.update("videos", video["id"], {"status": "en_cours"})
    res = render(video, progress)
    db.update("videos", video["id"], {
        "status": "terminee", "video_path": str(res["path"]), "caption": res["caption"],
        "duration_real": res["duration"], "notes": " · ".join(res["notes"]), "progress": 100, "error": None,
    })
    return f"MP4 prêt ({res['duration']} s)"


HANDLERS = {"plan": _plan, "scripts": _scripts, "render": _render}


# ------------------------------------------------------------------ export

def export_dir() -> Path:
    custom = settings.load().get("export_dir")
    return Path(custom).expanduser() if custom else ROOT / "exports"


def export_video(video_id: int) -> Path:
    v = db.get_video(video_id)
    if not v or not v.get("video_path") or not Path(v["video_path"]).exists():
        raise FileNotFoundError("Aucun MP4 à exporter pour cette vidéo.")
    dest_dir = export_dir() / v["account"] / (v.get("pub_date") or "sans-date")
    dest_dir.mkdir(parents=True, exist_ok=True)
    src = Path(v["video_path"])
    dest = dest_dir / src.name
    shutil.copy2(src, dest)
    (dest.with_suffix(".txt")).write_text(
        f"À publier le {v.get('pub_date')} vers {v.get('post_time')}\n\nTITRE : {v.get('title')}\n\n{v.get('caption') or ''}\n",
        encoding="utf-8",
    )
    db.update("videos", video_id, {"status": "exportee", "exported_at": db.now()})
    return dest
