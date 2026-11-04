'use client';
// Suivi d'un rendez-vous par le client (lien privé reçu après la réservation ou envoyé par le pro) :
// confirmation, paiement de l'acompte, annulation dans le délai prévu.
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cap, euros, fmtDay, fmtTime } from '@/lib/fmt';
import { fn } from '@/lib/sb';

type R = { business: string; slug: string; contact: { phone: string; email: string }; service: string; starts_at: string; ends_at: string; price_cents: number; deposit_cents: number; status: string; deposit_status: string; cancel_until: string; can_pay?: boolean };

export default function RdvStatus() {
  const t = useSearchParams().get('t') ?? '';
  const [r, setR] = useState<R | null | 'missing'>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { fn<R>('book', { action: 'status', token: t }, false).then((x) => setR(x.error ? 'missing' : x)); }, [t]);

  if (r === null) return <div className="auth"><span className="muted">Chargement…</span></div>;
  if (r === 'missing') return <div className="auth"><div className="auth-card"><h1>Rendez-vous introuvable.</h1><p className="muted">Le lien est incomplet. Utilise celui reçu après ta réservation.</p></div></div>;

  const future = new Date(r.starts_at) > new Date();
  const canCancel = ['pending', 'confirmed'].includes(r.status) && new Date(r.cancel_until) > new Date();
  const needPay = r.deposit_status === 'pending' && r.deposit_cents > 0 && future && ['pending', 'confirmed'].includes(r.status);
  const title = r.status === 'cancelled' ? 'Rendez-vous annulé.' : r.status === 'done' ? 'Merci pour ta visite.' : needPay ? 'Plus qu’une étape.' : 'C’est réservé.';

  async function pay() {
    setBusy(true); setMsg('');
    const x = await fn<{ url?: string }>('book', { action: 'pay', token: t }, false);
    if (x.url) { location.href = x.url; return; }
    setBusy(false); setMsg('Le paiement en ligne n’est pas disponible pour le moment. Contacte le professionnel.');
  }
  async function cancel() {
    if (!confirm('Annuler ce rendez-vous ?')) return;
    setBusy(true); setMsg('');
    const x = await fn<R>('book', { action: 'cancel', token: t }, false);
    setBusy(false);
    if (x.error) { setMsg(x.error === 'too_late' ? 'Le délai d’annulation en ligne est dépassé. Contacte directement le professionnel.' : 'L’annulation n’a pas abouti. Réessaie.'); return; }
    setR(x);
  }

  return (
    <div className="pub">
      <div className="pub-in">
        <div className="pub-top"><span className="eyebrow">{r.business}</span><h1>{title}</h1></div>
        <div className="panel">
          <div className="list">
            <div className="row"><div className="grow"><div className="t">{r.service}</div><div className="s">{cap(fmtDay(r.starts_at))} · {fmtTime(r.starts_at)} – {fmtTime(r.ends_at)}</div></div><span className="amt">{euros(r.price_cents)}</span></div>
            {r.deposit_cents > 0 && <div className="row"><div className="grow"><div className="t">Acompte</div><div className="s">{{ pending: 'à payer pour confirmer', paid: 'payé, déduit du prix', refunded: 'remboursé', kept: 'conservé', none: '' }[r.deposit_status]}</div></div><span className="amt">{euros(r.deposit_cents)}</span></div>}
          </div>
          {needPay && <button className="b ink lg full" style={{ marginTop: 16 }} disabled={busy} onClick={pay}>Payer l’acompte · {euros(r.deposit_cents)}</button>}
          {r.status === 'pending' && !needPay && <div className="note warn" style={{ marginTop: 16 }}>Paiement en cours de vérification. Recharge la page dans un instant.</div>}
          {r.deposit_status === 'refunded' && <div className="note" style={{ marginTop: 16 }}>Ton acompte t’a été remboursé. Il apparaît sur ton compte sous quelques jours.</div>}
          {msg && <div className="note err" style={{ marginTop: 16 }}>{msg}</div>}
        </div>
        {(r.contact.phone || r.contact.email) && (
          <div className="panel"><h2>Une question ?</h2><div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {r.contact.phone && <a className="b" href={`tel:${r.contact.phone.replace(/\s/g, '')}`}>Appeler</a>}
            {r.contact.email && <a className="b" href={`mailto:${r.contact.email}`}>Écrire</a>}
          </div></div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {canCancel && <button className="b danger" disabled={busy} onClick={cancel}>Annuler mon rendez-vous</button>}
          <a className="b" href={`/r/${r.slug}`}>Nouvelle réservation</a>
        </div>
        {['pending', 'confirmed'].includes(r.status) && !canCancel && future && <p className="pub-foot">Le délai d’annulation en ligne est passé : contacte directement le professionnel.</p>}
        <p className="pub-foot">Garde ce lien pour retrouver ton rendez-vous · <a href="/">Fripe</a></p>
      </div>
    </div>
  );
}
