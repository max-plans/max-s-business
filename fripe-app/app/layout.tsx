import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const sans = localFont({ src: './fonts/InstrumentSans-Variable.woff2', variable: '--f-sans', display: 'swap', weight: '400 700' });
const serif = localFont({
  src: [{ path: './fonts/InstrumentSerif-Regular.woff2', style: 'normal' }, { path: './fonts/InstrumentSerif-Italic.woff2', style: 'italic' }],
  variable: '--f-serif', display: 'swap', weight: '400',
});

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
