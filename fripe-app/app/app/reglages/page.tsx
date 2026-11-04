'use client';
// Réglages : page publique, informations légales (factures), statut URSSAF, paiements en ligne (Stripe),
// abonnement Fripe Pro, compte.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePro } from '@/components/AppShell';
import { Field, Icon, copyText, useToast } from '@/components/ui';
import { METIERS } from '@/lib/metiers';
import { ACTIVITIES, fmtDate, slugify, type Activity } from '@/lib/fmt';
import { errText, fn, sb } from '@/lib/sb';
import type { Business } from '@/lib/types';

export default function Reglages() {
  const { biz, setBiz, account, isPro, user, reload } = usePro();
  const toast = useToast();
  const [f, setF] = useState({ name: biz.name, slug: biz.slug ?? '', metier: biz.metier, bio: biz.bio, email: biz.email, phone: biz.phone, legal_name: biz.legal_name, address: biz.address, siret: biz.siret, activity: biz.activity, urssaf_rate: String(biz.urssaf_rate).replace('.', ',') });
  const [busy, setBusy] = useState('');
  const [stripe, setStripe] = useState<{ connected?: boolean; ready?: boolean; details_submitted?: boolean } | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (biz.stripe_account_id || q.get('stripe')) fn<{ connected: boolean; ready: boolean; details_submitted: boolean }>('pro', { action: 'connect_sync' }).then((r) => {
      if (!r.error) { setStripe(r); if (r.ready !== biz.stripe_ready) setBiz({ ...biz, stripe_ready: r.ready }); if (q.get('stripe') === 'retour' && r.ready) toast('Paiements en ligne activés'); }
    });
    if (q.get('pro') === 'ok') fn('pro', { action: 'billing_sync' }).then(() => { reload(); toast('Bienvenue dans Fripe Pro'); });
    if (q.toString()) history.replaceState(null, '', location.pathname + location.hash);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setBusy('save');
    const rate = Number(f.urssaf_rate.replace(',', '.'));
    const r = await sb().from('businesses').update({
      name: f.name.trim(), slug: slugify(f.slug), metier: f.metier, bio: f.bio.trim(), email: f.email.trim(), phone: f.phone.trim(),
      legal_name: f.legal_name.trim(), address: f.address.trim(), siret: f.siret.replace(/\s/g, ''), activity: f.activity, urssaf_rate: isFinite(rate) ? rate : ACTIVITIES[f.activity].rate,
    }).eq('id', biz.id).select().single();
    setBusy('');
    if (r.error) return toast(errText(r.error), true);
    setBiz(r.data as Business); toast('Enregistré');
  }
  async function go(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action);
    const r = await fn<{ url?: string }>('pro', { action, ...extra });
    setBusy('');
    if (r.error || !r.url) return toast(errText(r.error ?? ''), true);
    location.href = r.url;
  }
  async function deleteAccount() {
    if (!confirm('Supprimer définitivement ton compte et toutes tes données ? Cette action est irréversible.')) return;
    const r = await fn('pro', { action: 'delete_account' });
    if (r.error) return toast(errText(r.error), true);
    await sb().auth.signOut(); location.href = '/';
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const pageUrl = `${typeof location !== 'undefined' ? location.origin : ''}/r/${biz.slug}`;

  return (
    <>
      <div className="ap-head">
        <div><h1>Réglages</h1><p>{user.email}</p></div>
        <button className="b ink" disabled={busy === 'save'} onClick={save}>{busy === 'save' ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
      <div className="grid2">
        <div className="stack">
          <div className="panel">
            <h2>Ta page de réservation</h2>
            <p>Ce que voient tes clients.</p>
            <div className="stack" style={{ marginTop: 14 }}>
              <Field label="Nom affiché"><input value={f.name} onChange={set('name')} maxLength={80} /></Field>
              <Field label="Adresse de la page"><div className="pre"><span>…/r/</span><input value={f.slug} onChange={(e) => setF({ ...f, slug: slugify(e.target.value) })} maxLength={40} /></div></Field>
              <Field label="Métier"><select value={METIERS.some((m) => m.label === f.metier) ? f.metier : 'Autre'} onChange={set('metier')}>{METIERS.map((m) => <option key={m.slug}>{m.label}</option>)}<option>Autre</option></select></Field>
              <Field label="Présentation" hint="Deux phrases : ce que tu fais, où, pour qui."><textarea value={f.bio} onChange={set('bio')} maxLength={400} rows={3} /></Field>
              {biz.slug && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="b sm" onClick={async () => toast((await copyText(pageUrl)) ? 'Lien copié' : pageUrl)}><Icon name="copy" />Copier le lien</button><a className="b sm" href={`/r/${biz.slug}`} target="_blank" rel="noreferrer">Voir ma page</a></div>}
            </div>
          </div>
          <div className="panel">
            <h2>Informations légales</h2>
            <p>Obligatoires sur tes factures.</p>
            <div className="stack" style={{ marginTop: 14 }}>
              <Field label="Nom et prénom" hint="Suivi de « EI » sur la facture (entrepreneur individuel)."><input value={f.legal_name} onChange={set('legal_name')} maxLength={120} placeholder="Léa Martin" /></Field>
              <Field label="Adresse professionnelle"><input value={f.address} onChange={set('address')} maxLength={200} placeholder="12 rue des Lilas, 35000 Rennes" /></Field>
              <Field label="SIRET" hint="14 chiffres, sur ton avis de situation INSEE."><input value={f.siret} onChange={set('siret')} inputMode="numeric" maxLength={17} /></Field>
              <div className="grid2">
                <Field label="E-mail de contact"><input type="email" value={f.email} onChange={set('email')} maxLength={200} /></Field>
                <Field label="Téléphone"><input type="tel" value={f.phone} onChange={set('phone')} maxLength={30} /></Field>
              </div>
            </div>
          </div>
        </div>
        <div className="stack">
          <div className="panel">
            <h2>URSSAF</h2>
            <p>Pour estimer tes cotisations et ton bénéfice réel.</p>
            <div className="stack" style={{ marginTop: 14 }}>
              <Field label="Statut"><select value={f.activity} onChange={(e) => { const a = e.target.value as Activity; setF({ ...f, activity: a, urssaf_rate: String(ACTIVITIES[a].rate).replace('.', ',') }); }}>{Object.entries(ACTIVITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
              <Field label="Taux de cotisations" hint="Ajoute 1 à 2,2 % si tu as choisi le versement libératoire de l’impôt, ou retire l’ACRE la première année."><div className="pre"><input inputMode="decimal" value={f.urssaf_rate} onChange={set('urssaf_rate')} /><span style={{ padding: '0 14px 0 0' }}>%</span></div></Field>
            </div>
          </div>
          <div className="panel">
            <h2>Paiements en ligne</h2>
            <p>Tes clients paient l’acompte par carte. L’argent arrive sur ton compte bancaire via Stripe, sans commission Fripe (frais Stripe seulement).</p>
            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              {biz.stripe_ready ? (
                <>
                  <div className="note">Activés. Les acomptes sont demandés à la réservation.</div>
                  <button className="b" disabled={!!busy} onClick={() => go('connect_dashboard')}>Ouvrir mon tableau Stripe</button>
                </>
              ) : (
                <>
                  {stripe?.details_submitted && <div className="note warn">Stripe vérifie tes informations. Ça prend en général quelques minutes.</div>}
                  <button className="b green" disabled={!!busy} onClick={() => go('connect_start')}>{busy === 'connect_start' ? 'Ouverture…' : biz.stripe_account_id ? 'Terminer l’activation' : 'Activer les paiements'}</button>
                  <p className="muted" style={{ fontSize: 13 }}>Il te faut une pièce d’identité et ton IBAN. 5 minutes.</p>
                </>
              )}
            </div>
          </div>
          <div className="panel" id="abonnement">
            <h2>Abonnement</h2>
            {account.is_admin ? (
              <div className="note" style={{ marginTop: 12 }}>Compte propriétaire : Fripe Pro à vie, tout est illimité.</div>
            ) : isPro ? (
              <>
                <p>Fripe Pro{account.pro_until ? ` · ${account.cancel_at_period_end ? 'se termine' : 'renouvelé'} le ${fmtDate(account.pro_until)}` : ''}.</p>
                <button className="b" style={{ marginTop: 12 }} disabled={!!busy} onClick={() => go('billing_portal')}>Gérer mon abonnement</button>
              </>
            ) : (
              <>
                <p>Gratuit : 10 rendez-vous et 5 factures par mois. Pro : tout illimité, sans commission.</p>
                <div className="grid2" style={{ marginTop: 14 }}>
                  <button className="b ink" disabled={!!busy} onClick={() => go('billing_checkout', { interval: 'month' })}>12 € / mois</button>
                  <button className="b green" disabled={!!busy} onClick={() => go('billing_checkout', { interval: 'year' })}>120 € / an · 2 mois offerts</button>
                </div>
              </>
            )}
          </div>
          <div className="panel">
            <h2>Compte</h2>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button className="b" onClick={async () => { await sb().auth.signOut(); location.href = '/'; }}><Icon name="out" />Se déconnecter</button>
              {!account.is_admin && <button className="b danger" onClick={deleteAccount}>Supprimer mon compte</button>}
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 12 }}><Link href="/cgv">Conditions</Link> · <Link href="/confidentialite">Confidentialité</Link> · <Link href="/mentions-legales">Mentions légales</Link></p>
          </div>
        </div>
      </div>
    </>
  );
}
