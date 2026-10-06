"""Serveur web local (http://127.0.0.1:8765) — API + interface."""
from __future__ import annotations

import shutil
import subprocess
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import db, jobs, llm, settings
from .accounts import ACCOUNTS
from .paths import FONTS_DIR, MUSIC_DIR, VOICES_DIR, WEB_DIR

app = FastAPI(title="TikTok Content Agent")
app.mount("/static", StaticFiles(directory=WEB_DIR), name="static")

STATUSES = ["idee", "script", "en_cours", "terminee", "exportee", "erreur"]
EDITABLE = {"subject", "angle", "hook", "title", "description", "hashtags", "visual_idea", "pub_date",
            "post_time", "duration_target", "scenes"}


@app.on_event("startup")
def _startup() -> None:
    jobs.start_workers()


@app.get("/")
def index():
    return FileResponse(WEB_DIR / "index.html", headers={"Cache-Control": "no-store"})


# ------------------------------------------------------------------ environnement

_status_cache: dict = {"t": 0, "data": None}


def _reachable(host: str) -> bool:
    import requests
    try:
        requests.head(f"https://{host}/", timeout=5)
        return True
    except requests.RequestException:
        return False


@app.get("/api/status")
def status():
    if _status_cache["data"] and time.time() - _status_cache["t"] < 60:
        return _status_cache["data"]
    cfg = settings.load()
    claude_ok, claude_msg = llm.claude_available()
    ollama_ok = False
    try:
        import requests
        ollama_ok = requests.get(cfg["ollama_url"] + "/api/tags", timeout=2).ok
    except Exception:  # noqa: BLE001
        pass
    try:
        import piper  # noqa: F401
        piper_ok = True
    except ImportError:
        piper_ok = False
    data = {
        "ffmpeg": bool(shutil.which("ffmpeg")),
        "claude_code": {"ok": claude_ok, "info": claude_msg},
        "ollama": ollama_ok,
        "edge_tts": _reachable("speech.platform.bing.com"),
        "piper": piper_ok,
        "piper_voices": sorted(p.stem for p in VOICES_DIR.glob("*.onnx")),
        "pollinations": _reachable("image.pollinations.ai"),
        "fonts": sorted(p.name for p in FONTS_DIR.glob("*.ttf")),
        "music": {a: len([p for p in (MUSIC_DIR / a).glob("*") if p.suffix.lower() in {".mp3", ".wav", ".m4a", ".ogg"}]) for a in ACCOUNTS},
        "paid_services": [],
    }
    _status_cache.update(t=time.time(), data=data)
    return data


# ------------------------------------------------------------------ comptes

@app.get("/api/accounts")
def accounts():
    rows = db.query("SELECT account, status, COUNT(*) AS n FROM videos GROUP BY account, status")
    out = []
    for a in ACCOUNTS.values():
        counts = {s: 0 for s in STATUSES}
        for r in rows:
            if r["account"] == a["id"]:
                counts[r["status"]] = r["n"]
        out.append({k: a[k] for k in ("id", "label", "short", "emoji", "color", "theme")} | {"counts": counts})
    return out


# ------------------------------------------------------------------ plans

class PlanIn(BaseModel):
    account: str
    days: int = Field(ge=1, le=365)
    per_day: int = Field(ge=1, le=10)
    duration: int = Field(ge=20, le=600)
    start_date: str | None = None
    with_scripts: bool = True


@app.post("/api/plans")
def create_plan(p: PlanIn):
    if p.account not in ACCOUNTS:
        raise HTTPException(404, "Compte inconnu")
    from .planner import create_plan as _create
    plan_id = _create(p.account, p.days, p.per_day, p.duration, p.start_date)
    job_id = jobs.enqueue("plan", account=p.account, plan_id=plan_id, params={"with_scripts": p.with_scripts})
    return {"plan_id": plan_id, "job_id": job_id, "total": p.days * p.per_day}


@app.get("/api/plans")
def list_plans(account: str | None = None):
    if account:
        return db.query("SELECT * FROM plans WHERE account=? ORDER BY id DESC", (account,))
    return db.query("SELECT * FROM plans ORDER BY id DESC")


@app.delete("/api/plans/{plan_id}")
def delete_plan(plan_id: int):
    for v in db.query("SELECT id FROM videos WHERE plan_id=? AND status NOT IN ('terminee','exportee','en_cours')", (plan_id,)):
        db.delete("videos", v["id"])
    db.delete("plans", plan_id)
    return {"ok": True}


# ------------------------------------------------------------------ vidéos

@app.get("/api/videos")
def list_videos(account: str | None = None, status: str | None = None, plan_id: int | None = None):
    sql, args = "SELECT * FROM videos WHERE 1=1", []
    if account:
        sql += " AND account=?"
        args.append(account)
    if status:
        sql += f" AND status IN ({','.join('?' * len(status.split(',')))})"
        args += status.split(",")
    if plan_id:
        sql += " AND plan_id=?"
        args.append(plan_id)
    return db.query(sql + " ORDER BY pub_date, slot, id", tuple(args))


def _get(video_id: int) -> dict:
    v = db.get_video(video_id)
    if not v:
        raise HTTPException(404, "Vidéo introuvable")
    return v


@app.get("/api/videos/{video_id}")
def get_video(video_id: int):
    return _get(video_id)


@app.put("/api/videos/{video_id}")
def edit_video(video_id: int, data: dict):
    v = _get(video_id)
    upd = {k: v2 for k, v2 in data.items() if k in EDITABLE}
    if "scenes" in upd:
        from .planner import save_script
        save_script(v, upd.pop("scenes"))
    db.update("videos", video_id, upd)
    return db.get_video(video_id)


@app.delete("/api/videos/{video_id}")
def delete_video(video_id: int):
    v = _get(video_id)
    if v.get("video_path"):
        Path(v["video_path"]).unlink(missing_ok=True)
        Path(v["video_path"]).with_suffix(".txt").unlink(missing_ok=True)
    db.delete("videos", video_id)
    return {"ok": True}


class IdsIn(BaseModel):
    video_ids: list[int] = []
    account: str | None = None


@app.post("/api/scripts")
def make_scripts(p: IdsIn):
    ids = p.video_ids
    if not ids and p.account:
        ids = [v["id"] for v in db.query("SELECT id FROM videos WHERE account=? AND status IN ('idee','erreur') AND (scenes IS NULL OR scenes='[]') ORDER BY pub_date, slot", (p.account,))]
    if not ids:
        return {"job_id": None, "count": 0}
    acc = db.get_video(ids[0])["account"]
    return {"job_id": jobs.enqueue("scripts", account=acc, params={"video_ids": ids}), "count": len(ids)}


@app.post("/api/videos/{video_id}/render")
def render_video(video_id: int):
    v = _get(video_id)
    if v["status"] == "en_cours":
        raise HTTPException(409, "Cette vidéo est déjà en cours de création.")
    return {"job_id": jobs.enqueue("render", account=v["account"], video_id=video_id)}


@app.post("/api/render")
def render_many(p: IdsIn):
    out = []
    for vid in p.video_ids:
        v = db.get_video(vid)
        if v and v["status"] != "en_cours":
            out.append(jobs.enqueue("render", account=v["account"], video_id=vid))
    return {"job_ids": out}


@app.post("/api/videos/{video_id}/export")
def export(video_id: int):
    try:
        dest = jobs.export_video(video_id)
    except FileNotFoundError as e:
        raise HTTPException(400, str(e)) from e
    return {"path": str(dest)}


@app.post("/api/videos/{video_id}/status")
def set_status(video_id: int, data: dict):
    if data.get("status") not in STATUSES:
        raise HTTPException(400, "Statut invalide")
    _get(video_id)
    db.update("videos", video_id, {"status": data["status"]})
    return db.get_video(video_id)


@app.get("/media/{video_id}")
def media(video_id: int, download: int = 0):
    v = _get(video_id)
    if not v.get("video_path") or not Path(v["video_path"]).exists():
        raise HTTPException(404, "Pas encore de MP4")
    p = Path(v["video_path"])
    return FileResponse(p, media_type="video/mp4", filename=p.name if download else None)


@app.get("/media/{video_id}/poster")
def poster(video_id: int):
    """Vignette JPG (image à 1,5 s) générée à la demande et mise en cache à côté du MP4."""
    v = _get(video_id)
    if not v.get("video_path") or not Path(v["video_path"]).exists():
        raise HTTPException(404, "Pas encore de MP4")
    mp4 = Path(v["video_path"])
    jpg = mp4.with_suffix(".jpg")
    if not jpg.exists() or jpg.stat().st_mtime < mp4.stat().st_mtime:
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", "1.5", "-i", str(mp4), "-frames:v", "1",
                        "-vf", "scale=540:-2", "-q:v", "4", str(jpg)], check=False)
    if not jpg.exists():
        raise HTTPException(404, "Vignette indisponible")
    return FileResponse(jpg, media_type="image/jpeg")


# ------------------------------------------------------------------ tâches & paramètres

@app.get("/api/jobs")
def list_jobs(active: int = 0):
    if active:
        return db.query("SELECT * FROM jobs WHERE status IN ('queued','running') ORDER BY id")
    return db.query("SELECT * FROM jobs ORDER BY id DESC LIMIT 30")


@app.post("/api/jobs/{job_id}/cancel")
def cancel_job(job_id: int):
    job = db.one("SELECT * FROM jobs WHERE id=?", (job_id,))
    if job and job["status"] == "queued":
        db.update("jobs", job_id, {"status": "cancelled", "message": "Annulée"})
        if job.get("video_id"):
            v = db.get_video(job["video_id"])
            db.update("videos", v["id"], {"status": "script" if v["scenes"] else "idee", "progress": 0})
    return {"ok": True}


@app.get("/api/settings")
def get_settings():
    return settings.load() | {"export_dir_effective": str(jobs.export_dir())}


@app.put("/api/settings")
def put_settings(data: dict):
    _status_cache["t"] = 0
    return settings.save(data)
