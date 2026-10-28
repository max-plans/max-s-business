# Fripe — boucle de motion design UI (1440 × 1440, 14 s)

Fichiers livrés :
- `fripe-loop.mp4` : 1440 × 1440, 60 i/s, 14 s (840 images), H.264 CRF 17 + AAC, boucle parfaite.
- `fripe-loop-x3.mp4` : trois boucles à la suite (42 s), pour voir la fin s'enchaîner sur le début.
- `fripe-loop.html` : la source. Ouverte dans un navigateur, elle affiche l'image `t = 0` ; `window.seek(t)` positionne n'importe quel instant.
- `musique-loop.py` → `musique-loop.wav` : la piste originale (14 s, 120 BPM, entièrement synthétisée, libre de droits).
- `render-loop.js` : le rendu.
- `preview/` : une image par temps (`t00.00.png` … `t13.50.png`), la planche `planche.png` (les 28 temps) et `couture.png` (13,5 → 14,4 s, à cheval sur la couture).

## Principe

Une seule forme (`#hero`) reste à l'écran du début à la fin. Sa largeur, sa hauteur, son arrondi et sa couleur passent
d'un vrai état de l'appli Fripe à l'autre ; les contenus apparaissent dedans une fois le morphing lancé, puis sortent en flou
juste avant le suivant. Le curseur déclenche chaque transition.

| Temps | État | Action du curseur |
|---|---|---|
| 0–0,5 s | Bouton « + » | clic |
| 0,55–2,5 s | Formulaire « Nouvel article » | saisie du titre, du prix d'achat 24 €, du prix 54 €, clic « Ajouter » |
| 2,55–3,5 s | Fiche Veste Carhartt (marge visée +30 €) | « Mettre en ligne », puis « Publier sur Vinted » |
| 3,55–5,5 s | « Préparation… » → toast « Annonce envoyée vers Vinted » | — |
| 5,55–7 s | Vente : acheteur, 54 € +30 € de bénéfice, suivi en 5 étapes | « Étape suivante » ×2 (Étiquette → Déposé) |
| 7,05–8 s | Bouton « Bordereau » → toast « Bordereau ouvert » | clic |
| 8,05–10 s | Message à Camille (modèle « Colis expédié »), « Envoyer sur Vinted » → « ✓ Envoyé » | clic modèle, envoi |
| 10,05–12 s | Recherche « carh » : 4 articles → 1 | saisie |
| 12,05–12,9 s | Filtres Tous 28 / En stock 6 / En ligne 3 / Vendus 19 | clic « Vendus » |
| 12,95–13,65 s | Logo Fripe | le curseur s'écarte puis revient sur le « + » |

Bordereaux et messages passent par l'extension Fripe Connect : ils sont montés ici uniquement comme les vrais boutons
et les vrais toasts de l'appli.

## Mouvement

- Tous les mouvements sont des ressorts amortis en forme fermée : `s(τ) = 1 − e^(−ζωτ)(cos ω_d τ + ζω/ω_d · sin ω_d τ)`.
  Aucun état n'est simulé pas à pas : une image dépend seulement de `t`, donc le rendu est identique à chaque export
  et n'importe quel instant peut être calculé seul.
- **Boucle parfaite** : chaque piste est périodique, `v(t) = dernier + Σ Δk [s(t − tk) + s(t + P − tk)]`. Un ressort lancé
  peu avant la fin se prolonge au début de la boucle suivante ; la valeur et la vitesse à `t = 14` sont celles de `t = 0`.
- Caméra : léger zoom vers les petits états, recul pour les grands (ressort plus lent, 1,3 Hz).
- Indicateur des filtres : le bord avant et le bord arrière ont des ressorts différents, si bien que l'indicateur s'étire puis se resserre.

## Rendu

```sh
cd fripe/promo/loop
python3 musique-loop.py                 # → musique-loop.wav (addition modulo 14 s : la queue des sons revient au début)
node render-loop.js beats               # contrôle : 28 images (une par temps) + planche contact dans preview/
node render-loop.js preview 1.2 9.6     # images fixes au choix
node render-loop.js video 12.8 15.2     # essai court (ici à cheval sur la couture) → fripe-loop-test.mp4
node render-loop.js video               # → fripe-loop.mp4
```

Variables : `PW` (chemin de playwright-core), `CHROME` (binaire Chromium), `PAGE`, `MUSIC`.

Pour la vidéo, Chromium capture **240 sous-images par seconde**. ffmpeg en fait la moyenne quatre par quatre
(`tmix=frames=4`), puis garde une image sur quatre (`framestep=4`). On obtient ainsi 60 i/s avec un vrai flou de mouvement.
Les quatre sous-images d'une image couvrent `[t − 3/240, t]`, et les instants sont pris modulo 14 s : la première image
mélange donc la toute fin de la boucle, et la couture reste continue même avec le flou.

Pour rejouer la boucle en continu (site, écran, réseau social), lis `fripe-loop.mp4` en boucle. `fripe-loop-x3.mp4` montre
trois tours enchaînés, la musique bouclée sans blanc.

## Vérifications faites

- Planche des 28 temps relue : pas de texte qui se chevauche, cadrage centré, curseur sur le bon bouton à chaque clic.
  Deux corrections : le logo restait trop peu de temps (allongé à 13,04–13,66 s), et le curseur le masquait (il s'écarte désormais).
- Couture vidéo : l'écart moyen entre la dernière et la première image est de 0,066 (niveaux de gris, sur 255).
  L'écart moyen entre deux images voisines dans la boucle est de 0,343 : le passage fin → début est plus doux qu'un pas normal.
- Couture audio : le saut entre le dernier et le premier échantillon (528) est plus petit que l'écart moyen entre
  deux échantillons voisins (715).
- `fripe-loop-x3.mp4` regardé au passage 13,5 → 14,4 s (`preview/couture.png`) : le logo devient le bouton « + » sans à-coup.
