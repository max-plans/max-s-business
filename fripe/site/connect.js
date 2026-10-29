/* Fripe ↔ Vinted par l'extension Fripe Connect : messagerie Vinted dans Fripe et bordereaux d'envoi.
   Tout passe par le navigateur de l'utilisateur et sa session Vinted ; Fripe ne voit jamais ses identifiants. */
(() => {
  'use strict';
  const F = () => window.__fripe;
  const MIN = '1.1.0', VINTED = 'https://www.vinted.fr';
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
    if (r.error === 'login') return toast('Connecte-toi à Vinted dans ce navigateur, puis réessaie');
    if (r.error === 'timeout' || r.error === 'tab') return toast('Vinted ne répond pas : ouvre vinted.fr dans un onglet et réessaie');
    toast('Vinted a refusé la demande (' + (r.status || r.error) + ')');
  }

  /* ---------- conversations ---------- */
  const tid = (vid) => 'v' + vid;
  function upsertOrder(t, tx) {
    const S = F().S;
    if (!tx || !tx.seller || !tx.id) return;
    let o = S.orders.find((x) => x.vtid === tx.id);
    if (o) { if (!o.price && tx.price) o.price = tx.price; o.vcid = t.vid; return; }
    const title = (tx.title || t.itemTitle || '').trim().toLowerCase();
    const it = title && S.items.find((i) => i.status !== 'sold' && i.title.trim().toLowerCase() === title);
    const day = F().today();
    if (it) { it.status = 'sold'; it.sold = tx.price || it.list || 0; it.soldDate = day; }
    S.orders.unshift({ id: F().uid(), kind: 'sale', itemId: it ? it.id : '', title: tx.title || t.itemTitle, party: t.party, price: tx.price || (it ? it.list : 0) || 0, fee: 0, status: 'todo', carrier: 'Autre', tracking: '', date: day, vtid: tx.id, vcid: t.vid });
    toast('Nouvelle vente Vinted ajoutée : ' + (tx.title || t.party));
  }
  async function loadThread(t, quiet) {
    const r = await ask('thread', { id: t.vid });
    if (r.error) { if (!quiet) fail(r); return false; }
    t.msgs = (r.msgs.length ? r.msgs : t.msgs).slice(-50);
    if (r.party) t.party = r.party;
    if (r.item) t.itemTitle = r.item;
    t.tx = r.tx || null; t.loaded = 1; t.stale = 0; t.unread = 0;
    upsertOrder(t, r.tx);
    return true;
  }
  async function sync(quiet) {
    if (busy || !ready()) return;
    busy = true;
    const btn = document.querySelector('[data-act="v-sync"]'); if (btn) { btn.disabled = true; btn.lastChild.textContent = 'Synchronisation…'; }
    const r = await ask('inbox', {});
    busy = false;
    if (r.error) { if (!quiet) fail(r); F().render(); return; }
    const S = F().S;
    r.list.forEach((c) => {
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
    const cur = S.threads.find((x) => x.id === F().cur);
    if (cur && cur.vid) await loadThread(cur, true);
    lastSync = Date.now();
    F().save(); F().render();
    if (!quiet) toast(r.list.length ? `${r.list.length} conversations Vinted à jour` : 'Aucune conversation Vinted');
  }

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
    labelBtn(o) { return o.vcid && o.vtid ? `<button class="btn sm" data-act="v-label-o" data-id="${esc(o.id)}" type="button">Bordereau</button>` : ''; },
    settingsRow(row) {
      if (!ver()) return '';
      return row('Messages et bordereaux Vinted', ready() ? 'Synchronise tes conversations depuis l’onglet Messages' : 'Ta version de l’extension est ancienne : télécharge la nouvelle et recharge-la', ready() ? '<button class="btn sm ghost" data-act="v-diag" type="button">Copier le diagnostic</button>' : '<a class="btn sm primary" href="fripe-connect.zip" download>Télécharger</a>');
    },
    auto() { if (ready() && Date.now() - lastSync > 60000) sync(true); },
    opened(t) { if (t && t.vid && ready() && (!t.loaded || t.stale)) loadThread(t, true).then((ok) => { if (ok) { F().save(); F().render(); } }); },
    async act(a, b) {
      const S = F().S, cur = S.threads.find((x) => x.id === F().cur);
      if (a === 'v-sync') return sync(false);
      if (a === 'v-update') { location.hash = '#reglages'; return; }
      if (a === 'v-send' && cur) return send(cur);
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
   Lecture auto, sans le son et en boucle tant que l'extension n'est pas installée ; ensuite, « Revoir comment installer » repliable.
   Vidéo servie par jsDelivr depuis le dépôt public, figée sur un commit. */
(() => {
  'use strict';
  const CDN = 'https://cdn.jsdelivr.net/gh/max-plans/max-s-business@a6be8b92b45e94cbd84d42aea282a1b052774b6b/fripe/site/fripe-connect-tuto';
  const css = 'display:block;width:100%;max-width:640px;aspect-ratio:16/10;margin:10px 0 12px;border-radius:12px;border:1px solid var(--line);background:#ebe8e2';
  const video = (auto) => `<video class="tuto" style="${css}" poster="${CDN}.jpg" controls muted playsinline preload="metadata"${auto ? ' autoplay loop' : ''}><source src="${CDN}.webm" type="video/webm"><source src="${CDN}.mp4" type="video/mp4"></video>`;
  const put = () => {
    const box = document.querySelector('#connect .box');
    if (!box || box.querySelector('.tuto')) return;
    const how = box.querySelector('.howto');
    if (how) { const b = how.querySelector('b'); b.textContent = 'Installer en 1 minute · regarde la vidéo'; b.insertAdjacentHTML('afterend', video(true)); }
    else box.insertAdjacentHTML('beforeend', `<details class="howto"><summary style="cursor:pointer;font-weight:600">Revoir comment installer l’extension (vidéo)</summary>${video(false)}</details>`);
  };
  new MutationObserver(put).observe(document.documentElement, { childList: true, subtree: true });
  put();
})();
