'use client';

import { useState } from 'react';
import { METIERS } from '@/lib/metiers';
import { joinWaitlist } from '@/lib/supabase';

// Inscription à la liste d'attente : e-mail + métier (pour savoir quels métiers accrochent le plus).
export default function WaitlistForm({ metier = '', source = 'accueil', cta = 'Rejoindre la liste' }: { metier?: string; source?: string; cta?: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'invalid' | 'busy' | 'error'>('idle');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get('site')) return setState('ok'); // champ piège invisible : rempli seulement par les robots
    setState('loading');
    setState(await joinWaitlist(String(f.get('email') || ''), String(f.get('metier') || ''), source));
  }
  if (state === 'ok') return <p className="wl-msg ok" role="status">C’est noté ! Tu fais partie des premiers : on t’écrit dès que ton accès est prêt.</p>;
  return (
    <form onSubmit={submit} noValidate={false}>
      <div className="wl">
        <input type="email" name="email" required placeholder="ton@email.fr" aria-label="Ton adresse e-mail" autoComplete="email" />
        <input type="text" name="metier" className="wl-metier" defaultValue={METIERS.find((m) => m.slug === metier)?.label ?? ''} placeholder="Ton métier" aria-label="Ton métier" maxLength={60} autoComplete="organization-title" />
        <button className="btn" type="submit" disabled={state === 'loading'}>{state === 'loading' ? 'Un instant…' : cta}</button>
        <label className="wl-hp" aria-hidden="true">Site <input name="site" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <p className={`wl-msg ${state === 'idle' || state === 'loading' ? '' : 'err'}`} role="status">
        {state === 'invalid' ? 'Cette adresse e-mail ne semble pas valide.' : state === 'busy' ? 'Beaucoup d’inscriptions en ce moment : réessaie dans une minute.' : state === 'error' ? 'Oups, ça n’est pas passé. Réessaie dans un instant.' : ''}
      </p>
    </form>
  );
}
