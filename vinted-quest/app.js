'use strict';

/* ---------- Constantes ---------- */
const CATS = {
  vetements: ['Vêtements', '👕'], chaussures: ['Chaussures', '👟'], accessoires: ['Accessoires', '👜'],
  jeux: ['Jeux & consoles', '🎮'], livres: ['Livres & médias', '📚'], maison: ['Maison', '🏠'],
  jouets: ['Jouets', '🧸'], autre: ['Autre', '📦'],
};
const STATUS = { stock: 'En stock', en_vente: 'En vente', vendu: 'Vendu' };
const LEVELS = [
  { min: 0, name: 'Petit étal', icon: '🧺' }, { min: 50, name: 'Stand de marché', icon: '🛍️' },
  { min: 150, name: 'Boutique', icon: '🏪' }, { min: 400, name: 'Grande boutique', icon: '🏬' },
  { min: 1000, name: 'Enseigne', icon: '🏢' },
];

/* ---------- Utilitaires ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const pad = (n) => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const monthKey = (d) => d.slice(0, 7);
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const cat = (k) => CATS[k] || CATS.autre;

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ---------- Stockage : local (démo) ou Supabase (en ligne) ---------- */
const cfg = window.VQ_CONFIG || {};
const online = !!(cfg.supabaseUrl && cfg.supabaseKey && window.supabase);
const sb = online ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey) : null;

const nullIfEmpty = (v) => (v ? v : null);
const toRow = (i) => ({
  title: i.title, category: i.category, buy_price: i.buyPrice, buy_date: nullIfEmpty(i.buyDate),
  location: i.location, status: i.status, list_price: i.listPrice, listed_at: nullIfEmpty(i.listedAt),
  sold_price: i.soldPrice, sold_at: nullIfEmpty(i.soldAt), shipping_cost: i.shipping, other_fees: i.fees, notes: i.notes,
});
const fromRow = (r) => ({
  id: r.id, title: r.title, category: r.category, buyPrice: Number(r.buy_price), buyDate: r.buy_date || '',
  location: r.location || '', status: r.status, listPrice: Number(r.list_price), listedAt: r.listed_at || '',
  soldPrice: Number(r.sold_price), soldAt: r.sold_at || '', shipping: Number(r.shipping_cost), fees: Number(r.other_fees),
  notes: r.notes || '',
});

const local = {
  _get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  _set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { toast('Stockage local indisponible'); } },
  async list() { return this._get('vq_items', []); },
  async save(it) {
    const all = await this.list();
    if (!it.id) { it = { ...it, id: newId() }; all.push(it); }
    else { const i = all.findIndex((x) => x.id === it.id); if (i >= 0) all[i] = it; else all.push(it); }
    this._set('vq_items', all);
    return it;
  },
  async remove(id) { this._set('vq_items', (await this.list()).filter((x) => x.id !== id)); },
  async getGoal() { return this._get('vq_goal', 100); },
  async setGoal(n) { this._set('vq_goal', n); },
  async getGame() { return this._get('vq_game', {}); },
  async setGame(g) { this._set('vq_game', g); },
};

const remote = {
  async list() {
    const { data, error } = await sb.from('vinted_items').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(fromRow);
  },
  async save(it) {
    const row = toRow(it);
    const q = it.id ? sb.from('vinted_items').update(row).eq('id', it.id) : sb.from('vinted_items').insert(row);
    const { data, error } = await q.select().single();
    if (error) throw error;
    return fromRow(data);
  },
  async remove(id) {
    const { error } = await sb.from('vinted_items').delete().eq('id', id);
    if (error) throw error;
  },
  async getGoal() {
    const { data, error } = await sb.from('vinted_settings').select('monthly_goal').maybeSingle();
    if (error) throw error;
    return data ? Number(data.monthly_goal) : 100;
  },
  async setGoal(n) {
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from('vinted_settings').upsert({ user_id: user.id, monthly_goal: n });
    if (error) throw error;
  },
  async getGame() {
    const { data, error } = await sb.from('vinted_settings').select('game').maybeSingle();
    if (error) throw error;
    return (data && data.game) || {};
  },
  async setGame(g) {
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from('vinted_settings').upsert({ user_id: user.id, game: g });
    if (error) throw error;
  },
};
const store = online ? remote : local;

/* ---------- Calculs ---------- */
const profitOf = (i) => (i.status === 'vendu' ? i.soldPrice - i.buyPrice - i.shipping - i.fees : 0);

function computeStats(items) {
  const sold = items.filter((i) => i.status === 'vendu' && i.soldAt);
  const unsold = items.filter((i) => i.status !== 'vendu');
  const totalProfit = sold.reduce((s, i) => s + profitOf(i), 0);
  const nowKey = monthKey(today());
  const monthProfit = sold.filter((i) => monthKey(i.soldAt) === nowKey).reduce((s, i) => s + profitOf(i), 0);

  const months = [];
  const d = new Date();
  for (let k = 5; k >= 0; k--) {
    const m = new Date(d.getFullYear(), d.getMonth() - k, 1);
    const key = `${m.getFullYear()}-${pad(m.getMonth() + 1)}`;
    months.push({
      key, label: m.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
      profit: sold.filter((i) => monthKey(i.soldAt) === key).reduce((s, i) => s + profitOf(i), 0),
    });
  }

  const durations = sold.map((i) => { const start = i.listedAt || i.buyDate; return start ? daysBetween(start, i.soldAt) : null; })
    .filter((n) => n !== null && n >= 0);
  const avgDays = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

  const byCat = {};
  sold.forEach((i) => { const c = (byCat[i.category] ||= { profit: 0, count: 0 }); c.profit += profitOf(i); c.count++; });
  const cats = Object.entries(byCat).sort((a, b) => b[1].profit - a[1].profit);

  return { totalProfit, monthProfit, months, avgDays, cats, stockValue: unsold.reduce((s, i) => s + i.buyPrice, 0), unsold };
}

/* ---------- État ---------- */
const state = { items: [], goal: 100, game: {}, tab: 'home', filter: 'all', q: '', user: null };

/* ---------- Jeu : la boutique virtuelle ---------- */
const SHOP_ITEMS = [
  { id: 'shelf2', name: 'Étagère n°2', icon: '🗄️', price: 25, desc: '+5 places en vitrine' },
  { id: 'plant', name: 'Plante verte', icon: '🪴', price: 20, desc: 'Ça fait plus accueillant' },
  { id: 'radio', name: 'Radio', icon: '📻', price: 35, desc: 'De la musique en boutique' },
  { id: 'shelf3', name: 'Étagère n°3', icon: '🗄️', price: 60, desc: '+5 places en vitrine', requires: 'shelf2' },
  { id: 'neon', name: 'Néon', icon: '💡', price: 50, desc: 'Ta boutique brille le soir' },
  { id: 'cat', name: 'Chat de boutique', icon: '🐈', price: 70, desc: '+1 client par jour' },
  { id: 'cashier', name: 'Caisse enregistreuse', icon: '🧾', price: 90, desc: 'Chaque client rapporte 3 🪙 au lieu de 2' },
  { id: 'shelf4', name: 'Étagère n°4', icon: '🗄️', price: 120, desc: '+5 places en vitrine', requires: 'shelf3' },
  { id: 'trophy', name: 'Trophée', icon: '🏆', price: 150, desc: 'Pour la gloire' },
];
const SHOP_BY_ID = Object.fromEntries(SHOP_ITEMS.map((x) => [x.id, x]));
const SHELVES = ['shelf2', 'shelf3', 'shelf4'];

// Pièces : 5 par vente + 1 par euro de bénéfice, plus quêtes et clients servis, moins les achats.
function gameCoins(items, g) {
  const fromSales = items.filter((i) => i.status === 'vendu').reduce((s, i) => s + 5 + Math.max(0, Math.round(profitOf(i))), 0);
  const fromQuests = Object.values(g.claimed || {}).reduce((s, v) => s + (Number(v) || 0), 0);
  const earned = fromSales + fromQuests + (Number(g.clientCoins) || 0);
  const spent = (g.owned || []).reduce((s, id) => s + (SHOP_BY_ID[id] ? SHOP_BY_ID[id].price : 0), 0);
  return { earned, spent, balance: Math.max(0, earned - spent) };
}

function weekStart() {
  const d = new Date(), m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  return `${m.getFullYear()}-${pad(m.getMonth() + 1)}-${pad(m.getDate())}`;
}

function gameQuests() {
  const t = today(), w = weekStart(), items = state.items;
  const monthProfit = computeStats(items).monthProfit;
  return [
    { key: `d-${t}-add`, tag: 'Jour', label: 'Ajouter un article acheté aujourd’hui', cur: items.filter((i) => i.buyDate === t).length, goal: 1, reward: 5 },
    { key: `w-${w}-list`, tag: 'Semaine', label: 'Mettre 3 articles en vente cette semaine', cur: items.filter((i) => i.status !== 'stock' && i.listedAt && i.listedAt >= w).length, goal: 3, reward: 15 },
    { key: `w-${w}-sell`, tag: 'Semaine', label: 'Faire 2 ventes cette semaine', cur: items.filter((i) => i.status === 'vendu' && i.soldAt >= w).length, goal: 2, reward: 20 },
    { key: `m-${monthKey(t)}-goal`, tag: 'Mois', label: 'Atteindre ton objectif du mois', cur: Math.max(0, Math.round(monthProfit)), goal: Math.max(1, Math.round(state.goal)), reward: 50 },
  ];
}

const customersToday = (g) => 3 + ((g.owned || []).includes('cat') ? 1 : 0);

async function saveGame() {
  try { await store.setGame(state.game); } catch (e) { toast('Sauvegarde du jeu impossible : ' + (e.message || e)); }
}

async function gameAction(action, el) {
  const g = (state.game = { owned: [], claimed: {}, ...state.game });
  if (action === 'buy') {
    const it = SHOP_BY_ID[el.dataset.id];
    if (!it || g.owned.includes(it.id) || (it.requires && !g.owned.includes(it.requires))) return;
    if (gameCoins(state.items, g).balance < it.price) return toast('Pas assez de pièces');
    g.owned = [...g.owned, it.id];
    toast(`${it.icon} ${it.name} installé !`);
  } else if (action === 'claim') {
    const q = gameQuests().find((x) => x.key === el.dataset.key);
    if (!q || g.claimed[q.key] || q.cur < q.goal) return;
    g.claimed = { ...g.claimed, [q.key]: q.reward };
    toast(`Quête accomplie : +${q.reward} 🪙`);
  } else if (action === 'serve') {
    if (!state.items.some((i) => i.status !== 'vendu')) return toast('Ta vitrine est vide : ajoute des articles pour attirer des clients');
    const t = today();
    if (g.servedDate !== t) { g.servedDate = t; g.servedN = 0; }
    if (g.servedN >= customersToday(g)) return;
    const gain = g.owned.includes('cashier') ? 3 : 2;
    g.servedN++;
    g.clientCoins = (Number(g.clientCoins) || 0) + gain;
    toast(`Client servi : +${gain} 🪙`);
  }
  render();
  await saveGame();
}

/* ---------- Rendu ---------- */
function renderAuth(error = '') {
  $('#app').innerHTML = `
    <form class="auth card" id="auth-form">
      <h1>Vinted <span style="color:var(--accent)">Quest</span></h1>
      <p class="muted">Connecte-toi pour retrouver tes articles partout.</p>
      <label>Email<input name="email" type="email" required autocomplete="email"></label>
      <label>Mot de passe<input name="password" type="password" required minlength="6" autocomplete="current-password"></label>
      <div class="err" id="auth-err">${esc(error)}</div>
      <button class="btn primary" data-action="login" type="submit">Se connecter</button>
      <button class="btn" data-action="signup" type="button">Créer un compte</button>
    </form>`;
}

function chartSVG(months) {
  const W = 300, H = 120, top = 16, left = 6, bw = 32, step = (W - left * 2) / months.length;
  const vals = months.map((m) => m.profit);
  const maxV = Math.max(0, ...vals), minV = Math.min(0, ...vals), range = maxV - minV || 1;
  const y = (v) => top + (maxV - v) / range * H;
  const bars = months.map((m, i) => {
    const x = left + i * step + (step - bw) / 2;
    const y1 = y(Math.max(m.profit, 0)), y2 = y(Math.min(m.profit, 0));
    const h = Math.max(m.profit === 0 ? 0 : 2, y2 - y1);
    const cls = m.profit < 0 ? 'neg-bar' : 'pos-bar';
    const ty = m.profit < 0 ? y1 + h + 11 : y1 - 4;
    return `<rect class="${cls}" x="${x}" y="${y1}" width="${bw}" height="${h}" rx="4"/>
      <text class="val" x="${x + bw / 2}" y="${ty}">${m.profit ? Math.round(m.profit) : ''}</text>
      <text x="${x + bw / 2}" y="${top + H + 28}">${esc(m.label)}</text>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${top + H + 36}" role="img" aria-label="Bénéfice par mois">
    <line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}"/>${bars}</svg>`;
}

function renderHome() {
  const s = computeStats(state.items);
  const pct = state.goal > 0 ? Math.max(0, Math.min(100, (s.monthProfit / state.goal) * 100)) : 0;
  const now = new Date();
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  const reached = state.goal > 0 && s.monthProfit >= state.goal;
  const msg = reached
    ? 'Défi réussi 🎉 Tout ce que tu gagnes en plus est du bonus.'
    : `Encore ${eur(Math.max(0, state.goal - s.monthProfit))} à gagner · ${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}`;

  let li = 0;
  LEVELS.forEach((l, i) => { if (s.totalProfit >= l.min) li = i; });
  const lvl = LEVELS[li], next = LEVELS[li + 1];
  const lvlPct = next ? Math.min(100, ((s.totalProfit - lvl.min) / (next.min - lvl.min)) * 100) : 100;
  const shown = s.unsold.slice(0, 20);
  const vitrine = shown.length
    ? shown.map((i) => `<span title="${esc(i.title)}">${cat(i.category)[1]}</span>`).join('') +
      (s.unsold.length > shown.length ? `<span class="more">+${s.unsold.length - shown.length}</span>` : '')
    : '<p class="muted" style="margin:0">Ta vitrine est vide : ajoute un article pour la remplir.</p>';

  const catsHTML = s.cats.length
    ? `<ul class="cats">${s.cats.map(([k, v]) => `<li><span>${cat(k)[1]} ${esc(cat(k)[0])} <span class="muted">· ${v.count} vente${v.count > 1 ? 's' : ''}</span></span>
        <b class="${v.profit < 0 ? 'neg' : 'pos'}">${eur(v.profit)}</b></li>`).join('')}</ul>`
    : '<p class="muted" style="margin:0">Pas encore de vente enregistrée.</p>';

  return `
  <div class="grid kpis">
    <div class="card kpi"><div class="v ${s.totalProfit < 0 ? 'neg' : ''}">${eur(s.totalProfit)}</div><div class="l">Bénéfice total</div></div>
    <div class="card kpi"><div class="v ${s.monthProfit < 0 ? 'neg' : ''}">${eur(s.monthProfit)}</div><div class="l">Ce mois-ci</div></div>
    <div class="card kpi"><div class="v">${s.avgDays === null ? '–' : Math.round(s.avgDays) + ' j'}</div><div class="l">Temps moyen avant vente</div></div>
    <div class="card kpi"><div class="v">${eur(s.stockValue)}</div><div class="l">Stock (prix d'achat)</div></div>
  </div>
  <div class="grid two" style="margin-top:12px">
    <div class="card">
      <h2>Défi du mois</h2>
      <div class="row between"><b>${eur(s.monthProfit)} <span class="muted">/ objectif</span></b>
        <input class="goal-input" id="goal" type="number" min="0" step="10" inputmode="decimal" value="${state.goal}" aria-label="Objectif du mois en euros"></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="muted">${msg}</div>
    </div>
    <div class="card">
      <h2>Ma boutique</h2>
      <div class="shop-head"><div class="shop-icon">${lvl.icon}</div>
        <div style="flex:1"><b>${lvl.name}</b>
          <div class="bar" style="margin:6px 0 2px"><i style="width:${lvlPct}%"></i></div>
          <div class="muted">${next ? `Prochain niveau : ${next.icon} ${next.name} à ${eur(next.min)} de bénéfice` : 'Niveau maximum atteint 👑'}</div></div></div>
      <div class="vitrine">${vitrine}</div>
    </div>
  </div>
  <div class="grid two" style="margin-top:12px">
    <div class="card"><h2>Bénéfice par mois</h2>${chartSVG(s.months)}</div>
    <div class="card"><h2>Meilleures catégories</h2>${catsHTML}</div>
  </div>`;
}

function renderItems() {
  const q = state.q.trim().toLowerCase();
  const list = state.items
    .filter((i) => state.filter === 'all' || i.status === state.filter)
    .filter((i) => !q || `${i.title} ${i.location} ${cat(i.category)[0]}`.toLowerCase().includes(q));
  const chip = (k, label) => `<button class="chip" data-action="filter" data-v="${k}" aria-pressed="${state.filter === k}">${label}</button>`;
  const rows = list.map((i) => {
    const p = profitOf(i);
    const right = i.status === 'vendu'
      ? `<div class="${p < 0 ? 'neg' : 'pos'}"><b>${p >= 0 ? '+' : ''}${eur(p)}</b></div><div class="s">vendu ${eur(i.soldPrice)}</div>`
      : `<div><b>${eur(i.buyPrice)}</b></div><div class="s">${i.listPrice ? 'visé ' + eur(i.listPrice) : 'acheté'}</div>`;
    return `<div class="item" data-action="edit" data-id="${esc(i.id)}" role="button" tabindex="0">
      <div class="emoji">${cat(i.category)[1]}</div>
      <div style="min-width:0"><div class="t">${esc(i.title)}</div>
        <div class="s"><span class="pill ${i.status}">${STATUS[i.status]}</span>${i.location ? ' · 📍 ' + esc(i.location) : ''}</div></div>
      <div class="r">${right}</div></div>`;
  }).join('');
  return `
  <div class="toolbar">
    <input type="search" id="q" placeholder="Rechercher (titre, emplacement…)" value="${esc(state.q)}">
    <button class="btn primary" data-action="new">+ Article</button>
    <button class="btn" data-action="export">Export CSV</button>
  </div>
  <div class="chips" style="margin-bottom:12px">${chip('all', 'Tous')}${chip('stock', 'En stock')}${chip('en_vente', 'En vente')}${chip('vendu', 'Vendus')}</div>
  <div class="list">${rows || `<div class="empty card">${state.items.length ? 'Aucun article ne correspond.' : 'Aucun article pour l’instant.<br>Ajoute ton premier achat avec « + Article ».'}</div>`}</div>`;
}

function renderGame() {
  const g = state.game, own = new Set(g.owned || []);
  const coins = gameCoins(state.items, g).balance;
  const shelves = 1 + SHELVES.filter((id) => own.has(id)).length;
  const stock = state.items.filter((i) => i.status !== 'vendu');
  const rows = Array.from({ length: shelves }, (_, r) => `<div class="shelf">${Array.from({ length: 5 }, (_, k) => {
    const it = stock[r * 5 + k];
    return it ? `<span class="slot" title="${esc(it.title)}">${cat(it.category)[1]}</span>` : '<span class="slot empty"></span>';
  }).join('')}</div>`).join('');
  const reserve = Math.max(0, stock.length - shelves * 5);
  const decor = SHOP_ITEMS.filter((x) => !SHELVES.includes(x.id) && own.has(x.id)).map((x) => `<span title="${esc(x.name)}">${x.icon}</span>`).join('');

  const served = g.servedDate === today() ? (g.servedN || 0) : 0;
  const left = Math.max(0, customersToday(g) - served);
  const faces = ['🧑', '👩', '🧔', '👵'];
  const customers = left
    ? Array.from({ length: left }, (_, k) => `<button class="cust" data-action="serve" title="Servir ce client" aria-label="Servir un client"><span class="face">${faces[(served + k) % faces.length]}</span></button>`).join('')
    : '<span class="muted">Plus de clients aujourd’hui, reviens demain 🌙</span>';

  const quests = gameQuests().map((q) => {
    const done = q.cur >= q.goal, claimed = q.key in (g.claimed || {});
    const pct = Math.min(100, (q.cur / q.goal) * 100);
    const btn = claimed ? '<span class="pill vendu">✓ Fait</span>'
      : done ? `<button class="btn small primary" data-action="claim" data-key="${esc(q.key)}">+${q.reward} 🪙</button>`
      : `<span class="muted">${q.cur}/${q.goal} · +${q.reward} 🪙</span>`;
    return `<div class="quest"><div style="flex:1;min-width:0"><div><span class="pill">${q.tag}</span> ${esc(q.label)}</div>
      <div class="bar" style="height:6px;margin:6px 0 0"><i style="width:${pct}%"></i></div></div>${btn}</div>`;
  }).join('');

  const shop = SHOP_ITEMS.map((x) => {
    const owned = own.has(x.id), locked = x.requires && !own.has(x.requires);
    const btn = owned ? '<span class="pill vendu">✓ Installé</span>'
      : locked ? `<span class="muted">🔒 ${esc(SHOP_BY_ID[x.requires].name)} d’abord</span>`
      : `<button class="btn small ${coins >= x.price ? 'primary' : ''}" data-action="buy" data-id="${x.id}" ${coins >= x.price ? '' : 'disabled'}>${x.price} 🪙</button>`;
    return `<div class="quest"><div class="emoji" style="font-size:24px">${x.icon}</div>
      <div style="flex:1;min-width:0"><b>${esc(x.name)}</b><div class="muted">${esc(x.desc)}</div></div>${btn}</div>`;
  }).join('');

  return `
  <div class="card row between" style="margin-bottom:12px">
    <div><div class="coins">🪙 ${coins}</div><div class="muted">5 🪙 par vente + 1 🪙 par euro de bénéfice</div></div>
    <input class="goal-input" id="shopname" style="width:150px;text-align:left" maxlength="28" value="${esc(g.name || 'Ma boutique')}" aria-label="Nom de la boutique">
  </div>
  <div class="grid two">
    <div class="scene">
      <div class="sign">🏪 ${esc(g.name || 'Ma boutique')}</div>
      ${rows}
      ${reserve ? `<div class="muted" style="text-align:center">+${reserve} article${reserve > 1 ? 's' : ''} en réserve (achète une étagère)</div>` : ''}
      <div class="decor">${decor || '<span class="muted">Achète des décorations ci-contre</span>'}</div>
      <div class="customers">${customers}</div>
    </div>
    <div class="grid" style="align-content:start">
      <div class="card"><h2>Quêtes</h2><div class="list">${quests}</div></div>
      <div class="card"><h2>Magasin</h2><div class="list">${shop}</div></div>
    </div>
  </div>`;
}

function render() {
  const tabs = [['home', '🏪 Accueil'], ['items', '📦 Articles'], ['game', '🎮 Jeu']];
  $('#app').innerHTML = `<div class="wrap">
    <header class="top"><div class="brand">Vinted <span>Quest</span></div>
      ${online ? '<button class="btn small" data-action="logout">Déconnexion</button>' : ''}</header>
    ${online ? '' : '<div class="banner">Mode démo : tes données restent sur cet appareil et ce navigateur.</div>'}
    <nav class="tabs">${tabs.map(([k, l]) => `<button data-action="tab" data-v="${k}" aria-selected="${state.tab === k}">${l}</button>`).join('')}</nav>
    ${state.tab === 'home' ? renderHome() : state.tab === 'game' ? renderGame() : renderItems()}
  </div>
  <button class="fab" data-action="quick" aria-label="Ajout rapide d’un article" title="Ajout rapide">＋</button>`;
}

/* ---------- Formulaire article ---------- */
function openItem(id, preset = {}) {
  const base = id ? state.items.find((x) => x.id === id) : {
    title: '', category: 'vetements', buyPrice: '', buyDate: today(), location: '', status: 'stock',
    listPrice: '', listedAt: '', soldPrice: '', soldAt: '', shipping: '', fees: '', notes: '',
  };
  const it = { ...base, ...preset };
  const v = (x) => esc(x === 0 || x === undefined ? '' : x);
  const dlg = $('#dlg');
  dlg.innerHTML = `<form method="dialog" id="item-form" data-id="${esc(id || '')}">
    <h3>${id ? 'Modifier l’article' : 'Nouvel article'}</h3>
    <label>Titre<input name="title" required value="${esc(it.title)}" placeholder="Ex : Veste Levi's taille M"></label>
    <div class="f2">
      <label>Catégorie<select name="category">${Object.entries(CATS).map(([k, [n, e]]) => `<option value="${k}" ${it.category === k ? 'selected' : ''}>${e} ${n}</option>`).join('')}</select></label>
      <label>Statut<select name="status">${Object.entries(STATUS).map(([k, n]) => `<option value="${k}" ${it.status === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    </div>
    <div class="f2">
      <label>Prix d’achat (€)<input name="buyPrice" type="number" step="0.01" min="0" inputmode="decimal" value="${v(it.buyPrice)}"></label>
      <label>Date d’achat<input name="buyDate" type="date" value="${esc(it.buyDate)}"></label>
    </div>
    <label>Emplacement (où il est rangé)<input name="location" value="${esc(it.location)}" placeholder="Ex : boîte bleue, étagère 2"></label>
    <div class="f2 hidden" data-when="en_vente vendu">
      <label>Prix de mise en vente (€)<input name="listPrice" type="number" step="0.01" min="0" inputmode="decimal" value="${v(it.listPrice)}"></label>
      <label>Mis en vente le<input name="listedAt" type="date" value="${esc(it.listedAt)}"></label>
    </div>
    <div class="f2 hidden" data-when="vendu">
      <label>Prix de vente (€)<input name="soldPrice" type="number" step="0.01" min="0" inputmode="decimal" value="${v(it.soldPrice)}"></label>
      <label>Vendu le<input name="soldAt" type="date" value="${esc(it.soldAt)}"></label>
      <label>Frais d’envoi payés (€)<input name="shipping" type="number" step="0.01" min="0" inputmode="decimal" value="${v(it.shipping)}"></label>
      <label>Autres frais (€)<input name="fees" type="number" step="0.01" min="0" inputmode="decimal" value="${v(it.fees)}"></label>
    </div>
    <label>Notes<textarea name="notes" rows="2">${esc(it.notes)}</textarea></label>
    <div class="actions">
      ${id ? '<button type="button" class="btn danger" data-action="delete">Supprimer</button>' : ''}
      <div class="end"><button type="button" class="btn" data-action="close">Annuler</button><button class="btn primary" type="submit">Enregistrer</button></div>
    </div></form>`;
  syncStatus();
  dlg.showModal();
}

/* ---------- Ajout rapide ---------- */
function openQuick() {
  const dlg = $('#dlg');
  dlg.innerHTML = `<form method="dialog" id="quick-form">
    <h3>⚡ Ajout rapide</h3>
    <label>Titre<input name="title" required autocomplete="off" enterkeyhint="next" placeholder="Ex : Pull Zara taille M"></label>
    <label>Prix d’achat (€)<input name="buyPrice" type="number" step="0.01" min="0" inputmode="decimal" enterkeyhint="done" placeholder="0"></label>
    <div class="chips" role="radiogroup" aria-label="Catégorie">${Object.entries(CATS).map(([k, [n, e]], i) =>
      `<label class="chip qcat"><input class="sr" type="radio" name="category" value="${k}" ${i === 0 ? 'checked' : ''}>${e} ${n}</label>`).join('')}</div>
    <label class="chip qcat" style="justify-self:start"><input class="sr" type="checkbox" name="listed">🛍️ Déjà en vente sur Vinted</label>
    <label class="hidden" id="q-listprice">Prix affiché sur Vinted (€)<input name="listPrice" type="number" step="0.01" min="0" inputmode="decimal"></label>
    <div class="actions">
      <button type="button" class="btn" data-action="close">Fermer</button>
      <div class="end"><button class="btn primary" type="submit">Ajouter</button><button class="btn" type="submit" data-next="1" style="order:-1">+ Un autre</button></div>
    </div></form>`;
  dlg.showModal();
  $('[name=title]', dlg).focus();
}

async function submitQuick(form, another) {
  const f = Object.fromEntries(new FormData(form));
  const title = (f.title || '').trim();
  if (!title) return toast('Donne un titre à l’article');
  const listed = !!f.listed;
  const it = {
    title, category: f.category || 'autre', status: listed ? 'en_vente' : 'stock', buyPrice: num(f.buyPrice), buyDate: today(),
    location: '', notes: '', listPrice: listed ? num(f.listPrice) : 0, listedAt: listed ? today() : '', soldPrice: 0, soldAt: '', shipping: 0, fees: 0,
  };
  try {
    state.items.unshift(await store.save(it));
    render();
    if (another) {
      form.elements.title.value = ''; form.elements.buyPrice.value = ''; form.elements.listPrice.value = '';
      form.elements.title.focus();
      toast(`✓ ${title} ajouté`);
    } else { $('#dlg').close(); toast('Article ajouté'); }
  } catch (e) { toast('Erreur : ' + (e.message || e)); }
}

function syncStatus() {
  const form = $('#item-form');
  if (!form) return;
  const st = form.elements.status.value;
  form.querySelectorAll('[data-when]').forEach((el) => el.classList.toggle('hidden', !el.dataset.when.split(' ').includes(st)));
}

async function submitItem(form) {
  const f = Object.fromEntries(new FormData(form));
  const title = (f.title || '').trim();
  if (!title) return toast('Donne un titre à l’article');
  const status = f.status;
  const it = {
    id: form.dataset.id || undefined, title, category: f.category, status,
    buyPrice: num(f.buyPrice), buyDate: f.buyDate || '', location: (f.location || '').trim(), notes: (f.notes || '').trim(),
    listPrice: 0, listedAt: '', soldPrice: 0, soldAt: '', shipping: 0, fees: 0,
  };
  if (status === 'en_vente' || status === 'vendu') {
    it.listPrice = num(f.listPrice);
    it.listedAt = f.listedAt || (status === 'en_vente' ? today() : '');
  }
  if (status === 'vendu') {
    if (f.soldPrice === '' || f.soldPrice === undefined) return toast('Indique le prix de vente');
    it.soldPrice = num(f.soldPrice); it.soldAt = f.soldAt || today();
    it.shipping = num(f.shipping); it.fees = num(f.fees);
  }
  try {
    const saved = await store.save(it);
    const idx = state.items.findIndex((x) => x.id === saved.id);
    const wasSold = idx >= 0 && state.items[idx].status === 'vendu';
    if (idx >= 0) state.items[idx] = saved; else state.items.unshift(saved);
    $('#dlg').close();
    render();
    toast(status === 'vendu' && !wasSold
      ? `Vendu ! ${profitOf(saved) >= 0 ? '+' : ''}${eur(profitOf(saved))} · +${5 + Math.max(0, Math.round(profitOf(saved)))} 🪙`
      : 'Article enregistré');
  } catch (e) { toast('Erreur : ' + (e.message || e)); }
}

function exportCSV() {
  const head = ['Titre', 'Catégorie', 'Statut', 'Prix achat', 'Date achat', 'Emplacement', 'Prix mise en vente', 'Mis en vente le', 'Prix vente', 'Vendu le', 'Frais envoi', 'Autres frais', 'Bénéfice', 'Notes'];
  const q = (x) => `"${String(x ?? '').replace(/"/g, '""')}"`;
  const rows = state.items.map((i) => [i.title, cat(i.category)[0], STATUS[i.status], i.buyPrice, i.buyDate, i.location, i.listPrice, i.listedAt,
    i.soldPrice, i.soldAt, i.shipping, i.fees, i.status === 'vendu' ? profitOf(i).toFixed(2) : '', i.notes].map(q).join(';'));
  const blob = new Blob(['﻿' + [head.map(q).join(';'), ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `vinted-quest-${today()}.csv` });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- Événements ---------- */
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const { action, v, id } = el.dataset;
  if (action === 'tab') { state.tab = v; render(); }
  else if (action === 'filter') { state.filter = v; render(); }
  else if (action === 'new') openItem(null);
  else if (action === 'quick') openQuick();
  else if (action === 'edit') openItem(id);
  else if (action === 'close') $('#dlg').close();
  else if (action === 'export') exportCSV();
  else if (action === 'delete') {
    const form = $('#item-form');
    if (!confirm('Supprimer cet article ?')) return;
    try {
      await store.remove(form.dataset.id);
      state.items = state.items.filter((x) => x.id !== form.dataset.id);
      $('#dlg').close(); render(); toast('Article supprimé');
    } catch (err) { toast('Erreur : ' + (err.message || err)); }
  }
  else if (action === 'logout') { await sb.auth.signOut(); renderAuth(); }
  else if (action === 'signup') authSubmit('signup');
  else if (['buy', 'claim', 'serve'].includes(action)) await gameAction(action, el);
});

document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.item[data-action=edit]')) { e.preventDefault(); openItem(e.target.dataset.id); }
});

document.addEventListener('change', async (e) => {
  if (e.target.name === 'status' && e.target.closest('#item-form')) syncStatus();
  if (e.target.name === 'listed' && e.target.closest('#quick-form')) $('#q-listprice').classList.toggle('hidden', !e.target.checked);
  if (e.target.id === 'shopname') {
    state.game = { ...state.game, name: e.target.value.trim().slice(0, 28) || 'Ma boutique' };
    render();
    await saveGame();
  }
  if (e.target.id === 'goal') {
    state.goal = Math.max(0, num(e.target.value));
    try { await store.setGoal(state.goal); } catch (err) { toast('Erreur : ' + (err.message || err)); }
    render();
  }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'q') {
    state.q = e.target.value; render();
    const q = $('#q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length);
  }
});

document.addEventListener('submit', (e) => {
  e.preventDefault();
  if (e.target.id === 'item-form') submitItem(e.target);
  else if (e.target.id === 'quick-form') submitQuick(e.target, !!(e.submitter && e.submitter.dataset.next));
  else if (e.target.id === 'auth-form') authSubmit('login');
});

async function authSubmit(mode) {
  const form = $('#auth-form');
  if (!form.reportValidity()) return;
  const creds = { email: form.elements.email.value.trim(), password: form.elements.password.value };
  const { data, error } = mode === 'signup' ? await sb.auth.signUp(creds) : await sb.auth.signInWithPassword(creds);
  if (error) return renderAuth(error.message);
  if (!data.session) return renderAuth('Compte créé : confirme ton email puis connecte-toi.');
  start();
}

/* ---------- Démarrage ---------- */
async function start() {
  try {
    if (online) {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return renderAuth();
      state.user = session.user;
    }
    [state.items, state.goal, state.game] = await Promise.all([store.list(), store.getGoal(), store.getGame().catch(() => ({}))]);
    render();
  } catch (e) {
    $('#app').innerHTML = `<div class="wrap"><div class="card"><b>Impossible de charger les données.</b><p class="muted">${esc(e.message || e)}</p></div></div>`;
  }
}
start();
