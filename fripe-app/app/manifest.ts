import type { MetadataRoute } from 'next';

// « Ajouter à l'écran d'accueil » : icône Fripe, ouverture directe sur l'espace pro, plein écran.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fripe',
    short_name: 'Fripe',
    description: 'Rendez-vous, acomptes, factures et URSSAF pour les indépendants.',
    start_url: '/app',
    display: 'standalone',
    background_color: '#F5F2EC',
    theme_color: '#F5F2EC',
    lang: 'fr',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
