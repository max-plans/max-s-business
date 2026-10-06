"""Génération de texte SANS coût supplémentaire.

- claude_code : utilise ton Claude Code (abonnement Pro) en mode non interactif (`claude -p`).
  La variable ANTHROPIC_API_KEY est volontairement retirée de l'environnement pour que ce soit
  TOUJOURS ton abonnement qui soit utilisé, jamais une facturation API à l'usage.
- ollama : modèle local gratuit (https://ollama.com), si tu l'as installé.
- offline : générateur à base de modèles de phrases, sans IA (qualité basique, dépannage).
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess

import requests

from . import settings
from .paths import CACHE_DIR


class LLMError(RuntimeError):
    pass


def generate_json(system: str, prompt: str, schema: dict, task: str = "", provider: str | None = None) -> dict:
    cfg = settings.load()
    provider = provider or cfg["llm_provider"]
    if provider == "claude_code":
        return _claude_code(system, prompt, schema, cfg.get("claude_model") or "")
    if provider == "ollama":
        return _ollama(system, prompt, schema, cfg["ollama_url"], cfg["ollama_model"])
    if provider == "offline":
        from .offline import generate as offline_generate
        return offline_generate(task, prompt)
    raise LLMError(f"Fournisseur inconnu : {provider}")


def claude_available() -> tuple[bool, str]:
    exe = shutil.which("claude")
    if not exe:
        return False, "Commande « claude » introuvable (installe Claude Code et connecte-toi avec ton compte Pro)."
    try:
        v = subprocess.run([exe, "--version"], capture_output=True, text=True, timeout=20).stdout.strip()
    except Exception as e:  # noqa: BLE001
        return False, str(e)
    return True, v


def _claude_code(system: str, prompt: str, schema: dict, model: str) -> dict:
    exe = shutil.which("claude")
    if not exe:
        raise LLMError("Claude Code n'est pas installé ou pas dans le PATH.")
    env = {k: v for k, v in os.environ.items() if k not in ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN")}
    cmd = [
        exe, "-p",
        "--output-format", "json",
        "--json-schema", json.dumps(schema, ensure_ascii=False),
        "--system-prompt", system,
        "--tools", "",
        "--no-session-persistence",
    ]
    if model:
        cmd += ["--model", model]
    workdir = CACHE_DIR / "llm"
    workdir.mkdir(parents=True, exist_ok=True)
    try:
        proc = subprocess.run(cmd, input=prompt, capture_output=True, text=True, timeout=900, env=env, cwd=workdir)
    except subprocess.TimeoutExpired as e:
        raise LLMError("Claude Code n'a pas répondu à temps (15 min).") from e
    out = proc.stdout.strip()
    try:
        data = json.loads(out)
    except json.JSONDecodeError as e:
        msg = (proc.stderr or out)[-600:]
        raise LLMError(f"Réponse illisible de Claude Code : {msg}") from e
    if data.get("is_error"):
        msg = str(data.get("result") or data.get("subtype"))
        if "limit" in msg.lower():
            msg = "Limite d'utilisation de ton abonnement Claude atteinte : réessaie plus tard. " + msg
        raise LLMError(msg[:600])
    result = data.get("structured_output")
    if result is None:
        try:
            result = json.loads(data.get("result") or "")
        except json.JSONDecodeError as e:
            raise LLMError("Claude Code n'a pas renvoyé de JSON valide.") from e
    return result


def _ollama(system: str, prompt: str, schema: dict, url: str, model: str) -> dict:
    try:
        r = requests.post(
            f"{url.rstrip('/')}/api/chat",
            json={
                "model": model,
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
                "format": schema,
                "stream": False,
                "options": {"temperature": 0.8, "num_ctx": 16384},
            },
            timeout=1800,
        )
        r.raise_for_status()
        return json.loads(r.json()["message"]["content"])
    except requests.RequestException as e:
        raise LLMError(f"Ollama injoignable sur {url} : {e}") from e
    except (KeyError, json.JSONDecodeError) as e:
        raise LLMError(f"Réponse Ollama invalide : {e}") from e
