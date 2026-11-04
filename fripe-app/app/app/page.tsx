'use client';
// Tableau de bord : encaissé, bénéfice réel (encaissé − cotisations estimées − dépenses), à encaisser,
// URSSAF à déclarer, plafond de la micro-entreprise, prochains rendez-vous.
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePro } from '@/components/AppShell';
import { Icon, copyText, useToast } from '@/components/ui';
import { ACTIVITIES, cap, dayLabel, euros, fmtMonth, fmtTime, parts, todayLocal } from '@/lib/fmt';
import { sb } from '@/lib/sb';
import type { Booking, Doc, Expense, Payment } from '@/lib/types';

const ym = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;

export default function Dashboard() {
  const { biz, user } = usePro();
  const toast = useToast();
  const now = parts(new Date());
  const [cur, setCur] = useState({ y: now.y, m: now.m });
  const [pay, setPay] = useState<Payment[]>([]);
  const [exp, setExp] = useState<Expense[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [next, setNext] = useState<(Booking & { clients: { name: string } | null })[]>([]);
  const [future, setFuture] = useState<Booking[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const from = `${now.y - 1}-01-01`;
    Promise.all([
      sb().from('payments').select('*').gte('paid_on', from).order('paid_on'),
      sb().from('expenses').select('*').gte('spent_on', from),
      sb().from('documents').select('*').eq('kind', 'invoice').eq('status', 'issued'),
      sb().from('bookings').select('*, clients(name)').in('status', ['confirmed', 'pending']).gte('ends_at', new Date().toISOString()).order('starts_at').limit(6),
      sb().from('bookings').select('*').eq('status', 'confirmed').gte('starts_at', new Date().toISOString()),
    ]).then(([p, e, d, n, f]) => {
      setPay((p.data as Payment[]) ?? []); setExp((e.data as Expense[]) ?? []); setDocs((d.data as Doc[]) ?? []);
      setNext((n.data as never) ?? []); setFuture((f.data as Booking[]) ?? []); setReady(true);
    });
  }, [now.y]);

  const k = useMemo(() => {
    const key = ym(cur.y, cur.m);
    const inMonth = (d: string) => d.slice(0, 7) === key;
    const cash = pay.filter((p) => inMonth(p.paid_on)).reduce((s, p) => s + p.amount_cents, 0);
    const spent = exp.filter((e) => inMonth(e.spent_on)).reduce((s, e) => s + e.amount_cents, 0);
    const urssaf = Math.max(0, Math.round((cash * Number(biz.urssaf_rate)) / 100));
    const paidByDoc = new Map<string, number>();
    pay.forEach((p) => p.document_id && paidByDoc.set(p.document_id, (paidByDoc.get(p.document_id) ?? 0) + p.amount_cents));
    const unpaid = docs.reduce((s, d) => s + Math.max(0, d.total_cents - (paidByDoc.get(d.id) ?? 0)), 0);
    const paidByBooking = new Map<string, number>();
    pay.forEach((p) => p.booking_id && paidByBooking.set(p.booking_id, (paidByBooking.get(p.booking_id) ?? 0) + p.amount_cents));
    const upcoming = future.reduce((s, b) => s + Math.max(0, b.price_cents - (paidByBooking.get(b.id) ?? 0)), 0);
    const yearCash = pay.filter((p) => p.paid_on.startsWith(String(cur.y))).reduce((s, p) => s + p.amount_cents, 0);
    const prev = cur.m === 1 ? { y: cur.y - 1, m: 12 } : { y: cur.y, m: cur.m - 1 };
    const prevCash = pay.filter((p) => p.paid_on.slice(0, 7) === ym(prev.y, prev.m)).reduce((s, p) => s + p.amount_cents, 0);
    const months = Array.from({ length: 6 }, (_, i) => {
      let m = cur.m - 5 + i, y = cur.y; if (m < 1) { m += 12; y -= 1; }
      return { y, m, v: pay.filter((p) => p.paid_on.slice(0, 7) === ym(y, m)).reduce((s, p) => s + p.amount_cents, 0) };
    });
    return { cash, spent, urssaf, profit: cash - urssaf - spent, unpaid, upcoming, yearCash, prev, prevCash, prevUrssaf: Math.round((prevCash * Number(biz.urssaf_rate)) / 100), months };
  }, [pay, exp, docs, future, cur, biz.urssaf_rate]);

  const act = ACTIVITIES[biz.activity];
  const ceilPct = Math.min(100, (k.yearCash / act.ceiling) * 100);
  const max = Math.max(1, ...k.months.map((m) => m.v));
  const isNow = cur.y === now.y && cur.m === now.m;
  const shift = (d: number) => setCur((c) => { let m = c.m + d, y = c.y; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } return { y, m }; });
  const first = (user.email ?? '').split('@')[0];
  const pageUrl = biz.slug ? `${typeof location !== 'undefined' ? location.origin : 'https://fripe-iota.vercel.app'}/r/${biz.slug}` : '';

  return (
    <>
      <div className="ap-head">
        <div>
          <h1>Bonjour{biz.name ? `, ${biz.name}` : first ? `, ${first}` : ''}.</h1>
          <p>{isNow ? 'Voici ton mois, à jour.' : `Ton bilan de ${fmtMonth(cur.y, cur.m)}.`}</p>
        </div>
        <div className="ap-actions">
          <div className="seg">
            <button onClick={() => shift(-1)} aria-label="Mois précédent">‹</button>
            <button className="on" onClick={() => setCur({ y: now.y, m: now.m })}>{cap(fmtMonth(cur.y, cur.m))}</button>
            <button onClick={() => shift(1)} aria-label="Mois suivant" disabled={isNow}>›</button>
          </div>
        </div>
      </div>

      <div className="kp">
        <div className="hl"><div className="l">Encaissé</div><div className="v">{euros(k.cash)}</div><div className="s">ce que tu as vraiment reçu</div></div>
        <div className="good"><div className="l">Bénéfice réel</div><div className="v">{euros(k.profit)}</div><div className="s">après URSSAF et dépenses</div></div>
        <div><div className="l">À encaisser</div><div className="v">{euros(k.unpaid + k.upcoming)}</div><div className="s">{euros(k.unpaid)} de factures · {euros(k.upcoming)} de rendez-vous</div></div>
        <div><div className="l">URSSAF estimée</div><div className="v">{euros(k.urssaf)}</div><div className="s">{String(biz.urssaf_rate).replace('.', ',')} % de l’encaissé</div></div>
      </div>

      <div className="grid2 dash2">
        <div className="stack">
          <div className="panel">
            <div className="panel-head"><div><h2>Encaissé sur 6 mois</h2><p className="muted" style={{ fontSize: 14 }}>Dépenses du mois : {euros(k.spent)}</p></div><Link href="/app/depenses" className="b sm">Dépenses</Link></div>
            <div className="bar-chart">
              {k.months.map((m) => (
                <div key={m.y + '-' + m.m} className={m.y === cur.y && m.m === cur.m ? 'cur' : ''}>
                  <b>{m.v ? euros(m.v) : ''}</b>
                  <i style={{ height: `${Math.max(3, (m.v / max) * 120)}px` }} />
                  <span>{new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(m.y, m.m - 1, 15)))}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h2>Prochains rendez-vous</h2><Link href="/app/agenda" className="b sm">Agenda</Link></div>
            {!ready ? <p className="muted">…</p> : next.length === 0 ? (
              <div className="empty"><b>Aucun rendez-vous à venir.</b><span>Partage ta page en bio pour que tes clients réservent seuls.</span>
                {pageUrl && <button className="b sm ink" onClick={async () => toast((await copyText(pageUrl)) ? 'Lien copié' : pageUrl)}><Icon name="copy" />Copier le lien de ma page</button>}
              </div>
            ) : (
              <div className="list">
                {next.map((b) => (
                  <Link key={b.id} href="/app/agenda" className="row click" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <span className="time">{fmtTime(b.starts_at)}</span>
                    <div className="grow"><div className="t">{b.clients?.name ?? 'Client'} · {b.title}</div><div className="s">{dayLabel(parts(new Date(b.starts_at)).day)}</div></div>
                    {b.deposit_status === 'paid' ? <span className="tag green">Acompte payé</span> : b.status === 'pending' ? <span className="tag amber">Paiement en cours</span> : null}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="stack">
          <div className="panel">
            <h2>À déclarer à l’URSSAF</h2>
            <p>Chiffre d’affaires encaissé en {fmtMonth(k.prev.y, k.prev.m)}, à déclarer sur autoentrepreneur.urssaf.fr.</p>
            <div className="row" style={{ marginTop: 10 }}><div className="grow"><div className="t">Chiffre d’affaires</div></div><span className="amt">{euros(k.prevCash)}</span></div>
            <div className="row"><div className="grow"><div className="t">Cotisations estimées</div><div className="s">{String(biz.urssaf_rate).replace('.', ',')} %</div></div><span className="amt">{euros(k.prevUrssaf)}</span></div>
          </div>
          <div className="panel">
            <h2>Plafond {cur.y}</h2>
            <p>Micro-entreprise : {euros(act.ceiling)} de chiffre d’affaires par an.</p>
            <div className="gauge"><i style={{ width: ceilPct + '%' }} /></div>
            <div className="row" style={{ border: 0, padding: '4px 0' }}><div className="grow s" style={{ color: 'var(--muted)', fontSize: 13.5 }}>{euros(k.yearCash)} encaissés · {ceilPct.toFixed(0)} %</div></div>
            {k.yearCash > act.vat && <div className="note warn">Tu as dépassé {euros(act.vat)} cette année : vérifie si tu dois facturer la TVA.</div>}
          </div>
          {pageUrl && (
            <div className="panel">
              <h2>Ta page de réservation</h2>
              <p style={{ wordBreak: 'break-all' }}>{pageUrl.replace(/^https?:\/\//, '')}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                <button className="b sm ink" onClick={async () => toast((await copyText(pageUrl)) ? 'Lien copié, colle-le dans ta bio' : pageUrl)}><Icon name="copy" />Copier</button>
                <a className="b sm" href={pageUrl} target="_blank" rel="noreferrer">Voir ma page</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
