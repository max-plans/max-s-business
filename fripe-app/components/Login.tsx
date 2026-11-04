'use client';
// Connexion sans mot de passe : un lien envoyé par e-mail ouvre l'espace (création du compte au premier passage).
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { sb } from '@/lib/sb';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error' | 'invalid'>('idle');
  const [busyMsg, setBusyMsg] = useState('');

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
    if (error) { setBusyMsg(/rate|seconds/i.test(error.message) ? 'Un lien vient déjà de partir. Attends une minute avant d’en redemander un.' : ''); setState('error'); return; }
    setState('sent');
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <Link href="/" className="brand"><span className="mark">F</span>Fripe</Link>
        {state === 'sent' ? (
          <>
            <h1>Regarde tes e-mails.</h1>
            <p className="muted">Un lien de connexion vient de partir vers <b style={{ color: 'var(--ink)' }}>{email.trim().toLowerCase()}</b>. Ouvre-le sur cet appareil pour entrer dans ton espace. Pense aux courriers indésirables.</p>
            <button className="b" onClick={() => setState('idle')}>Changer d’adresse</button>
          </>
        ) : (
          <form onSubmit={send} style={{ display: 'grid', gap: 16 }}>
            <h1>Ton espace Fripe.</h1>
            <p className="muted">Pas de mot de passe : entre ton e-mail, tu reçois un lien pour te connecter. Le compte se crée tout seul la première fois.</p>
            <label className="f"><span>E-mail</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.fr" autoFocus required /></label>
            {state === 'invalid' && <div className="note err">Cette adresse e-mail n’est pas valide.</div>}
            {state === 'error' && <div className="note err">{busyMsg || 'L’envoi n’a pas fonctionné. Réessaie dans un instant.'}</div>}
            <button className="b ink lg full" disabled={state === 'sending'}>{state === 'sending' ? 'Envoi…' : 'Recevoir mon lien'}</button>
            <p className="muted" style={{ fontSize: 13 }}>En continuant, tu acceptes les <Link href="/cgv">conditions</Link> et la <Link href="/confidentialite">politique de confidentialité</Link>.</p>
          </form>
        )}
      </div>
    </div>
  );
}
