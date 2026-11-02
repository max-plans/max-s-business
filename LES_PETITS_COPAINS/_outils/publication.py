# -*- coding: utf-8 -*-
"""
Prépare le dossier de PUBLICATION YouTube d'une vidéo produite par le studio :
titre, description avec chapitres réels, tags, hashtags, sous-titres des paroles (SRT, vrais temps),
textes du Short, paramètres et checklist de mise en ligne.

  python3 _outils/publication.py V01_bonjour_les_amis
"""
import json
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import ROOT  # noqa: E402
from videos_data import VIDEOS  # noqa: E402

HANDLE = "@Tralalune"
PLAYLISTS = {  # titre -> description (voir 09_SEO/PLAYLISTS_ET_MODELES_SEO.md)
    "Toutes les comptines de Tralalune 🌙": "Toutes les chansons de Milo le petit lion, Luna la petite licorne, Bibou le petit ourson, Pipo le petit dinosaure et Nounou le petit lapin ! Des comptines originales, douces et joyeuses pour les enfants de 0 à 6 ans, à chanter et à danser en famille, à la crèche ou en maternelle. 🎵",
    "Comptines du quotidien ☀️🪥": "Des chansons pour rendre les routines joyeuses : se réveiller, se brosser les dents, manger, ranger… Avec Milo, Luna, Bibou, Pipo et Nounou, les petits gestes de tous les jours deviennent un jeu ! 🌙",
    "Apprendre en chantant 🎨🔢": "Couleurs, chiffres, émotions, formes : des comptines éducatives pour les 2-6 ans, à chanter à la maison ou en maternelle, avec les copains de Tralalune. 🌙",
    "Chansons pour danser et bouger 💃": "Des chansons à gestes et à danser pour se dépenser en s'amusant avec Milo, Luna, Bibou, Pipo et Nounou : danse des animaux, dino-fête, jeu de la statue… 🎵",
    "Berceuses douces pour dormir 🌙": "Musiques calmes et berceuses avec Luna la petite licorne pour accompagner l'endormissement. Animation lente, sans flash, couleurs douces. Fais de beaux rêves ! 🌙",
    "Les animaux 🐮🦁": "Les chansons d'animaux de Tralalune : la ferme, la jungle, les dinosaures… Pour découvrir les animaux et leurs cris en chantant ! 🎵",
}


def ts(x):
    x = max(0, int(round(x)))
    return f"{x // 60}:{x % 60:02d}"


def srt_time(x):
    h, m, s = int(x // 3600), int(x % 3600 // 60), x % 60
    return f"{h:02d}:{m:02d}:{int(s):02d},{int(round((s % 1) * 1000)):03d}"


def main(vid):
    d = os.path.join(ROOT, "PRODUCTION_VIDEO", vid)
    p = json.load(open(os.path.join(d, "production.json"), encoding="utf-8"))
    tl = json.load(open(os.path.join(d, "RENDU", "timeline.json"), encoding="utf-8"))
    n = p.get("numero", int(vid[1:3]))
    v = next((x for x in VIDEOS if x["n"] == n), None) or dict(
        titre_yt=f"{p['titre']} | Tralalune", description_intro=p.get("description", p["titre"]),
        tags=["comptine pour enfants", "chanson pour enfants", "comptine bébé", "maternelle", "Tralalune"])
    out = os.path.join(d, "PUBLICATION")
    os.makedirs(out, exist_ok=True)

    # Chapitres : début réel de chaque section (≥ 10 s chacun, le premier à 0:00)
    starts = {}
    for pl in tl["plans"]:
        starts.setdefault(pl["si"], pl["t0"])
    chap = []
    for si, sec in enumerate(p["sections"]):
        if si not in starts:
            continue
        t = 0.0 if not chap else starts[si]
        label = sec.get("chapitre", sec["nom"])
        if chap and t - chap[-1][0] < 10:
            # trop proche : on garde la partie chantée plutôt qu'une pause instrumentale ou l'intro
            if len(chap) > 1 and chap[-1][2] == "instru":
                chap[-1] = (chap[-1][0], label, "chant")
            continue
        chap.append((t, label, "chant" if sec["lignes"] else "instru"))
    chapters = "\n".join(f"{ts(t)} {lab}" for t, lab, _ in chap)

    # Paroles complètes (version chantée)
    lyr = []
    for sec in p["sections"]:
        if sec["lignes"]:
            block = "\n".join(sec["lignes"])
            if any(block.startswith(b) or b.startswith(block) for b in lyr):
                continue  # refrain déjà écrit : une seule fois dans la description
            lyr.append(block)
    lyrics = "\n\n".join(lyr)

    titre = v["titre_yt"]
    desc = f"""{v['description_intro']}

🎵 Avec Milo le petit lion, Luna la petite licorne, Bibou le petit ourson, Pipo le petit dinosaure et Nounou le petit lapin.

⏱️ Chapitres :
{chapters}

📝 Paroles :
{lyrics}

🌙 Bienvenue à Tralalune, la petite île qui chante ! Des comptines originales, douces et joyeuses pour les 0-6 ans.
👉 Abonne-toi pour retrouver les copains : https://www.youtube.com/{HANDLE}

👨‍👩‍👧 Pour les parents : chanson, paroles et personnages originaux de Tralalune. Nous vous conseillons de regarder avec votre enfant et d'adapter le temps d'écran à son âge.
© Tralalune – Tous droits réservés.

#comptine #chansonpourenfants #Tralalune"""
    tags = ", ".join(v["tags"] + ["chanson pour bébé", "comptine maternelle", "chanson joyeuse enfant"])
    short_titre = p.get("short_titre", f"{p['titre']} 🎵 Le refrain avec les copains #comptine #Shorts")
    short_desc = p.get("short_description", f"Le refrain de « {p['titre']} » avec Milo, Luna, Bibou, Pipo et Nounou.\n"
                       "La chanson complète est sur la chaîne Tralalune 🌙\n\n#comptine #chansonpourenfants #Tralalune #Shorts")
    pls = p.get("playlists", ["Toutes les comptines de Tralalune 🌙"])

    open(os.path.join(out, "1_TITRE.txt"), "w", encoding="utf-8").write(titre + "\n")
    open(os.path.join(out, "2_DESCRIPTION.txt"), "w", encoding="utf-8").write(desc + "\n")
    open(os.path.join(out, "3_TAGS.txt"), "w", encoding="utf-8").write(tags + "\n")
    with open(os.path.join(out, "4_SOUS_TITRES_paroles_fr.srt"), "w", encoding="utf-8") as f:
        for i, l in enumerate(tl["lignes"], 1):
            f.write(f"{i}\n{srt_time(l['t0'])} --> {srt_time(l['t1'])}\n{l['txt']}\n\n")
    open(os.path.join(out, "5_SHORT_titre_et_description.txt"), "w", encoding="utf-8").write(
        f"TITRE DU SHORT :\n{short_titre}\n\nDESCRIPTION DU SHORT :\n{short_desc}\n")
    for src, dst in [(f"{vid}_1080p.mp4", "VIDEO_a_televerser.mp4"), (f"{vid}_SHORT_1080x1920.mp4", "SHORT_a_televerser.mp4"),
                     (f"{vid}_miniature_1280x720.png", "MINIATURE_1280x720.png")]:
        sp = os.path.join(d, "RENDU", src)
        if os.path.exists(sp):
            shutil.copy(sp, os.path.join(out, dst)) if dst.endswith(".png") else None
    guide = f"""# Publication YouTube — {p['titre']}

> Tous les textes sont prêts à copier-coller. Fichiers vidéo : `RENDU/{vid}_1080p.mp4` (vidéo) et `RENDU/{vid}_SHORT_1080x1920.mp4` (Short).

## ⚠️ À vérifier AVANT de publier
- [ ] La chanson a été générée **avec Suno Pro/Premier actif** (sinon : non commerciale → la régénérer avec Pro, me la redéposer, je relance le rendu). Capture d'écran du morceau + abonnement rangée dans `MUSIQUE/`.
- [ ] Vidéo regardée **en entier** : paroles affichées = paroles chantées, pas de décalage gênant (sinon : calage manuel 2 min avec `outils/calage_paroles.html`, puis nouveau rendu).
- [ ] Son agréable au casque et sur le haut-parleur d'un téléphone.

## Mise en ligne de la vidéo (studio.youtube.com → Créer → Importer des vidéos)
| Champ | Quoi mettre |
|---|---|
| Fichier | `RENDU/{vid}_1080p.mp4` |
| Titre | contenu de `1_TITRE.txt` : **{titre}** |
| Description | contenu de `2_DESCRIPTION.txt` (chapitres inclus, ils apparaîtront automatiquement) |
| Miniature | `MINIATURE_1280x720.png` (« Importer une miniature » ; nécessite un compte validé par téléphone) |
| Playlists | « Toutes les comptines de Tralalune » + « Comptines du quotidien » (créez-les avant si besoin) |
| **Audience** | **« Oui, elle est conçue pour les enfants »** (obligatoire) |
| Restriction d'âge | Non |
| Contenu sponsorisé | Non |

### « Plus d'options »
| Champ | Quoi mettre |
|---|---|
| Contenu modifié ou synthétique | **Non** (animation cartoon manifestement non réaliste ; la règle vise les contenus réalistes — relire l'aide YouTube si doute) |
| Tags | contenu de `3_TAGS.txt` |
| Langue de la vidéo | Français |
| Sous-titres | « Importer un fichier » → `4_SOUS_TITRES_paroles_fr.srt` → **Avec synchronisation** (paroles exactes, utiles aux parents et au référencement) |
| Licence | Licence YouTube standard |
| Autoriser l'intégration | Oui |
| Catégorie | Divertissement (ou Musique) |
| Commentaires | (désactivés automatiquement : contenu pour enfants) |

### Visibilité
- 1re vidéo : **Programmer** au jour/heure du plan (mercredi 10 h) ou publier ensemble les 3 vidéos du lancement.
- Écrans de fin et fiches : **indisponibles** pour le contenu pour enfants → rien à configurer.

## Mise en ligne du Short
| Champ | Quoi mettre |
|---|---|
| Fichier | `RENDU/{vid}_SHORT_1080x1920.mp4` (vertical, 49 s → reconnu automatiquement comme Short) |
| Titre / description | `5_SHORT_titre_et_description.txt` |
| Audience | **Conçu pour les enfants : Oui** |
| Vidéo associée | La vidéo complète « {p['titre']} », si l'option est proposée |
| Publication | 2 à 3 jours après la vidéo longue (le vendredi 18 h, selon le plan) |

## Après la publication
- [ ] Ajouter la vidéo dans les playlists et en vidéo « en vedette » de l'onglet Accueil si c'est la première.
- [ ] Noter dans `12_STATISTIQUES/tableau_de_bord_Tralalune.xlsx` (onglet Vidéos) : statut « Publiée », date, lien.
- [ ] Au bout de 7 jours : vues, impressions, taux de clic, durée moyenne → tableau de bord.
"""
    open(os.path.join(out, "GUIDE_PUBLICATION.md"), "w", encoding="utf-8").write(guide)
    pl_txt = "\n\n".join(f"**Playlist :**\n```\n{t}\n```\n**Description de la playlist** (seulement si vous la créez) :\n```\n{PLAYLISTS.get(t, '')}\n```" for t in pls)
    cc = f"""# À COPIER-COLLER — {p['titre']}

## 1. Titre de la vidéo
```
{titre}
```

## 2. Description de la vidéo
```
{desc}
```

## 3. Tags (Plus d'options)
```
{tags}
```

## 4. Playlist(s)
{pl_txt}

## 5. Cases à cocher
- Audience : ✅ « Oui, elle est conçue pour les enfants »
- Contenu modifié ou synthétique : Non · Langue : Français · Catégorie : Divertissement
- Sous-titres : importer `4_SOUS_TITRES_paroles_fr.srt` (« Avec synchronisation ») · Miniature : `MINIATURE_1280x720.png`

## 6. Short (2-3 jours après)
**Titre :**
```
{short_titre}
```
**Description :**
```
{short_desc}
```
Audience : ✅ « Oui, elle est conçue pour les enfants »
"""
    open(os.path.join(out, "A_COPIER_COLLER.md"), "w", encoding="utf-8").write(cc)
    print("OK", out)
    print(chapters)


if __name__ == "__main__":
    main(sys.argv[1])
