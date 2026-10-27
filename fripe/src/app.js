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
const LS = 'fripe-state-v1';
const empty = () => ({ items: [], orders: [], threads: [], profile: { name: '' }, demo: false, v: 1 });
async function boot() {
  let loaded = null;
  try { const raw = localStorage.getItem(LS); if (raw) loaded = JSON.parse(raw); } catch (e) {}
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
function save(now) {
  const run = async () => {
    const json = JSON.stringify(S);
    try { localStorage.setItem(LS, json); } catch (e) {}
    if (docRef) { try { await docRef.set({ json, at: Date.now() }); } catch (e) { toast('Sauvegarde en ligne impossible, copie locale conservée.'); } }
  };
  clearTimeout(saveT); if (now) run(); else saveT = setTimeout(run, 500);
}
window.addEventListener('pagehide', () => { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {} });

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
const IC = {
  tableau: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg>',
  stock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8"/></svg>',
  commandes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  livraisons: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6h12v10H2zM14 10h4l4 3v3h-8"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
  messages: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 01-11.6 7.1L3 21l1.9-5.4A8 8 0 1121 12z"/></svg>',
  reglages: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
};
const VIEWS = [['tableau', 'Tableau de bord'], ['stock', 'Stock'], ['commandes', 'Commandes'], ['livraisons', 'Livraisons'], ['messages', 'Messages'], ['reglages', 'Réglages']];
const SHORT = { tableau: 'Accueil', stock: 'Stock', commandes: 'Ventes', livraisons: 'Colis', messages: 'Messages', reglages: 'Réglages' };

/* ---------------- vues ---------------- */
let view = 'tableau', period = 30, stockQ = '', stockF = 'all', ordTab = 'sale', curThread = null, mobChat = false;
function badges() { return { commandes: toShip().length, messages: unreadN() }; }
function renderNav() {
  const b = badges();
  const link = (v, t, short) => `<a href="#${v}" ${v === view ? 'aria-current="page"' : ''}>${IC[v]}<span>${short ? SHORT[v] : t}</span>${b[v] ? `<span class="badge">${b[v]}</span>` : ''}</a>`;
  $('#sidenav').innerHTML = VIEWS.map(([v, t]) => link(v, t)).join('');
  $('#tabbar').innerHTML = VIEWS.map(([v, t]) => link(v, t, 1)).join('');
}
function demoBar() { return S.demo ? `<div class="demo"><span><b>Données d'exemple.</b> Tout est modifiable. Vide-les quand tu veux commencer avec tes vrais articles.</span><button class="btn sm" data-act="clear-demo" type="button">Vider les exemples</button></div>` : ''; }
function head(title, sub, right) { return `<div class="top"><div><h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div><div class="row">${right || ''}</div></div>`; }

function vTableau() {
  const p = periodStats(period), label = { 30: '30 jours', 90: '90 jours', 365: '12 mois' }[period];
  const months = monthly(period === 365 ? 12 : 6);
  const cats = {}; p.cur.forEach((o) => { const it = itemOf(o.itemId); const c = it ? it.cat : 'Autre'; cats[c] = (cats[c] || 0) + saleProfit(o); });
  const cl = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 5), cmax = Math.max(1, ...cl.map((c) => c[1]));
  const stockVal = S.items.filter((i) => i.status !== 'sold').reduce((s, i) => s + i.buy, 0), stockN = S.items.filter((i) => i.status !== 'sold').length;
  const ship = toShip().length, st = stale().length, un = unreadN(), tr = S.orders.filter((o) => o.status === 'dropped' || o.status === 'transit').length;
  return demoBar() + head('Tableau de bord', `Sur les ${label}`, `<div class="seg" role="group" aria-label="Période">${[[30, '30 j'], [90, '90 j'], [365, '12 mois']].map(([d, t]) => `<button type="button" data-act="period" data-v="${d}" aria-pressed="${d === period}">${t}</button>`).join('')}</div>`) + monthChartHTML(false) + `
  <div class="kpis">
    <div class="kpi big"><div class="l">Chiffre d'affaires</div><div class="v" data-count="${p.ca}" data-eur="1">${eur(p.ca)}</div>${dl(delta(p.ca, p.caP))}</div>
    <div class="kpi"><div class="l">Bénéfice net</div><div class="v" data-count="${p.pr}" data-eur="1">${eur(p.pr)}</div>${dl(delta(p.pr, p.prP))}</div>
    <div class="kpi"><div class="l">Marge</div><div class="v">${p.margin.toFixed(0)} %</div><div class="d">${p.n} vente${p.n > 1 ? 's' : ''} · panier ${eur(p.basket)}</div></div>
    <div class="kpi"><div class="l">Stock immobilisé</div><div class="v" data-count="${stockVal}" data-eur="1">${eur(stockVal)}</div><div class="d">${stockN} article${stockN > 1 ? 's' : ''}${p.avg !== null ? ` · vente en ${p.avg.toFixed(0)} j` : ''}</div></div>
  </div>
  <div class="grid2">
    <div class="card"><h3>Chiffre d'affaires et bénéfice <small>${period === 365 ? '12 derniers mois' : '6 derniers mois'}</small></h3>${chartSVG(months)}</div>
    <div class="card"><h3>À traiter</h3><div class="todo">
      <a href="#commandes"><b class="num">${ship}</b><span>colis à expédier</span><span class="go">→</span></a>
      <a href="#livraisons"><b class="num">${tr}</b><span>colis en route</span><span class="go">→</span></a>
      <a href="#messages"><b class="num">${un}</b><span>message${un > 1 ? 's' : ''} non lu${un > 1 ? 's' : ''}</span><span class="go">→</span></a>
      <a href="#stock"><b class="num">${st}</b><span>article${st > 1 ? 's' : ''} en ligne depuis plus de 30 jours</span><span class="go">→</span></a>
    </div></div>
  </div>
  <div class="grid2">
    <div class="card"><h3>Dernières ventes <small>${fdate(p.cur[0] && p.cur.slice().sort((a, b) => b.date.localeCompare(a.date))[0].date)}</small></h3>${recentSales()}</div>
    <div class="card"><h3>Bénéfice par catégorie</h3>${cl.length ? `<div class="hbar">${cl.map(([c, v]) => `<div class="r"><span>${esc(c)}</span><b class="num">${eur(v)}</b><div class="t"><i style="width:${Math.max(4, v / cmax * 100)}%"></i></div></div>`).join('')}</div>` : '<div class="empty">Aucune vente sur cette période.</div>'}</div>
  </div>`;
}
function recentSales() {
  const arr = sales().slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  if (!arr.length) return '<div class="empty">Tes ventes apparaîtront ici.</div>';
  return `<div class="todo">${arr.map((o) => { const it = itemOf(o.itemId); return `<div class="a"><span class="tt" style="flex:1;min-width:0">${esc(it ? it.title : 'Article')}<small>${esc(o.party)} · ${fdate(o.date)}</small></span><span class="num">${eur(o.price)}</span><span class="num ${saleProfit(o) >= 0 ? 'up' : 'down'}" style="min-width:64px;text-align:right">${saleProfit(o) >= 0 ? '+' : ''}${eur(saleProfit(o))}</span></div>`; }).join('')}</div>`;
}

function vStock() {
  const q = stockQ.toLowerCase();
  const arr = S.items.filter((i) => (stockF === 'all' || i.status === stockF) && (!q || (i.title + i.brand + i.cat).toLowerCase().includes(q)));
  const cnt = (s) => S.items.filter((i) => i.status === s).length;
  const rows = arr.map((i) => {
    const age = i.status === 'online' && i.listDate ? daysBetween(i.listDate, today()) : null;
    return `<tr><td><div class="tt">${esc(i.title)}<small>${esc(i.brand)}${i.size ? ' · ' + esc(i.size) : ''} · ${esc(i.cat)}</small></div></td><td><span class="pill ${i.status}">${ITEM_ST[i.status]}</span></td>
      <td class="r num">${eur(i.buy)}</td><td class="r num">${i.status === 'sold' ? eur(i.sold) : eur(i.list)}</td>
      <td class="r num ${i.status === 'sold' ? (i.sold - i.buy >= 0 ? 'up' : 'down') : ''}">${i.status === 'sold' ? eur(i.sold - i.buy) : `<span style="color:var(--muted)">${eur(i.list - i.buy)} visé</span>`}</td>
      <td class="num" style="color:${age >= 30 ? 'var(--warn)' : 'var(--muted)'}">${age !== null ? age + ' j' : i.status === 'sold' ? fdate(i.soldDate) : ''}</td>
      <td><div class="acts">${i.status === 'stock' ? `<button class="btn sm" data-act="list-item" data-id="${i.id}" type="button">Mettre en ligne</button>` : ''}${i.status === 'online' ? `<button class="btn sm primary" data-act="sell-item" data-id="${i.id}" type="button">Vendu</button>` : ''}<button class="btn sm ghost" data-act="edit-item" data-id="${i.id}" type="button">Modifier</button></div></td></tr>`;
  }).join('');
  return demoBar() + head('Stock', `${S.items.length} article${S.items.length > 1 ? 's' : ''} suivis`, '<button class="btn primary" data-act="add-item" type="button">+ Ajouter un article</button>') + `
  <div class="tools"><input class="search" id="stock-q" type="search" placeholder="Rechercher un article, une marque…" value="${esc(stockQ)}" aria-label="Rechercher">
    <div class="chips">${[['all', 'Tous', S.items.length], ['stock', 'En stock', cnt('stock')], ['online', 'En ligne', cnt('online')], ['sold', 'Vendus', cnt('sold')]].map(([v, t, n]) => `<button class="chip" type="button" data-act="sfilter" data-v="${v}" aria-pressed="${v === stockF}">${t} · ${n}</button>`).join('')}</div></div>
  <div class="tablewrap"><table><thead><tr><th>Article</th><th>Statut</th><th class="r">Achat</th><th class="r">Prix</th><th class="r">Marge</th><th>Ancienneté</th><th></th></tr></thead><tbody>${rows || `<tr><td colspan="7"><div class="empty">Aucun article ici. Ajoute ta première pièce pour démarrer.</div></td></tr>`}</tbody></table></div>`;
}

function orderCard(o) {
  const it = itemOf(o.itemId), title = o.kind === 'sale' ? (it ? it.title : 'Article') : o.title;
  const idx = STEPS.findIndex((s) => s[0] === o.status), nxt = STEPS[idx + 1];
  const nl = o.kind === 'sale' ? { dropped: 'Marquer déposé', transit: 'Pris en charge', delivered: 'Marquer livré', done: 'Paiement reçu' } : { dropped: 'Déposé', transit: 'En route', delivered: 'Reçu', done: 'Terminé' };
  return `<div class="oc"><div class="tt">${esc(title)}<small>${o.kind === 'sale' ? 'Acheteur' : 'Vendeur'} · ${esc(o.party)}</small></div>
    <div class="p num">${eur(o.price)}${o.kind === 'sale' ? ` <span class="up" style="font:600 12px var(--f-body)">+${eur(saleProfit(o))}</span>` : ''}</div>
    <div class="m"><span>${esc(o.carrier)}</span><span class="mono">${o.tracking ? esc(o.tracking) : 'sans suivi'}</span></div>
    <div class="row">${nxt ? `<button class="btn sm ${o.status === 'todo' ? 'primary' : ''}" data-act="advance" data-id="${o.id}" type="button">${nl[nxt[0]]} →</button>` : ''}<button class="btn sm ghost" data-act="edit-order" data-id="${o.id}" type="button">Détails</button></div></div>`;
}
function vCommandes() {
  const arr = S.orders.filter((o) => o.kind === ordTab);
  const cols = STEPS.map(([k, t]) => { const list = arr.filter((o) => o.status === k).sort((a, b) => b.date.localeCompare(a.date)); return `<div class="col"><h4><span>${ordTab === 'sale' && k === 'todo' ? 'À expédier' : k === 'done' ? (ordTab === 'sale' ? 'Payé' : 'Terminé') : t}</span><span class="num">${list.length}</span></h4>${list.map(orderCard).join('') || '<div class="note" style="padding:6px">Rien ici.</div>'}</div>`; }).join('');
  return demoBar() + head('Commandes', 'De l’étiquette au paiement', `<div class="seg"><button type="button" data-act="otab" data-v="sale" aria-pressed="${ordTab === 'sale'}">Mes ventes</button><button type="button" data-act="otab" data-v="purchase" aria-pressed="${ordTab === 'purchase'}">Mes achats</button></div>${ordTab === 'purchase' ? '<button class="btn primary" data-act="add-purchase" type="button">+ Achat</button>' : ''}`) + `<div class="board">${cols}</div>`;
}
function vLivraisons() {
  const arr = S.orders.filter((o) => o.status !== 'done').sort((a, b) => STEPS.findIndex((s) => s[0] === b.status) - STEPS.findIndex((s) => s[0] === a.status) || b.date.localeCompare(a.date));
  const card = (o) => { const it = itemOf(o.itemId), title = o.kind === 'sale' ? (it ? it.title : 'Article') : o.title, idx = STEPS.findIndex((s) => s[0] === o.status), url = TRACK_URL[o.carrier];
    return `<div class="parcel"><div class="hd"><div class="tt">${esc(title)}<small>${o.kind === 'sale' ? 'Envoi à' : 'Reçu de'} ${esc(o.party)} · ${esc(o.carrier)} ${o.tracking ? `· <span class="mono">${esc(o.tracking)}</span>` : ''}</small></div>
      <div class="row"><span class="pill ${o.status}">${o.kind === 'sale' ? 'Vente' : 'Achat'}</span>${url && o.tracking ? `<a class="btn sm" href="${url}${encodeURIComponent(o.tracking)}" target="_blank" rel="noopener">Suivi ${esc(o.carrier)}</a>` : ''}<button class="btn sm primary" data-act="advance" data-id="${o.id}" type="button">Étape suivante →</button></div></div>
      <div class="track">${STEPS.map(([k, t], i) => `<div class="s ${i <= idx ? 'on' : ''} ${i === idx ? 'cur' : ''}">${t}</div>`).join('')}</div></div>`; };
  return demoBar() + head('Livraisons', `${arr.length} colis en cours`) + `<div class="parcels">${arr.map(card).join('') || '<div class="card empty">Aucun colis en cours. Les ventes et achats apparaissent ici dès leur création.</div>'}</div>`;
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
  const list = S.threads.slice().sort((a, b) => last(b).t - last(a).t).map((x) => `<button class="th ${x.unread ? 'un' : ''}" type="button" data-act="open-thread" data-id="${x.id}" ${x.id === curThread ? 'aria-current="true"' : ''}><span class="a"><span>${esc(x.party)}</span></span><span class="b">${esc(x.itemTitle)}</span><span class="b">${esc(last(x).text)}</span></button>`).join('');
  const chat = t ? `<div class="chat"><div class="hd"><div class="row"><button class="btn sm backbtn" data-act="back-threads" type="button">← Retour</button><div class="tt">${esc(t.party)}<small>${esc(t.itemTitle)}</small></div></div><button class="btn sm ghost" data-act="del-thread" data-id="${t.id}" type="button">Supprimer</button></div>
    <div class="log" id="log">${t.msgs.map((m) => `<div class="bub ${m.me ? 'me' : ''}">${esc(m.text)}<time>${new Date(m.t).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time></div>`).join('')}</div>
    <div class="compose"><div class="tpl">${templates(t).map(([n, tx], i) => `<button class="chip" type="button" data-act="tpl" data-i="${i}">${n}</button>`).join('')}</div>
      <textarea id="msg-text" placeholder="Écris ton message ou choisis un modèle…" aria-label="Message"></textarea>
      <div class="row"><button class="btn primary sm" data-act="send" type="button">Enregistrer l’envoi</button><button class="btn sm" data-act="copy-msg" type="button">Copier pour Vinted</button><button class="btn sm ghost" data-act="recv" type="button">+ Message reçu</button></div>
      <div class="note">Vinted n’a pas d’accès public : copie le texte dans l’appli, puis garde ici l’historique.</div></div></div>` : '<div class="chat"><div class="empty" style="margin:auto">Aucune conversation. Crée-en une pour garder l’historique avec un acheteur.</div></div>';
  return demoBar() + head('Messages', `${unreadN()} non lu${unreadN() > 1 ? 's' : ''}`, '<button class="btn primary" data-act="new-thread" type="button">+ Conversation</button>') + `<div class="msgs ${mobChat ? 'chatting' : ''}"><div class="tl">${list || '<div class="empty">Rien pour l’instant.</div>'}</div>${chat}</div>`;
}
function vReglages() {
  return head('Réglages', 'Ton espace') + `<div class="grid2"><div class="card"><h3>Profil</h3><label class="fld">Ton prénom ou pseudo (signe tes messages)<input id="set-name" value="${esc(S.profile.name)}" placeholder="ex. Max"></label><label class="fld" style="margin-top:12px">Objectif de bénéfice du mois (€)<input id="set-goal" type="number" min="0" step="10" value="${S.profile.goal || ''}" placeholder="ex. 300"></label></div>
  <div class="card"><h3>Données</h3><div class="todo"><button class="btn" data-act="export" type="button">Exporter mes ventes en CSV</button>${S.demo ? '<button class="btn" data-act="clear-demo" type="button">Vider les exemples</button>' : ''}<button class="btn" data-act="reset" type="button">Tout effacer</button></div><p class="note">${docRef ? 'Tes données sont enregistrées en privé sur ton compte.' : 'Tes données restent sur cet appareil.'}</p></div></div>`;
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

/* ---------------- logo 3D (F extrudé) ---------------- */
function mountCoin() {
  const cv = $('#coin3d'), T = window.THREE; if (!cv || !T) return;
  let r; try { r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (e) { return; }
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.setSize(110, 110, false); r.outputEncoding = T.sRGBEncoding;
  const sc = new T.Scene(), cam = new T.PerspectiveCamera(32, 1, .1, 50); cam.position.set(0, 0, 8.2);
  const col = (h) => new T.Color(h).convertSRGBToLinear();
  sc.add(new T.HemisphereLight(0xcfd8ff, 0x20123a, .9)); const k = new T.DirectionalLight(0xffffff, 1.2); k.position.set(3, 4, 5); sc.add(k);
  const p1 = new T.PointLight(col(0xff4fa3), 1.6, 20); p1.position.set(-4, -2, 4); sc.add(p1); const p2 = new T.PointLight(col(0x38f0d0), 1.2, 20); p2.position.set(4, 3, 3); sc.add(p2);
  const sh = new T.Shape(); [[-1.3, 1.5], [1.4, 1.5], [.95, .72], [-.45, .72], [-.45, .15], [.8, .15], [.4, -.58], [-.45, -.58], [-.45, -1.5], [-1.3, -1.5]].forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]));
  const g = new T.ExtrudeGeometry(sh, { depth: .7, bevelEnabled: true, bevelSize: .09, bevelThickness: .09, bevelSegments: 4 }); g.center();
  const mat = new T.MeshStandardMaterial({ color: col(0x8a6bff), emissive: col(0x4a2bd0), emissiveIntensity: .55, metalness: .85, roughness: .22 });
  const mesh = new T.Mesh(g, mat), edge = new T.LineSegments(new T.EdgesGeometry(g, 40), new T.LineBasicMaterial({ color: col(0x8ff0ff), transparent: true, opacity: .8 })); mesh.add(edge);
  const grp = new T.Group(); grp.add(mesh); sc.add(grp);
  const ring = new T.Mesh(new T.TorusGeometry(2.7, .035, 8, 90), new T.MeshBasicMaterial({ color: col(0xff4fa3) })); ring.rotation.x = 1.15; sc.add(ring);
  let t = 0, mx = 0, my = 0, raf = 0, last = performance.now();
  const mv = (e) => { mx = (e.clientX / innerWidth - .5) * 2; my = (e.clientY / innerHeight - .5) * 2; }; addEventListener('pointermove', mv, { passive: true });
  const dispose = () => { cancelAnimationFrame(raf); removeEventListener('pointermove', mv); g.dispose(); mat.dispose(); r.dispose(); try { r.forceContextLoss(); } catch (e) {} };
  const frame = (n) => { if (!document.body.contains(cv)) return dispose(); raf = requestAnimationFrame(frame); const dt = Math.min(.05, (n - last) / 1000); last = n; t += dt;
    grp.rotation.y = Math.sin(t * .8) * .7 + mx * .5; grp.rotation.x = Math.sin(t * .6) * .18 + my * .3; grp.position.y = Math.sin(t * 1.2) * .08; ring.rotation.z += dt * .6; p1.position.x = -4 + Math.sin(t) * 1.5; r.render(sc, cam); };
  if (reduce) { grp.rotation.y = -.4; r.render(sc, cam); return; }
  raf = requestAnimationFrame(frame);
}

/* ---------------- relief 3D des cartes ---------------- */
(function tilt() {
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches; if (!fine || reduce) return;
  const SEL = '.kpi:not(.big), .kpi.big, .card, .parcel, .mc, .oc';
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest ? e.target.closest(SEL) : null; if (!el || !el.closest('#main')) return;
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5, k = el.classList.contains('mc') ? .5 : 1;
    el.style.transform = `perspective(1000px) rotateX(${(-y * 5 * k).toFixed(2)}deg) rotateY(${(x * 7 * k).toFixed(2)}deg)`; el.style.setProperty('--mx', ((x + .5) * 100).toFixed(1) + '%'); el.style.setProperty('--my', ((y + .5) * 100).toFixed(1) + '%'); el.classList.add('tilted');
  }, { passive: true });
  document.addEventListener('pointerout', (e) => { const el = e.target.closest ? e.target.closest(SEL) : null; if (el && !el.contains(e.relatedTarget)) { el.style.transform = ''; el.classList.remove('tilted'); } });
})();

function render(anim) {
  renderNav();
  const m = $('#main'); const sc = m.scrollTop;
  m.innerHTML = VIEW_FN[view]();
  if (anim && !reduce && window.gsap) {
    gsap.from('#main .mc, #main .kpi, #main .card, #main .parcel, #main .col, #main .tablewrap', { y: 28, rotationX: -10, transformPerspective: 900, transformOrigin: '50% 0', duration: .7, stagger: .06, ease: 'power3.out', clearProps: 'transform' });
    $$('[data-count]').forEach((el) => { const to = +el.dataset.count, o = { v: 0 }; gsap.to(o, { v: to, duration: 1, ease: 'power2.out', onUpdate: () => { el.textContent = eur(o.v); }, onComplete: () => { el.textContent = eur(to); } }); });
    $$('[data-mc]').forEach((el) => { const to = +el.dataset.mc, o = { v: 0 }; gsap.to(o, { v: to, duration: 1.4, ease: 'power3.out', onUpdate: () => { el.textContent = eur(o.v); }, onComplete: () => { el.textContent = eur(to); } }); });
  }
  bindMonthChart(m); mountCoin();
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
  try { await navigator.clipboard.writeText(text); toast('CSV copié dans le presse-papiers'); } catch (e) { toast('Export indisponible ici'); }
}
let tt; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2400); }

document.addEventListener('click', (e) => {
  const sc = e.target.closest('[data-scroll]'); if (sc) { e.preventDefault(); const el = document.getElementById(sc.dataset.scroll); if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, id = b.dataset.id, v = b.dataset.v;
  const it = id && S.items.find((x) => x.id === id), or = id && S.orders.find((x) => x.id === id);
  if (a === 'period') { period = +v; render(true); }
  else if (a === 'add-item') itemForm();
  else if (a === 'edit-item') itemForm(it);
  else if (a === 'list-item') { it.status = 'online'; it.listDate = today(); save(); render(); toast('Article mis en ligne'); }
  else if (a === 'sell-item') sellForm(it);
  else if (a === 'sfilter') { stockF = v; render(); }
  else if (a === 'otab') { ordTab = v; render(); }
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
$('#theme-btn').onclick = () => { const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); document.documentElement.dataset.theme = cur === 'dark' ? 'light' : 'dark'; };

/* ---------------- routage ---------------- */
function route() {
  const h = (location.hash || '#accueil').slice(1);
  const inApp = VIEW_FN[h] !== undefined;
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

/* ---------------- 3D : tunnel d'expédition traversé au scroll ---------------- */
let SCENE = null;
function scene3d() {
  const cv = $('#bg3d'), T = window.THREE;
  if (!T) { document.body.classList.add('no3d'); return null; }
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' }); } catch (e) { document.body.classList.add('no3d'); return null; }
  const col = (h) => new T.Color(h).convertSRGBToLinear();
  const BG = 0x060812, V = 0x7b6cff, M = 0xff4fa3, C = 0x38f0d0, G = 0xffcf5c, O = 0xff7a59;
  let pr = Math.min(devicePixelRatio || 1, 1.5); renderer.setPixelRatio(pr);
  const hasComp = !!(T.EffectComposer && T.UnrealBloomPass && T.RenderPass && T.ShaderPass && T.GammaCorrectionShader);
  if (!hasComp) { renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; }
  const scene = new T.Scene(); scene.background = col(BG); scene.fog = new T.FogExp2(col(BG), 0.036);
  const cam = new T.PerspectiveCamera(50, 1, 0.1, 400); cam.position.set(0, 1.6, 14);

  scene.add(new T.HemisphereLight(0x9a8cff, 0x1a0f2a, 0.4));
  const key = new T.DirectionalLight(0xffffff, 0.55); key.position.set(4, 8, 6); scene.add(key);
  const lights = [];
  const plight = (hex, x, y, z, i, d) => { const l = new T.PointLight(hex, i * .03, d || 26); l.position.set(x, y, z); i *= .03; l.userData.i = i; scene.add(l); lights.push(l); return l; };

  /* sol et poussière */
  const grid = new T.GridHelper(420, 210, col(V), col(0x2a2f6a)); grid.position.set(0, -3.4, -100); grid.material.transparent = true; grid.material.opacity = 0.5; scene.add(grid);
  const N = 900, pp = new Float32Array(N * 3); for (let i = 0; i < N; i++) { pp[i * 3] = (Math.random() - .5) * 34; pp[i * 3 + 1] = (Math.random() - .35) * 16; pp[i * 3 + 2] = 14 - Math.random() * 210; }
  const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pp, 3));
  const dust = new T.Points(pg, new T.PointsMaterial({ color: col(0xb9a8ff), size: .07, transparent: true, opacity: .75, depthWrite: false, blending: T.AdditiveBlending })); scene.add(dust);

  /* utilitaires */
  const edges = (mesh, hex, op) => { const l = new T.LineSegments(new T.EdgesGeometry(mesh.geometry), new T.LineBasicMaterial({ color: col(hex), transparent: true, opacity: op == null ? 1 : op })); mesh.add(l); return l; };
  const nb = (hex) => new T.MeshBasicMaterial({ color: col(hex) });
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })();
  const glow = (hex, s, x, y, z, op) => { const sp = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: col(hex), transparent: true, opacity: op == null ? .8 : op, depthWrite: false, blending: T.AdditiveBlending })); sp.scale.set(s, s, 1); sp.position.set(x, y, z); return sp; };
  const label = (text, w, h, fg, bg, px) => { const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w); const g = c.getContext('2d');
    if (bg) { g.fillStyle = bg; const r = c.height / 2; g.beginPath(); g.moveTo(r, 0); g.arcTo(c.width, 0, c.width, c.height, r); g.arcTo(c.width, c.height, 0, c.height, r); g.arcTo(0, c.height, 0, 0, r); g.arcTo(0, 0, c.width, 0, r); g.fill(); }
    g.fillStyle = fg; g.font = `700 ${px || 56}px "Bricolage Grotesque", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, c.width / 2, c.height / 2 + 3);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false })); return m; };
  const kraft = (labelOn) => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#c79a69'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(${90 + Math.random() * 60 | 0},${60 + Math.random() * 40 | 0},30,${Math.random() * .09})`; g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 6); }
    g.fillStyle = '#ff4fa3'; g.fillRect(112, 0, 32, 256);
    if (labelOn) { g.fillStyle = '#fbfaf6'; g.fillRect(24, 150, 96, 72); g.fillStyle = '#0d1a2a'; g.font = '700 22px sans-serif'; g.fillText('Fripe', 34, 182); g.fillRect(34, 192, 70, 3); g.fillRect(34, 200, 50, 3); g.fillRect(34, 208, 62, 3); }
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; };
  const kt = kraft(true), kt2 = kraft(false);
  const box = (w, h, d, tex, x, y, z, ry, neon) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshStandardMaterial({ color: col(0x141a3a), roughness: .38, metalness: .75, emissive: col(neon || M), emissiveIntensity: .16 })); m.position.set(x, y, z); m.rotation.y = ry || 0; edges(m, neon || M, .95); const tape = new T.Mesh(new T.BoxGeometry(w * 1.015, h * 1.015, d * .12), nb(neon || M)); m.add(tape); const core = new T.Mesh(new T.BoxGeometry(w * .5, h * .5, d * .5), new T.MeshBasicMaterial({ color: col(neon || M), transparent: true, opacity: .3 })); m.add(core); return m; };

  /* scènes (z de chaque scène, x de base : côté opposé au texte) */
  const Z = [0, -34, -68, -102, -136, -172], BX = [3.6, 3.8, -3.8, 3.8, 0, 0];
  const groups = Z.map((z, i) => { const g = new T.Group(); g.position.set(BX[i], 0, z); scene.add(g); return g; });
  const [gA, gB, gC, gD, gE, gF] = groups;

  // A : colis, étiquette, pièces, anneaux
  const hero = new T.Group(); gA.add(hero); hero.scale.setScalar(1.35);
  const pBig = box(2.6, 1.7, 2.0, kt, -.2, -.6, 0, .45, C), pMid = box(1.7, 1.2, 1.5, kt, 1.8, -.9, 1.1, -.35, M), pSm = box(1.2, .9, 1.0, kt2, -2.2, -1.1, 1.2, .8, V), pTop = box(1.5, .9, 1.2, kt, 0, .7, .1, -.25, G);
  hero.add(pBig, pMid, pSm, pTop);
  const tag = new T.Group(); const shape = new T.Shape(); shape.moveTo(-.55, -.5); shape.lineTo(.55, -.5); shape.lineTo(.55, .3); shape.lineTo(.28, .62); shape.lineTo(-.28, .62); shape.lineTo(-.55, .3); shape.lineTo(-.55, -.5);
  const hole = new T.Path(); hole.absarc(0, .38, .09, 0, Math.PI * 2, true); shape.holes.push(hole);
  const tmesh = new T.Mesh(new T.ExtrudeGeometry(shape, { depth: .08, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 3 }), new T.MeshStandardMaterial({ color: col(M), emissive: col(M), emissiveIntensity: .9, roughness: .3 })); tag.add(tmesh);
  const price = label('45 €', 1.0, .5, '#ffffff', null, 150); price.position.set(0, -.1, .13); tag.add(price); tag.position.set(2.6, 1.7, .6); tag.rotation.z = -.28; hero.add(tag);
  const coins = []; const cmat = new T.MeshStandardMaterial({ color: col(G), emissive: col(0xff9a1f), emissiveIntensity: .75, metalness: .9, roughness: .3 });
  [[-2.8, 1.8, .4, .9], [-1.3, 2.7, -.4, .7], [3.3, -.1, 1.4, .6], [.8, 3.0, .2, .55]].forEach(([x, y, z, s]) => { const c = new T.Mesh(new T.CylinderGeometry(.5 * s, .5 * s, .09 * s, 40), cmat); c.rotation.x = Math.PI / 2; c.position.set(x, y, z); c.userData = { y, ph: Math.random() * 6 }; hero.add(c); coins.push(c); });
  const ringA = new T.Mesh(new T.TorusGeometry(4.6, .028, 8, 120), nb(M)); ringA.position.set(0, .2, -1.2); ringA.rotation.set(1.2, .2, 0); hero.add(ringA);
  const ringB = new T.Mesh(new T.TorusGeometry(5.4, .02, 8, 120), nb(C)); ringB.position.set(0, .2, -1.2); ringB.rotation.set(1.9, -.3, .5); hero.add(ringB);
  hero.add(glow(V, 12, 0, 0, -2, .55), glow(M, 6, 2, -1.5, 1, .35));
  plight(M, -5, 2, 4, 40, 26); plight(C, 8, 0, 3, 30, 26); plight(V, 0, 6, -4, 30, 26);

  // B : histogramme 3D du chiffre d'affaires
  const chartG = new T.Group(); gB.add(chartG); let bars = [], chartDisposables = [];
  const slab = new T.Mesh(new T.BoxGeometry(11.5, .2, 3.4), new T.MeshStandardMaterial({ color: col(0x10172b), roughness: .4, metalness: .6 })); slab.position.set(0, -2.75, 0); edges(slab, V, .9); gB.add(slab);
  gB.add(glow(V, 14, 0, 0, -3, .4));
  plight(V, -4, 4, 5, 34, 24); plight(C, 5, 2, 6, 24, 22); plight(M, 0, -1, 4, 16, 16);
  function setChart(data) {
    chartDisposables.forEach((o) => o.dispose && o.dispose()); chartDisposables = []; while (chartG.children.length) chartG.remove(chartG.children[0]); bars = [];
    const n = data.length, max = Math.max(1, ...data.map((d) => d.ca)), H = 5.4, gap = 11 / n;
    const pts = [];
    data.forEach((d, i) => { const t = n > 1 ? i / (n - 1) : 0, c = col(V).lerp(col(M), t); const geo = new T.BoxGeometry(gap * .62, 1, gap * .62); const mat = new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: .85, roughness: .3, metalness: .25 }); chartDisposables.push(geo, mat);
      const b = new T.Mesh(geo, mat); b.position.x = (i - (n - 1) / 2) * gap; b.userData = { h: Math.max(.18, d.ca / max * H), i }; b.scale.y = .001; chartG.add(b); bars.push(b);
      pts.push(new T.Vector3(b.position.x, -2.65 + Math.max(0, d.pr) / max * H + .15, .6)); });
    const curve = new T.CatmullRomCurve3(pts), tg = new T.TubeGeometry(curve, 80, .05, 8), tm = nb(C); chartDisposables.push(tg, tm);
    const tube = new T.Mesh(tg, tm); chartG.add(tube);
    pts.forEach((p) => { const s = new T.Mesh(new T.SphereGeometry(.1, 12, 12), nb(0xffffff)); s.position.copy(p); chartG.add(s); chartDisposables.push(s.geometry, s.material); });
    const tot = data.reduce((s, d) => s + d.ca, 0), lab = label(eur(tot) + ' sur 12 mois', 5.4, .9, '#ffffff', 'rgba(124,92,255,.55)', 54); lab.position.set(0, 3.8, 0); chartG.add(lab); chartDisposables.push(lab.geometry, lab.material.map, lab.material);
  }
  setChart(monthlyOrDemo());

  // C : tapis d'expédition, portail, remorque
  const belt = new T.Mesh(new T.BoxGeometry(15, .3, 2.6), new T.MeshStandardMaterial({ color: col(0x121a30), roughness: .35, metalness: .7 })); belt.position.set(1, -2.2, 0); edges(belt, C, .9); gC.add(belt);
  const trailer = new T.Mesh(new T.BoxGeometry(5.2, 3, 3), new T.MeshStandardMaterial({ color: col(0x161f3a), roughness: .3, metalness: .6, transparent: true, opacity: .78 })); trailer.position.set(-8.4, -.5, 0); edges(trailer, O, .95); gC.add(trailer);
  const cab = new T.Mesh(new T.BoxGeometry(1.8, 2.2, 2.7), new T.MeshStandardMaterial({ color: col(0x1d2748), roughness: .3, metalness: .7 })); cab.position.set(-12.1, -.9, 0); edges(cab, O, .95); gC.add(cab);
  const gate = new T.Mesh(new T.TorusGeometry(2, .07, 10, 80), nb(M)); gate.position.set(-3.2, -.2, 0); gate.rotation.y = Math.PI / 2; gC.add(gate);
  const gate2 = new T.Mesh(new T.TorusGeometry(2.5, .03, 8, 80), nb(C)); gate2.position.set(-3.2, -.2, 0); gate2.rotation.y = Math.PI / 2; gC.add(gate2);
  gC.add(glow(M, 7, -3.2, -.2, 0, .6), glow(O, 8, -8, 0, 0, .35));
  const pk = []; const mint = new T.MeshStandardMaterial({ color: col(0x35e0a1), emissive: col(0x35e0a1), emissiveIntensity: .8, roughness: .4 });
  for (let i = 0; i < 8; i++) { const m = box(1.1, .9, 1.0, kt2, 0, -1.55, 0, 0); m.userData = { off: i * 2.0, base: m.material }; gC.add(m); pk.push(m); }
  plight(M, -3, 2, 5, 40, 24); plight(C, 4, 3, 5, 28, 24);

  // D : bulles de messages
  const bubbles = []; const msgs = [['Dernier prix ?', V], ['Colis parti', C], ['Merci !', M], ['Toujours dispo ?', V], ['Avis laissé ★', G], ['Envoi demain', M]];
  msgs.forEach(([t, hex], i) => { const g = new T.Group(); const w = 2.2 + t.length * .17, h = 1.05;
    const body = new T.Mesh(new T.SphereGeometry(.5, 24, 16), new T.MeshStandardMaterial({ color: col(hex), emissive: col(hex), emissiveIntensity: .55, roughness: .25, metalness: .1, transparent: true, opacity: .92 })); body.scale.set(w, h, .55); g.add(body);
    const tail = new T.Mesh(new T.ConeGeometry(.28, .5, 4), body.material); tail.position.set(i % 2 ? w * .3 : -w * .3, -h * .55, 0); tail.rotation.z = i % 2 ? .5 : -.5; g.add(tail);
    const lab = label(t, w * .9, h * .62, '#ffffff', null, 64); lab.position.z = .31; g.add(lab);
    g.position.set((i % 2 ? 1 : -1) * (1 + (i % 3) * .6) + (i % 2 ? 1.6 : -1.2), -2 + i * 1.15, -i * .9); g.userData = { y: g.position.y, ph: i * 1.3 }; gD.add(g); bubbles.push(g); });
  gD.add(glow(M, 13, 0, 1, -3, .35)); plight(M, 3, 3, 5, 36, 24); plight(V, -4, 0, 5, 28, 24);

  // E : portails néon
  const gates = [[-4, M, 3.4], [-13, C, 3.8], [-22, G, 4.2]].map(([dz, hex, r], i) => { const m = new T.Mesh(new T.TorusGeometry(r, .06, 10, 100), nb(hex)); m.position.set(0, .4, dz); gE.add(m); const m2 = new T.Mesh(new T.TorusGeometry(r + .5, .02, 8, 100), nb(hex)); m2.position.set(0, .4, dz); gE.add(m2); gE.add(glow(hex, r * 3, 0, .4, dz, .3)); return [m, m2]; });
  plight(C, 0, 3, -10, 30, 30);

  // F : tourbillon de pièces
  const vortex = new T.Group(); gF.add(vortex); const vc = [];
  for (let i = 0; i < 64; i++) { const c = new T.Mesh(new T.CylinderGeometry(.34, .34, .07, 28), cmat); const a = i * .62, r = 1.6 + i * .085; c.position.set(Math.cos(a) * r, (i - 32) * .06, Math.sin(a) * r - 2); c.rotation.x = Math.PI / 2 + Math.random(); c.userData = { a, r, y: (i - 32) * .06, s: .5 + Math.random() }; vortex.add(c); vc.push(c); }
  gF.add(glow(G, 16, 0, 0, -3, .5), glow(M, 22, 0, 0, -6, .3)); plight(G, 0, 2, 3, 40, 28); plight(M, 5, -1, 2, 24, 24);

  /* post-traitement */
  let composer = null, bloom = null;
  if (hasComp) {
    composer = new T.EffectComposer(renderer); composer.addPass(new T.RenderPass(scene, cam));
    bloom = new T.UnrealBloomPass(new T.Vector2(512, 512), .7, .6, .55); composer.addPass(bloom);
    composer.addPass(new T.ShaderPass(T.GammaCorrectionShader));
  }
  let W = 1, H = 1, aspect = 1;
  function size() { W = innerWidth; H = innerHeight; aspect = W / H; renderer.setPixelRatio(pr); renderer.setSize(W, H, false); if (composer) { composer.setPixelRatio(pr); composer.setSize(W, H); } cam.aspect = aspect; cam.fov = aspect < .8 ? 62 : 50; cam.updateProjectionMatrix(); layout(); }
  function layout() { const mob = aspect < 1.05; groups.forEach((g, i) => { g.position.x = BX[i] * (mob ? .25 : 1); g.position.y = mob ? 2.2 : 0; g.scale.setScalar(mob ? .72 : 1); }); }

  /* scroll -> caméra */
  const ids = ['s-hero', 'f-ca', 'f-cmd', 'f-msg', 'f-how', 's-cta'], camZ = Z.map((z) => z + 14), cents = [];
  function measure() { cents.length = 0; ids.forEach((id) => { const el = document.getElementById(id); if (!el) { cents.push(null); return; } const r = el.getBoundingClientRect(); cents.push(r.top + scrollY + r.height / 2); }); }
  const sm = (x) => x * x * (3 - 2 * x);
  function target() {
    if (cents.some((c) => c === null) || !cents.length) return { z: camZ[0], vis: [1, 0, 0, 0, 0, 0] };
    const vc = scrollY + innerHeight / 2; let i = 0; while (i < cents.length - 1 && vc >= cents[i + 1]) i++;
    if (vc <= cents[0]) return { z: camZ[0], vis: [1, 0, 0, 0, 0, 0] };
    if (i >= cents.length - 1) return { z: camZ[camZ.length - 1], vis: [0, 0, 0, 0, 0, 1] };
    const f = Math.min(1, Math.max(0, (vc - cents[i]) / (cents[i + 1] - cents[i]))), e = sm(f);
    const vis = [0, 0, 0, 0, 0, 0]; vis[i] = 1 - e; vis[i + 1] = e;
    return { z: camZ[i] + (camZ[i + 1] - camZ[i]) * e, vis };
  }
  let cz = camZ[0], mx = 0, my = 0, tm = 0, visS = [1, 0, 0, 0, 0, 0], slow = 0, frames = 0, run = true, last = performance.now();
  addEventListener('pointermove', (e) => { mx = (e.clientX / innerWidth - .5) * 2; my = (e.clientY / innerHeight - .5) * 2; }, { passive: true });
  addEventListener('resize', () => { size(); measure(); });
  document.addEventListener('visibilitychange', () => { run = !document.hidden; });

  function draw(dt) {
    tm += dt; const tg = target(); cz += (tg.z - cz) * Math.min(1, dt * 3.2); if (reduce) cz = tg.z;
    visS = visS.map((v, i) => v + (tg.vis[i] - v) * Math.min(1, dt * 4));
    cam.position.set(mx * .7, 1.5 - my * .4 + Math.sin(tm * .4) * .15, cz); cam.lookAt(mx * .5, .2 - my * .2, cz - 18);
    // A
    hero.rotation.y = Math.sin(tm * .35) * .3 + mx * .15; hero.position.y = Math.sin(tm * .8) * .12;
    pTop.position.y = .7 + Math.sin(tm * 1.2) * .1; tag.rotation.y = Math.sin(tm * .9) * .4; tag.position.y = 1.7 + Math.sin(tm * 1.1) * .15;
    coins.forEach((c) => { c.rotation.z += dt * 1.8; c.position.y = c.userData.y + Math.sin(tm * 1.3 + c.userData.ph) * .18; });
    ringA.rotation.z += dt * .35; ringB.rotation.z -= dt * .28; ringB.rotation.x += dt * .05;
    // B
    const vb = visS[1]; bars.forEach((b) => { const s = sm(Math.min(1, Math.max(0, vb * 1.6 - b.userData.i * .045))); const h = Math.max(.001, b.userData.h * s); b.scale.y = h; b.position.y = -2.65 + h / 2; });
    chartG.rotation.y = Math.sin(tm * .3) * .12 - .25;
    // C
    pk.forEach((m) => { const x = ((tm * 1.7 + m.userData.off) % 16) - 8 + 3; m.position.x = x; m.visible = x > -6.2; const passed = x < -3.2; m.material = passed ? mint : m.userData.base; m.rotation.y = Math.sin(tm + m.userData.off) * .1; });
    gate.rotation.x += dt * .6; gate2.rotation.x -= dt * .4;
    // D
    bubbles.forEach((g) => { g.position.y = g.userData.y + Math.sin(tm * 1.1 + g.userData.ph) * .18; g.rotation.y = Math.sin(tm * .6 + g.userData.ph) * .18; });
    // E
    gates.forEach(([a, b], i) => { a.rotation.z += dt * (.3 + i * .1); b.rotation.z -= dt * .2; });
    // F
    vortex.rotation.y += dt * .25; vc.forEach((c) => { c.rotation.z += dt * c.userData.s * 2; });
    // lumières selon proximité
    lights.forEach((l) => { const near = Math.max(...visS.map((v, i) => Math.abs(l.position.z - Z[i]) < 12 ? v : 0)); l.intensity = l.userData.i * (.25 + .75 * near); });
    groups.forEach((g, i) => { g.visible = visS[i] > .02 || Math.abs(cz - camZ[i]) < 30; });
    dust.rotation.y = tm * .01;
    if (bloom) bloom.strength = .7 + Math.sin(tm * .8) * .06;
    composer ? composer.render() : renderer.render(scene, cam);
  }
  size(); measure(); setTimeout(measure, 400); setTimeout(measure, 1500);
  addEventListener('load', measure);
  if (reduce) { addEventListener('scroll', () => draw(0.016), { passive: true }); draw(0.016); }
  else (function loop(n) {
    requestAnimationFrame(loop); const dt = Math.min(.05, (n - last) / 1000); last = n;
    if (!run || !document.body.classList.contains('landing')) return;
    draw(dt);
    frames++; if (dt > 1 / 28) slow++; if (frames === 90) { if (slow > 45 && pr > 1) { pr = 1; size(); } else if (slow > 70 && bloom) { composer = null; bloom = null; renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; } frames = 0; slow = 0; }
  })(last);
  return { setChart, measure };
}
function monthlyOrDemo() { return S ? monthly(12) : Array.from({ length: 12 }, (_, i) => ({ label: '', ca: 80 + i * 20, pr: 40 + i * 9 })); }

/* ---------------- animations d'entrée ---------------- */
function intro() {
  if (reduce || !window.gsap) return;
  gsap.from('.hero .hl', { y: 60, duration: 1, stagger: .12, ease: 'power4.out', clearProps: 'transform' });
  gsap.from('.hero .lead, .hero .cta-row, .hero .eyebrow', { y: 24, duration: .8, stagger: .08, delay: .3, ease: 'power2.out', clearProps: 'transform' });
  gsap.from('.chip3d', { scale: .7, duration: .7, delay: .9, stagger: .15, ease: 'back.out(2)', clearProps: 'transform' });
  if (window.ScrollTrigger) $$('.rv').forEach((el) => gsap.from(el, { y: 60, duration: 1, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: el, start: 'top 92%', once: true } }));
}

(async () => {
  if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  await boot();
  SCENE = scene3d(); intro(); route();
  window.__fripeDemo = () => !!(S && S.demo);
  window.addEventListener('fripe:import', (e) => { if (!S) return; e.detail.handled = true; S = e.detail.apply(S); save(true); route(); toast('Import terminé'); });
  window.__fripe = { get S() { return S; }, route, advance, get scene() { return SCENE; } };
})();
})();
