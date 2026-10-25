# Vinted Quest

Suivi de mes achats/reventes Vinted, entièrement jouable en 3D : on marche dans sa boutique, ses vrais articles sont sur
les étagères, des clients entrent, choisissent et font la queue. Chaque vraie vente rapporte des pièces 🪙 (5 + 1 par euro
de bénéfice) pour agrandir son **empire** le long de la rue :

| Bâtiment | Ce qu'il montre (vraies données) | Employés |
|---|---|---|
| 🏪 Boutique | articles « En vente » en rayon | vendeur |
| 📦 Entrepôt | tout le stock, en cartons | emballeuse, magasinier (livre la boutique à pied) |
| 🏢 Bureau | bénéfice des 6 derniers mois sur un écran géant | community manager, comptable |
| 📸 Studio photo | un de tes articles sur le plateau tournant | photographe |
| 🚚 Expédition | colis des 7 derniers jours (✅) + fourgon qui part en tournée | livreur |

Les employés rapportent un peu chaque jour (plafonné) : les vraies ventes restent le moteur du jeu.

Site statique : pas de build, pas de dépendance à installer (Three.js r128 chargé depuis cdnjs).

## Lancer en local
Depuis ce dossier : `python3 -m http.server 8000` puis http://localhost:8000

## Fichiers
- `index.html`, `style.css` : page, HUD, menus
- `app.js` : articles, stats, quêtes, magasin, empire (catalogue), stockage (local, Supabase ou compte Claude)
- `world.js` : moteur 3D (boutique, personnages, clients, interactions, caméra)
- `empire.js` : rue, terrains à vendre, 4 bâtiments, employés et leurs routines
- `tools/build-artifact.py` : assemble tout en un seul fichier pour un Artifact Claude
- `icons/` : logo (SVG + PNG)
- `supabase-schema.sql` : tables `vinted_*` (mode Supabase)

## Trois modes de stockage
- **Démo** : `config.js` vide, données dans le navigateur.
- **Supabase** : exécuter `supabase-schema.sql`, renseigner `config.js` (compte email).
- **Artifact Claude** : stockage privé par utilisateur (capability `db`), détecté automatiquement.

Vinted n'a pas d'API publique pour les particuliers : les articles se saisissent à la main (ajout rapide ＋, export CSV).
