/* Import des données Vinted dans Fripe : CSV, JSON ou ZIP. Les colonnes sont devinées, l'utilisateur peut les corriger avant d'importer. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const eur = (n) => (Number(n) || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const rid = () => Math.random().toString(36).slice(2, 9);
const CARRIERS = ['Mondial Relay', 'Colissimo', 'Vinted Go', 'Chronopost', 'Autre'];

const FIELDS = [
  ['buy', 'Prix d’achat (si présent)', /purchase.?price|buy.?price|cost|cout|coût|prix.?d.?achat/i],
  ['title', 'Titre de l’article', /title|titre|item|article|product|produit|name|nom|libell|descr/i],
  ['price', 'Prix', /price|prix|amount|montant|total|sum|somme/i],
  ['date', 'Date', /date|created|creat|time|day|jour|when/i],
  ['party', 'Pseudo (acheteur ou vendeur)', /buyer|acheteur|seller|vendeur|user|pseudo|login|counterpart|partner|member|membre/i],
  ['status', 'Statut', /status|statut|state|etat|état/i],
  ['tracking', 'N° de suivi', /track|suivi|shipment|parcel|colis|waybill/i],
  ['carrier', 'Transporteur', /carrier|transporteur|courier|provider|company|soci[ée]t[ée]/i],
];
const BAD_HEADER = /(^|[._\s-])id$|_id\b|uuid|url|link|photo|image|picture|lien/i;

/* ---------- lecture des fichiers ---------- */
function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/, 1)[0] || '';
  const d = [',', ';', '\t'].map((c) => [c, first.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === d) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some((x) => x !== '')) rows.push(row); row = []; }
    else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); if (row.some((x) => x !== '')) rows.push(row); }
  const headers = (rows.shift() || []).map((h) => h.trim());
  return { headers, rows: rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()]))) };
}
function flat(o, p = '') {
  const out = {};
  for (const [k, v] of Object.entries(o || {})) {
    const key = p ? p + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v) && p.split('.').length < 3) Object.assign(out, flat(v, key));
    else out[key] = Array.isArray(v) ? v.map((x) => (typeof x === 'object' ? JSON.stringify(x) : x)).join(', ') : v;
  }
  return out;
}
function jsonTables(name, data) {
  const t = [];
  const add = (n, arr) => { if (Array.isArray(arr) && arr.length && arr.every((x) => x && typeof x === 'object')) { const rows = arr.map((x) => flat(x)); t.push({ name: n, headers: [...new Set(rows.flatMap((r) => Object.keys(r)))], rows }); } };
  if (Array.isArray(data)) add(name, data);
  else if (data && typeof data === 'object') for (const [k, v] of Object.entries(data)) { if (Array.isArray(v)) add(name + ' › ' + k, v); else if (v && typeof v === 'object') for (const [k2, v2] of Object.entries(v)) add(name + ' › ' + k + ' › ' + k2, v2); }
  return t;
}
async function readFiles(files) {
  const out = [], notes = [];
  const handle = (name, text) => {
    if (/\.json$/i.test(name)) { try { out.push(...jsonTables(name, JSON.parse(text))); } catch (e) { notes.push(name + ' : JSON illisible'); } }
    else if (/\.(csv|tsv|txt)$/i.test(name)) { const t = parseCSV(text); if (t.headers.length > 1 && t.rows.length) out.push({ name, headers: t.headers, rows: t.rows }); }
  };
  for (const f of files) {
    if (/\.zip$/i.test(f.name)) {
      if (!window.JSZip) { notes.push('Lecture des ZIP indisponible : dépose les fichiers CSV ou JSON à l’intérieur.'); continue; }
      try { const z = await JSZip.loadAsync(f); for (const e of Object.values(z.files)) { if (!e.dir && /\.(csv|tsv|json|txt)$/i.test(e.name)) handle(e.name, await e.async('string')); } }
      catch (e) { notes.push(f.name + ' : archive illisible'); }
    } else handle(f.name, await f.text());
  }
  return { tables: out, notes };
}

/* ---------- devinettes ---------- */
function guessMap(headers) {
  const used = new Set(), map = {};
  for (const [k, , re] of FIELDS) { const h = headers.find((x) => !used.has(x) && re.test(x) && (k === 'tracking' || !BAD_HEADER.test(x))); if (h) { map[k] = h; used.add(h); } }
  return map;
}
function guessRole(t) {
  const n = t.name.toLowerCase(), h = t.headers.join(' ').toLowerCase();
  if (/sold|sale|vente|sell|vendu/.test(n)) return 'sale';
  if (/purchas|bought|achat|buy|commande/.test(n)) return 'purchase';
  if (/buyer|acheteur/.test(h)) return 'sale';
  if (/seller|vendeur/.test(h)) return 'purchase';
  return '';
}
const num = (v) => {
  if (typeof v === 'number') return v;
  let t = String(v ?? '').replace(/[^\d,.\-]/g, ''); if (!t) return NaN;
  if (t.includes(',') && t.includes('.')) t = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  else if (t.includes(',')) t = t.replace(',', '.');
  return parseFloat(t);
};
function toISO(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'number' || /^\d{10,13}$/.test(String(v))) { let n = Number(v); if (n < 1e12) n *= 1000; return isoDate(new Date(n)); }
  const s = String(v).trim(); let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/); if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  const d = new Date(s); return isNaN(d) ? '' : isoDate(d);
}
const keyOf = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
function statusOf(raw, date) {
  const s = keyOf(raw);
  if (/cancel|annul|refus|refund|rembours|declin|expire/.test(s)) return 'skip';
  if (/deliver|livr|complet|finish|termin|paid|pay|conclu|done|receiv|recu/.test(s)) return 'done';
  if (/transit|ship|exped|envoy|route|dropped|depos/.test(s)) return 'transit';
  const days = date ? Math.round((Date.now() - new Date(date + 'T12:00:00')) / 864e5) : 99;
  return days > 14 ? 'done' : 'transit';
}
const carrierOf = (v) => { const s = keyOf(v); return CARRIERS.find((c) => keyOf(c) === s) || (/mondial/.test(s) ? 'Mondial Relay' : /colissimo|la poste/.test(s) ? 'Colissimo' : /vinted go/.test(s) ? 'Vinted Go' : /chrono/.test(s) ? 'Chronopost' : 'Autre'); };

/* ---------- construction de l'import ---------- */
function build(tables, opts) {
  const purchases = [], sales = []; let skipped = 0;
  const read = (t, row) => { const g = (k) => (t.map[k] ? row[t.map[k]] : ''); const price = num(g('price')); const date = toISO(g('date')); return { title: String(g('title') || '').trim(), price, date, party: String(g('party') || '').trim() || 'inconnu', status: statusOf(g('status'), date), tracking: String(g('tracking') || '').trim(), carrier: carrierOf(g('carrier')), buy: num(g('buy')) }; };
  for (const t of tables) {
    if (!t.role || !t.map.title || !t.map.price) continue;
    for (const row of t.rows) { const r = read(t, row); if (!r.title || !isFinite(r.price) || r.status === 'skip') { skipped++; continue; } (t.role === 'sale' ? sales : purchases).push(r); }
  }
  const pmap = new Map(); purchases.forEach((p) => { const k = keyOf(p.title); if (!pmap.has(k)) pmap.set(k, []); pmap.get(k).push(p); });
  const items = [], orders = []; let noBuy = 0, matched = 0;
  for (const s of sales) {
    let buy = isFinite(s.buy) && s.buy > 0 ? s.buy : 0;
    if (!buy) { const list = pmap.get(keyOf(s.title)); const p = list && list.find((x) => !x.used); if (p) { p.used = true; buy = p.price; matched++; } }
    if (!buy) noBuy++;
    const id = 'imp' + rid();
    items.push({ id, title: s.title, brand: '', cat: 'Autre', size: '', buy, list: s.price, status: 'sold', buyDate: '', listDate: '', soldDate: s.date, sold: s.price, imported: 1 });
    orders.push({ id: 'o' + rid(), kind: 'sale', itemId: id, party: s.party, price: s.price, fee: 0, status: s.status, carrier: s.carrier, tracking: s.tracking, date: s.date || isoDate(new Date()) });
  }
  for (const p of purchases) {
    orders.push({ id: 'o' + rid(), kind: 'purchase', itemId: '', title: p.title, party: p.party, price: p.price, fee: 0, status: p.status, carrier: p.carrier, tracking: p.tracking, date: p.date || isoDate(new Date()) });
    if (opts.addStock && !p.used) items.push({ id: 'imp' + rid(), title: p.title, brand: '', cat: 'Autre', size: '', buy: p.price, list: 0, status: 'stock', buyDate: p.date, listDate: '', soldDate: '', sold: 0, imported: 1 });
  }
  return { items, orders, stats: { sales: sales.length, purchases: purchases.length, skipped, noBuy, matched } };
}
function apply(state, payload, clearDemo) {
  const base = clearDemo && state.demo ? { ...state, items: [], orders: [], threads: [], demo: false } : state;
  const title = (o, items) => { const it = items.find((i) => i.id === o.itemId); return keyOf(it ? it.title : o.title); };
  const sig = (o, items) => [o.kind, o.date, o.price, keyOf(o.party), title(o, items)].join('|');
  const seen = new Set(base.orders.map((o) => sig(o, base.items)));
  const items = [...base.items], orders = [...base.orders]; let added = 0, dup = 0;
  const newItems = new Map(payload.items.map((i) => [i.id, i]));
  for (const o of payload.orders) {
    const s = sig(o, payload.items);
    if (seen.has(s)) { dup++; if (o.itemId) newItems.delete(o.itemId); continue; }
    seen.add(s); orders.push(o); added++;
  }
  for (const it of payload.items) if (newItems.has(it.id)) items.push(it);
  payload.stats.added = added; payload.stats.dup = dup;
  return { ...base, items, orders };
}
function commit(payload, clearDemo) {
  const ev = new CustomEvent('fripe:import', { detail: { apply: (st) => apply(st, payload, clearDemo), handled: false } });
  window.dispatchEvent(ev);
  if (ev.detail.blocked) return 'blocked'; // limite de la formule gratuite : l'offre Pro est affichée
  if (!ev.detail.handled) {
    let st = null; try { st = JSON.parse(localStorage.getItem('fripe-state-v1')); } catch (e) {}
    if (!st || !st.items) st = { items: [], orders: [], threads: [], profile: { name: '' }, demo: false, v: 1 };
    try { localStorage.setItem('fripe-state-v1', JSON.stringify(apply(st, payload, clearDemo))); } catch (e) {}
    return 'reload';
  }
  return 'live';
}

/* ---------- interface ---------- */
let dlg, tables = [], notes = [], opts = { addStock: true, clear: true };
function ensureDialog() {
  if (dlg) return dlg;
  const st = document.createElement('style');
  st.textContent = '#imp-dlg{width:min(760px,calc(100vw - 32px))}#imp-dlg .imp{padding:24px;display:grid;gap:16px;max-height:84vh;overflow:auto}#imp-dlg h3{font-size:24px;font-weight:800}#imp-dlg .tcard{border:1px solid var(--line);border-radius:16px;padding:14px;display:grid;gap:12px;background:color-mix(in srgb,var(--surface2) 50%,transparent)}#imp-dlg .tcard h4{margin:0;font:600 14px var(--f-body);word-break:break-all}#imp-dlg .mgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}#imp-dlg .pv{overflow-x:auto;font-size:12px}#imp-dlg .pv table{min-width:0;width:100%}#imp-dlg .pv th,#imp-dlg .pv td{padding:6px 8px;white-space:nowrap}#imp-dlg .chk{display:flex;gap:10px;align-items:flex-start;font-size:14px}#imp-dlg .warn{color:var(--warn);font-size:13px}@media(max-width:520px){#imp-dlg .mgrid{grid-template-columns:minmax(0,1fr)}}';
  document.head.appendChild(st);
  dlg = document.createElement('dialog'); dlg.id = 'imp-dlg'; dlg.innerHTML = '<div class="imp"></div>'; document.body.appendChild(dlg);
  dlg.addEventListener('click', (e) => { if (e.target.closest('[data-imp="close"]')) dlg.close(); });
  return dlg;
}
const root = () => $('.imp', ensureDialog());
function stepPick(msg) {
  root().innerHTML = `<h3>Importer mes données Vinted</h3>
    <p style="margin:0;color:var(--muted)">Demande l’export de tes données dans l’application Vinted (Paramètres, confidentialité, télécharger mes données). Dépose ensuite ici le fichier reçu : un ZIP, ou des fichiers CSV ou JSON.</p>
    <p class="note" style="margin:0">Fripe devine les colonnes et tu les vérifies avant d’importer. Le contenu du fichier reste dans ton navigateur, rien n’est envoyé ailleurs.</p>
    ${msg ? `<p class="warn" style="margin:0">${esc(msg)}</p>` : ''}
    <label class="fld">Fichier(s) Vinted<input id="imp-file" type="file" accept=".zip,.csv,.tsv,.json,.txt" multiple></label>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-imp="close" type="button">Annuler</button></div>`;
  $('#imp-file').onchange = async (e) => {
    const files = [...e.target.files]; if (!files.length) return;
    root().insertAdjacentHTML('beforeend', '<p class="note">Lecture du fichier…</p>');
    try { const r = await readFiles(files); notes = r.notes; tables = r.tables.map((t, i) => ({ ...t, id: i, role: guessRole(t), map: guessMap(t.headers) }));
      if (!tables.length) return stepPick(notes[0] || 'Aucun tableau lisible dans ce fichier. Il faut un CSV ou un JSON avec une ligne par vente ou par achat.');
      stepMap(); } catch (err) { stepPick('Lecture impossible : ' + (err.message || err)); }
  };
}
function stepMap() {
  const demo = window.__fripeDemo ? window.__fripeDemo() : true;
  const cards = tables.map((t) => {
    const sel = (k, label) => `<label class="fld">${label}<select data-t="${t.id}" data-k="${k}"><option value="">Aucune</option>${t.headers.map((h) => `<option value="${esc(h)}" ${t.map[k] === h ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select></label>`;
    const pv = t.role ? previewHTML(t) : '';
    return `<div class="tcard"><div><h4>${esc(t.name)}</h4><span class="note">${t.rows.length} ligne${t.rows.length > 1 ? 's' : ''}</span></div>
      <label class="fld">Ce tableau contient<select data-t="${t.id}" data-k="__role"><option value="">À ignorer</option><option value="sale" ${t.role === 'sale' ? 'selected' : ''}>Mes ventes</option><option value="purchase" ${t.role === 'purchase' ? 'selected' : ''}>Mes achats</option></select></label>
      ${t.role ? `<div class="mgrid">${FIELDS.map(([k, label]) => sel(k, label)).join('')}</div>${pv}` : ''}</div>`;
  }).join('');
  root().innerHTML = `<h3>Vérifie les colonnes</h3>${notes.map((n) => `<p class="warn" style="margin:0">${esc(n)}</p>`).join('')}${cards}
    ${demo ? '<label class="chk"><input id="imp-clear" type="checkbox" checked> Vider les données d’exemple avant l’import</label>' : ''}
    <label class="chk"><input id="imp-stock" type="checkbox" checked> Ajouter mes achats non revendus au stock</label>
    <p class="note" style="margin:0">Le prix d’achat d’une vente est repris de l’achat qui porte le même titre. Sans correspondance, il reste à 0 € et tu pourras le compléter dans Stock.</p>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-imp="close" type="button">Annuler</button><button class="btn primary" id="imp-go" type="button">Importer</button></div>`;
  root().onchange = (e) => {
    const s = e.target.closest('select[data-t]'); if (!s) return; const t = tables[+s.dataset.t];
    if (s.dataset.k === '__role') t.role = s.value; else if (s.value) t.map[s.dataset.k] = s.value; else delete t.map[s.dataset.k];
    const sc = root().scrollTop; stepMap(); root().scrollTop = sc;
  };
  $('#imp-go').onclick = () => {
    const ready = tables.filter((t) => t.role && t.map.title && t.map.price);
    if (!ready.length) return alertMsg('Choisis au moins un tableau « Mes ventes » ou « Mes achats » avec un titre et un prix.');
    const payload = build(tables, { addStock: $('#imp-stock').checked });
    if (!payload.items.length && !payload.orders.length) return alertMsg('Aucune ligne exploitable : vérifie les colonnes titre et prix.');
    const how = commit(payload, $('#imp-clear') ? $('#imp-clear').checked : false);
    if (how === 'blocked') { dlg.close(); return; }
    stepDone(payload.stats, how);
  };
}
function alertMsg(m) { let p = $('#imp-alert', root()); if (!p) { p = document.createElement('p'); p.id = 'imp-alert'; p.className = 'warn'; p.style.margin = '0'; root().insertBefore(p, $('#imp-go').parentElement); } p.textContent = m; }
function previewHTML(t) {
  const cols = FIELDS.filter(([k]) => t.map[k]);
  if (!cols.length) return '';
  const rows = t.rows.slice(0, 3).map((r) => `<tr>${cols.map(([k]) => `<td>${esc(String(r[t.map[k]] ?? '').slice(0, 40))}</td>`).join('')}</tr>`).join('');
  return `<div class="pv"><table><thead><tr>${cols.map(([, l]) => `<th>${esc(l.split(' (')[0])}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
}
function stepDone(s, how) {
  root().innerHTML = `<h3>Import terminé</h3>
    <div class="todo"><div class="a"><b class="num">${s.sales}</b><span>vente${s.sales > 1 ? 's' : ''} lue${s.sales > 1 ? 's' : ''}</span></div><div class="a"><b class="num">${s.purchases}</b><span>achat${s.purchases > 1 ? 's' : ''} lu${s.purchases > 1 ? 's' : ''}</span></div><div class="a"><b class="num">${s.added}</b><span>commande${s.added > 1 ? 's' : ''} ajoutée${s.added > 1 ? 's' : ''}${s.dup ? `, ${s.dup} déjà présente${s.dup > 1 ? 's' : ''}` : ''}</span></div></div>
    ${s.skipped ? `<p class="note" style="margin:0">${s.skipped} ligne${s.skipped > 1 ? 's' : ''} ignorée${s.skipped > 1 ? 's' : ''} (annulée, remboursée ou sans titre ni prix).</p>` : ''}
    ${s.noBuy ? `<p class="warn" style="margin:0">${s.noBuy} vente${s.noBuy > 1 ? 's' : ''} sans prix d’achat : ${s.noBuy > 1 ? 'elles apparaissent' : 'elle apparaît'} à 0 € dans Stock, complète ${s.noBuy > 1 ? 'les' : 'la'} pour un bénéfice juste.</p>` : ''}
    <div class="row" style="justify-content:flex-end"><button class="btn primary" id="imp-end" type="button">${how === 'reload' ? 'Voir mon espace' : 'Fermer'}</button></div>`;
  $('#imp-end').onclick = () => { dlg.close(); if (how === 'reload') { location.hash = 'tableau'; location.reload(); } };
}
function open() { ensureDialog(); tables = []; notes = []; stepPick(); dlg.showModal(); }

/* bouton dans Stock et Réglages */
function inject() {
  const main = $('#main'); if (!main) return;
  const view = (location.hash || '').slice(1);
  if (!['stock', 'reglages'].includes(view) || $('#imp-btn')) return;
  const row = $('.top .row', main); if (!row) return;
  const b = document.createElement('button'); b.id = 'imp-btn'; b.type = 'button'; b.className = 'btn'; b.textContent = 'Importer depuis Vinted'; b.onclick = open; row.prepend(b);
}
const start = () => { const main = $('#main'); if (!main) return; new MutationObserver(inject).observe(main, { childList: true }); inject(); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
window.__fripeImport = { open, parseCSV, guessMap, build, apply };
})();
