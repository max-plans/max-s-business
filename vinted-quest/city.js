'use strict';

/* Vinted City : le tycoon vu du ciel. Remplace l'ancien monde 3D à la troisième personne.
   Expose le même objet `world` pour app.js : available, mount, sync, info, travel.
   Lit à l'exécution les globales de app.js : state, cat, LEVELS, computeStats, profitOf, gameCoins, today, toast,
   gameSaveSoon, updateHud, openItemCard, openSheet, gameAction, shopName, SHOP_BY_ID, BUILDINGS, STAFF, eur, esc. */
const world = (() => {
  const T = window.THREE, G = window.VQG, B = window.VQB;
  if (!T || !G || !B) return { available: false, mount: () => false, sync() {}, travel() {}, info: () => ({ served: 0, cap: 0, overflow: 0, place: '', staff: 0, buildings: 1 }) };
  const { C, M, bx, cy, pl, lerp, clamp, rand, pick, hash } = G;
  const L = B.LAYOUT;
  const KEYS = ['boutique', 'entrepot', 'bureau', 'studio', 'expedition'];
  const BID = { entrepot: 'b_entrepot', bureau: 'b_bureau', studio: 'b_studio', expedition: 'b_expedition' };
  const NAMES = { boutique: ['🏪', 'Boutique'], entrepot: ['📦', 'Entrepôt'], bureau: ['🏢', 'QG'], studio: ['📸', 'Studio photo'], expedition: ['🚚', 'Centre d’expédition'] };
  const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

  let stage, scene, camera, rig, renderer, mounted = false, running = false, lastT = 0, clock = 0, timeAcc = 9, hourOverride = null;
  let city = {}, selected = null, vehicles = [], actors = [], customers = [], puffs = [], glows = [], floats = [], bubbles = [];
  let displayItems = [], stockItems = [], lastSig = '', overflow = 0, itemGroups = {}, pickables = [];
  let spawnT = { ave: [2, 4], south: [3, 6], cust: 3, hub: 20 }, hub = { truck: null, state: 'idle', timer: 12, pending: 0 }, crew = [], yardPallet = [], forklift = null, stockerVan = null, driverActor = null;
  let initialDone = false, glowsReady = false;
  let els = {}, lastPlace = '', raycaster = new T.Raycaster(), pallet = { n: 0, group: null }, frameCount = 0;

  /* ---------- règles du jeu (mêmes que les versions précédentes) ---------- */
  const owned = () => (state.game && state.game.owned) || [];
  const own = (k) => k === 'boutique' || owned().includes(BID[k]);
  const hired = (id) => owned().includes(id);
  const unitCount = () => 1 + ['shelf2', 'shelf3', 'shelf4'].filter((id) => owned().includes(id)).length;
  const served = () => (state.game.servedDate === today() ? state.game.servedN || 0 : 0);
  const bonus = () => ({ rate: (hired('e_photog') ? 0.3 : 0) + (hired('e_cm') ? 0.25 : 0), cap: (hired('e_cm') ? 10 : 0) + (hired('e_stocker') ? 5 : 0), pay: hired('e_packer') ? 1 : 0 });
  const dailyCap = () => 20 + 10 * unitCount() + bonus().cap;
  const level = () => { const p = computeStats(state.items).totalProfit; let li = 0; LEVELS.forEach((l, i) => { if (p >= l.min) li = i; }); return li; };
  const charm = () => ['plant', 'radio', 'neon', 'trophy'].filter((id) => owned().includes(id)).length;
  const rate = () => 1 + 0.25 * level() + 0.1 * charm() + (owned().includes('sign') ? 0.25 : 0) + bonus().rate;
  const maxCustomers = () => 3 + (owned().includes('cat') ? 1 : 0);
  const buildingCount = () => KEYS.filter((k) => k !== 'boutique' && own(k)).length;

  // gains des employés : plafonnés chaque jour pour que les vraies ventes restent le moteur du jeu
  function earn(n, x, z, ignoreCap) {
    const g = (state.game = { owned: [], claimed: {}, ...state.game });
    if (g.empireDate !== today()) { g.empireDate = today(); g.empireN = 0; }
    let add = n;
    if (!ignoreCap) { const cap = 40 + 20 * buildingCount(); if (g.empireN >= cap) return false; add = Math.min(n, cap - g.empireN); g.empireN += add; }
    g.clientCoins = (Number(g.clientCoins) || 0) + add;
    floatText(new T.Vector3(x, 4, z), `+${add} 🪙`); flyCoins(new T.Vector3(x, 3, z), add); updateHud(); gameSaveSoon();
    return true;
  }

  /* ---------- effets 2D posés sur la scène : textes flottants, pièces qui volent, bulles ---------- */
  const project = (v) => { const p = v.clone().project(camera); return { x: (p.x * 0.5 + 0.5) * stage.w, y: (-p.y * 0.5 + 0.5) * stage.h, behind: p.z > 1 || p.z < -1 }; };
  function floatText(v, text) {
    const s = project(v); if (s.behind) return;
    const e = document.createElement('div'); e.className = 'floatx'; e.textContent = text; e.style.left = s.x + 'px'; e.style.top = s.y + 'px'; els.fx.appendChild(e); setTimeout(() => e.remove(), 1700);
  }
  function flyCoins(v, n) {
    const s = project(v); if (s.behind || !els.coinTarget) return;
    const to = els.coinTarget.getBoundingClientRect();
    for (let i = 0; i < Math.min(6, 1 + Math.floor(n / 3)); i++) {
      const e = document.createElement('div'); e.className = 'coinfx'; e.textContent = '🪙'; e.style.left = s.x + 'px'; e.style.top = s.y + 'px'; els.fx.appendChild(e);
      if (e.animate) { const a = e.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(${to.left + 20 - s.x - 12}px,${to.top + 16 - s.y - 12}px) scale(.6)`, opacity: 0.9 }], { duration: 700 + i * 90, delay: i * 70, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' }); a.onfinish = () => e.remove(); } else setTimeout(() => e.remove(), 900);
    }
  }
  function addBubble(pos, value, onTake) {
    const e = document.createElement('button'); e.className = 'bub'; e.innerHTML = `<span>🪙</span> +${value}`; e.setAttribute('aria-label', `Récupérer ${value} pièces`);
    const b = { e, pos: pos.clone(), value, life: 40, onTake };
    e.addEventListener('click', (ev) => { ev.stopPropagation(); takeBubble(b); });
    els.bub.appendChild(e); bubbles.push(b); return b;
  }
  function takeBubble(b) {
    if (b.taken) return; b.taken = true; b.e.remove();
    const g = (state.game = { owned: [], claimed: {}, ...state.game });
    if (g.servedDate !== today()) { g.servedDate = today(); g.servedN = 0; }
    g.servedN++; g.clientCoins = (Number(g.clientCoins) || 0) + b.value;
    flyCoins(b.pos, b.value); updateHud(); gameSaveSoon();
  }

  /* ---------- particules : fumée, poussière, échappement ---------- */
  const puffTex = G.canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }, null, false);
  function puff(x, y, z, hex, size, life, rise, vx = 0, vz = 0) {
    if (puffs.length > 90 || stage.quality < 1) return;
    const s = new T.Sprite(new T.SpriteMaterial({ map: puffTex, color: C(hex), transparent: true, opacity: 0.55, depthWrite: false })); s.scale.set(size, size, 1); s.position.set(x, y, z); scene.add(s);
    puffs.push({ s, life, max: life, rise, vx, vz, size });
  }
  const dust = (x, z, n = 22) => { for (let i = 0; i < n; i++) puff(x + rand(-8, 8), rand(0.5, 3), z + rand(-6, 6), 0xc8b18a, rand(3, 6), rand(1.2, 2.2), rand(0.5, 1.6), rand(-0.6, 0.6), rand(-0.6, 0.6)); };

  /* ---------- trajets lissés ---------- */
  function smoothPath(pts, cut = 3.2) {
    if (pts.length < 3) return pts;
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i - 1], b = pts[i], c = pts[i + 1];
      const d1 = Math.hypot(b.x - a.x, b.z - a.z), d2 = Math.hypot(c.x - b.x, c.z - b.z), r1 = Math.min(cut, d1 / 2.2), r2 = Math.min(cut, d2 / 2.2);
      if (b.rev || b.stop || b.nosmooth) { out.push(b); continue; }
      out.push({ x: b.x + ((a.x - b.x) / d1) * r1, z: b.z + ((a.z - b.z) / d1) * r1 }, { ...b, x: b.x + ((c.x - b.x) / d2) * r2, z: b.z + ((c.z - b.z) / d2) * r2 });
    }
    out.push(pts[pts.length - 1]); return out;
  }

  /* ---------- véhicules ---------- */
  function addVehicle(model, path, o = {}) {
    const v = { g: model.g, wheels: model.wheels || [], len: model.len || 4, wr: o.wr || 0.4, speed: 0, max: o.speed || 9, path: smoothPath(path), lane: o.lane || null, dir: o.dir || 0, wait: 0, kind: o.kind || 'car', onDone: o.onDone, hl: [], branded: !!o.branded, rad: o.rad || 2 };
    const p0 = v.path[0]; v.g.position.set(p0.x, 0, p0.z); const p1 = v.path[1] || p0; v.g.rotation.y = Math.atan2(-(p1.z - p0.z), p1.x - p0.x);
    [[model.len / 2 + 0.2, 0.7], [model.len / 2 + 0.2, -0.7]].forEach(([x, z]) => { const s = G.glowSprite(0xfff0c8, 3.2, 0.0); s.position.set(x, 0.9, z); v.g.add(s); v.hl.push(s); });
    scene.add(v.g); vehicles.push(v); v.g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    if (o.branded) v.g.userData.pick = { type: 'truck' };
    return v;
  }
  function stepVehicle(v, dt) {
    const t = v.path[0]; if (!t) { v.done = true; return; }
    const g = v.g, dx = t.x - g.position.x, dz = t.z - g.position.z, dist = Math.hypot(dx, dz);
    let target = t.sp || v.max;
    if (v.lane) {      // distance de sécurité derrière le véhicule qui précède sur la même voie
      let gap = 1e9; vehicles.forEach((o) => { if (o !== v && o.lane === v.lane && o.dir === v.dir) { const d = (o.g.position.x - g.position.x) * v.dir; if (d > 0 && d < gap) gap = d; } });
      const safe = v.len + 5; target = Math.min(target, Math.max(0, (gap - safe) * 1.4));
    }
    if (v.wait > 0) { v.wait -= dt; target = 0; }
    v.speed += clamp(target - v.speed, -14 * dt, 7 * dt); if (v.speed < 0.02 && target === 0) v.speed = 0;
    const step = v.speed * dt;
    if (dist <= Math.max(step, 0.05)) {
      g.position.x = t.x; g.position.z = t.z; v.path.shift();
      if (t.stop) v.wait = t.stop; if (t.fn) t.fn(v); return;
    }
    if (step > 0) {
      g.position.x += (dx / dist) * step; g.position.z += (dz / dist) * step;
      if (!t.rev) g.rotation.y += angleDiff(g.rotation.y, Math.atan2(-dz, dx)) * Math.min(1, dt * 5.5);
      const spin = (t.rev ? -1 : 1) * (step / v.wr); v.wheels.forEach((w) => { w.rotation.z -= spin; });
    }
  }
  const carColors = [0xd62828, 0x1d4e89, 0xf2f2f2, 0x2b2d42, 0x2a9d8f, 0xe9c46a, 0x8d99ae, 0x6a4c93, 0xf4a261, 0x16a34a];
  function civilian(street, east) {
    const z = street === 'ave' ? (east ? B.LANE.east : B.LANE.west) : (east ? B.LANE.sEast : B.LANE.sWest), r = Math.random();
    const m = r < 0.62 ? B.car(pick(carColors)) : r < 0.82 ? B.van(pick([0xf2f2f2, 0xdfe5ea, 0xc9d6df])) : B.truck({ cab: pick([0x1d4e89, 0x2a9d8f, 0xe9c46a, 0x8d99ae]) });
    const x0 = east ? -105 : 105;
    const v = addVehicle(m, [{ x: x0, z }, { x: -x0, z }], { speed: rand(8, 11.5), lane: street + (east ? 'E' : 'W'), dir: east ? 1 : -1, wr: m.len > 6 ? 0.52 : 0.38 });
    v.onDone = null; return v;
  }

  /* ---------- acteurs : employés, équipe de quai, passants, clients ---------- */
  function addActor(g, steps, o = {}) {
    const a = { g, steps, i: 0, t: 0, box: null, inside: o.inside || null, loop: o.loop !== false, id: o.id, def: o.def, phase: Math.random() * 6, hidden: false, kind: o.kind || 'npc' };
    g.userData.pick = o.def ? { type: 'staff', id: o.id } : null; scene.add(g); actors.push(a); g.traverse((m) => { if (m.isMesh) m.castShadow = true; }); return a;
  }
  function carry(a, on) {
    if (on && !a.box) { a.box = bx(0.5, 0.4, 0.4, M(0xd7b27a, 0.85), 0, 1.3, 0.55); a.box.add(bx(0.08, 0.41, 0.41, M(0xf1e0b8, 0.8), 0, 0, 0)); a.g.add(a.box); }
    if (!on && a.box) { a.g.remove(a.box); a.box = null; }
  }
  const go = (x, z, sp) => ({ k: 'goto', x, z, sp });
  const doit = (fn) => ({ k: 'do', fn });
  const anim = (mode, d, a) => ({ k: 'anim', mode, d, a });
  const wait = (until) => ({ k: 'wait', until });
  function runActor(a, dt) {
    const st = a.steps[a.i]; const g = a.g;
    if (!st) { if (a.done) return; return; }
    const next = () => { a.i++; a.t = 0; if (a.i >= a.steps.length) { if (a.loop) a.i = 0; else a.done = true; } };
    if (st.k === 'goto') {
      const dx = st.x - g.position.x, dz = st.z - g.position.z, d = Math.hypot(dx, dz), step = (st.sp || 1.6) * dt;
      if (d <= step) { g.position.x = st.x; g.position.z = st.z; next(); B.walk(g, clock + a.phase, 0, !!a.box); }
      else { g.position.x += (dx / d) * step; g.position.z += (dz / d) * step; g.rotation.y += angleDiff(g.rotation.y, Math.atan2(dx, dz)) * Math.min(1, dt * 10); B.walk(g, clock + a.phase, 1, !!a.box); }
    } else if (st.k === 'do') { st.fn(a); next(); }
    else if (st.k === 'wait') { B.walk(g, clock, 0, !!a.box); if (st.until(a)) next(); }
    else if (st.k === 'anim') {
      a.t += dt; pose(g, st.mode, clock + a.phase);
      if (st.a !== undefined) g.rotation.y += angleDiff(g.rotation.y, st.a) * Math.min(1, dt * 8);
      if (a.t >= st.d) next();
    }
    if (a.box) { const u = g.userData; u.armL.rotation.x = u.armR.rotation.x = -1.2; }
  }
  function pose(g, mode, t) {
    const u = g.userData; B.walk(g, t, 0, false);
    if (mode === 'sit') B.sit(g, t);
    else if (mode === 'type' || mode === 'pack') { u.armL.rotation.x = -1.1 + Math.sin(t * 12) * 0.2; u.armR.rotation.x = -1.1 + Math.sin(t * 12 + 2) * 0.2; }
    else if (mode === 'shoot') { u.armL.rotation.x = u.armR.rotation.x = -1.5; }
    else if (mode === 'phone') { u.armR.rotation.x = -2.0; u.armL.rotation.x = 0; }
    else if (mode === 'cheer') { u.armL.rotation.x = u.armR.rotation.x = -2.8 + Math.sin(t * 14) * 0.3; }
  }
  // un acteur « à l'intérieur » d'un bâtiment n'est visible que si le bâtiment est transparent
  const insideVisible = (a) => !a.inside || (city[a.inside] && (city[a.inside].fade > 0.04 || city[a.inside].alwaysVisible));

  /* ---------- construction de la ville ---------- */
  function buildBuilding(k) {
    const c = city[k]; if (c.obj) return;
    const obj = k === 'boutique' ? B.boutique(shopName()) : k === 'bureau' ? B.qg() : k === 'entrepot' ? B.entrepot() : k === 'studio' ? B.studio() : B.expedition();
    c.obj = obj; c.fade = 0; c.fadeGoal = 0; c.alwaysVisible = !!obj.alwaysVisible;
    obj.root.traverse((o) => { if (o.isMesh) { o.castShadow = o.castShadow !== false && !(o.material && o.material.transparent && o.material.opacity < 0.7); o.receiveShadow = true; } });
    const merged = G.mergeStatic(obj.shell); merged.traverse((m) => { if (m.isMesh) m.castShadow = !(m.material.transparent && m.material.userData.base < 0.7); });
    obj.root.remove(obj.shell); obj.root.add(merged); obj.shell = merged; obj.fade.apply(0);
    if (obj.interior) { obj.interior.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); obj.interior.visible = !!obj.alwaysVisible; }
    scene.add(obj.root); if (obj.site) { obj.site.traverse((m) => { if (m.isMesh) m.receiveShadow = true; }); scene.add(G.mergeStatic(obj.site)); }
    c.hitRect = { x: L[k].x, z: L[k].z, w: L[k].w + 2, d: L[k].d + 2 };
    if (c.lot) { scene.remove(c.lot.group); c.lot = null; }
    if (k !== 'boutique' && initialDone) { obj.root.scale.y = 0.02; c.appear = 0; dust(L[k].x, L[k].z, 40); floatText(new T.Vector3(L[k].x, 8, L[k].z + 8), `${NAMES[k][0]} ${NAMES[k][1]} : travaux terminés !`); }
  }
  function ensureLot(k) {
    const c = city[k]; if (c.lot || own(k)) return;
    const [icon, name] = NAMES[k], price = SHOP_BY_ID[BID[k]] ? SHOP_BY_ID[BID[k]].price : 0;
    c.lot = B.lot(k, name, icon, price); scene.add(c.lot.group); c.hitRect = { x: L[k].x, z: L[k].z, w: L[k].w + 4, d: L[k].d + 4 };
  }

  /* ---------- objets en 3D : stock, rayons, colis ---------- */
  function clearGroup(g) { if (g) { scene.remove(g); g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); } }
  function placeItems() {
    ['boutiqueItems', 'yard', 'hubParcels', 'entStock'].forEach((n) => { if (itemGroups[n]) { if (itemGroups[n].parent) itemGroups[n].parent.remove(itemGroups[n]); itemGroups[n].traverse((o) => { if (o.geometry) o.geometry.dispose(); }); itemGroups[n] = null; } });
    pickables = [];
    const mark = (m, it, type = 'item') => { m.userData.pick = { type, id: it.id }; m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.pickRoot = m; } }); pickables.push(m); return m; };
    // boutique : articles en rayon + réserve
    const b = city.boutique.obj, n = unitCount(), bi = new T.Group(); b.interior.add(bi); itemGroups.boutiqueItems = bi;
    displayItems.slice(0, n * 8).forEach((it, i) => { const s = b.slots.display[i]; const m = B.itemMesh(it); m.scale.setScalar(1.5); m.position.set(s.x, s.y, s.z); m.rotation.y = rand(-0.5, 0.5); bi.add(mark(m, it)); });
    const inEnt = own('entrepot') && city.entrepot.obj;
    if (!inEnt) stockItems.slice(0, 32).forEach((it, i) => { const s = b.slots.stock[i]; const m = B.carton(it, 0.9); m.position.set(s.x, s.y, s.z); bi.add(mark(m, it)); });
    overflow = Math.max(0, displayItems.length - n * 8);
    // entrepôt : stock en cour (toujours visible) puis sur les racks
    if (inEnt) {
      const e = city.entrepot.obj, yard = new T.Group(); scene.add(yard); itemGroups.yard = yard; const es = new T.Group(); e.interior.add(es); itemGroups.entStock = es;
      stockItems.slice(0, 24).forEach((it, i) => { const s = e.slots.yard[i]; const m = B.carton(it, 1.0); m.position.set(s.x, s.y, s.z); m.rotation.y = rand(-0.2, 0.2); yard.add(mark(m, it)); });
      stockItems.slice(24, 60).forEach((it, i) => { const s = e.slots.stock[i]; const m = B.carton(it, 1.0); m.position.set(s.x, s.y, s.z); es.add(mark(m, it)); });
    }
    // expédition : colis des 7 derniers jours
    if (own('expedition') && city.expedition.obj) {
      const x = city.expedition.obj, pg = new T.Group(); scene.add(pg); itemGroups.hubParcels = pg;
      recentSold().slice(0, 18).forEach((it, i) => { const s = x.slots.parcels[i]; const m = B.carton(it, 1.0); m.position.set(s.x, s.y, s.z); m.rotation.y = rand(-0.3, 0.3); const ok = G.emojiSprite('✅', 0.9); ok.position.set(0, 1.2, 0); m.add(ok); pg.add(mark(m, it, 'parcel')); });
    }
  }
  function recentSold() {
    const lim = new Date(); lim.setDate(lim.getDate() - 7);
    const iso = `${lim.getFullYear()}-${String(lim.getMonth() + 1).padStart(2, '0')}-${String(lim.getDate()).padStart(2, '0')}`;
    return state.items.filter((i) => i.status === 'vendu' && i.soldAt && i.soldAt >= iso);
  }
  function drawChart() {
    const c = city.bureau; if (!c.obj) return;
    const months = computeStats(state.items).months, W = 1024, H = 380;
    const tx = G.canvasTex(W, H, (x) => {
      x.fillStyle = '#12211f'; x.fillRect(0, 0, W, H); x.fillStyle = '#9be7d8'; x.font = 'bold 36px system-ui,"Apple Color Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'left'; x.fillText('📈 Bénéfice des 6 derniers mois', 28, 50);
      const vals = months.map((m) => m.profit), maxV = Math.max(1, ...vals, 0), minV = Math.min(0, ...vals), range = maxV - minV || 1, top = 96, bot = 318, y = (v) => top + ((maxV - v) / range) * (bot - top);
      x.strokeStyle = 'rgba(255,255,255,.25)'; x.beginPath(); x.moveTo(28, y(0)); x.lineTo(W - 28, y(0)); x.stroke();
      months.forEach((m, i) => { const bx0 = 60 + i * 160, y1 = y(Math.max(m.profit, 0)), y2 = y(Math.min(m.profit, 0)); x.fillStyle = m.profit < 0 ? '#f87171' : '#2dd4bf'; x.fillRect(bx0, y1, 100, Math.max(m.profit ? 4 : 0, y2 - y1)); x.fillStyle = '#fff'; x.font = 'bold 30px system-ui'; x.textAlign = 'center'; x.fillText(m.profit ? Math.round(m.profit) + ' €' : '', bx0 + 50, m.profit < 0 ? y2 + 32 : y1 - 10); x.fillStyle = '#9fb3ae'; x.font = '26px system-ui'; x.fillText(m.label, bx0 + 50, H - 22); });
    });
    c.obj.setScreen(tx);
  }

  /* ---------- employés et équipes ---------- */
  const STAFF_LOOK = {
    clerk: { shirt: 0xffffff, pants: 0x222222, hair: 0x3b2a1a },
    e_packer: { shirt: 0xf4a261, pants: 0x2b2d42, vest: 0xff9f1c, hair: 0x5a3825, long: true, hat: 0xffd166 },
    e_stocker: { shirt: 0x1d3557, pants: 0x3a506b, vest: 0xff9f1c, hat: 0xffb703 },
    e_photog: { shirt: 0x222222, pants: 0x4a4e69, hair: 0xff6b9d, skin: 0xf1c27d },
    e_cm: { shirt: 0xef476f, pants: 0x2b2d42, hair: 0x111111, skin: 0x8d5524 },
    e_acc: { shirt: 0xffffff, pants: 0x264653, hair: 0x2b1d0e, skin: 0xffdbac, long: true },
    e_driver: { shirt: 0xd62828, pants: 0x222222, vest: 0xffd166, hat: 0xd62828, skin: 0xf1c27d },
  };
  const STAFF_DEF = { clerk: ['Le vendeur', 'Vendeur', 'Je tiens la caisse : je récupère les pièces des clients tout seul.'], e_packer: ['Léa', 'Emballeuse', 'J’emballe les colis, +1 🪙 sur chaque client.'], e_stocker: ['Hugo', 'Magasinier', 'Je livre des cartons à la boutique, +3 🪙 par livraison.'], e_cm: ['Karim', 'Community manager', 'Je fais connaître la boutique : +25 % de clients.'], e_acc: ['Chloé', 'Comptable', 'Je relance des factures : +1 🪙 toutes les 20 s.'], e_photog: ['Inès', 'Photographe', 'Mes photos attirent +30 % de clients.'], e_driver: ['Tom', 'Livreur', 'Je livre les colis en ville : +5 🪙 par tournée.'] };
  const staffOf = {};
  function hireStaff(id) {
    const key = (STAFF.find((s) => s.id === id) || {}).key; if (!key || !own(key) || !city[key].obj || staffOf[id]) return;
    const look = STAFF_LOOK[id], w = B.worker({ ...look, scale: 1.0 }), o = city[key].obj, def = STAFF_DEF[id];
    let steps = [], at = { x: 0, z: 0 }, inside = key === 'studio' ? 'studio' : null;
    if (id === 'clerk') { at = { x: o.anchors.counter.x, z: o.anchors.counter.z + 1.0 }; inside = 'boutique'; steps = [anim('idle', 99, Math.PI)]; }
    else if (id === 'e_packer') {
      const S = o.anchors.pack, P = { x: L.entrepot.x + 12.5, z: -8.6 };
      at = { x: S.x, z: S.z }; steps = [anim('pack', 6, Math.PI), doit((a) => carry(a, true)), go(P.x, P.z), doit((a) => { carry(a, false); pallet.n = (pallet.n + 1) % 7; updatePallet(); }), go(S.x, S.z)];
    } else if (id === 'e_photog') {
      at = { x: o.anchors.shoot.x, z: o.anchors.shoot.z }; const face = Math.atan2(o.anchors.stage.x - at.x, o.anchors.stage.z - at.z);
      steps = [anim('shoot', 2.4, face), doit(() => studioFlash()), anim('idle', 1.8, face), anim('shoot', 1.6, face), doit(() => studioFlash()), anim('idle', 3, face)];
    } else if (id === 'e_cm') {
      const d = city.bureau.obj.anchors.desks[0], door = city.bureau.obj.anchors.door, pz = city.bureau.obj.anchors.plaza; at = { x: d.x, z: d.z + 1.1 }; inside = 'bureau';
      steps = [anim('sit', 14, 0), doit((a) => { a.inside = null; }), go(door.x, door.z), go(pz.x, pz.z), anim('phone', 7, 0.6), doit(() => floatText(new T.Vector3(pz.x, 3, pz.z), pick(['❤️', '💬', '📣', '👍']))), go(door.x, door.z), doit((a) => { a.inside = 'bureau'; }), go(d.x, d.z + 1.1)];
    } else if (id === 'e_acc') {
      const d = city.bureau.obj.anchors.desks[3]; at = { x: d.x, z: d.z + 1.1 }; inside = 'bureau';
      steps = [anim('sit', 10, 0), doit((a) => floatText(new T.Vector3(a.g.position.x, 3, a.g.position.z), '🧾')), anim('sit', 10, 0), doit((a) => earn(1, a.g.position.x, a.g.position.z))];
    } else if (id === 'e_stocker') { startStockerVan(w, def); return; }
    else if (id === 'e_driver') { driverActor = null; at = { x: city.expedition.obj.anchors.crew.x + 3, z: city.expedition.obj.anchors.crew.z }; steps = [anim('idle', 99, 0)]; }
    w.position.set(at.x, 0, at.z);
    const a = addActor(w, steps, { id, def, inside, kind: 'staff' }); staffOf[id] = a; if (id === 'e_driver') driverActor = a;
    floatText(new T.Vector3(at.x, 4, at.z), `${def[0]} embauché(e) !`);
  }
  function updatePallet() {
    if (!pallet.group) { pallet.group = new T.Group(); pallet.group.position.set(L.entrepot.x + 12.5, 0, -8.6); scene.add(pallet.group); pallet.group.add(bx(2.6, 0.18, 2.6, M(0xb98a55, 0.8), 0, 0.12, 0)); pallet.boxes = new T.Group(); pallet.group.add(pallet.boxes); }
    pallet.boxes.clear(); for (let i = 0; i < pallet.n; i++) pallet.boxes.add(bx(0.8, 0.5, 0.7, M(0xd7b27a, 0.85), -0.8 + (i % 3) * 0.8, 0.45 + Math.floor(i / 3) * 0.52, -0.3 + (i % 2) * 0.55));
  }
  let flash = 0, studioLight = null;
  function studioFlash(noEarn) {
    flash = 1; const o = city.studio.obj; if (!o) return;
    if (!studioLight) { studioLight = new T.PointLight(0xffffff, 0, 30); studioLight.position.set(L.studio.x - 3, 4, L.studio.z + 0.6); scene.add(studioLight); }
    const list = displayItems.concat(stockItems); if (o.turnItem) { o.turn.remove(o.turnItem); o.turnItem = null; }
    if (list.length) { const m = B.itemMesh(pick(list)); m.scale.setScalar(2.2); m.position.y = 0.25; o.turn.add(m); o.turnItem = m; }
    if (!noEarn) earn(1, L.studio.x - 3, L.studio.z);
  }
  function startStockerVan(w, def) {      // Hugo conduit une camionnette entre l'entrepôt et la boutique
    const e = L.entrepot, bt = city.boutique.obj, pk = bt.parking;
    const m = B.van(0xf6f8fa);
    const path = () => [{ x: e.x - 8, z: -11.6 }, { x: e.x - 16, z: -11.6 }, { x: e.x - 16, z: -2 }, { x: -56, z: -2 }, { x: -56, z: 40.5 }, { x: pk.entrance.x, z: 40.5 }, { x: pk.entrance.x, z: pk.aisle }, { x: L.boutique.x - 4, z: pk.aisle, stop: 5, fn: (v) => { earn(3, L.boutique.x - 4, pk.aisle - 3); } }, { x: pk.exit.x, z: pk.aisle }, { x: pk.exit.x, z: 36.5 }, { x: -60, z: 36.5 }, { x: -60, z: 2 }, { x: e.x - 16, z: 2 }, { x: e.x - 16, z: -11.6 }, { x: e.x - 8, z: -11.6, stop: 8 }];
    const run = () => { const v = addVehicle(B.van(0xf6f8fa), path(), { speed: 7.5, branded: true, kind: 'van', wr: 0.4 }); v.g.userData.pick = { type: 'staff', id: 'e_stocker' }; v.onDone = () => { setTimeout(() => { if (hired('e_stocker') && mounted) { stockerVan = run(); } }, 10000); }; return v; };
    stockerVan = run(); staffOf.e_stocker = { g: stockerVan.g, def, kind: 'staff', vehicle: true }; w.visible = false; floatText(new T.Vector3(e.x - 8, 4, -11.6), `${def[0]} embauché(e) !`);
  }

  /* ---------- camion de livraison de la marque ---------- */
  function dispatchTruck(reason) {
    if (!city.expedition.obj) return dispatchCourier();
    if (hub.truck) { hub.pending++; return; }
    const x = city.expedition.obj, a = x.anchors, dock = a.docks[Math.floor(Math.random() * a.docks.length)];
    const m = B.truck({ branded: true, cab: 0xd62828 });
    const path = [{ x: 105, z: -2 }, { x: a.enter.x, z: -2 }, { x: a.enter.x, z: -6.6 }, { x: a.enter.x, z: a.lane }, { x: dock.x + 4, z: a.lane }, { x: dock.x, z: a.lane, stop: 99, nosmooth: true, fn: (v) => { hub.state = 'loading'; hub.t = 0; hub.dock = dock; } }, { x: a.exit.x, z: a.lane }, { x: a.exit.x, z: -6.6 }, { x: a.exit.x, z: -2 }, { x: -105, z: -2 }];
    const v = addVehicle(m, path, { speed: 8, branded: true, kind: 'truck', wr: 0.52, onDone: () => { hub.truck = null; hub.state = 'idle'; } });
    v.g.userData.pick = { type: 'truck' }; hub.truck = v; hub.state = 'arriving'; hub.reason = reason;
  }
  function dispatchCourier() {       // pas encore de centre d'expédition : une camionnette passe prendre le colis à la boutique
    const bt = city.boutique.obj, pk = bt.parking, m = B.van(0xf6f8fa);
    addVehicle(m, [{ x: 105, z: 36.5 }, { x: L.boutique.x + 12, z: 36.5 }, { x: L.boutique.x + 4, z: 36.5, stop: 3.5, fn: () => floatText(new T.Vector3(L.boutique.x + 4, 4, 36.5), '📦 Colis récupéré !') }, { x: -105, z: 36.5 }], { speed: 8, branded: true, kind: 'van', wr: 0.4 });
  }
  function hubTick(dt) {
    if (!hub.truck || !city.expedition.obj) { hub.timer -= dt; if (hub.timer <= 0) { hub.timer = 55; if (hired('e_driver') && city.expedition.obj) dispatchTruck('tournée'); else if (hub.pending > 0) { hub.pending--; dispatchTruck('colis'); } } return; }
    if (hub.state === 'loading') {
      hub.t += dt;
      // l'équipe de quai charge le camion
      if (!hub.crewStarted) { hub.crewStarted = true; crew.forEach((c, i) => { c.i = 0; c.steps = crewSteps(i, hub.dock); c.done = false; c.loop = false; }); if (driverActor) { driverActor.steps = [go(hub.dock.x + 3, hub.dock.z + 1.8), doit((a) => { a.g.visible = false; a.hidden = true; }), anim('idle', 99, 0)]; driverActor.i = 0; driverActor.t = 0; } }
      if (hub.t > 9.5) { hub.crewStarted = false; hub.state = 'leaving'; const tr = hub.truck; tr.wait = 0; earn(hired('e_driver') ? 5 : 2, hub.dock.x, hub.dock.z); flyCoins(new T.Vector3(hub.dock.x, 3, hub.dock.z), 5); if (driverActor) { driverActor.hidden = false; driverActor.g.visible = true; const c = city.expedition.obj.anchors.crew; driverActor.g.position.set(c.x + 3, 0, c.z); driverActor.steps = [anim('idle', 99, 0)]; driverActor.i = 0; } crew.forEach((c) => { c.steps = [go(c.home.x, c.home.z), anim('idle', 99, 0)]; c.i = 0; c.loop = false; }); }
    }
  }
  function crewSteps(i, dock) {
    const door = { x: dock.x + (i ? 1.3 : -1.3), z: dock.z - 3.2 }, side = { x: dock.x + (i ? 1.3 : -1.3), z: dock.z - 1.6 }, s = [];
    for (let k = 0; k < 3; k++) s.push(go(door.x, door.z), doit((a) => carry(a, true)), go(side.x, side.z), doit((a) => carry(a, false)));
    s.push(go(door.x, door.z - 0.5), anim('idle', 99, 0)); return s;
  }

  /* ---------- clients de la boutique ---------- */
  function spawnCustomer() {
    const bt = city.boutique.obj, pk = bt.parking, taken = customers.map((c) => c.slot);
    const free = pk.slots.map((s, i) => i).filter((i) => !taken.includes(i)); if (!free.length) return;
    const slotI = pick(free), slot = pk.slots[slotI], m = B.car(pick(carColors));
    const c = { slot: slotI, state: 'drive', car: null, person: null, item: pick(displayItems), t: 0 };
    const path = [{ x: 105, z: B.LANE.sWest }, { x: pk.entrance.x + 8, z: B.LANE.sWest }, { x: pk.entrance.x, z: B.LANE.sWest + 0.1 }, { x: pk.entrance.x, z: pk.aisle }, { x: slot.x, z: pk.aisle }, { x: slot.x, z: slot.z + 2.2, nosmooth: true }, { x: slot.x, z: slot.z, nosmooth: true, stop: 0.01, fn: (v) => { c.state = 'parked'; arriveCustomer(c); } }];
    c.car = addVehicle(m, path, { speed: 9, wr: 0.38, kind: 'customer' }); customers.push(c);
  }
  function arriveCustomer(c) {
    const bt = city.boutique.obj, pk = bt.parking, slot = pk.slots[c.slot], door = bt.anchors.door;
    const p = B.worker({ scale: Math.random() < 0.12 ? 0.75 : 1 }); p.position.set(slot.x + 1.4, 0, slot.z + 0.4);
    const price = c.item ? c.item.listPrice || c.item.buyPrice || 0 : 0, gain = 2 + (owned().includes('cashier') ? 1 : 0) + Math.min(4, Math.floor(price / 10)) + bonus().pay;
    const pay = () => {
      const pos = new T.Vector3(L.boutique.x + 4.6, 5.8, L.boutique.z + 8);
      if (hired('clerk')) { const g = (state.game = { owned: [], claimed: {}, ...state.game }); if (g.servedDate !== today()) { g.servedDate = today(); g.servedN = 0; } g.servedN++; g.clientCoins = (Number(g.clientCoins) || 0) + gain; flyCoins(pos, gain); floatText(pos, `+${gain} 🪙`); updateHud(); gameSaveSoon(); }
      else addBubble(pos, gain);
    };
    const steps = [go(door.x, slot.z - 1.4 + 0.0, 2.0), go(door.x, door.z, 2.0), doit((a) => { a.inside = 'boutique'; }), go(L.boutique.x + 1 + rand(-4, 4), L.boutique.z + rand(-2, 2), 2.0), anim('idle', rand(3, 5)), go(L.boutique.x + 4.6, L.boutique.z + 5.0, 2.0), anim('idle', 1.4), doit(pay), go(door.x, door.z - 1.0, 2.0), doit((a) => { a.inside = null; }), go(slot.x + 1.4, slot.z - 1.2, 2.0), doit((a) => { a.g.visible = false; a.done = true; leaveCustomer(c); })];
    c.person = addActor(p, steps, { loop: false, kind: 'customer' });
  }
  function leaveCustomer(c) {
    const bt = city.boutique.obj, pk = bt.parking, slot = pk.slots[c.slot]; c.state = 'leaving';
    c.car.path = smoothPath([{ x: slot.x, z: slot.z }, { x: slot.x, z: pk.aisle, rev: true, nosmooth: true }, { x: pk.exit.x, z: pk.aisle }, { x: pk.exit.x, z: B.LANE.sWest }, { x: -105, z: B.LANE.sWest }]);
    c.car.onDone = () => { customers.splice(customers.indexOf(c), 1); };
  }

  /* ---------- sélection d'un bâtiment, panneau d'infos ---------- */
  function select(k) {
    if (selected === k) return; selected = k;
    KEYS.forEach((kk) => { const c = city[kk]; if (c) c.fadeGoal = kk === k && c.obj ? 1 : 0; });
    if (k) { const l = L[k]; rig.focus(l.x, l.z + 3, Math.max(l.w, l.d) * 2.3 + 14); }
    renderPanel(); updatePlace();
  }
  function updatePlace() { const p = selected ? NAMES[selected][1] : 'Vue aérienne'; if (p !== lastPlace) { lastPlace = p; updateHud(); } }
  function renderPanel() {
    const el = els.panel; if (!el) return;
    if (!selected) { el.hidden = true; return; }
    const k = selected, c = city[k], [icon, name] = NAMES[k], g = state.game || {}, coins = gameCoins(state.items, g).balance, isLot = !own(k) || !c.obj;
    const staff = STAFF.filter((s) => s.key === k && hired(s.id)), cnt = staff.length;
    let info = '', acts = '';
    if (isLot) {
      const it = SHOP_BY_ID[BID[k]]; info = `<div class="bp-sub">Terrain à vendre. ${esc(it.desc)}</div>`;
      acts = `<button class="btn primary" data-act="buy" data-id="${BID[k]}" ${coins >= it.price ? '' : 'disabled'}>Construire · ${it.price} 🪙</button>`;
    } else {
      const s = computeStats(state.items);
      if (k === 'boutique') info = `<div class="bp-sub">${displayItems.length} article${displayItems.length > 1 ? 's' : ''} en rayon · ${served()}/${dailyCap()} clients aujourd’hui${overflow ? ` · ${overflow} en réserve` : ''}</div>`;
      else if (k === 'entrepot') info = `<div class="bp-sub">${stockItems.length} article${stockItems.length > 1 ? 's' : ''} en stock rangé${stockItems.length > 1 ? 's' : ''} ici.</div>`;
      else if (k === 'bureau') info = `<div class="bp-sub">Bénéfice du mois : <b>${eur(s.monthProfit)}</b> · total ${eur(s.totalProfit)}</div>`;
      else if (k === 'studio') info = `<div class="bp-sub">De belles photos attirent plus de clients.</div>`;
      else info = `<div class="bp-sub">${recentSold().length} colis cette semaine.</div>`;
      acts = k === 'entrepot' ? '<button class="btn" data-act="stock">📦 Voir le stock</button>' : k === 'boutique' ? '<button class="btn" data-act="shelf">🛍️ Voir les rayons</button>' : k === 'bureau' ? '<button class="btn" data-act="stats">📊 Mes stats</button>' : k === 'studio' ? '<button class="btn" data-act="photo">📸 Photo (+2 🪙)</button>' : '<button class="btn" data-act="truck">🚚 Envoyer un camion</button>';
      acts += '<button class="btn" data-act="empire">🏢 Gérer</button>';
    }
    el.hidden = false;
    el.innerHTML = `<div class="bp-head"><div class="bp-title">${icon} ${esc(name)}${cnt ? ` <span class="pill">👷 ${cnt}</span>` : ''}</div><button class="btn small" data-act="close" aria-label="Fermer">✕</button></div>${info}<div class="bp-acts">${acts}</div>`;
  }
  let photoCd = 0;
  function panelAction(a, id) {
    if (a === 'close') select(null);
    else if (a === 'buy') { gameAction('buy', { dataset: { id } }); setTimeout(renderPanel, 80); }
    else if (a === 'empire') openSheet('empire');
    else if (a === 'stock') { state.filter = 'stock'; openSheet('items'); }
    else if (a === 'shelf') { state.filter = 'en_vente'; openSheet('items'); }
    else if (a === 'stats') openSheet('home');
    else if (a === 'photo') { if (photoCd > 0) return toast(`L’appareil recharge… ${Math.ceil(photoCd)} s`); photoCd = 20; studioFlash(true); earn(2, L.studio.x, L.studio.z, true); toast('📸 Belle photo ! +2 🪙'); }
    else if (a === 'truck') { if (hub.truck) return toast('Un camion est déjà en route 🚚'); dispatchTruck('manuel'); toast('🚚 Un camion arrive au centre d’expédition'); }
  }

  /* ---------- sélection au toucher ---------- */
  function onTap(cx, cy) {
    const ndc = new T.Vector2((cx / stage.w) * 2 - 1, -(cy / stage.h) * 2 + 1); raycaster.setFromCamera(ndc, camera);
    const meshes = []; pickables.forEach((p) => { let v = true, o = p; while (o) { if (o.visible === false) { v = false; break; } o = o.parent; } if (v) meshes.push(p); });
    actors.forEach((a) => { if (a.def && a.g.visible && !(a.inside && !insideVisible(a))) meshes.push(a.g); }); vehicles.forEach((v) => { if (v.branded) meshes.push(v.g); });
    const hits = raycaster.intersectObjects(meshes, true);
    for (const h of hits) {
      let o = h.object, pk = null; while (o && !pk) { pk = o.userData && o.userData.pick; o = o.parent; }
      if (!pk) continue;
      if (pk.type === 'item' || pk.type === 'parcel') { openItemCard(pk.id); return; }
      if (pk.type === 'staff') { const d = STAFF_DEF[pk.id]; toast(`👷 ${d[0]}, ${d[1]} : « ${d[2]} »`); return; }
      if (pk.type === 'truck') { toast('🚚 Un camion MaxShop livre tes colis'); return; }
    }
    // sol : bâtiment ou terrain touché ?
    const gp = new T.Vector3(); raycaster.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), 0), gp);
    if (gp) for (const k of KEYS) { const c = city[k]; if (!c || !c.hitRect) continue; const r = c.hitRect; if (Math.abs(gp.x - r.x) < r.w / 2 + 1 && Math.abs(gp.z - r.z) < r.d / 2 + 1) { select(k); return; } }
    select(null);
  }

  /* ---------- ventes réelles : le camion part ---------- */
  function checkSales() {
    const sold = state.items.filter((i) => i.status === 'vendu');
    const g = (state.game = { owned: [], claimed: {}, ...state.game });
    if (g.seenSold === undefined || sold.length < g.seenSold) { g.seenSold = sold.length; gameSaveSoon(); return; }
    if (sold.length > g.seenSold) {
      const n = sold.length - g.seenSold, recent = [...sold].sort((a, b) => (b.soldAt || '').localeCompare(a.soldAt || '')).slice(0, n);
      const coins = recent.reduce((s, i) => s + 5 + Math.max(0, Math.round(profitOf(i))), 0);
      g.seenSold = sold.length; gameSaveSoon();
      for (let i = 0; i < Math.min(n, 2); i++) dispatchTruck('vente');
      const p = new T.Vector3(L.boutique.x, 6, L.boutique.z); floatText(p, `🎉 +${coins} 🪙`); flyCoins(p, coins); toast(`${n} vente${n > 1 ? 's' : ''} ! Un camion part avec le colis : +${coins} 🪙`); updateHud();
    }
  }

  /* ---------- synchronisation avec l'état de l'appli ---------- */
  function sync() {
    if (!mounted) return;
    state.game = state.game || {};
    const sig = JSON.stringify([state.items.map((i) => [i.id, i.status, i.category, i.title, i.listPrice, i.buyPrice, i.soldAt, i.soldPrice]), owned(), state.game.name]);
    checkSales();
    if (sig === lastSig) return; lastSig = sig;
    displayItems = state.items.filter((i) => i.status === 'en_vente'); stockItems = state.items.filter((i) => i.status === 'stock');
    KEYS.forEach((k) => { if (own(k)) buildBuilding(k); else ensureLot(k); });
    if (city.boutique.obj) city.boutique.obj.setName(shopName());
    placeItems(); drawChart();
    STAFF.forEach((s) => { if (hired(s.id)) hireStaff(s.id); });
    if (own('expedition') && city.expedition.obj && !crew.length) {
      const a = city.expedition.obj.anchors;
      for (let i = 0; i < 2; i++) { const w = B.worker({ vest: 0xff9f1c, hat: 0xffd166, shirt: [0x1d3557, 0x2a9d8f][i] }); const home = { x: a.crew.x + i * 2.2, z: a.crew.z }; w.position.set(home.x, 0, home.z); const c = addActor(w, [anim('idle', 99, 0)], { loop: false, kind: 'crew' }); c.home = home; crew.push(c); }
    }
    if (own('entrepot') && city.entrepot.obj && !forklift) {
      const e = L.entrepot, ys = e.z + e.d / 2 + 5.6;
      forklift = addVehicle(B.forklift(), [{ x: e.x - 12, z: ys }, { x: e.x + 12, z: ys }, { x: e.x + 12, z: ys + 1.6 }, { x: e.x - 12, z: ys + 1.6 }], { speed: 2.6, wr: 0.32, kind: 'fork' }); forklift.loop = true;
      const dr = B.worker({ vest: 0xff9f1c, hat: 0xffd166, scale: 0.8 }); dr.position.set(0.1, 1.1, 0); dr.userData.legL.rotation.x = dr.userData.legR.rotation.x = -1.3; forklift.g.add(dr);
    }
    if (selected) renderPanel();
  }

  /* ---------- boucle principale ---------- */
  function update(dt) {
    clock += dt; frameCount++;
    if (photoCd > 0) photoCd -= dt;
    // heure réelle → soleil, ciel, nuit
    timeAcc += dt; const target = new T.Vector3(rig.tx, 0, rig.tz);
    if (timeAcc > 0.5) { timeAcc = 0; const d = new Date(), h = hourOverride !== null ? hourOverride : d.getHours() + d.getMinutes() / 60; stage.shadowSpan = clamp(rig.dist * 0.75, 28, 90); stage.applyTime(h, target); glows.forEach((gl) => { gl.visible = stage.night > 0.25; gl.material.opacity = 0.9 * stage.night; }); }
    else { stage.sun.position.copy(target).addScaledVector(stage.tod.dir, 160); stage.sun.target.position.copy(target); }
    rig.keyUpdate(dt); rig.update(dt);
    // trafic civil
    ['ave', 'south'].forEach((s) => { const t = spawnT[s]; t[0] -= dt; if (t[0] <= 0) { t[0] = rand(t[1] * 0.7, t[1] * 1.6); const east = Math.random() < 0.5; if (vehicles.filter((v) => v.lane === s + (east ? 'E' : 'W')).length < 4) civilian(s, east); } });
    // clients
    spawnT.cust -= dt;
    if (spawnT.cust <= 0) { spawnT.cust = Math.max(5, 14 / rate()) * rand(0.7, 1.3); if (displayItems.length && customers.filter((c) => c.state !== 'leaving').length < maxCustomers() && served() + customers.length < dailyCap()) spawnCustomer(); }
    hubTick(dt);
    // véhicules
    vehicles.forEach((v) => {
      stepVehicle(v, dt);
      if (v.loop && !v.path.length) { v.path = [{ x: L.entrepot.x - 12, z: L.entrepot.z + L.entrepot.d / 2 + 5.6 }, { x: L.entrepot.x + 12, z: L.entrepot.z + L.entrepot.d / 2 + 5.6 }, { x: L.entrepot.x + 12, z: L.entrepot.z + L.entrepot.d / 2 + 7.2 }, { x: L.entrepot.x - 12, z: L.entrepot.z + L.entrepot.d / 2 + 7.2 }]; }
      v.hl.forEach((s) => { const on = stage.night > 0.3; s.visible = on; s.material.opacity = on ? 0.55 * stage.night : 0; });
      if (v.branded && v.speed > 2 && frameCount % 14 === 0) { const p = new T.Vector3(-v.len / 2, 0.9, 0.6).applyMatrix4(v.g.matrixWorld); puff(p.x, p.y, p.z, 0xcfcfcf, 1.2, 1.0, 1.2); }
    });
    vehicles = vehicles.filter((v) => { if (v.done) { scene.remove(v.g); G.disposeTree(v.g); if (v.onDone) v.onDone(v); return false; } return true; });
    // acteurs
    actors.forEach((a) => { runActor(a, dt); const vis = !a.hidden && insideVisible(a); if (a.g.visible !== vis && !(a.hidden)) a.g.visible = vis; });
    actors = actors.filter((a) => { if (a.done && a.kind === 'customer') { scene.remove(a.g); G.disposeTree(a.g); return false; } return true; });
    // piétons
    if (frameCount === 2 || !actors.some((a) => a.kind === 'ped')) { if (!city._peds) { city._peds = true; seedPedestrians(); } }
    // bâtiments : transparence, grue, ventilateurs
    KEYS.forEach((k) => {
      const c = city[k]; if (!c) return;
      if (c.lot) { c.lot.jib.rotation.y += dt * 0.12; }
      if (!c.obj) return;
      if (c.appear !== undefined && c.appear < 1) { c.appear = Math.min(1, c.appear + dt * 0.9); c.obj.root.scale.y = Math.max(0.02, 1 - Math.pow(1 - c.appear, 3)); }
      const d = c.fadeGoal - c.fade; if (Math.abs(d) > 0.002) { c.fade += d * Math.min(1, dt * 6); c.obj.fade.apply(c.fade); if (c.obj.interior && !c.alwaysVisible) c.obj.interior.visible = c.fade > 0.04; }
      (c.obj.spin || []).forEach((s) => { s.rotation.y += dt * 4; });
    });
    if (city.studio.obj) { city.studio.obj.turn.rotation.y += dt * 0.8; if (flash > 0) { flash = Math.max(0, flash - dt * 4); if (studioLight) studioLight.intensity = flash * 6; } }
    // particules
    puffs.forEach((p) => { p.life -= dt; p.s.position.y += p.rise * dt; p.s.position.x += p.vx * dt; p.s.position.z += p.vz * dt; const k = 1 - p.life / p.max; p.s.material.opacity = 0.5 * (1 - k); p.s.scale.setScalar(p.size * (1 + k * 1.4)); });
    puffs = puffs.filter((p) => { if (p.life <= 0) { scene.remove(p.s); p.s.material.dispose(); return false; } return true; });
    // fumée de toit
    if (stage.quality >= 1 && frameCount % 24 === 0) { const e = city.entrepot; if (e && e.obj) puff(L.entrepot.x + 9, 9.4, L.entrepot.z + 4.5, 0xeeeeee, 1.6, 2.4, 1.6); const x = city.expedition; if (x && x.obj) puff(L.expedition.x - 10, 7.4, L.expedition.z + 5, 0xeeeeee, 1.4, 2.2, 1.4); }
    // bulles de pièces projetées à l'écran
    bubbles.forEach((b) => { b.life -= dt; const s = project(b.pos); b.e.style.transform = `translate(${s.x}px, ${s.y - 6 * Math.sin(clock * 3)}px) translate(-50%,-100%)`; b.e.style.display = s.behind || s.x < -40 || s.y < -40 || s.x > stage.w + 40 || s.y > stage.h + 40 ? 'none' : ''; });
    bubbles = bubbles.filter((b) => { if (b.taken) return false; if (b.life <= 0) { b.e.remove(); return false; } return true; });
    // lieu courant + adaptation de la qualité
    stage.adapt(dt);
  }
  function seedPedestrians() {
    [[-5.4, -40, 40, 1.3], [5.4, 30, -45, 1.5], [5.4, -10, 25, 1.2], [34, -30, 20, 1.4], [-5.4, 15, -25, 1.3]].forEach(([z, a, b, sp]) => {
      const w = B.worker({ scale: Math.random() < 0.15 ? 0.78 : 1 }); w.position.set(a, 0, z); addActor(w, [go(b, z, sp), go(a, z, sp)], { kind: 'ped' });
    });
  }
  function loop(ts) {
    if (!running) return;
    const dt = Math.min(0.05, (ts - lastT) / 1000 || 0); lastT = ts;
    if (!document.hidden) { update(dt); renderer.render(scene, camera); }
    requestAnimationFrame(loop);
  }

  /* ---------- montage ---------- */
  function mount(container) {
    try {
      els = { world: container, panel: document.getElementById('bpanel'), bub: document.getElementById('bubbles'), fx: document.getElementById('fx'), coinTarget: document.getElementById('h-coins') };
      stage = G.createStage(container); scene = stage.scene; camera = stage.camera; renderer = stage.renderer;
      rig = G.createRig(camera, renderer.domElement, { onTap });
      const ground = new T.Mesh(new T.PlaneGeometry(900, 900), M(0xffffff, 1, 0, { map: G.tex('grass', [180, 180]) })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.position.set(0, -0.02, 20); scene.add(ground);
      const st = B.street(); scene.add(st.group); st.poles.forEach((p) => { const gl = G.glowSprite(0xffe9a8, 6, 0.9); gl.position.set(p.x, 7.1, p.z); gl.visible = false; scene.add(gl); glows.push(gl); });
      KEYS.forEach((k) => { city[k] = { fade: 0, fadeGoal: 0 }; });
      city.boutique.obj = null; buildBuilding('boutique'); KEYS.forEach((k) => { if (k !== 'boutique') ensureLot(k); });
      stage.resize(); window.addEventListener('resize', stage.resize);
      rig.focus(0, 6, 108, true);
      els.panel.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b) panelAction(b.dataset.act, b.dataset.id); });
      window.addEventListener('keydown', (e) => {
        if (document.querySelector('dialog[open]') || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || '')) return;
        const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', z: 'up', s: 'down', a: 'left', q: 'left', d: 'right', e: 'rotR', r: 'rotL', '+': 'zin', '=': 'zin', '-': 'zout' }, k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (map[k]) { rig.keys[map[k]] = true; e.preventDefault(); } else if (k === 'Escape') select(null);
      });
      window.addEventListener('keyup', (e) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', z: 'up', s: 'down', a: 'left', q: 'left', d: 'right', e: 'rotR', r: 'rotL', '+': 'zin', '=': 'zin', '-': 'zout' }; if (map[k]) rig.keys[map[k]] = false; });
      mounted = true; sync(); initialDone = true; stage.applyTime(new Date().getHours() + new Date().getMinutes() / 60, new T.Vector3(rig.tx, 0, rig.tz));
      running = true; lastT = performance.now(); requestAnimationFrame(loop);
      return true;
    } catch (e) { console.error(e); mounted = false; running = false; return false; }
  }

  return {
    available: true, mount, sync,
    info: () => ({ served: served(), cap: dailyCap(), overflow, level: level(), queue: 0, display: displayItems.length, stock: stockItems.length, place: lastPlace || 'Vue aérienne', staff: Object.keys(staffOf).length, buildings: 1 + buildingCount() }),
    travel: (key) => { if (!mounted) return; if (key === 'boutique' || city[key]) select(key); },
    recenter: () => { select(null); rig.focus(0, 12, 82); rig.g.yaw = 0; },
    rotate: (d) => { rig.g.yaw += d; },
    zoom: (f) => { rig.g.dist = clamp(rig.g.dist * f, rig.minD, rig.maxD); },
    _select: (k) => select(k), _setTime: (h) => { hourOverride = h; timeAcc = 9; }, _perf: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, quality: stage.quality }),
    _screenOf: (k) => { const l = L[k]; const s = project(new T.Vector3(l.x, 2, l.z)); return { x: s.x, y: s.y }; },
    _debug: () => ({ selected, vehicles: vehicles.length, branded: vehicles.filter((v) => v.branded).map((v) => ({ kind: v.kind, x: +v.g.position.x.toFixed(1), z: +v.g.position.z.toFixed(1), speed: +v.speed.toFixed(1) })), actors: actors.map((a) => ({ id: a.id || a.kind, x: +a.g.position.x.toFixed(1), z: +a.g.position.z.toFixed(1), vis: a.g.visible })), customers: customers.map((c) => c.state), bubbles: bubbles.length, built: Object.fromEntries(KEYS.map((k) => [k, !!(city[k] && city[k].obj)])), lots: Object.fromEntries(KEYS.map((k) => [k, !!(city[k] && city[k].lot)])), fade: Object.fromEntries(KEYS.map((k) => [k, city[k] ? +(city[k].fade || 0).toFixed(2) : 0])), hub: { state: hub.state, truck: !!hub.truck, pending: hub.pending }, rig: { tx: +rig.tx.toFixed(1), tz: +rig.tz.toFixed(1), dist: +rig.dist.toFixed(1) }, items: pickables.length }),
    _spawnTruck: () => dispatchTruck('test'), _spawnCustomer: () => spawnCustomer(), _takeAll: () => bubbles.slice().forEach(takeBubble),
  };
})();
