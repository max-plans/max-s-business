"""Fabrique du SaaS : tourne sur le serveur (Oracle Cloud), prend les commandes des clients dans Supabase,
fabrique les vidéos avec le moteur de l'appli et les dépose dans le stockage du client.

    SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_KEY=... python -m content_agent.worker

La clé « service » (secrète) se trouve dans Supabase → Project Settings → API keys. Elle ne doit JAMAIS être
mise dans le site ni envoyée à quelqu'un : elle reste uniquement sur le serveur, dans une variable d'environnement.
"""
from __future__ import annotations

import datetime as dt
import os
import shutil
import socket
import tempfile
import threading
import time
import traceback
from pathlib import Path
from urllib.parse import quote

import requests

URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
NAME = os.environ.get("WORKER_NAME", socket.gethostname())
KEEP_DAYS = int(os.environ.get("KEEP_DAYS", "7"))          # les vidéos sont supprimées après 7 jours
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}


def _rest(method: str, path: str, **kw):
    r = requests.request(method, f"{URL}{path}", headers={**H, **kw.pop("headers", {})}, timeout=60, **kw)
    if r.status_code >= 400:
        raise RuntimeError(f"Supabase {method} {path} : {r.status_code} {r.text[:200]}")
    return r


def claim():
    rows = _rest("POST", "/rest/v1/rpc/claim_job", json={"p_worker": NAME}).json()
    return rows[0] if rows else None


def update(job_id: str, **fields):
    _rest("PATCH", f"/rest/v1/jobs?id=eq.{job_id}", json=fields, headers={"Prefer": "return=minimal"})


def fail(job_id: str, message: str):
    _rest("POST", "/rest/v1/rpc/fail_job", json={"p_job": job_id, "p_message": message[:300]})


def upload(bucket: str, path: str, file: Path, ctype: str):
    with open(file, "rb") as f:
        _rest("POST", f"/storage/v1/object/{bucket}/{path}", data=f,
              headers={"Content-Type": ctype, "x-upsert": "true"})


def download(bucket: str, path: str, dest: Path):
    r = _rest("GET", f"/storage/v1/object/{bucket}/{path}")
    dest.write_bytes(r.content)


def _prepare_fusion(job: dict):
    """Fusion perso : on installe les images et le mot du client pour cette commande uniquement."""
    from . import fusion_perso as fp
    opts = job.get("options") or {}
    if fp.DIR.exists():
        shutil.rmtree(fp.DIR)
    fp.DIR.mkdir(parents=True, exist_ok=True)
    order = []
    for k, p in enumerate((opts.get("images") or [])[: fp.MAX_IMAGES]):
        if not str(p).startswith(job["user_id"] + "/"):        # uniquement les images du client lui-même
            continue
        name = f"{k + 1:02d}.png"
        tmp = fp.DIR / ("src_" + name)
        download("uploads", p, tmp)
        from PIL import Image
        Image.open(tmp).convert("RGBA").save(fp.DIR / name)
        tmp.unlink()
        order.append(name)
    fp._save({"word": str(opts.get("word") or "")[:40], "order": order,
              "theme": opts.get("theme") if opts.get("theme") in fp.THEMES else "planetes"})


def run(job: dict):
    from . import satisfying
    job_id = job["id"]
    last = [0.0]

    def progress(pc, msg):
        if time.time() - last[0] > 4:                          # pas plus d'une mise à jour toutes les 4 s
            last[0] = time.time()
            try:
                update(job_id, progress=int(pc), message=str(msg)[:120])
            except Exception:  # noqa: BLE001
                pass

    if job["concept"] == "fusionx":
        _prepare_fusion(job)
    work = Path(tempfile.mkdtemp(prefix="plop_"))
    try:
        out = work / f"{job_id}.mp4"
        res = satisfying.render(job["concept"], out, int(job["seconds"]), progress=progress)
        dest = f"{job['user_id']}/{job_id}.mp4"
        progress(97, "Envoi de la vidéo…")
        upload("videos", dest, out, "video/mp4")
        update(job_id, status="done", progress=100, message="Prête !", video_path=dest,
               caption=res.get("caption", ""), finished_at=dt.datetime.now(dt.timezone.utc).isoformat())
    finally:
        shutil.rmtree(work, ignore_errors=True)


def recover():
    """Commandes de cette fabrique coupées par un redémarrage : on les remet dans la file d'attente."""
    rows = _rest("PATCH", f"/rest/v1/jobs?status=eq.running&worker=eq.{quote(NAME)}",
                 json={"status": "queued", "progress": 0, "message": "Reprise après un redémarrage"},
                 headers={"Prefer": "return=representation"}).json()
    if rows:
        print(f"{len(rows)} commande(s) interrompue(s) remise(s) en file d'attente.", flush=True)


def serve_status():
    """Petite page « en marche » sur le port PORT : Hugging Face exige qu'un Space réponde sur le web,
    et la visite régulière de cette page empêche le serveur gratuit de s'endormir."""
    port = int(os.environ.get("PORT", "0"))
    if not port:
        return
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

    class Page(BaseHTTPRequestHandler):
        def do_GET(self):
            body = f"Fabrique Plop Lab « {NAME} » : en marche.".encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *a):
            pass

    threading.Thread(target=ThreadingHTTPServer(("0.0.0.0", port), Page).serve_forever, daemon=True).start()


def cleanup():
    """Supprime les vidéos de plus de KEEP_DAYS jours (le stockage gratuit est limité)."""
    limit = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=KEEP_DAYS)).isoformat()
    rows = _rest("GET", f"/rest/v1/jobs?select=id,video_path&status=eq.done&video_path=not.is.null&finished_at=lt.{limit}").json()
    if not rows:
        return
    _rest("DELETE", "/storage/v1/object/videos", json={"prefixes": [r["video_path"] for r in rows]})
    for r in rows:
        update(r["id"], video_path=None, message="Vidéo expirée (gardée 7 jours)")


def main():
    if not URL or not KEY:
        raise SystemExit("Il manque SUPABASE_URL ou SUPABASE_SERVICE_KEY (voir le guide d'installation).")
    serve_status()
    from .deps import ensure_all
    ensure_all()
    try:
        recover()
    except Exception:  # noqa: BLE001
        traceback.print_exc()
    print(f"Fabrique « {NAME} » prête : j'attends les commandes…", flush=True)
    next_clean = 0.0
    while True:
        try:
            if time.time() > next_clean:
                cleanup()
                next_clean = time.time() + 3600
            job = claim()
            if not job:
                time.sleep(5)
                continue
            print(f"→ {job['concept']} {job['seconds']} s pour {job['user_id'][:8]}…", flush=True)
            try:
                run(job)
                print("  ✓ prête", flush=True)
            except Exception as e:  # noqa: BLE001 — la commande échoue, le client récupère ses crédits
                traceback.print_exc()
                fail(job["id"], f"La fabrication a échoué ({type(e).__name__}). Tes crédits ont été rendus.")
        except Exception:  # noqa: BLE001 — coupure réseau, etc. : on réessaie
            traceback.print_exc()
            time.sleep(15)


if __name__ == "__main__":
    main()
