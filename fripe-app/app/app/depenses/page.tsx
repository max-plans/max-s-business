'use client';
// Dépenses professionnelles : elles ne baissent pas les cotisations en micro-entreprise, mais comptent
// dans le bénéfice réel affiché sur le tableau de bord.
import { useEffect, useMemo, useState } from 'react';
import { usePro } from '@/components/AppShell';
import { Field, Icon, Modal, useToast } from '@/components/ui';
import { cap, centsInput, euros, fmtDate, fmtMonth, todayLocal, toCents } from '@/lib/fmt';
import { errText, sb } from '@/lib/sb';
import { EXPENSE_CATS, type Expense } from '@/lib/types';

export default function Depenses() {
  const { biz } = usePro();
  const toast = useToast();
  const [rows, setRows] = useState<Expense[] | null>(null);
  const [edit, setEdit] = useState<(Partial<Expense> & { amount?: string }) | null>(null);
  const load = () => sb().from('expenses').select('*').order('spent_on', { ascending: false }).limit(500).then((r) => setRows((r.data as Expense[]) ?? []));
  useEffect(() => { load(); }, []);

  const byMonth = useMemo(() => {
    const m = new Map<string, Expense[]>();
    (rows ?? []).forEach((e) => { const k = e.spent_on.slice(0, 7); m.set(k, [...(m.get(k) ?? []), e]); });
    return [...m.entries()];
  }, [rows]);

  async function save() {
    if (!edit?.label?.trim()) return toast('Indique un libellé', true);
    const cents = toCents(edit.amount ?? '');
    if (cents <= 0) return toast('Indique un montant', true);
    const row = { business_id: biz.id, label: edit.label.trim(), category: edit.category ?? 'materiel', amount_cents: cents, spent_on: edit.spent_on ?? todayLocal() };
    const r = edit.id ? await sb().from('expenses').update(row).eq('id', edit.id) : await sb().from('expenses').insert(row);
    if (r.error) return toast(errText(r.error), true);
    setEdit(null); load();
  }
  async function remove() {
    if (!edit?.id) return;
    await sb().from('expenses').delete().eq('id', edit.id);
    setEdit(null); load();
  }

  return (
    <>
      <div className="ap-head">
        <div><h1>Dépenses</h1><p>Produits, matériel, déplacements : pour connaître ton vrai bénéfice.</p></div>
        <button className="b ink" onClick={() => setEdit({ category: 'materiel', spent_on: todayLocal(), amount: '' })}><Icon name="plus" />Dépense</button>
      </div>
      <div className="panel">
        {rows === null ? <p className="muted">Chargement…</p> : rows.length === 0 ? <div className="empty"><b>Aucune dépense.</b><span>Note tes achats pro pour voir ton bénéfice réel.</span></div> : byMonth.map(([k, list]) => (
          <div key={k}>
            <div className="day-h">{cap(fmtMonth(+k.slice(0, 4), +k.slice(5, 7)))} · {euros(list.reduce((s, e) => s + e.amount_cents, 0))}</div>
            <div className="list">
              {list.map((e) => (
                <div key={e.id} className="row click" role="button" tabIndex={0} onClick={() => setEdit({ ...e, amount: centsInput(e.amount_cents) })} onKeyDown={(ev) => ev.key === 'Enter' && setEdit({ ...e, amount: centsInput(e.amount_cents) })}>
                  <div className="grow"><div className="t">{e.label}</div><div className="s">{EXPENSE_CATS[e.category] ?? e.category} · {fmtDate(e.spent_on)}</div></div>
                  <span className="amt">− {euros(e.amount_cents)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {edit && (
        <Modal title={edit.id ? 'Dépense' : 'Nouvelle dépense'} onClose={() => setEdit(null)}>
          <div className="stack">
            <Field label="Libellé"><input value={edit.label ?? ''} onChange={(e) => setEdit({ ...edit, label: e.target.value })} maxLength={160} placeholder="Gels et vernis" autoFocus /></Field>
            <div className="grid3">
              <Field label="Montant"><div className="pre"><input inputMode="decimal" value={edit.amount ?? ''} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} /><span style={{ padding: '0 14px 0 0' }}>€</span></div></Field>
              <Field label="Catégorie"><select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{Object.entries(EXPENSE_CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
              <Field label="Date"><input type="date" value={edit.spent_on ?? ''} onChange={(e) => setEdit({ ...edit, spent_on: e.target.value })} /></Field>
            </div>
          </div>
          <div className="foot" style={{ justifyContent: 'space-between' }}>
            <div>{edit.id && <button className="b danger" onClick={remove}><Icon name="trash" />Supprimer</button>}</div>
            <div style={{ display: 'flex', gap: 8 }}><button className="b" onClick={() => setEdit(null)}>Annuler</button><button className="b ink" onClick={save}>Enregistrer</button></div>
          </div>
        </Modal>
      )}
    </>
  );
}
