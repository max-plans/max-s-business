# 🏪 Sites vitrines pour commerçants

Kit pour vendre et livrer des sites internet aux petits commerces, en les personnalisant avec **Claude Code**.

```
sites-vitrines/
├── index.html                 ← page de présentation des 4 modèles (à montrer aux prospects)
└── modeles/
    ├── restaurant/            ← restaurant, café, bar, boulangerie, traiteur
    ├── beaute/                ← coiffeur, barbier, institut, onglerie, spa, masseur
    ├── artisan/               ← plombier, électricien, menuisier, paysagiste, garage…
    └── boutique/              ← fleuriste, caviste, épicerie fine, déco, vêtements…
```

Chaque modèle est **un seul fichier `index.html`** (HTML + CSS + un peu de JavaScript, sans aucun outil à installer). Double-clique dessus pour l'ouvrir dans ton navigateur.

---

## 1. Les 4 modèles

| Modèle | Style | Pensé pour… | Points forts |
|---|---|---|---|
| **Restaurant** | Chaleureux, bordeaux & doré | Donner faim et faire réserver | Carte en onglets, formule du midi, formulaire de réservation, galerie |
| **Beauté** | Élégant, doux, arrondi | Rassurer et faire prendre RDV | Grille de tarifs, équipe, carrousel d'avis, lien Planity/Calendly |
| **Artisan** | Bleu confiance & orange | **Faire appeler** | Barre d'urgence, devis gratuit en haut de page, avant/après, villes desservies, FAQ, barre d'appel mobile |
| **Boutique** | Moderne, vert & terracotta | Faire venir en boutique | Produits avec prix, commande WhatsApp pré-remplie, badge « Ouvert maintenant », Instagram, newsletter |

Ce qu'ils ont tous : responsive mobile, balises SEO + données structurées Google (JSON-LD), plan Google Maps, bouton d'appel, formulaire, avis, mentions légales en pied de page.

**Photos :** dépose les photos du client dans le dossier `images/` du modèle avec les noms indiqués en haut du fichier (`hero.jpg`, `galerie-1.jpg`…). Tant qu'une photo manque, un joli dégradé s'affiche à la place : tu peux donc faire une démo avant même d'avoir les photos.

---

## 2. Personnaliser un site avec Claude Code

Pour chaque nouveau client :

```bash
cp -r sites-vitrines/modeles/restaurant clients/chez-paulette
cd clients/chez-paulette
claude
```

Puis donne à Claude un prompt comme celui-ci (remplis les crochets) :

```
Personnalise ce site (index.html) pour mon client :
- Commerce : [Chez Paulette], [crêperie] à [Vitré]
- Slogan / ambiance : [crêperie familiale, recettes de grand-mère, terrasse]
- Adresse : [3 place du Château, 35500 Vitré] — Téléphone : [02 99 ...] — E-mail : [...]
- Horaires : [mar–dim 12h–14h et 19h–22h, fermé lundi]
- Couleurs : [bleu marine et jaune beurre] (ou : reprends les couleurs de son logo, fichier logo.png)
- Carte : [colle ici le menu ou une photo du menu]
- Avis Google : [colle 3 vrais avis]
- Réseaux : [Instagram @..., Facebook ...]

Mets à jour TOUS les textes, le titre et la description SEO, le bloc JSON-LD,
le plan Google Maps et les liens tel:/mailto:. Supprime les sections inutiles.
Écris des textes naturels et chaleureux, sans fautes, optimisés pour
« crêperie Vitré ». Ne change pas la structure technique.
```

Autres demandes utiles :
- *« Ajoute une page mentions-legales.html conforme pour une entreprise individuelle [nom, SIRET, adresse], hébergée chez Netlify. »* (obligatoire en France)
- *« Ajoute une section "Événements privés" avec un formulaire de devis. »*
- *« Traduis le site en anglais avec un bouton FR/EN. »* (vendu en option)
- *« Vérifie l'accessibilité et la vitesse du site et corrige ce qui peut l'être. »*
- *« Compresse les images du dossier images/ pour qu'elles fassent moins de 300 Ko. »*

**Pour recevoir les formulaires par e-mail :** crée un formulaire gratuit sur [formspree.io](https://formspree.io) avec l'e-mail du client, puis remplace `action="#"` par l'URL fournie.

---

## 3. Mettre en ligne (gratuit)

1. **Hébergement : Netlify** (gratuit, HTTPS inclus) → [app.netlify.com/drop](https://app.netlify.com/drop) : glisse-dépose le dossier du client, c'est en ligne en 10 secondes. Alternatives : Vercel, Cloudflare Pages, GitHub Pages.
2. **Nom de domaine** (≈ 8–15 €/an) chez OVH, Gandi ou Infomaniak → relie-le à Netlify (Domain settings).
3. **Fiche Google Business Profile** : vérifie qu'elle existe, ajoute le lien du site. C'est ce qui ramène 80 % des clients d'un commerce local — propose de l'optimiser, c'est une vraie valeur ajoutée.

> 💡 Prends le nom de domaine **au nom du client** (ou précise dans le devis qu'il lui appartient). Ça rassure énormément les commerçants.

---

## 4. 💶 Combien vendre un site ?

Repères du marché français (2026) pour un site vitrine de commerce local :
- Plateformes « à faire soi-même » (Wix, Squarespace) : 15–30 €/mois, mais le commerçant doit tout faire.
- Freelances : 500 à 2 000 €.
- Agences web : 1 500 à 5 000 €, ou abonnements à 80–150 €/mois engagés sur 48 mois.

### Grille recommandée

| Formule | Contenu | Prix création | Délai |
|---|---|---|---|
| **Essentiel** | Site d'une page (un des 4 modèles personnalisé), mobile, Google Maps, formulaire, SEO de base, mise en ligne | **590 €** | 5 jours |
| **Pro** ⭐ (à pousser) | Tout l'Essentiel + 3–5 pages (ex. carte détaillée, galerie, mentions légales), rédaction des textes, optimisation de la fiche Google Business, 2 séries de modifications | **990 €** | 1–2 semaines |
| **Premium** | Tout le Pro + réservation/RDV en ligne, version anglaise, blog ou actualités, séance photo smartphone sur place | **1 490 €** | 2–3 semaines |

**+ Maintenance mensuelle : 29 €/mois** (Essentiel) ou **39 €/mois** (Pro/Premium) : nom de domaine, hébergement, sauvegardes, petites modifications (horaires, menu, promos) dans les 48 h.
C'est **le revenu le plus important à long terme** : 30 clients × 39 € = 1 170 €/mois récurrents.

**Option « sans apport » :** 0 € à la création + **79 €/mois pendant 24 mois** (puis 39 €/mois). Beaucoup de commerçants préfèrent payer au mois ; ça facilite énormément la signature.

### Pourquoi ces prix ?
- Avec Claude Code et ces modèles, un site Essentiel te prend **3 à 6 heures** (rendez-vous inclus). À 590 €, tu es à ~100 €/h : très rentable, tout en restant 2 à 3× moins cher qu'une agence.
- Ne descends pas sous **450 €** : en dessous, le commerçant doute de la qualité, et tu ne couvres pas tes déplacements et tes retouches.
- Au début, pour tes **3 premiers clients**, tu peux proposer un **prix de lancement à 390 €** contre un avis Google + l'autorisation de les montrer en référence. Ensuite, remonte tes prix.

### Côté administratif
- Statut **micro-entrepreneur** (prestation de services, BNC/BIC) : environ 21–25 % de cotisations sur le chiffre d'affaires.
- Franchise de TVA tant que tu restes sous le seuil en vigueur → mention « TVA non applicable, art. 293 B du CGI » sur tes factures.
- Demande un **acompte de 30 à 50 %** à la signature, le solde à la mise en ligne.
- Fais signer un devis qui précise : le nombre de pages, le nombre de séries de modifications incluses, et que le client fournit textes/photos (ou que c'est en option).

---

## 5. Démarcher les commerçants : méthode qui marche

1. **Cible** les commerces sans site, ou avec un site vieux/pas adapté au mobile : cherche « restaurant [ta ville] » sur Google Maps et regarde les fiches sans bouton « Site Web ».
2. **Prépare la démo AVANT de passer** : 20 minutes avec Claude Code pour mettre leur nom, leur adresse, leurs vrais avis Google et des couleurs proches de leur devanture dans le modèle adapté. Mets-le en ligne sur Netlify.
3. **Passe en dehors des heures de rush** (restaurants : 15h–17h, commerces : en milieu de matinée), et montre le site **sur ton téléphone** :
   > « Bonjour, je suis [prénom], je crée des sites pour les commerces du quartier. J'ai vu que vous n'aviez pas de site, alors je me suis permis de vous préparer un exemple avec votre nom. Je peux vous le montrer, ça prend 30 secondes ? »
4. **Parle résultats, pas technique** : « quand quelqu'un cherche *fleuriste Angers* sur son téléphone, il tombe sur vous et peut vous appeler en un clic ».
5. **Laisse une carte** avec le lien de démo et rappelle 3 jours après.
6. Après chaque site livré : demande un **avis Google** et **un nom de commerçant** à qui ils recommanderaient ton travail.

---

## 6. Checklist de livraison

- [ ] Tous les textes d'exemple remplacés (cherche « À MODIFIER », « [Ton nom] », « 00 00 00 »)
- [ ] Photos du client compressées (< 300 Ko chacune) dans `images/`
- [ ] Téléphone et e-mail testés en cliquant dessus depuis un smartphone
- [ ] Formulaire relié à Formspree et testé
- [ ] Plan Google Maps à la bonne adresse
- [ ] Page mentions légales ajoutée
- [ ] Titre et description SEO personnalisés
- [ ] Nom de domaine relié, HTTPS actif
- [ ] Lien du site ajouté sur la fiche Google Business, Instagram et Facebook
- [ ] Facture envoyée, maintenance mensuelle mise en place
