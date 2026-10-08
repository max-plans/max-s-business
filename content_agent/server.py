"""Serveur web local (http://127.0.0.1:8765) — API + interface."""
from __future__ import annotations

import shutil
import subprocess
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
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
    from . import autopilot
    jobs.start_workers()
    autopilot.start()


@app.middleware("http")
async def _no_cache_static(request, call_next):
    # Évite que le navigateur garde une ancienne version de l'interface après une mise à jour.
    response = await call_next(request)
    if request.url.path.startswith("/static/"):
        response.headers["Cache-Control"] = "no-cache"
    return response


@app.get("/")
def index():
    html = (WEB_DIR / "index.html").read_text(encoding="utf-8")
    version = int(max(f.stat().st_mtime for f in WEB_DIR.glob("*.*")))
    for name in ("style.css", "app.js"):
        html = html.replace(f"/static/{name}", f"/static/{name}?v={version}")
    return HTMLResponse(html, headers={"Cache-Control": "no-store"})


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
    _eleven_alert_cache["data"] = None
    _alerts_cache["data"] = None
    return settings.save(data)


# ------------------------------------------------------------------ mises à jour

@app.get("/api/version")
def version():
    from . import updater
    return updater.check()


@app.post("/api/update")
def do_update():
    """Installe la dernière version puis redémarre (Lancer.bat relance l'appli sur le code 42)."""
    import os
    import threading

    from . import updater
    try:
        res = updater.update()
    except Exception as e:  # noqa: BLE001
        raise HTTPException(500, f"Échec de la mise à jour : {e}") from e
    if res["updated"]:
        threading.Timer(1.5, os._exit, args=(42,)).start()
    return res


# ------------------------------------------------------------------ aperçus (voix / image)

PREVIEW_DIR = Path(settings.SETTINGS_PATH).parent / "cache" / "previews"
# Petit passage de 3 phrases avec 3 tons différents : on entend l'expressivité, pas juste la voix.
SAMPLE_LINES = {
    "argent": [("accroche", "Le panda a acheté dix immeubles sans jamais sortir un euro.", ["panda", "dix"]),
               ("suspense", "Mais attends… le plus fou arrive maintenant.", ["plus"]),
               ("energique", "Et la méthode est parfaitement légale !", ["légale"])],
    "stoicisme": [("accroche", "Il y a deux mille ans, un empereur a écrit une phrase.", ["empereur"]),
                  ("grave", "Une phrase qui pourrait changer toute ta journée.", ["changer"]),
                  ("chute", "Et elle tient en une seule ligne.", ["seule"])],
    "reflexion": [("accroche", "Un jour, tu te réveilleras.", ["réveilleras"]),
                  ("suspense", "Et tu réaliseras que les années sont passées…", ["années"]),
                  ("chute", "Sans toi.", ["toi"])],
}
SAMPLE_TEXT = {k: " ".join(t for _, t, _ in v) for k, v in SAMPLE_LINES.items()}


def _speak_sample(account: str, voice: dict, engine: str, out: Path) -> str:
    """Lit les 3 phrases d'essai avec la même chaîne que les vraies vidéos ; renvoie le moteur réellement utilisé."""
    from .video.delivery import TONE_PAUSE
    from .video.media import run
    from .video.tts import synthesize, synthesize_script
    parts, used = [], engine
    if settings.load().get("voice_continuous", True) and engine in ("edge", "elevenlabs"):
        scenes = [{"voice": text, "tone": tone, "emphasis": emph} for tone, text, emph in SAMPLE_LINES[account]]
        work = out.with_name(out.stem + "_c")
        work.mkdir(exist_ok=True)
        sp = synthesize_script(voice, scenes, work, engine)
        if sp:   # lecture continue, comme dans les vraies vidéos
            lst = out.with_suffix(".txt")
            lst.write_text("".join(f"file '{x.audio.resolve().as_posix()}'\n" for x in sp))
            run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(out)])
            return engine
    for i, (tone, text, emph) in enumerate(SAMPLE_LINES[account]):
        sp = synthesize(voice, text, out.with_name(f"{out.stem}_{i}"), engine=engine, tone=tone, emphasis=emph)
        if engine == "elevenlabs" and sp.engine != "elevenlabs":
            engine = used = sp.engine
        parts.append(sp.audio)
        gap = out.with_name(f"{out.stem}_{i}_gap.wav")
        run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", f"{TONE_PAUSE.get(tone, 0.12)}", str(gap)])
        parts.append(gap)
    lst = out.with_suffix(".txt")
    lst.write_text("".join(f"file '{x.resolve().as_posix()}'\n" for x in parts))
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(out)])
    return used


SAMPLE_SCENE = {
    "argent": "the panda proudly placing ten tiny skyscrapers in a row on a long table, holding a fountain pen",
    "stoicisme": "a marble statue of a roman emperor writing in a journal by candlelight",
    "reflexion": "a lone person standing on a cliff watching the sunrise over the clouds",
}


class PreviewIn(BaseModel):
    account: str
    voice: str | None = None
    style: str | None = None
    source: str | None = None


@app.get("/api/options")
def options():
    from .accounts import EDGE_VOICES, IMAGE_STYLES
    return {
        "voices": EDGE_VOICES,
        "image_styles": {k: v[0] for k, v in IMAGE_STYLES.items()},
        "defaults": {a["id"]: {"voice": a["voice"]["edge"], "image_style": a["image_style"]} for a in ACCOUNTS.values()},
    }


@app.post("/api/preview/voice")
def preview_voice(p: PreviewIn):
    import hashlib

    from .accounts import get_account
    acc = get_account(p.account)
    cfg = settings.load()
    voice = dict(acc["voice"])
    if p.voice:
        voice["edge"] = p.voice
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    name = "voice_" + hashlib.sha1(f"{p.account}{voice}{cfg['tts_engine']}v4".encode()).hexdigest()[:12]
    wav = PREVIEW_DIR / f"{name}.wav"
    engine = cfg.get("tts_engine", "edge")
    if not wav.exists():
        engine = _speak_sample(p.account, voice, engine, wav)
    return {"url": f"/preview/{wav.name}", "engine": engine}


@app.post("/api/preview/image")
def preview_image(p: PreviewIn):
    """Image d'essai. source = pollinations | cloudflare pour tester une clé précise (sinon : la première qui marche)."""
    from . import keystatus
    from .accounts import get_account, image_prompt
    from .video import visuals
    acc = get_account(p.account)
    cfg = settings.load()
    visuals._poll_down_until = 0  # un test manuel réessaie toujours
    prompt = image_prompt(acc, SAMPLE_SCENE[p.account], p.style or None)
    test_seed = int(time.time()) % 1_000_000   # graine neuve : le test appelle vraiment le service, pas le cache
    try:
        if p.source == "cloudflare":
            if not (cfg.get("cloudflare_account_id") and cfg.get("cloudflare_token")):
                raise HTTPException(400, "Renseigne d'abord l'Account ID et le jeton Cloudflare (puis clique en dehors du champ).")
            keystatus.reset("cloudflare")
            img, used = visuals.cloudflare(prompt, test_seed, cfg), "cloudflare"
        elif p.source == "horde":
            keystatus.reset("horde")
            img, used = visuals.horde(prompt, test_seed, cfg), "horde"
        elif p.source == "pollinations":
            keystatus.reset("pollinations")
            img, used = visuals.pollinations(prompt, test_seed, cfg.get("pollinations_token", "")), "pollinations"
        else:
            img = visuals.ai_image(prompt, test_seed, cfg)
            used = visuals.last_provider
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001 — on montre la vraie cause au lieu d'un « erreur interne »
        raise HTTPException(503, f"Erreur pendant le test : {type(e).__name__}: {str(e)[:300]}") from e
    _alerts_cache["data"] = None
    if not img:
        raise HTTPException(503, f"Image impossible : {visuals.last_error or 'service injoignable'}")
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    dest = PREVIEW_DIR / f"img_{img.stem}.jpg"
    if not dest.exists():
        shutil.copy(img, dest)
    return {"url": f"/preview/{dest.name}", "provider": keystatus.NAMES.get(used, used)}


@app.get("/api/characters")
def characters_list():
    from . import characters
    return characters.listing()


@app.get("/character/{key}.jpg")
def character_image(key: str):
    from . import characters
    path = characters.reference_path(characters.slug(key))
    if not path.exists():
        raise HTTPException(404, "Pas encore de fiche pour ce personnage")
    return FileResponse(path, headers={"Cache-Control": "no-cache"})


@app.post("/api/characters/{key}/regenerate")
def character_regenerate(key: str):
    """Refait la fiche de référence (le personnage garde sa description ; seule l'image de référence change)."""
    from . import characters
    from .accounts import get_account
    from .video import visuals
    visuals._poll_down_until = 0
    cfg = settings.load()
    acc = get_account("argent")
    path = characters.ensure_reference(characters.slug(key), acc, (cfg.get("image_styles") or {}).get("argent"),
                                       cfg, force=True)
    if not path:
        raise HTTPException(503, f"Image impossible : {visuals.last_error or 'service injoignable'}")
    return {"ok": True}


@app.get("/preview/{name}")
def preview_file(name: str):
    path = (PREVIEW_DIR / name).resolve()
    if path.parent != PREVIEW_DIR.resolve() or not path.exists():
        raise HTTPException(404, "Aperçu introuvable")
    return FileResponse(path)


# ------------------------------------------------------------------ ElevenLabs (option)

@app.get("/api/elevenlabs")
def elevenlabs_status():
    from .video import elevenlabs
    cfg = settings.load()
    key = cfg.get("elevenlabs_key")
    models = {k: v[0] for k, v in elevenlabs.MODELS.items()}
    if not key:
        return {"configured": False, "models": models}
    try:
        return {"configured": True, "models": models, "quota": elevenlabs.subscription(key), "voices": elevenlabs.voices(key)}
    except elevenlabs.ElevenError as e:
        return {"configured": True, "models": models, "error": str(e)}


# ------------------------------------------------------------------ pilote automatique

@app.get("/api/autopilot")
def autopilot_status():
    from . import autopilot
    return autopilot.status()


@app.put("/api/autopilot")
def autopilot_set(data: dict):
    from . import autopilot
    acc = data.get("account")
    if acc not in ACCOUNTS:
        raise HTTPException(404, "Compte inconnu")
    cur = autopilot.config(acc)
    for k in ("enabled", "per_day", "days_ahead", "duration"):
        if k in data:
            cur[k] = data[k] if k == "enabled" else int(data[k])
    settings.save({"autopilot": {acc: cur}})
    if cur["enabled"]:
        autopilot.tick_account(acc)   # démarre tout de suite
    return autopilot.status()


class ElevenPreviewIn(BaseModel):
    account: str
    voice: str


@app.post("/api/preview/eleven")
def preview_eleven(p: ElevenPreviewIn):
    """Fait lire 3 phrases (3 tons) par la voix ElevenLabs choisie. Mis en cache : crédits utilisés une seule fois."""
    import hashlib

    from .accounts import get_account
    from .video import elevenlabs
    cfg = settings.load()
    key = cfg.get("elevenlabs_key")
    if not key:
        raise HTTPException(400, "Ajoute d'abord ta clé ElevenLabs.")
    if p.account not in SAMPLE_LINES:
        raise HTTPException(404, "Compte inconnu")
    acc = get_account(p.account)
    model = cfg.get("elevenlabs_model") or "eleven_multilingual_v2"
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    name = "el_" + hashlib.sha1(f"{p.voice}{model}{SAMPLE_TEXT[p.account]}v4".encode()).hexdigest()[:12]
    wav = PREVIEW_DIR / f"{name}.wav"
    cost = elevenlabs.cost([t for _, t, _ in SAMPLE_LINES[p.account]], model)
    if wav.exists():
        return {"url": f"/preview/{wav.name}", "cost": 0, "cached": True}
    voice = dict(acc["voice"])
    voice["eleven"] = {"key": key, "voice": p.voice, "model": model, "speed": acc["voice"].get("eleven_speed", 1.0)}
    try:
        used = _speak_sample(p.account, voice, "elevenlabs", wav)
    except elevenlabs.ElevenError as e:
        raise HTTPException(502, str(e)) from e
    if used != "elevenlabs":
        raise HTTPException(502, "ElevenLabs n'a pas répondu (quota, clé ou réseau) : la voix gratuite a été utilisée à la place.")
    return {"url": f"/preview/{wav.name}", "cost": cost, "cached": False}


# ------------------------------------------------------------------ rappels : limites de chaque clé (images et voix)

_alerts_cache: dict = {"t": 0.0, "data": None}


@app.get("/api/alerts")
def alerts():
    """Tous les rappels à afficher : clé épuisée, clé invalide, plus aucune source d'images... [{level, message}]."""
    from . import keystatus
    if _alerts_cache["data"] is not None and time.time() - _alerts_cache["t"] < 30:
        return _alerts_cache["data"]
    cfg = settings.load()
    out = []
    el = elevenlabs_alert()
    if el.get("level") != "ok":
        out.append({"level": el["level"], "message": el.get("message", ""), "provider": "elevenlabs"})
    uses_ai = any(v == "ai" for v in (cfg.get("visual_source") or {}).values())
    if uses_ai:
        token = cfg.get("pollinations_token", "")
        cf_set = bool(cfg.get("cloudflare_account_id") and cfg.get("cloudflare_token"))
        sources = []
        for prov, configured, key in (("pollinations", bool(token), token),
                                      ("cloudflare", cf_set, cfg.get("cloudflare_token", ""))):
            if not configured:
                continue
            st = keystatus.get(prov, key)
            if st.get("status") in ("exhausted", "invalid"):
                when = ""
                if st.get("until"):
                    import datetime as _dt
                    label = " Recharge vers " if prov == "cloudflare" else " Nouvel essai automatique vers "
                    when = label + _dt.datetime.fromtimestamp(st["until"]).strftime("%d/%m %H:%M") + "."
                out.append({"level": "low", "provider": prov,
                            "message": f"{keystatus.NAMES[prov]} : {st.get('message') or 'clé inutilisable'}.{when}"})
            else:
                sources.append(prov)
        if not sources and cfg.get("horde_enabled", True):
            out.append({"level": "low", "provider": "horde",
                        "message": "Pollinations et Cloudflare sont à leur limite : les images passent par AI Horde "
                                   "(gratuit, mais plus lent, compte quelques minutes de plus par vidéo)."})
        elif not sources:
            msg = ("Plus aucune source d'images IA disponible : les vidéos utilisent les images de secours. "
                   + ("Ajoute un compte Cloudflare gratuit (Réglages → Visuels) ou change de clé."
                      if not cf_set else "Change de clé ou attends la recharge."))
            out.append({"level": "empty", "provider": "images", "message": msg})
    _alerts_cache.update(t=time.time(), data=out)
    return out


@app.get("/api/keystatus")
def key_status():
    from . import keystatus
    cfg = settings.load()
    return {"pollinations": keystatus.get("pollinations", cfg.get("pollinations_token", "")),
            "cloudflare": keystatus.get("cloudflare", cfg.get("cloudflare_token", "")),
            "horde": keystatus.get("horde", cfg.get("horde_key", "") or "0000000000")}


# ------------------------------------------------------------------ alerte crédit ElevenLabs

_eleven_alert_cache: dict = {"t": 0.0, "data": None}
CHARS_PER_VIDEO = 1200   # ≈ 60 s de voix off


@app.get("/api/elevenlabs/alert")
def elevenlabs_alert():
    """Niveau d'alerte du crédit : ok | low (moins de 3 vidéos) | empty (moins d'une vidéo) | error."""
    from .video import elevenlabs
    cfg = settings.load()
    key = cfg.get("elevenlabs_key")
    used_by = [a for a, e in (cfg.get("voice_engines") or {}).items() if e == "elevenlabs"]
    if not key or not used_by:
        return {"level": "ok"}
    if _eleven_alert_cache["data"] and time.time() - _eleven_alert_cache["t"] < 60:
        return _eleven_alert_cache["data"]
    model = cfg.get("elevenlabs_model") or "eleven_multilingual_v2"
    try:
        sub = elevenlabs.subscription(key)
    except elevenlabs.ElevenError as e:
        data = {"level": "error", "message": f"ElevenLabs : {e} Vérifie ta clé dans les Réglages."}
    else:
        per_video = CHARS_PER_VIDEO * elevenlabs.MODELS.get(model, ("", 1.0))[1]
        left = int(sub["remaining"] // per_video)
        if left < 1:
            msg = "Crédit ElevenLabs épuisé : les nouvelles vidéos utilisent la voix gratuite. Change de clé dans les Réglages."
            data = {"level": "empty", "videos_left": 0, "remaining": sub["remaining"], "message": msg}
        elif left < 3:
            msg = f"Crédit ElevenLabs presque épuisé : il reste environ {left} vidéo{'s' if left > 1 else ''}. Prépare la clé d'un autre compte."
            data = {"level": "low", "videos_left": left, "remaining": sub["remaining"], "message": msg}
        else:
            data = {"level": "ok", "videos_left": left, "remaining": sub["remaining"]}
    _eleven_alert_cache.update(t=time.time(), data=data)
    return data

