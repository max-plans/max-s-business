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

/* Réglages : animation d'installation de Fripe Connect (CSS seul, boucle de 12 s), ajoutée au-dessus des étapes « Installer en 1 minute ».
   L'étape en cours s'allume dans la liste ; rien ne bouge si l'utilisateur a demandé moins d'animations. */
(() => {
  'use strict';
  const CSS = `.xdemo{container-type: inline-size;max-width: 440px;margin: 10px 0 12px;}.xin{position: relative;font-size: 2.381cqw;width: 42em;height: 21em;border: 1px solid var(--line);border-radius: 1.2em;background: var(--surface);overflow: hidden;color: var(--fg);}.xin *{position: absolute;}.xbar{left: 0;right: 0;top: 0;height: 3em;background: var(--surface2);border-bottom: 1px solid var(--line);}.xbar i{top: 1.1em;width: .8em;height: .8em;border-radius: 50%;background: var(--line);}.xbar i:nth-child(1){left: 1.2em;}.xbar i:nth-child(2){left: 2.4em;}.xbar i:nth-child(3){left: 3.6em;}.xaddr{left: 5.6em;right: 1.2em;top: .6em;height: 1.8em;border-radius: 1em;background: var(--surface);border: 1px solid var(--line);}.xaddr span{left: 1em;top: 0;font: 500 1em/1.8em var(--f-mono);white-space: nowrap;overflow: hidden;}.xu1{color: var(--muted);animation: xu1 12s linear infinite;}.xu2{width: 0;animation: xu2 12s steps(1) infinite;}.xu2::after{content: "";position: absolute;right: 0;top: .35em;width: 1px;height: 1.1em;background: var(--accent);}.xfiles{inset: 3em 0 0;animation: xfiles 12s linear infinite;}.xfiles svg{left: 18.6em;top: 3.4em;width: 4.8em;height: 5.6em;color: var(--fg);}.xfold{top: 3.8em !important;width: 5.6em !important;height: 4.8em !important;left: 18.2em !important;animation: xfold 12s ease-out infinite;}.xzip{animation: xzip 12s linear infinite;}.xfiles span{left: 0;right: 0;top: 10.2em;text-align: center;font: 500 1.1em var(--f-body);}.xn1{animation: xzip 12s linear infinite;}.xn2{opacity: 0;animation: xn2 12s linear infinite;}.xext{inset: 3em 0 0;opacity: 0;animation: xext 12s linear infinite;}.xh{left: 1.07em;top: .73em;font: 700 1.5em var(--f-body);}.xdev{right: 6.4em;top: 1.5em;font: 500 1.05em var(--f-body);color: var(--muted);}.xtog{width: 3.2em;height: 1.8em;border-radius: 1em;background: var(--line);}.xtog::after{content: "";position: absolute;left: .25em;top: .25em;width: 1.3em;height: 1.3em;border-radius: 50%;background: #fff;box-shadow: 0 1px 2px rgba(0,0,0,.25);}.xtog.on{background: var(--accent);}.xtog.on::after{left: 1.65em;}.xt1{left: 37em;top: 1.2em;animation: xt1 12s steps(1) infinite;}.xt1::after{animation: xt1k 12s cubic-bezier(.3,1.4,.5,1) infinite;}.xtools{left: 1.6em;right: 1.6em;top: 4.6em;height: 2.2em;opacity: 0;animation: xtools 12s ease-out infinite;}.xtools span{position: relative;display: inline-block;margin-right: .6em;padding: 0 1em;height: 2.2em;border: 1px solid var(--line);border-radius: 1.1em;font: 600 .95em/2.2em var(--f-body);color: var(--accent);}.xtools span:not(.xb1){color: var(--muted);}.xb1{animation: xb1 12s linear infinite;}.xcard{left: 1.6em;right: 1.6em;top: 8.6em;height: 5.6em;border: 1px solid var(--line);border-radius: 1em;background: var(--bg);opacity: 0;animation: xcard 12s cubic-bezier(.2,1.3,.4,1) infinite;}.xic{left: .67em;top: .72em;border-radius: .45em;background: #0c0c0e;color: var(--accent);font: 800 1.8em/1.67 var(--f-body);text-align: center;width: 1.67em;height: 1.67em;}.xcard b{left: 4.32em;top: .9em;font: 700 1.25em var(--f-body);}.xcard small{left: 6em;top: 3.6em;font: 500 .9em var(--f-mono);color: var(--muted);}.xok{right: 6em;top: 1.9em;font: 600 .95em var(--f-body);color: var(--good);opacity: 0;animation: xok 12s linear infinite;}.xcard .xtog{right: 1.4em;top: 1.9em;}.xcur{left: 0;top: 0;width: 1.6em;height: 2.2em;z-index: 3;filter: drop-shadow(0 .2em .3em rgba(0,0,0,.25));animation: xcur 12s cubic-bezier(.45,0,.25,1) infinite,xpress 12s linear infinite !important;}@keyframes xu1{0%,26%{opacity: 1;}27%,100%{opacity: 0;}}@keyframes xu2{0%,29%{width: 0;}30%{width: 2ch;}31%{width: 4ch;}32%{width: 6ch;}33%{width: 8ch;}34%{width: 10ch;}35%{width: 12ch;}36%{width: 14ch;}37%{width: 16ch;}38%,99%{width: 19.6ch;}100%{width: 0;}}@keyframes xfiles{0%{opacity: 0;}3%,22%{opacity: 1;}25%,100%{opacity: 0;}}@keyframes xzip{0%,12.6%{opacity: 1;transform: none;}13.6%,100%{opacity: 0;transform: scale(.7);}}@keyframes xfold{0%,13%{opacity: 0;transform: scale(.6);}15%{opacity: 1;transform: scale(1.08);}16.5%,100%{opacity: 1;transform: none;}}@keyframes xn2{0%,13.4%{opacity: 0;}14.4%,100%{opacity: 1;}}@keyframes xext{0%,40%{opacity: 0;transform: translateY(.6em);}43%,96%{opacity: 1;transform: none;}99%,100%{opacity: 0;transform: none;}}@keyframes xt1{0%,59.5%{background: var(--line);}60%,100%{background: var(--accent);}}@keyframes xt1k{0%,59.5%{left: .25em;}62%,100%{left: 1.65em;}}@keyframes xtools{0%,61%{opacity: 0;transform: translateY(-.5em);}64%,100%{opacity: 1;transform: none;}}@keyframes xb1{0%,78.5%{background: transparent;}79.5%,83%{background: var(--accent-soft);}86%,100%{background: transparent;}}@keyframes xcard{0%,82%{opacity: 0;transform: translateY(1em) scale(.96);}85.5%,100%{opacity: 1;transform: none;}}@keyframes xok{0%,87%{opacity: 0;}89%,100%{opacity: 1;}}@keyframes xcur{0%{left: 30em;top: 17em;}9%,22%{left: 21em;top: 9.4em;}27%,40%{left: 14em;top: 1.6em;}52%,70%{left: 38.4em;top: 4.6em;}76%,88%{left: 10em;top: 8.4em;}96%,100%{left: 30em;top: 17em;}}@keyframes xpress{0%,10.6%{transform: none;}11%{transform: scale(.82);}11.6%{transform: none;}12%{transform: scale(.82);}12.6%{transform: none;}28%{transform: none;}28.4%{transform: scale(.82);}29%{transform: none;}59%{transform: none;}59.5%{transform: scale(.82);}60.2%{transform: none;}78.6%{transform: none;}79.1%{transform: scale(.82);}79.8%,100%{transform: none;}}.howto:has(.xdemo) ol li{border-radius: 6px;padding: 1px 6px;margin-left: -6px;animation: xstep 12s linear infinite;}.howto:has(.xdemo) ol li:nth-child(1){animation-delay: 0s;}.howto:has(.xdemo) ol li:nth-child(2){animation-delay: -9s;}.howto:has(.xdemo) ol li:nth-child(3){animation-delay: -6s;}.howto:has(.xdemo) ol li:nth-child(4){animation-delay: -3s;}.howto:has(.xdemo) ol li:nth-child(5){animation: none;}@keyframes xstep{0%,24%{background: var(--accent-soft);}25.5%,100%{background: transparent;}}@media (prefers-reduced-motion: reduce){.xdemo{display: none;}.howto ol li{animation: none !important;}}`;
  const DEMO = `<div class="xdemo" aria-hidden="true"><div class="xin"><div class="xbar"><i></i><i></i><i></i><div class="xaddr"><span class="xu1">fripe-iota.vercel.app</span><span class="xu2">chrome://extensions</span></div></div><div class="xfiles"><svg class="xzip" viewBox="0 0 40 48"><path d="M4 2h22l10 10v32a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="var(--surface)" stroke="currentColor" stroke-width="2"/><path d="M15 4h4v4h-4zm4 4h4v4h-4zm-4 4h4v4h-4zm4 4h4v4h-4zm-4 4h4v6h-4z" fill="var(--accent)"/></svg><svg class="xfold" viewBox="0 0 48 40"><path d="M2 6a3 3 0 0 1 3-3h13l4 5h21a3 3 0 0 1 3 3v24a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z" fill="var(--accent)"/><path d="M2 14h44" stroke="rgba(0,0,0,.18)" stroke-width="2"/></svg><span class="xn1">fripe-connect.zip</span><span class="xn2">fripe-connect</span></div><div class="xext"><b class="xh">Extensions</b><span class="xdev">Mode développeur</span><span class="xtog xt1"></span><div class="xtools"><span class="xb1">Charger l’extension non empaquetée</span><span>Empaqueter</span><span>Mettre à jour</span></div><div class="xcard"><span class="xic">F</span><b>Fripe Connect</b><small>1.1.0</small><span class="xok">Active</span><span class="xtog on"></span></div></div><svg class="xcur" viewBox="0 0 16 22"><path d="M1 1v17l4.5-4.2 3 7 3-1.3-3-6.8H15z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg></div></div>`;
  const put = () => {
    const h = document.querySelector('.howto');
    if (!h || h.querySelector('.xdemo')) return;
    if (!document.getElementById('xdemo-css')) { const s = document.createElement('style'); s.id = 'xdemo-css'; s.textContent = CSS; document.head.appendChild(s); }
    h.querySelector('b').insertAdjacentHTML('afterend', DEMO);
  };
  new MutationObserver(put).observe(document.documentElement, { childList: true, subtree: true });
  put();
})();
