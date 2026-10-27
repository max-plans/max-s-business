/* Effets de l'interface : texte qui se décode, barre de progression, menu plein écran, vitrine de boîtes pilotée par les sections. */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GLYPHS = '█▓▒░#%&@$*+=<>/\\|ABCDEFGHJKLMNPRSTUVXYZ0123456789';

  /* décode un texte lettre par lettre, façon signal brouillé */
  const runs = new WeakMap();
  function scramble(el, text, dur) {
    if (!el) return;
    text = text == null ? (el.dataset.text || el.textContent) : text;
    el.dataset.text = text;
    if (reduce) { el.textContent = text; return; }
    const prev = runs.get(el); if (prev) cancelAnimationFrame(prev);
    const len = text.length, total = dur || Math.min(900, 260 + len * 40), t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / total); let out = '';
      for (let i = 0; i < len; i++) {
        const ch = text[i], at = (i / len) * .7 + .3 * Math.random();
        out += ch === ' ' || p >= at ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = p >= 1 ? text : out;
      if (p < 1) runs.set(el, requestAnimationFrame(step)); else runs.delete(el);
    };
    runs.set(el, requestAnimationFrame(step));
  }
  window.FripeFX = { scramble };

  /* barre de progression du scroll (accueil et espace) */
  const bar = document.getElementById('progress');
  const onScroll = () => { if (!bar) return; const h = document.documentElement.scrollHeight - innerHeight; bar.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`; };
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); addEventListener('hashchange', () => setTimeout(onScroll, 60));

  /* menu plein écran */
  const menu = document.getElementById('menu'), mbtn = document.getElementById('menu-btn');
  const setMenu = (open) => {
    if (!menu) return; menu.hidden = !open; mbtn.setAttribute('aria-expanded', String(open)); document.body.classList.toggle('menu-open', open);
    if (open) menu.querySelectorAll('[data-scramble]').forEach((el, i) => setTimeout(() => scramble(el), i * 70));
  };
  if (mbtn) mbtn.addEventListener('click', () => setMenu(menu.hidden));
  if (menu) menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu && !menu.hidden) setMenu(false); });
  document.addEventListener('pointerover', (e) => { const a = e.target.closest('[data-hover-scramble]'); if (a && !a.contains(e.relatedTarget)) scramble(a.querySelector('[data-scramble]') || a); });

  /* titres qui se décodent en entrant à l'écran */
  const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { scramble(en.target); io.unobserve(en.target); } }), { threshold: .4 });
  document.querySelectorAll('#site [data-scramble]').forEach((el) => { el.dataset.text = el.textContent; if (!el.closest('#menu')) io.observe(el); });

  /* la vitrine : appelée par app.js une fois la scène créée */
  window.FripeLanding = function (scene) {
    const P = window.FRIPE_PRODUCTS || [];
    const nm = document.getElementById('car-name'), num = document.getElementById('car-num'), st = document.getElementById('car-stat');
    const paint = (i, p) => {
      document.documentElement.style.setProperty('--pc', p.css);
      if (num) num.textContent = `${String(i + 1).padStart(2, '0')} / ${String(P.length).padStart(2, '0')}`;
      if (st) st.textContent = `${p.stat} · ${p.note}`;
      scramble(nm, p.name.toUpperCase(), 520);
    };
    if (!scene) { if (P[0]) paint(0, P[0]); const nav = (d) => { let i = (+(document.documentElement.dataset.car || 0) + d + P.length) % P.length; document.documentElement.dataset.car = i; paint(i, P[i]); }; const pv = document.getElementById('car-prev'), nx = document.getElementById('car-next'); if (pv) pv.onclick = () => nav(-1); if (nx) nx.onclick = () => nav(1); return; }
    scene.onSelect(paint);
    const pv = document.getElementById('car-prev'), nx = document.getElementById('car-next');
    if (pv) pv.onclick = () => scene.prev(); if (nx) nx.onclick = () => scene.next();
    const hero = document.getElementById('s-hero'); if (hero) scene.bindSwipe(hero);
    addEventListener('keydown', (e) => { if (!document.body.classList.contains('landing') || (menu && !menu.hidden)) return; if (e.target.closest('input,textarea,select')) return; const r = hero && hero.getBoundingClientRect(); if (!r || r.bottom < 0) return; if (e.key === 'ArrowRight') scene.next(); else if (e.key === 'ArrowLeft') scene.prev(); });
    let heroIdx = 0, current = null; scene.onSelect((i) => { if (current === hero) heroIdx = i; });

    /* chaque section dit à la scène quoi montrer ; la plus proche du centre de l'écran gagne */
    const secs = [...document.querySelectorAll('#site [data-mode]')];
    const pick = () => {
      if (!document.body.classList.contains('landing')) return;
      const mid = innerHeight * .5; let best = null, bd = 1e9;
      secs.forEach((s) => { const r = s.getBoundingClientRect(); const d = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid)); if (d < bd) { bd = d; best = s; } });
      if (!best || best === current) return; current = best;
      const d = best.dataset;
      document.body.dataset.scene = d.mode;
      if (d.mode === 'focus') { scene.go({ mode: 'focus', idx: +d.idx, side: +(d.side || 1) }); document.documentElement.style.setProperty('--flood', P[+d.idx].css); }
      else scene.go({ mode: d.mode, idx: d.mode === 'line' && best === hero ? heroIdx : undefined });
    };
    addEventListener('scroll', pick, { passive: true }); addEventListener('resize', pick); addEventListener('hashchange', () => { current = null; setTimeout(pick, 120); });
    pick();
  };
})();
