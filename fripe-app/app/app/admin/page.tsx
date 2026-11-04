'use client';
// Administration (propriétaire de Fripe) : liste d'attente et activité.
import { useEffect, useState } from 'react';
import { usePro } from '@/components/AppShell';
import { fmtDate } from '@/lib/fmt';
import { sb } from '@/lib/sb';

type S = { waitlist: number; waitlist_7d: number; waitlist_by_metier: Record<string, number>; waitlist_recent: { email: string; metier: string | null; at: string }[]; users: number; businesses: number; pro: number; bookings_30d: number };

export default function Admin() {
  const { account } = usePro();
  const [s, setS] = useState<S | null>(null);
  useEffect(() => { if (account.is_admin) sb().rpc('admin_stats').then((r) => setS(r.data as S)); }, [account.is_admin]);
  if (!account.is_admin) return <div className="empty"><b>Réservé au propriétaire.</b></div>;
  return (
    <>
      <div className="ap-head"><div><h1>Admin</h1><p>Liste d’attente et activité de Fripe.</p></div></div>
      {!s ? <p className="muted">Chargement…</p> : (
        <>
          <div className="kp">
            <div className="hl"><div className="l">Liste d’attente</div><div className="v">{s.waitlist}</div><div className="s">+{s.waitlist_7d} sur 7 jours</div></div>
            <div><div className="l">Comptes</div><div className="v">{s.users}</div><div className="s">{s.businesses} pages ouvertes</div></div>
            <div><div className="l">Abonnés Pro</div><div className="v">{s.pro}</div><div className="s">{s.pro * 12} € / mois environ</div></div>
            <div><div className="l">Rendez-vous</div><div className="v">{s.bookings_30d}</div><div className="s">sur 30 jours</div></div>
          </div>
          <div className="grid2">
            <div className="panel"><h2>Par métier</h2><div className="list" style={{ marginTop: 10 }}>{Object.entries(s.waitlist_by_metier).sort((a, b) => b[1] - a[1]).map(([m, n]) => <div key={m} className="row"><div className="grow t" style={{ fontWeight: 500 }}>{m}</div><span className="amt">{n}</span></div>)}</div></div>
            <div className="panel"><h2>Dernières inscriptions</h2><div className="list" style={{ marginTop: 10 }}>{s.waitlist_recent.map((w) => <div key={w.email + w.at} className="row"><div className="grow"><div className="t" style={{ fontWeight: 500 }}>{w.email}</div><div className="s">{w.metier || '—'}</div></div><span className="s muted" style={{ fontSize: 13 }}>{fmtDate(w.at)}</span></div>)}</div></div>
          </div>
        </>
      )}
    </>
  );
}
