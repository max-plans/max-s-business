'use client';
// Cadre de l'espace pro : vérifie la connexion, crée l'activité au premier passage, affiche la navigation.
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { fn, sb } from '@/lib/sb';
import type { Account, Business } from '@/lib/types';
import { Icon, ToastHost } from './ui';
import Onboarding from './Onboarding';

type Ctx = { user: User; biz: Business; account: Account; isPro: boolean; setBiz: (b: Business) => void; reload: () => Promise<void> };
const ProCtx = createContext<Ctx | null>(null);
export const usePro = () => useContext(ProCtx)!;

const NAV = [
  { href: '/app', label: 'Accueil', icon: 'home', tab: true },
  { href: '/app/agenda', label: 'Agenda', icon: 'cal', tab: true },
  { href: '/app/factures', label: 'Factures', icon: 'doc', tab: true },
  { href: '/app/clients', label: 'Clients', icon: 'users', tab: false },
  { href: '/app/depenses', label: 'Dépenses', icon: 'wallet', tab: false },
  { href: '/app/prestations', label: 'Prestations', icon: 'list', tab: true },
  { href: '/app/reglages', label: 'Réglages', icon: 'gear', tab: true },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter(), path = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [biz, setBiz] = useState<Business | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (u: User) => {
    const [b, a] = await Promise.all([sb().rpc('ensure_business'), sb().from('accounts').select('plan, pro_until, is_admin, cancel_at_period_end').eq('user_id', u.id).maybeSingle()]);
    if (b.error || !b.data) { setFailed(true); return; }
    setBiz(b.data as Business);
    setAccount((a.data as Account) ?? { plan: 'free', pro_until: null, is_admin: false, cancel_at_period_end: false });
  }, []);

  useEffect(() => {
    let alive = true;
    sb().auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (!data.session) { router.replace('/connexion'); return; }
      setUser(data.session.user); load(data.session.user);
    });
    const { data: sub } = sb().auth.onAuthStateChange((ev, s) => { if (ev === 'SIGNED_OUT' || !s) router.replace('/connexion'); });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [router, load]);

  // acomptes payés pendant l'absence du pro : relus une fois par visite
  useEffect(() => { if (biz?.stripe_account_id) fn('pro', { action: 'payments_sync' }); }, [biz?.stripe_account_id]);

  if (failed) return <div className="auth"><div className="auth-card"><h1>Oups.</h1><p className="muted">Ton espace n’a pas pu s’ouvrir. Recharge la page.</p><button className="b ink" onClick={() => location.reload()}>Recharger</button></div></div>;
  if (!user || !biz || !account) return <div className="auth"><div className="muted">Chargement…</div></div>;

  const isPro = account.is_admin || (account.plan === 'pro' && (!account.pro_until || new Date(account.pro_until) > new Date()));
  const ctx: Ctx = { user, biz, account, isPro, setBiz, reload: () => load(user) };
  const on = (h: string) => (h === '/app' ? path === '/app' : path.startsWith(h));

  return (
    <ProCtx.Provider value={ctx}>
      <ToastHost>
        {!biz.onboarded ? <Onboarding /> : (
          <div className="ap">
            <aside className="ap-side">
              <Link href="/app" className="brand"><span className="mark">F</span>Fripe</Link>
              <nav className="ap-nav">
                {NAV.map((n) => <Link key={n.href} href={n.href} className={on(n.href) ? 'on' : ''}><Icon name={n.icon} />{n.label}</Link>)}
                {account.is_admin && <Link href="/app/admin" className={on('/app/admin') ? 'on' : ''}><Icon name="shield" />Admin</Link>}
              </nav>
              <div className="grow" />
              <div className="ap-plan">
                <div className="row" style={{ padding: 0, border: 0 }}>
                  <span className={'tag ' + (isPro ? 'ink' : '')}>{account.is_admin ? 'Pro · à vie' : isPro ? 'Pro' : 'Gratuit'}</span>
                </div>
                {biz.slug && <a href={`/r/${biz.slug}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', wordBreak: 'break-all' }}>Ma page ↗</a>}
                {!isPro && <Link href="/app/reglages#abonnement" className="b sm green">Passer en Pro</Link>}
              </div>
            </aside>
            <main className="ap-main">
              <div className="ap-mtop">
                <Link href="/app" className="brand"><span className="mark">F</span>Fripe</Link>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Link href="/app/clients" className="b sm ghost" aria-label="Clients"><Icon name="users" /></Link>
                  <Link href="/app/depenses" className="b sm ghost" aria-label="Dépenses"><Icon name="wallet" /></Link>
                  {account.is_admin && <Link href="/app/admin" className="b sm ghost" aria-label="Admin"><Icon name="shield" /></Link>}
                </div>
              </div>
              {children}
            </main>
            <nav className="ap-tabs">
              {NAV.filter((n) => n.tab).map((n) => <Link key={n.href} href={n.href} className={on(n.href) ? 'on' : ''}><Icon name={n.icon} />{n.label}</Link>)}
            </nav>
          </div>
        )}
      </ToastHost>
    </ProCtx.Provider>
  );
}
