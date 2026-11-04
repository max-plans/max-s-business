import Link from 'next/link';

export default function NotFound() {
  return <main className="legal" style={{ textAlign: 'center' }}><h1>Page introuvable</h1><p className="muted">Cette page n’existe pas ou plus.</p><p><Link href="/" className="btn">Retour à l’accueil</Link></p></main>;
}
