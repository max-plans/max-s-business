'use client';
// Premier passage : en une minute, l'activité, la première prestation et l'adresse de la page de réservation.
import { useState } from 'react';
import { METIERS } from '@/lib/metiers';
import { ACTIVITIES, slugify, toCents, type Activity } from '@/lib/fmt';
import { errText, sb } from '@/lib/sb';
import type { Business } from '@/lib/types';
import { usePro } from './AppShell';
import { Field } from './ui';

const minutes = (s: string) => { const m = /(\d+)\s*h\s*(\d+)?/.exec(s); return m ? +m[1] * 60 + +(m[2] || 0) : 60; };

export default function Onboarding() {
  const { biz, setBiz } = usePro();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(biz.name);
  const [metier, setMetier] = useState(biz.metier || METIERS[0].label);
  const [slug, setSlug] = useState(biz.slug || '');
  const [activity, setActivity] = useState<Activity>(biz.activity);
  const m = METIERS.find((x) => x.label === metier);
  const [svc, setSvc] = useState({ name: m?.service ?? '', duration: m ? minutes(m.duration) : 60, price: m ? String(m.price) : '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const pickMetier = (v: string) => {
    setMetier(v);
    const mm = METIERS.find((x) => x.label === v);
    if (mm) setSvc({ name: mm.service, duration: minutes(mm.duration), price: String(mm.price) });
  };

  async function finish() {
    setErr(''); setBusy(true);
    const s = slugify(slug || name);
    const up = await sb().from('businesses').update({ name: name.trim(), metier, slug: s, activity, urssaf_rate: ACTIVITIES[activity].rate }).eq('id', biz.id).select().single();
    if (up.error) { setErr(errText(up.error)); setBusy(false); setStep(0); return; }
    if (svc.name.trim()) {
      const r = await sb().from('services').insert({ business_id: biz.id, name: svc.name.trim(), duration_min: svc.duration, price_cents: toCents(svc.price) });
      if (r.error) { setErr(errText(r.error)); setBusy(false); return; }
    }
    const done = await sb().from('businesses').update({ onboarded: true }).eq('id', biz.id).select().single();
    setBusy(false);
    if (done.error) { setErr(errText(done.error)); return; }
    setBiz(done.data as Business);
  }

  return (
    <div className="auth">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <span className="eyebrow">Étape {step + 1} sur 2</span>
        {step === 0 ? (
          <>
            <h1>Bienvenue sur Fripe.</h1>
            <p className="muted">Deux questions et ta page de réservation est en ligne.</p>
            <Field label="Nom de ton activité" hint="Celui que tes clients voient. Ex. « Léa Nails »"><input value={name} onChange={(e) => { setName(e.target.value); if (!slug || slug === slugify(name)) setSlug(slugify(e.target.value)); }} autoFocus maxLength={80} /></Field>
            <Field label="Ton métier">
              <select value={metier} onChange={(e) => pickMetier(e.target.value)}>
                {METIERS.map((x) => <option key={x.slug}>{x.label}</option>)}
                <option>Autre</option>
              </select>
            </Field>
            <Field label="Adresse de ta page" hint="Lettres minuscules, chiffres et tirets.">
              <div className="pre"><span>fripe-iota.vercel.app/r/</span><input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} maxLength={40} /></div>
            </Field>
            <Field label="Ton statut" hint="Sert à estimer tes cotisations URSSAF. Modifiable ensuite.">
              <select value={activity} onChange={(e) => setActivity(e.target.value as Activity)}>
                {Object.entries(ACTIVITIES).map(([k, v]) => <option key={k} value={k}>{v.label} · {String(v.rate).replace('.', ',')} %</option>)}
              </select>
            </Field>
            {err && <div className="note err">{err}</div>}
            <button className="b ink lg full" disabled={name.trim().length < 2 || slugify(slug || name).length < 3} onClick={() => setStep(1)}>Continuer</button>
          </>
        ) : (
          <>
            <h1>Ta première prestation.</h1>
            <p className="muted">Tu pourras en ajouter d’autres, régler tes horaires et ton acompte ensuite.</p>
            <Field label="Nom"><input value={svc.name} onChange={(e) => setSvc({ ...svc, name: e.target.value })} maxLength={80} autoFocus /></Field>
            <div className="grid2">
              <Field label="Durée">
                <select value={svc.duration} onChange={(e) => setSvc({ ...svc, duration: +e.target.value })}>
                  {[15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 240].map((d) => <option key={d} value={d}>{d >= 60 ? `${Math.floor(d / 60)} h${d % 60 ? ' ' + (d % 60) : ''}` : `${d} min`}</option>)}
                </select>
              </Field>
              <Field label="Prix"><div className="pre"><input inputMode="decimal" value={svc.price} onChange={(e) => setSvc({ ...svc, price: e.target.value })} /><span style={{ padding: '0 14px 0 0' }}>€</span></div></Field>
            </div>
            {err && <div className="note err">{err}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="b lg" onClick={() => setStep(0)}>Retour</button>
              <button className="b ink lg" style={{ flex: 1 }} disabled={busy} onClick={finish}>{busy ? 'Création…' : 'Ouvrir mon espace'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
