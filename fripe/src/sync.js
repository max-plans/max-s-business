/* Appareils reliés : une clé secrète relie le téléphone et l'ordinateur. Les données passent par Supabase ; la version la plus récente gagne. */
(() => {
  'use strict';
  const API = 'https://tlmfldqzdptzylfkuyhz.supabase.co/rest/v1/rpc/', PK = 'sb_publishable_bebJiUXcC2VHHQIFOQIfGw_p5iquCmg';
  const LK = 'fripe-sync-key', ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', SITE = 'https://fripe-iota.vercel.app/';
  let key = null; try { key = localStorage.getItem(LK); } catch (e) {}
  let last = 0, pushT = null, err = false;
  const F = () => window.__fripe, say = (m) => F() && F().toast(m);
  const rpc = async (fn, body) => {
    const r = await fetch(API + fn, { method: 'POST', headers: { apikey: PK, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('sync ' + r.status);
    return r.json();
  };
  const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const fmt = (k) => k.match(/.{1,4}/g).join('-');
  const gen = () => { const a = new Uint8Array(20); crypto.getRandomValues(a); return [...a].map((b) => ABC[b & 31]).join(''); };
  const setKey = (k) => { key = k; try { k ? localStorage.setItem(LK, k) : localStorage.removeItem(LK); } catch (e) {} };

  async function push() {
    clearTimeout(pushT); pushT = null;
    const S = F() && F().S; if (!key || !S) return;
    try { await rpc('fripe_push', { k: key, d: S, at: S.at || Date.now() }); last = Date.now(); err = false; } catch (e) { err = true; }
    paint();
  }
  async function pull() {
    const S = F() && F().S; if (!key || !S || pushT) return;
    try {
      const res = await rpc('fripe_pull', { k: key }); err = false; last = Date.now();
      if (!res) return push();
      if ((res.at || 0) > (S.at || 0)) { F().replace(res.data); say('Mis à jour depuis ton autre appareil'); }
      else if ((res.at || 0) < (S.at || 0)) await push();
    } catch (e) { err = true; }
    paint();
  }
  async function join(code) {
    const k = norm(code);
    if (k.length !== 20) return say('La clé fait 20 caractères');
    try {
      const res = await rpc('fripe_pull', { k });
      if (!res) return say('Clé inconnue : vérifie-la sur ton autre appareil');
      setKey(k); last = Date.now(); F().replace(res.data); say('Appareils reliés');
    } catch (e) { say('Connexion impossible, réessaie'); }
  }
  async function create() { setKey(gen()); await push(); mount(); say(err ? 'Clé créée, envoi en attente de connexion' : 'Clé créée : entre-la sur ton autre appareil'); }

  const ago = () => { if (!last) return 'jamais'; const s = Math.round((Date.now() - last) / 1000); return s < 10 ? 'à l’instant' : s < 60 ? `il y a ${s} s` : `il y a ${Math.round(s / 60)} min`; };
  function paint() { const st = document.getElementById('sync-state'); if (st) { st.textContent = err ? 'Hors ligne, nouvel essai bientôt' : `Synchronisé ${ago()}`; st.className = err ? 'down' : 'up'; } }
  function qr(text) {
    if (!window.qrcode) return '';
    try { const q = window.qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch (e) { return ''; }
  }
  function mount() {
    const box = document.getElementById('sync-box'); if (!box) return;
    if (!key) {
      box.innerHTML = `<div class="setrow"><span class="lb"><span>Relier mon téléphone et mon ordinateur</span><small>Crée une clé ici, puis entre-la sur ton autre appareil. Tout ce que tu ajoutes d’un côté apparaît de l’autre.</small></span><button class="btn sm primary" type="button" data-sync="create">Créer une clé</button></div>
        <div class="setrow"><span class="lb"><span>J’ai déjà une clé</span><small>Les données de cet appareil seront remplacées par celles de ta clé.</small></span><span class="row sync-join"><input id="sync-code" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="btn sm" type="button" data-sync="join">Relier</button></span></div>`;
      return;
    }
    const link = SITE + '#lier=' + key;
    box.innerHTML = `<div class="sync-on"><div class="sync-qr">${qr(link)}</div><div class="sync-info"><span class="mono sync-key">${fmt(key)}</span><small>Scanne ce code avec l’appareil photo de ton autre appareil, ou tape la clé dans ses réglages. Garde-la pour toi : elle donne accès à tes données.</small><span id="sync-state" class="up"></span>
      <span class="row"><button class="btn sm" type="button" data-sync="copy">Copier la clé</button><button class="btn sm" type="button" data-sync="now">Synchroniser</button><button class="btn sm ghost danger" type="button" data-sync="off">Délier cet appareil</button></span></div></div>`;
    paint();
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sync]'); if (!b) return;
    const a = b.dataset.sync;
    if (a === 'create') create();
    else if (a === 'join') join((document.getElementById('sync-code') || {}).value);
    else if (a === 'copy') navigator.clipboard.writeText(fmt(key)).then(() => say('Clé copiée'), () => say(fmt(key)));
    else if (a === 'now') pull().then(() => say(err ? 'Connexion impossible' : 'Synchronisé'));
    else if (a === 'off') { if (b.dataset.arm) { setKey(null); mount(); say('Cet appareil n’est plus relié'); } else { b.dataset.arm = 1; b.textContent = 'Confirmer'; } }
  });
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pull(); });
  addEventListener('focus', () => pull());
  setInterval(() => { if (document.visibilityState === 'visible') pull(); else if (pushT) push(); }, 15000);
  setInterval(paint, 5000);

  const CSS = `.sync-on { display: flex; gap: 18px; align-items: center; padding: 16px; flex-wrap: wrap; }
.sync-qr { width: 132px; height: 132px; flex: none; background: #fff; border-radius: 8px; padding: 6px; }
.sync-qr svg { width: 100%; height: 100%; display: block; }
.sync-qr:empty { display: none; }
.sync-info { display: grid; gap: 8px; min-width: 0; flex: 1 1 260px; }
.sync-info small { color: var(--muted); font-size: 12.5px; }
.sync-key { font-size: clamp(16px, 2.4vw, 22px); letter-spacing: .08em; font-weight: 500; overflow-wrap: anywhere; }
#sync-state { font: 500 11px var(--f-mono); letter-spacing: .1em; text-transform: uppercase; }
.sync-join { flex-wrap: nowrap; }
.sync-join input { border: 1px solid var(--line); border-radius: 7px; padding: 9px 11px; background: var(--bg); width: 230px; font-family: var(--f-mono); text-transform: uppercase; letter-spacing: .06em; }
@media (max-width: 520px) { .sync-join { width: 100%; } .sync-join input { flex: 1; width: auto; min-width: 0; } }`;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  window.FripeSync = {
    get key() { return key; },
    changed() { if (key) { clearTimeout(pushT); pushT = setTimeout(push, 1200); } },
    start() { if (key) pull(); },
    link: join, mount
  };
})();
