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
