import Link from 'next/link';

export default function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <header className="nav"><div className="wrap"><Link href="/" className="brand">Fripe</Link><Link href="/" className="btn ghost">Retour à l’accueil</Link></div></header>
      <main className="legal"><h1>{title}</h1>{children}</main>
    </>
  );
}
