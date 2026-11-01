# 🎬 PRODUCTION_VIDEO — studio gratuit Tralalune

Ce studio transforme une chanson chantée (MP3) en **dessin animé musical** avec les personnages officiels :
- les plans sont calés sur les paroles ;
- la bouche du personnage s'anime pendant qu'il chante ;
- les personnages dansent et sautent sur le tempo, avec des mouvements de caméra ;
- les transitions sont accompagnées d'effets sonores, et les paroles s'affichent en karaoké ;
- il exporte la vidéo en **1920×1080**, un **Short en 1080×1920** et la miniature.

Tout est 100 % local et gratuit : aucune API n'est appelée.

## Tester avec ElevenLabs gratuit (vidéo pilote V01)
1. Ouvrez `V01_bonjour_les_amis/KIT_ELEVENLABS.md`. Il contient le prompt de style et les paroles exactes à coller dans Eleven Music.
2. Téléchargez la meilleure version en MP3 et nommez-la **`chanson.mp3`**.
3. **Me transmettre la chanson**, au choix :
   - sur github.com, dépôt `max-plans/max-s-business`, branche `claude/gallant-euler-gh298w`, dossier `LES_PETITS_COPAINS/PRODUCTION_VIDEO/V01_bonjour_les_amis/MUSIQUE/` : cliquez sur **Add file → Upload files**, déposez `chanson.mp3`, puis **Commit changes** ;
   - ou joignez le fichier dans la conversation, si votre application le permet.
4. Calez les paroles (recommandé, 2 minutes) :
   - ouvrez `outils/calage_paroles.html` dans votre navigateur et chargez `production.json` et `chanson.mp3` ;
   - appuyez sur ESPACE au début de chaque ligne chantée ;
   - téléchargez `calage.json` et déposez-le au même endroit que la chanson.

   Sans ce fichier, les temps des paroles sont estimés automatiquement, de façon moins précise.
5. Je lance `python3 _outils/studio_gratuit.py video V01_bonjour_les_amis`. Les résultats arrivent dans `V01_bonjour_les_amis/RENDU/`.

⚠️ Le compte ElevenLabs gratuit est **non commercial** : la vidéo de test reste privée.

Si elle vous plaît :
1. Prenez l'offre payante.
2. Régénérez la chanson avec l'offre payante, en utilisant le même kit.
3. On publie.

L'offre payante permettra aussi de passer par l'API : génération automatique et horodatage exact de chaque mot, sans calage manuel.

## Structure d'une vidéo
```
V01_bonjour_les_amis/
├── production.json   plan : sections, paroles, qui chante, décors, personnages, poses, caméra
├── KIT_ELEVENLABS.md prompt + paroles (généré depuis production.json)
├── MUSIQUE/          chanson.mp3, calage.json, paroles_pour_elevenlabs.txt
└── RENDU/            vidéo 1080p, Short, miniature, timeline.json (temps utilisés)
```

Pour créer une nouvelle vidéo :
1. Copiez le `production.json` d'une vidéo existante et modifiez les paroles et les plans.
2. Lancez `python3 _outils/studio_gratuit.py kit <ID>`, puis `python3 _outils/studio_gratuit.py video <ID>`.

## Limites actuelles
- L'animation est en 2D « pantin » : poses alternées, rebonds et caméra. Il n'y a pas encore de 3D ni de synchronisation labiale phonétique par IA.
- La bouche suit l'énergie de la voix (3 positions), et seulement pour le personnage qui chante la ligne.
- Le chant n'est pas isolé de la musique : la bouche peut s'ouvrir sur un instrument fort pendant une ligne chantée.
- Étape suivante prévue (payante, sur votre validation) : fal.ai pour la 3D et la synchronisation labiale sur les plans de chant.
