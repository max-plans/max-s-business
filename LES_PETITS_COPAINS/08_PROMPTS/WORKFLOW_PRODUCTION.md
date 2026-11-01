# Workflow de production d'une vidéo Tralalune

## 0. Ce qui a été fait dans cet environnement… et ce qui ne pouvait pas l'être
| Réalisé ici (fichiers présents dans le projet) | Nécessite un outil externe (abonnement / API) |
|---|---|
| Design original des 5 personnages en vectoriel, toutes les vues, expressions, poses, fiches | Rendus **3D** finaux de qualité « long métrage » |
| Logo, photo de profil, bannière, palette, typographies, charte PDF | Musique finale **chantée** (voix réalistes) |
| 10 miniatures, 10 storyboards illustrés, 10 animatiques MP4 | Animation des personnages (image → vidéo) |
| Paroles originales, structures, tempo, prompts image/animation/musique | Doublage/voix des personnages |
| Maquettes mélodiques MIDI + MP3 des refrains | Montage final et export haute qualité |
| Sous-titres karaoké stylés + outil d'incrustation (ffmpeg) | Mise en ligne YouTube |
| SEO, planning 90 jours, monétisation, tableau de bord Excel | |

Aucun outil de génération d'images 3D, de musique chantée ou de vidéo IA n'est accessible depuis cet environnement (pas de clé API ni d'abonnement). Les visuels livrés sont donc des **illustrations vectorielles de référence** (style cartoon à volume doux) : elles fixent le design, et servent d'images de référence pour produire la version 3D avec les outils ci-dessous.

## 1. Chaîne de production (par vidéo)
```
FICHE_VIDEO ─► MUSIQUE ─► (voix des personnages) ─► ANIMATIQUE validée ─► IMAGES des scènes ─► ANIMATION
     │                                                                                          │
     └──────────────► MINIATURE ◄──────── MONTAGE + PAROLES À L'ÉCRAN + MIXAGE ◄────────────────┘
                                                   │
                                          EXPORT ─► CONTRÔLE QUALITÉ ─► MISE EN LIGNE (+ Short)
```
Règle d'or : **la musique d'abord** (elle fixe le minutage), **l'animatique ensuite** (elle évite de payer des générations inutiles), **les images et animations en dernier**.

## 2. Outils recommandés, utilité et licences
> ⚠️ Les conditions commerciales des outils d'IA changent souvent. Les informations ci-dessous sont celles connues au 1er novembre 2026 ; **relisez les CGU de chaque outil le jour de l'abonnement**, gardez une capture d'écran du plan souscrit et une trace de chaque génération (date, compte, prompt). En règle générale : **les offres gratuites n'autorisent pas l'usage commercial** ; les offres payantes oui.

### 2.1 Musique et chant
| Outil | Utilité | Licence commerciale (à vérifier) | Remarques |
|---|---|---|---|
| **Suno** (Pro / Premier) | Chanson complète chantée à partir des paroles + style | Droits commerciaux accordés pour les morceaux générés **pendant** un abonnement Pro/Premier, y compris après résiliation selon la documentation d'aide de Suno ; plan gratuit = non commercial | Depuis l'accord avec Warner Music (nov. 2025), Suno a lancé des modèles sous licence et des plafonds de téléchargement mensuels (à partir de sept. 2026 selon plusieurs sources). Vérifier le quota avant de produire en série. |
| **ElevenLabs Music** (plan payant) | Musique avec ou sans voix, contrôle par sections | Conditions spécifiques au modèle Music (tableau « Music Commercial Rights » sur elevenlabs.io) ; offre gratuite non commerciale | Pratique pour des instrumentaux propres et des stems. |
| **Compositeur humain + chanteur(se)** | Qualité maximale, voix identiques sur des années | Contrat de cession de droits (écrit) | La meilleure option à moyen terme : protégeable, déclarable à la SACEM, pas de risque de plafond. La maquette MIDI fournie sert de base. |
| **Logiciels gratuits** (LMMS, MuseScore, GarageBand) | Retoucher les maquettes, écrire les partitions | Libres | — |

**Paroles :** elles sont originales (écrites pour Tralalune) : collez le fichier `06_PAROLES/VIDEO_XX_paroles_pour_IA_musique.txt` dans l'outil. Vérifiez à l'écoute que chaque mot est chanté correctement ; régénérez sinon.

### 2.2 Voix des personnages
| Outil | Utilité | Licence |
|---|---|---|
| **ElevenLabs** (Voice Design + Voice Changer / speech-to-speech) | Créer 5 voix de personnages fixes et les appliquer aux répliques parlées ou aux pistes vocales | Commercial sur plans payants |
| Comédiens voix (plateformes de freelances) | Voix humaines uniques | Contrat de cession |

Ne jamais cloner la voix d'une personne réelle sans son accord écrit. Notez ici le réglage final de chaque voix :
| Personnage | Outil | Nom/ID de la voix | Réglages |
|---|---|---|---|
| Milo | | | |
| Luna | | | |
| Bibou | | | |
| Pipo | | | |
| Nounou | | | |

### 2.3 Images (scènes fixes en 3D cartoon)
| Outil | Points forts | Licence (à vérifier) |
|---|---|---|
| **Google Gemini – génération/édition d'images (« Nano Banana »)** | Excellente fidélité aux images de référence jointes → cohérence des personnages | Selon conditions Google applicables à votre compte/plan |
| **ChatGPT Images (OpenAI)** | Très bonne compréhension des consignes en français, édition | Les conditions OpenAI attribuent les sorties à l'utilisateur, sous réserve des règles d'usage |
| **Midjourney** (plan payant) | Rendu très esthétique, références de personnage | Usage commercial sur plans payants ; plan Pro/Mega exigé pour les entreprises au-delà d'un certain chiffre d'affaires annuel (voir CGU) |
| **Flux (Kontext) / Stable Diffusion + LoRA** | Contrôle total, entraînement d'un modèle sur les 5 personnages | Dépend de la licence du modèle choisi (certaines licences « dev » interdisent l'usage commercial) |

Méthode de cohérence : joindre **à chaque fois** `<nom>_vue_face.png` + `<nom>_planche_rotation.png`, coller le verrou du personnage (`02_PERSONNAGES/<NOM>/PROMPT_MAITRE.md`) mot pour mot, puis comparer le résultat à la planche avant de valider. Constituez une **banque d'images validées** par personnage : elle devient la référence des vidéos suivantes.

### 2.4 Animation (image → vidéo)
| Outil | Utilité | Licence (à vérifier) |
|---|---|---|
| **Kling AI** | Image → vidéo de 5-10 s, références multiples, synchronisation labiale | Usage commercial et export sans filigrane sur abonnement payant |
| **Runway** (Gen-4 et suivants) | Image → vidéo, références de personnage, outils de cohérence | Commercial sur plans payants |
| **Google Veo** (via Gemini / Flow) | Clips de haute qualité, avec ou sans son | Selon le plan Google |
| **Hailuo (MiniMax), Luma** | Alternatives image → vidéo | Plans payants |

Règles : toujours partir de l'**image fixe validée** ; plans de 5-10 s ; prompt d'animation de `08_PROMPTS/VIDEO_XX_prompts.md` ; refuser tout plan où le personnage se déforme. Comptez 2 à 4 générations par plan conservé.

### 2.5 Voie « 3D maîtrisée » (recommandée dès que la chaîne décolle)
Pour une cohérence **parfaite** sur des années : modéliser les 5 personnages une fois pour toutes.
1. **Blender** (gratuit, usage commercial libre) : modélisation, rendu, animation.
2. Point de départ rapide : image → 3D avec **Meshy** ou **Tripo** (plans payants pour l'usage commercial), puis nettoyage dans Blender — ou commande à un modeleur 3D freelance à partir des planches de rotation fournies.
3. Rig et animations : **Mixamo** (Adobe, gratuit) ou **AccuRIG** ; danses signatures animées une fois, réutilisées partout.
4. Avantage : chaque nouvelle vidéo réutilise les mêmes modèles → qualité constante, pas de risque « contenu générique ».

### 2.6 Montage, paroles à l'écran, export
| Outil | Utilité | Licence |
|---|---|---|
| **DaVinci Resolve** (gratuit) | Montage, étalonnage, mixage (Fairlight), sous-titres | Usage commercial autorisé |
| CapCut (bureau) | Montage simple | Vérifier les CGU et ne pas utiliser les éléments de sa bibliothèque (musiques, effets) sans vérifier leurs droits commerciaux |
| **Subtitle Edit / Aegisub** (gratuits) | Recaler les paroles sur la musique | Libres |
| **`_outils/karaoke.py`** (fourni) | SRT → sous-titres karaoké au style Tralalune + incrustation ffmpeg | Inclus |
| **`_outils/animatique.py`** (fourni) | Animatique minutée de chaque vidéo | Inclus |
| **ffmpeg** (gratuit) | Conversions, compilations, Shorts | Libre |

## 3. Pas à pas détaillé
1. **Lire la fiche** `04_VIDEOS/VIDEO_XX/FICHE_VIDEO.md` et regarder l'animatique.
2. **Musique** : coller le prompt « style » + les paroles IA dans l'outil musical → générer 4-8 versions → choisir celle qui respecte parfaitement les paroles et la structure → exporter en WAV. Normaliser à -14 LUFS.
3. **Voix parlées** (intros/outros) : générer avec la voix fixe du personnage.
4. **Recaler les paroles** : ouvrir `paroles_ecran_BROUILLON.srt` dans Subtitle Edit avec le WAV, ajuster chaque ligne, enregistrer `paroles_ecran.srt`.
5. **Recaler le storyboard** sur les vrais temps de la musique (colonne « Temps » de la fiche).
6. **Images** : pour chaque scène, prompt image + références → 2-4 essais → valider (checklist cohérence ci-dessous) → enregistrer `04_VIDEOS/VIDEO_XX/scenes/scene_XX.png`.
7. **Animation** : chaque image validée → prompt d'animation → enregistrer `scene_XX.mp4`.
8. **Montage** (Resolve) : timeline 1920×1080, 25 i/s ; poser la musique ; caler les plans ; jingle « Tralalune » en ouverture (3 s) ; fondus doux.
9. **Paroles à l'écran** : `python3 _outils/karaoke.py paroles_ecran.srt paroles.ass --video montage.mp4 --out final.mp4` (ou sous-titres Resolve).
10. **Contrôle qualité** (ci-dessous), **export**, **miniature**, **mise en ligne** avec la description de la fiche.
11. **Short** : extraire le refrain (30-50 s) en vertical 9:16 (recadrage centré sur le personnage, paroles en gros au centre-bas).

## 4. Réglages d'export
| Paramètre | Vidéo longue | Short |
|---|---|---|
| Résolution | 1920×1080 (ou 3840×2160) | 1080×1920 |
| Images/s | 25 (ou 24) constant | idem |
| Codec | H.264 High, 12-20 Mb/s (1080p) | H.264, 10-15 Mb/s |
| Audio | AAC 320 kb/s, 48 kHz, stéréo, -14 LUFS | idem |

Exemple ffmpeg pour une compilation (après avoir listé les fichiers dans `liste.txt`) :
```bash
ffmpeg -f concat -safe 0 -i liste.txt -c copy compilation_30min.mp4
```

## 5. Checklist qualité (aucune publication si une case manque)
- [ ] Les 5 personnages sont **identiques** aux planches officielles (couleurs, oreilles, yeux, corne, épines, salopette)
- [ ] Pas de doigts en trop, de membres déformés, de visages qui « fondent »
- [ ] Pas de flash, de clignotement rapide (risque photosensible), ni de bruit soudain fort
- [ ] Paroles chantées = paroles affichées
- [ ] Message bienveillant, aucune situation dangereuse imitable
- [ ] Volume homogène avec les autres vidéos de la chaîne
- [ ] Audience « conçue pour les enfants » cochée

## 6. Temps et coûts (hypothèses de travail, à ajuster après les premières vidéos)
| Poste | Estimation par vidéo de 2-3 min |
|---|---|
| Musique (génération + sélection + mixage) | 1 à 2 h |
| Images (10-12 scènes × 3 essais) | 2 à 4 h |
| Animation (20-30 plans × 2-4 essais) | 4 à 8 h |
| Montage, paroles, contrôle, mise en ligne | 3 à 5 h |
| **Total** | **≈ 10 à 19 h** au début, à réduire avec l'expérience et la voie 3D |

Budget outils : prévoir plusieurs abonnements mensuels (musique, image, vidéo, voix). Les montants dépendent des offres du moment ; reportez vos coûts réels dans l'onglet « Coûts » du tableau de bord pour piloter la rentabilité.
