'use client';
// Agenda : assistant « une phrase → un rendez-vous », rendez-vous à venir et passés, rappel en un clic,
// fin de rendez-vous (encaissement du solde + facture automatique), absence, annulation.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePro } from '@/components/AppShell';
import BookingForm, { type Draft } from '@/components/BookingForm';
import Share from '@/components/Share';
import { Field, Icon, Modal, initials, useToast } from '@/components/ui';
import { parseSentence } from '@/lib/assistant';
import { centsInput, dayLabel, euros, fmtDay, fmtTime, parts, todayLocal, toCents } from '@/lib/fmt';
import { docUrl, invoiceForBooking, sellerComplete } from '@/lib/invoice';
import { errText, sb } from '@/lib/sb';
import { METHODS, type Booking, type Client, type Doc, type Payment, type Service } from '@/lib/types';

type B = Booking & { clients: Client | null };
const STATUS: Record<Booking['status'], [string, string]> = { pending: ['Paiement en cours', 'amber'], confirmed: ['Confirmé', 'green'], done: ['Terminé', 'ink'], cancelled: ['Annulé', ''], no_show: ['Absent', 'coral'] };

export default function Agenda() {
  const { biz } = usePro();
  const toast = useToast();
  const [view, setView] = useState<'next' | 'past'>('next');
  const [rows, setRows] = useState<B[] | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [open, setOpen] = useState<B | null>(null);
  const [sentence, setSentence] = useState('');

  const load = useCallback(async () => {
    const nowIso = new Date().toISOString();
    const q = sb().from('bookings').select('*, clients(*)');
    const r = view === 'next'
      ? await q.gte('ends_at', nowIso).neq('status', 'cancelled').order('starts_at').limit(200)
      : await q.lt('ends_at', nowIso).order('starts_at', { ascending: false }).limit(200);
    setRows((r.data as B[]) ?? []);
    const ids = (r.data ?? []).map((b) => b.id);
    if (ids.length) { const p = await sb().from('payments').select('*').in('booking_id', ids); setPayments((p.data as Payment[]) ?? []); }
  }, [view]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    sb().from('services').select('*').order('position').order('created_at').then((r) => setServices(((r.data as Service[]) ?? []).filter((s) => s.active)));
    sb().from('clients').select('*').order('name').then((r) => setClients((r.data as Client[]) ?? []));
  }, []);

  const groups = useMemo(() => {
    const m = new Map<string, B[]>();
    (rows ?? []).forEach((b) => { const d = parts(new Date(b.starts_at)).day; m.set(d, [...(m.get(d) ?? []), b]); });
    return [...m.entries()];
  }, [rows]);
  const paidFor = (id: string) => payments.filter((p) => p.booking_id === id).reduce((s, p) => s + p.amount_cents, 0);

  function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!sentence.trim()) return;
    const p = parseSentence(sentence, services, clients);
    setDraft({ clientName: p.clientName, clientId: p.client?.id ?? null, serviceId: p.service?.id ?? null, day: p.day, min: p.min, price_cents: p.price_cents, duration_min: p.duration_min, title: p.title, source: 'ai' });
  }

  return (
    <>
      <div className="ap-head">
        <div><h1>Agenda</h1><p>Tes rendez-vous, tes rappels et tes encaissements.</p></div>
        <div className="ap-actions">
          <div className="seg"><button className={view === 'next' ? 'on' : ''} onClick={() => setView('next')}>À venir</button><button className={view === 'past' ? 'on' : ''} onClick={() => setView('past')}>Passés</button></div>
          <button className="b ink" onClick={() => setDraft({ source: 'manual' })}><Icon name="plus" />Rendez-vous</button>
        </div>
      </div>

      <div className="ai2" style={{ marginBottom: 14 }}>
        <form onSubmit={ask}>
          <input value={sentence} onChange={(e) => setSentence(e.target.value)} placeholder="Léa, pose gel samedi 14h, 45 €" aria-label="Décris le rendez-vous en une phrase" maxLength={200} />
          <button className="spark" aria-label="Préparer le rendez-vous" style={{ border: 0, cursor: 'pointer', color: '#fff' }}><Icon name="spark" size={16} /></button>
        </form>
        <div className="hint">Écris une phrase : Fripe prépare le rendez-vous, la demande d’acompte et, à la fin, la facture.</div>
      </div>

      <div className="panel">
        {rows === null ? <p className="muted">Chargement…</p> : rows.length === 0 ? (
          <div className="empty"><b>{view === 'next' ? 'Rien de prévu pour l’instant.' : 'Aucun rendez-vous passé.'}</b><span>Ajoute un rendez-vous ou partage ta page de réservation.</span></div>
        ) : groups.map(([day, list]) => (
          <div key={day}>
            <div className="day-h">{dayLabel(day)}</div>
            <div className="list">
              {list.map((b) => {
                const [label, tone] = STATUS[b.status];
                return (
                  <div key={b.id} className="row click" onClick={() => setOpen(b)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(b)}>
                    <span className="time">{fmtTime(b.starts_at)}</span>
                    <span className="av">{initials(b.clients?.name ?? '?')}</span>
                    <div className="grow"><div className="t">{b.clients?.name ?? 'Client'}</div><div className="s">{b.title} · {euros(b.price_cents)}{b.source === 'page' ? ' · réservé en ligne' : ''}</div></div>
                    {b.deposit_status === 'paid' && b.status === 'confirmed' ? <span className="tag green">Acompte {euros(b.deposit_cents)}</span> : <span className={'tag ' + tone}>{label}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {draft && <BookingForm draft={draft} services={services} clients={clients} onClose={() => setDraft(null)} onSaved={() => { setDraft(null); setSentence(''); load(); sb().from('clients').select('*').order('name').then((r) => setClients((r.data as Client[]) ?? [])); }} />}
      {open && <Detail b={open} paid={paidFor(open.id)} onClose={() => setOpen(null)} onChange={() => { load(); }} toast={toast} slug={biz.slug ?? ''} />}
    </>
  );
}

function Detail({ b, paid, onClose, onChange, toast, slug }: { b: B; paid: number; onClose: () => void; onChange: () => void; toast: (t: string, e?: boolean) => void; slug: string }) {
  const { biz } = usePro();
  const [mode, setMode] = useState<'view' | 'checkout' | 'done'>('view');
  const [amount, setAmount] = useState(centsInput(Math.max(0, b.price_cents - paid)));
  const [method, setMethod] = useState<Payment['method']>('card');
  const [withInvoice, setWithInvoice] = useState(sellerComplete(biz));
  const [busy, setBusy] = useState(false);
  const [doc, setDoc] = useState<Doc | null>(null);
  const c = b.clients;
  const link = `${location.origin}/r/${slug}/rdv?t=${b.public_token}`;
  const when = `${fmtDay(b.starts_at)} à ${fmtTime(b.starts_at)}`;
  const first = (c?.name ?? '').split(' ')[0];
  const reminder = `Bonjour ${first}, petit rappel : ton rendez-vous « ${b.title} » est prévu ${when}.${b.deposit_status === 'pending' && b.deposit_cents ? ` Pour le confirmer, règle l’acompte de ${euros(b.deposit_cents)} ici : ${link}` : ` Détails et annulation : ${link}`}\nÀ bientôt,\n${biz.name}`;
  const upcoming = new Date(b.ends_at) > new Date();

  async function setStatus(status: Booking['status'], extra: Partial<Booking> = {}) {
    setBusy(true);
    const r = await sb().from('bookings').update({ status, ...extra }).eq('id', b.id);
    setBusy(false);
    if (r.error) return toast(errText(r.error), true);
    onChange(); onClose();
  }

  async function checkout() {
    setBusy(true);
    const cents = toCents(amount);
    if (cents > 0) {
      const p = await sb().from('payments').insert({ business_id: biz.id, booking_id: b.id, client_id: b.client_id, label: b.title, amount_cents: cents, method, paid_on: todayLocal() });
      if (p.error) { setBusy(false); return toast(errText(p.error), true); }
    }
    const u = await sb().from('bookings').update({ status: 'done' }).eq('id', b.id);
    if (u.error) { setBusy(false); return toast(errText(u.error), true); }
    if (withInvoice) {
      const r = await invoiceForBooking(biz, b);
      if (r.error) toast(errText(r.error), true); else setDoc(r.doc!);
    }
    setBusy(false); setMode('done'); onChange();
  }

  if (mode === 'done') {
    return (
      <Modal title="C’est encaissé." onClose={onClose}>
        <div className="stack">
          <div className="note">{euros(toCents(amount))} enregistrés{doc ? ` · facture ${doc.number} émise${doc.status === 'paid' ? ' et marquée payée' : ''}` : ''}.</div>
          {doc && <>
            <p className="muted" style={{ fontSize: 14 }}>Envoie la facture à {first || 'ton client'} :</p>
            <Share phone={c?.phone} email={c?.email} subject={`Facture ${doc.number} · ${biz.name}`} text={`Bonjour ${first}, merci pour ta visite ! Voici ta facture ${doc.number} : ${docUrl(doc)}\n${biz.name}`} />
          </>}
        </div>
        <div className="foot"><button className="b ink" onClick={onClose}>Fermer</button></div>
      </Modal>
    );
  }

  if (mode === 'checkout') {
    return (
      <Modal title="Encaisser le solde" onClose={onClose}>
        <div className="stack">
          <p className="muted" style={{ fontSize: 14 }}>{b.title} · {euros(b.price_cents)}{paid ? ` · déjà reçu ${euros(paid)}` : ''}</p>
          <div className="grid2">
            <Field label="Montant reçu"><div className="pre"><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /><span style={{ padding: '0 14px 0 0' }}>€</span></div></Field>
            <Field label="Moyen de paiement"><select value={method} onChange={(e) => setMethod(e.target.value as Payment['method'])}>{(['card', 'cash', 'transfer', 'other'] as const).map((m) => <option key={m} value={m}>{METHODS[m]}</option>)}</select></Field>
          </div>
          <label className="check"><input type="checkbox" checked={withInvoice} disabled={!sellerComplete(biz)} onChange={(e) => setWithInvoice(e.target.checked)} />Créer et émettre la facture automatiquement</label>
          {!sellerComplete(biz) && <div className="note warn">Pour les factures, complète ton nom, ton adresse et ton SIRET dans Réglages.</div>}
        </div>
        <div className="foot"><button className="b" onClick={() => setMode('view')}>Retour</button><button className="b green" disabled={busy} onClick={checkout}>{busy ? '…' : 'Valider'}</button></div>
      </Modal>
    );
  }

  return (
    <Modal title={c?.name ?? 'Rendez-vous'} onClose={onClose}>
      <div className="stack">
        <div className="list">
          <div className="row"><div className="grow"><div className="t">{b.title}</div><div className="s">{dayLabel(parts(new Date(b.starts_at)).day)} · {fmtTime(b.starts_at)} – {fmtTime(b.ends_at)}</div></div><span className="amt">{euros(b.price_cents)}</span></div>
          {b.deposit_cents > 0 && <div className="row"><div className="grow"><div className="t">Acompte</div><div className="s">{{ none: '—', pending: 'pas encore payé', paid: 'payé en ligne', refunded: 'remboursé', kept: 'conservé (absence)' }[b.deposit_status]}</div></div><span className="amt">{euros(b.deposit_cents)}</span></div>}
          {paid > 0 && <div className="row"><div className="grow"><div className="t">Déjà encaissé</div></div><span className="amt">{euros(paid)}</span></div>}
          {(c?.phone || c?.email) && <div className="row"><div className="grow"><div className="t">Contact</div><div className="s">{[c?.phone, c?.email].filter(Boolean).join(' · ')}</div></div></div>}
          {b.notes && <div className="row"><div className="grow"><div className="t">Note</div><div className="s" style={{ whiteSpace: 'normal' }}>{b.notes}</div></div></div>}
        </div>
        {['confirmed', 'pending'].includes(b.status) && upcoming && (
          <div className="panel" style={{ background: 'var(--bg)', border: 0 }}>
            <h2>{b.deposit_status === 'pending' && b.deposit_cents ? 'Demander l’acompte' : 'Envoyer un rappel'}</h2>
            <p style={{ marginBottom: 12 }}>Message prêt à envoyer, avec le lien de suivi{b.deposit_status === 'pending' && b.deposit_cents ? ' et de paiement' : ''}.</p>
            <Share phone={c?.phone} email={c?.email} subject={`Rendez-vous · ${biz.name}`} text={reminder} />
          </div>
        )}
      </div>
      <div className="foot" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['confirmed', 'pending'].includes(b.status) && <button className="b danger" disabled={busy} onClick={() => confirm('Annuler ce rendez-vous ?') && setStatus('cancelled', b.deposit_status === 'pending' ? { deposit_status: 'none' } : {})}>Annuler</button>}
          {b.status === 'confirmed' && <button className="b" disabled={busy} onClick={() => setStatus('no_show', b.deposit_status === 'paid' ? { deposit_status: 'kept' } : {})}>Absent</button>}
        </div>
        {b.status === 'confirmed' && <button className="b green" onClick={() => setMode('checkout')}><Icon name="check" />Terminé · encaisser</button>}
        {b.status !== 'confirmed' && <button className="b ink" onClick={onClose}>Fermer</button>}
      </div>
    </Modal>
  );
}
