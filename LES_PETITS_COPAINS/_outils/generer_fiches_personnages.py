# -*- coding: utf-8 -*-
"""Génère les fiches texte des personnages (identité, voix, prompt maître) + la bible."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from art import CHARS, ORDER  # noqa: E402
from common import ROOT  # noqa: E402
from generer_contenus import LOCKS, STYLE, NEG  # noqa: E402

PERSO = {
    "milo": dict(
        age="Équivalent 4 ans", role="Personnage principal et mascotte. Ouvre et ferme la plupart des vidéos, présente les chansons.",
        perso="Courageux, drôle, enthousiaste, protecteur. Toujours le premier à essayer quelque chose de nouveau ; rassure les autres quand ils ont peur.",
        defaut="Un peu impatient : il veut tout faire tout de suite (ressort comique).",
        aime="Le soleil, sauter, les fraises, faire rire ses copains.",
        replique="« Coucou les copains ! » / « Grrr… hop ! »",
        pas="Le saut du lion (s'accroupir, « grrr », sauter bras en l'air)",
        voix="Voix d'enfant (garçon) pétillante, aiguë mais pas criarde, rire franc. Chant juste, énergique.",
        mouvement="Bondissant, rebonds généreux, crinière qui suit le mouvement avec un léger retard.",
        interdit="Ne jamais le montrer agressif ou effrayant ; son « grrr » est toujours mignon. Pas de dents pointues."),
    "luna": dict(
        age="Équivalent 4 ans", role="Chansons magiques, émotions, berceuses et histoires du soir.",
        perso="Douce, rêveuse, imaginative, gentille. Elle remarque quand quelqu'un est triste et trouve les mots pour consoler.",
        defaut="Un peu tête en l'air : elle rêvasse et rate parfois le début du jeu.",
        aime="La lune, les étoiles, les nuages en forme d'animaux, chanter tout bas.",
        replique="« Fais de beaux rêves, petit cœur. »",
        pas="La pirouette magique (tourner sur soi, traînée d'étincelles)",
        voix="Voix féminine douce et chaleureuse, légèrement aérienne, très proche du micro pour les berceuses.",
        mouvement="Fluide, léger, flotte presque ; ailes qui scintillent doucement (jamais de vol rapide).",
        interdit="Jamais d'autres couleurs de crinière que rose/violet/turquoise ; la corne reste dorée et petite."),
    "bibou": dict(
        age="Équivalent 3 ans", role="Chansons amusantes, comptines du quotidien (repas, bain, ferme, rangement).",
        perso="Gourmand, rigolo, câlin, maladroit. Il fait des bêtises tendres dont il rit lui-même.",
        defaut="Gourmand : il goûte tout en cachette (sans jamais être puni ou moqué méchamment).",
        aime="Le miel, les câlins, les siestes, les animaux de la ferme.",
        replique="« Miam ! » / « Oups… hi hi ! »",
        pas="Le dandin du nounours (mains sur les hanches, faire tourner son ventre)",
        voix="Voix ronde, un peu grave pour un enfant, gourmande et rieuse.",
        mouvement="Lourdaud et moelleux, se dandine, petites chutes sans gravité (comique doux).",
        interdit="Ne jamais se moquer de sa corpulence ; la gourmandise est un trait attachant, pas une leçon de régime."),
    "pipo": dict(
        age="Équivalent 4 ans", role="Chansons pour apprendre, danser et découvrir (sciences, espace, nature, mouvements).",
        perso="Curieux, énergique, joueur, aventurier. Pose des questions sur tout, entraîne les autres dans ses projets.",
        defaut="Il bouge tout le temps et a du mal à attendre son tour.",
        aime="Les fusées, les fêtes, explorer, faire « Rooar ! » (tout doux).",
        replique="« Rooar ! Rigolo ! » / « On y va ? »",
        pas="Le boum du dino (taper des pieds en rythme)",
        voix="Voix vive, rapide, légèrement aiguë, rire en cascade.",
        mouvement="Vif, nerveux, sautille ; queue qui balance comme un métronome.",
        interdit="Jamais effrayant : pas de crocs, pas de griffes, « Rooar » mignon. Épines toujours turquoise/jaune et arrondies."),
    "nounou": dict(
        age="Équivalent 5 ans (la « grande » de la bande)", role="Apprentissage : chiffres, couleurs, formes, lettres, routines (dents, rangement).",
        perso="Calme, intelligente, gentille, attentive. Explique avec patience, félicite toujours.",
        defaut="Un peu perfectionniste : elle aime que tout soit bien rangé (et finit par en rire).",
        aime="Compter, ranger, les carottes, apprendre de nouvelles choses.",
        replique="« Bravo, tu as réussi ! »",
        pas="Les oreilles qui volent (battre des bras, les oreilles se soulèvent)",
        voix="Voix claire et posée, diction parfaite, ton encourageant (idéale pour les contenus éducatifs).",
        mouvement="Posé, précis, gestes de démonstration lisibles ; oreilles qui ballottent doucement.",
        interdit="La salopette bleue à boutons jaunes est permanente : jamais retirée ni changée de couleur."),
}


def fiche(k):
    c = CHARS[k]
    p = PERSO[k]
    n = c["name"]
    swatches = [("Base fourrure", c["base"]), ("Lumière", c["light"]), ("Ombre", c["shade"]), ("Contour", c["line"]),
                ("Ventre / museau", c["belly"]), ("Coussinets / sabots", c["pad"]), ("Yeux (iris)", c["eye"]),
                ("Nez", c["nose"]), ("Joues", c["cheek"])]
    M, L, PI, NO = CHARS["milo"], CHARS["luna"], CHARS["pipo"], CHARS["nounou"]
    extra = {"milo": [("Crinière", M["mane"]), ("Crinière lumière", M["mane_l"]), ("Crinière ombre", M["mane_s"])],
             "luna": [("Mèche rose", L["pink"]), ("Mèche violette", L["violet"]), ("Mèche turquoise", L["turq"]),
                      ("Corne", L["horn"]), ("Ailes", L["wing"])],
             "pipo": [("Épines A", PI["spikes"][0]), ("Épines B", PI["spikes"][1])],
             "nounou": [("Salopette", NO["overall"]), ("Boutons", NO["button"]), ("Intérieur oreilles", NO["ear_in"])],
             "bibou": []}[k]
    pal = "\n".join(f"| {a} | `{b}` |" for a, b in swatches + extra)
    return f"""# {n} — {c['espece']} · Fiche d'identité officielle

![{n}]({k}_illustration_officielle.png)

## Identité
| | |
|---|---|
| Nom | **{n}** |
| Espèce | {c['espece']} |
| Âge (ressenti) | {p['age']} |
| Rôle | {p['role']} |
| Personnalité | {p['perso']} |
| Petit défaut attachant | {p['defaut']} |
| Aime | {p['aime']} |
| Réplique signature | {p['replique']} |
| Pas de danse signature | {p['pas']} |
| Voix | {p['voix']} |
| Façon de bouger | {p['mouvement']} |

## Proportions (verrouillées)
- Hauteur totale = **1 unité** ; tête = **55 %** de la hauteur (style « chibi »), corps = 30 %, jambes = 15 %.
- Yeux grands, écartés, placés juste sous le milieu de la tête ; deux reflets blancs (un grand en haut à gauche, un petit en bas à droite).
- Bras courts arrondis (n'atteignent pas le sommet de la tête même levés), pas de doigts visibles : pattes arrondies avec coussinets.
- Contour doux de la couleur « Contour » (jamais noir pur).

## Palette verrouillée
| Élément | Couleur |
|---|---|
{pal}

## À ne JAMAIS faire
- {p['interdit']}
- Changer les couleurs, ajouter des vêtements ou accessoires permanents, modifier la forme des oreilles/yeux, ajouter des doigts.
- Le montrer dans une situation dangereuse, effrayante ou de moquerie.
- Accessoires **temporaires** autorisés quand l'histoire l'exige (chapeau de fête, brosse à dents, pinceau), retirés ensuite.

## Fichiers de référence (dans ce dossier)
| Fichier | Usage |
|---|---|
| `{k}_illustration_officielle.png` | Visuel officiel 1600×1600 (réseaux, présentation) |
| `{k}_vue_face.png` · `{k}_vue_profil.png` · `{k}_vue_dos.png` | Vues sur fond blanc = **images de référence à joindre aux IA** |
| `{k}_vue_face_transparent.png` | Détourage pour montage/miniatures |
| `{k}_planche_rotation.png` | Turnaround face/profil/dos avec repères de proportions |
| `{k}_expressions.png` | 8 expressions officielles |
| `{k}_poses.png` | 6 poses de référence |
| `{k}_fiche_identite.png` | Fiche visuelle avec palette |
| `PROMPT_MAITRE.md` | Prompt de reproduction à utiliser tel quel |
"""


def prompt_maitre(k):
    n = CHARS[k]["name"]
    return f"""# Prompt maître — {n}

> À coller **mot pour mot** dans chaque génération, avec au moins 2 images de référence de ce dossier
> (`{k}_vue_face.png` + `{k}_planche_rotation.png`). Ne jamais paraphraser : la répétition exacte garantit la cohérence.

## Verrou du personnage
```
{LOCKS[k]}
```

## Prompt complet — portrait officiel
```
{STYLE}.
{LOCKS[k]}.
Full body, front view, standing, joyful open smile, waving hello with one paw, plain soft pastel background, centered composition, no text.
```

## Prompt complet — planche de personnage (character sheet)
```
{STYLE}.
Character turnaround sheet of {LOCKS[k]}.
Three views side by side on pure white background: front view, side view facing right, back view. Same scale, same height, neutral pose, soft smile, consistent design across views, no text.
```

## Prompt complet — expressions
```
{STYLE}.
Expression sheet of {LOCKS[k]}.
Grid of 8 head close-ups on white background: gentle smile, joyful open smile, laughing with closed eyes, wink, surprised, sad with a small tear, asleep, mildly grumpy pout. Same design in every cell, no text.
```

## Prompt négatif
```
{NEG}
```

## Astuces de cohérence par outil
- **Gemini (Nano Banana) / GPT Image** : joindre les références et écrire « Garde exactement le même personnage que sur les images jointes ».
- **Midjourney** : utiliser les références de personnage (`--cref` / *Omni Reference* selon la version) + ce prompt ; poids de référence élevé.
- **Kling / Runway / Veo (image → vidéo)** : toujours partir d'une image fixe validée de la scène, jamais d'un texte seul.
- **Flux / Stable Diffusion** : entraîner un petit modèle LoRA sur les 20+ images officielles (vues + poses + expressions).
"""


def bible():
    rows = "\n".join(f"| **{CHARS[k]['name']}** | {CHARS[k]['espece']} | {PERSO[k]['role']} | {PERSO[k]['pas']} | {PERSO[k]['replique']} |" for k in ORDER)
    return f"""# BIBLE DES PERSONNAGES — Tralalune

![Line-up](lineup_echelle_officielle.png)

## La bande des copains
| Personnage | Espèce | Rôle | Pas de danse | Réplique |
|---|---|---|---|---|
{rows}

## Dynamique du groupe
- **Milo** entraîne, **Nounou** explique, **Pipo** questionne et bouge, **Bibou** fait rire, **Luna** apaise et fait rêver.
- Paires récurrentes : Milo & Pipo (énergie, aventure) · Luna & Nounou (calme, apprentissage) · Bibou & Pipo (duo comique).
- Aucun personnage n'est jamais méchant, moqué ou exclu. Les petits conflits se règlent en moins de 20 secondes, avec un câlin ou un rire.
- **Ordre officiel** sur les plans de groupe (de gauche à droite) : Luna, Bibou, **Milo (centre, devant)**, Pipo, Nounou.

## Règles de cohérence absolue
1. Les fichiers de `02_PERSONNAGES/` sont la **seule référence**. Toute image générée est comparée à la planche de rotation avant validation.
2. Les couleurs hexadécimales des fiches sont verrouillées. Elles sont définies une seule fois dans `_outils/art.py`.
3. Proportions chibi : tête = 55 % de la hauteur pour les 5 personnages ; Milo est le plus grand (crinière), Bibou le plus large.
4. Seule Nounou porte un vêtement (salopette bleue). Les autres ne portent rien, hors accessoires temporaires.
5. Un plan raté (doigts en trop, couleur fausse, corne mal placée…) est **régénéré**, jamais publié.
6. Les voix sont attribuées une fois pour toutes (même modèle de voix / même réglage) et notées dans `08_PROMPTS/WORKFLOW_PRODUCTION.md`.

## Évolution sur plusieurs années (sans casser la marque)
- Saison 2 : nouveaux décors de l'île (plage, forêt, montagne enneigée), personnages secondaires (ex. une petite tortue facteur, des lucioles), toujours avec la même grammaire visuelle.
- Saisons spéciales : Noël, Halloween « tout doux », été — en accessoires temporaires uniquement.
- Déclinaisons possibles : livres, peluches, coloriages, version anglaise (« Tralalune » reste prononçable partout).
"""


if __name__ == "__main__":
    for k in ORDER:
        d = os.path.join(ROOT, "02_PERSONNAGES", k.upper())
        open(os.path.join(d, "FICHE_IDENTITE.md"), "w").write(fiche(k))
        open(os.path.join(d, "PROMPT_MAITRE.md"), "w").write(prompt_maitre(k))
    open(os.path.join(ROOT, "02_PERSONNAGES", "BIBLE_PERSONNAGES.md"), "w").write(bible())
    print("Fiches personnages écrites.")
