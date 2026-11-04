# Fripe — 5 vidéos courtes sans visage (TikTok, Reels, Shorts)

1080 × 1920, 30 i/s, 17 s, musique originale synthétisée (libre de droits). Chaque vidéo finit sur la liste d'attente.

| Fichier | Accroche | Douleur |
|---|---|---|
| `fripe-video-1.mp4` | « Elle n'est pas venue. *Encore.* » | rendez-vous non honorés → acompte |
| `fripe-video-2.mp4` | « Tu fais encore tes factures *le soir ?* » | paperasse → une phrase, Fripe fait le reste |
| `fripe-video-3.mp4` | « Tu as gagné *combien ?* » | CA ≠ bénéfice → tableau de bord |
| `fripe-video-4.mp4` | « 37 messages pour 1 rendez-vous » | DM sans fin → lien de réservation en bio |
| `fripe-video-5.mp4` | « Ongles. Coaching. Photo… » | un seul outil pour tous les métiers |

## Refaire le rendu

```sh
cd fripe-videos
python3 sons.py                       # → musique-1.wav … musique-5.wav
node render.js preview 3 2 6 10       # images fixes de la vidéo 3 dans preview/
node render.js video all              # → fripe-video-1.mp4 … fripe-video-5.mp4
```

`video.html?v=N` contient les cinq timelines GSAP ; `window.seek(t)` positionne n'importe quel instant.
