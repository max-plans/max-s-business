import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Landing from '@/components/Landing';
import { METIERS, metierBySlug } from '@/lib/metiers';

// Une page par métier : même produit, message adapté (vendu métier par métier).
export function generateStaticParams() { return METIERS.map((m) => ({ metier: m.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ metier: string }> }): Promise<Metadata> {
  const m = metierBySlug((await params).metier);
  return m ? { title: `Fripe pour les ${m.who} — réservations, acomptes et factures`, description: `Fini ${m.pain}. Rendez-vous, acomptes, factures et URSSAF pour les ${m.who}.` } : {};
}

export default async function Page({ params }: { params: Promise<{ metier: string }> }) {
  const m = metierBySlug((await params).metier);
  if (!m) notFound();
  return <Landing metier={m} />;
}
