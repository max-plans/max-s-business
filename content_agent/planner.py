"""THÈME → IDÉE → HOOK → SCRIPT → SCÈNES : calendrier éditorial et scripts."""
from __future__ import annotations

import datetime as dt
import json
import re
import unicodedata
from typing import Callable

from . import db, llm, settings
from .accounts import get_account

WORDS_PER_SECOND = 2.75         # débit moyen mesuré d'une voix off française (pauses comprises)
IDEAS_BATCH = 12
SCRIPTS_BATCH = 3

SYSTEM = (
    "Tu es le directeur éditorial d'un compte TikTok francophone faceless à fort potentiel viral. "
    "Tu écris en français naturel, oral, percutant. Tu ne mens jamais, tu n'inventes ni chiffres ni "
    "citations. Tu réponds uniquement avec le JSON demandé."
)

IDEAS_SCHEMA = {
    "type": "object",
    "properties": {
        "ideas": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "subject": {"type": "string"},
                    "angle": {"type": "string"},
                    "hook": {"type": "string"},
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "hashtags": {"type": "array", "items": {"type": "string"}},
                    "visual_idea": {"type": "string"},
                },
                "required": ["subject", "angle", "hook", "title", "description", "hashtags", "visual_idea"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["ideas"],
    "additionalProperties": False,
}

SCRIPTS_SCHEMA = {
    "type": "object",
    "properties": {
        "scripts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "ref": {"type": "integer"},
                    "scenes": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "voice": {"type": "string"},
                                "on_screen": {"type": "string"},
                                "visual": {"type": "string"},
                                "image_prompt": {"type": "string"},
                                "emphasis": {"type": "array", "items": {"type": "string"}},
                                "tone": {"type": "string", "enum": ["accroche", "energique", "suspense", "grave",
                                                                   "question", "chute", "normal"]},
                            },
                            "required": ["voice", "on_screen", "visual", "image_prompt", "emphasis", "tone"],
                            "additionalProperties": False,
                        },
                    },
                },
                "required": ["ref", "scenes"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["scripts"],
    "additionalProperties": False,
}

FORMATS = (
    "histoire vraie, liste (3 règles / 5 erreurs), mythe vs réalité, « personne ne te dit que... », "
    "question qui dérange, comparaison avant/après, expérience de pensée, leçon d'un personnage célèbre, "
    "calcul chiffré, conseil contre-intuitif"
)


# ------------------------------------------------------------------ anti-doublons

_STOP = set("le la les un une des de du d l et ou a à au aux en pour par sur dans ce cette ces ton ta tes "
            "ta tu te toi ne pas plus que qui quoi est son sa ses avec sans comment pourquoi".split())


def _tokens(text: str) -> set[str]:
    text = unicodedata.normalize("NFD", (text or "").lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    return {w for w in re.findall(r"[a-z0-9]+", text) if w not in _STOP and len(w) > 2}


def is_duplicate(idea: dict, existing: list[set[str]], threshold: float = 0.5) -> bool:
    t = _tokens(f"{idea.get('subject', '')} {idea.get('title', '')}")
    if not t:
        return True
    for e in existing:
        if e and len(t & e) / len(t | e) >= threshold:
            return True
    return False


# ------------------------------------------------------------------ calendrier / idées

def slot_times(per_day: int) -> list[str]:
    times = settings.load()["posting_times"]
    chosen = sorted(times[:per_day]) if per_day <= len(times) else sorted(times)
    while len(chosen) < per_day:
        chosen.append(chosen[-1])
    return chosen


def create_plan(account_id: str, days: int, per_day: int, duration: int, start_date: str | None) -> int:
    start = start_date or (dt.date.today() + dt.timedelta(days=1)).isoformat()
    return db.insert("plans", {"account": account_id, "start_date": start, "days": days,
                               "per_day": per_day, "duration": duration})


def generate_plan_ideas(plan_id: int, progress: Callable[[int, str], None]) -> int:
    plan = db.one("SELECT * FROM plans WHERE id=?", (plan_id,))
    acc = get_account(plan["account"])
    total = plan["days"] * plan["per_day"]
    times = slot_times(plan["per_day"])
    start = dt.date.fromisoformat(plan["start_date"])
    slots = [(start + dt.timedelta(days=d), s) for d in range(plan["days"]) for s in range(plan["per_day"])]
    already = db.query("SELECT COUNT(*) AS n FROM videos WHERE plan_id=?", (plan_id,))[0]["n"]
    created = already
    failures = 0
    while created < total:
        existing = db.query("SELECT subject, title FROM videos WHERE account=? ORDER BY id", (acc["id"],))
        existing_tokens = [_tokens(f"{e['subject']} {e['title']}") for e in existing]
        want = min(IDEAS_BATCH, total - created)
        progress(int(created / total * 100), f"Idées {created}/{total} — génération de {want} idées...")
        try:
            ideas = _ask_ideas(acc, want + 2, plan["duration"], existing)
        except llm.LLMError:
            failures += 1
            if failures >= 3:
                raise
            continue
        for idea in ideas:
            if created >= total:
                break
            if is_duplicate(idea, existing_tokens):
                continue
            day, slot = slots[created]
            db.insert("videos", {
                "account": acc["id"], "plan_id": plan_id, "pub_date": day.isoformat(), "slot": slot,
                "post_time": times[slot], "status": "idee",
                "subject": idea["subject"].strip(), "angle": idea["angle"].strip(), "hook": idea["hook"].strip(),
                "title": idea["title"].strip(), "description": idea["description"].strip(),
                "hashtags": _clean_tags(idea["hashtags"], acc), "visual_idea": idea["visual_idea"].strip(),
                "duration_target": plan["duration"],
            })
            existing_tokens.append(_tokens(f"{idea['subject']} {idea['title']}"))
            created += 1
    progress(100, f"{total} idées prêtes")
    return total


def _clean_tags(tags: list[str], acc: dict) -> list[str]:
    out: list[str] = []
    for t in [*tags, *acc["hashtags"]]:
        t = "#" + re.sub(r"[^\w]", "", t.lstrip("#").lower())
        if len(t) > 2 and t not in out:
            out.append(t)
    return out[:8]


def _ask_ideas(acc: dict, n: int, duration: int, existing: list[dict]) -> list[dict]:
    recent = "\n".join(f"- {e['title']}" for e in existing[-150:]) or "(aucune)"
    prompt = f"""COMPTE : {acc['label']}
THÈME DU COMPTE : {acc['theme']}

PERSONA / TON :
{acc['persona']}

GRANDS AXES À FAIRE TOURNER (varie-les, ne reste pas sur un seul) :
{', '.join(acc['pillars'])}

FORMATS À ALTERNER : {FORMATS}
{("CHOIX DES SUJETS : " + acc["idea_rules"]) if acc.get("idea_rules") else ""}

VIDÉOS DÉJÀ PRÉVUES OU PUBLIÉES SUR CE COMPTE (interdiction de reprendre le même sujet ou le même angle) :
{recent}

Génère exactement {n} idées de vidéos TikTok de {duration} secondes, toutes différentes entre elles.

OBJECTIF : des vidéos que des MILLIONS de personnes regardent jusqu'au bout, partagent et commentent, y compris des gens
qui ne s'intéressent pas du tout à ce thème au départ. Pour chaque idée, applique ces règles d'attention :
1. UNIVERSEL : un sujet qui touche presque tout le monde (ses courses, son salaire, son téléphone, ses abonnements,
   ses vacances, les marques qu'on connaît : Apple, McDonald's, Netflix, Amazon, IKEA, Zara, Ryanair, Tesla, Nike...).
2. ÉCART DE CURIOSITÉ : le hook pose une question ou une promesse dont la réponse n'est PAS devinable, et que le
   spectateur veut absolument connaître (« Pourquoi X fait Y alors que Z ? »). Jamais de hook qui donne déjà la réponse.
3. ENJEU PERSONNEL : « ça me concerne » en 3 secondes (mon argent, mes économies, un piège dans lequel je tombe).
4. ÉMOTION FORTE : surprise, injustice, indignation, peur de rater quelque chose, satisfaction de comprendre un secret.
5. HISTOIRE VRAIE ET SURPRENANTE quand c'est possible (chiffres et faits vérifiés), plutôt qu'un cours théorique.
6. UNE seule idée par vidéo, expliquée si simplement qu'un enfant de 12 ans comprend.
7. Pour chaque idée, imagine d'abord 3 hooks différents et garde le plus puissant.
8. Varie les formats d'une idée à l'autre pour garder la chaîne vivante.
Pour chaque idée :
- subject : le sujet précis (pas un thème vague) ;
- angle : l'angle original qui la rend unique (1 phrase) ;
- hook : la toute première phrase dite à voix haute, très accrocheuse, max 15 mots, qui crée une tension ou une curiosité immédiate (sans mentir) ;
- title : titre TikTok optimisé recherche, max 70 caractères ;
- description : légende TikTok de 1 à 2 phrases qui finit par une question pour faire commenter ;
- hashtags : 4 à 6 hashtags précis liés au sujet ;
- visual_idea : l'idée visuelle principale de la vidéo (ambiance, décor, personnage).

RECHERCHE (si tu as l'outil de recherche web) : fais 2 ou 3 recherches rapides pour trouver ce qui intéresse les gens
EN CE MOMENT (actualité, polémiques, records, marques dans le viseur, tendances TikTok du thème, anecdotes de personnes
célèbres) et des chiffres récents. Appuie-toi dessus pour proposer des idées concrètes, actuelles et vérifiables."""
    data = llm.generate_json(SYSTEM, prompt, IDEAS_SCHEMA, task=f"ideas:{acc['id']}:{n}", research=True)
    return [i for i in data.get("ideas", []) if i.get("subject") and i.get("hook")]


# ------------------------------------------------------------------ scripts / scènes

def voice_rate(acc: dict) -> int:
    return int(re.sub(r"[^\d-]", "", acc["voice"]["rate"]) or 0)


def word_range(acc: dict, duration: int) -> tuple[int, int]:
    """Nombre de mots qui tient dans la durée voulue, selon le débit de la voix du compte."""
    wps = WORDS_PER_SECOND * (1 + voice_rate(acc) / 100)
    target = duration * wps
    return int(target * 0.9), int(target * 1.05)


def estimate_duration(scenes: list[dict], rate_pct: int = 0) -> float:
    words = sum(len(s.get("voice", "").split()) for s in scenes)
    return round(words / (WORDS_PER_SECOND * (1 + rate_pct / 100)) + 0.25 * len(scenes), 1)


def generate_scripts(video_ids: list[int], progress: Callable[[int, str], None]) -> int:
    done = 0
    for i in range(0, len(video_ids), SCRIPTS_BATCH):
        batch = [v for v in (db.get_video(x) for x in video_ids[i:i + SCRIPTS_BATCH]) if v]
        progress(int(done / max(len(video_ids), 1) * 100), f"Scripts {done}/{len(video_ids)}...")
        try:
            results = _ask_scripts(batch)
        except llm.LLMError:
            if len(batch) == 1:
                raise
            results = {}
            for v in batch:  # on réessaie une par une
                results.update(_ask_scripts([v]))
        for v in batch:
            scenes = results.get(v["id"])
            if not scenes:
                continue
            save_script(v, scenes)
            done += 1
    progress(100, f"{done} scripts prêts")
    return done


def save_script(video: dict, scenes: list[dict]) -> None:
    acc = get_account(video["account"])
    scenes = [
        {
            "voice": s["voice"].strip(),
            "on_screen": s.get("on_screen", "").strip(),
            "visual": s.get("visual", "").strip(),
            "image_prompt": s.get("image_prompt", "").strip(),
            "emphasis": [e for e in s.get("emphasis", []) if e][:2],
            "tone": s.get("tone") or "normal",
        }
        for s in scenes if s.get("voice", "").strip()
    ]
    rate = voice_rate(acc)
    upd = {
        "scenes": scenes,
        "script": "\n\n".join(s["voice"] for s in scenes),
        "duration_est": estimate_duration(scenes, rate),
        "error": None,
    }
    if video["status"] in ("idee", "erreur", "script"):
        upd["status"] = "script"
    db.update("videos", video["id"], upd)


def _ask_scripts(videos: list[dict]) -> dict[int, list[dict]]:
    acc = get_account(videos[0]["account"])
    blocks = []
    for v in videos:
        dur = v["duration_target"] or 70
        lo, hi = word_range(acc, dur)
        n_scenes = max(5, round(dur / acc.get("scene_seconds", 6)))
        blocks.append(
            f"[ref={v['id']}] Sujet : {v['subject']}\nAngle : {v['angle']}\nHook (1re phrase, mot pour mot) : "
            f"{v['hook']}\nIdée visuelle : {v['visual_idea']}\nDurée visée : {dur} secondes → voix off de {lo} à {hi} mots "
            f"AU TOTAL (toutes scènes confondues, jamais plus de {hi}), en {n_scenes} scènes environ."
        )
    mascot = (
        "\n- FORMAT « UNE IMAGE PAR PHRASE » : chaque scène = UNE seule phrase courte (5 à 15 mots), et chaque scène a sa "
        "propre image qui montre EXACTEMENT ce que dit la phrase. L'image change donc toutes les 2 à 4 secondes."
        "\n- Le héros de TOUTES les images est Panda Boss (sa description est ajoutée automatiquement, ne la répète pas)."
        "\n- image_prompt (anglais, 25 à 45 mots) = une vraie scène de dessin animé qui raconte la phrase : un décor précis "
        "(bureau de PDG, jet privé, banque, rue, plateau télé...), ce que fait Panda Boss et son expression (malin, choqué, "
        "fier, haussant les épaules...), les autres personnages s'il y en a (contrôleur des impôts furieux, foule de gens "
        "pauvres, banquier, client...), et des objets qui racontent l'histoire SANS AUCUN MOT : le générateur d'images "
        "écrit mal, donc INTERDIT d'écrire du texte, des chiffres ou des étiquettes dans l'image. Raconte avec des "
        "symboles visuels : sacs de pièces d'or, montagne de billets, coffre-fort, facture géante blanche, jet privé, "
        "tirelire cassée, graphique flèche montante, menottes, balance, cadenas, sablier..."
        "\n- ÉMOTION OBLIGATOIRE : chaque image_prompt précise l'expression et la posture de Panda Boss, très lisibles "
        "(sly smirk with half-closed eyes, wide-eyed shocked with jaw dropped, furious frowning, laughing out loud, "
        "worried sweating, proud chin up, shrugging innocently, winking...). Varie-les d'une scène à l'autre. "
        "Panda Boss est toujours dessiné EN PIED (du haut de la tête aux pieds) pour garder sa silhouette. "
        "Ex : 'Panda Boss standing proudly on top of a giant mountain of gold coins, shrugging innocently with a sly "
        "smirk, a crowd of poor ragged people looking up at him from below'. "
        "Ex : 'Panda Boss wide-eyed and shocked, jaw dropped, while an angry red-faced tax inspector shouts and pushes "
        "a giant blank bill toward him, coins scattering on the floor'."
        "\n- on_screen : laisse vide (les sous-titres suffisent)." if acc.get("mascot") else ""
    )
    prompt = f"""COMPTE : {acc['label']}
PERSONA / TON :
{acc['persona']}

STRUCTURE À SUIVRE :
{acc['structure']}

Écris le script complet, découpé scène par scène, pour chacune des vidéos suivantes :

{chr(10).join(blocks)}

Règles :
- La scène 1 commence EXACTEMENT par le hook.
- voice : {"UNE seule phrase courte" if acc.get("mascot") else "1 à 3 phrases"} lue(s) par la voix off. Écris EXACTEMENT comme quelqu'un qui raconte une histoire à un pote, à l'oral :
  pas d'emojis, pas de listes, pas de parenthèses, pas d'abréviations (€, %, M€, k€, 1er, x2) ;
  ARRONDIS les chiffres comme le ferait un humain (« près de deux pour cent » plutôt que « 1,73 % »,
  « trois millions » plutôt que « 3 012 450 € »), au maximum un chiffre par phrase, et écris-les en lettres
  (« cent euros par mois », « sept pour cent », « deux mille vingt-six ») ;
  tournures naturelles et vivantes (« Et là… », « Le problème ? », « Tu vois le truc ? »), sans en abuser.
  ÉCRIS POUR ÊTRE JOUÉ PAR UN NARRATEUR, pas lu : la ponctuation pilote la voix. Utilise « … » pour un suspense ou une
  respiration, « ? » pour une vraie question qui monte, « ! » pour un moment fort, une virgule pour chaque respiration.
  Alterne phrases très courtes (« Mauvaise idée. ») et phrases un peu plus longues pour casser la monotonie.
  Les mots clés sur lesquels la voix doit appuyer vont dans emphasis (1 ou 2 par phrase : le mot qui porte le sens,
  un chiffre, un contraste). Mets le mot le plus important vers la FIN de la phrase.
- Relance la curiosité au milieu de la vidéo pour garder l'attention jusqu'au bout.
{"" if acc.get("mascot") else "- on_screen : texte court affiché en grand à l'écran pour cette scène (max 6 mots : chiffre clé, mot fort, question). Chaîne vide si la scène n'en a pas besoin. Au moins une scène sur deux en a un." + chr(10)}- visual : description en français de ce qu'on voit à l'écran.
- image_prompt : description EN ANGLAIS de l'image à générer pour cette scène{"" if acc.get("mascot") else " (max 25 mots)"}.{mascot}
- emphasis : 1 à 2 mots exacts de la phrase sur lesquels la voix appuie (et qui sont mis en couleur dans les sous-titres).
- tone : comment la voix doit lire la phrase, pour une narration vivante et JAMAIS monotone : "accroche" (scène 1),
  "energique" (révélation, chiffre fort), "suspense" (avant un retournement, phrase qui fait attendre la suite),
  "grave" (vérité dure, injustice), "question" (question au spectateur), "chute" (conclusion, phrase-clé), "normal".
  Varie-les : jamais 3 fois le même ton d'affilée. L'appel à s'abonner est toujours en "energique", la phrase finale
  de conclusion en "chute".
{f"- La dernière scène se termine par : « {acc['disclaimer']} »" if acc.get('disclaimer') else ''}
- RECHERCHE (si tu as l'outil de recherche web) : avant d'écrire, vérifie sur le web chaque chiffre, taux, date, citation
  ou histoire que tu utilises (sources fiables), et utilise les valeurs ACTUELLES. N'invente rien.
Renvoie un objet par vidéo avec son ref."""
    data = llm.generate_json(SYSTEM, prompt, SCRIPTS_SCHEMA, task=f"scripts:{acc['id']}:" + ",".join(str(v["id"]) for v in videos),
                             research=True)
    out: dict[int, list[dict]] = {}
    by_id = {v["id"]: v for v in videos}
    for s in data.get("scripts", []):
        ref = int(s.get("ref", 0))
        if s.get("scenes") and ref in by_id:
            out[ref] = _fit_length(acc, by_id[ref], s["scenes"])
    return out


def _fit_length(acc: dict, video: dict, scenes: list[dict]) -> list[dict]:
    """Si le script dépasse nettement la durée voulue, on demande une version resserrée (1 fois)."""
    lo, hi = word_range(acc, video["duration_target"] or 70)
    words = sum(len(s.get("voice", "").split()) for s in scenes)
    if words <= hi * 1.12:
        return scenes
    prompt = (
        f"Ce script TikTok fait {words} mots, il doit en faire entre {lo} et {hi} (durée {video['duration_target']} s). "
        "Resserre-le : garde le hook mot pour mot, la structure, les meilleures phrases et la chute ; "
        "fusionne ou supprime des scènes si besoin. Garde le même format JSON (ref, scenes).\n\n"
        + json.dumps({"ref": video["id"], "scenes": scenes}, ensure_ascii=False)
    )
    try:
        data = llm.generate_json(SYSTEM, prompt, SCRIPTS_SCHEMA, task=f"scripts:{acc['id']}:{video['id']}")
        shorter = next((s["scenes"] for s in data.get("scripts", []) if s.get("scenes")), None)
    except llm.LLMError:
        shorter = None
    return shorter or scenes
