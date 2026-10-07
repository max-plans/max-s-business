"""Contrôle qualité des images par Claude (vision, inclus dans ton abonnement).

Les générateurs d'images gratuits se trompent souvent : membre manquant, main en trop, personnage déformé,
panda gros, texte illisible. Claude regarde chaque image ; celles qui ont un défaut sont régénérées.
"""
from __future__ import annotations

import os
from pathlib import Path

from .. import llm

SYSTEM = (
    "Tu es un contrôleur qualité très exigeant pour des vidéos de dessin animé. Tu regardes chaque image avec l'outil "
    "Read et tu repères les défauts qui se voient immédiatement et gâchent la vidéo. Tu réponds uniquement avec le JSON demandé."
)
SCHEMA = {
    "type": "object",
    "properties": {"images": {"type": "array", "items": {
        "type": "object",
        "properties": {"index": {"type": "integer"}, "ok": {"type": "boolean"}, "problem": {"type": "string"}},
        "required": ["index", "ok", "problem"], "additionalProperties": False}}},
    "required": ["images"], "additionalProperties": False,
}
BATCH = 8


def review(items: list[tuple[int, Path, dict]], with_mascot: bool) -> dict[int, str]:
    """items = [(numéro de scène, fichier image, scène)]. Renvoie {numéro: problème} pour les images à refaire.
    Si le contrôle est impossible (pas de Claude Code, erreur), renvoie {} : on garde les images telles quelles."""
    bad: dict[int, str] = {}
    for i in range(0, len(items), BATCH):
        chunk = items[i:i + BATCH]
        dirs = sorted({p.parent for _, p, _ in chunk})
        lines = []
        for idx, path, sc in chunk:
            who = ("le panda « Panda Boss » doit être présent" if sc.get("with_panda", True) and with_mascot
                   else "le panda ne doit PAS apparaître") if with_mascot else "aucun personnage récurrent imposé"
            lines.append(f"- index {idx} : {path.as_posix()}\n  scène voulue : {(sc.get('image_prompt') or '')[:220]}\n  ({who})")
        prompt = (
            "Regarde chacune de ces images (outil Read) :\n" + "\n".join(lines) + "\n\n"
            "Pour chaque image, ok = false si tu vois l'un de ces défauts, sinon ok = true :\n"
            "1. ANATOMIE : un personnage a un membre manquant, en trop, fusionné ou coupé de façon bizarre (bras, jambe, main, "
            "doigts en nombre très anormal, deux têtes, queue ou oreille en trop, corps déformé). Un personnage cadré en buste ou "
            "caché derrière un objet est NORMAL ; ne signale que ce qui devrait être visible.\n"
            "2. PANDA : le panda est gros, rond, trapu ou très différent d'un panda grand, mince et élancé en costume noir.\n"
            "3. PRÉSENCE : le panda manque alors qu'il doit être là, ou il est là alors qu'il ne doit pas l'être.\n"
            "4. TEXTE : du texte illisible, des lettres inventées ou des mots absurdes sur une pancarte, un objet ou un mur.\n"
            "5. L'image ne correspond pas du tout à la scène voulue.\n"
            "problem = une phrase courte et précise sur le défaut (vide si ok). Réponds avec un objet par image (index)."
        )
        try:
            res = llm.look_at_images(SYSTEM, prompt, SCHEMA, dirs)
        except llm.LLMError as e:
            print(f"  ! contrôle qualité des images impossible : {e}")
            return bad
        if not res:
            return {}
        wanted = {idx for idx, _, _ in chunk}
        for r in res.get("images", []):
            if r.get("index") in wanted and not r.get("ok", True):
                bad[int(r["index"])] = (r.get("problem") or "défaut visible").strip()
    return bad
