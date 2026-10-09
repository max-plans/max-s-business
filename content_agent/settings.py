"""Paramètres de l'application (data/settings.json)."""
from __future__ import annotations

import copy
import json
import threading

from .paths import SETTINGS_PATH

DEFAULTS: dict = {
    # Génération de texte — uniquement des options sans coût supplémentaire.
    "llm_provider": "claude_code",      # claude_code | ollama | offline
    "claude_model": "",                 # vide = modèle par défaut de ton Claude Code
    "voice_continuous": True,           # voix lue d'un trait par blocs de phrases (intonation humaine), puis découpée
    "image_qc": True,                   # Claude vérifie chaque image (membre manquant...) et refait les mauvaises
    "web_research": True,               # Claude fait des recherches web avant d'écrire (inclus dans l'abonnement)
    "ollama_url": "http://localhost:11434",
    "ollama_model": "llama3.1",
    # Voix
    "tts_engine": "edge",               # edge (gratuit, en ligne) | piper (100 % local)
    # Visuels : ai = Pollinations (gratuit), pexels = banque vidéo (clé gratuite), local = généré sur ton PC
    "visual_source": {"argent": "ai", "stoicisme": "ai", "reflexion": "ai"},
    "panda_mode": "ai",                 # ai = images IA du panda | local = panda animé dessiné localement
    "pollinations_token": "",           # optionnel, gratuit (auth.pollinations.ai) : plus rapide, sans filigrane
    "cloudflare_account_id": "",         # Cloudflare Workers AI (gratuit, quota quotidien) : 2e source d'images IA
    "cloudflare_token": "",
    "cloudflare_model": "",             # vide = FLUX.2 klein 9B (puis 4B, puis FLUX.1 schnell)
    "panda_fixed": True,                # panda officiel collé tel quel (identique au pixel près) au lieu d'être redessiné
    "horde_enabled": True,              # AI Horde : 3e source d'images, gratuite et sans quota (plus lente)
    "horde_key": "",                    # optionnelle (aihorde.net/register) : passe devant la file anonyme
    "pexels_key": "",                   # optionnel, gratuit (pexels.com/api)
    "handles": {"argent": "", "stoicisme": "", "reflexion": ""},
    "voices": {"argent": "", "stoicisme": "", "reflexion": ""},        # vide = voix par défaut du compte
    "image_styles": {"argent": "", "stoicisme": "", "reflexion": ""},  # vide = style par défaut du compte
    # ElevenLabs (optionnel, compte gratuit) : moteur de voix par compte, voix choisie, modèle
    "elevenlabs_key": "",
    "elevenlabs_model": "eleven_multilingual_v2",
    "voice_engines": {"argent": "edge", "stoicisme": "edge", "reflexion": "edge"},
    "eleven_voices": {"argent": "", "stoicisme": "", "reflexion": ""},
    "music_volume": None,               # None = valeur du compte
    "export_dir": "",                   # vide = dossier « exports » à côté de l'application
    "posting_times": ["12:30", "18:30", "21:00", "08:00", "15:00"],
    # Pilote automatique par compte (voir autopilot.py)
    "autopilot": {},
}

_lock = threading.Lock()


def load() -> dict:
    data = copy.deepcopy(DEFAULTS)
    if SETTINGS_PATH.exists():
        try:
            saved = json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            saved = {}
        for k, v in saved.items():
            if isinstance(v, dict) and isinstance(data.get(k), dict):
                data[k].update(v)
            elif k in data:
                data[k] = v
    return data


def save(patch: dict) -> dict:
    with _lock:
        data = load()
        for k, v in patch.items():
            if k not in DEFAULTS:
                continue
            if isinstance(v, dict) and isinstance(data.get(k), dict):
                data[k].update(v)
            else:
                data[k] = v
        SETTINGS_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        return data
