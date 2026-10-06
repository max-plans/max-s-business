# 🎬 TikTok Factory : 3 comptes faceless en pilote automatique

Génère chaque jour des vidéos TikTok de **plus d'une minute** (éligibles au Creator Rewards Program) avec :
- un **script original** écrit par Claude (accroche, relances, chute) ;
- une **voix off** naturelle (Edge TTS gratuit, ou ElevenLabs premium) ;
- des **sous-titres animés mot par mot** (le mot prononcé s'allume, les mots-clés sont colorés) ;
- des **plans vidéo libres de droits** (Pexels), recadrés en 9:16, avec effet de mouvement et étalonnage ;
- une **musique de fond** qui baisse automatiquement quand la voix parle, et un volume normalisé pour TikTok ;
- un envoi automatique **sur ton téléphone (Telegram)** et/ou **directement sur TikTok**.

| Compte | Fichier | Style |
|---|---|---|
| 🎬 Mindset / discipline | `channels/mindset.yaml` | Voix grave, images sombres et cinématiques, police Anton, jaune et rouge |
| 🏛️ Stoïcien / philosophe | `channels/stoic.yaml` | Voix posée, statues et marbre, sépia + grain, police Cinzel dorée, citation en encadré |
| 💰 Leçon d'argent express | `channels/finance.yaml` | Voix dynamique, chiffres en encadré, police Poppins, vert « argent » |

---

## 1. Les clés à créer (15 minutes, une seule fois)

| Secret | Obligatoire ? | Où l'obtenir | Prix |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | https://console.anthropic.com → API Keys | ≈ 0,05 à 0,10 € par script |
| `PEXELS_API_KEY` | ✅ (sinon fond uni animé) | https://www.pexels.com/api/ | gratuit |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | conseillé | Telegram → @BotFather → `/newbot`. Envoie un message à ton bot, puis ouvre `https://api.telegram.org/bot<TOKEN>/getUpdates` pour lire ton `chat.id` | gratuit |
| `ELEVENLABS_API_KEY` | optionnel | https://elevenlabs.io (puis `engine: elevenlabs` + `elevenlabs_voice_id` dans le .yaml) | à partir de 5 $/mois |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REFRESH_TOKEN_MINDSET` / `_STOIC` / `_FINANCE` | optionnel | voir §4 | gratuit |

Sur GitHub : **Settings → Secrets and variables → Actions → New repository secret**, pour chaque clé.

## 2. Activer l'automatisation

1. Fusionne cette branche dans `main`. GitHub ne lance les tâches planifiées que depuis la branche par défaut.
2. Onglet **Actions** → « Vidéos TikTok quotidiennes » → **Enable workflow**.
3. Test immédiat : **Run workflow** (tu peux choisir un compte et un sujet).

Par défaut, le workflow tourne **2 fois par jour** (≈ 10h40 et 17h40, heure de Paris) et produit **1 vidéo par compte à chaque passage**, soit 2 vidéos par jour et par compte. Pour n'en faire qu'une, supprime une ligne `cron` dans `.github/workflows/daily-videos.yml`.

Les vidéos arrivent sur Telegram, avec la légende et les hashtags prêts à copier. Elles sont aussi téléchargeables 7 jours dans l'onglet Actions (« Artifacts »). Les sujets déjà traités sont mémorisés dans `data/history/` pour ne jamais se répéter.

## 3. La musique

Mets 3 à 10 morceaux libres de droits par compte dans `assets/music/mindset/`, `assets/music/stoic/` et `assets/music/finance/`. Sources : [Pixabay Music](https://pixabay.com/music/), YouTube Audio Library. Un morceau est tiré au hasard à chaque vidéo.

> 💡 Pour la portée, le mieux reste d'ajouter un **son tendance directement dans l'appli TikTok** au moment de publier : c'est exactement ce que permet le mode « brouillon » ci-dessous. Dans ce cas, laisse les dossiers de musique vides ou baisse `music_volume`.

## 4. Publication sur TikTok

**Option A, la plus simple et la plus sûre :** la vidéo arrive sur Telegram. Tu l'enregistres, tu l'importes dans TikTok, tu colles la légende et tu publies. Compte 30 secondes par vidéo.

**Option B, l'API TikTok :**
1. Crée une appli sur https://developers.tiktok.com. Ajoute le produit **Content Posting API** et les scopes `video.upload` et `video.publish`. Déclare une *Redirect URI* en https (n'importe quelle page que tu contrôles).
2. Sur ton ordinateur, lance `python -m tiktok_factory.tiktok_auth` **une fois par compte**, en étant connecté au bon compte TikTok. Mets chaque refresh token dans le secret correspondant. Il est valable 1 an.
3. Modes de publication (variable GitHub `TIKTOK_MODE`, dans *Settings → Variables*) :
   - `inbox` (défaut) : la vidéo arrive en **brouillon dans ton appli TikTok**. Tu ajoutes un son et tu publies. Fonctionne tout de suite.
   - `direct` : publication 100 % automatique. ⚠️ Tant que TikTok n'a pas validé (audité) ton appli, les vidéos sont publiées **en privé uniquement**. Demande l'audit depuis le portail développeur.

## 5. Lancer en local

```bash
pip install -r requirements.txt          # + ffmpeg installé sur la machine
export ANTHROPIC_API_KEY=... PEXELS_API_KEY=...
python -m tiktok_factory finance --no-publish            # 1 vidéo finance
python -m tiktok_factory stoic --topic "Sénèque et la colère"
python -m tiktok_factory mindset --count 3               # 3 vidéos d'avance
python -m tiktok_factory finance --script-json examples/finance_interets_composes.json --no-publish
```

Les vidéos sont écrites dans `output/<date>/<compte>/` (`.mp4`, plus `.txt` pour la légende et `.json` pour le script).

## 6. Personnaliser

Tout se règle dans `channels/<compte>.yaml`, sans toucher au code :
- `handle` : ton pseudo, affiché en filigrane (**à changer**) ;
- `voice` : voix, vitesse, grave/aigu. Voix françaises Edge : `fr-FR-HenriNeural`, `fr-FR-RemyMultilingualNeural`, `fr-FR-VivienneMultilingualNeural`, `fr-FR-DeniseNeural`, `fr-FR-EloiseNeural`, `fr-CH-FabriceNeural`, `fr-BE-GerardNeural` ;
- `style` : police, taille, couleurs, position des sous-titres, étalonnage, grain, vignettage ;
- `script` : ton, structure, longueur, **liste de sujets** et hashtags.

## 7. Conseils pour la monétisation

- **Creator Rewards** : il faut 10 000 abonnés, 100 000 vues sur 30 jours, des vidéos de plus d'1 min et du **contenu original**. Le générateur écrit des scripts originaux ; garde une identité forte par compte (même voix, même style).
- **Contenu IA** : active l'étiquette « contenu généré par IA » quand TikTok la propose (en mode `direct`, elle est déjà envoyée via l'API).
- **Régularité** : 1 à 2 vidéos par jour et par compte, aux mêmes heures. Regarde les statistiques après 2 semaines et retire de `topics` les sujets qui ne marchent pas.
- **Finance** : la mention « Ceci n'est pas un conseil en investissement » est ajoutée automatiquement (voix et légende). Ne promets jamais de gains.
- **Relis de temps en temps** quelques vidéos, surtout les citations du compte stoïcien et les chiffres du compte finance.
