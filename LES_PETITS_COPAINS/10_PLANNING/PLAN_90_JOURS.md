# Plan de lancement — 90 jours

> ✅ **Lancement réel : vidéo 01 publiée le dimanche 1er novembre 2026.** Le calendrier (`calendrier_90_jours.csv` + tableau de bord) a été recalé : jour 1 = lundi 2 novembre 2026, une nouveauté chaque mercredi à 10 h, **chanson de Noël publiée le 25 novembre**, compilation « Spécial Noël » le 19 décembre. Les sections ci-dessous gardent leur logique ; seules les dates changent.

> Calendrier jour par jour : `calendrier_90_jours.csv` (s'ouvre dans Excel/LibreOffice) et onglet « Calendrier 90 j » du tableau de bord.
> Date du **jour 1 proposée : lundi 4 janvier 2027**. Pour la changer : `python3 _outils/generer_planning_et_tableau.py AAAA-MM-JJ` (choisir un lundi).
> **Aucun résultat chiffré n'est garanti** : ce plan organise le travail, il ne prédit pas l'audience.

## Phase 0 — Pré-production (novembre → décembre 2026, avant le jour 1)
| Semaine | Objectif |
|---|---|
| S-8 | Vérifier le nom (INPI/EUIPO, @handle, domaine). Ouvrir les comptes outils (plans payants à licence commerciale). Créer la chaîne, importer logo, bannière, photo de profil, textes (`09_SEO/TEXTES_CHAINE_YOUTUBE.md`). |
| S-7 | Fixer les 5 voix (tableau du workflow). Produire le jingle « Tra-la-lu-ne ». Banque d'images validées des 5 personnages en 3D (≥ 10 images chacun). |
| S-6 → S-2 | Produire les vidéos 1, 2, 10, 9, 3 (les 5 premières du calendrier) + bande-annonce de chaîne. |
| S-1 | Contrôle qualité final, 6 premiers Shorts prêts, playlists créées (vides ou privées), descriptions programmées. |

**Règle de sécurité :** ne jamais lancer sans **au moins 3 semaines d'avance** de vidéos prêtes. Un retard de production ne doit jamais casser le rythme de publication.

## Rythme de publication (qualité avant quantité)
| Format | Fréquence | Jour / heure (heure de Paris) | Pourquoi |
|---|---|---|---|
| **Comptine originale** (2-4 min) | 1 par semaine | Mercredi 10 h (jour 1 : 3 vidéos) | Mercredi = jour sans école pour beaucoup d'enfants en France ; publication le matin pour être indexé avant l'après-midi |
| **Short** (30-50 s, vertical) | 3 par semaine | Lundi, vendredi, dimanche 18 h | Fin de journée = moment de l'écran « en attendant le repas » ; découverte de la chaîne |
| **Compilation 20-40 min** | 1 toutes les 2 semaines dès J20 | Samedi 9 h | Week-end matin = sessions longues (voiture, petit-déjeuner) |
| **Berceuse longue** (30 min puis 1 h) | J20, puis 1 par mois | Samedi | Très forte demande « dormir », durée de visionnage élevée |

Bilan du plan sur 90 jours : **15 comptines originales**, **6 compilations**, **≈ 37 Shorts**, 1 bande-annonce.

## Ordre de sortie et logique
| Jour | Contenu | Raison |
|---|---|---|
| J1 | V01 Bonjour les amis · V02 Couleurs · V10 Tous ensemble | La chaîne ouvre avec un rituel, un éducatif et l'hymne qui présente les 5 personnages |
| J10 | V09 Berceuse Luna | Thème « dormir » = recherche quotidienne des parents |
| J17 | V03 Chiffres | Éducatif très recherché |
| J20 | Compilation berceuse 30 min | Premier format long → durée de visionnage |
| J24 | V08 Brossage des dents | Routine quotidienne, usage répété matin/soir |
| J31 | V04 Danse des animaux | Chanson à gestes (crèches, assistantes maternelles) |
| J38 | V06 Émotions | Thème recherché par parents et enseignants |
| J45 | V07 Ferme | Animaux = thème majeur |
| J52 | V05 Pipo fait la fête | Dinosaures = très forte affinité 3-6 ans |
| J59 | V11 Traditionnelle (domaine public) en version Tralalune | Capter les recherches de titres classiques |
| J66 | V12 Les formes | Éducatif |
| J73 | V13 La chanson du corps | Gestes + vocabulaire |
| J80 | V14 La chasse aux œufs (Pâques 2027 = 28 mars) | Saisonnier, publié 11 jours avant |
| J87 | V15 Berceuse traditionnelle avec Luna | 2ᵉ berceuse → renforce la playlist « dormir » |

## Thèmes à potentiel (sans volumes inventés — voir `09_SEO/MOTS_CLES_PARENTS.md`)
1. **Sommeil / berceuses** (besoin quotidien, formats longs).
2. **Apprentissages de base** : couleurs, chiffres, formes, alphabet, corps.
3. **Routines** : dents, bain, repas, pot, rangement, mains.
4. **Animaux** (ferme, jungle, dinosaures).
5. **Danses et gestes** (crèches, maternelles).
6. **Saisonnier** : Noël (préparer dès octobre 2027), anniversaire (chanson originale), rentrée, Halloween tout doux, Pâques.
7. **Comptines traditionnelles du domaine public** réarrangées (après vérification de chaque titre).

## Stratégie de croissance
### 1. Augmenter les impressions
- Titres = **requête naturelle du parent** dans les 40 premiers caractères (« Berceuse douce pour dormir… »).
- Description avec chapitres + paroles complètes (indexées par YouTube et Google).
- Thèmes « éternels » d'abord, saisonniers 4-6 semaines avant l'événement.
- Les Shorts servent de **porte d'entrée** : chaque Short reprend un refrain ou une danse et renvoie (oralement/visuellement) à la vidéo longue.
- Régularité : même jour, même heure, chaque semaine.

### 2. Améliorer le taux de clic (CTR)
- Système de miniatures (`03_MINIATURES/SYSTEME_MINIATURES.md`) : un personnage, une émotion, 2-3 mots, repère de marque.
- Test A/B natif de YouTube Studio (« Tester et comparer ») sur chaque nouvelle vidéo importante.
- Comparer chaque vidéo à la **moyenne de la chaîne** (pas à des chiffres extérieurs) dans l'onglet Vidéos du tableau de bord.

### 3. Augmenter la durée de visionnage
- Intro **< 5 secondes** avant la musique (le jingle de 3 s suffit).
- Structure répétitive maîtrisée (refrain 3-4 fois) : les tout-petits adorent la répétition.
- Compilations 20-40 min et berceuses longues (avec vraie valeur : variations, animation dédiée — jamais une simple boucle identique).
- Playlists de chaîne ordonnées → lecture automatique enchaînée.
- Phrase de transition en fin de vidéo : « Et maintenant, on chante avec Luna ! » (pas d'écran de fin cliquable sur le contenu pour enfants, donc on mise sur les playlists).

### 4. Fidéliser les familles
- **Rituels** : « Bonjour les amis » le matin, « Brossage » matin/soir, « Berceuse » le soir → la chaîne devient une habitude quotidienne.
- Personnages récurrents, répliques et danses signatures (saut du lion, pirouette magique…) réutilisées partout.
- Une nouveauté chaque mercredi : les parents savent quand revenir.
- Bande-annonce de chaîne pour les visiteurs non abonnés ; bloc parents rassurant dans chaque description.
- Hors YouTube (à destination des **parents**, jamais des enfants) : page Instagram/Facebook « coulisses et coloriages », newsletter, coloriages gratuits à imprimer (personnages officiels).

### 5. Développer progressivement la chaîne
| Étape | Déclencheur (indicatif) | Action |
|---|---|---|
| Mois 1-3 | Lancement | 1 comptine/semaine, Shorts, compilations, apprentissage des stats |
| Mois 4-6 | Premières vidéos qui « tiennent » (CTR et % regardé au-dessus de la moyenne de la chaîne) | Décliner les thèmes gagnants (suites, versions longues) ; voie 3D Blender |
| Mois 6-12 | Monétisation obtenue ou proche | 2 comptines/semaine si la qualité suit ; albums sur plateformes musicales ; coloriages/livre |
| Année 2 | Catalogue de 80-100 chansons | Version anglaise (« Tralalune » fonctionne tel quel), produits dérivés, licences |

## Rituel d'analyse
- **Chaque dimanche (15 min)** : saisir vues, impressions, CTR, durée moyenne, abonnés de chaque vidéo dans `12_STATISTIQUES/tableau_de_bord_Tralalune.xlsx`.
- **J30, J60, J90 (1 h)** : quels thèmes, miniatures et durées fonctionnent le mieux ? Remplacer les thèmes faibles du mois suivant par des déclinaisons des thèmes forts. Vérifier l'onglet « Recherche » de YouTube Studio pour trouver de nouvelles demandes.
- Indicateurs à surveiller (comparés à vos propres moyennes) : impressions, CTR, durée moyenne de visionnage, % moyen regardé, vues par source (recherche, suggestions, Shorts), abonnés gagnés par vidéo, retour des spectateurs.
