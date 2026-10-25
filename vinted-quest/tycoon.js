'use strict';

/* Vinted Tycoon : moteur du mini-jeu (canvas 2D).
   Chargé AVANT app.js ; il lit à l'exécution `state`, `LEVELS`, `cat`, `gameCoins`, `computeStats`,
   `profitOf`, `toast`, `today`, `gameSaveSoon` définis dans app.js. */
const tycoon = (() => {
  const W = 480, H = 288;
  const SHELF = { y: 64, w: 104, h: 56, xs: [12, 129, 246, 363] };
  const AISLE_Y = 142;
  const COUNTER = { x: 332, y: 176, w: 132, h: 32 };
  const QUEUE = [{ x: 398, y: 226 }, { x: 366, y: 226 }, { x: 334, y: 226 }];
  const FACES = ['🧑', '👩', '🧔', '👵', '🧓', '👨‍🦱', '👩‍🦰', '🧕'];
  const FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif';
  const TEXT = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';

  let customers = [], pops = [], rain = [], van = null, kitty = null;
  let spawnT = 1.5, last = 0, running = false, clock = 0, joined = 0;

  /* ----- accès à l'état de l'appli ----- */
  const G = () => state.game || {};
  const owns = (id) => (G().owned || []).includes(id);
  const shelves = () => 1 + ['shelf2', 'shelf3', 'shelf4'].filter(owns).length;
  const stock = () => state.items.filter((i) => i.status !== 'vendu');
  const dailyCap = () => 20 + 10 * shelves();
  const served = () => (G().servedDate === today() ? G().servedN || 0 : 0);
  const rand = (a, b) => a + Math.random() * (b - a);
  const level = () => {
    const p = computeStats(state.items).totalProfit;
    let li = 0;
    LEVELS.forEach((l, i) => { if (p >= l.min) li = i; });
    return li;
  };
  const charm = () => ['plant', 'radio', 'neon', 'trophy'].filter(owns).length;
  const rate = () => 1 + 0.25 * level() + 0.1 * charm() + (owns('sign') ? 0.25 : 0);
  const maxCustomers = () => 3 + (owns('cat') ? 1 : 0);
  const isNight = () => { const h = new Date().getHours(); return h >= 20 || h < 7; };
  const slotPos = (s, t, k) => ({ x: SHELF.xs[s] + 4 + k * 24 + 12, y: SHELF.y + 14 + t * 24 });

  /* ----- HUD (mise à jour légère, sans re-rendre la page) ----- */
  function hud() {
    const c = document.getElementById('g-coins');
    if (c) c.textContent = '🪙 ' + gameCoins(state.items, G()).balance;
    const s = document.getElementById('g-sub');
    if (s) s.textContent = `Clients aujourd’hui : ${served()}/${dailyCap()}`;
    const bal = gameCoins(state.items, G()).balance;
    document.querySelectorAll('[data-action=buy][data-price]').forEach((b) => {
      const ok = bal >= Number(b.dataset.price);
      b.disabled = !ok;
      b.classList.toggle('primary', ok);
    });
  }

  function pop(x, y, text, color = '#15803d', size = 15) { pops.push({ x, y, text, color, size, life: 1.4 }); }

  /* ----- clients ----- */
  function spawn() {
    const c = {
      x: 240, y: H + 8, face: FACES[Math.floor(Math.random() * FACES.length)], state: 'enter', path: [], item: null,
      timer: 0, patience: 9, auto: 0, age: 0, joined: 0, qi: -1, bubble: '', speed: rand(52, 70),
    };
    const sIdx = Math.floor(Math.random() * shelves());
    c.shelf = sIdx;
    const sx = SHELF.xs[sIdx] + SHELF.w / 2;
    c.path = [{ x: 240, y: AISLE_Y }, { x: sx, y: AISLE_Y }];
    customers.push(c);
  }

  function pickItem(c) {
    const list = stock();
    if (!list.length) return null;
    const base = c.shelf * 8, n = Math.min(8, Math.max(0, list.length - base));
    return n > 0 ? list[base + Math.floor(Math.random() * n)] : list[Math.floor(Math.random() * list.length)];
  }

  function queueOf() { return customers.filter((c) => c.state === 'toQueue' || c.state === 'wait').sort((a, b) => a.joined - b.joined); }

  function leave(c, bubble) {
    c.state = 'leave'; c.bubble = bubble || '';
    c.path = [{ x: c.x, y: Math.max(c.y, 262) }, { x: 240, y: 262 }, { x: 240, y: H + 16 }];
  }

  function pay(c, quick) {
    const price = c.item ? c.item.listPrice || c.item.buyPrice || 0 : 0;
    const gain = 2 + (owns('cashier') ? 1 : 0) + Math.min(4, Math.floor(price / 10)) + (quick ? 1 : 0);
    const g = (state.game = { owned: [], claimed: {}, ...state.game });
    if (g.servedDate !== today()) { g.servedDate = today(); g.servedN = 0; }
    g.servedN++;
    g.clientCoins = (Number(g.clientCoins) || 0) + gain;
    pop(c.x, c.y - 26, `+${gain} 🪙${quick ? ' ⚡' : ''}`);
    c.bubble = '😊';
    leave(c, '😊');
    hud();
    gameSaveSoon();
  }

  /* ----- boucle de mise à jour ----- */
  function update(dt) {
    clock += dt;
    // apparition des clients
    spawnT -= dt;
    if (spawnT <= 0) {
      spawnT = Math.max(2.2, 7 / rate()) * rand(0.7, 1.3);
      if (stock().length && served() + customers.filter((c) => c.state !== 'leave').length < dailyCap() && customers.length < maxCustomers()) spawn();
    }
    for (const c of customers) {
      c.age += dt;
      if (c.path.length) {
        const t = c.path[0], dx = t.x - c.x, dy = t.y - c.y, d = Math.hypot(dx, dy), step = c.speed * dt;
        if (d <= step) { c.x = t.x; c.y = t.y; c.path.shift(); } else { c.x += (dx / d) * step; c.y += (dy / d) * step; }
        continue;
      }
      if (c.state === 'enter') { c.state = 'browse'; c.timer = rand(1.3, 2.8); }
      else if (c.state === 'browse') {
        c.timer -= dt;
        if (c.timer <= 0) {
          c.item = pickItem(c);
          if (!c.item) { leave(c, '😕'); continue; }
          if (queueOf().length >= QUEUE.length) { leave(c, '😕'); continue; }
          c.bubble = cat(c.item.category)[1];
          c.state = 'toQueue'; c.joined = ++joined;
          const qi = queueOf().indexOf(c), q = QUEUE[Math.max(0, qi)];
          c.path = [{ x: c.x, y: AISLE_Y }, { x: 312, y: AISLE_Y }, { x: 312, y: q.y }, { x: q.x, y: q.y }];
        }
      } else if (c.state === 'toQueue') { c.state = 'wait'; c.patience = 9; }
      else if (c.state === 'wait') {
        c.patience -= dt;
        const qi = queueOf().indexOf(c);
        c.qi = qi;
        const q = QUEUE[qi];
        if (q && (Math.abs(c.x - q.x) > 1 || Math.abs(c.y - q.y) > 1)) c.path = [{ x: q.x, y: q.y }];
        if (qi === 0 && owns('clerk')) { c.auto += dt; if (c.auto > 1.2) pay(c, false); }
        if (c.patience <= 0) { pop(c.x, c.y - 26, '😡', '#b91c1c', 18); leave(c, '😡'); }
      } else if (c.state === 'leave') c.done = true;
    }
    customers = customers.filter((c) => !c.done);
    for (const p of pops) { p.y -= 22 * dt; p.life -= dt; }
    pops = pops.filter((p) => p.life > 0);
    for (const r of rain) { r.y += r.vy * dt; r.life -= dt; }
    rain = rain.filter((r) => r.life > 0 && r.y < H + 10);
    if (van) { van.x += 150 * dt; if (van.x > W + 50) van = null; }
    // chat de boutique
    if (owns('cat')) {
      if (!kitty) kitty = { x: 60, y: 240, tx: 60, ty: 240, wait: 1 };
      if (Math.hypot(kitty.tx - kitty.x, kitty.ty - kitty.y) < 2) {
        kitty.wait -= dt;
        if (kitty.wait <= 0) { kitty.tx = rand(24, 300); kitty.ty = rand(196, 268); kitty.wait = rand(1, 4); }
      } else {
        const dx = kitty.tx - kitty.x, dy = kitty.ty - kitty.y, d = Math.hypot(dx, dy), s = 26 * dt;
        kitty.x += (dx / d) * Math.min(s, d); kitty.y += (dy / d) * Math.min(s, d);
      }
    } else kitty = null;
  }

  /* ----- dessin ----- */
  function emoji(ctx, ch, x, y, size) {
    ctx.fillStyle = '#000';
    ctx.font = `${size}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ch, x, y);
  }

  function drawShelf(ctx, i, items) {
    const x = SHELF.xs[i], y = SHELF.y;
    ctx.fillStyle = '#7c4a03'; ctx.fillRect(x, y, SHELF.w, SHELF.h);
    ctx.fillStyle = '#d6a45a'; ctx.fillRect(x + 3, y + 3, SHELF.w - 6, SHELF.h - 6);
    ctx.fillStyle = '#a16207';
    ctx.fillRect(x + 3, y + 25, SHELF.w - 6, 4); ctx.fillRect(x + 3, y + SHELF.h - 8, SHELF.w - 6, 5);
    for (let t = 0; t < 2; t++) for (let k = 0; k < 4; k++) {
      const it = items[i * 8 + t * 4 + k];
      if (it) { const p = slotPos(i, t, k); emoji(ctx, cat(it.category)[1], p.x, p.y, 18); }
    }
  }

  function draw(cv) {
    const dpr = window.devicePixelRatio || 1, cw = cv.clientWidth || W;
    const pw = Math.round(cw * dpr), ph = Math.round((cw * H / W) * dpr);
    if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
    const ctx = cv.getContext('2d');
    ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // sol et mur
    for (let ty = 0; ty < H / 32 + 1; ty++) for (let tx = 0; tx < W / 32; tx++) {
      ctx.fillStyle = (tx + ty) % 2 ? '#ead9b6' : '#e2cfa7'; ctx.fillRect(tx * 32, ty * 32, 32, 32);
    }
    ctx.fillStyle = '#5d4331'; ctx.fillRect(0, 0, W, 56);
    ctx.fillStyle = '#7a5a43'; ctx.fillRect(0, 50, W, 6);
    ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(0, 56, W, 6);
    ctx.fillStyle = 'rgba(160,60,60,.28)'; ctx.fillRect(24, 214, 190, 64); // tapis
    ctx.strokeStyle = 'rgba(160,60,60,.5)'; ctx.lineWidth = 2; ctx.strokeRect(28, 218, 182, 56);

    // enseigne
    const name = (G().name || 'Ma boutique');
    ctx.fillStyle = '#fff8e6'; ctx.strokeStyle = '#0f766e'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(120, 8, 240, 34, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#134e4a'; ctx.font = `bold 17px ${TEXT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(name, 240, 26, 220);
    emoji(ctx, '⭐'.repeat(level() + 1), 240, 49, 11);
    if (owns('sign')) for (let i = 0; i < 16; i++) {
      const on = Math.floor(clock * 3 + i) % 2;
      ctx.fillStyle = on ? '#fbbf24' : '#a16207';
      ctx.beginPath(); ctx.arc(126 + i * 15.2, 8, 2.5, 0, 7); ctx.arc(126 + i * 15.2, 42, 2.5, 0, 7); ctx.fill();
    }
    if (owns('neon')) {
      ctx.save(); ctx.shadowColor = '#f472b6'; ctx.shadowBlur = isNight() ? 16 : 7; ctx.fillStyle = '#f9a8d4';
      ctx.font = `bold 15px ${TEXT}`; ctx.textAlign = 'center'; ctx.fillText('OPEN', 62, 26); ctx.restore();
    }
    if (owns('trophy')) emoji(ctx, '🏆', 420, 28, 26);

    // étagères avec le vrai stock
    const items = stock();
    for (let i = 0; i < shelves(); i++) drawShelf(ctx, i, items);
    const over = items.length - shelves() * 8;
    if (over > 0) { ctx.fillStyle = '#134e4a'; ctx.font = `bold 11px ${TEXT}`; ctx.textAlign = 'left'; ctx.fillText(`+${over} en réserve`, 12, 134); }

    // décor
    if (owns('plant')) emoji(ctx, '🪴', 36, 160, 30);
    if (owns('radio')) emoji(ctx, '📻', 352, 164, 20);
    // comptoir
    ctx.fillStyle = '#6b3f12'; ctx.fillRect(COUNTER.x, COUNTER.y + 6, COUNTER.w, COUNTER.h);
    ctx.fillStyle = '#c08a4a'; ctx.fillRect(COUNTER.x - 3, COUNTER.y, COUNTER.w + 6, 12);
    emoji(ctx, owns('cashier') ? '🧾' : '💶', 398, COUNTER.y - 4, 20);
    if (owns('clerk')) emoji(ctx, '🧑‍💼', 440, COUNTER.y - 12, 28);
    // porte
    ctx.fillStyle = '#7dd3fc'; ctx.fillRect(216, H - 6, 48, 6); ctx.fillStyle = '#5d4331'; ctx.fillRect(212, H - 8, 4, 8); ctx.fillRect(264, H - 8, 4, 8);

    // chat
    if (kitty) emoji(ctx, '🐈', kitty.x, kitty.y, 22);

    // clients (triés par y)
    [...customers].sort((a, b) => a.y - b.y).forEach((c) => {
      ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(c.x, c.y + 12, 10, 4, 0, 0, 7); ctx.fill();
      const bob = c.path.length ? Math.sin(c.age * 12) * 1.5 : 0;
      emoji(ctx, c.face, c.x, c.y + bob, 26);
      if (c.bubble) { emoji(ctx, c.bubble, c.x + 14, c.y - 18, 15); }
      if (c.state === 'wait') {
        const f = Math.max(0, c.patience / 9);
        ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(c.x - 12, c.y - 22, 24, 4);
        ctx.fillStyle = f > 0.5 ? '#16a34a' : f > 0.25 ? '#f59e0b' : '#dc2626'; ctx.fillRect(c.x - 12, c.y - 22, 24 * f, 4);
        if (c.qi === 0 && !owns('clerk')) { ctx.font = `bold 11px ${TEXT}`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#134e4a'; ctx.strokeText('clique !', c.x, c.y - 32); ctx.fillStyle = '#fff'; ctx.fillText('clique !', c.x, c.y - 32); }
      }
    });

    // pluie de pièces et camion de livraison
    rain.forEach((r) => emoji(ctx, '🪙', r.x, r.y, 16));
    if (van) { emoji(ctx, '🚚', van.x, H - 34, 34); }
    // nuit
    if (isNight()) { ctx.fillStyle = 'rgba(20,30,80,.28)'; ctx.fillRect(0, 0, W, H); if (owns('neon')) { ctx.save(); ctx.shadowColor = '#f472b6'; ctx.shadowBlur = 18; ctx.fillStyle = '#f9a8d4'; ctx.font = `bold 15px ${TEXT}`; ctx.textAlign = 'center'; ctx.fillText('OPEN', 62, 26); ctx.restore(); } }
    // textes flottants
    pops.forEach((p) => {
      ctx.globalAlpha = Math.min(1, p.life * 1.5); ctx.fillStyle = p.color; ctx.font = `bold ${p.size}px ${FONT}`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.strokeText(p.text, p.x, p.y);
      ctx.fillText(p.text, p.x, p.y); ctx.globalAlpha = 1;
    });
  }

  /* ----- interactions ----- */
  function onPointer(e, cv) {
    const r = cv.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
    const front = queueOf()[0];
    const nearCounter = x > COUNTER.x - 10 && x < COUNTER.x + COUNTER.w + 10 && y > COUNTER.y - 24 && y < COUNTER.y + COUNTER.h + 12;
    const hit = customers.find((c) => Math.hypot(c.x - x, c.y - y) < 18 && c.state === 'wait');
    if (hit || nearCounter) {
      if (front && front.state === 'wait') { pay(front, front.age < 14 || front.patience > 5); return; }
      if (hit) { toast('Un client à la fois : le premier de la file !'); return; }
    }
    if (kitty && Math.hypot(kitty.x - x, kitty.y - y) < 20) { pop(kitty.x, kitty.y - 20, '😺 miaou', '#a16207', 13); return; }
    const list = stock();
    for (let s = 0; s < shelves(); s++) for (let t = 0; t < 2; t++) for (let k = 0; k < 4; k++) {
      const p = slotPos(s, t, k), it = list[s * 8 + t * 4 + k];
      if (it && Math.hypot(p.x - x, p.y - y) < 13) {
        toast(`${cat(it.category)[1]} ${it.title} · acheté ${eur(it.buyPrice)}${it.listPrice ? ' · affiché ' + eur(it.listPrice) : ''}${it.location ? ' · 📍 ' + it.location : ''}`);
        return;
      }
    }
  }

  /* ----- célébration d'une vraie vente ----- */
  function celebrate(n, coins) {
    van = { x: -40 };
    for (let i = 0; i < 28; i++) rain.push({ x: rand(10, W - 10), y: rand(-120, -4), vy: rand(70, 150), life: 6 });
    pop(240, 100, `🎉 ${n} vente${n > 1 ? 's' : ''} ! +${coins} 🪙`, '#0f766e', 20);
    toast(`${n} nouvelle${n > 1 ? 's' : ''} vente${n > 1 ? 's' : ''} depuis ta dernière visite : +${coins} 🪙`);
  }

  function checkSales() {
    const sold = state.items.filter((i) => i.status === 'vendu');
    const g = (state.game = { owned: [], claimed: {}, ...state.game });
    if (g.seenSold === undefined) { g.seenSold = sold.length; gameSaveSoon(); return; }
    if (sold.length < g.seenSold) { g.seenSold = sold.length; gameSaveSoon(); return; }
    if (sold.length > g.seenSold) {
      const n = sold.length - g.seenSold;
      const recent = [...sold].sort((a, b) => (b.soldAt || '').localeCompare(a.soldAt || '')).slice(0, n);
      const coins = recent.reduce((s, i) => s + 5 + Math.max(0, Math.round(profitOf(i))), 0);
      g.seenSold = sold.length;
      gameSaveSoon();
      celebrate(n, coins);
    }
  }

  /* ----- cycle de vie ----- */
  function frame(ts) {
    const cv = document.getElementById('game');
    if (!cv || state.tab !== 'game' || document.hidden) { running = false; return; }
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    update(dt);
    draw(cv);
    requestAnimationFrame(frame);
  }

  function ensure() {
    const cv = document.getElementById('game');
    if (!cv) return;
    if (!cv.__bound) { cv.__bound = true; cv.addEventListener('pointerdown', (e) => onPointer(e, cv)); }
    checkSales();
    hud();
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
  }

  document.addEventListener('visibilitychange', () => { if (!document.hidden && state.tab === 'game') ensure(); });

  return { ensure, hud, _debug: () => ({ customers, pops, rain }) };
})();
