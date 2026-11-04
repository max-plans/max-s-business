'use client';
// Créer un rendez-vous à la main (ou à partir de la phrase de l'assistant) : client nouveau ou existant,
// prestation, jour, heure, prix, acompte à demander en ligne.
import { useMemo, useState } from 'react';
import { centsInput, euros, fromLocal, hm, parseHm, todayLocal, toCents } from '@/lib/fmt';
import { errText, sb } from '@/lib/sb';
import type { Booking, Client, Service } from '@/lib/types';
import { usePro } from './AppShell';
import { Field, Modal, useToast } from './ui';

export type Draft = { clientName?: string; clientId?: string | null; serviceId?: string | null; day?: string | null; min?: number | null; price_cents?: number | null; duration_min?: number | null; title?: string; source?: 'manual' | 'ai' };

export default function BookingForm({ draft, services, clients, onClose, onSaved }: { draft: Draft; services: Service[]; clients: Client[]; onClose: () => void; onSaved: (b: Booking) => void }) {
  const { biz } = usePro();
  const toast = useToast();
  const svc0 = services.find((s) => s.id === draft.serviceId) ?? null;
  const [clientId, setClientId] = useState<string>(draft.clientId ?? '');
  const [newName, setNewName] = useState(draft.clientId ? '' : draft.clientName ?? '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [serviceId, setServiceId] = useState<string>(svc0?.id ?? '');
  const [title, setTitle] = useState(draft.title || svc0?.name || '');
  const [day, setDay] = useState(draft.day ?? todayLocal());
  const [time, setTime] = useState(draft.min != null ? hm(draft.min) : '10:00');
  const [duration, setDuration] = useState(draft.duration_min ?? svc0?.duration_min ?? 60);
  const [price, setPrice] = useState(centsInput(draft.price_cents ?? svc0?.price_cents ?? null));
  const defDeposit = (p: number, s: Service | null) => s?.deposit_cents ?? Math.round((p * biz.deposit_percent) / 100);
  const [askDeposit, setAskDeposit] = useState(biz.stripe_ready && biz.deposit_percent > 0);
  const [deposit, setDeposit] = useState(centsInput(defDeposit(draft.price_cents ?? svc0?.price_cents ?? 0, svc0)));
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const sorted = useMemo(() => [...clients].sort((a, b) => a.name.localeCompare(b.name, 'fr')), [clients]);

  const pickService = (id: string) => {
    setServiceId(id);
    const s = services.find((x) => x.id === id);
    if (s) { setTitle(s.name); setDuration(s.duration_min); setPrice(centsInput(s.price_cents)); setDeposit(centsInput(defDeposit(s.price_cents, s))); }
  };

  async function save() {
    setErr('');
    const min = parseHm(time);
    if (!clientId && newName.trim().length < 1) return setErr('Indique le nom du client.');
    if (!title.trim()) return setErr('Indique la prestation.');
    if (!day || isNaN(min)) return setErr('Indique le jour et l’heure.');
    setBusy(true);
    let cid = clientId;
    if (!cid) {
      const r = await sb().from('clients').insert({ business_id: biz.id, name: newName.trim(), phone: phone.trim(), email: email.trim().toLowerCase() }).select('id').single();
      if (r.error) { setBusy(false); return setErr(errText(r.error)); }
      cid = r.data.id;
    }
    const start = fromLocal(day, min), end = new Date(+start + duration * 60000);
    const dep = askDeposit ? toCents(deposit) : 0;
    const r = await sb().from('bookings').insert({
      business_id: biz.id, client_id: cid, service_id: serviceId || null, title: title.trim(), starts_at: start.toISOString(), ends_at: end.toISOString(),
      price_cents: toCents(price), deposit_cents: dep, status: 'confirmed', deposit_status: dep > 0 ? 'pending' : 'none', source: draft.source ?? 'manual', notes: notes.trim(),
    }).select().single();
    setBusy(false);
    if (r.error) return setErr(errText(r.error));
    toast('Rendez-vous ajouté');
    onSaved(r.data as Booking);
  }

  return (
    <Modal title="Nouveau rendez-vous" onClose={onClose}>
      <div className="stack">
        <Field label="Client">
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">+ Nouveau client</option>
            {sorted.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        {!clientId && (
          <div className="grid3" style={{ gridTemplateColumns: '1.2fr 1fr 1.2fr' }}>
            <Field label="Nom"><input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={120} /></Field>
            <Field label="Téléphone"><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} /></Field>
            <Field label="E-mail"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} /></Field>
          </div>
        )}
        <div className="grid2">
          <Field label="Prestation">
            <select value={serviceId} onChange={(e) => pickService(e.target.value)}>
              <option value="">Autre (libre)</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Intitulé"><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></Field>
        </div>
        <div className="grid3">
          <Field label="Jour"><input type="date" value={day} onChange={(e) => setDay(e.target.value)} /></Field>
          <Field label="Heure"><input type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
          <Field label="Durée (min)"><input type="number" min={5} max={720} step={5} value={duration} onChange={(e) => setDuration(Math.max(5, +e.target.value || 60))} /></Field>
        </div>
        <div className="grid2">
          <Field label="Prix"><div className="pre"><input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /><span style={{ padding: '0 14px 0 0' }}>€</span></div></Field>
          <Field label="Acompte à demander en ligne" hint={biz.stripe_ready ? 'Ton client reçoit un lien pour le payer.' : 'Active les paiements dans Réglages pour demander un acompte.'}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="checkbox" checked={askDeposit} disabled={!biz.stripe_ready} onChange={(e) => setAskDeposit(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--accent)' }} />
              <div className="pre" style={{ flex: 1, opacity: askDeposit ? 1 : 0.5 }}><input inputMode="decimal" value={deposit} disabled={!askDeposit} onChange={(e) => setDeposit(e.target.value)} /><span style={{ padding: '0 14px 0 0' }}>€</span></div>
            </div>
          </Field>
        </div>
        <Field label="Note (visible par toi seul)"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={2} /></Field>
        {err && <div className="note err">{err}</div>}
      </div>
      <div className="foot">
        <button className="b" onClick={onClose}>Annuler</button>
        <button className="b ink" disabled={busy} onClick={save}>{busy ? 'Ajout…' : `Ajouter${toCents(price) ? ' · ' + euros(toCents(price)) : ''}`}</button>
      </div>
    </Modal>
  );
}
