"""Base SQLite locale : plans, vidéos, tâches."""
from __future__ import annotations

import datetime as dt
import json
import sqlite3
import threading
from typing import Any

from .paths import DB_PATH

_lock = threading.RLock()
_conn = sqlite3.connect(DB_PATH, check_same_thread=False)
_conn.row_factory = sqlite3.Row
_conn.execute("PRAGMA journal_mode=WAL")

SCHEMA = """
CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account TEXT NOT NULL, start_date TEXT NOT NULL, days INTEGER, per_day INTEGER,
    duration INTEGER, created_at TEXT
);
CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account TEXT NOT NULL, plan_id INTEGER, pub_date TEXT, slot INTEGER, post_time TEXT,
    status TEXT NOT NULL DEFAULT 'idee',
    subject TEXT, angle TEXT, hook TEXT, title TEXT, description TEXT, hashtags TEXT,
    visual_idea TEXT, duration_target INTEGER, duration_est REAL,
    script TEXT, scenes TEXT, video_path TEXT, caption TEXT, error TEXT, progress INTEGER DEFAULT 0,
    created_at TEXT, updated_at TEXT, exported_at TEXT
);
CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL, account TEXT, plan_id INTEGER, video_id INTEGER,
    status TEXT NOT NULL DEFAULT 'queued', progress INTEGER DEFAULT 0, message TEXT, params TEXT,
    created_at TEXT, updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_videos_account ON videos(account, pub_date);
"""
with _lock:
    _conn.executescript(SCHEMA)
    for col, ddl in (("videos", "notes TEXT"), ("videos", "duration_real REAL")):
        try:
            _conn.execute(f"ALTER TABLE {col} ADD COLUMN {ddl}")
        except sqlite3.OperationalError:
            pass
    _conn.commit()


def reset_interrupted() -> None:
    """Au démarrage du serveur : les tâches « en cours » d'une session précédente ont été interrompues."""
    with _lock:
        _conn.execute("UPDATE jobs SET status='error', message='Interrompue (application redémarrée)' WHERE status IN ('queued','running')")
        _conn.execute("UPDATE videos SET status=CASE WHEN scenes IS NOT NULL AND scenes NOT IN ('', '[]') THEN 'script' ELSE 'idee' END, progress=0 WHERE status='en_cours'")
        _conn.commit()

JSON_FIELDS = {"hashtags", "scenes", "params"}


def now() -> str:
    return dt.datetime.now().isoformat(timespec="seconds")


def _row(r: sqlite3.Row | None) -> dict | None:
    if r is None:
        return None
    d = dict(r)
    for k in JSON_FIELDS & d.keys():
        d[k] = json.loads(d[k]) if d[k] else []
    return d


def query(sql: str, args: tuple = ()) -> list[dict]:
    with _lock:
        return [_row(r) for r in _conn.execute(sql, args).fetchall()]


def one(sql: str, args: tuple = ()) -> dict | None:
    with _lock:
        return _row(_conn.execute(sql, args).fetchone())


def insert(table: str, data: dict[str, Any]) -> int:
    data = {k: (json.dumps(v, ensure_ascii=False) if k in JSON_FIELDS else v) for k, v in data.items()}
    data.setdefault("created_at", now())
    if table != "plans":
        data.setdefault("updated_at", now())
    cols = ", ".join(data)
    marks = ", ".join("?" for _ in data)
    with _lock:
        cur = _conn.execute(f"INSERT INTO {table} ({cols}) VALUES ({marks})", tuple(data.values()))
        _conn.commit()
        return cur.lastrowid


def update(table: str, row_id: int, data: dict[str, Any]) -> None:
    if not data:
        return
    data = {k: (json.dumps(v, ensure_ascii=False) if k in JSON_FIELDS else v) for k, v in data.items()}
    if table != "plans":
        data["updated_at"] = now()
    sets = ", ".join(f"{k}=?" for k in data)
    with _lock:
        _conn.execute(f"UPDATE {table} SET {sets} WHERE id=?", (*data.values(), row_id))
        _conn.commit()


def delete(table: str, row_id: int) -> None:
    with _lock:
        _conn.execute(f"DELETE FROM {table} WHERE id=?", (row_id,))
        _conn.commit()


def get_video(video_id: int) -> dict | None:
    return one("SELECT * FROM videos WHERE id=?", (video_id,))
