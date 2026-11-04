# Fripe — nouveau site (liste d'attente)

Fripe : réservation en ligne, acomptes, factures automatiques et suivi URSSAF pour les indépendants de services.
Ce dossier contient l'étape 0 : la page d'accueil et la liste d'attente. L'ancien Fripe (outil Vinted) reste dans `../fripe/`.

## Lancer en local
```sh
npm install
npm run dev        # http://localhost:3000
npm run build      # vérifie les types et construit le site
```

## Structure
- `app/` : pages (accueil, `/pour/[métier]`, mentions légales, confidentialité), styles globaux, polices.
- `components/` : page d'accueil (`Landing`), scène 3D (`Hero3D`, three.js + React Three Fiber), formulaire de liste d'attente, animations.
- `lib/metiers.ts` : métiers mis en avant (une page par métier).
- `lib/supabase.ts` : inscription via la fonction `join_waitlist` (clé publique, la table n'est pas lisible depuis le navigateur).
- `supabase/migrations/` : table `waitlist` et fonction `join_waitlist`.

## Mise en ligne
Projet Vercel `fripe`, relié au dépôt GitHub, dossier racine `fripe-app`, framework Next.js.
