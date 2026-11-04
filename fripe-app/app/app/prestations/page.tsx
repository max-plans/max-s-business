'use client';
// Prestations (nom, durée, prix, acompte), horaires d'ouverture et règles de réservation de la page publique.
import { useEffect, useState } from 'react';
import { usePro } from '@/components/AppShell';
import { Field, Icon, Modal, useToast } from '@/components/ui';
import { centsInput, euros, hm, parseHm, toCents } from '@/lib/fmt';
import { errText, sb } from '@/lib/sb';
import type { Business, Hour, Service } from '@/lib/types';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const WD = [1, 2, 3, 4, 5, 6, 0];
const dur = (d: number) => (d >= 60 ? `${Math.floor(d / 60)} h${d % 60 ? ' ' + String(d % 60).padStart(2, '0') : ''}` : `${d} min`);

export default function Prestations() {
  const { biz, setBiz } = usePro();
  const toast = useToast();
  const [services, setServices] = useState<Service[] | null>(null);
  const [hours, setHours] = useState<{ weekday: number; start: string; end: string }[]>([]);
  const [edit, setEdit] = useState<(Partial<Service> & { price?: string; deposit?: string; customDeposit?: boolean }) | null>(null);
  const [rules, setRules] = useState({ deposit_percent: biz.deposit_percent, min_notice_hours: biz.min_notice_hours, window_days: biz.window_days, buffer_min: biz.buffer_min, cancel_hours: biz.cancel_hours });
  const [savingH, setSavingH] = useState(false);

  const load = () => {
    sb().from('services').select('*').order('position').order('created_at').then((r) => setServices((r.data as Service[]) ?? []));
    sb().from('hours').select('*').order('weekday').order('start_min').then((r) => setHours(((r.data as Hour[]) ?? []).map((h) => ({ weekday: h.weekday, start: hm(h.start_min), end: hm(h.end_min) }))));
  };
  useEffect(() => { load(); }, []);

  async function saveService() {
    if (!edit?.name?.trim()) return toast('Indique un nom', true);
    const row = {
      business_id: biz.id, name: edit.name.trim(), description: (edit.description ?? '').trim(), duration_min: edit.duration_min ?? 60,
      price_cents: toCents(edit.price ?? '0'), deposit_cents: edit.customDeposit ? toCents(edit.deposit ?? '0') : null, active: edit.active ?? true,
      position: edit.position ?? (services?.length ?? 0),
    };
    const r = edit.id ? await sb().from('services').update(row).eq('id', edit.id) : await sb().from('services').insert(row);
    if (r.error) return toast(errText(r.error), true);
    setEdit(null); load();
  }
  async function removeService() {
    if (!edit?.id || !confirm('Supprimer cette prestation ? Les rendez-vous passés sont conservés.')) return;
    await sb().from('services').delete().eq('id', edit.id);
    setEdit(null); load();
  }
  async function move(s: Service, d: number) {
    const list = [...(services ?? [])]; const i = list.indexOf(s), j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setServices(list);
    await Promise.all(list.map((x, k) => sb().from('services').update({ position: k }).eq('id', x.id)));
  }

  async function saveHours() {
    const rows = hours.map((h) => ({ business_id: biz.id, weekday: h.weekday, start_min: parseHm(h.start), end_min: parseHm(h.end) }));
    if (rows.some((r) => isNaN(r.start_min) || isNaN(r.end_min) || r.end_min <= r.start_min)) return toast('Vérifie les horaires : la fin doit suivre le début.', true);
    setSavingH(true);
    await sb().from('hours').delete().eq('business_id', biz.id);
    const r = rows.length ? await sb().from('hours').insert(rows) : { error: null };
    setSavingH(false);
    if (r.error) return toast(errText(r.error), true);
    toast('Horaires enregistrés');
  }
  async function saveRules() {
    const r = await sb().from('businesses').update(rules).eq('id', biz.id).select().single();
    if (r.error) return toast(errText(r.error), true);
    setBiz(r.data as Business); toast('Règles enregistrées');
  }

  const dep = (s: Service) => s.deposit_cents ?? Math.round((s.price_cents * biz.deposit_percent) / 100);

  return (
    <>
      <div className="ap-head">
        <div><h1>Prestations</h1><p>Ce que tes clients peuvent réserver sur ta page, et quand.</p></div>
        <button className="b ink" onClick={() => setEdit({ duration_min: 60, price: '', active: true })}><Icon name="plus" />Prestation</button>
      </div>

      <div className="panel">
        {services === null ? <p className="muted">Chargement…</p> : services.length === 0 ? <div className="empty"><b>Aucune prestation.</b><span>Ajoute ce que tu proposes pour ouvrir ta page.</span></div> : (
          <div className="list">
            {services.map((s, i) => (
              <div key={s.id} className="row">
                <div style={{ display: 'grid' }}>
                  <button className="b ghost sm" style={{ height: 22, padding: '0 6px' }} onClick={() => move(s, -1)} disabled={i === 0} aria-label="Monter">▲</button>
                  <button className="b ghost sm" style={{ height: 22, padding: '0 6px' }} onClick={() => move(s, 1)} disabled={i === services.length - 1} aria-label="Descendre">▼</button>
                </div>
                <div className="grow click" style={{ cursor: 'pointer' }} onClick={() => setEdit({ ...s, price: centsInput(s.price_cents), deposit: centsInput(dep(s)), customDeposit: s.deposit_cents != null })}>
                  <div className="t">{s.name}</div><div className="s">{dur(s.duration_min)}{biz.stripe_ready && dep(s) ? ` · acompte ${euros(dep(s))}` : ''}</div>
                </div>
                {!s.active && <span className="tag">Masquée</span>}
                <span className="amt">{euros(s.price_cents)}</span>
                <button className="b sm" onClick={() => setEdit({ ...s, price: centsInput(s.price_cents), deposit: centsInput(dep(s)), customDeposit: s.deposit_cents != null })}>Modifier</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid2" style={{ marginTop: 14 }}>
        <div className="panel">
          <div className="panel-head"><div><h2>Horaires d’ouverture</h2><p>Créneaux proposés sur ta page.</p></div><button className="b sm ink" disabled={savingH} onClick={saveHours}>Enregistrer</button></div>
          <div className="list">
            {WD.map((wd, k) => {
              const ranges = hours.map((h, i) => ({ ...h, i })).filter((h) => h.weekday === wd);
              return (
                <div key={wd} className="row hours-row" style={{ alignItems: 'flex-start' }}>
                  <div style={{ width: 92, paddingTop: 9, fontWeight: 600, fontSize: 14 }}>{DAYS[k]}</div>
                  <div className="grow" style={{ display: 'grid', gap: 6 }}>
                    {ranges.length === 0 && <span className="muted" style={{ paddingTop: 9, fontSize: 14 }}>Fermé</span>}
                    {ranges.map((r) => (
                      <div key={r.i} className="pair">
                        <input className="in" type="time" step={900} value={r.start} onChange={(e) => setHours(hours.map((h, i) => (i === r.i ? { ...h, start: e.target.value } : h)))} aria-label={`${DAYS[k]} début`} />
                        <span className="muted">–</span>
                        <input className="in" type="time" step={900} value={r.end} onChange={(e) => setHours(hours.map((h, i) => (i === r.i ? { ...h, end: e.target.value } : h)))} aria-label={`${DAYS[k]} fin`} />
                        <button className="b ghost sm" onClick={() => setHours(hours.filter((_, i) => i !== r.i))} aria-label="Retirer"><Icon name="x" /></button>
                      </div>
                    ))}
                  </div>
                  <button className="b ghost sm" onClick={() => setHours([...hours, { weekday: wd, start: ranges.length ? '14:00' : '09:00', end: ranges.length ? '19:00' : '18:00' }])} aria-label={`Ajouter une plage le ${DAYS[k]}`}><Icon name="plus" /></button>
                </div>
              );
            })}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><div><h2>Règles de réservation</h2><p>Appliquées à ta page publique.</p></div><button className="b sm ink" onClick={saveRules}>Enregistrer</button></div>
          <div className="stack">
            <Field label="Acompte par défaut" hint={biz.stripe_ready ? 'Payé en ligne à la réservation. 0 pour aucun.' : 'S’applique quand les paiements en ligne sont activés (Réglages).'}>
              <div className="pre"><input type="number" min={0} max={100} value={rules.deposit_percent} onChange={(e) => setRules({ ...rules, deposit_percent: Math.min(100, Math.max(0, +e.target.value)) })} /><span style={{ padding: '0 14px 0 0' }}>% du prix</span></div>
            </Field>
            <div className="grid2">
              <Field label="Délai minimum"><select value={rules.min_notice_hours} onChange={(e) => setRules({ ...rules, min_notice_hours: +e.target.value })}>{[0, 1, 2, 4, 12, 24, 48, 72].map((h) => <option key={h} value={h}>{h ? `${h} h avant` : 'Aucun'}</option>)}</select></Field>
              <Field label="Réservable jusqu’à"><select value={rules.window_days} onChange={(e) => setRules({ ...rules, window_days: +e.target.value })}>{[7, 14, 30, 60, 90, 180].map((d) => <option key={d} value={d}>{d} jours</option>)}</select></Field>
              <Field label="Pause entre deux clients"><select value={rules.buffer_min} onChange={(e) => setRules({ ...rules, buffer_min: +e.target.value })}>{[0, 5, 10, 15, 30, 45, 60].map((m) => <option key={m} value={m}>{m ? `${m} min` : 'Aucune'}</option>)}</select></Field>
              <Field label="Annulation gratuite"><select value={rules.cancel_hours} onChange={(e) => setRules({ ...rules, cancel_hours: +e.target.value })}>{[0, 12, 24, 48, 72].map((h) => <option key={h} value={h}>{h ? `jusqu’à ${h} h avant` : 'jusqu’au dernier moment'}</option>)}</select></Field>
            </div>
            <p className="muted" style={{ fontSize: 13 }}>Après ce délai, le client ne peut plus annuler en ligne et l’acompte te reste acquis.</p>
          </div>
        </div>
      </div>

      {edit && (
        <Modal title={edit.id ? 'Prestation' : 'Nouvelle prestation'} onClose={() => setEdit(null)}>
          <div className="stack">
            <Field label="Nom"><input value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} maxLength={80} autoFocus={!edit.id} /></Field>
            <Field label="Description (facultatif)"><textarea value={edit.description ?? ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} maxLength={300} rows={2} /></Field>
            <div className="grid2">
              <Field label="Durée"><select value={edit.duration_min} onChange={(e) => setEdit({ ...edit, duration_min: +e.target.value })}>{[15, 20, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 300, 360, 480].map((d) => <option key={d} value={d}>{dur(d)}</option>)}</select></Field>
              <Field label="Prix"><div className="pre"><input inputMode="decimal" value={edit.price ?? ''} onChange={(e) => setEdit({ ...edit, price: e.target.value })} /><span style={{ padding: '0 14px 0 0' }}>€</span></div></Field>
            </div>
            <label className="check"><input type="checkbox" checked={!!edit.customDeposit} onChange={(e) => setEdit({ ...edit, customDeposit: e.target.checked, deposit: edit.deposit || centsInput(Math.round((toCents(edit.price ?? '0') * biz.deposit_percent) / 100)) })} />Acompte différent du réglage par défaut ({biz.deposit_percent} %)</label>
            {edit.customDeposit && <Field label="Acompte"><div className="pre"><input inputMode="decimal" value={edit.deposit ?? ''} onChange={(e) => setEdit({ ...edit, deposit: e.target.value })} /><span style={{ padding: '0 14px 0 0' }}>€</span></div></Field>}
            <label className="check"><input type="checkbox" checked={edit.active ?? true} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />Visible sur ma page de réservation</label>
          </div>
          <div className="foot" style={{ justifyContent: 'space-between' }}>
            <div>{edit.id && <button className="b danger" onClick={removeService}><Icon name="trash" />Supprimer</button>}</div>
            <div style={{ display: 'flex', gap: 8 }}><button className="b" onClick={() => setEdit(null)}>Annuler</button><button className="b ink" onClick={saveService}>Enregistrer</button></div>
          </div>
        </Modal>
      )}
    </>
  );
}
