'use client';
// Connexion sans mot de passe : un code à 6 chiffres (ou le lien) envoyé par e-mail ouvre l'espace.
// Le compte se crée au premier passage.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { sb } from '@/lib/sb';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error' | 'invalid'>('idle');
  const [busyMsg, setBusyMsg] = useState('');
  const [code, setCode] = useState('');
  const [check, setCheck] = useState<'idle' | 'checking' | 'bad'>('idle');

  useEffect(() => {
    // retour depuis le lien de l'e-mail : la session est lue dans l'URL, puis direction l'espace
    sb().auth.getSession().then(({ data }) => { if (data.session) router.replace('/app'); });
    const { data } = sb().auth.onAuthStateChange((_e, s) => { if (s) router.replace('/app'); });
    return () => data.subscription.unsubscribe();
  }, [router]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)) { setState('invalid'); return; }
    setState('sending');
    const { error } = await sb().auth.signInWithOtp({ email: v, options: { emailRedirectTo: `${location.origin}/connexion`, shouldCreateUser: true } });
    if (error) { setBusyMsg(/rate|seconds/i.test(error.message) ? 'Un code vient déjà de partir. Attends une minute avant d’en redemander un.' : ''); setState('error'); return; }
    setState('sent'); setCode(''); setCheck('idle');
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\D/g, '');
    if (token.length < 6) { setCheck('bad'); return; }
    setCheck('checking');
    const { error } = await sb().auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: 'email' });
    if (error) { setCheck('bad'); return; }
    router.replace('/app');
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <Link href="/" className="brand"><span className="mark">F</span>Fripe</Link>
        {state === 'sent' ? (
          <>
            <h1>Entre ton code.</h1>
            <p className="muted">Un code vient de partir vers <b style={{ color: 'var(--ink)' }}>{email.trim().toLowerCase()}</b>. Pense aux courriers indésirables.</p>
            <form onSubmit={verify} style={{ display: 'grid', gap: 12 }}>
              <input className="otp" value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 8)); setCheck('idle'); }} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" aria-label="Code reçu par e-mail" autoFocus />
              {check === 'bad' && <div className="note err">Code incorrect ou expiré. Vérifie-le, ou demande un nouveau code.</div>}
              <button className="b ink lg full" disabled={check === 'checking' || code.length < 6}>{check === 'checking' ? 'Vérification…' : 'Me connecter'}</button>
            </form>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="b sm" onClick={(e) => send(e as unknown as React.FormEvent)}>Renvoyer un code</button>
              <button className="b sm ghost" onClick={() => setState('idle')}>Changer d’adresse</button>
            </div>
          </>
        ) : (
          <form onSubmit={send} style={{ display: 'grid', gap: 16 }}>
            <h1>Ton espace Fripe.</h1>
            <p className="muted">Pas de mot de passe : entre ton e-mail, tu reçois un code pour te connecter. Le compte se crée tout seul la première fois.</p>
            <label className="f"><span>E-mail</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.fr" autoFocus required /></label>
            {state === 'invalid' && <div className="note err">Cette adresse e-mail n’est pas valide.</div>}
            {state === 'error' && <div className="note err">{busyMsg || 'L’envoi n’a pas fonctionné. Réessaie dans un instant.'}</div>}
            <button className="b ink lg full" disabled={state === 'sending'}>{state === 'sending' ? 'Envoi…' : 'Recevoir mon code'}</button>
            <p className="muted" style={{ fontSize: 13 }}>En continuant, tu acceptes les <Link href="/cgv">conditions</Link> et la <Link href="/confidentialite">politique de confidentialité</Link>.</p>
          </form>
        )}
      </div>
    </div>
  );
}
