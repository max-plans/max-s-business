"""THÈME → IDÉE → HOOK → SCRIPT → SCÈNES : calendrier éditorial et scripts."""
from __future__ import annotations

import datetime as dt
import json
import re
import unicodedata
from typing import Callable

from . import characters, db, llm, settings
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
                    "key_fact": {"type": "string"},
                    "sources": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["subject", "angle", "hook", "title", "description", "hashtags", "visual_idea",
                             "key_fact", "sources"],
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
                    "sources": {"type": "array", "items": {"type": "string"}},
                    "characters": {"type": "array", "items": {
                        "type": "object",
                        "properties": {"name": {"type": "string"}, "description": {"type": "string"}},
                        "required": ["name", "description"], "additionalProperties": False}},
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
                                                                   "question", "chute", "normal", "surprise",
                                                                   "enerve", "ironique"]},
                                "with_panda": {"type": "boolean"},
                                "pose": {"type": "string", "enum": ["", "content", "malin", "surpris", "enerve",
                                                                   "reflechit", "riche"]},
                                "characters": {"type": "array", "items": {"type": "string"}},
                            },
                            "required": ["voice", "on_screen", "visual", "image_prompt", "emphasis", "tone", "with_panda",
                                         "pose", "characters"],
                            "additionalProperties": False,
                        },
                    },
                },
                "required": ["ref", "sources", "characters", "scenes"],
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
                "sources": _sources(idea.get("sources"), idea.get("key_fact", "")),
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

FORMATS À ALTERNER : {acc.get("formats") or FORMATS}
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
5. CONCRET ET VÉRIFIÉ : des faits et des chiffres vrais ; suis les règles de CHOIX DES SUJETS du compte (technique, histoire...).
6. UNE seule idée par vidéo, expliquée si simplement qu'un enfant de 12 ans comprend.
7. Pour chaque idée, imagine d'abord 3 hooks différents et garde le plus puissant.
   Le hook doit faire arrêter le pouce en 2 secondes. Formules qui marchent (adapte-les, ne les copie pas) :
   un fait choc chiffré (« Ce milliardaire paie moins d'impôts que sa secrétaire. »), un paradoxe (« Plus tu gagnes,
   moins tu paies… et c'est légal. »), une question qui touche le spectateur (« Tu sais combien ta banque gagne sur
   ton dos chaque année ? »), une histoire qui commence au milieu de l'action (« En 1990, un homme achète une pizza
   avec 10 000 bitcoins. »), un secret (« Les supermarchés ne veulent pas que tu saches ça. »).
   Interdits : hook mou ou générique (« Aujourd'hui on va parler de… », « Voici 3 astuces… »), hook qui donne la réponse.
9. VÉRITÉ ABSOLUE : chaque idée repose sur un fait RÉEL et vérifiable (key_fact) que tu as confirmé par une recherche,
   avec au moins une source fiable (presse reconnue, site officiel, étude). Pas de rumeur, pas de légende urbaine, pas
   de chiffre inventé ou approximé au point d'être faux. Si tu ne peux pas vérifier un fait, choisis une autre idée.
8. Varie les formats d'une idée à l'autre pour garder la chaîne vivante.
Pour chaque idée :
- subject : le sujet précis (pas un thème vague) ;
- angle : l'angle original qui la rend unique (1 phrase) ;
- hook : la toute première phrase dite à voix haute, très accrocheuse, max 15 mots, qui crée une tension ou une curiosité immédiate (sans mentir) ;
- title : titre TikTok optimisé recherche, max 70 caractères ;
- description : légende TikTok de 1 à 2 phrases qui finit par une question pour faire commenter ;
- hashtags : 4 à 6 hashtags précis liés au sujet ;
- visual_idea : l'idée visuelle principale de la vidéo (ambiance, décor, personnage) ;
- key_fact : LE fait vrai et surprenant au cœur de la vidéo, en une phrase, avec le chiffre exact et sa date ;
- sources : 1 à 3 liens (URL complètes) qui prouvent ce fait (liste vide seulement si tu n'as pas d'outil de recherche).

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


def _names(v) -> list[str]:
    if isinstance(v, str):
        v = v.split(",")
    return [str(x).strip() for x in (v or []) if str(x).strip()][:2]


def _sources(urls, fact: str = "") -> list[dict]:
    """[{fact, url}] : les faits clés et leurs sources, affichés dans l'app pour que tu puisses vérifier."""
    out = [{"fact": fact.strip(), "url": ""}] if fact and fact.strip() else []
    for u in urls or []:
        u = str(u).strip()
        if u.startswith("http") and all(x["url"] != u for x in out):
            if out and not out[0]["url"]:
                out[0]["url"] = u
            else:
                out.append({"fact": "", "url": u})
    return out[:6]


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
            "with_panda": bool(s.get("with_panda", True)) and "panda" in s["voice"].lower(),
            "characters": [] if ("panda" in s["voice"].lower() and s.get("with_panda", True)) else _names(s.get("characters")),
            "pose": s.get("pose") or "",
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
        "\n- Le héros est Panda Boss (sa description est ajoutée automatiquement, ne la répète pas)."
        "\n- LE PANDA À LA 3e PERSONNE (signature de la chaîne, obligatoire) : le narrateur raconte ce que fait « le "
        "panda » ; le panda ne parle jamais lui-même et on ne dit jamais « je » à sa place. Au moins une phrase sur trois "
        "parle du panda. Le panda ne fait PAS comme tout le monde et il est plus malin que les autres : au moins 2 fois "
        "dans la vidéo, oppose clairement ce que fait tout le monde (ou toi, le spectateur) et ce que fait le panda "
        "(« Tout le monde vend. Le panda, lui, emprunte. », « Toi, tu paies plein pot. Le panda, lui, ne paie jamais "
        "le prix affiché. »). Montre son intelligence par ses actes et son calme (il attend, il sourit, il a déjà "
        "compris), jamais par de la vantardise. La chute revient au panda (« Et c'est pour ça que le panda, lui, "
        "dort tranquille. »)."
        "\n- with_panda : true UNIQUEMENT si la phrase de la scène parle du panda (le mot « panda » y est). Sinon false, "
        "et l'image montre des HUMAINS (jamais de panda). N'écris le mot panda dans l'image_prompt QUE si with_panda = true."
        "\n- DES HUMAINS DANS CHAQUE IMAGE : chaque image SANS panda montre 1 personnage humain de dessin animé (2 au grand maximum) bien visible "
        "(visage expressif, corps entier en pied, les pieds au sol ; jamais plus de 2 personnages au total, jamais de foule, "
        "de visages dans le décor, de têtes seules ni de gens en arrière-plan). RÈGLE ABSOLUE : quand with_panda = true, le panda est "
        "SEUL dans l'image, sans AUCUN autre personnage (ni humain, ni animal, ni foule) : l'image_prompt décrit seulement "
        "le décor et les objets autour de lui, et characters est vide. "
        "pose (OBLIGATOIRE si with_panda = true, sinon chaîne vide) = l'expression et la posture du panda qui collent au "
        "SENS et à l'ÉMOTION de la phrase (jamais la même pose 2 fois d'affilée) : "
        "content (sûr de lui, satisfait), malin (il a un secret, un plan), surpris (révélation, chiffre fou), enerve "
        "(injustice, arnaque), reflechit (question, il calcule), riche (il gagne, il encaisse). Images "
        "sympathiques et jamais choquantes : pas de violence, de sang, de peur ni de scène dérangeante, même pour parler "
        "d'arnaque ou de prison. Varie-les : employé, client, banquier, "
        "patron, caissière, famille, milliardaire... Jamais d'image sans personne."
        "\n- PERSONNAGES UNIQUES : il n'existe qu'UN panda, Panda Boss (jamais deux pandas dans la même image, jamais "
        "de foule de pandas, de peluche ou d'affiche de panda). Tout autre personnage est humain. Chaque personnage "
        "non-panda qui apparaît (Madoff, un banquier récurrent, un patron...) doit être déclaré UNE fois dans « characters » "
        "de la vidéo : name (nom court, ex. « Madoff ») + description EN ANGLAIS, fixe et précise, de son apparence "
        "(âge, corps, visage, cheveux, vêtements, 2 signes distinctifs faciles à dessiner, ex. « Bernie Madoff, elderly man, "
        "slim, white thin hair, round glasses, grey suit, red tie »). Dans chaque scène, mets dans « characters » les noms "
        "des personnages non-panda présents (0 à 2) et, dans image_prompt, désigne-les UNIQUEMENT par leur nom, sans "
        "redécrire leur apparence (elle est ajoutée automatiquement, identique à chaque image, dans toutes les vidéos). "
        "Un personnage connu qui a déjà une fiche garde son nom exact. Jamais de foule ni de personnages en arrière-plan."
        "\n- L'IMAGE DOIT AVOIR DU SENS : elle montre ce que dit LA phrase de la scène, pas un décor joli. Quelqu'un qui "
        "coupe le son doit comprendre l'idée rien qu'en la voyant (sujet, action, objet clé, émotion de la phrase). Si la "
        "phrase est abstraite, trouve une métaphore visuelle simple et évidente (dette = boulet au pied, intérêts = boule de "
        "neige géante, inflation = billets qui rétrécissent). Une idée = un élément visuel clair, pas dix.\n"
        "\n- image_prompt (anglais, 25 à 45 mots) = une vraie scène de dessin animé qui raconte la phrase : un décor précis "
        "(bureau, jet privé, banque, rue, plateau télé...), ce que font les personnages et leur expression, et des objets "
        "qui racontent l'histoire SANS AUCUN MOT : le générateur d'images écrit mal, donc INTERDIT d'écrire du texte, des "
        "chiffres ou des étiquettes dans l'image. Raconte avec des symboles visuels : sacs de pièces d'or, montagne de "
        "billets, coffre-fort, facture géante blanche, jet privé, tirelire cassée, graphique flèche montante, menottes, "
        "balance, cadenas, sablier..."
        "\n- ZÉRO ERREUR D'ANATOMIE : le générateur dessine souvent des membres en trop ou manquants. Choisis des POSES "
        "SIMPLES ET LISIBLES : personnages debout ou assis, bras bien visibles et écartés du corps, UN ou DEUX personnages "
        "maximum au premier plan. ÉVITE : foules et gens en arrière-plan, bras croisés, "
        "mains qui tiennent de petits objets en gros plan, personnages qui se touchent ou se chevauchent, poses de dos ou "
        "très penchées. Cadre toujours les personnages EN PIED, en entier."
        "\n- STYLE « panda.finance » : fond bleu ciel uni et presque vide, personnages ÉNORMES au centre qui remplissent "
        "l'image, accessoires exagérés et très lisibles, petits traits de mouvement et étincelles."
        "\n- ÉMOTION : précise l'expression et la posture de chaque personnage, très lisibles (sly smirk with half-closed "
        "eyes, wide-eyed shocked with jaw dropped, furious frowning, laughing out loud, worried sweating, proud chin up, "
        "shrugging innocently, winking...). Varie-les d'une scène à l'autre."
        "\n- Ex avec panda : 'Panda Boss leaning casually against a stack of pink luxury suitcases in front of a grand hotel "
        "entrance, one hand in his pocket, sly half-closed eyes and a smug smile, plain sky-blue background'. "
        "Ex sans panda : 'a shocked young cashier in a red apron holding a giant shop receipt that unrolls to the floor, an "
        "angry customer in a blue coat pointing at it, plain sky-blue background'. "
        "Ex sans panda : 'Bernie Madoff, an elderly smiling man with white hair in a grey suit, standing alone, arms "
        "visible, holding open a big briefcase full of cash, a long line of tiny distant people holding envelopes behind him'."
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
- LES 3 PREMIÈRES SECONDES DÉCIDENT DE TOUT : scène 1 = le hook (choc, paradoxe ou question). Scène 2 = l'enjeu pour
  le spectateur (pourquoi ça le concerne, lui) ou un détail encore plus fort. Scène 3 = la promesse (« et la raison va
  te surprendre », « attends de voir comment il s'y prend »). Aucune phrase d'introduction, aucun contexte mou avant
  le hook. Les images des scènes 1 à 3 sont les plus spectaculaires de la vidéo.
- VÉRITÉ : tout ce qui est raconté est VRAI. Chiffres, dates, noms, citations, histoires : uniquement ce que tu as
  vérifié par une recherche dans des sources fiables, avec les valeurs actuelles. N'invente rien, n'exagère pas au
  point de rendre faux, n'attribue pas de citation incertaine. Si un détail n'est pas sûr, retire-le ou dis-le
  prudemment (« selon le magazine Forbes… »). Le panda est un personnage de fiction, mais les faits qu'il raconte
  sont réels. Mets dans « sources » les liens (URL complètes) qui prouvent les faits principaux du script.
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
- RÉTENTION (le plus important) : le spectateur doit avoir envie d'entendre la phrase suivante, à chaque phrase.
  Ouvre une boucle dès les 2 premières phrases (« et la raison va te surprendre », « attends la fin ») et ne la ferme
  qu'à la fin. Toutes les 3 ou 4 phrases, une micro-relance : « Sauf que… », « Et là, ça se complique. »,
  « Mais le pire, c'est ça. », « Et devine quoi ? ». Parle au spectateur (« toi », « tu ») au moins 3 fois.
  Les phrases s'enchaînent comme une histoire racontée d'un seul souffle : chaque phrase prolonge la précédente
  (« Du coup… », « Résultat ? », « Alors il… »), jamais une suite de phrases indépendantes.
  Mots simples et faciles à prononcer, pas de phrases tordues ni de suites de mots durs à articuler.
{"" if acc.get("mascot") else "- on_screen : texte court affiché en grand à l'écran pour cette scène (max 6 mots : chiffre clé, mot fort, question). Chaîne vide si la scène n'en a pas besoin. Au moins une scène sur deux en a un." + chr(10)}- visual : description en français de ce qu'on voit à l'écran.
- image_prompt : description EN ANGLAIS de l'image à générer pour cette scène{"" if acc.get("mascot") else " (max 25 mots)"}.{mascot}
- emphasis : 1 à 2 mots exacts de la phrase sur lesquels la voix appuie (et qui sont mis en couleur dans les sous-titres).
- tone : l'émotion avec laquelle la voix JOUE la phrase, comme un vrai conteur, jamais monotone : "accroche" (scène 1),
  "surprise" (révélation qui étonne : « Et là… il paie zéro euro ! »), "enerve" (injustice, arnaque, ça agace :
  « Et ça, c'est toi qui le paies ! »), "ironique" (moquerie légère, sous-entendu), "energique" (chiffre fort, rythme),
  "suspense" (juste avant un retournement), "grave" (vérité dure), "question" (question au spectateur), "chute"
  (conclusion), "normal". Choisis l'émotion qui colle VRAIMENT au sens de la phrase, et varie : jamais 3 fois le même
  ton d'affilée, au moins 2 « surprise » ou « enerve » par vidéo. L'appel à s'abonner est en "energique", la phrase
  finale de conclusion en "chute".
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
        for c in s.get("characters") or []:
            characters.register(c.get("name", ""), c.get("description", ""))
        if ref in by_id and s.get("sources"):
            old = by_id[ref].get("sources") or []
            db.update("videos", ref, {"sources": (old + _sources(s["sources"]))[:8]})
        if s.get("scenes") and ref in by_id:
            out[ref] = _panda_voice(acc, by_id[ref], _fit_length(acc, by_id[ref], s["scenes"]))
    return out


def _panda_voice(acc: dict, video: dict, scenes: list[dict]) -> list[dict]:
    """Compte à mascotte : si le panda est trop peu présent dans le texte, on demande une réécriture (1 fois)."""
    if not acc.get("mascot") or not scenes:
        return scenes
    mentions = sum(1 for sc in scenes if "panda" in sc.get("voice", "").lower())
    if mentions >= max(3, len(scenes) // 4):
        return scenes
    prompt = (
        f"Dans ce script, le panda n'apparaît que dans {mentions} phrase(s) sur {len(scenes)}. Réécris-le pour que le "
        "narrateur parle du panda à la 3e personne dans au moins une phrase sur trois (« Le panda, lui, ne fait pas "
        "comme tout le monde. »), avec au moins 2 oppositions « tout le monde / toi fait X, le panda, lui, fait Y » qui "
        "montrent qu'il est plus malin, et une chute qui revient au panda. Garde le hook mot pour mot, les faits, la "
        "longueur, le même nombre de scènes et le même format JSON (ref, sources, characters, scenes).\n\n"
        + json.dumps({"ref": video["id"], "sources": [], "characters": [], "scenes": scenes}, ensure_ascii=False)
    )
    try:
        data = llm.generate_json(SYSTEM, prompt, SCRIPTS_SCHEMA, task=f"scripts:{acc['id']}:{video['id']}:panda")
        better = next((x["scenes"] for x in data.get("scripts", []) if x.get("scenes")), None)
    except llm.LLMError:
        better = None
    return better or scenes


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
