"""Mode hors-ligne : génère idées et scripts SANS IA, à partir de modèles de phrases.

Qualité basique : sert de dépannage (quota Claude atteint, pas d'Internet) et pour tester
la chaîne de production. Pour de vrais contenus, utilise Claude Code ou Ollama.
"""
from __future__ import annotations

import random

from . import db
from .accounts import get_account

HOOKS = {
    "argent": [
        "Personne ne t'a jamais expliqué ça sur {s}.",
        "Si tu ne comprends pas {s}, tu resteras pauvre.",
        "Moi, le panda, je vais te révéler le secret de {s}.",
        "90 pour cent des gens se trompent sur {s}.",
    ],
    "stoicisme": [
        "Il y a deux mille ans, un philosophe a tout compris sur {s}.",
        "Les stoïciens avaient une règle simple sur {s}.",
        "Ce que Marc Aurèle pensait de {s} va te faire réfléchir.",
    ],
    "reflexion": [
        "Un jour, tu comprendras {s}. J'espère que ce ne sera pas trop tard.",
        "Personne n'ose te parler de {s}.",
        "Et si tout ce qu'on t'a appris sur {s} était faux ?",
    ],
}

BODY = {
    "argent": [
        ("La plupart des gens pensent que {s} est réservé aux riches.", "LE MYTHE", "a crowd of busy people"),
        ("En réalité, c'est exactement l'inverse : c'est comme ça que les riches le deviennent.", "L'INVERSE", "the panda smiling confidently in a luxury office"),
        ("Le problème, c'est que personne ne nous l'apprend à l'école.", "PAS À L'ÉCOLE", "an empty classroom"),
        ("Alors voici la règle numéro un : commence petit, mais commence maintenant.", "RÈGLE N°1", "the panda pointing at a whiteboard"),
        ("Même cinquante euros par mois, placés avec régularité, finissent par changer une vie.", "50 € / MOIS", "the panda holding a small stack of coins"),
        ("La règle numéro deux : automatise tout, pour ne jamais dépendre de ta motivation.", "AUTOMATISE", "the panda using a smartphone banking app"),
        ("Et la règle numéro trois : ne touche à rien quand tout le monde panique.", "NE PANIQUE PAS", "the panda calm in a storm"),
        ("Le vrai piège, ce n'est pas de perdre de l'argent. C'est de ne jamais commencer.", "LE VRAI PIÈGE", "the panda looking at a clock"),
        ("Le temps est ton meilleur allié. Chaque année perdue te coûte plus cher que tu ne crois.", "LE TEMPS", "an hourglass with golden sand"),
    ],
    "stoicisme": [
        ("Les stoïciens enseignaient une idée simple : distingue ce qui dépend de toi de ce qui n'en dépend pas.", "CE QUI DÉPEND DE TOI", "a marble statue of a philosopher"),
        ("Sénèque disait que nous souffrons plus souvent en imagination que dans la réalité.", "EN IMAGINATION", "ancient roman ruins at dusk"),
        ("Appliqué à {s}, ça change tout.", "", "an old book on a stone table"),
        ("Tu ne contrôles pas les événements. Tu contrôles ta réponse.", "TA RÉPONSE", "a calm sea after a storm"),
        ("Marc Aurèle, l'homme le plus puissant de son époque, se répétait ces mots chaque matin.", "CHAQUE MATIN", "a roman emperor statue at sunrise"),
        ("Aujourd'hui, essaie ceci : avant de réagir, respire, et demande-toi si cela dépend vraiment de toi.", "RESPIRE", "a candle flame in the dark"),
        ("La discipline n'est pas une punition. C'est une forme de liberté.", "LIBERTÉ", "a greek temple under the stars"),
    ],
    "reflexion": [
        ("On passe nos journées à courir, sans jamais se demander pourquoi.", "POURQUOI ?", "people rushing in a subway"),
        ("Et {s}, c'est exactement ce qu'on évite de regarder en face.", "EN FACE", "a man looking at himself in a mirror"),
        ("Le confort est un piège silencieux. Il ne fait pas mal. Il t'endort.", "UN PIÈGE", "a person on a sofa in a dark room"),
        ("Un jour, tu te réveilleras et tu réaliseras que les années sont passées.", "LES ANNÉES", "an old clock"),
        ("Alors commence par une seule chose : sois honnête avec toi-même.", "SOIS HONNÊTE", "a lone silhouette on a cliff"),
        ("Ensuite, arrête de vivre pour les applaudissements des autres.", "TA VIE", "an empty stadium at night"),
        ("Et enfin, fais aujourd'hui ce que ton futur toi te remerciera d'avoir fait.", "AUJOURD'HUI", "sunrise over mountains"),
    ],
}

ENDS = {
    "argent": "Enregistre cette vidéo, et commence dès ce mois-ci. Ceci n'est pas un conseil en investissement.",
    "stoicisme": "La sagesse ne sert à rien si elle reste dans les livres. À toi de jouer.",
    "reflexion": "Tu as encore le temps. Mais pas pour toujours.",
}


def generate(task: str, prompt: str) -> dict:
    kind, account_id, arg = task.split(":", 2)
    acc = get_account(account_id)
    if kind == "ideas":
        return {"ideas": [_idea(acc) for _ in range(int(arg))]}
    ids = [int(x) for x in arg.split(",") if x]
    return {"scripts": [{"ref": i, "scenes": _scenes(acc, db.get_video(i))} for i in ids]}


def _idea(acc: dict) -> dict:
    subject = random.choice(acc["pillars"])
    n = random.randint(2, 999)
    return {
        "subject": f"{subject} (variante {n})",
        "angle": f"Expliquer {subject} simplement, avec un exemple concret du quotidien.",
        "hook": random.choice(HOOKS[acc["id"]]).format(s=subject),
        "title": f"{subject.capitalize()} : ce que personne ne te dit #{n}",
        "description": f"Tu connaissais cette idée sur {subject} ? Dis-moi en commentaire.",
        "hashtags": [f"#{subject.split()[0].lower()}"],
        "visual_idea": "Ambiance du compte, plans lents et texte fort à l'écran.",
    }


def _scenes(acc: dict, video: dict) -> list[dict]:
    s = video["subject"].split(" (variante")[0]
    dur = video.get("duration_target") or 70
    target_words = int(dur * 2.5)
    scenes = [{"voice": video["hook"], "on_screen": video["title"][:30].upper(), "visual": "Hook",
               "image_prompt": "dramatic opening shot", "emphasis": []}]
    body = BODY[acc["id"]][:]
    words = len(video["hook"].split())
    i = 0
    while words < target_words - 12 and i < len(body):
        voice, screen, img = body[i % len(body)]
        voice = voice.format(s=s)
        scenes.append({"voice": voice, "on_screen": screen, "visual": img, "image_prompt": img, "emphasis": []})
        words += len(voice.split())
        i += 1
    scenes.append({"voice": ENDS[acc["id"]], "on_screen": "", "visual": "fin", "image_prompt": "cinematic ending shot", "emphasis": []})
    return scenes
