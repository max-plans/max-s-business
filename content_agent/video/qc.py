"""Contrôle qualité des images par Claude (vision, inclus dans ton abonnement).

Les générateurs d'images gratuits se trompent souvent : membre manquant, main en trop, personnage déformé,
panda gros, texte illisible. Claude regarde chaque image ; celles qui ont un défaut sont régénérées.
"""
from __future__ import annotations

from ..accounts import scene_has_panda

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


def _refs(sc: dict, with_mascot: bool) -> list[tuple[str, Path]]:
    """Fiches de référence (nom, fichier) des personnages qui doivent apparaître dans la scène."""
    from .. import characters
    out = []
    if with_mascot and scene_has_panda(sc) and characters.reference_path(characters.PANDA_SLUG).exists():
        out.append((characters.PANDA_NAME, characters.reference_path(characters.PANDA_SLUG)))
    for n in sc.get("characters") or []:
        c = characters.get(n)
        if c and not characters.is_panda(n) and characters.reference_path(c["slug"]).exists():
            out.append((c["name"], characters.reference_path(c["slug"])))
    return out


def review_reference(path: Path, name: str, description: str) -> str:
    """Contrôle d'une fiche de référence : un seul personnage, anatomie correcte. Renvoie le problème ('' si ok)."""
    prompt = (f"Regarde cette image (outil Read) : {path.as_posix()}\nC'est la fiche de référence du personnage « {name} » : "
              f"{description[:300]}\nok = false si l'image montre plus d'un personnage, un membre manquant ou en trop, du texte, "
              "ou un personnage qui ne correspond pas à la description. problem = phrase courte (vide si ok). index = 0.")
    try:
        res = llm.look_at_images(SYSTEM, prompt, SCHEMA, [path.parent])
    except llm.LLMError:
        return ""
    for r in (res or {}).get("images", []):
        if not r.get("ok", True):
            return (r.get("problem") or "défaut visible").strip()
    return ""


def review(items: list[tuple[int, Path, dict]], with_mascot: bool) -> dict[int, str]:
    """items = [(numéro de scène, fichier image, scène)]. Renvoie {numéro: problème} pour les images à refaire.
    Si le contrôle est impossible (pas de Claude Code, erreur), renvoie {} : on garde les images telles quelles."""
    bad: dict[int, str] = {}
    for i in range(0, len(items), BATCH):
        chunk = items[i:i + BATCH]
        dirs = {p.parent for _, p, _ in chunk}
        lines = []
        for idx, path, sc in chunk:
            refs = _refs(sc, with_mascot)
            dirs |= {r.parent for _, r in refs}
            if with_mascot:
                who = ("Panda Boss doit être présent, UN SEUL panda" if scene_has_panda(sc)
                       else "AUCUN panda ne doit apparaître")
            else:
                who = "aucun personnage récurrent imposé"
            ref_txt = "".join(f"\n  référence de {n} : {r.as_posix()}" for n, r in refs)
            lines.append(f"- index {idx} : {path.as_posix()}\n  PHRASE DITE PAR LA VOIX : « {(sc.get('voice') or '')[:200]} »\n"
                         f"  scène voulue : {(sc.get('image_prompt') or '')[:220]}\n  ({who}){ref_txt}")
        prompt = (
            "Regarde chacune de ces images (outil Read), et les images de référence des personnages quand il y en a :\n"
            + "\n".join(lines) + "\n\n"
            "Pour chaque image, ok = false si tu vois l'un de ces défauts, sinon ok = true :\n"
            "1. SENS : l'image ne montre pas clairement ce que dit la PHRASE DITE (un spectateur qui coupe le son doit "
            "comprendre l'idée de la phrase en voyant l'image : bon sujet, bonne action, bon objet, bonne émotion). "
            "Image décorative, hors-sujet ou qui contredit la phrase = refusée.\n"
            "2. ANATOMIE : un personnage a un membre manquant, en trop, fusionné ou coupé de façon bizarre (bras, jambe, main, "
            "doigts en nombre très anormal, deux têtes, queue ou oreille en trop, corps déformé). Un personnage cadré en buste ou "
            "caché derrière un objet est NORMAL ; ne signale que ce qui devrait être visible.\n"
            "3. PANDA : il y a PLUSIEURS pandas (un seul est autorisé, jamais de panda en peluche, statue ou affiche en plus), "
            "ou le panda est gros, rond, trapu, ou ne ressemble pas à la référence (même silhouette fine, mêmes lunettes dorées, "
            "même costume noir), ou il manque alors qu'il doit être là, ou il est là alors qu'il ne doit pas l'être.\n"
            "4. PERSONNAGE : un autre personnage a une référence mais ne lui ressemble pas (visage, cheveux, vêtements, âge).\n"
            "5. TEXTE : du texte illisible, des lettres inventées ou des mots absurdes sur une pancarte, un objet ou un mur.\n"
            "problem = une phrase courte et précise sur le défaut (vide si ok). Réponds avec un objet par image (index)."
        )
        try:
            res = llm.look_at_images(SYSTEM, prompt, SCHEMA, sorted(dirs))
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
