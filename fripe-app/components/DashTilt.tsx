'use client';

import { useEffect, useRef } from 'react';

// Le tableau de bord se redresse en 3D à mesure qu'on fait défiler la page jusqu'à lui.
export default function DashTilt({ children }: { children: React.ReactNode }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = 0; const d = el.current; if (!d) return;
      const r = d.getBoundingClientRect(), vh = innerHeight;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.75)));
      d.style.setProperty('--p', p.toFixed(3));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick(); addEventListener('scroll', on, { passive: true }); addEventListener('resize', on);
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);
  return <div className="dash-scene"><div className="dash" ref={el}>{children}</div></div>;
}
