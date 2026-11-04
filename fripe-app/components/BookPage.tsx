'use client';
// Page publique de réservation (lien en bio) : prestation → jour → heure → coordonnées → acompte en ligne.
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/supabase';
import { addDays, cap, euros, fromLocal, hm, parts, todayLocal, weekdayOf } from '@/lib/fmt';
import { fn } from '@/lib/sb';
import { initials } from './ui';

type Svc = { id: string; name: string; description: string; duration_min: number; price_cents: number; deposit_cents: number | null };
type Page = { name: string; slug: string; metier: string; bio: string; deposit_percent: number; min_notice_hours: number; window_days: number; buffer_min: number; cancel_hours: number; payments: boolean; services: Svc[]; hours: { weekday: number; start_min: number; end_min: number }[] };

const rpc = (name: string, body: unknown) => fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: SUPABASE_KEY, 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());
const dur = (d: number) => (d >= 60 ? `${Math.floor(d / 60)} h${d % 60 ? ' ' + String(d % 60).padStart(2, '0') : ''}` : `${d} min`);
const ERR: Record<string, string> = {
  taken: 'Ce créneau vient d’être pris. Choisis-en un autre.', slot: 'Ce créneau n’est plus disponible.', contact: 'Vérifie ton nom et ton e-mail.',
  full: 'Les réservations en ligne sont complètes pour ce mois. Contacte directement le professionnel.', busy: 'Beaucoup de demandes en ce moment, réessaie dans quelques minutes.',
};

export default function BookPage({ slug }: { slug: string }) {
  const router = useRouter();
  const [p, setP] = useState<Page | null | 'missing'>(null);
  const [busy, setBusy] = useState<{ s: number; e: number }[]>([]);
  const [svc, setSvc] = useState<Svc | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '', site: '' });
  const [state, setState] = useState<'idle' | 'sending'>('idle');
  const [err, setErr] = useState('');
  const [cancelled, setCancelled] = useState(false);

  const loadBusy = (pg: Page) => {
    const from = new Date(), to = new Date(Date.now() + (pg.window_days + 1) * 86400000);
    rpc('public_busy', { p_slug: slug, p_from: from.toISOString(), p_to: to.toISOString() }).then((r) => Array.isArray(r) && setBusy(r.map((b: { starts_at: string; ends_at: string }) => ({ s: +new Date(b.starts_at), e: +new Date(b.ends_at) }))));
  };
  useEffect(() => {
    setCancelled(new URLSearchParams(location.search).has('annule'));
    rpc('public_page', { p_slug: slug }).then((r) => {
      if (!r || !r.name) { setP('missing'); return; }
      setP(r); loadBusy(r);
      if (r.services.length === 1) setSvc(r.services[0]);
    }).catch(() => setP('missing'));
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const pg = p && p !== 'missing' ? p : null;
  const slotsFor = useMemo(() => (d: string) => {
    if (!pg || !svc) return [];
    const wd = weekdayOf(d), out: number[] = [], earliest = Date.now() + pg.min_notice_hours * 3600000;
    const step = svc.duration_min % 30 === 0 && svc.duration_min >= 30 ? 30 : 15;
    for (const h of pg.hours.filter((x) => x.weekday === wd)) {
      for (let m = Math.ceil(h.start_min / 15) * 15; m + svc.duration_min <= h.end_min; m += step) {
        const s = +fromLocal(d, m), e = s + svc.duration_min * 60000, buf = pg.buffer_min * 60000;
        if (s < earliest) continue;
        if (busy.some((b) => s < b.e + buf && e > b.s - buf)) continue;
        out.push(m);
      }
    }
    return [...new Set(out)].sort((a, b) => a - b);
  }, [pg, svc, busy]);
  const days = useMemo(() => {
    if (!pg) return [];
    const t = todayLocal();
    return Array.from({ length: Math.min(pg.window_days, 60) + 1 }, (_, i) => addDays(t, i)).map((d) => ({ d, n: slotsFor(d).length }));
  }, [pg, slotsFor]);
  useEffect(() => { if (svc && !day) { const first = days.find((x) => x.n > 0); if (first) setDay(first.d); } }, [svc, days, day]);

  if (p === null) return <div className="auth"><span className="muted">Chargement…</span></div>;
  if (p === 'missing') return <div className="auth"><div className="auth-card"><h1>Page introuvable.</h1><p className="muted">Vérifie l’adresse du lien.</p></div></div>;

  const deposit = svc ? (svc.deposit_cents ?? Math.round((svc.price_cents * p.deposit_percent) / 100)) : 0;
  const payNow = p.payments && deposit >= 50;
  const slots = day ? slotsFor(day) : [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!svc || !day || slot == null) return;
    setErr(''); setState('sending');
    const r = await fn<{ url?: string; token?: string }>('book', { action: 'create', slug, service_id: svc.id, starts_at: fromLocal(day, slot).toISOString(), ...form }, false);
    if (r.error || !r.token) {
      setState('idle'); setErr(ERR[r.error ?? ''] ?? 'La réservation n’a pas abouti. Réessaie.');
      if (r.error === 'taken' || r.error === 'slot') { setSlot(null); loadBusy(p as Page); }
      return;
    }
    if (r.url) location.href = r.url; else router.push(`/r/${slug}/rdv?t=${r.token}`);
  }

  return (
    <div className="pub">
      <div className="pub-in">
        <div className="pub-top">
          <span className="av">{initials(p.name)}</span>
          <h1>{p.name}</h1>
          {p.metier && p.metier !== 'Autre' && <span className="eyebrow">{p.metier}</span>}
          {p.bio && <p className="muted" style={{ maxWidth: 480, whiteSpace: 'pre-wrap' }}>{p.bio}</p>}
        </div>
        {cancelled && <div className="note warn">Paiement interrompu : ton créneau n’est pas réservé. Tu peux recommencer.</div>}

        <div className="panel">
          <h2>1. Choisis ta prestation</h2>
          <div className="stack" style={{ marginTop: 12, gap: 8 }}>
            {p.services.length === 0 && <p className="muted">Aucune prestation en ligne pour le moment.</p>}
            {p.services.map((s) => (
              <button key={s.id} className={'svc' + (svc?.id === s.id ? ' on' : '')} onClick={() => { setSvc(s); setDay(null); setSlot(null); }}>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600 }}>{s.name}</div><div className="muted" style={{ fontSize: 13.5 }}>{dur(s.duration_min)}{s.description ? ' · ' + s.description : ''}</div></div>
                <b style={{ whiteSpace: 'nowrap' }}>{euros(s.price_cents)}</b>
              </button>
            ))}
          </div>
        </div>

        {svc && (
          <div className="panel">
            <h2>2. Choisis ton créneau</h2>
            <div className="days" style={{ marginTop: 12 }}>
              {days.map(({ d, n }) => {
                const pt = parts(fromLocal(d, 720));
                return (
                  <button key={d} className={day === d ? 'on' : ''} disabled={n === 0} onClick={() => { setDay(d); setSlot(null); }}>
                    <span>{cap(new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(new Date(d + 'T12:00:00Z')).replace('.', ''))}</span>
                    <b>{pt.d}</b>
                    <span>{new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(new Date(d + 'T12:00:00Z')).replace('.', '')}</span>
                  </button>
                );
              })}
            </div>
            {day && (slots.length ? (
              <div className="times" style={{ marginTop: 10 }}>{slots.map((m) => <button key={m} className={slot === m ? 'on' : ''} onClick={() => setSlot(m)}>{hm(m)}</button>)}</div>
            ) : <p className="muted" style={{ marginTop: 10 }}>Plus de créneau ce jour-là.</p>)}
            {!days.some((x) => x.n > 0) && <p className="muted" style={{ marginTop: 10 }}>Aucun créneau disponible pour le moment.</p>}
          </div>
        )}

        {svc && day && slot != null && (
          <form className="panel" onSubmit={submit}>
            <h2>3. Tes coordonnées</h2>
            <p>{svc.name} · {cap(new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(day + 'T12:00:00Z')))} à {hm(slot)}</p>
            <div className="stack" style={{ marginTop: 14 }}>
              <label className="f"><span>Prénom et nom</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} autoComplete="name" /></label>
              <div className="grid2">
                <label className="f"><span>E-mail</span><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={200} autoComplete="email" /></label>
                <label className="f"><span>Téléphone</span><input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={30} autoComplete="tel" /></label>
              </div>
              <label className="f"><span>Un mot pour le professionnel (facultatif)</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} rows={2} /></label>
              <input className="wl-hp" tabIndex={-1} autoComplete="off" value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} aria-hidden="true" />
              {err && <div className="note err">{err}</div>}
              <button className="b ink lg full" disabled={state === 'sending'}>{state === 'sending' ? 'Réservation…' : payNow ? `Réserver et payer l’acompte · ${euros(deposit)}` : 'Confirmer la réservation'}</button>
              <p className="muted" style={{ fontSize: 13, textAlign: 'center' }}>
                {payNow ? `Acompte de ${euros(deposit)} déduit du prix, payé par carte de façon sécurisée. ` : `Paiement de ${euros(svc.price_cents)} sur place. `}
                {p.cancel_hours ? `Annulation gratuite jusqu’à ${p.cancel_hours} h avant.` : 'Annulation gratuite jusqu’au rendez-vous.'}
              </p>
            </div>
          </form>
        )}
        <p className="pub-foot">Réservation propulsée par <a href="/">Fripe</a> · <a href="/confidentialite">Confidentialité</a></p>
      </div>
    </div>
  );
}
