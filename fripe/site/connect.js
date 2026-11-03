/* Fripe ↔ Vinted par l'extension Fripe Connect : messagerie Vinted dans Fripe et bordereaux d'envoi.
   Tout passe par le navigateur de l'utilisateur et sa session Vinted ; Fripe ne voit jamais ses identifiants. */
(() => {
  'use strict';
  const F = () => window.__fripe;
  const MIN = '1.1.1', VINTED = 'https://www.vinted.fr';
  const ver = () => document.documentElement.dataset.fripeConnect || '';
  const newer = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return true; };
  const ready = () => !!ver() && newer(ver(), MIN);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m) => F() && F().toast(m);
  const CARRIERS = ['Mondial Relay', 'Colissimo', 'Vinted Go', 'Chronopost'];
  let lastSync = 0, busy = false;

  function ask(op, args) {
    const id = Math.random().toString(36).slice(2);
    return new Promise((ok) => {
      const h = (e) => { if (e.source === window && e.data && e.data.source === 'fripe-connect' && e.data.id === id) { removeEventListener('message', h); clearTimeout(t); ok(e.data); } };
      const t = setTimeout(() => { removeEventListener('message', h); ok({ error: 'timeout' }); }, 30000);
      addEventListener('message', h); window.postMessage({ source: 'fripe', type: 'vinted', id, op, args }, location.origin);
    });
  }
  function fail(r) {
    if (r.error === 'login') return toast('Vinted a refusé : ouvre vinted.fr dans ce navigateur, recharge la page puis réessaie');
    if (r.error === 'timeout' || r.error === 'tab') return toast('Vinted ne répond pas : ouvre vinted.fr dans un onglet et réessaie');
    toast('Vinted a refusé la demande (' + (r.status || r.error) + ')');
  }

  /* ---------- conversations ---------- */
  const tid = (vid) => 'v' + vid;
  // relie une conversation Vinted à une vente déjà présente dans Fripe ; ne crée plus jamais de vente toute seule
  // (avant : une vieille transaction Vinted devenait une « nouvelle vente » datée du jour, en double)
  const norm = (x) => String(x || '').trim().toLowerCase();
  const orderTitle = (o) => { const S = F().S, it = o.itemId && S.items.find((i) => i.id === o.itemId); return o.title || (it ? it.title : ''); };
  function linkOrder(t, tx) {
    const S = F().S;
    if (!tx || !tx.id) return null;
    const kind = tx.seller ? 'sale' : 'purchase';
    let o = S.orders.find((x) => x.vtid === tx.id);
    if (!o) {
      const same = S.orders.filter((x) => x.kind === kind && !x.vtid && x.party && t.party && norm(x.party) === norm(t.party));
      o = same.find((x) => norm(orderTitle(x)) === norm(tx.title)) || (same.filter((x) => x.status !== 'done').length === 1 ? same.find((x) => x.status !== 'done') : null);
    }
    if (o) { o.vcid = t.vid; if (!o.vtid) o.vtid = tx.id; }
    return o || null;
  }
  // nettoyage unique : retire les ventes créées automatiquement par l'ancienne synchronisation (elles portent un numéro de transaction Vinted)
  function cleanGhosts() {
    const S = F() && F().S; if (!S || !S.orders || S.vfix2) return;
    const ghosts = S.orders.filter((o) => o.kind === 'sale' && o.vtid && o.fee === 0 && !o.manual);
    if (ghosts.length) {
      const ids = new Set(ghosts.map((o) => o.id));
      S.orders = S.orders.filter((o) => !ids.has(o.id));
      ghosts.forEach((o) => {
        const it = o.itemId && S.items.find((i) => i.id === o.itemId);
        if (it && it.soldDate === o.date && !S.orders.some((x) => x.itemId === it.id)) { it.status = 'online'; it.sold = 0; it.soldDate = ''; }
      });
      S.vtrash = ghosts.slice(0, 200); // copie de secours des ventes retirées
    }
    S.vfix2 = 1; F().save(); F().render();
    if (ghosts.length) toast(`${ghosts.length} ventes ajoutées par erreur depuis Vinted ont été retirées`);
  }
  (function waitData(n) { if (F() && F().S) return cleanGhosts(); if (n < 80) setTimeout(() => waitData(n + 1), 250); })(0);
  async function loadThread(t, quiet) {
    const r = await ask('thread', { id: t.vid });
    if (r.error) { if (!quiet) fail(r); return false; }
    t.msgs = (r.msgs.length ? r.msgs : t.msgs).slice(-50);
    if (r.party) t.party = r.party;
    if (r.item) t.itemTitle = r.item;
    t.tx = r.tx || null; t.loaded = 1; t.stale = 0; t.unread = 0;
    linkOrder(t, r.tx);
    return true;
  }
  function mergeInbox(list) {
    const S = F().S;
    (list || []).forEach((c) => {
      let t = S.threads.find((x) => x.vid === c.id);
      const at = Date.parse(c.updated) || Date.now();
      if (!t) {
        t = { id: tid(c.id), vid: c.id, party: c.party || 'Membre Vinted', itemTitle: c.item || 'Conversation Vinted', unread: c.unread ? 1 : 0, msgs: [{ me: 0, text: c.last || '…', t: at }], vupd: c.updated };
        S.threads.unshift(t);
      } else {
        if (c.updated && c.updated !== t.vupd) { t.vupd = c.updated; t.stale = 1; if (!t.loaded) t.msgs = [{ me: 0, text: c.last || '…', t: at }]; }
        t.unread = c.unread ? 1 : 0;
        if (c.party) t.party = c.party;
      }
    });
  }
  async function sync(quiet) {
    if (busy || !ready()) return;
    busy = true;
    const btn = document.querySelector('[data-act="v-sync"]'); if (btn) { btn.disabled = true; btn.lastChild.textContent = 'Synchronisation…'; }
    const r = await ask('inbox', {});
    busy = false;
    if (r.error) { if (!quiet) fail(r); F().render(); return; }
    mergeInbox(r.list);
    const S = F().S;
    const cur = S.threads.find((x) => x.id === F().cur);
    if (cur && cur.vid) await loadThread(cur, true);
    lastSync = Date.now();
    F().save(); F().render();
    if (!quiet) toast(r.list.length ? `${r.list.length} conversations Vinted à jour` : 'Aucune conversation Vinted');
  }

  /* ---------- suivi des colis : état lu sur Vinted ---------- */
  const STEP_IX = ['todo', 'dropped', 'transit', 'delivered', 'done'];
  function stepOf(txt) {
    const s = norm(txt);
    if (!s || /^\d+$/.test(s)) return null;
    if (/annul|rembours|litige|retour/.test(s)) return null;
    if (/termin|finalis|compl[eé]t|fonds|paiement (envoy|vers|transf)/.test(s)) return 'done';
    if (/en cours de livraison|en transit|en route|achemin|pris en charge|en chemin/.test(s)) return 'transit';
    if (/livr|re[çc]u|r[ée]cup[ée]r|retir|disponible/.test(s)) return 'delivered';
    if (/d[ée]pos|exp[ée]di|envoy/.test(s)) return 'dropped';
    return null;
  }
  const carrierOf = (txt) => CARRIERS.find((k) => txt && txt.toLowerCase().includes(k.toLowerCase().split(' ')[0]));
  function applyStatus(o, status, extra) {
    if (status) { o.vstatus = status; o.vat = Date.now(); }
    const fresh = !!(extra && extra.tracking && !o.tracking); // numéro de suivi venu de Vinted : son transporteur va avec
    if (fresh) o.tracking = extra.tracking;
    const c = extra && carrierOf(extra.carrier); if (c && (fresh || !o.carrier || o.carrier === 'Autre')) o.carrier = c;
    const st = stepOf(status);
    if (st && STEP_IX.indexOf(st) > STEP_IX.indexOf(o.status)) { o.status = st; return true; }
    return false;
  }
  let tracking = false;
  async function refreshTracking(kind, manual) {
    if (tracking) return;
    if (!ready()) { if (manual) { toast('Installe ou mets à jour Fripe Connect (1.1.1) pour actualiser le suivi depuis Vinted'); location.hash = '#reglages'; } return; }
    tracking = true;
    const btn = document.querySelector('[data-act="v-track"]'); if (btn) { btn.disabled = true; btn.lastChild.textContent = 'Actualisation…'; }
    const S = F().S;
    try {
      const box = await ask('inbox', {});
      if (box.error) { if (manual) fail(box); return; }
      mergeInbox(box.list);
      const active = S.orders.filter((o) => o.kind === kind && o.status !== 'done');
      let calls = 0, moved = 0, read = 0;
      for (const o of active) {
        if (calls >= 25) break;
        // la conversation de cette commande : déjà reliée, sinon celle avec la même personne
        const t = (o.vcid && S.threads.find((x) => x.vid === o.vcid)) || S.threads.find((x) => x.vid && x.party && norm(x.party) === norm(o.party));
        if (!t) continue;
        calls++;
        const r = await ask('thread', { id: t.vid });
        if (r.error || !r.tx) continue;
        const linked = linkOrder(t, r.tx); if (linked !== o) continue;
        read++;
        let extra = null;
        if (!o.tracking && calls < 25) { calls++; const l = await ask('label', { tid: r.tx.id }); if (!l.error) extra = l; }
        if (applyStatus(o, r.tx.status || (extra && extra.status), extra)) moved++;
      }
      S.vtrack = { ...(S.vtrack || {}), [kind]: Date.now() };
      F().save(); F().render();
      if (manual) toast(moved ? `${plural(moved, 'colis')} mis à jour depuis Vinted` : read ? 'Suivi à jour : rien de nouveau sur Vinted' : 'Aucune commande en cours reliée à une conversation Vinted');
    } finally { tracking = false; }
  }
  const plural = (n, w) => `${n} ${w}`;

  /* ---------- bordereau d'envoi ---------- */
  async function label(vid, txid, o) {
    const win = window.open('', '_blank');
    if (win) win.document.write('<p style="font:16px system-ui;padding:24px">Récupération du bordereau Vinted…</p>');
    const r = await ask('label', { tid: txid });
    const S = F().S, order = o || S.orders.find((x) => x.vtid === txid);
    if (!r.error && order) {
      if (r.tracking && !order.tracking) order.tracking = r.tracking;
      const c = CARRIERS.find((k) => r.carrier && r.carrier.toLowerCase().includes(k.toLowerCase().split(' ')[0]));
      if (c && (!order.carrier || order.carrier === 'Autre')) order.carrier = c;
      F().save(); F().render();
    }
    const url = !r.error && r.url ? r.url : `${VINTED}/inbox/${encodeURIComponent(vid)}`;
    if (win) win.location.href = url; else window.open(url, '_blank', 'noopener');
    toast(!r.error && r.url ? 'Bordereau ouvert : imprime-le ou montre-le au point relais' : 'Bordereau introuvable automatiquement : il est dans la conversation Vinted qui vient de s’ouvrir');
  }

  /* ---------- envoi d'un message ---------- */
  async function send(t) {
    const ta = document.getElementById('msg-text'), text = ta ? ta.value.trim() : '';
    if (!text) return toast('Écris un message d’abord');
    const b = document.querySelector('[data-act="v-send"]'); if (b) { b.disabled = true; b.textContent = 'Envoi…'; }
    const r = await ask('reply', { id: t.vid, text });
    if (r.error) { if (b) { b.disabled = false; b.textContent = 'Envoyer sur Vinted'; } return fail(r); }
    t.msgs.push({ me: 1, text, t: Date.now() }); t.unread = 0;
    F().save(); F().render(); toast('Message envoyé sur Vinted');
    setTimeout(() => loadThread(t, true).then((ok) => { if (ok) { F().save(); F().render(); } }), 1500);
  }

  const st = document.createElement('style');
  st.textContent = `.vtag { font: 600 9px/1 var(--f-mono, monospace); font-style: normal; letter-spacing: .08em; text-transform: uppercase; padding: 3px 5px; margin-left: 6px; border-radius: 3px; background: #09b1ba; color: #fff; vertical-align: 1px; }
.bub.sys { align-self: center; max-width: 90%; background: transparent; border: 1px dashed var(--line); color: var(--muted); font-size: 12.5px; text-align: center; }`;
  document.head.appendChild(st);

  window.FripeVinted = {
    ready,
    syncBtn() {
      if (!ver()) return '';
      if (!ready()) return '<button class="btn" data-act="v-update" type="button">Mettre à jour Fripe Connect</button>';
      return '<button class="btn" data-act="v-sync" type="button"><span aria-hidden="true">↻ </span>Synchroniser Vinted</button>';
    },
    chatActions(t) {
      return `<button class="btn primary sm" data-act="v-send" type="button">Envoyer sur Vinted</button>${t.tx && t.tx.seller ? '<button class="btn sm" data-act="v-label" type="button">Bordereau d’envoi</button>' : ''}<a class="btn sm ghost" href="${VINTED}/inbox/${encodeURIComponent(t.vid)}" target="_blank" rel="noopener">Ouvrir sur Vinted</a>`;
    },
    chatNote(t) { return t.tx ? `Vente Vinted : ${esc(t.tx.status || 'en cours')}${t.tx.price ? ' · ' + F().eur(t.tx.price) : ''}` : 'Conversation reliée à Vinted : ta réponse part directement à l’acheteur.'; },
    labelBtn(o) { return o.kind === 'sale' && o.vcid && o.vtid ? `<button class="btn sm" data-act="v-label-o" data-id="${esc(o.id)}" type="button">Bordereau</button>` : ''; },
    settingsRow(row) {
      if (!ver()) return '';
      return row('Messages et bordereaux Vinted', ready() ? 'Synchronise tes conversations depuis l’onglet Messages' : 'Ta version de l’extension est ancienne : télécharge la nouvelle et recharge-la', ready() ? '<button class="btn sm ghost" data-act="v-diag" type="button">Copier le diagnostic</button>' : '<a class="btn sm primary" href="fripe-connect.zip" download>Télécharger</a>');
    },
    auto() { /* synchronisation uniquement à la demande (bouton « Synchroniser Vinted ») */ },
    // suivi des colis : relu à l'ouverture de Ventes ou d'Achats, au plus toutes les 10 minutes
    autoTrack(kind) { const S = F() && F().S; if (S && ready() && Date.now() - ((S.vtrack || {})[kind] || 0) > 600000) refreshTracking(kind, false); },
    lastTrack(kind) { const S = F() && F().S; return S && S.vtrack ? S.vtrack[kind] || 0 : 0; },
    opened(t) { if (t && t.vid && ready() && (!t.loaded || t.stale)) loadThread(t, true).then((ok) => { if (ok) { F().save(); F().render(); } }); },
    async act(a, b) {
      const S = F().S, cur = S.threads.find((x) => x.id === F().cur);
      if (a === 'v-sync') return sync(false);
      if (a === 'v-track') return refreshTracking(location.hash === '#achats' ? 'purchase' : 'sale', true);
      if (a === 'v-update') { location.hash = '#reglages'; return; }
      if (a === 'v-send' && cur) { if (!ready()) { toast('Mets à jour l’extension Fripe Connect (version 1.1.1) depuis Réglages'); location.hash = '#reglages'; return; } return send(cur); }
      if (a === 'v-label' && cur && cur.tx) return label(cur.vid, cur.tx.id);
      if (a === 'v-label-o') { const o = S.orders.find((x) => x.id === b.dataset.id); if (o) return label(o.vcid, o.vtid, o); }
      if (a === 'v-diag') {
        const r = await ask('diag', {});
        const txt = JSON.stringify({ extension: ver(), ...r }, null, 2);
        navigator.clipboard.writeText(txt).then(() => toast('Diagnostic copié : colle-le à ton support Fripe'), () => toast('Copie impossible'));
      }
    },
  };
})();

/* Réglages : tuto vidéo de l'installation de Fripe Connect (46 s, de A à Z ; source promo/tuto/tuto.html).
   Lecture auto, sans le son et en boucle tant que l'extension n'est pas installée ; ensuite, la même vidéo reste affichée sous « Comment installer l’extension ».
   Vidéo hébergée sur jsDelivr (dépôt public, commit figé) et relayée par le site lui-même (réécriture dans vercel.json) ; MP4 (H.264) d'abord pour Safari et l'iPhone, WebM ensuite. */
(() => {
  'use strict';
  const CDN = '/fripe-connect-tuto'; // même origine que le site : vercel.json relaie ces fichiers depuis jsDelivr
  const css = 'display:block;width:100%;max-width:640px;aspect-ratio:16/10;margin:10px 0 12px;border-radius:12px;border:1px solid var(--line);background:#ebe8e2';
  const video = (auto) => `<video class="tuto" style="${css}" poster="${CDN}.jpg" controls muted playsinline preload="metadata"${auto ? ' autoplay loop' : ''}><source src="${CDN}.mp4" type="video/mp4"><source src="${CDN}.webm" type="video/webm"></video><a href="${CDN}.mp4" target="_blank" rel="noopener" style="display:inline-block;margin:-4px 0 10px;font-size:13px;color:var(--muted)">La vidéo ne se lance pas ? Ouvre-la ici ↗</a>`;
  const put = () => {
    const box = document.querySelector('#connect .box');
    if (!box || box.querySelector('.tuto')) return;
    const how = box.querySelector('.howto');
    if (how) { const b = how.querySelector('b'); b.textContent = 'Installer en 1 minute · regarde la vidéo'; b.insertAdjacentHTML('afterend', video(true)); }
    else box.insertAdjacentHTML('beforeend', `<div class="howto"><b>Comment installer l’extension · vidéo</b>${video(true)}</div>`);
  };
  new MutationObserver(put).observe(document.documentElement, { childList: true, subtree: true });
  put();
})();
