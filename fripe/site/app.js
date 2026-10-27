(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const eur = (n, d = 0) => (Number(n) || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: d, maximumFractionDigits: d });
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => iso(new Date());
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
const fdate = (s) => s ? new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- données ---------------- */
const CATS = ['Vêtements', 'Chaussures', 'Sacs', 'Accessoires', 'Jeux & jouets', 'Maison'];
const CARRIERS = ['Mondial Relay', 'Colissimo', 'Vinted Go', 'Chronopost', 'Autre'];
const STEPS = [['todo', 'Étiquette'], ['dropped', 'Déposé'], ['transit', 'En livraison'], ['delivered', 'Livré'], ['done', 'Payé']];
const ITEM_ST = { stock: 'En stock', online: 'En ligne', sold: 'Vendu' };
const TRACK_URL = { 'Mondial Relay': 'https://www.mondialrelay.fr/suivi-de-colis/?numeroExpedition=', 'Colissimo': 'https://www.laposte.fr/outils/suivre-vos-envois?code=', 'Chronopost': 'https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=' };

function seedData() {
  let r = 7; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const T = today();
  const names = ['Camille', 'Lucas', 'Inès', 'Hugo', 'Léa', 'Maxime', 'Chloé', 'Nathan', 'Sarah', 'Thomas', 'Manon', 'Julien', 'Zoé', 'Antoine', 'Emma', 'Paul'];
  const pool = [
    ['Veste Carhartt Detroit', 'Carhartt', 0, 'L', 24, 62], ['Sweat Nike Tech', 'Nike', 0, 'M', 14, 38], ['Jean Levi’s 501', 'Levi’s', 0, '32', 11, 34], ['Polo Ralph Lauren', 'Ralph Lauren', 0, 'M', 9, 29],
    ['Air Force 1 blanches', 'Nike', 1, '42', 28, 71], ['Samba OG', 'Adidas', 1, '41', 46, 98], ['New Balance 550', 'New Balance', 1, '43', 39, 85], ['Doc Martens 1460', 'Dr. Martens', 1, '40', 33, 78],
    ['Sac Longchamp Pliage', 'Longchamp', 2, 'M', 22, 58], ['Sac Eastpak vintage', 'Eastpak', 2, 'U', 6, 22], ['Ceinture Gucci', 'Gucci', 3, '90', 60, 140], ['Casquette Stüssy', 'Stüssy', 3, 'U', 12, 36],
    ['Gameboy Color', 'Nintendo', 4, '', 34, 82], ['Lot Pokémon cartes', 'Pokémon', 4, '', 18, 55], ['Manette PS4', 'Sony', 4, '', 15, 32], ['Lampe Tolomeo', 'Artemide', 5, '', 21, 64],
    ['Doudoune The North Face', 'The North Face', 0, 'M', 48, 119], ['Chemise Lacoste', 'Lacoste', 0, 'L', 8, 27], ['Trench Burberry', 'Burberry', 0, 'S', 70, 160], ['Bonnet Patagonia', 'Patagonia', 3, 'U', 7, 26],
    ['Pull Zara maille', 'Zara', 0, 'M', 5, 18], ['Veste en jean Wrangler', 'Wrangler', 0, 'L', 13, 41], ['Pantalon Dickies 874', 'Dickies', 0, '34', 12, 38], ['Stan Smith', 'Adidas', 1, '39', 19, 49],
    ['Mug Moomin Arabia', 'Arabia', 5, '', 9, 30], ['Tote bag Maison Kitsuné', 'Kitsuné', 2, 'U', 18, 52], ['Blouson Schott', 'Schott', 0, 'M', 55, 130], ['Pull Ralph Lauren', 'Ralph Lauren', 0, 'L', 16, 48],
  ];
  const items = [], orders = [], threads = [];
  pool.forEach((p, i) => {
    const [title, brand, c, size, buy, list] = p;
    const it = { id: 'i' + i, title, brand, cat: CATS[c], size, buy, list, status: 'stock', buyDate: '', listDate: '', soldDate: '', sold: 0, demo: 1 };
    if (i < 15) { // vendus sur 6 mois
      const soldAgo = Math.round(4 + (i / 15) * 170 + rnd() * 6);
      it.status = 'sold'; it.soldDate = addDays(T, -soldAgo); it.listDate = addDays(it.soldDate, -Math.round(3 + rnd() * 26)); it.buyDate = addDays(it.listDate, -Math.round(1 + rnd() * 6));
      it.sold = Math.round(list * (0.84 + rnd() * 0.16));
      const st = soldAgo < 2 ? 'todo' : soldAgo < 4 ? 'transit' : soldAgo < 6 ? 'delivered' : 'done';
      orders.push({ id: 'o' + i, kind: 'sale', itemId: it.id, party: names[i % names.length], price: it.sold, fee: i % 3 === 0 ? 3.5 : 0, status: st, carrier: CARRIERS[i % 3], tracking: st === 'todo' ? '' : 'FR' + (48200000 + i * 3719), date: it.soldDate });
    } else if (i < 22) { it.status = 'online'; it.listDate = addDays(T, -Math.round(2 + rnd() * 46)); it.buyDate = addDays(it.listDate, -3); }
    else { it.status = 'stock'; it.buyDate = addDays(T, -Math.round(1 + rnd() * 9)); }
    items.push(it);
  });
  // quelques ventes récentes à expédier / en transit
  const rec = [[15, 0, 'todo', 0], [16, 1, 'todo', 1], [17, 2, 'dropped', 2], [18, 3, 'transit', 3]];
  rec.forEach(([ix, d, st, k]) => { const it = items[ix]; it.status = 'sold'; it.soldDate = addDays(T, -d); it.sold = Math.round(it.list * 0.92);
    orders.push({ id: 'or' + ix, kind: 'sale', itemId: it.id, party: names[(ix + 5) % names.length], price: it.sold, fee: 0, status: st, carrier: CARRIERS[k % 3], tracking: st === 'todo' ? '' : 'FR' + (91003000 + ix * 541), date: it.soldDate }); });
  orders.push({ id: 'op1', kind: 'purchase', itemId: '', title: 'Veste Barbour', party: 'vintage_marie', price: 38, fee: 0, status: 'transit', carrier: 'Colissimo', tracking: '6A19284710431', date: addDays(T, -2) });
  orders.push({ id: 'op2', kind: 'purchase', itemId: '', title: 'Lot 6 jeux Switch', party: 'retro_jeux_75', price: 74, fee: 0, status: 'dropped', carrier: 'Mondial Relay', tracking: 'MR55102938', date: addDays(T, -1) });
  const mk = (id, party, title, un, arr) => ({ id, party, itemTitle: title, unread: un, msgs: arr.map(([me, text, ago]) => ({ me, text, t: Date.now() - ago * 36e5 })) });
  threads.push(mk('t1', names[10], items[15].title, 1, [[0, 'Bonjour, il est toujours disponible ? Vous faites quoi comme dernier prix ?', 5], [1, 'Bonjour ! Oui, je peux vous le faire à ' + (items[15].sold) + ' €.', 4], [0, 'Parfait, je valide l’achat dans la soirée.', 2]]));
  threads.push(mk('t2', names[11], items[16].title, 1, [[0, 'Salut, l’envoi se fait quand ?', 3]]));
  threads.push(mk('t3', names[3], items[17].title, 0, [[1, 'Merci pour votre achat ! Le colis part demain avec suivi.', 28], [0, 'Super, merci à vous.', 26]]));
  threads.push(mk('t4', 'retro_jeux_75', 'Lot 6 jeux Switch', 0, [[0, 'Bonjour, votre colis est déposé en point relais.', 20], [1, 'Merci, je surveille le suivi.', 19]]));
  threads.push(mk('t5', names[7], items[13].title, 0, [[1, 'Merci pour votre commande. N’hésitez pas à laisser un avis, ça aide beaucoup !', 90], [0, 'Avis laissé, merci !', 80]]));
  return { items, orders, threads, profile: { name: '' }, demo: true, v: 1 };
}

let S = null, uidKey = 'local', docRef = null, saveT = null;
const LS = 'fripe-state-v1', ACC = window.FripeAccount || null; // ACC : comptes en ligne (site), absent dans la version Claude
const empty = () => ({ items: [], orders: [], threads: [], profile: { name: '' }, demo: false, v: 1 });
async function boot() {
  let loaded = null;
  try { const raw = localStorage.getItem(LS); if (raw) loaded = JSON.parse(raw); } catch (e) {}
  if (ACC) {
    /* site en ligne : les données vivent sur le compte ; sans compte, des exemples servent juste aux maquettes de l'accueil */
    const r = await ACC.boot();
    if (!r.user) { S = seedData(); $('#me-line').textContent = ''; return; }
    const local = r.localOk && loaded && loaded.items ? loaded : null;
    S = r.data && r.data.items ? r.data : (r.offline ? local : local && !local.demo ? local : null) || seedData();
    if (!r.data && !r.offline) save(true);
    $('#me-line').textContent = r.user.email || '';
    const nb = $('.nav-r .btn.primary'); if (nb) nb.textContent = 'Mon espace';
    return;
  }
  if (window.claude && claude.use) {
    try {
      const got = await Promise.race([Promise.all([claude.use('db'), claude.use('user')]), new Promise((r) => setTimeout(() => r(null), 5000))]);
      if (got && got[0] && got[1]) {
        const id = await got[1].id(); uidKey = id;
        docRef = got[0].collection('data/users/' + id).doc('fripe');
        const snap = await docRef.get();
        if (snap.exists && snap.data() && snap.data().json) loaded = JSON.parse(snap.data().json);
        else if (loaded) save(true);
      }
    } catch (e) { docRef = null; }
  }
  S = loaded && loaded.items ? loaded : seedData();
  if (!loaded) save(true);
  $('#me-line').textContent = docRef ? 'Données privées, liées à ton compte.' : 'Données gardées sur cet appareil.';
}
function save(now, quiet) {
  if (!quiet && S) S.at = Date.now();
  if (!quiet && window.FripeSync) window.FripeSync.changed();
  if (!quiet && ACC) ACC.save();
  const run = async () => {
    const json = JSON.stringify(S);
    try { localStorage.setItem(LS, json); } catch (e) {}
    if (docRef) { try { await docRef.set({ json, at: Date.now() }); } catch (e) { toast('Sauvegarde en ligne impossible, copie locale conservée.'); } }
  };
  clearTimeout(saveT); if (now) run(); else saveT = setTimeout(run, 500);
}
window.addEventListener('pagehide', () => { if (ACC && !ACC.user) return; try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {} });

/* ---------------- calculs ---------------- */
const itemOf = (id) => S.items.find((i) => i.id === id);
const saleProfit = (o) => { const it = itemOf(o.itemId); return o.price - (it ? it.buy : 0) - (o.fee || 0); };
const sales = () => S.orders.filter((o) => o.kind === 'sale');
function periodStats(days) {
  const T = today(), a = addDays(T, -days + 1), pa = addDays(T, -2 * days + 1), pb = addDays(T, -days);
  const cur = sales().filter((o) => o.date >= a), prev = sales().filter((o) => o.date >= pa && o.date <= pb);
  const sum = (arr, f) => arr.reduce((s, o) => s + f(o), 0);
  const ca = sum(cur, (o) => o.price), pr = sum(cur, saleProfit), caP = sum(prev, (o) => o.price), prP = sum(prev, saleProfit);
  const durs = cur.map((o) => { const it = itemOf(o.itemId); const st = it && (it.listDate || it.buyDate); return st ? daysBetween(st, o.date) : null; }).filter((n) => n !== null && n >= 0);
  return { cur, ca, pr, caP, prP, n: cur.length, margin: ca ? pr / ca * 100 : 0, basket: cur.length ? ca / cur.length : 0, avg: durs.length ? durs.reduce((x, y) => x + y, 0) / durs.length : null };
}
function monthly(n) {
  const out = [], d = new Date();
  for (let k = n - 1; k >= 0; k--) {
    const m = new Date(d.getFullYear(), d.getMonth() - k, 1), key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
    const arr = sales().filter((o) => o.date.slice(0, 7) === key);
    out.push({ label: m.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''), ca: arr.reduce((s, o) => s + o.price, 0), pr: arr.reduce((s, o) => s + saleProfit(o), 0) });
  }
  return out;
}
const delta = (a, b) => (b > 0 ? ((a - b) / b * 100) : null);
const dl = (v) => v === null ? '<span class="d">nouvelle période</span>' : `<span class="${v >= 0 ? 'up' : 'down'}">${v >= 0 ? '▲' : '▼'} ${Math.abs(v).toFixed(0)} %</span> <span class="d">vs période précédente</span>`;
const toShip = () => sales().filter((o) => o.status === 'todo');
const unreadN = () => S.threads.filter((t) => t.unread).length;
const stale = () => S.items.filter((i) => i.status === 'online' && i.listDate && daysBetween(i.listDate, today()) >= 30);

/* ---------------- graphiques ---------------- */
function chartSVG(data) {
  const W = 640, H = 230, L = 40, R = 12, T = 14, B = 28, iw = W - L - R, ih = H - T - B;
  const max = Math.max(50, ...data.map((d) => d.ca)), top = Math.ceil(max / 100) * 100 || 100;
  const y = (v) => T + ih - (Math.max(0, v) / top) * ih, bw = iw / data.length;
  let g = '';
  for (let k = 0; k <= 4; k++) { const v = top / 4 * k; g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${Math.round(v)}</text>`; }
  let bars = '', pts = [];
  data.forEach((d, i) => {
    const x = L + i * bw + bw * 0.2, w = bw * 0.6, last = i === data.length - 1;
    bars += `<rect x="${x}" y="${y(d.ca)}" width="${w}" height="${Math.max(0, T + ih - y(d.ca))}" rx="5" fill="url(#cg)" opacity="${last ? 1 : .8}" ${last ? 'filter="url(#cglow)"' : ''}/><text x="${x + w / 2}" y="${H - 8}" text-anchor="middle">${esc(d.label)}</text>`;
    pts.push([x + w / 2, y(d.pr)]);
  });
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const lp = pts[pts.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Chiffre d'affaires et bénéfice par mois">${g}${bars}<path d="${path}" fill="none" stroke="var(--cyan)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" filter="url(#cglow)"/>${pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.2" fill="var(--bg)" stroke="var(--cyan)" stroke-width="2"/>`).join('')}<circle cx="${lp[0]}" cy="${lp[1]}" r="7" fill="var(--cyan)" opacity=".3"/></svg><div class="legend"><span><i style="background:var(--accent2)"></i>Chiffre d'affaires (€)</span><span><i style="background:var(--cyan)"></i>Bénéfice net</span></div>`;
}

/* ---------------- icônes ---------------- */
const svgI = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC = {
  tableau: svgI('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
  stock: svgI('<path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8"/>'),
  commandes: svgI('<path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7a3 3 0 016 0"/>'),
  livraisons: svgI('<path d="M2 6h12v10H2zM14 10h4l4 3v3h-8"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>'),
  messages: svgI('<path d="M21 12a8 8 0 01-11.6 7.1L3 21l1.9-5.4A8 8 0 1121 12z"/>'),
  reglages: svgI('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>'),
  plus: svgI('<path d="M12 5v14M5 12h14"/>'),
  chev: svgI('<path d="M9 6l6 6-6 6"/>'),
  home: svgI('<path d="M15 6l-6 6 6 6"/>'),
  moon: svgI('<path d="M21 13A9 9 0 1111 3a7 7 0 0010 10z"/>'),
};
const VIEWS = [['tableau', 'Accueil'], ['stock', 'Articles'], ['commandes', 'Ventes'], ['livraisons', 'Colis'], ['messages', 'Messages'], ['reglages', 'Réglages']];
const TITLE = Object.fromEntries(VIEWS);
const LOGO = '<svg class="lg" viewBox="0 0 48 48" aria-hidden="true"><path class="lg-b" d="M14 2h20l12 12v20L34 46H14L2 34V14z"/><path class="lg-f" d="M14.5 11.5h21l-3.6 5.8H22.2v4.6h10.4l-3.2 5.5h-7.2v9.1h-7.2z"/></svg>';

/* ---------------- vues ---------------- */
let view = 'tableau', period = 30, stockQ = '', stockF = 'all', stockSort = 'recent', ordTab = 'sale', ordStage = 'todo', curThread = null, mobChat = false;
const STAGES = [['todo', 'À envoyer', ['todo']], ['route', 'En route', ['dropped', 'transit']], ['delivered', 'Livrées', ['delivered']], ['done', 'Payées', ['done']]];
const plural = (n, a, b) => `${n} ${n > 1 ? (b || a + 's') : a}`;
function badges() { return { commandes: toShip().length, messages: unreadN() }; }
function shell() {
  const app = $('#app'); if (!app || $('.appbar', app)) return;
  app.insertAdjacentHTML('afterbegin', `<header class="appbar"><a class="logo" href="#tableau" aria-label="Accueil">${LOGO}</a><b id="appbar-title">Accueil</b><div class="row"><button class="btn ghost icon" type="button" data-act="theme" aria-label="Changer le thème">${IC.moon}</button><a class="btn ghost icon" href="#reglages" aria-label="Réglages">${IC.reglages}</a></div></header>`);
  $('.side nav', app).insertAdjacentHTML('beforebegin', `<button class="btn primary add" type="button" data-act="add-item">${IC.plus} Ajouter un article</button>`);
  app.insertAdjacentHTML('beforeend', `<button class="fab" type="button" data-act="add-item" aria-label="Ajouter un article">${IC.plus}</button>`);
}
function renderNav() {
  shell();
  const b = badges();
  const link = (v, t) => `<a href="#${v}" ${v === view ? 'aria-current="page"' : ''}>${IC[v]}<span>${t}</span>${b[v] ? `<span class="badge">${b[v]}</span>` : ''}</a>`;
  $('#sidenav').innerHTML = VIEWS.map(([v, t]) => link(v, t)).join('');
  $('#tabbar').innerHTML = VIEWS.filter(([v]) => v !== 'reglages').map(([v, t]) => link(v, t)).join('');
  const at = $('#appbar-title'); if (at) at.textContent = TITLE[view];
  const fab = $('.fab'); if (fab) fab.hidden = !['tableau', 'stock'].includes(view);
}
function demoBar() { return S.demo ? `<div class="demo"><span><b>Mode découverte.</b> Ces articles et ventes sont des exemples pour tester. Vide-les dès que tu veux saisir les tiens.</span><button class="btn sm" data-act="clear-demo" type="button">Repartir de zéro</button></div>` : ''; }
function head(title, sub, right) { return `<div class="top"><div><h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div><div class="row">${right || ''}</div></div>`; }
const avatar = (s) => `<span class="av" aria-hidden="true">${esc(String(s || '?').trim().charAt(0).toUpperCase())}</span>`;

function vTableau() {
  const p = periodStats(period);
  const cats = {}; p.cur.forEach((o) => { const it = itemOf(o.itemId); const c = it ? it.cat : 'Autre'; cats[c] = (cats[c] || 0) + saleProfit(o); });
  const cl = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 5), cmax = Math.max(1, ...cl.map((c) => c[1]));
  const stockVal = S.items.filter((i) => i.status !== 'sold').reduce((s, i) => s + i.buy, 0), stockN = S.items.filter((i) => i.status !== 'sold').length;
  const ship = toShip().length, st = stale().length, un = unreadN(), tr = S.orders.filter((o) => o.status === 'dropped' || o.status === 'transit').length, pay = S.orders.filter((o) => o.kind === 'sale' && o.status === 'delivered').length;
  const now = new Date(), h = now.getHours(), hi = h < 5 || h >= 18 ? 'Bonsoir' : 'Bonjour';
  const name = S.profile.name ? ' ' + esc(S.profile.name) : '';
  const date = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const tasks = [
    ship && `<a href="#commandes" data-stage="todo"><span class="ic acc">${ship}</span><span class="lb"><span>${ship > 1 ? 'Colis à envoyer' : 'Colis à envoyer'}</span><small>Imprime l’étiquette et dépose ${ship > 1 ? 'les' : 'le'}</small></span><span class="go">${IC.chev}</span></a>`,
    un && `<a href="#messages"><span class="ic pink">${un}</span><span class="lb"><span>${un > 1 ? 'Messages sans réponse' : 'Message sans réponse'}</span><small>Une réponse rapide aide à vendre</small></span><span class="go">${IC.chev}</span></a>`,
    pay && `<a href="#commandes" data-stage="delivered"><span class="ic good">${pay}</span><span class="lb"><span>${pay > 1 ? 'Ventes livrées' : 'Vente livrée'}</span><small>Vérifie que le paiement est arrivé</small></span><span class="go">${IC.chev}</span></a>`,
    tr && `<a href="#livraisons"><span class="ic warn">${tr}</span><span class="lb"><span>Colis en route</span><small>Suis leur livraison</small></span><span class="go">${IC.chev}</span></a>`,
    st && `<a href="#stock" data-filter="online"><span class="ic info">${st}</span><span class="lb"><span>${st > 1 ? 'Articles en ligne depuis 30 jours' : 'Article en ligne depuis 30 jours'}</span><small>Baisse le prix ou remets en avant</small></span><span class="go">${IC.chev}</span></a>`,
  ].filter(Boolean);
  const pseg = `<div class="seg" role="group" aria-label="Période">${[[30, '30 j'], [90, '90 j'], [365, '12 mois']].map(([d, t]) => `<button type="button" data-act="period" data-v="${d}" aria-pressed="${d === period}">${t}</button>`).join('')}</div>`;
  return demoBar() + `<div class="hello"><div><h1>${hi}${name}</h1><div class="sub">${date.charAt(0).toUpperCase() + date.slice(1)}</div></div></div>
  <div id="stage-slot"></div>
  <div class="dash">
    <div>${monthChartHTML(false)}</div>
    <div><div class="sec" style="margin-top:0"><h2>À faire</h2><span class="note">${tasks.length ? plural(tasks.length, 'action') : ''}</span></div>
      <div class="todo">${tasks.join('') || `<div class="a done-all">Rien d’urgent. Tout est à jour.</div>`}</div></div>
  </div>
  <div class="sec"><h2>Tes chiffres</h2>${pseg}</div>
  <div class="kpis">
    <div class="kpi"><div class="l">Chiffre d’affaires</div><div class="v" data-count="${p.ca}">${eur(p.ca)}</div>${dl(delta(p.ca, p.caP))}</div>
    <div class="kpi"><div class="l">Bénéfice net</div><div class="v" data-count="${p.pr}">${eur(p.pr)}</div>${dl(delta(p.pr, p.prP))}</div>
    <div class="kpi"><div class="l">Marge moyenne</div><div class="v">${p.margin.toFixed(0)} %</div><div class="d">${plural(p.n, 'vente')} · panier ${eur(p.basket)}</div></div>
    <div class="kpi"><div class="l">Argent dans le stock</div><div class="v" data-count="${stockVal}">${eur(stockVal)}</div><div class="d">${plural(stockN, 'article')} à vendre${p.avg !== null ? ` · vendu en ${p.avg.toFixed(0)} j` : ''}</div></div>
  </div>
  <div class="dash" style="margin-top:16px">
    <div class="card"><h3>Dernières ventes <a class="note" href="#commandes">Tout voir</a></h3>${recentSales()}</div>
    <div class="card"><h3>Ce qui rapporte le plus <small>${period === 365 ? '12 mois' : period + ' jours'}</small></h3>${cl.length ? `<div class="hbar">${cl.map(([c, v]) => `<div class="r"><span>${esc(c)}</span><b class="num">${eur(v)}</b><div class="t"><i style="width:${Math.max(4, v / cmax * 100)}%"></i></div></div>`).join('')}</div>` : '<div class="empty">Pas encore de vente sur cette période.</div>'}</div>
  </div>
  <div class="card" style="margin-top:16px"><h3>Chiffre d’affaires et bénéfice <small>${period === 365 ? '12 derniers mois' : '6 derniers mois'}</small></h3>${chartSVG(monthly(period === 365 ? 12 : 6))}</div>`;
}
function recentSales() {
  const arr = sales().slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  if (!arr.length) return '<div class="empty"><b>Aucune vente pour l’instant</b><span>Quand un article part, touche « Vendu » sur sa fiche.</span></div>';
  return `<div class="list">${arr.map((o) => { const it = itemOf(o.itemId), pf = saleProfit(o); return `<div class="li">${avatar(o.party)}<span class="tt">${esc(it ? it.title : 'Article')}<small>${esc(o.party)} · ${fdate(o.date)}</small></span><span class="r"><b>${eur(o.price)}</b><small class="${pf >= 0 ? 'up' : 'down'}">${pf >= 0 ? '+' : ''}${eur(pf)}</small></span></div>`; }).join('')}</div>`;
}

function vStock() {
  const q = stockQ.toLowerCase();
  const ageOf = (i) => i.status === 'online' && i.listDate ? daysBetween(i.listDate, today()) : (i.status === 'stock' && i.buyDate ? daysBetween(i.buyDate, today()) : null);
  const marginOf = (i) => (i.status === 'sold' ? i.sold : i.list) - i.buy;
  let arr = S.items.filter((i) => (stockF === 'all' || i.status === stockF) && (!q || (i.title + ' ' + i.brand + ' ' + i.cat).toLowerCase().includes(q)));
  if (stockSort === 'margin') arr = arr.slice().sort((a, b) => marginOf(b) - marginOf(a));
  else if (stockSort === 'age') arr = arr.slice().sort((a, b) => (ageOf(b) ?? -1) - (ageOf(a) ?? -1));
  const cnt = (s) => S.items.filter((i) => i.status === s).length;
  const tied = S.items.filter((i) => i.status !== 'sold').reduce((s, i) => s + i.buy, 0);
  const card = (i) => {
    const age = ageOf(i), mg = marginOf(i), sold = i.status === 'sold';
    return `<div class="item"><div class="hd"><span class="tt">${esc(i.title)}<small>${[i.brand, i.size && 'Taille ' + i.size, i.cat].filter(Boolean).map(esc).join(' · ')}</small></span><span class="pill ${i.status}">${ITEM_ST[i.status]}</span></div>
      <div class="nums"><div>Acheté<b>${eur(i.buy)}</b></div><div>${sold ? 'Vendu' : 'Prix'}<b>${eur(sold ? i.sold : i.list)}</b></div><div>${sold ? 'Bénéfice' : 'Marge visée'}<b class="${mg >= 0 ? (sold ? 'up' : '') : 'down'}">${mg >= 0 ? '+' : ''}${eur(mg)}</b></div></div>
      <div class="ft"><span class="age ${i.status === 'online' && age >= 30 ? 'old' : ''}">${sold ? 'Vendu le ' + fdate(i.soldDate) : age !== null ? (i.status === 'online' ? 'En ligne depuis ' : 'En stock depuis ') + plural(age, 'jour') : ''}</span>
        <span class="row">${i.status === 'stock' ? `<button class="btn sm" data-act="list-item" data-id="${i.id}" type="button">Mettre en ligne</button>` : ''}${i.status === 'online' ? `<button class="btn sm primary" data-act="sell-item" data-id="${i.id}" type="button">Vendu</button>` : ''}<button class="btn sm ghost" data-act="edit-item" data-id="${i.id}" type="button">Modifier</button></span></div></div>`;
  };
  return demoBar() + head('Mes articles', `${plural(S.items.length, 'article')} · ${eur(tied)} investis dans le stock${ACC && !ACC.pro ? ` · ${ACC.count(S)} / ${ACC.max} en gratuit` : ''}`, '<button class="btn primary" data-act="add-item" type="button">Ajouter</button>') + `
  <div class="tools"><input class="search" id="stock-q" type="search" placeholder="Chercher un article, une marque…" value="${esc(stockQ)}" aria-label="Chercher">
    <select class="select" id="stock-sort" aria-label="Trier"><option value="recent" ${stockSort === 'recent' ? 'selected' : ''}>Plus récents</option><option value="margin" ${stockSort === 'margin' ? 'selected' : ''}>Meilleure marge</option><option value="age" ${stockSort === 'age' ? 'selected' : ''}>Plus anciens</option></select></div>
  <div class="chips" style="margin-bottom:16px">${[['all', 'Tous', S.items.length], ['stock', 'En stock', cnt('stock')], ['online', 'En ligne', cnt('online')], ['sold', 'Vendus', cnt('sold')]].map(([v, t, n]) => `<button class="chip" type="button" data-act="sfilter" data-v="${v}" aria-pressed="${v === stockF}">${t}<span class="n">${n}</span></button>`).join('')}</div>
  ${arr.length ? `<div class="items">${arr.map(card).join('')}</div>` : `<div class="card empty"><b>${S.items.length ? 'Aucun article ne correspond' : 'Ton stock est vide'}</b><span>${S.items.length ? 'Change le filtre ou la recherche.' : 'Ajoute ta première pièce, ou importe tes données Vinted.'}</span>${S.items.length ? '' : '<button class="btn primary" data-act="add-item" type="button">Ajouter un article</button>'}</div>`}`;
}

function orderRow(o) {
  const it = itemOf(o.itemId), title = o.kind === 'sale' ? (it ? it.title : 'Article') : o.title;
  const idx = STEPS.findIndex((s) => s[0] === o.status), nxt = STEPS[idx + 1];
  const nl = o.kind === 'sale' ? { dropped: 'Colis déposé', transit: 'Pris en charge', delivered: 'Livré', done: 'Paiement reçu' } : { dropped: 'Expédié', transit: 'En route', delivered: 'Reçu', done: 'Terminé' };
  const pf = o.kind === 'sale' ? saleProfit(o) : null;
  return `<div class="ord"><div style="display:flex;gap:12px;align-items:center;min-width:0">${avatar(o.party)}<span class="tt">${esc(title)}<small>${o.kind === 'sale' ? 'Acheteur' : 'Vendeur'} : ${esc(o.party)} · ${fdate(o.date)}</small></span></div>
    <div class="price"><b>${eur(o.price)}</b>${pf !== null ? `<span class="${pf >= 0 ? 'up' : 'down'}">${pf >= 0 ? '+' : ''}${eur(pf)}</span>` : ''}</div>
    <div class="acts"><span class="meta"><span class="steps5" title="${STEPS[idx][1]}">${STEPS.map((s, i) => `<i class="${i <= idx ? 'on' : ''}"></i>`).join('')}</span><span>${esc(o.carrier)}</span><span class="mono">${o.tracking ? esc(o.tracking) : 'sans suivi'}</span></span>
      <span class="row">${nxt ? `<button class="btn sm ${o.status === 'todo' ? 'primary' : ''}" data-act="advance" data-id="${o.id}" type="button">${nl[nxt[0]]}</button>` : '<span class="pill done">Terminé</span>'}<button class="btn sm ghost" data-act="edit-order" data-id="${o.id}" type="button">Détails</button></span></div></div>`;
}
function vCommandes() {
  const arr = S.orders.filter((o) => o.kind === ordTab);
  const stages = STAGES.map(([k, t, sts]) => [k, ordTab === 'purchase' && k === 'todo' ? 'En préparation' : ordTab === 'purchase' && k === 'done' ? 'Terminés' : ordTab === 'purchase' && k === 'delivered' ? 'Reçus' : t, sts, arr.filter((o) => sts.includes(o.status)).length]);
  const cur = stages.find((s) => s[0] === ordStage) || stages[0];
  const list = arr.filter((o) => cur[2].includes(o.status)).sort((a, b) => b.date.localeCompare(a.date));
  const sub = ordTab === 'sale' ? `${plural(toShip().length, 'colis', 'colis')} à envoyer` : `${plural(arr.filter((o) => o.status !== 'done').length, 'achat')} en cours`;
  return demoBar() + head('Ventes et achats', sub, `<div class="seg" role="group" aria-label="Type"><button type="button" data-act="otab" data-v="sale" aria-pressed="${ordTab === 'sale'}">Ventes</button><button type="button" data-act="otab" data-v="purchase" aria-pressed="${ordTab === 'purchase'}">Achats</button></div>${ordTab === 'purchase' ? '<button class="btn primary" data-act="add-purchase" type="button">Ajouter un achat</button>' : ''}`) + `
  <div class="tabs" role="group" aria-label="Étape">${stages.map(([k, t, , n]) => `<button type="button" data-act="ostage" data-v="${k}" aria-pressed="${k === cur[0]}">${t}<span class="n">${n}</span></button>`).join('')}</div>
  ${list.length ? `<div class="orders">${list.map(orderRow).join('')}</div>` : `<div class="card empty"><b>Rien ici</b><span>${ordTab === 'sale' ? 'Les ventes apparaissent quand tu marques un article « Vendu ».' : 'Ajoute un achat pour suivre son colis.'}</span></div>`}`;
}
function vLivraisons() {
  const arr = S.orders.filter((o) => o.status !== 'done' && o.status !== 'todo').sort((a, b) => STEPS.findIndex((s) => s[0] === a.status) - STEPS.findIndex((s) => s[0] === b.status) || b.date.localeCompare(a.date));
  const ship = toShip().length;
  const card = (o) => { const it = itemOf(o.itemId), title = o.kind === 'sale' ? (it ? it.title : 'Article') : o.title, idx = STEPS.findIndex((s) => s[0] === o.status), url = TRACK_URL[o.carrier];
    return `<div class="parcel"><div class="hd"><span class="tt">${esc(title)}<small>${o.kind === 'sale' ? 'Envoyé à' : 'Envoyé par'} ${esc(o.party)} · ${esc(o.carrier)}${o.tracking ? ` · <span class="mono">${esc(o.tracking)}</span>` : ''}</small></span>
      <span class="row"><span class="pill ${o.kind === 'sale' ? 'online' : 'stock'}">${o.kind === 'sale' ? 'Vente' : 'Achat'}</span>${url && o.tracking ? `<a class="btn sm" href="${url}${encodeURIComponent(o.tracking)}" target="_blank" rel="noopener">Suivre</a>` : ''}<button class="btn sm primary" data-act="advance" data-id="${o.id}" type="button">Étape suivante</button></span></div>
      <div class="track">${STEPS.map(([k, t], i) => `<div class="s ${i <= idx ? 'on' : ''} ${i === idx ? 'cur' : ''}">${t}</div>`).join('')}</div></div>`; };
  return demoBar() + head('Colis', `${plural(arr.length, 'colis', 'colis')} en route${ship ? ` · ${ship} à déposer` : ''}`, ship ? `<a class="btn" href="#commandes">Voir les ${ship} à envoyer</a>` : '') + `<div class="parcels">${arr.map(card).join('') || '<div class="card empty"><b>Aucun colis en route</b><span>Dès qu’un colis est déposé, son suivi apparaît ici.</span></div>'}</div>`;
}

const first = (n) => String(n).split(/[\s_.]/)[0];
function templates(t) {
  const o = S.orders.find((x) => x.party === t.party), tr = o && o.tracking ? o.tracking : '[numéro de suivi]', me = S.profile.name ? S.profile.name : '';
  const sign = me ? `\n${me}` : '';
  return [
    ['Merci pour l’achat', `Bonjour ${first(t.party)}, merci pour votre achat ! Je prépare votre colis (${t.itemTitle}) et je l’expédie très vite.${sign}`],
    ['Colis expédié', `Bonjour ${first(t.party)}, votre colis est parti. Numéro de suivi : ${tr}. Bonne réception !${sign}`],
    ['Remise acceptée', `Bonjour ${first(t.party)}, c’est d’accord pour votre offre. Je vous envoie la validation à l’instant.${sign}`],
    ['Refus poli', `Bonjour ${first(t.party)}, merci pour votre offre mais je ne peux pas descendre plus bas. Je peux faire un petit geste en lot.${sign}`],
    ['Relance', `Bonjour ${first(t.party)}, l’article (${t.itemTitle}) vous intéresse toujours ? Je peux vous le garder jusqu’à demain.${sign}`],
    ['Demande d’avis', `Bonjour ${first(t.party)}, j’espère que tout est bien arrivé ! Si vous êtes satisfait(e), un petit avis m’aiderait beaucoup. Merci !${sign}`],
  ];
}
function vMessages() {
  if (!curThread || !S.threads.find((t) => t.id === curThread)) curThread = S.threads[0] ? S.threads[0].id : null;
  const t = S.threads.find((x) => x.id === curThread);
  const last = (x) => x.msgs[x.msgs.length - 1];
  const list = S.threads.slice().sort((a, b) => last(b).t - last(a).t).map((x) => `<button class="th ${x.unread ? 'un' : ''}" type="button" data-act="open-thread" data-id="${x.id}" ${x.id === curThread ? 'aria-current="true"' : ''}>${avatar(x.party)}<span class="a"><span>${esc(x.party)}</span></span><span class="b">${esc(x.itemTitle)} · ${esc(last(x).text)}</span></button>`).join('');
  const chat = t ? `<div class="chat"><div class="hd"><div class="row" style="flex-wrap:nowrap;min-width:0"><button class="btn sm ghost backbtn" data-act="back-threads" type="button">${IC.home}</button>${avatar(t.party)}<span class="tt">${esc(t.party)}<small>${esc(t.itemTitle)}</small></span></div><button class="btn sm ghost" data-act="del-thread" data-id="${t.id}" type="button">Supprimer</button></div>
    <div class="log" id="log">${t.msgs.map((m) => `<div class="bub ${m.me ? 'me' : ''}">${esc(m.text)}<time>${new Date(m.t).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time></div>`).join('')}</div>
    <div class="compose"><div class="tpl">${templates(t).map(([n], i) => `<button class="chip" type="button" data-act="tpl" data-i="${i}">${n}</button>`).join('')}</div>
      <textarea id="msg-text" placeholder="Écris ta réponse ou choisis un message tout prêt…" aria-label="Message"></textarea>
      <div class="row"><button class="btn primary sm" data-act="copy-msg" type="button">Copier pour Vinted</button><button class="btn sm" data-act="send" type="button">Noter comme envoyé</button><button class="btn sm ghost" data-act="recv" type="button">Ajouter sa réponse</button></div>
      <div class="note">Copie le texte, colle-le dans Vinted, puis note-le ici pour garder l’historique.</div></div></div>` : '<div class="chat"><div class="empty" style="margin:auto"><b>Aucune conversation</b><span>Crée-en une pour garder l’historique avec un acheteur.</span></div></div>';
  return demoBar() + head('Messages', unreadN() ? `${plural(unreadN(), 'conversation')} attend${unreadN() > 1 ? 'ent' : ''} ta réponse` : 'Tout le monde a sa réponse', '<button class="btn primary" data-act="new-thread" type="button">Nouvelle conversation</button>') + `<div class="msgs ${mobChat ? 'chatting' : ''}"><div class="tl">${list || '<div class="empty">Rien pour l’instant.</div>'}</div>${chat}</div>`;
}
function vReglages() {
  const theme = document.documentElement.dataset.theme || 'auto';
  const row = (lb, sub, ctrl) => `<div class="setrow"><span class="lb"><span>${lb}</span>${sub ? `<small>${sub}</small>` : ''}</span>${ctrl}</div>`;
  return head('Réglages', 'Ton profil, tes objectifs et tes données') + `<div class="setlist">
    ${ACC ? '<div class="group"><h2>Compte et abonnement</h2><div class="box" id="acct-box"></div></div>' : '<div class="group"><h2>Appareils reliés</h2><div class="box" id="sync-box"></div></div>'}
    <div class="group"><h2>Profil</h2><div class="box">
      ${row('Prénom ou pseudo', 'Signe tes messages et personnalise l’accueil', `<input id="set-name" value="${esc(S.profile.name)}" placeholder="ex. Max" autocomplete="nickname">`)}
      ${row('Objectif du mois', 'Bénéfice net que tu vises chaque mois', `<input id="set-goal" type="number" min="0" step="10" inputmode="numeric" value="${S.profile.goal || ''}" placeholder="ex. 300 €">`)}
    </div></div>
    <div class="group"><h2>Affichage</h2><div class="box">
      ${row('Thème', theme === 'auto' ? 'Suit le réglage de ton téléphone' : theme === 'dark' ? 'Sombre' : 'Clair', `<div class="seg" role="group" aria-label="Thème">${[['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']].map(([v, t]) => `<button type="button" data-act="set-theme" data-v="${v}" aria-pressed="${v === theme}">${t}</button>`).join('')}</div>`)}
    </div></div>
    <div class="group"><h2>Données</h2><div class="box">
      ${row('Exporter mes ventes', 'Un fichier CSV pour ta compta', '<button class="btn sm" data-act="export" type="button">Exporter</button>')}
      ${S.demo ? row('Données d’exemple', 'Efface les exemples pour commencer avec tes articles', '<button class="btn sm" data-act="clear-demo" type="button">Repartir de zéro</button>') : ''}
      ${row('Tout effacer', docRef || ACC ? 'Supprime tes articles, ventes et messages, tu gardes ton compte' : 'Supprime les données gardées sur cet appareil', '<button class="btn sm danger" data-act="reset" type="button">Effacer</button>')}
    </div></div>
    <p class="note" style="margin:0 4px">${ACC ? 'Tes données sont enregistrées en privé sur ton compte Fripe, hébergé en France.' : docRef ? 'Tes données sont enregistrées en privé sur ton compte.' : 'Tes données restent dans ce navigateur, sur cet appareil.'} Fripe n’est pas affilié à Vinted.</p>
  </div>`;
}
const VIEW_FN = { tableau: vTableau, stock: vStock, commandes: vCommandes, livraisons: vLivraisons, messages: vMessages, reglages: vReglages };


/* ---------------- bénéfices du mois ---------------- */
let MC = null;
function monthModel() {
  const now = new Date(), y = now.getFullYear(), mo = now.getMonth(), N = new Date(y, mo + 1, 0).getDate(), td = now.getDate();
  const k2 = (yy, mm) => `${yy}-${String(mm + 1).padStart(2, '0')}`;
  const key = k2(y, mo), pd = new Date(y, mo - 1, 1), pkey = k2(pd.getFullYear(), pd.getMonth()), PN = new Date(y, mo, 0).getDate();
  const daily = Array(N).fill(0), cnt = Array(N).fill(0), pdaily = Array(PN).fill(0);
  sales().forEach((o) => { const m = o.date.slice(0, 7), d = +o.date.slice(8, 10) - 1; if (m === key && d >= 0 && d < N) { daily[d] += saleProfit(o); cnt[d]++; } else if (m === pkey && d >= 0 && d < PN) pdaily[d] += saleProfit(o); });
  const cum = [], pcum = []; let a = 0, b = 0;
  for (let i = 0; i < td; i++) { a += daily[i]; cum.push(a); }
  for (let i = 0; i < PN; i++) { b += pdaily[i]; pcum.push(b); }
  const total = cum[td - 1] || 0, prevSame = pcum[Math.min(td, PN) - 1] || 0, proj = td ? total / td * N : total;
  let best = -1; daily.slice(0, td).forEach((v, i) => { if (v > 0 && (best < 0 || v > daily[best])) best = i; });
  const label = now.toLocaleDateString('fr-FR', { month: 'long' });
  return { N, td, daily, cnt, cum, pcum, PN, total, prevSame, proj, best, label, nSales: cnt.reduce((x, y2) => x + y2, 0), y, mo };
}
function monthChartHTML(compact) {
  const m = MC = monthModel(), goal = Number(S.profile.goal) || 0;
  const W = 720, H = compact ? 260 : 300, L = 48, R = 26, T = 30, B = 32, iw = W - L - R, ih = H - T - B, barH = ih * .24, lineH = ih - barH - 8;
  const top = (() => { const mx = Math.max(60, m.total, m.proj, goal, ...m.pcum.slice(0, m.N)) * 1.12; const step = mx > 800 ? 200 : mx > 400 ? 100 : mx > 160 ? 50 : 25; return Math.ceil(mx / step) * step; })();
  const X = (d) => L + (m.N > 1 ? d / (m.N - 1) : 0) * iw, Y = (v) => T + lineH - Math.max(0, Math.min(v, top)) / top * lineH, base = T + lineH;
  let grid = '';
  for (let k = 0; k <= 4; k++) { const v = top / 4 * k; grid += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1" ${k ? 'stroke-dasharray="2 5"' : ''}/><text x="${L - 8}" y="${Y(v) + 3.5}" text-anchor="end">${Math.round(v)}</text>`; }
  const xl = [1, 5, 10, 15, 20, 25, m.N].filter((d, i, a) => d <= m.N && a.indexOf(d) === i).map((d) => `<text x="${X(d - 1)}" y="${H - 10}" text-anchor="middle">${d}</text>`).join('');
  const sm = (pts) => pts.map((p, i) => i ? `C${((pts[i - 1][0] + p[0]) / 2).toFixed(1)} ${pts[i - 1][1].toFixed(1)} ${((pts[i - 1][0] + p[0]) / 2).toFixed(1)} ${p[1].toFixed(1)} ${p[0].toFixed(1)} ${p[1].toFixed(1)}` : `M${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const pts = m.cum.map((v, i) => [X(i), Y(v)]);
  const line = pts.length > 1 ? sm(pts) : '';
  const area = pts.length > 1 ? line + ` L${pts[pts.length - 1][0].toFixed(1)} ${base} L${pts[0][0].toFixed(1)} ${base} Z` : '';
  const ppts = m.pcum.slice(0, Math.min(m.N, m.PN)).map((v, i) => [X(i), Y(v)]);
  const prevLine = ppts.length > 1 ? sm(ppts) : '';
  const lp = pts[pts.length - 1] || [X(0), base], proj = m.td < m.N ? `M${lp[0].toFixed(1)} ${lp[1].toFixed(1)} L${X(m.N - 1).toFixed(1)} ${Y(m.proj).toFixed(1)}` : '';
  const maxD = Math.max(1, ...m.daily.map(Math.abs)), bw = Math.max(3, iw / m.N * .5);
  const bars = m.daily.map((v, i) => { if (!v || i >= m.td) return ''; const h = Math.max(2, Math.abs(v) / maxD * (barH - 4)); return `<rect class="mb" style="animation-delay:${(.5 + i * .025).toFixed(2)}s" x="${(X(i) - bw / 2).toFixed(1)}" y="${(H - B - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${v >= 0 ? 'url(#mcBar)' : 'var(--bad)'}"/>`; }).join('');
  const goalL = goal ? `<line x1="${L}" x2="${W - R}" y1="${Y(goal)}" y2="${Y(goal)}" stroke="var(--gold)" stroke-width="1.4" stroke-dasharray="6 5"/><text x="${W - R}" y="${Y(goal) - 6}" text-anchor="end" style="fill:var(--gold)">Objectif ${eur(goal)}</text>` : '';
  const bestL = m.best >= 0 ? `<g class="mbest"><circle cx="${X(m.best)}" cy="${H - B - Math.max(2, m.daily[m.best] / maxD * (barH - 4)) - 7}" r="3.2" fill="var(--gold)"/></g>` : '';
  const tag = `${m.total >= 0 ? '+' : ''}${eur(m.total)}`, tw = tag.length * 7.4 + 18, tx = Math.min(W - R - tw / 2, Math.max(L + tw / 2, lp[0]));
  const svg = `<svg class="mchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bénéfice cumulé du mois, jour par jour">${grid}${xl}${goalL}${prevLine ? `<path d="${prevLine}" fill="none" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="1 5" stroke-linecap="round" opacity=".7"/>` : ''}${bars}${area ? `<path class="marea" d="${area}" fill="url(#mcArea)"/>` : ''}${proj ? `<path d="${proj}" fill="none" stroke="var(--cyan)" stroke-width="2" stroke-dasharray="3 6" stroke-linecap="round" opacity=".85"/><circle cx="${X(m.N - 1)}" cy="${Y(m.proj)}" r="3.5" fill="var(--bg)" stroke="var(--cyan)" stroke-width="2"/>` : ''}${line ? `<path class="mline" pathLength="1" d="${line}" fill="none" stroke="url(#mcLine)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" filter="url(#mcGlow)"/>` : ''}${bestL}<g class="mdot" style="transform:translate(${lp[0].toFixed(1)}px,${lp[1].toFixed(1)}px)"><circle class="pulse" r="9" fill="var(--accent2)" opacity=".25"/><circle r="5" fill="var(--bg)" stroke="var(--accent2)" stroke-width="3"/></g><g class="mtag"><rect x="${(tx - tw / 2).toFixed(1)}" y="${Math.max(2, lp[1] - 36).toFixed(1)}" width="${tw.toFixed(1)}" height="22" rx="11" fill="url(#mcLine)"/><text x="${tx.toFixed(1)}" y="${(Math.max(2, lp[1] - 36) + 15).toFixed(1)}" text-anchor="middle" style="fill:#fff;font-weight:600">${tag}</text></g><line class="mcur" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="var(--fg)" stroke-width="1" opacity="0"/><circle class="mcdot" r="5" fill="var(--bg)" stroke="var(--fg)" stroke-width="2" opacity="0"/><rect class="mhit" x="${L}" y="${T}" width="${iw}" height="${H - T - B}" fill="transparent"/></svg>`;
  const dl2 = m.prevSame > 0 ? ((m.total - m.prevSame) / m.prevSame * 100) : null;
  const chips = [
    dl2 !== null ? `<span class="chp ${dl2 >= 0 ? 'good' : 'bad'}">${dl2 >= 0 ? '▲' : '▼'} ${Math.abs(dl2).toFixed(0)} % vs ${new Date(m.y, m.mo - 1, 1).toLocaleDateString('fr-FR', { month: 'long' })}</span>` : '',
    m.td < m.N ? `<span class="chp">Projection fin de mois ≈ ${eur(m.proj)}</span>` : '',
    m.best >= 0 ? `<span class="chp gold">Meilleur jour : ${m.best + 1} ${m.label} · +${eur(m.daily[m.best])}</span>` : '',
    m.nSales ? `<span class="chp">${m.nSales} vente${m.nSales > 1 ? 's' : ''} · ${eur(m.total / m.nSales)} en moyenne</span>` : '',
  ].join('');
  const gp = goal ? Math.max(0, Math.min(100, m.total / goal * 100)) : 0;
  return `<div class="mc tilt-card ${compact ? 'compact' : ''}"><div class="mc-head"><div><div class="eyebrow">Bénéfices de ${esc(m.label)}</div><div class="mc-big gt num" data-mc="${m.total.toFixed(2)}">${eur(m.total)}</div></div>${compact ? '' : '<canvas class="coin" id="coin3d" width="220" height="220" aria-hidden="true"></canvas>'}</div>
    <div class="chips-row">${chips || '<span class="chp">Aucune vente ce mois-ci pour l’instant.</span>'}</div>
    ${goal ? `<div class="goal"><div class="gbar"><i style="width:${gp.toFixed(1)}%"></i></div><span class="note">${gp.toFixed(0)} % de ton objectif de ${eur(goal)}</span></div>` : ''}
    <div class="mchart-wrap">${svg}<div class="mtip" hidden></div></div>
    <div class="legend"><span><i style="background:var(--accent2)"></i>Bénéfice cumulé</span><span><i style="background:var(--accent)"></i>Bénéfice par jour</span><span><i style="background:var(--cyan)"></i>Projection</span><span><i style="background:var(--muted)"></i>Mois dernier</span></div></div>`;
}
function bindMonthChart(root) {
  (root || document).querySelectorAll('.mchart-wrap').forEach((w) => {
    if (w.dataset.bound || !MC) return; w.dataset.bound = 1;
    const svg = w.querySelector('svg'), hit = w.querySelector('.mhit'), tip = w.querySelector('.mtip'), cur = w.querySelector('.mcur'), dot = w.querySelector('.mcdot');
    const vb = svg.viewBox.baseVal, L = 48, R = 26, m = MC;
    const move = (e) => {
      const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * vb.width;
      let d = Math.round((px - L) / (vb.width - L - R) * (m.N - 1)); d = Math.max(0, Math.min(m.N - 1, d));
      const x = L + d / (m.N - 1) * (vb.width - L - R), done = d < m.td;
      cur.setAttribute('x1', x); cur.setAttribute('x2', x); cur.style.opacity = .35;
      tip.hidden = false;
      const day = new Date(m.y, m.mo, d + 1).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
      tip.innerHTML = done ? `<b>${esc(day)}</b><span>Cumul <em>${m.cum[d] >= 0 ? '+' : ''}${eur(m.cum[d])}</em></span><span>Ce jour <em>${m.daily[d] >= 0 ? '+' : ''}${eur(m.daily[d])}</em>${m.cnt[d] ? ` · ${m.cnt[d]} vente${m.cnt[d] > 1 ? 's' : ''}` : ''}</span>` : `<b>${esc(day)}</b><span>À venir</span>`;
      const left = x / vb.width * 100; tip.style.left = Math.min(78, Math.max(2, left - 10)) + '%';
    };
    hit.addEventListener('pointermove', move); hit.addEventListener('pointerdown', move);
    hit.addEventListener('pointerleave', () => { tip.hidden = true; cur.style.opacity = 0; dot.style.opacity = 0; });
  });
}

/* ---------------- vitrine 3D du tableau de bord : une boîte par catégorie ---------------- */
const CAT_COL = { 'Vêtements': '#ff2e4d', 'Chaussures': '#22d37f', 'Sacs': '#ff7a1a', 'Accessoires': '#f2c14e', 'Jeux & jouets': '#2fb6ff', 'Maison': '#ff5fa8' }, MORE_COL = ['#a98bff', '#2fd3c4', '#ffd23f', '#ff9ec7'];
let STAGE = null;
function stageData() {
  const by = {}, prof = {};
  S.items.forEach((i) => { const c = i.cat || 'Autre'; (by[c] = by[c] || []).push(i); });
  sales().forEach((o) => { const it = itemOf(o.itemId); if (it) prof[it.cat || 'Autre'] = (prof[it.cat || 'Autre'] || 0) + saleProfit(o); });
  const cats = Object.keys(by).length ? Object.keys(by) : CATS.slice();
  return cats.sort((a, b) => (prof[b] || 0) - (prof[a] || 0) || (by[b] || []).length - (by[a] || []).length).map((c, k) => {
    const arr = by[c] || [], left = arr.filter((i) => i.status !== 'sold'), sold = arr.filter((i) => i.status === 'sold');
    const inv = left.reduce((x, i) => x + i.buy, 0), pf = prof[c] || 0, ca = sold.reduce((x, i) => x + i.sold, 0), mg = ca ? (ca - sold.reduce((x, i) => x + i.buy, 0)) / ca * 100 : null;
    const css = CAT_COL[c] || MORE_COL[k % MORE_COL.length];
    return { name: c, css, hex: parseInt(css.slice(1), 16), kick: `Catégorie · ${plural(sold.length, 'vente')}`, label: `${left.length} à vendre · ${sold.length} vendu${sold.length > 1 ? 's' : ''}`.toUpperCase(),
      stats: `<div><b class="num">${left.length}</b><span>à vendre</span></div><div><b class="num">${eur(inv)}</b><span>investis</span></div><div><b class="num ${pf >= 0 ? 'up' : 'down'}">${pf >= 0 ? '+' : ''}${eur(pf)}</b><span>de bénéfice</span></div><div><b class="num">${mg === null ? '—' : mg.toFixed(0) + ' %'}</b><span>de marge</span></div>` };
  });
}
function mountStage(anim) {
  const slot = $('#stage-slot'); if (!slot) return;
  if (STAGE === null) { STAGE = (window.FripeStage && window.FripeStage({ reduce })) || false; if (STAGE) STAGE.onGo((d) => { stockQ = d.name; stockF = 'all'; location.hash = '#stock'; }); }
  if (!STAGE) { slot.remove(); return; }
  slot.replaceWith(STAGE.el); STAGE.setData(stageData()); if (anim) STAGE.replay();
}

/* ---------------- mini boîte 3D sous son anneau de lumière ---------------- */
function mountCoin() {
  const cv = $('#coin3d'), T = window.THREE; if (!cv || !T || !window.FripeBox) return;
  let r; try { r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (e) { return; }
  const cs = cv.clientWidth || 120; r.setPixelRatio(Math.min(devicePixelRatio || 1, 3)); r.setSize(cs, cs, false); r.outputEncoding = T.sRGBEncoding;
  const sc = new T.Scene(), cam = new T.PerspectiveCamera(30, 1, .1, 50); cam.position.set(0, 1.1, 5.6); cam.lookAt(0, .15, 0);
  const col = (h) => new T.Color(h).convertSRGBToLinear(), P = window.FRIPE_PRODUCTS[0];
  sc.add(new T.HemisphereLight(0xffffff, 0x101014, .7)); const k = new T.SpotLight(0xffffff, 2.2, 12, .6, .5); k.position.set(0, 4, 1.5); sc.add(k, k.target);
  const p1 = new T.PointLight(col(P.hex), 1.6, 12); p1.position.set(-3, 1, -2); sc.add(p1); const p2 = new T.PointLight(col(0xff7a1a), 1, 12); p2.position.set(3, 1, -2); sc.add(p2);
  const box = window.FripeBox(T, P, 0); box.userData.glow(.3); box.userData.open(.45); const grp = new T.Group(); grp.add(box); sc.add(grp);
  const ring = new T.Mesh(new T.TorusGeometry(.8, .035, 10, 90), new T.MeshBasicMaterial({ color: 0xffffff })); ring.rotation.x = Math.PI / 2; ring.position.y = 1.45; sc.add(ring);
  let t = 0, mx = 0, raf = 0, last = performance.now();
  const mv = (e) => { mx = (e.clientX / innerWidth - .5) * 2; }; addEventListener('pointermove', mv, { passive: true });
  const dispose = () => { cancelAnimationFrame(raf); removeEventListener('pointermove', mv); box.userData.dispose(); r.dispose(); try { r.forceContextLoss(); } catch (e) {} };
  const frame = (n) => { if (!document.body.contains(cv)) return dispose(); raf = requestAnimationFrame(frame); const dt = Math.min(.05, (n - last) / 1000); last = n; t += dt;
    grp.rotation.y = t * .6 + mx * .4; grp.position.y = Math.sin(t * 1.4) * .06; box.userData.open(.4 + Math.sin(t * 1.1) * .15); r.render(sc, cam); };
  if (reduce) { grp.rotation.y = .5; r.render(sc, cam); return; }
  raf = requestAnimationFrame(frame);
}

function render(anim) {
  renderNav();
  const m = $('#main');
  m.innerHTML = VIEW_FN[view]();
  if (anim && !reduce && window.gsap) {
    gsap.from('#main .hello, #main .top, #main .stage, #main .mc, #main .todo > *, #main .kpi, #main .card, #main .item, #main .ord, #main .parcel, #main .group', { y: 14, opacity: 0, duration: .45, stagger: .03, ease: 'power2.out', clearProps: 'transform,opacity' });
    $$('[data-count]').forEach((el) => { const to = +el.dataset.count, o = { v: 0 }; gsap.to(o, { v: to, duration: .9, ease: 'power2.out', onUpdate: () => { el.textContent = eur(o.v); }, onComplete: () => { el.textContent = eur(to); } }); });
    $$('[data-mc]').forEach((el) => { const to = +el.dataset.mc, o = { v: 0 }; gsap.to(o, { v: to, duration: 1.2, ease: 'power3.out', onUpdate: () => { el.textContent = eur(o.v); }, onComplete: () => { el.textContent = eur(to); } }); });
  }
  bindMonthChart(m); mountStage(anim); mountCoin();
  if (window.FripeSync) window.FripeSync.mount();
  if (ACC) ACC.mount();
  if (anim && window.FripeFX) $$('#main .hello h1, #main .top h1').forEach((h) => window.FripeFX.scramble(h, h.textContent, 520));
  const log = $('#log'); if (log) log.scrollTop = log.scrollHeight;
}

/* ---------------- dialogues ---------------- */
function form(title, fields, submitLabel, onOk, extra) {
  const f = $('#dlg-form');
  f.innerHTML = `<h3>${esc(title)}</h3>${fields.map((x) => x.row ? `<div class="fgrid">${x.row.map(fld).join('')}</div>` : fld(x)).join('')}<div class="row" style="justify-content:flex-end"><button class="btn ghost" value="cancel" type="button" id="dlg-cancel">Annuler</button>${extra || ''}<button class="btn primary" type="submit">${esc(submitLabel)}</button></div>`;
  f.onsubmit = (e) => { e.preventDefault(); const d = {}; fields.flatMap((x) => x.row || [x]).forEach((x) => { const el = f.elements[x.k]; d[x.k] = x.type === 'number' ? Number(el.value || 0) : el.value.trim(); }); if (onOk(d) !== false) $('#dlg').close(); };
  $('#dlg-cancel').onclick = () => $('#dlg').close();
  $('#dlg').showModal();
}
function fld(x) {
  const id = 'f-' + x.k, v = x.val ?? '';
  if (x.opts) return `<label class="fld">${x.label}<select id="${id}" name="${x.k}">${x.opts.map((o) => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${val == v ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select></label>`;
  if (x.type === 'textarea') return `<label class="fld">${x.label}<textarea id="${id}" name="${x.k}" rows="3">${esc(v)}</textarea></label>`;
  return `<label class="fld">${x.label}<input id="${id}" name="${x.k}" type="${x.type || 'text'}" ${x.type === 'number' ? 'step="0.5" min="0"' : ''} value="${esc(v)}" ${x.req ? 'required' : ''} ${x.ph ? `placeholder="${esc(x.ph)}"` : ''}></label>`;
}
function itemForm(it) {
  if (!it && ACC && !ACC.canAdd(S)) return ACC.paywall('limit');
  const n = !it; it = it || { title: '', brand: '', cat: CATS[0], size: '', buy: '', list: '', status: 'stock', buyDate: today() };
  form(n ? 'Nouvel article' : 'Modifier l’article', [
    { k: 'title', label: 'Titre', req: 1, val: it.title, ph: 'ex. Veste Carhartt Detroit' },
    { row: [{ k: 'brand', label: 'Marque', val: it.brand }, { k: 'size', label: 'Taille', val: it.size }] },
    { row: [{ k: 'cat', label: 'Catégorie', opts: CATS, val: it.cat }, { k: 'status', label: 'Statut', opts: [['stock', 'En stock'], ['online', 'En ligne']], val: it.status === 'sold' ? 'stock' : it.status }] },
    { row: [{ k: 'buy', label: 'Prix d’achat (€)', type: 'number', val: it.buy, req: 1 }, { k: 'list', label: 'Prix en ligne (€)', type: 'number', val: it.list }] },
  ], n ? 'Ajouter' : 'Enregistrer', (d) => {
    if (n) { const x = { id: uid(), ...d, sold: 0, buyDate: today(), listDate: d.status === 'online' ? today() : '', soldDate: '' }; S.items.unshift(x); toast('Article ajouté'); }
    else { if (d.status === 'online' && it.status !== 'online' && !it.listDate) it.listDate = today(); if (it.status !== 'sold') Object.assign(it, d); else Object.assign(it, { title: d.title, brand: d.brand, size: d.size, cat: d.cat, buy: d.buy }); toast('Modifications enregistrées'); }
    save(); render(); return true;
  }, n ? '' : `<button class="btn ghost" type="button" id="del-item" style="margin-right:auto;color:var(--bad)">Supprimer</button>`);
  const del = $('#del-item'); if (del) del.onclick = () => { if (del.dataset.arm) { S.items = S.items.filter((x) => x !== it); S.orders = S.orders.filter((o) => o.itemId !== it.id); save(); $('#dlg').close(); render(); toast('Article supprimé'); } else { del.dataset.arm = 1; del.textContent = 'Confirmer la suppression'; } };
}
function sellForm(it) {
  form('Vendu : ' + it.title, [
    { k: 'party', label: 'Pseudo de l’acheteur', req: 1, ph: 'ex. camille_92' },
    { row: [{ k: 'price', label: 'Prix de vente (€)', type: 'number', val: it.list, req: 1 }, { k: 'fee', label: 'Frais payés (€)', type: 'number', val: 0 }] },
    { row: [{ k: 'carrier', label: 'Transporteur', opts: CARRIERS }, { k: 'tracking', label: 'N° de suivi', ph: 'plus tard' }] },
  ], 'Créer la commande', (d) => {
    it.status = 'sold'; it.sold = d.price; it.soldDate = today();
    const o = { id: uid(), kind: 'sale', itemId: it.id, party: d.party, price: d.price, fee: d.fee, status: 'todo', carrier: d.carrier, tracking: d.tracking, date: today() };
    S.orders.unshift(o);
    if (!S.threads.find((t) => t.party === d.party)) S.threads.unshift({ id: uid(), party: d.party, itemTitle: it.title, unread: 0, msgs: [{ me: 0, text: 'Conversation créée à la vente de « ' + it.title + ' ».', t: Date.now() }] });
    save(); toast('Vente enregistrée : colis à expédier'); render(); return true;
  });
}
function orderForm(o) {
  form('Colis ' + (o.kind === 'sale' ? 'vendu' : 'acheté'), [
    { row: [{ k: 'carrier', label: 'Transporteur', opts: CARRIERS, val: o.carrier }, { k: 'tracking', label: 'N° de suivi', val: o.tracking }] },
    { row: [{ k: 'price', label: 'Prix (€)', type: 'number', val: o.price }, { k: 'status', label: 'Étape', opts: STEPS.map(([k, t]) => [k, t]), val: o.status }] },
  ], 'Enregistrer', (d) => { Object.assign(o, d); save(); render(); toast('Commande mise à jour'); return true; },
  `<button class="btn ghost" type="button" id="del-ord" style="margin-right:auto;color:var(--bad)">Supprimer</button>`);
  $('#del-ord').onclick = () => { const b = $('#del-ord'); if (b.dataset.arm) { S.orders = S.orders.filter((x) => x !== o); save(); $('#dlg').close(); render(); toast('Commande supprimée'); } else { b.dataset.arm = 1; b.textContent = 'Confirmer la suppression'; } };
}
function purchaseForm() {
  form('Nouvel achat', [{ k: 'title', label: 'Article acheté', req: 1 }, { k: 'party', label: 'Pseudo du vendeur', req: 1 }, { row: [{ k: 'price', label: 'Prix (€)', type: 'number', req: 1 }, { k: 'carrier', label: 'Transporteur', opts: CARRIERS }] }, { k: 'tracking', label: 'N° de suivi (si connu)' }], 'Ajouter', (d) => {
    S.orders.unshift({ id: uid(), kind: 'purchase', itemId: '', ...d, fee: 0, status: 'transit', date: today() }); save(); render(); toast('Achat ajouté'); return true; });
}
function threadForm() {
  form('Nouvelle conversation', [{ k: 'party', label: 'Pseudo', req: 1 }, { k: 'itemTitle', label: 'Article concerné', req: 1 }], 'Créer', (d) => {
    const t = { id: uid(), party: d.party, itemTitle: d.itemTitle, unread: 0, msgs: [{ me: 0, text: 'Conversation créée.', t: Date.now() }] }; S.threads.unshift(t); curThread = t.id; mobChat = true; save(); render(); return true; });
}

/* ---------------- actions ---------------- */
function advance(o) {
  const i = STEPS.findIndex((s) => s[0] === o.status); if (i >= STEPS.length - 1) return;
  if (o.kind === 'sale' && o.status === 'todo' && !o.tracking) { form('Colis déposé', [{ k: 'tracking', label: 'N° de suivi (facultatif)' }], 'Marquer déposé', (d) => { o.tracking = d.tracking; o.status = 'dropped'; save(); render(); toast('Colis déposé'); return true; }); return; }
  o.status = STEPS[i + 1][0]; save(); render(); toast(STEPS[i + 1][1] === 'Payé' ? 'Paiement reçu : bénéfice comptabilisé' : 'Étape : ' + STEPS[i + 1][1]);
}
async function csv() {
  const rows = [['Date', 'Article', 'Marque', 'Catégorie', 'Acheteur', 'Prix de vente', 'Prix d’achat', 'Frais', 'Bénéfice net']];
  sales().sort((a, b) => a.date.localeCompare(b.date)).forEach((o) => { const it = itemOf(o.itemId) || {}; rows.push([o.date, it.title || '', it.brand || '', it.cat || '', o.party, o.price, it.buy || 0, o.fee || 0, saleProfit(o)]); });
  const text = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  try { const d = await claude.use('downloads'); if (d) { await d.save({ filename: 'fripe-ventes.csv', data: '﻿' + text }); return; } } catch (e) {}
  try { const url = URL.createObjectURL(new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8' })); const l = document.createElement('a'); l.href = url; l.download = 'fripe-ventes.csv'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); toast('Export CSV téléchargé'); } catch (e) { toast('Export indisponible ici'); }
}
let tt; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2400); }

document.addEventListener('click', (e) => {
  const sc = e.target.closest('[data-scroll]'); if (sc) { e.preventDefault(); const el = document.getElementById(sc.dataset.scroll); if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); return; }
  const ln = e.target.closest('a[data-stage], a[data-filter]'); if (ln) { if (ln.dataset.stage) { ordTab = 'sale'; ordStage = ln.dataset.stage; } if (ln.dataset.filter) stockF = ln.dataset.filter; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, id = b.dataset.id, v = b.dataset.v;
  const it = id && S.items.find((x) => x.id === id), or = id && S.orders.find((x) => x.id === id);
  if (a === 'period') { period = +v; render(true); }
  else if (a === 'add-item') itemForm();
  else if (a === 'edit-item') itemForm(it);
  else if (a === 'list-item') { it.status = 'online'; it.listDate = today(); save(); render(); toast('Article mis en ligne'); }
  else if (a === 'sell-item') sellForm(it);
  else if (a === 'sfilter') { stockF = v; render(); }
  else if (a === 'otab') { ordTab = v; ordStage = 'todo'; render(); }
  else if (a === 'ostage') { ordStage = v; render(); }
  else if (a === 'theme') { const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); setTheme(cur === 'dark' ? 'light' : 'dark'); }
  else if (a === 'set-theme') { setTheme(v); render(); }
  else if (a === 'add-purchase') purchaseForm();
  else if (a === 'advance') advance(or);
  else if (a === 'edit-order') orderForm(or);
  else if (a === 'open-thread') { curThread = id; mobChat = true; const t = S.threads.find((x) => x.id === id); if (t) t.unread = 0; save(); render(); }
  else if (a === 'back-threads') { mobChat = false; render(); }
  else if (a === 'new-thread') threadForm();
  else if (a === 'del-thread') { S.threads = S.threads.filter((x) => x.id !== id); curThread = null; mobChat = false; save(); render(); toast('Conversation supprimée'); }
  else if (a === 'tpl') { const t = S.threads.find((x) => x.id === curThread); $('#msg-text').value = templates(t)[+b.dataset.i][1]; $('#msg-text').focus(); }
  else if (a === 'send' || a === 'recv') { const t = S.threads.find((x) => x.id === curThread), ta = $('#msg-text'), tx = ta.value.trim(); if (!tx) return toast('Écris un message d’abord'); t.msgs.push({ me: a === 'send' ? 1 : 0, text: tx, t: Date.now() }); t.unread = 0; save(); render(); toast(a === 'send' ? 'Envoi enregistré' : 'Message reçu ajouté'); }
  else if (a === 'copy-msg') { const tx = $('#msg-text').value; if (!tx.trim()) return toast('Rien à copier'); navigator.clipboard.writeText(tx).then(() => toast('Copié : colle-le dans Vinted'), () => { $('#msg-text').select(); toast('Sélectionné : copie avec ton clavier'); }); }
  else if (a === 'export') csv();
  else if (a === 'clear-demo') { S = empty(); curThread = null; save(); render(); toast('Espace vidé, à toi de jouer'); }
  else if (a === 'reset') { if (b.dataset.arm) { S = empty(); save(); render(); toast('Tout est effacé'); } else { b.dataset.arm = 1; b.textContent = 'Confirmer : tout effacer'; } }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'stock-q') { stockQ = e.target.value; const p = e.target.selectionStart; render(); const q = $('#stock-q'); q.focus(); q.setSelectionRange(p, p); }
  else if (e.target.id === 'set-name') { S.profile.name = e.target.value.trim().slice(0, 24); save(); }
  else if (e.target.id === 'set-goal') { S.profile.goal = Math.max(0, Number(e.target.value) || 0); save(); }
});
document.addEventListener('change', (e) => { if (e.target.id === 'stock-sort') { stockSort = e.target.value; render(); } });
function setTheme(v) { if (v === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = v; try { localStorage.setItem('fripe-theme', v); } catch (e) {} }
try { const th = localStorage.getItem('fripe-theme') || 'dark'; if (th !== 'auto') document.documentElement.dataset.theme = th; } catch (e) { document.documentElement.dataset.theme = 'dark'; }
$('#theme-btn').onclick = () => { const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); setTheme(cur === 'dark' ? 'light' : 'dark'); };

/* ---------------- routage ---------------- */
function route() {
  const h = (location.hash || '#accueil').slice(1);
  if (h.startsWith('lier=')) { history.replaceState(null, '', '#reglages'); if (window.FripeSync) window.FripeSync.link(decodeURIComponent(h.slice(5))); return route(); }
  const inApp = VIEW_FN[h] !== undefined;
  if (ACC) { if (inApp && !ACC.user) { ACC.showAuth('#' + h); return; } ACC.hideAuth(); }
  document.body.classList.toggle('in-app', inApp);
  document.body.classList.toggle('landing', !inApp);
  if (inApp) { if (!S) return; view = h; mobChat = false; render(true); window.scrollTo(0, 0); }
  else { paintLanding(); setTimeout(() => { if (window.ScrollTrigger) ScrollTrigger.refresh(); if (SCENE) SCENE.measure(); }, 80); }
}
window.addEventListener('hashchange', route);

/* ---------------- landing (maquettes alimentées par les données) ---------------- */
function paintLanding() {
  if (!S) return;
  const months = monthly(6), p = periodStats(30);
  if (SCENE) SCENE.setChart(monthly(12));
  $('#chip-profit').textContent = (p.pr >= 0 ? '+' : '') + eur(p.pr);
  $('#chip-parcels').textContent = S.orders.filter((o) => o.status === 'dropped' || o.status === 'transit').length;
  $('#mock-chart').innerHTML = monthChartHTML(true); bindMonthChart($('#mock-chart'));
  const o = S.orders.find((x) => x.status === 'transit' && x.kind === 'sale') || S.orders[0];
  if (o) { const it = itemOf(o.itemId), idx = STEPS.findIndex((s) => s[0] === o.status); $('#mock-track').innerHTML = `<div class="parcel" style="border:0;padding:0"><div class="hd"><div class="tt">${esc(it ? it.title : o.title)}<small>${esc(o.carrier)} · <span class="mono">${esc(o.tracking || 'sans suivi')}</span></small></div><span class="pill ${o.status}">${STEPS[idx][1]}</span></div><div class="track">${STEPS.map(([k, t], i) => `<div class="s ${i <= idx ? 'on' : ''} ${i === idx ? 'cur' : ''}">${t}</div>`).join('')}</div></div><div class="todo" style="margin-top:16px"><div class="a"><b class="num">${toShip().length}</b><span>colis à expédier aujourd'hui</span></div></div>`; }
  const t = S.threads[0]; if (t) $('#mock-chat').innerHTML = `<div class="chat" style="min-height:0"><div class="log" style="padding:0 0 12px">${t.msgs.slice(-3).map((m) => `<div class="bub ${m.me ? 'me' : ''}">${esc(m.text)}</div>`).join('')}</div><div class="tpl"><span class="chip">Colis expédié</span><span class="chip">Merci pour l'achat</span><span class="chip">Relance</span></div></div>`;
}

/* ---------------- 3D : vitrine de boîtes ---------------- */
let SCENE = null;
function monthlyOrDemo() { return S ? monthly(12) : Array.from({ length: 12 }, (_, i) => ({ label: '', ca: 80 + i * 20, pr: 40 + i * 9 })); }

/* ---------------- animations d'entrée ---------------- */
function intro() {
  if (window.FripeLanding) window.FripeLanding(SCENE);
  if (reduce || !window.gsap) return;
  gsap.from('.hero .hl', { yPercent: 110, opacity: 0, duration: 1, stagger: .1, ease: 'power4.out', clearProps: 'transform,opacity' });
  gsap.from('.hero-top, .hero-side > *, .hero-hint, .nav', { opacity: 0, y: 14, duration: .8, stagger: .07, delay: .35, ease: 'power2.out', clearProps: 'transform,opacity' });
  if (window.ScrollTrigger) $$('#site .mock, #site .stamps, #site .step, #site .qa details').forEach((el) => gsap.from(el, { y: 40, opacity: 0, duration: .9, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: el, start: 'top 92%', once: true } }));
}

(async () => {
  if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  await boot();
  SCENE = window.FripeScene ? window.FripeScene({ $, eur, reduce, monthlyOrDemo }) : null; intro(); route();
  window.__fripeDemo = () => !!(S && S.demo);
  window.addEventListener('fripe:import', (e) => {
    if (!S) return; e.detail.handled = true;
    const next = e.detail.apply(S);
    if (ACC && !ACC.allows(next)) { e.detail.blocked = true; ACC.paywall('limit'); return; }
    S = next; save(true); route(); toast('Import terminé');
  });
  window.__fripe = { get S() { return S; }, route, advance, toast, replace(d) { if (!d || !d.items) return; S = d; save(true, true); route(); }, get scene() { return SCENE; } };
  if (window.FripeSync) window.FripeSync.start();
})();
})();
