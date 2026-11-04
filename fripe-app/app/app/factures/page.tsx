'use client';
// Factures et devis : brouillon, émission (numéro chronologique), envoi, encaissement, relance des impayés,
// devis accepté transformé en facture.
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePro } from '@/components/AppShell';
import Share from '@/components/Share';
import { Field, Icon, Modal, useToast } from '@/components/ui';
import { centsInput, euros, fmtDate, todayLocal, toCents, addDays } from '@/lib/fmt';
import { docUrl, sellerComplete } from '@/lib/invoice';
import { errText, sb } from '@/lib/sb';
import { METHODS, docTotal, type Client, type Doc, type Item, type Payment } from '@/lib/types';

const ST: Record<Doc['status'], [string, string]> = { draft: ['Brouillon', ''], issued: ['Envoyée', 'amber'], paid: ['Payée', 'green'], cancelled: ['Annulée', ''], accepted: ['Accepté', 'green'], refused: ['Refusé', 'coral'] };

export default function Factures() {
  const { biz } = usePro();
  const toast = useToast();
  const [kind, setKind] = useState<'invoice' | 'quote'>('invoice');
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [edit, setEdit] = useState<Partial<Doc> | null>(null);
  const [open, setOpen] = useState<Doc | null>(null);

  const load = useCallback(async () => {
    const [d, c, p] = await Promise.all([
      sb().from('documents').select('*').order('created_at', { ascending: false }).limit(500),
      sb().from('clients').select('*').order('name'),
      sb().from('payments').select('*').not('document_id', 'is', null),
    ]);
    setDocs((d.data as Doc[]) ?? []); setClients((c.data as Client[]) ?? []); setPayments((p.data as Payment[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => (docs ?? []).filter((d) => d.kind === kind), [docs, kind]);
  const paidOf = (id: string) => payments.filter((p) => p.document_id === id).reduce((s, p) => s + p.amount_cents, 0);
  const clientName = (d: Doc) => d.client_snapshot?.name || clients.find((c) => c.id === d.client_id)?.name || '—';
  const overdue = (d: Doc) => d.kind === 'invoice' && d.status === 'issued' && !!d.due_on && d.due_on < todayLocal();
  const unpaidTotal = (docs ?? []).filter((d) => d.kind === 'invoice' && d.status === 'issued').reduce((s, d) => s + Math.max(0, d.total_cents - paidOf(d.id)), 0);

  return (
    <>
      <div className="ap-head">
        <div><h1>Factures</h1><p>{unpaidTotal ? `${euros(unpaidTotal)} en attente de paiement.` : 'Conformes, numérotées, prêtes à envoyer.'}</p></div>
        <div className="ap-actions">
          <div className="seg"><button className={kind === 'invoice' ? 'on' : ''} onClick={() => setKind('invoice')}>Factures</button><button className={kind === 'quote' ? 'on' : ''} onClick={() => setKind('quote')}>Devis</button></div>
          <button className="b ink" onClick={() => setEdit({ kind, items: [{ label: '', qty: 1, unit_cents: 0 }], notes: '' })}><Icon name="plus" />{kind === 'invoice' ? 'Facture' : 'Devis'}</button>
        </div>
      </div>
      {!sellerComplete(biz) && <div className="note warn" style={{ marginBottom: 14 }}>Pour émettre des factures, complète ton nom, ton adresse et ton SIRET dans <Link href="/app/reglages">Réglages</Link>.</div>}
      <div className="panel">
        {docs === null ? <p className="muted">Chargement…</p> : list.length === 0 ? (
          <div className="empty"><b>{kind === 'invoice' ? 'Aucune facture.' : 'Aucun devis.'}</b><span>{kind === 'invoice' ? 'Elles se créent toutes seules quand tu termines un rendez-vous, ou à la main ici.' : 'Prépare un devis, ton client l’ouvre avec un lien.'}</span></div>
        ) : (
          <div className="list">
            {list.map((d) => {
              const [label, tone] = overdue(d) ? ['En retard', 'coral'] : ST[d.status];
              return (
                <div key={d.id} className="row click" role="button" tabIndex={0} onClick={() => (d.status === 'draft' ? setEdit(d) : setOpen(d))} onKeyDown={(e) => e.key === 'Enter' && (d.status === 'draft' ? setEdit(d) : setOpen(d))}>
                  <div className="grow"><div className="t">{clientName(d)}</div><div className="s">{d.number ?? 'Brouillon'} · {d.issued_on ? fmtDate(d.issued_on) : fmtDate(d.created_at)}{d.items?.[0]?.label ? ' · ' + d.items[0].label : ''}</div></div>
                  <span className="amt">{euros(d.status === 'draft' ? docTotal(d.items ?? []) : d.total_cents)}</span>
                  <span className={'tag ' + tone}>{label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {edit && <Editor doc={edit} clients={clients} onClose={() => setEdit(null)} onSaved={(d) => { setEdit(null); load(); if (d) setOpen(d); }} />}
      {open && <DocView doc={open} paid={paidOf(open.id)} onClose={() => setOpen(null)} onChange={(d) => { load(); setOpen(d); }} toast={toast} />}
    </>
  );
}

function Editor({ doc, clients, onClose, onSaved }: { doc: Partial<Doc>; clients: Client[]; onClose: () => void; onSaved: (d: Doc | null) => void }) {
  const { biz } = usePro();
  const toast = useToast();
  const isQuote = doc.kind === 'quote';
  const [clientId, setClientId] = useState(doc.client_id ?? '');
  const [nc, setNc] = useState({ name: '', email: '', address: '' });
  const [items, setItems] = useState<(Item & { price: string })[]>((doc.items ?? []).map((i) => ({ ...i, price: centsInput(i.unit_cents) })));
  const [due, setDue] = useState(doc.due_on ?? addDays(todayLocal(), 30));
  const [notes, setNotes] = useState(doc.notes ?? '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const rows = items.map((i) => ({ label: i.label.trim(), qty: Number(String(i.qty).replace(',', '.')) || 0, unit_cents: toCents(i.price) }));
  const total = docTotal(rows);
  const setItem = (k: number, patch: Partial<Item & { price: string }>) => setItems(items.map((x, i) => (i === k ? { ...x, ...patch } : x)));

  async function save(issue: boolean) {
    setErr('');
    const good = rows.filter((r) => r.label && r.qty > 0);
    if (!good.length) return setErr('Ajoute au moins une ligne avec un intitulé.');
    setBusy(true);
    let cid = clientId;
    if (!cid) {
      if (!nc.name.trim()) { setBusy(false); return setErr('Choisis ou crée un client.'); }
      const r = await sb().from('clients').insert({ business_id: biz.id, name: nc.name.trim(), email: nc.email.trim().toLowerCase(), address: nc.address.trim() }).select('id').single();
      if (r.error) { setBusy(false); return setErr(errText(r.error)); }
      cid = r.data.id;
    }
    const row = { business_id: biz.id, kind: doc.kind, client_id: cid, items: good, total_cents: docTotal(good), due_on: due, notes: notes.trim() };
    const r = doc.id ? await sb().from('documents').update(row).eq('id', doc.id).select().single() : await sb().from('documents').insert(row).select().single();
    if (r.error) { setBusy(false); return setErr(errText(r.error)); }
    if (!issue) { setBusy(false); toast('Brouillon enregistré'); return onSaved(null); }
    const iss = await sb().rpc('issue_document', { doc: r.data.id });
    setBusy(false);
    if (iss.error) return setErr(errText(iss.error));
    toast(isQuote ? 'Devis émis' : 'Facture émise');
    onSaved(iss.data as Doc);
  }

  async function remove() {
    if (!doc.id || !confirm('Supprimer ce brouillon ?')) return;
    await sb().from('documents').delete().eq('id', doc.id);
    onSaved(null);
  }

  return (
    <Modal title={doc.id ? `Brouillon de ${isQuote ? 'devis' : 'facture'}` : isQuote ? 'Nouveau devis' : 'Nouvelle facture'} onClose={onClose} wide>
      <div className="stack">
        <Field label="Client">
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">+ Nouveau client</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        {!clientId && (
          <div className="grid3">
            <Field label="Nom ou société"><input value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} maxLength={120} /></Field>
            <Field label="E-mail"><input type="email" value={nc.email} onChange={(e) => setNc({ ...nc, email: e.target.value })} maxLength={200} /></Field>
            <Field label="Adresse" hint="Obligatoire si ton client est un professionnel."><input value={nc.address} onChange={(e) => setNc({ ...nc, address: e.target.value })} maxLength={200} /></Field>
          </div>
        )}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 70px 110px 36px', gap: 8, fontSize: 12.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}><span>Intitulé</span><span>Qté</span><span>Prix unitaire</span><span /></div>
          {items.map((it, k) => (
            <div key={k} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 70px 110px 36px', gap: 8, marginBottom: 8 }}>
              <input className="in" value={it.label} onChange={(e) => setItem(k, { label: e.target.value })} placeholder="Pose gel" maxLength={200} aria-label="Intitulé" />
              <input className="in" inputMode="decimal" value={String(it.qty)} onChange={(e) => setItem(k, { qty: e.target.value as unknown as number })} aria-label="Quantité" />
              <input className="in" inputMode="decimal" value={it.price} onChange={(e) => setItem(k, { price: e.target.value })} placeholder="0" aria-label="Prix unitaire" />
              <button className="b ghost sm" onClick={() => setItems(items.filter((_, i) => i !== k))} aria-label="Retirer la ligne" disabled={items.length === 1}><Icon name="x" /></button>
            </div>
          ))}
          <button className="b sm" onClick={() => setItems([...items, { label: '', qty: 1, unit_cents: 0, price: '' }])}><Icon name="plus" />Ligne</button>
        </div>
        <div className="grid2">
          <Field label={isQuote ? 'Valable jusqu’au' : 'À payer avant le'}><input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
          <Field label="Total"><div className="in" style={{ display: 'flex', alignItems: 'center', fontWeight: 700 }}>{euros(total, true)}</div></Field>
        </div>
        <Field label="Note sur le document (facultatif)"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={2} placeholder="Merci pour ta confiance !" /></Field>
        {err && <div className="note err">{err}</div>}
      </div>
      <div className="foot" style={{ justifyContent: 'space-between' }}>
        <div>{doc.id && <button className="b danger" onClick={remove}><Icon name="trash" />Supprimer</button>}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="b" disabled={busy} onClick={() => save(false)}>Brouillon</button>
          <button className="b ink" disabled={busy || !sellerComplete(biz)} onClick={() => save(true)}>{busy ? '…' : isQuote ? 'Émettre le devis' : 'Émettre la facture'}</button>
        </div>
      </div>
    </Modal>
  );
}

function DocView({ doc, paid, onClose, onChange, toast }: { doc: Doc; paid: number; onClose: () => void; onChange: (d: Doc | null) => void; toast: (t: string, e?: boolean) => void }) {
  const { biz } = usePro();
  const [pay, setPay] = useState(false);
  const [amount, setAmount] = useState(centsInput(Math.max(0, doc.total_cents - paid)));
  const [method, setMethod] = useState<Payment['method']>('transfer');
  const [busy, setBusy] = useState(false);
  const c = doc.client_snapshot ?? {};
  const first = (c.name ?? '').split(' ')[0];
  const url = docUrl(doc);
  const late = doc.kind === 'invoice' && doc.status === 'issued' && !!doc.due_on && doc.due_on < todayLocal();
  const isQuote = doc.kind === 'quote';
  const text = isQuote
    ? `Bonjour ${first}, voici mon devis ${doc.number} de ${euros(doc.total_cents, true)} : ${url}\nIl est valable jusqu’au ${doc.due_on ? fmtDate(doc.due_on) : ''}. Dis-moi s’il te convient !\n${biz.name}`
    : late
      ? `Bonjour ${first}, sauf erreur de ma part, la facture ${doc.number} de ${euros(doc.total_cents - paid, true)} arrivait à échéance le ${fmtDate(doc.due_on!)}. La voici : ${url}\nMerci d’avance pour ton règlement,\n${biz.name}`
      : `Bonjour ${first}, voici ta facture ${doc.number} de ${euros(doc.total_cents, true)} : ${url}\nMerci !\n${biz.name}`;

  async function status(s: Doc['status']) {
    setBusy(true);
    const r = await sb().from('documents').update({ status: s }).eq('id', doc.id).select().single();
    setBusy(false);
    if (r.error) return toast(errText(r.error), true);
    onChange(r.data as Doc);
  }
  async function markPaid() {
    setBusy(true);
    const cents = toCents(amount);
    if (cents > 0) {
      const p = await sb().from('payments').insert({ business_id: biz.id, document_id: doc.id, client_id: doc.client_id, label: `Facture ${doc.number}`, amount_cents: cents, method, paid_on: todayLocal() });
      if (p.error) { setBusy(false); return toast(errText(p.error), true); }
    }
    setBusy(false); setPay(false);
    if (paid + cents >= doc.total_cents) await status('paid'); else { toast('Paiement partiel enregistré'); onChange(doc); }
  }
  async function toInvoice() {
    setBusy(true);
    const ins = await sb().from('documents').insert({ business_id: biz.id, kind: 'invoice', client_id: doc.client_id, items: doc.items, total_cents: doc.total_cents, notes: doc.notes }).select('id').single();
    if (ins.error) { setBusy(false); return toast(errText(ins.error), true); }
    const iss = await sb().rpc('issue_document', { doc: ins.data.id });
    setBusy(false);
    if (iss.error) return toast(errText(iss.error), true);
    toast(`Facture ${(iss.data as Doc).number} émise`);
    onChange(iss.data as Doc);
  }

  return (
    <Modal title={`${isQuote ? 'Devis' : 'Facture'} ${doc.number}`} onClose={onClose}>
      <div className="stack">
        <div className="list">
          <div className="row"><div className="grow"><div className="t">{c.name}</div><div className="s">Émis le {doc.issued_on ? fmtDate(doc.issued_on) : '—'} · {isQuote ? 'valable' : 'échéance'} {doc.due_on ? fmtDate(doc.due_on) : '—'}</div></div><span className="amt">{euros(doc.total_cents, true)}</span></div>
          {!isQuote && paid > 0 && <div className="row"><div className="grow"><div className="t">Déjà reçu</div></div><span className="amt">{euros(paid, true)}</span></div>}
        </div>
        {late && <div className="note err">Échéance dépassée : envoie une relance.</div>}
        {['issued', 'paid', 'accepted'].includes(doc.status) && (
          <div className="panel" style={{ background: 'var(--bg)', border: 0 }}>
            <h2>{late ? 'Relancer' : 'Envoyer'}</h2>
            <p style={{ marginBottom: 12 }}>Ton client ouvre le document avec ce lien, sans compte.</p>
            <Share phone={c.phone} email={c.email} subject={`${isQuote ? 'Devis' : 'Facture'} ${doc.number} · ${biz.name}`} text={text} onSent={late ? () => sb().from('documents').update({ last_reminder_at: new Date().toISOString() }).eq('id', doc.id) : undefined} />
          </div>
        )}
        {pay && (
          <div className="grid2">
            <Field label="Montant reçu"><div className="pre"><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /><span style={{ padding: '0 14px 0 0' }}>€</span></div></Field>
            <Field label="Moyen"><select value={method} onChange={(e) => setMethod(e.target.value as Payment['method'])}>{(['transfer', 'card', 'cash', 'other'] as const).map((m) => <option key={m} value={m}>{METHODS[m]}</option>)}</select></Field>
          </div>
        )}
      </div>
      <div className="foot" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a className="b" href={url} target="_blank" rel="noreferrer"><Icon name="print" />Voir / PDF</a>
          {doc.status === 'issued' && <button className="b danger" disabled={busy} onClick={() => confirm('Annuler ce document ? Il reste dans ta numérotation.') && status('cancelled')}>Annuler</button>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!isQuote && doc.status === 'issued' && (pay ? <button className="b green" disabled={busy} onClick={markPaid}>Valider</button> : <button className="b green" onClick={() => setPay(true)}><Icon name="check" />Paiement reçu</button>)}
          {isQuote && doc.status === 'issued' && <><button className="b" disabled={busy} onClick={() => status('refused')}>Refusé</button><button className="b green" disabled={busy} onClick={() => status('accepted')}>Accepté</button></>}
          {isQuote && doc.status === 'accepted' && <button className="b ink" disabled={busy} onClick={toInvoice}>Créer la facture</button>}
        </div>
      </div>
    </Modal>
  );
}
