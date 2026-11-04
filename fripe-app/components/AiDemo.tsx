'use client';

import { useEffect, useRef, useState } from 'react';
import type { Metier } from '@/lib/metiers';
import { eur } from '@/lib/metiers';

// Démonstration de l'assistant : une phrase tapée devient un rendez-vous, une demande d'acompte et une facture.
export default function AiDemo({ m }: { m: Metier }) {
  const phrase = `${m.client}, ${m.service.toLowerCase()} samedi 14h, ${m.price} €`;
  const [n, setN] = useState(0), [step, setStep] = useState(0);
  const box = useRef<HTMLDivElement>(null), on = useRef(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { on.current = e.isIntersecting; }, { threshold: 0.3 });
    if (box.current) io.observe(box.current);
    let t = 0, timer = 0;
    const loop = () => {
      if (on.current) {
        t += 1;
        const typed = Math.min(phrase.length, t);
        setN(typed);
        const after = t - phrase.length;
        setStep(after < 4 ? 0 : after < 9 ? 1 : after < 14 ? 2 : 3);
        if (after > 52) t = 0;
      }
      timer = window.setTimeout(loop, 70);
    };
    loop();
    return () => { io.disconnect(); clearTimeout(timer); };
  }, [phrase]);
  const deposit = Math.round(m.price / 3);
  return (
    <div className="ai-box" ref={box}>
      <div className="ai-input"><span className="mic" aria-hidden="true">✦</span><span>{phrase.slice(0, n)}<span className="caret" /></span></div>
      <div className="ai-out">
        <div className={`ai-card ${step >= 1 ? 'on' : ''}`}><span className="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg></span><span className="t">{m.service} avec {m.client}<small>Samedi · 14:00 · {m.duration}</small></span><span className="pill">Ajouté</span></div>
        <div className={`ai-card ${step >= 2 ? 'on' : ''}`}><span className="ic">€</span><span className="t">Demande d’acompte de {eur(deposit)}<small>Lien de paiement envoyé à {m.client}</small></span><span className="pill">Envoyé</span></div>
        <div className={`ai-card ${step >= 3 ? 'on' : ''}`}><span className="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg></span><span className="t">Facture de {eur(m.price)} préparée<small>Partira toute seule après le rendez-vous</small></span><span className="pill ink">Prête</span></div>
      </div>
    </div>
  );
}
