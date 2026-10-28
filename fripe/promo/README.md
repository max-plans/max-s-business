# Fripe — pub « Le chaos de Vinted » (version actuelle)

Fichier final : `fripe-pub8.mp4` — 1080 × 1920, 30 i/s, 30 s, H.264 + AAC, ~17 Mo.
Source : `pub8.html`, `musique8.py`, `ui/`. Reprend la mécanique de `pub7.html` (vraies captures, cartes qui sortent
du téléphone, cadres rouges, curseur, éventail, signature) avec un nouveau récit : le chaos de la revente, puis un seul espace.

| Temps | Scène | Texte | Image | Son |
|---|---|---|---|---|
| 0–2 s | Accroche | TON VINTED, C'EST LE CHAOS ? | Dès la 1re image : titre + notifications ; six autres arrivent de partout (messages, colis à déposer, bordereau, annonce, stock, tableur) | impact, une notification par carte |
| 2–4,5 s | Problème | Messages ? Colis ? Bordereaux ? Annonces ? Stock ? | Un mot par temps, les notifications sautent à chaque coup | une frappe par mot |
| 4,5–6 s | Bascule | Tout est éparpillé. | Tout est aspiré au centre, zoom, balayage rouge | montée, aspiration |
| 6–7,6 s | Apparition | FRIPE · Tout ton Vinted, au même endroit. | Logo, lettres | grand impact |
| 7,6–9 s | Un seul espace | Un seul espace pour tout gérer. | Vrai tableau de bord, cadre sur la barre d'onglets (accueil, articles, ventes, colis, messages) | le rythme démarre |
| 9–11,2 s | Stock | Ton stock, rangé. | Vraie fiche Veste Carhartt, cadre sur le bénéfice | ping |
| 11,2–13,6 s | Annonces | Publie sur Vinted en 1 clic. | Clic sur le vrai bouton, « Annonce pré-remplie » | clic, validation |
| 13,6–16 s | Messages | Réponds à tes acheteurs. | Vraie conversation Vinted dans Fripe, clic sur « Envoyer sur Vinted » | clic, validation |
| 16–18,4 s | Bordereaux | Ton bordereau, en 1 clic. | Vraie vente, clic sur « Bordereau », « Bordereau ouvert » (texte réel de l'appli) | clic, validation |
| 18,4–20,8 s | Colis | Chaque colis, jusqu'au paiement. | Vrai suivi, la progression court jusqu'à « Payé » | clic, trois pings |
| 21–26 s | Moment wow | Stock. Annonces. Messages. Bordereaux. Colis. → Tout au même endroit. | Cinq vrais écrans en éventail, un mot par temps, puis un seul téléphone, cadre sur la barre d'onglets | éclat, un coup par mot, éclat |
| 26–30 s | Signature | FRIPE · Ton Vinted, enfin organisé. · Essaie gratuitement · fripe-iota.vercel.app | Logo, bouton qui pulse | accord final |

Messages et bordereaux passent par l'extension Fripe Connect ; la mention « messages et bordereaux via Fripe Connect »
est affichée. Les captures de messages et de bordereau ont été prises sur une conversation et une vente reliées à Vinted
dans la vraie appli (compte de test, données d'exemple).

Voix off (facultative) :
> Ton Vinted, c'est le chaos ? Messages, colis, bordereaux, annonces, stock… tout est éparpillé.
> Fripe met tout au même endroit. Ton stock, rangé. Tes annonces publiées sur Vinted en un clic.
> Tes acheteurs, tes bordereaux, et chaque colis jusqu'au paiement. Fripe. Ton Vinted, enfin organisé.

Rendu : `python3 musique8.py && PAGE=pub8.html MUSIC=musique8.wav node render.js video`

---

# Version précédente : pub de lancement « Vendu ≠ gagné »

Fichier final : `fripe-pub7.mp4` — 1080 × 1920, 30 i/s, 30 s, H.264 + AAC, ~15 Mo.
Source : `pub7.html` (scènes et animations), `musique7.py` (piste originale), `ui/` (captures de la vraie appli).

## Analyse

- **Produit** : Fripe, le poste de pilotage des revendeurs Vinted — https://fripe-iota.vercel.app
- **Cible** : les gens qui revendent sur Vinted (vêtements, chaussures, objets).
- **Problème** : Vinted affiche ce que tu vends, pas ce que tu gagnes : il ne connaît ni ton prix d'achat ni tes frais.
  Le vrai bénéfice se calcule à la main (tableur, notes, captures).
- **Promesse** : ton vrai bénéfice, article par article, et tout ton business Vinted au même endroit.
- **Fonctions montrées** (toutes réelles) : bénéfice net par article et par mois ; « Publier sur Vinted » en 1 clic
  (extension Fripe Connect, testée sur un vrai compte) ; suivi de chaque colis jusqu'au paiement.
- **Volontairement absent** : la synchronisation des messages Vinted (pas encore vérifiée sur Vinted).
- **Interface** : toutes les images d'écran sont des captures de la vraie appli Fripe (mobile, thème sombre) avec ses
  **données d'exemple** (430 € de CA, 242 € de bénéfice net…). La mention « Données d'exemple » est affichée.

## Angle créatif

« **Vendu ≠ gagné.** » Un chiffre, un tampon : la vidéo pose une question que tout revendeur s'est déjà posée et y répond
avec le produit. Accroches envisagées : « 430 € de ventes. Combien de bénéfice ? », « Ton tableur Vinted, à la poubelle »,
« Vendu ≠ gagné » — la dernière, combinée à la première, est la plus courte, la plus vraie et elle revient en signature.

## Storyboard (120 BPM, un temps = 0,5 s)

| Temps | Scène | Texte | Image et mouvement | Son |
|---|---|---|---|---|
| 0–2 s | Accroche | 430 € · vendus sur Vinted ce mois-ci · ≠ GAGNÉ | Le nombre compte et grossit, le tampon s'écrase à 1,06 s (flash, secousse) | frappe, cliquetis, impact au tampon |
| 2–6 s | Problème | − prix d'achat ? − frais ? − envois ? − tableur, notes, captures… = ??? | Le nombre monte en haut, une ligne par temps, trait, résultat qui ne tombe jamais juste, zoom lent | une frappe par ligne, montée |
| 6–8 s | Apparition | FRIPE · Le poste de pilotage des revendeurs Vinted | Balayage dégradé rouge qui efface tout, logo qui tourne, lettres qui montent | grand impact, nappe |
| 8–10 s | Réponse | Fripe fait le calcul. · Bénéfice net = vente − achat − frais | Le téléphone (vraie capture) monte, les vraies cartes chiffres sortent en 3D, cadre rouge sur « Bénéfice net 242 € » | le rythme démarre, ping |
| 10–13,6 s | Fonction 1 | Le bénéfice de chaque article. | Vraie fiche « Veste Carhartt » (acheté 24 €, vendu 54 €), cadre sur « +30 € » | ping |
| 13,6–17,2 s | Fonction 2 | Publie sur Vinted en 1 clic. · avec l'extension gratuite Fripe Connect | Vraie fiche « Bonnet Patagonia », curseur, clic sur le vrai bouton, « Annonce pré-remplie » | clic, validation |
| 17,2–20,8 s | Fonction 3 | Chaque colis, jusqu'au paiement. | Vrai suivi « Chemise Lacoste », clic sur « Étape suivante », la progression court jusqu'à « Payé » | clic, trois pings montants |
| 21–26 s | Moment wow | Ventes. Stock. Colis. Bénéfice. → Tout au même endroit. | Les 4 vrais écrans en éventail, un mot par temps (21,5 / 22 / 22,5 / 23 s), puis ils fusionnent dans la vraie carte « Bénéfices d'octobre 242 € » | montée, impact, un coup par mot, éclat à 23,85 s |
| 26–30 s | Signature | FRIPE · Vendu ≠ gagné. · Fripe fait le calcul. · Essaie gratuitement · fripe-iota.vercel.app · Gratuit jusqu'à 20 articles · sans carte bancaire | Logo, nom, rappel de l'accroche, bouton qui pulse, fondu | impact, accord final |

Zone sûre : les textes restent entre 230 et 1 300 px de haut et à 70 px des bords (barres TikTok/Reels).

## Voix off (facultative, ~28 s)

> Quatre cent trente euros de ventes sur Vinted… mais combien dans ta poche ?
> Entre le prix d'achat, les frais et les envois, impossible de savoir.
> Fripe fait le calcul. Le bénéfice de chaque article. Publier sur Vinted en un clic.
> Et chaque colis, suivi jusqu'au paiement. Tout au même endroit.
> Vendu, c'est pas gagné. Fripe, gratuit jusqu'à vingt articles.

## Refaire le rendu

```sh
python3 musique7.py                                   # piste originale → musique7.wav
PAGE=pub7.html MUSIC=musique7.wav node render.js preview 1.3 9.6 22.2   # images fixes dans preview/
PAGE=pub7.html MUSIC=musique7.wav node render.js video  # → fripe-pub7.mp4
```

`render.js` ouvre la page dans Chromium (Playwright), positionne la timeline GSAP à chaque image (`window.seek(t)`)
et envoie les captures à ffmpeg (H.264, CRF 17, yuv420p, faststart) : le rendu est identique à chaque export.
Variables utiles : `PW` (chemin de playwright-core), `CHROME` (binaire Chromium).
Pour changer de musique, remplace `musique7.wav` par un fichier WAV de 30 s.

Les captures `ui/` ont été prises sur la vraie appli (vue mobile 400 px, ×2,7) avec un compte de test et les données
d'exemple ; pour les refaire après une évolution de l'interface, relance le script de capture (Playwright) sur `site/`.
