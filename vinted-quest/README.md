# Vinted Quest

Petit site perso pour suivre ses achats/reventes Vinted, avec un mini **jeu tycoon** : ta boutique virtuelle affiche ton
vrai stock sur ses étagères, des clients entrent, choisissent un article et font la queue à la caisse. Tu encaisses (ou ton vendeur),
tu gagnes des pièces 🪙 pour agrandir et décorer. Chaque vraie vente (5 🪙 + 1 🪙 par euro de bénéfice) déclenche une livraison et une pluie de pièces.
Site statique : pas de build, pas de dépendance à installer.

## Lancer en local
Ouvre `index.html` dans un navigateur, ou depuis ce dossier : `python3 -m http.server 8000` puis http://localhost:8000

## Deux modes
- **Démo** (par défaut) : `config.js` est vide, les données restent dans le navigateur (localStorage).
- **En ligne avec compte** : exécute `supabase-schema.sql` dans ton projet Supabase, puis renseigne
  `supabaseUrl` et `supabaseKey` (clé publishable/anon) dans `config.js`. Chaque utilisateur ne voit que ses propres lignes (RLS).

Vinted n'a pas d'API publique pour les particuliers : les articles se saisissent à la main (export CSV disponible).

## Fichiers
- `index.html`, `style.css` : page et styles
- `app.js` : suivi des articles, stats, quêtes, magasin, stockage (local ou Supabase)
- `tycoon.js` : moteur du mini-jeu (canvas 2D)
- `supabase-schema.sql` : tables `vinted_*` (+ colonne `game` pour la progression)
