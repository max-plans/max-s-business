# Vinted Quest

Petit site perso pour suivre ses achats/reventes Vinted, avec un vrai petit jeu : tes ventes te rapportent des pièces 🪙
(5 par vente + 1 par euro de bénéfice) pour aménager ta boutique virtuelle, avec quêtes du jour/semaine/mois et clients à servir.
Site statique : pas de build, pas de dépendance à installer.

## Lancer en local
Ouvre `index.html` dans un navigateur, ou depuis ce dossier : `python3 -m http.server 8000` puis http://localhost:8000

## Deux modes
- **Démo** (par défaut) : `config.js` est vide, les données restent dans le navigateur (localStorage).
- **En ligne avec compte** : exécute `supabase-schema.sql` dans ton projet Supabase, puis renseigne
  `supabaseUrl` et `supabaseKey` (clé publishable/anon) dans `config.js`. Chaque utilisateur ne voit que ses propres lignes (RLS).

Vinted n'a pas d'API publique pour les particuliers : les articles se saisissent à la main (export CSV disponible).
