'use client';

import { useEffect } from 'react';

// Fait apparaître en douceur les éléments .reveal quand ils entrent à l'écran (une seule fois).
// Classe « is-in » (et non « in », déjà utilisée par les champs de saisie de l'espace pro).
export default function Reveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver((list) => list.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => io.observe(el));
    const nav = document.querySelector('.nav');
    const onScroll = () => nav?.classList.toggle('scrolled', scrollY > 8);
    onScroll(); addEventListener('scroll', onScroll, { passive: true });
    return () => { io.disconnect(); removeEventListener('scroll', onScroll); };
  }, []);
  return null;
}
