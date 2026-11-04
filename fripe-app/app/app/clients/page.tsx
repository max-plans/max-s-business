'use client';
// Fichier clients : coordonnées, notes, historique des rendez-vous et chiffre d'affaires par client.
import { useEffect, useMemo, useState } from 'react';
import { usePro } from '@/components/AppShell';
import { Field, Icon, Modal, initials, useToast } from '@/components/ui';
import { euros, fmtDate, fmtTime } from '@/lib/fmt';
import { errText, sb } from '@/lib/sb';
import type { Booking, Client, Payment } from '@/lib/types';

export default function Clients() {
  const { biz } = usePro();
  const toast = useToast();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [pay, setPay] = useState<Payment[]>([]);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Partial<Client> | null>(null);
  const [hist, setHist] = useState<Booking[]>([]);

  const load = () => Promise.all([sb().from('clients').select('*').order('name'), sb().from('payments').select('client_id, amount_cents')])
    .then(([c, p]) => { setClients((c.data as Client[]) ?? []); setPay((p.data as Payment[]) ?? []); });
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (edit?.id) sb().from('bookings').select('*').eq('client_id', edit.id).order('starts_at', { ascending: false }).limit(30).then((r) => setHist((r.data as Booking[]) ?? []));
    else setHist([]);
  }, [edit?.id]);

  const spent = useMemo(() => { const m = new Map<string, number>(); pay.forEach((p) => p.client_id && m.set(p.client_id, (m.get(p.client_id) ?? 0) + p.amount_cents)); return m; }, [pay]);
  const n = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const list = (clients ?? []).filter((c) => !q || n(`${c.name} ${c.email} ${c.phone}`).includes(n(q)));

  async function save() {
    if (!edit?.name?.trim()) return toast('Indique un nom', true);
    const row = { business_id: biz.id, name: edit.name.trim(), email: (edit.email ?? '').trim().toLowerCase(), phone: (edit.phone ?? '').trim(), address: (edit.address ?? '').trim(), notes: (edit.notes ?? '').trim() };
    const r = edit.id ? await sb().from('clients').update(row).eq('id', edit.id) : await sb().from('clients').insert(row);
    if (r.error) return toast(errText(r.error), true);
    toast('Client enregistré'); setEdit(null); load();
  }
  async function remove() {
    if (!edit?.id || !confirm('Supprimer ce client ? Ses rendez-vous et factures sont conservés.')) return;
    const r = await sb().from('clients').delete().eq('id', edit.id);
    if (r.error) return toast(errText(r.error), true);
    setEdit(null); load();
  }

  return (
    <>
      <div className="ap-head">
        <div><h1>Clients</h1><p>{clients ? `${clients.length} client${clients.length > 1 ? 's' : ''}` : ''}</p></div>
        <div className="ap-actions">
          <input className="in" style={{ width: 220 }} placeholder="Rechercher" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un client" />
          <button className="b ink" onClick={() => setEdit({})}><Icon name="plus" />Client</button>
        </div>
      </div>
      <div className="panel">
        {clients === null ? <p className="muted">Chargement…</p> : list.length === 0 ? <div className="empty"><b>{q ? 'Aucun résultat.' : 'Pas encore de client.'}</b><span>Ils s’ajoutent tout seuls quand ils réservent sur ta page.</span></div> : (
          <div className="list">
            {list.map((c) => (
              <div key={c.id} className="row click" role="button" tabIndex={0} onClick={() => setEdit(c)} onKeyDown={(e) => e.key === 'Enter' && setEdit(c)}>
                <span className="av">{initials(c.name)}</span>
                <div className="grow"><div className="t">{c.name}</div><div className="s">{[c.phone, c.email].filter(Boolean).join(' · ') || 'Aucun contact'}</div></div>
                <span className="amt">{euros(spent.get(c.id) ?? 0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {edit && (
        <Modal title={edit.id ? edit.name ?? 'Client' : 'Nouveau client'} onClose={() => setEdit(null)}>
          <div className="stack">
            <Field label="Nom"><input value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} maxLength={120} autoFocus={!edit.id} /></Field>
            <div className="grid2">
              <Field label="Téléphone"><input type="tel" value={edit.phone ?? ''} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} maxLength={30} /></Field>
              <Field label="E-mail"><input type="email" value={edit.email ?? ''} onChange={(e) => setEdit({ ...edit, email: e.target.value })} maxLength={200} /></Field>
            </div>
            <Field label="Adresse" hint="Utile pour les factures aux professionnels."><input value={edit.address ?? ''} onChange={(e) => setEdit({ ...edit, address: e.target.value })} maxLength={200} /></Field>
            <Field label="Notes"><textarea value={edit.notes ?? ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} maxLength={1000} rows={2} placeholder="Allergies, préférences…" /></Field>
            {hist.length > 0 && (
              <div><div className="day-h">Historique · {euros(spent.get(edit.id!) ?? 0)} encaissés</div>
                <div className="list">{hist.map((b) => <div key={b.id} className="row"><div className="grow"><div className="t" style={{ fontWeight: 500 }}>{b.title}</div><div className="s">{fmtDate(b.starts_at)} à {fmtTime(b.starts_at)}</div></div><span className="tag">{{ pending: 'En attente', confirmed: 'À venir', done: 'Terminé', cancelled: 'Annulé', no_show: 'Absent' }[b.status]}</span></div>)}</div>
              </div>
            )}
          </div>
          <div className="foot" style={{ justifyContent: 'space-between' }}>
            <div>{edit.id && <button className="b danger" onClick={remove}><Icon name="trash" />Supprimer</button>}</div>
            <div style={{ display: 'flex', gap: 8 }}><button className="b" onClick={() => setEdit(null)}>Fermer</button><button className="b ink" onClick={save}>Enregistrer</button></div>
          </div>
        </Modal>
      )}
    </>
  );
}
