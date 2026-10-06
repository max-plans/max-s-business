"""Écriture du script de la vidéo avec Claude."""
from __future__ import annotations

import anthropic
from pydantic import BaseModel, Field

MODEL = "claude-opus-5-5"


class Segment(BaseModel):
    text: str = Field(description="Une ou deux phrases lues par la voix off.")
    visual: str = Field(
        description="Requête de recherche EN ANGLAIS (2-4 mots) pour trouver une vidéo d'illustration "
        "sur une banque d'images, ex: 'man running at night'."
    )
    emphasis: list[str] = Field(
        description="0 à 2 mots EXACTS du texte à mettre en couleur dans les sous-titres."
    )
    highlight: str = Field(
        description="Texte court affiché en grand à l'écran pendant ce passage (citation, chiffre clé, "
        "calcul). Chaîne vide si rien à afficher. Max 60 caractères."
    )


class VideoScript(BaseModel):
    title: str = Field(description="Titre interne court de la vidéo.")
    hook_text: str = Field(description="Texte d'accroche affiché en haut de l'écran les 3 premières secondes (max 40 caractères).")
    segments: list[Segment]
    caption: str = Field(description="Description TikTok accrocheuse (1-2 phrases, sans hashtags).")
    hashtags: list[str] = Field(description="3 à 5 hashtags spécifiques au sujet, avec #.")


SYSTEM = """Tu es un scénariste TikTok expert en contenu faceless viral, francophone.
Tu écris des scripts de voix off destinés à être lus par une synthèse vocale.

Règles impératives :
- Écris pour l'oral : phrases courtes, rythme, pas de listes à puces, pas d'emojis, pas de parenthèses.
- Écris les nombres de manière à ce qu'ils soient bien prononcés (ex: « 100 euros », « 7 pour cent »).
- Les 2 premières secondes décident de tout : l'accroche doit créer une tension immédiate.
- Rétention : relance la curiosité au milieu (« mais le pire, c'est... »).
- Contenu 100 % original, jamais de plagiat ; les citations attribuées doivent être réelles.
- Chaque segment = 1 à 2 phrases (environ 5 à 30 mots). Vise 10 à 16 segments.
- Ne termine pas par une formule creuse ; termine par une phrase forte."""


def write_script(channel: dict, topic: str | None, recent_titles: list[str]) -> VideoScript:
    sc = channel["script"]
    lo, hi = sc["target_words"]
    topic_line = (
        f"Sujet imposé : {topic}"
        if topic
        else "Choisis toi-même un sujet précis et accrocheur, inspiré (sans s'y limiter) de ces pistes :\n- "
        + "\n- ".join(sc["topics"])
    )
    avoid = "\n- ".join(recent_titles[-40:]) or "(aucune)"
    disclaimer = sc.get("disclaimer")
    prompt = f"""Écris le script d'une vidéo TikTok pour ce compte.

PERSONA / TON :
{sc['persona']}

STRUCTURE :
{sc['structure']}

{topic_line}

Vidéos déjà publiées (ne répète ni le sujet ni l'angle) :
- {avoid}

Longueur totale de la voix off : entre {lo} et {hi} mots (la vidéo doit durer plus d'une minute).
{f'Le dernier segment doit se terminer par : « {disclaimer} »' if disclaimer else ''}"""

    client = anthropic.Anthropic()
    response = client.beta.messages.parse(
        model=MODEL,
        max_tokens=16000,
        system=SYSTEM,
        messages=[{"role": "user", "content": prompt}],
        output_format=VideoScript,
        output_config={"effort": "high"},
        # Si le modèle refuse (faux positif des filtres), l'API relance sur un modèle de secours.
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    )
    if response.stop_reason == "refusal" or response.parsed_output is None:
        raise RuntimeError(f"Script non généré (stop_reason={response.stop_reason}).")
    script = response.parsed_output

    words = sum(len(s.text.split()) for s in script.segments)
    if words < lo * 0.85:
        raise RuntimeError(f"Script trop court ({words} mots, minimum {lo}).")
    return script
