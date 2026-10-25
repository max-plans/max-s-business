# Vinted Quest

Suivi de mes achats/reventes Vinted, un tycoon 3D vu du ciel : boutique, entrepôt, QG, studio et centre d'expédition, avec camions, clients et employés.
Tes vrais articles sont sur les étagères, chaque vraie vente fait partir un camion. Chaque vraie vente rapporte des pièces 🪙 (5 + 1 par euro
de bénéfice) pour agrandir son **empire** le long de la rue :

| Bâtiment | Ce qu'il montre (vraies données) | Employés |
|---|---|---|
| 🏪 Boutique | articles « En vente » en rayon | vendeur |
| 📦 Entrepôt | tout le stock, en cartons | emballeuse, magasinier (livre la boutique à pied) |
| 🏢 QG | bénéfice des 6 derniers mois sur un écran géant | community manager, comptable |
| 📸 Studio photo | un de tes articles sur le plateau tournant | photographe |
| 🚚 Expédition | colis des 7 derniers jours (✅) + fourgon qui part en tournée | livreur |

Les employés rapportent un peu chaque jour (plafonné) : les vraies ventes restent le moteur du jeu.

Site statique : pas de build, pas de dépendance à installer (Three.js r128 chargé depuis cdnjs).

## Lancer en local
Depuis ce dossier : `python3 -m http.server 8000` puis http://localhost:8000

## Fichiers
- `index.html`, `style.css` : page, HUD, menus
- `app.js` : articles, stats, quêtes, magasin, empire (catalogue), stockage (local, Supabase ou compte Claude)
- `city-gfx.js` : rendu (Three.js, lumière jour/nuit, ombres, textures, caméra aérienne)
- `city-build.js` : bâtiments, véhicules, personnages
- `city.js` : simulation (trafic, employés, clients, camions, sélection)
- `tools/build-artifact.py` : assemble tout en un seul fichier pour un Artifact Claude
- `icons/` : logo (SVG + PNG)
- `supabase-schema.sql` : tables `vinted_*` (mode Supabase)

## Trois modes de stockage
- **Démo** : `config.js` vide, données dans le navigateur.
- **Supabase** : exécuter `supabase-schema.sql`, renseigner `config.js` (compte email).
- **Artifact Claude** : stockage privé par utilisateur (capability `db`), détecté automatiquement.

Vinted n'a pas d'API publique pour les particuliers : les articles se saisissent à la main (ajout rapide ＋, export CSV).
