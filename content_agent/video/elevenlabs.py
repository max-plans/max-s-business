"""Voix ElevenLabs (option réaliste).

Compte gratuit sans carte bancaire : ~10 000 crédits/mois (≈ 10 vidéos de 60 s en qualité max,
≈ 20 en « Flash »). L'application vérifie le quota AVANT chaque vidéo : si le crédit restant ne suffit
pas, elle utilise la voix gratuite Edge à la place. Rien ne peut être facturé sans carte enregistrée.

L'expressivité vient de delivery.py : réglages différents pour chaque phrase selon son ton, balises d'émotion
et mots clés en majuscules avec le modèle v3.
"""
from __future__ import annotations

import base64
import os
import re
from pathlib import Path

import requests

from . import delivery

BASE = os.environ.get("ELEVENLABS_BASE", "https://api.elevenlabs.io")

MODELS = {
    "eleven_multilingual_v2": ("Naturelle, très stable (recommandée)", 1.0),
    "eleven_v3": ("Ultra expressive — émotions et accents (v3, à tester)", 1.0),
    "eleven_flash_v2_5": ("Économique : 2× plus de vidéos", 0.5),
}
FALLBACK_MODEL = "eleven_multilingual_v2"


class ElevenError(RuntimeError):
    pass


class _Rejected(ElevenError):
    """Requête refusée pour une raison de configuration (pas de quota) : on peut retenter avec un autre modèle."""


def _get(path: str, key: str) -> dict:
    try:
        r = requests.get(f"{BASE}{path}", headers={"xi-api-key": key}, timeout=20)
    except requests.RequestException as e:
        raise ElevenError(f"ElevenLabs injoignable ({type(e).__name__})") from e
    if r.status_code == 401:
        raise ElevenError("Clé ElevenLabs invalide.")
    if not r.ok:
        raise ElevenError(f"ElevenLabs : erreur {r.status_code}")
    return r.json()


def subscription(key: str) -> dict:
    d = _get("/v1/user/subscription", key)
    used, limit = int(d.get("character_count", 0)), int(d.get("character_limit", 0))
    return {"used": used, "limit": limit, "remaining": max(limit - used, 0), "tier": d.get("tier", "free"),
            "reset": d.get("next_character_count_reset_unix")}


def voices(key: str) -> list[dict]:
    d = _get("/v1/voices", key)
    out = []
    for v in d.get("voices", []):
        labels = v.get("labels") or {}
        desc = ", ".join(x for x in (labels.get("gender"), labels.get("accent"), labels.get("description") or labels.get("descriptive"), labels.get("use_case") or labels.get("use case")) if x)
        out.append({"id": v["voice_id"], "name": v.get("name", "?"), "desc": desc, "preview": v.get("preview_url")})
    return sorted(out, key=lambda x: x["name"].lower())


def cost(texts: list[str], model: str) -> int:
    return int(sum(len(t) for t in texts) * MODELS.get(model, ("", 1.0))[1]) + 1


def synthesize(key: str, voice_id: str, text: str, out: Path, model: str,
               previous_text: str = "", next_text: str = "", speed: float = 1.0,
               tone: str | None = None, emphasis: list[str] | tuple = (),
               prepared: tuple[str, dict[str, str]] | None = None) -> tuple[Path, list[tuple[str, float, float]]]:
    """Renvoie (fichier mp3, [(mot, début, fin)]). Le modèle v3 retombe sur v2 s'il est refusé.
    `prepared` = texte déjà mis en scène (balises v3, mots en majuscules) pour une lecture de plusieurs phrases."""
    try:
        return _synthesize(key, voice_id, text, out, model, previous_text, next_text, speed, tone, emphasis, prepared)
    except _Rejected as e:
        if model == "eleven_v3":
            print(f"  ! {e} → modèle de secours ({FALLBACK_MODEL})")
            return _synthesize(key, voice_id, text, out, FALLBACK_MODEL, previous_text, next_text, speed, tone,
                               emphasis, prepared)
        raise


def _synthesize(key, voice_id, text, out, model, previous_text, next_text, speed, tone, emphasis, prepared=None):
    if prepared:
        spoken_text, restore = prepared
        if model != "eleven_v3":   # balises et majuscules réservées au modèle v3
            spoken_text = re.sub(r"\[[a-z ]+\]\s*", "", spoken_text)
            for up, orig in restore.items():
                spoken_text = spoken_text.replace(up, orig)
            restore = {}
    else:
        spoken_text, restore = delivery.eleven_text(text, tone, emphasis, model)
    body = {"text": spoken_text, "model_id": model, "voice_settings": delivery.eleven_settings(model, tone, speed)}
    if model != "eleven_v3":  # contexte des phrases voisines : intonation continue d'une scène à l'autre
        if previous_text:
            body["previous_text"] = previous_text[-400:]
        if next_text:
            body["next_text"] = next_text[:400]
    try:
        r = requests.post(f"{BASE}/v1/text-to-speech/{voice_id}/with-timestamps",
                          headers={"xi-api-key": key}, json=body, timeout=180)
    except requests.RequestException as e:
        raise ElevenError(f"ElevenLabs injoignable ({type(e).__name__})") from e
    if r.status_code in (401, 402, 429) or (r.status_code == 400 and "quota" in r.text.lower()):
        raise ElevenError(f"ElevenLabs refusé ({r.status_code}) : quota épuisé ou clé invalide.")
    if r.status_code in (400, 403, 404, 422):
        raise _Rejected(f"ElevenLabs a refusé le modèle {model} ({r.status_code}) : {r.text[:120]}")
    if not r.ok:
        raise ElevenError(f"ElevenLabs : erreur {r.status_code} {r.text[:200]}")
    data = r.json()
    mp3 = out.with_suffix(".mp3")
    mp3.write_bytes(base64.b64decode(data["audio_base64"]))
    al = data.get("alignment") or data.get("normalized_alignment") or {}
    words: list[tuple[str, float, float]] = []
    cur, start, end = "", None, 0.0
    for ch, s, e in zip(al.get("characters", []), al.get("character_start_times_seconds", []), al.get("character_end_times_seconds", [])):
        if ch.isspace():
            if cur:
                words.append((cur, start, end))
            cur, start = "", None
            continue
        if start is None:
            start = s
        cur += ch
        end = e
    if cur:
        words.append((cur, start, end))
    words = delivery.strip_tags(words)                      # [excited], [whispers]... ne sont pas des mots
    return mp3, [(_restore_case(w, restore), s, e) for w, s, e in words]


def _restore_case(word: str, restore: dict[str, str]) -> str:
    """Remet en minuscules les mots qu'on avait mis en MAJUSCULES pour l'accent (sous-titres propres)."""
    core = word.strip(".,;:!?…»«\"'")
    return word.replace(core, restore[core]) if core in restore else word
