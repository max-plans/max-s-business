'use client';
// Petits éléments partagés de l'espace pro : icônes, fenêtre, message, champ.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const P: Record<string, ReactNode> = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>,
  cal: <><rect x="3" y="4.5" width="18" height="16.5" rx="3" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></>,
  doc: <><path d="M6 2.5h8l5 5V21a.5.5 0 0 1-.5.5h-12A.5.5 0 0 1 6 21z" /><path d="M14 2.5v5h5M9 13h7M9 17h5" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.8 3.1 2.6 3.5 5.2" /></>,
  wallet: <><rect x="2.5" y="5.5" width="19" height="14" rx="3" /><path d="M2.5 9.5h19M16 14.5h2" /></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></>,
  gear: <><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  shield: <><path d="M12 2.5 4 5.5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10v-6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  link: <><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" /></>,
  spark: <path d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5z" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  send: <><path d="M21.5 2.5 10.5 13.5" /><path d="M21.5 2.5 14.5 21.5l-4-8-8-4z" /></>,
  phone: <path d="M5 3.5h3.5l2 5-2.5 1.5a11 11 0 0 0 6 6l1.5-2.5 5 2v3.5a2 2 0 0 1-2 2A17 17 0 0 1 3 5.5a2 2 0 0 1 2-2z" />,
  out: <><path d="M15 3.5h4a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5h-4" /><path d="M10 17l5-5-5-5M15 12H3.5" /></>,
  print: <><path d="M6 9V2.5h12V9" /><rect x="2.5" y="9" width="19" height="8.5" rx="2" /><path d="M6 14.5h12V21.5H6z" /></>,
  copy: <><rect x="8.5" y="8.5" width="12" height="12" rx="2.5" /><path d="M15.5 8.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v9A1.5 1.5 0 0 0 5 15.5h3.5" /></>,
  trash: <><path d="M4 6.5h16M9.5 6.5V4h5v2.5M6 6.5l1 14h10l1-14" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  back: <path d="M19 12H5M11 18l-6-6 6-6" />,
};
export function Icon({ name, size }: { name: keyof typeof P | string; size?: number }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} aria-hidden="true">{P[name]}</svg>;
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    const o = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = o; };
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label={title}>
      <div className={'modal' + (wide ? ' wide' : '')}><h3>{title}</h3>{children}</div>
    </div>
  );
}

type T = { text: string; err?: boolean } | null;
const ToastCtx = createContext<(text: string, err?: boolean) => void>(() => {});
export function ToastHost({ children }: { children: ReactNode }) {
  const [t, setT] = useState<T>(null);
  const show = useCallback((text: string, err?: boolean) => { setT({ text, err }); window.setTimeout(() => setT((c) => (c?.text === text ? null : c)), 3600); }, []);
  return <ToastCtx.Provider value={show}>{children}{t && <div className={'toast' + (t.err ? ' err' : '')} role="status">{t.text}</div>}</ToastCtx.Provider>;
}
export const useToast = () => useContext(ToastCtx);

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="f"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export const initials = (n: string) => (n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

export async function copyText(t: string) {
  try { await navigator.clipboard.writeText(t); return true; } catch { return false; }
}
