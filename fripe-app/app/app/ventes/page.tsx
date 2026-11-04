'use client';
// Ventes : tout ce que tu encaisses. Les acomptes en ligne et les rendez-vous terminés s'y ajoutent tout seuls ;
// une vente hors rendez-vous (produit, carte cadeau, prestation payée sur place…) se note ici en quelques secondes.
import { useEffect, useMemo, useState } from 'react';
import { usePro } from '@/components/AppShell';
import { Field, Icon, Modal, useToast } from '@/components/ui';
import { cap, centsInput, euros, fmtDate, fmtMonth, todayLocal, toCents } from '@/lib/fmt';
import { errText, sb } from '@/lib/sb';
import { METHODS, type Client, type Payment } from '@/lib/types';

type Row = Payment & { clients: { name: string } | null };

export default function Ventes() {
  const { biz } = usePro();
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [edit, setEdit] = useState<(Partial<Payment> & { amount?: string }) | null>(null);
  const load = () => sb().from('payments').select('*, clients(name)').order('paid_on', { ascending: false }).order('created_at', { ascending: false }).limit(500).then((r) => setRows((r.data as Row[]) ?? []));
  useEffect(() => { load(); sb().from('clients').select('*').order('name').then((r) => setClients((r.data as Client[]) ?? [])); }, []);

  const byMonth = useMemo(() => {
    const m = new Map<string, Row[]>();
    (rows ?? []).forEach((p) => { const k = p.paid_on.slice(0, 7); m.set(k, [...(m.get(k) ?? []), p]); });
    return [...m.entries()];
  }, [rows]);
  const month = todayLocal().slice(0, 7);
  const thisMonth = (rows ?? []).filter((p) => p.paid_on.startsWith(month)).reduce((s, p) => s + p.amount_cents, 0);
  // une vente liée à un paiement en ligne, un rendez-vous ou une facture se gère depuis son origine
  const linked = (p: Partial<Payment>) => p.method === 'stripe' || !!p.booking_id || !!p.document_id;

  async function save() {
    if (!edit?.label?.trim()) return toast('Indique ce que tu as vendu', true);
    const cents = toCents(edit.amount ?? '');
    if (cents <= 0) return toast('Indique un montant', true);
    const row = { business_id: biz.id, label: edit.label.trim(), amount_cents: cents, method: edit.method ?? 'card', paid_on: edit.paid_on ?? todayLocal(), client_id: edit.client_id || null };
    const r = edit.id ? await sb().from('payments').update(row).eq('id', edit.id) : await sb().from('payments').insert(row);
    if (r.error) return toast(errText(r.error), true);
    toast('Vente enregistrée'); setEdit(null); load();
  }
  async function remove() {
    if (!edit?.id || !confirm('Supprimer cette vente ?')) return;
    const r = await sb().from('payments').delete().eq('id', edit.id);
    if (r.error) return toast(errText(r.error), true);
    setEdit(null); load();
  }

  return (
    <>
      <div className="ap-head">
        <div><h1>Ventes</h1><p>{rows ? `${euros(thisMonth)} encaissés ce mois-ci.` : ''}</p></div>
        <button className="b ink" onClick={() => setEdit({ method: 'card', paid_on: todayLocal(), amount: '', client_id: null })}><Icon name="plus" />Vente</button>
      </div>
      <div className="note" style={{ marginBottom: 14 }}>Les acomptes payés en ligne et les rendez-vous encaissés apparaissent ici tout seuls. Ajoute à la main ce que tu vends en dehors : produits, cartes cadeaux, prestations payées sur place…</div>
      <div className="panel">
        {rows === null ? <p className="muted">Chargement…</p> : rows.length === 0 ? <div className="empty"><b>Aucune vente pour l’instant.</b><span>Note ta première vente avec le bouton « Vente ».</span></div> : byMonth.map(([k, list]) => (
          <div key={k}>
            <div className="day-h">{cap(fmtMonth(+k.slice(0, 4), +k.slice(5, 7)))} · {euros(list.reduce((s, p) => s + p.amount_cents, 0))}</div>
            <div className="list">
              {list.map((p) => (
                <div key={p.id} className="row click" role="button" tabIndex={0} onClick={() => setEdit({ ...p, amount: centsInput(p.amount_cents) })} onKeyDown={(ev) => ev.key === 'Enter' && setEdit({ ...p, amount: centsInput(p.amount_cents) })}>
                  <div className="grow"><div className="t">{p.label || 'Vente'}</div><div className="s">{[p.clients?.name, METHODS[p.method], fmtDate(p.paid_on)].filter(Boolean).join(' · ')}</div></div>
                  <span className="amt" style={{ color: p.amount_cents < 0 ? '#b3361a' : 'var(--accent)' }}>{p.amount_cents < 0 ? '− ' + euros(-p.amount_cents) : '+ ' + euros(p.amount_cents)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {edit && (
        <Modal title={edit.id ? 'Vente' : 'Nouvelle vente'} onClose={() => setEdit(null)}>
          {edit.id && linked(edit) ? (
            <div className="stack">
              <div className="note">Cette vente vient {edit.method === 'stripe' ? 'd’un paiement en ligne' : edit.document_id ? 'd’une facture' : 'd’un rendez-vous'} : elle se gère depuis {edit.document_id ? 'Factures' : 'l’Agenda'}.</div>
              <div className="list"><div className="row"><div className="grow"><div className="t">{edit.label}</div><div className="s">{METHODS[edit.method ?? 'card']} · {fmtDate(edit.paid_on ?? todayLocal())}</div></div><span className="amt">{euros(edit.amount_cents ?? 0)}</span></div></div>
              <div className="foot"><button className="b ink" onClick={() => setEdit(null)}>Fermer</button></div>
            </div>
          ) : (
            <>
              <div className="stack">
                <Field label="Ce que tu as vendu"><input value={edit.label ?? ''} onChange={(e) => setEdit({ ...edit, label: e.target.value })} maxLength={160} placeholder="Ex. huile pour cuticules, carte cadeau…" autoFocus /></Field>
                <div className="grid3">
                  <Field label="Montant"><div className="pre"><input inputMode="decimal" value={edit.amount ?? ''} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} /><span style={{ padding: '0 14px 0 0' }}>€</span></div></Field>
                  <Field label="Payé par"><select value={edit.method} onChange={(e) => setEdit({ ...edit, method: e.target.value as Payment['method'] })}>{(['card', 'cash', 'transfer', 'other'] as const).map((m) => <option key={m} value={m}>{METHODS[m]}</option>)}</select></Field>
                  <Field label="Date"><input type="date" value={edit.paid_on ?? ''} onChange={(e) => setEdit({ ...edit, paid_on: e.target.value })} /></Field>
                </div>
                <Field label="Client (facultatif)"><select value={edit.client_id ?? ''} onChange={(e) => setEdit({ ...edit, client_id: e.target.value || null })}><option value="">—</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
              </div>
              <div className="foot" style={{ justifyContent: 'space-between' }}>
                <div>{edit.id && <button className="b danger" onClick={remove}><Icon name="trash" />Supprimer</button>}</div>
                <div style={{ display: 'flex', gap: 8 }}><button className="b" onClick={() => setEdit(null)}>Annuler</button><button className="b ink" onClick={save}>Enregistrer</button></div>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
