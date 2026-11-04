import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, Instrument_Serif } from 'next/font/google';
import './globals.css';

// Polices téléchargées par Next.js au moment de la construction, puis servies par le site lui-même (aucun appel à Google côté visiteur).
const sans = Instrument_Sans({ subsets: ['latin'], variable: '--f-sans', display: 'swap' });
const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--f-serif', display: 'swap' });

export const metadata: Metadata = {
  title: 'Fripe — Ton client réserve et paie. La facture part toute seule.',
  description: 'Réservation en ligne, acomptes, factures automatiques et suivi URSSAF pour les indépendants. Sans commission.',
  metadataBase: new URL('https://fripe-iota.vercel.app'),
  openGraph: { title: 'Fripe', description: 'Ton client réserve et paie. La facture part toute seule.', locale: 'fr_FR', type: 'website' },
};
export const viewport: Viewport = { themeColor: '#F5F2EC' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
