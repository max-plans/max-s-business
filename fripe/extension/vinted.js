/* Sur Vinted : pré-remplit le formulaire « Vendre un article » avec l'annonce envoyée par Fripe.
   Rien n'est publié automatiquement : l'utilisateur vérifie et clique lui-même sur « Ajouter ». */
(() => {
  const FIND = {
    title: ['input[name="title"]', '#title', '[data-testid="title--input"]', '[data-testid*="title"] input'],
    desc: ['textarea[name="description"]', '#description', '[data-testid="description--input"]', '[data-testid*="description"] textarea'],
    price: ['input[name="price"]', '#price', '[data-testid="price-input--input"]', '[data-testid*="price"] input'],
    photos: ['input[type="file"][accept*="image"]', 'input[type="file"]'],
  };
  const LABEL = { photos: 'Photos', title: 'Titre', desc: 'Description', price: 'Prix' };
  const find = (k) => { for (const s of FIND[k]) { const el = document.querySelector(s); if (el) return el; } return null; };
  const onSellPage = () => /^\/items\/new/.test(location.pathname);

  /* valeur posée comme une vraie frappe, pour que le formulaire (React) la prenne en compte */
  function setValue(el, v) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }
  async function toFile(src, i) {
    const blob = await (await fetch(src)).blob();
    const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    return new File([blob], `fripe-${i + 1}.${ext}`, { type: blob.type || 'image/jpeg' });
  }
  async function setPhotos(input, photos) {
    const dt = new DataTransfer();
    for (const [i, p] of photos.entries()) dt.items.add(await toFile(p, i));
    input.files = dt.files;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  const priceText = (n) => (/\.(co\.uk|com)$/.test(location.hostname) ? String(n) : String(n).replace('.', ','));

  async function fill(item, done) {
    const todo = { photos: (item.photos || []).length > 0, title: !!item.title, desc: !!item.desc, price: Number(item.price) > 0 };
    const start = Date.now();
    while (Object.keys(todo).some((k) => todo[k] && !done[k]) && Date.now() - start < 40000) {
      for (const k of Object.keys(todo)) {
        if (!todo[k] || done[k]) continue;
        const el = find(k); if (!el) continue;
        try {
          if (k === 'photos') await setPhotos(el, item.photos);
          else setValue(el, k === 'price' ? priceText(item.price) : k === 'title' ? item.title.slice(0, 100) : item[k]);
          done[k] = true;
        } catch (e) { done[k] = false; }
      }
      panel.paint(item, todo, done);
      await new Promise((r) => setTimeout(r, 500));
    }
    panel.paint(item, todo, done, true);
  }

  /* panneau Fripe, isolé du style de Vinted */
  const panel = (() => {
    let host, root;
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    function mount() {
      if (host && host.isConnected) return;
      host = document.createElement('div'); host.id = 'fripe-connect';
      root = host.attachShadow({ mode: 'open' });
      document.documentElement.appendChild(host);
    }
    function paint(item, todo, done, end) {
      mount();
      const rows = Object.keys(LABEL).map((k) => {
        const st = !todo[k] ? 'skip' : done[k] ? 'ok' : end ? 'ko' : 'wait';
        const txt = { ok: 'rempli', ko: 'à faire', wait: '…', skip: k === 'photos' ? 'aucune' : 'vide' }[st];
        return `<li class="${st}"><span>${LABEL[k]}${k === 'photos' && todo.photos ? ` (${item.photos.length})` : ''}</span><b>${txt}</b></li>`;
      }).join('');
      const pick = [['Catégorie', item.cat], ['Marque', item.brand], ['Taille', item.size], ['État', item.cond], ['Couleur', item.color]].filter(([, v]) => v);
      root.innerHTML = `<style>
        :host { all: initial; }
        .box { position: fixed; right: 18px; bottom: 18px; z-index: 2147483647; width: 300px; max-height: calc(100vh - 36px); overflow: auto; background: #0c0c0f; color: #f3f0ea; border: 1px solid rgba(255,255,255,.12); border-radius: 12px; box-shadow: 0 18px 50px rgba(0,0,0,.45); font: 13px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; }
        .hd { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,.08); }
        .hd b { font-size: 14px; letter-spacing: .02em; } .hd b i { font-style: normal; color: #ff2e4d; }
        .x { background: none; border: 0; color: #f3f0ea; opacity: .6; font-size: 18px; cursor: pointer; line-height: 1; }
        .bd { padding: 12px 14px; display: grid; gap: 12px; }
        ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        li { display: flex; justify-content: space-between; } li b { font-weight: 600; }
        li.ok b { color: #22d37f; } li.ko b { color: #ffb020; } li.wait b, li.skip b { color: rgba(243,240,234,.45); }
        h4 { margin: 0 0 6px; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: rgba(243,240,234,.55); font-weight: 600; }
        .pk { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 0; border-top: 1px solid rgba(255,255,255,.06); }
        .pk span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .pk small { color: rgba(243,240,234,.55); margin-right: 6px; }
        button.c { flex: none; background: rgba(255,255,255,.08); color: #f3f0ea; border: 1px solid rgba(255,255,255,.14); border-radius: 6px; padding: 3px 8px; font: inherit; font-size: 12px; cursor: pointer; }
        button.c:hover { border-color: #ff2e4d; }
        .tip { color: rgba(243,240,234,.7); font-size: 12px; } .tip b { color: #f3f0ea; }
        .again { width: 100%; background: #ff2e4d; color: #0b0b0e; border: 0; border-radius: 8px; padding: 8px; font: inherit; font-weight: 700; cursor: pointer; }
      </style>
      <div class="box" role="dialog" aria-label="Fripe Connect">
        <div class="hd"><b>FRIPE<i>·</i>CONNECT</b><button class="x" data-a="close" aria-label="Fermer">×</button></div>
        <div class="bd">
          <div><h4>Rempli automatiquement</h4><ul>${rows}</ul></div>
          ${pick.length ? `<div><h4>À choisir sur Vinted</h4>${pick.map(([k, v]) => `<div class="pk"><span><small>${k}</small>${esc(v)}</span><button class="c" data-copy="${esc(v)}">Copier</button></div>`).join('')}</div>` : ''}
          <div class="tip">${end ? 'Vérifie l’annonce, complète ce qui reste, puis clique sur <b>« Ajouter »</b> sur Vinted.' : 'Remplissage en cours…'}</div>
          ${end ? '<button class="again" data-a="again">Remplir à nouveau</button>' : ''}
        </div>
      </div>`;
      root.querySelector('[data-a="close"]').onclick = () => host.remove();
      const ag = root.querySelector('[data-a="again"]'); if (ag) ag.onclick = () => fill(item, {});
      root.querySelectorAll('[data-copy]').forEach((b) => { b.onclick = () => navigator.clipboard.writeText(b.dataset.copy).then(() => { b.textContent = 'Copié'; setTimeout(() => { b.textContent = 'Copier'; }, 1200); }); });
    }
    return { paint };
  })();

  /* Vinted change de page sans recharger : on surveille l'adresse */
  let busy = false, lastPath = '';
  async function check() {
    if (location.pathname === lastPath) return; lastPath = location.pathname;
    if (busy || !onSellPage()) return;
    busy = true;
    chrome.runtime.sendMessage({ type: 'take' }, async (res) => {
      if (!chrome.runtime.lastError && res && res.item) await fill(res.item, {});
      busy = false;
    });
  }
  check(); setInterval(check, 1000);

  /* ---------- messagerie et bordereaux : appels faits par la page Vinted elle-même, avec la session de l'utilisateur ---------- */
  const diag = [];
  // jeton anti-falsification exigé par Vinted pour envoyer : ancienne balise <meta>, sinon la config du site Next.js (« CSRF_TOKEN »)
  const CSRF_RE = /CSRF_TOKEN\\*"\s*:\s*\\*"([0-9A-Za-z-]{8,})/;
  let token = '';
  const csrf = () => {
    if (token) return token;
    const m = document.querySelector('meta[name="csrf-token"]');
    if (m && m.content) return (token = m.content);
    for (const s of document.scripts) { const x = CSRF_RE.exec(s.textContent || ''); if (x) return (token = x[1]); }
    return '';
  };
  // relit la page d'accueil : nouveau jeton, et cookies de session rafraîchis par Vinted
  async function refresh() {
    token = '';
    try { const x = CSRF_RE.exec(await (await fetch('/', { credentials: 'include' })).text()); if (x) token = x[1]; } catch (e) { /* hors ligne */ }
  }
  const anon = () => { const m = document.cookie.match(/(?:^|;\s*)anon_id=([^;]+)/); return m ? decodeURIComponent(m[1]) : ''; };
  async function call(path, opt = {}, retried = false) {
    const headers = { accept: 'application/json, text/plain, */*' };
    if (opt.body) headers['content-type'] = 'application/json';
    if (csrf()) headers['x-csrf-token'] = csrf();
    if (anon()) headers['x-anon-id'] = anon();
    const r = await fetch(path, { method: opt.method || 'GET', credentials: 'include', headers, body: opt.body ? JSON.stringify(opt.body) : undefined });
    if ((r.status === 401 || r.status === 403) && !retried) { await refresh(); return call(path, opt, true); }
    let j = null; try { j = await r.json(); } catch (e) { /* réponse non JSON */ }
    diag.push({ path: path.replace(/\d{4,}/g, '#'), status: r.status, keys: j && typeof j === 'object' ? Object.keys(j).slice(0, 12) : [], at: new Date().toISOString() });
    if (diag.length > 30) diag.shift();
    if (!r.ok) { const e = new Error('http ' + r.status); e.status = r.status; throw e; }
    return j || {};
  }
  const str = (v) => (v == null ? '' : String(v));
  const ts = (m) => (m.created_at_ts ? (m.created_at_ts > 1e12 ? m.created_at_ts : m.created_at_ts * 1000) : Date.parse(m.created_at || '') || Date.now());
  const money = (v) => (v && typeof v === 'object' ? Number(v.amount) || 0 : Number(v) || 0);

  const ops = {
    async inbox({ page = 1 } = {}) {
      const j = await call(`/api/v2/inbox?page=${page}&per_page=30`);
      return { list: (j.conversations || []).map((c) => ({
        id: str(c.id),
        party: str((c.opposite_user && c.opposite_user.login) || c.opposite_user_login),
        unread: !!(c.is_unread || c.unread_count),
        last: str(c.description || c.last_message),
        updated: str(c.updated_at),
        item: str(c.item_title || (c.item && c.item.title)),
      })) };
    },
    async thread({ id }) {
      const j = await call(`/api/v2/conversations/${encodeURIComponent(id)}`);
      const c = j.conversation || j, other = c.opposite_user || {}, tx = c.transaction || null;
      const msgs = (c.messages || []).map((m) => {
        const e = m.entity || m, mine = e.user_id != null && other.id != null ? e.user_id !== other.id : !!m.is_own;
        if ((m.entity_type || 'message') === 'message' && e.body) return { me: mine ? 1 : 0, text: str(e.body), t: ts(m) };
        const txt = [e.title, e.subtitle, e.body].filter(Boolean).join(' · ');
        return txt ? { me: 0, sys: 1, text: txt, t: ts(m) } : null;
      }).filter(Boolean);
      return {
        id: str(c.id || id), party: str(other.login),
        item: str((tx && tx.item_title) || (c.item && c.item.title) || c.subtitle || ''),
        msgs,
        tx: tx ? {
          id: str(tx.id),
          seller: tx.seller_id != null && other.id != null ? tx.seller_id !== other.id : tx.is_seller != null ? !!tx.is_seller : tx.user_side === 'seller',
          status: str(tx.status_title || tx.status),
          price: money(tx.offer_price || tx.total_item_price || tx.price),
          title: str(tx.item_title),
        } : null,
      };
    },
    async reply({ id, text }) {
      await call(`/api/v2/conversations/${encodeURIComponent(id)}/replies`, { method: 'POST', body: { reply: { body: text, photo_temp_uuids: null, is_personal_data_sharing_check_skipped: false } } });
      return { ok: true };
    },
    async label({ tid }) {
      const j = await call(`/api/v2/transactions/${encodeURIComponent(tid)}`);
      const t = j.transaction || j, sh = t.shipment || {};
      let url = '';
      if (sh.id) {
        for (const p of [`/api/v2/shipments/${sh.id}/label_url`, `/api/v2/shipments/${sh.id}/label`]) {
          try { const l = await call(p); url = str(l.label_url || l.url || (l.label && l.label.url)); if (url) break; } catch (e) { /* on essaie l'adresse suivante */ }
        }
      }
      return { url, tracking: str(sh.tracking_code || sh.tracking_number), status: str(sh.status_title || sh.status || t.status), carrier: str(sh.carrier_name || (sh.carrier && sh.carrier.name)) };
    },
    async diag() { return { diag: diag.slice(), page: location.pathname, csrf: !!csrf() }; },
  };

  chrome.runtime.onMessage.addListener((msg, sender, send) => {
    if (msg.type !== 'op' || !ops[msg.op]) return;
    ops[msg.op](msg.args || {}).then(send, (e) => send({ error: e.status === 401 ? 'login' : String(e.message || e), status: e.status || 0 }));
    return true;
  });
})();
