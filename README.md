# 🎬 TikTok Content Agent

Application web **locale** qui produit automatiquement le contenu de 3 comptes TikTok :

| Compte | Ton | Visuels |
|---|---|---|
| 🐼 **Compte 1 — Argent** | « Panda Boss », un panda en costume qui explique les règles de l'argent | Panda en images IA **ou** panda animé dessiné localement (bouche synchronisée sur la voix) |
| 🏛️ **Compte 2 — Stoïcisme** | Narrateur philosophe, vraies citations appliquées à la vie moderne | Statues, marbre, clair-obscur, grain |
| 🌌 **Compte 3 — Remise en question de la vie** | Narrateur de documentaire, questions qui dérangent | Ambiance cinéma, silhouettes, ciels dramatiques |

**Chaîne de production :**
THÈME → IDÉE → HOOK → SCRIPT → SCÈNES → VOIX → VISUELS → SOUS-TITRES → MONTAGE → MP4 (9:16, 1080×1920)

---

## 💶 Coûts : 0 € en plus de ton abonnement

| Étape | Outil | Coût |
|---|---|---|
| Idées, hooks, scripts, scènes | **Ton Claude Code** (commande `claude -p`, abonnement Pro) | 0 € en plus, consomme ton quota Pro |
| … ou en local | Ollama (optionnel) / mode hors-ligne | 0 € |
| Voix off | Edge TTS (gratuit, en ligne) ou **Piper** (100 % local, open source) | 0 € |
| Images | Pollinations.ai (gratuit, sans compte) ou fonds générés localement | 0 € |
| Vidéos d'illustration | Pexels (optionnel, clé gratuite) | 0 € |
| Sous-titres, montage, export | ffmpeg + libass (open source) | 0 € |

🔒 **Sécurité anti-facturation :** l'application retire volontairement `ANTHROPIC_API_KEY` de l'environnement quand elle appelle Claude Code. C'est donc **toujours ton abonnement Pro** qui est utilisé, jamais une facturation API à l'usage. Aucune API payante n'est intégrée.

---

## 🚀 Installation (une seule fois)

1. **Python 3.10+** : https://www.python.org/downloads/ (sous Windows, coche « Add Python to PATH »).
2. **ffmpeg** :
   - Windows : `winget install Gyan.FFmpeg`
   - Mac : `brew install ffmpeg`
   - Linux : `sudo apt install ffmpeg`
3. **Claude Code**, déjà installé chez toi. Vérifie avec `claude --version` et que tu es connecté avec ton compte Pro (`claude`, puis `/login` si besoin).
4. Dans le dossier du projet :
   ```bash
   pip install -r requirements.txt
   ```

## ▶️ Lancer l'application

```bash
python -m content_agent
```
Le navigateur s'ouvre sur **http://127.0.0.1:8765**. Tout tourne sur ton ordinateur.

---

## 🧭 Utilisation

L'application s'appelle **Studio**. À gauche se trouvent tes 3 comptes et le menu ; au centre, la page en cours.

1. **Choisis un compte** dans la barre de gauche : 🐼 Panda Boss, 🏛️ Stoïcisme ou 🌌 Réflexion.
2. Clique sur **« Nouveau planning »** en haut à droite. Choisis le nombre de jours, de vidéos par jour et la durée, puis **« Lancer la préparation »**. L'IA trouve les sujets, écrit les hooks et les scripts complets, et remplit ton **calendrier**.
3. Sur l'**Accueil**, la carte **« Prochaine étape »** te dit toujours quoi faire (écrire les scripts, créer les vidéos, publier) avec un seul bouton.
4. Clique sur n'importe quelle vidéo pour ouvrir sa **fiche** : aperçu dans un téléphone, script scène par scène (modifiable), légende à copier, téléchargement du MP4, « Marquer comme publiée ».
5. La progression des tâches s'affiche **en bas à gauche**. Tout tourne en arrière-plan.

| Page | Contenu |
|---|---|
| **Accueil** | Résumé du compte, prochaine étape conseillée, vidéos à venir, « Comment ça marche » |
| **Calendrier** | Vue mensuelle, chaque vidéo à sa date et à son heure, avec une couleur par statut |
| **Scripts** | Toutes les idées et tous les scripts, avec un filtre (à écrire / prêts / avec vidéo) |
| **Vidéos** | Galerie : À créer → En création → Prêtes → Publiées |
| **Réglages** | IA, voix, visuels, pseudos, diagnostic. Chaque changement est enregistré automatiquement |

Thème clair ou sombre : bouton en bas à gauche.

## 🎙️ Comment la voix devient « humaine »

Chaque phrase est lue avec un **ton** choisi par Claude (accroche, énergique, suspense, grave, question, chute), des **mots clés
accentués**, des **pauses** aux virgules et aux « … », une **fin de phrase qui retombe** (ou qui monte pour une question), et un
rythme légèrement différent d'une phrase à l'autre. Les chiffres sont lus en toutes lettres. Un traitement audio « narrateur »
(compression douce, chaleur, présence) uniformise le rendu.

- **Voix gratuite Edge** : toutes ces nuances sont envoyées en une seule requête, donc l'intonation reste continue.
- **ElevenLabs** : réglages d'expression différents pour chaque phrase. Le modèle **« Ultra expressive (v3) »** ajoute des
  balises d'émotion et des accents sur les mots clés : à essayer avec **Tester en français** dans les Réglages (si ton compte
  ne l'a pas, l'appli bascule toute seule sur le modèle naturel).
- Dans **Réglages → Voix & style des vidéos**, le bouton **Écouter** lit un passage de 3 phrases avec 3 tons, pour entendre le rendu réel.

## 🤖 Pilote automatique (l'appli travaille toute seule)

Sur l'**Accueil** de chaque compte, active **« Pilote automatique »** et choisis le nombre de vidéos par jour, le nombre de jours d'avance et la durée.
Tant que l'application est ouverte (fenêtre noire ouverte), toutes les 5 minutes elle :
1. trouve de nouveaux sujets et **fait des recherches sur le web** (chiffres, taux, histoires vraies vérifiés) ;
2. écrit les scripts complets ;
3. génère la voix, les images et les sous-titres, puis **monte les vidéos** en MP4.

Toi, tu n'as plus qu'à ouvrir **Vidéos → Prêtes**, regarder, télécharger et publier.

## 🎙️ Voix ultra-réaliste (ElevenLabs, optionnel)

1. Crée un compte **gratuit** sur https://elevenlabs.io. Ne mets **aucune carte bancaire**.
2. Va dans **Profil → API Keys**, crée une clé et colle-la dans **Réglages → Clé ElevenLabs**.
3. Pour avoir une voix française : dans ElevenLabs, ouvre **Voices → Voice Library**, filtre sur **French**, écoute des narrateurs et clique sur **Add** sur celui que tu préfères.
4. Dans **Réglages → Voix & style des vidéos**, choisis le **Type de voix** « ElevenLabs » pour le compte voulu, puis ta voix (bouton ▶ Écouter, gratuit).

Le crédit gratuit (~10 000 caractères par mois) couvre environ **10 vidéos de 60 s**, ou environ 20 en qualité « Économique ».
Avant chaque vidéo, l'application vérifie le crédit restant. S'il ne suffit pas, elle utilise automatiquement la voix gratuite Edge. **Rien n'est jamais facturé.**

## 🎨 Avoir de belles images (important)

Le générateur d'images gratuit **Pollinations** demande maintenant une **clé gratuite** :
1. Va sur **https://enter.pollinations.ai**, connecte-toi (gratuit, sans carte bancaire) et crée une clé.
2. Dans **Réglages → Clé Pollinations**, colle la clé.
3. Toujours dans les Réglages, **Style des images → Tester** pour voir une image d'essai, et **Voix off → Écouter** pour choisir la voix.

Le crédit gratuit hebdomadaire couvre environ **750 images**, soit environ 75 vidéos par semaine.
Sans clé (ou si le service ne répond pas), le compte Argent utilise le **panda animé local** au lieu d'un fond vide.

### 🎵 Musique (optionnel)
Dépose des musiques libres de droits (par exemple sur [Pixabay Music](https://pixabay.com/music/)) dans `assets/music/argent/`, `assets/music/stoicisme/` ou `assets/music/reflexion/`. Elles sont mixées automatiquement sous la voix, avec un volume qui baisse quand la voix parle.
Astuce portée : tu peux aussi laisser sans musique et ajouter un **son tendance dans l'appli TikTok** au moment de publier.

### ⏱️ Temps de production (ordinateur moyen)
- Calendrier de 90 idées : ~5 à 10 min. Avec les 90 scripts : ~1 à 2 h (par lots de 3, selon ton quota Pro).
- Une vidéo de 60-70 s : ~2 à 4 min de rendu. Avec les images IA gratuites, compte en plus ~15 s par image (limite de Pollinations sans jeton).

Lance les générations en lot (« Générer les 5 prochaines ») et laisse tourner.

---

## 🛠️ Structure du projet

```
content_agent/
  accounts.py      ← ton éditorial, voix et style de chaque compte (modifiable)
  planner.py       ← calendrier, idées, hooks, scripts, scènes, anti-doublons
  llm.py           ← Claude Code (abonnement) / Ollama / hors-ligne
  jobs.py          ← file de tâches en arrière-plan, export
  server.py        ← API locale (FastAPI)
  video/
    tts.py         ← voix Edge / Piper + timings mot par mot
    visuals.py     ← Pollinations / Pexels / fonds locaux
    panda.py       ← mascotte Panda Boss dessinée et animée localement
    subtitles.py   ← sous-titres dynamiques (mot par mot, couleurs, encadrés)
    render.py      ← montage ffmpeg → MP4
  web/             ← interface (HTML/CSS/JS, sans dépendance)
data/              ← base SQLite, vidéos générées, cache (créé automatiquement)
assets/music/      ← tes musiques par compte
```

## ❓ Dépannage
- **« Limite d'utilisation de ton abonnement Claude atteinte »** : le quota Pro se recharge par tranches de 5 h. Relance plus tard, ou passe temporairement en mode Ollama ou hors-ligne.
- **Voix robotique** : Edge TTS était injoignable, donc Piper (local) a pris le relais. Vérifie ta connexion.
- **Fonds unis au lieu d'images** : Pollinations était injoignable ou saturé. Réessaie plus tard, ajoute un jeton gratuit Pollinations, ou une clé Pexels gratuite.

## Qualité des images et de la voix

- **Contrôle qualité des images** (Réglages → « Vérifier les images ») : Claude regarde chaque image générée et la refait (2 essais max) s'il voit un membre manquant, un panda déformé, du texte illisible ou un sujet hors-sujet. Cela prend un peu plus de temps et utilise ton abonnement Claude.
- **Panda pas partout** : chaque scène a une case « Panda dans l'image ». Quand le script parle d'un autre personnage (Madoff, un banquier…), l'image montre ce personnage à la place du panda.
- **Voix** : pauses courtes, accentuation douce, fins de phrases qui descendent naturellement.

## Personnages uniques

- Un seul panda, **Panda Boss**, avec une description fixe. Les autres personnages (Madoff…) sont créés une fois par le script, enregistrés dans `data/characters/` et réutilisés tels quels dans toutes les vidéos.
- Chaque personnage a une fiche de référence (Réglages → Personnages). Claude compare chaque image à la fiche, refuse les images avec plusieurs pandas, un personnage qui ne ressemble pas, ou une image qui ne correspond pas à la phrase dite (3 essais).

## Voix : lecture continue

La voix lit le script par blocs de plusieurs phrases d'un seul trait, comme un vrai narrateur : l'intonation s'enchaîne, les fins de phrases tombent naturellement. L'audio est ensuite découpé scène par scène grâce aux timings des mots, et les silences trop longs sont raccourcis. Si le découpage est incertain, l'app repasse automatiquement en phrase par phrase. Réglable dans Réglages → « Lecture continue de la voix ».

## Plusieurs sources d'images IA + rappels de limites

- **Pollinations** (clé gratuite, crédit qui se recharge) puis **Cloudflare Workers AI** (compte gratuit par e-mail, quota remis à zéro chaque nuit, modèle FLUX.2). L'app prend automatiquement la première source disponible et saute une source épuisée jusqu'à sa recharge.
- Cloudflare : crée un compte sur dash.cloudflare.com, puis Workers AI → « Utiliser l'API REST » : copie l'Account ID et crée un jeton « Workers AI ». Colle-les dans Réglages → Visuels, puis « Tester Cloudflare ».
- Un bandeau en haut de l'app rappelle chaque limite atteinte (Pollinations, Cloudflare, ElevenLabs) et quand plus aucune source d'images n'est disponible.
- **Cloudflare** génère en 512x912 (2 carrés facturés au lieu de 12) puis agrandit en 1080x1920 : le quota gratuit du jour couvre plusieurs vidéos au lieu d'une.
- **AI Horde** (3e source) : gratuit et sans quota, des bénévoles prêtent leur ordinateur. Plus lent (20 s à 2 min par image). Clé facultative sur aihorde.net/register pour passer devant la file anonyme.
