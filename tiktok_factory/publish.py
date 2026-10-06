"""Envoi des vidéos : Telegram (sur ton téléphone) et/ou TikTok (API Content Posting)."""
from __future__ import annotations

import math
import os
import time
from pathlib import Path

import requests

TT_API = "https://open.tiktokapis.com/v2"


# ---------------------------------------------------------------- Telegram

def send_telegram(video: Path, caption: str, channel_id: str) -> bool:
    token, chat = os.environ.get("TELEGRAM_BOT_TOKEN"), os.environ.get("TELEGRAM_CHAT_ID")
    if not (token and chat):
        return False
    header = f"📲 Compte {channel_id.upper()}\n\n"
    with video.open("rb") as f:
        r = requests.post(
            f"https://api.telegram.org/bot{token}/sendVideo",
            data={"chat_id": chat, "caption": (header + caption)[:1024], "supports_streaming": "true"},
            files={"video": (video.name, f, "video/mp4")},
            timeout=300,
        )
    if not r.ok:
        print(f"  ! Telegram : {r.status_code} {r.text[:200]}")
        return False
    # La légende complète en message séparé, facile à copier-coller dans TikTok.
    requests.post(
        f"https://api.telegram.org/bot{token}/sendMessage",
        data={"chat_id": chat, "text": caption},
        timeout=30,
    )
    return True


# ---------------------------------------------------------------- TikTok

def _tiktok_token(channel_id: str) -> str | None:
    refresh = os.environ.get(f"TIKTOK_REFRESH_TOKEN_{channel_id.upper()}")
    key, secret = os.environ.get("TIKTOK_CLIENT_KEY"), os.environ.get("TIKTOK_CLIENT_SECRET")
    if not (refresh and key and secret):
        return None
    r = requests.post(
        f"{TT_API}/oauth/token/",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={"client_key": key, "client_secret": secret, "grant_type": "refresh_token", "refresh_token": refresh},
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    if "access_token" not in data:
        raise RuntimeError(f"TikTok OAuth : {data}")
    return data["access_token"]


def _check(r: requests.Response) -> dict:
    data = r.json()
    err = data.get("error", {})
    if not r.ok or err.get("code", "ok") != "ok":
        raise RuntimeError(f"TikTok API {r.status_code} : {err or data}")
    return data.get("data", {})


def post_tiktok(video: Path, caption: str, channel_id: str) -> bool:
    """Publie sur TikTok.

    TIKTOK_MODE=inbox (défaut) : la vidéo arrive en brouillon dans ton appli TikTok,
    tu ajoutes un son tendance et tu publies en 10 secondes. Fonctionne sans audit.
    TIKTOK_MODE=direct : publication directe. Sans audit TikTok, seule la visibilité
    « privé » (SELF_ONLY) est autorisée.
    """
    token = _tiktok_token(channel_id)
    if not token:
        return False
    mode = os.environ.get("TIKTOK_MODE", "inbox")
    auth = {"Authorization": f"Bearer {token}", "Content-Type": "application/json; charset=UTF-8"}

    size = video.stat().st_size
    if size <= 64 * 1024 * 1024:
        chunk, count = size, 1
    else:
        chunk = 10 * 1024 * 1024
        count = math.floor(size / chunk)  # le dernier morceau absorbe le reste
    source = {"source": "FILE_UPLOAD", "video_size": size, "chunk_size": chunk, "total_chunk_count": count}

    if mode == "direct":
        info = _check(requests.post(f"{TT_API}/post/publish/creator_info/query/", headers=auth, timeout=30))
        options = info.get("privacy_level_options", ["SELF_ONLY"])
        wanted = os.environ.get("TIKTOK_PRIVACY", "PUBLIC_TO_EVERYONE")
        body = {
            "post_info": {
                "title": caption[:2200],
                "privacy_level": wanted if wanted in options else "SELF_ONLY",
                "disable_comment": False,
                "disable_duet": False,
                "disable_stitch": False,
                "video_cover_timestamp_ms": 1500,
                "is_aigc": True,
            },
            "source_info": source,
        }
        url = f"{TT_API}/post/publish/video/init/"
    else:
        body = {"source_info": source}
        url = f"{TT_API}/post/publish/inbox/video/init/"

    init = _check(requests.post(url, headers=auth, json=body, timeout=30))
    upload_url, publish_id = init["upload_url"], init["publish_id"]

    with video.open("rb") as f:
        for i in range(count):
            start = i * chunk
            end = size - 1 if i == count - 1 else start + chunk - 1
            f.seek(start)
            payload = f.read(end - start + 1)
            r = requests.put(
                upload_url,
                headers={
                    "Content-Type": "video/mp4",
                    "Content-Length": str(len(payload)),
                    "Content-Range": f"bytes {start}-{end}/{size}",
                },
                data=payload,
                timeout=300,
            )
            if r.status_code not in (200, 201, 206):
                raise RuntimeError(f"Upload TikTok échoué : {r.status_code} {r.text[:200]}")

    for _ in range(30):
        time.sleep(6)
        st = _check(requests.post(
            f"{TT_API}/post/publish/status/fetch/", headers=auth, json={"publish_id": publish_id}, timeout=30,
        ))
        status = st.get("status")
        if status in ("PUBLISH_COMPLETE", "SEND_TO_USER_INBOX"):
            print(f"  ✓ TikTok ({mode}) : {status}")
            return True
        if status == "FAILED":
            raise RuntimeError(f"TikTok a refusé la vidéo : {st.get('fail_reason')}")
    print("  ? TikTok : toujours en traitement, vérifie dans l'appli.")
    return True
