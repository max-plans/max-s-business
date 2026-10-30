/* Comptes Fripe (version en ligne) : connexion Google ou code par email, données rangées sur le compte, formule gratuite (20 articles) ou Pro.
   Le paiement passe par la fonction « billing » (Stripe) ; l'état Pro est relu à chaque ouverture et au retour du paiement. */
(() => {
  'use strict';
  const SB_URL = 'https://tlmfldqzdptzylfkuyhz.supabase.co', SB_KEY = 'sb_publishable_bebJiUXcC2VHHQIFOQIfGw_p5iquCmg';
  const FREE_MAX = 20, AFTER = 'fripe-after-login', OWNER = 'fripe-owner', SEEN = 'fripe-seen', IDLE_MAX = 30 * 864e5;
  const touch = () => { try { localStorage.setItem(SEEN, String(Date.now())); } catch (e) {} };
  if (!window.supabase || !window.supabase.createClient) return;
  const sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

  let user = null, acct = { plan: 'free' }, pushT = null, failed = false, google = false, email = '', target = '#tableau';
  const F = () => window.__fripe, say = (m) => F() && F().toast(m);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const realCount = (S) => ((S && S.items) || []).filter((i) => !i.demo).length;
  const isPro = () => acct.plan === 'pro' && (!acct.pro_until || new Date(acct.pro_until) > new Date());
  const fdate = (s) => new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  async function billing(action, extra) {
    try {
      const { data, error } = await sb.functions.invoke('billing', { body: Object.assign({ action }, extra) });
      if (!error) return data;
      try { return await error.context.json(); } catch (e) { return { error: 'network' }; }
    } catch (e) { return { error: 'network' }; }
  }
  async function refreshPlan(announce) {
    const r = await billing('sync');
    if (r && r.plan) { const was = isPro(); Object.assign(acct, r); if (announce && isPro() && !was) say('Bienvenue dans Fripe Pro'); mount(); }
  }

  /* ---------- ouverture : session, compte, données ---------- */
  async function boot() {
    const q = new URLSearchParams(location.search);
    fetch(SB_URL + '/auth/v1/settings', { headers: { apikey: SB_KEY } }).then((r) => r.json()).then((s) => { google = !!(s.external && s.external.google); paintAuth(); }).catch(() => {});
    const { data } = await sb.auth.getSession(); // échange aussi le ?code= du retour Google ou du lien reçu par email
    user = data.session ? data.session.user : null;
    const proOk = q.get('pro') === 'ok', authErr = q.get('error_description');
    if (q.toString()) history.replaceState(null, '', location.pathname + location.hash);
    if (authErr) setTimeout(() => say('Connexion interrompue : le lien a peut-être expiré, recommence.'), 600);
    if (!user) return { user: null };
    // session qui expire : après 30 jours sans ouvrir Fripe sur cet appareil, il faut se reconnecter
    let seen = 0; try { seen = +localStorage.getItem(SEEN) || 0; } catch (e) {}
    if (seen && Date.now() - seen > IDLE_MAX) { await sb.auth.signOut().catch(() => {}); user = null; try { [SEEN, OWNER, 'fripe-state-v1'].forEach((k) => localStorage.removeItem(k)); } catch (e) {} return { user: null }; }
    touch();
    let after = null; try { after = localStorage.getItem(AFTER); localStorage.removeItem(AFTER); } catch (e) {}
    if (after && (!location.hash || location.hash === '#accueil')) history.replaceState(null, '', location.pathname + after);
    let remote = null, offline = false;
    try {
      const [a, d] = await Promise.all([
        sb.from('accounts').select('*').eq('user_id', user.id).maybeSingle(),
        sb.from('user_data').select('data,at').eq('user_id', user.id).maybeSingle(),
      ]);
      if (a.data) acct = a.data;
      if (d.error) offline = true; else if (d.data) remote = d.data.data;
    } catch (e) { offline = true; }
    if (proOk) await refreshPlan(true); else refreshPlan(false);
    let owner = null; try { owner = localStorage.getItem(OWNER); localStorage.setItem(OWNER, user.id); } catch (e) {}
    return { user, data: remote, offline, localOk: !owner || owner === user.id };
  }

  /* ---------- sauvegarde et synchronisation entre appareils ---------- */
  function save() { if (!user) return; clearTimeout(pushT); pushT = setTimeout(push, 800); }
  async function push() {
    pushT = null; const S = F() && F().S; if (!user || !S) return;
    const { error } = await sb.from('user_data').upsert({ user_id: user.id, data: S, at: S.at || Date.now() });
    if (!error) { failed = false; return; }
    if (/free_limit/.test(error.message)) { paywall('limit'); return; }
    if (!failed) say('Hors ligne : tes changements partiront au retour du réseau');
    failed = true;
  }
  async function pull() {
    const S = F() && F().S; if (!user || !S || pushT) return;
    if (failed) return push();
    const { data, error } = await sb.from('user_data').select('data,at').eq('user_id', user.id).maybeSingle();
    if (!error && data && (data.at || 0) > (S.at || 0)) { if (F().replace(data.data)) say('Mis à jour depuis ton autre appareil'); }
  }
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { pull(); if (user) { touch(); refreshPlan(false); } } });
  addEventListener('focus', () => pull());
  setInterval(() => { if (document.visibilityState === 'visible') pull(); }, 20000);

  /* ---------- écran de connexion ---------- */
  const G = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z"/></svg>';
  const LOGO = '<svg class="lg" viewBox="0 0 48 48" aria-hidden="true"><path class="lg-b" d="M14 2h20l12 12v20L34 46H14L2 34V14z"/><path class="lg-f" d="M14.5 11.5h21l-3.6 5.8H22.2v4.6h10.4l-3.2 5.5h-7.2v9.1h-7.2z"/></svg>';
  const box = document.createElement('div'); box.id = 'auth'; box.hidden = true;
  box.innerHTML = `<div class="auth-card">
    <a class="auth-back mono" href="#accueil">← Accueil</a>
    <div class="auth-logo">${LOGO}<span>Fripe</span></div>
    <h1>Ton espace revendeur</h1>
    <p class="auth-sub">Crée ton compte ou connecte-toi. Gratuit jusqu’à ${FREE_MAX} articles, sans carte bancaire.</p>
    <div data-step="start">
      <div class="auth-g" hidden><button class="auth-google" type="button" data-auth="google">${G}<span>Continuer avec Google</span></button><div class="auth-or mono"><span>ou par email</span></div></div>
      <form class="auth-form" data-auth-form="email" novalidate><label class="mono" for="auth-email">Ton email</label><input id="auth-email" type="email" autocomplete="email" inputmode="email" placeholder="toi@exemple.fr" required><button class="auth-main" type="submit">Recevoir mon code</button></form>
    </div>
    <div data-step="code" hidden>
      <p class="auth-sent">Code envoyé à <b id="auth-to"></b>. Entre-le ici, ou touche le lien dans l’email.</p>
      <form class="auth-form" data-auth-form="code" novalidate><label class="mono" for="auth-code">Code reçu</label><input id="auth-code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="123456"><button class="auth-main" type="submit">Valider</button></form>
      <div class="auth-links"><button type="button" data-auth="resend">Renvoyer le code</button><button type="button" data-auth="change">Changer d’email</button></div>
    </div>
    <p class="auth-msg" role="status" aria-live="polite"></p>
    <p class="auth-legal">Tes données restent privées, hébergées en France. Fripe n’est pas affilié à Vinted. En créant un compte, tu acceptes les <a href="legal.html#cgv" target="_blank" rel="noopener">conditions générales</a> et la <a href="legal.html#confidentialite" target="_blank" rel="noopener">politique de confidentialité</a>.</p>
  </div>`;
  document.body.appendChild(box);
  const $a = (s) => box.querySelector(s), msg = (t, bad) => { const m = $a('.auth-msg'); m.textContent = t || ''; m.classList.toggle('bad', !!bad); };
  const step = (s) => { box.querySelectorAll('[data-step]').forEach((el) => { el.hidden = el.dataset.step !== s; }); };
  function paintAuth() { $a('.auth-g').hidden = !google; }
  function showAuth(t) {
    target = t || '#tableau';
    document.body.classList.remove('in-app', 'landing'); document.body.classList.add('auth-on'); box.hidden = false;
    msg(''); window.scrollTo(0, 0); setTimeout(() => { const i = $a('[data-step]:not([hidden]) input'); if (i && matchMedia('(min-width: 900px)').matches) i.focus(); }, 60);
  }
  function hideAuth() { document.body.classList.remove('auth-on'); box.hidden = true; }
  const remember = () => { try { localStorage.setItem(AFTER, target); } catch (e) {} };
  const authError = (e) => {
    const c = (e && (e.code || e.message)) || '';
    if (/rate|seconds|too many/i.test(c)) return 'Trop de demandes d’affilée. Réessaie dans une minute.';
    if (/not_authorized|not authorized/i.test(c)) return 'Les emails ne sont pas encore ouverts au public. Utilise Google, ou réessaie bientôt.';
    if (/expired|invalid|otp/i.test(c)) return 'Code incorrect ou expiré. Vérifie-le ou demande un nouveau code.';
    if (/provider is not enabled/i.test(c)) return 'La connexion Google n’est pas encore activée.';
    return 'Connexion impossible pour le moment. Réessaie.';
  };
  async function sendCode() {
    const btn = $a('[data-auth-form="email"] button');
    btn.disabled = true; btn.textContent = 'Envoi…'; msg('');
    remember();
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true } });
    btn.disabled = false; btn.textContent = 'Recevoir mon code';
    if (error) { msg(authError(error), true); return false; }
    $a('#auth-to').textContent = email; step('code'); $a('#auth-code').value = ''; msg('');
    setTimeout(() => $a('#auth-code').focus(), 60); return true;
  }
  box.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target.dataset.authForm;
    if (f === 'email') {
      email = $a('#auth-email').value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg('Entre une adresse email valide.', true); return; }
      sendCode();
    } else if (f === 'code') {
      const token = $a('#auth-code').value.replace(/\D/g, '');
      if (token.length < 6) { msg('Le code fait au moins 6 chiffres.', true); return; }
      const btn = $a('[data-auth-form="code"] button'); btn.disabled = true; btn.textContent = 'Vérification…';
      const { error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
      if (error) { btn.disabled = false; btn.textContent = 'Valider'; msg(authError(error), true); return; }
      try { localStorage.removeItem(AFTER); } catch (er) {}
      history.replaceState(null, '', location.pathname + target); location.reload();
    }
  });
  box.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-auth]'); if (!b) return;
    const a = b.dataset.auth;
    if (a === 'google') {
      remember(); b.disabled = true;
      const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
      if (error) { b.disabled = false; msg(authError(error), true); }
    } else if (a === 'resend') { if (await sendCode()) msg('Nouveau code envoyé.'); }
    else if (a === 'change') { step('start'); msg(''); $a('#auth-email').focus(); }
  });

  /* ---------- formule Pro ---------- */
  async function checkout(interval, btn) {
    const old = btn ? btn.innerHTML : ''; if (btn) { btn.disabled = true; btn.textContent = 'Ouverture du paiement…'; }
    const r = await billing('checkout', { interval });
    if (r && r.url) { location.href = r.url; return; }
    if (btn) { btn.disabled = false; btn.innerHTML = old; }
    say(r && r.error === 'stripe_not_configured' ? 'Le paiement en ligne ouvre très bientôt.' : r && r.error === 'rate_limited' ? 'Trop de tentatives : réessaie dans quelques minutes.' : 'Paiement indisponible pour le moment, réessaie.');
  }
  async function portal(btn) {
    if (btn) { btn.disabled = true; btn.textContent = 'Ouverture…'; }
    const r = await billing('portal');
    if (r && r.url) { location.href = r.url; return; }
    if (btn) { btn.disabled = false; btn.textContent = 'Gérer mon abonnement'; }
    say('Gestion de l’abonnement indisponible pour le moment.');
  }
  function paywall(reason) {
    const dlg = document.getElementById('dlg'), f = document.getElementById('dlg-form'); if (!dlg || !f) return;
    const n = realCount(F() && F().S);
    f.innerHTML = `<h3>Passe à Fripe Pro</h3>
      <p class="pw-lead">${reason === 'limit' ? `La formule gratuite va jusqu’à ${FREE_MAX} articles (tu en as ${n}). Avec Pro, ajoute-en autant que tu veux.` : 'Articles illimités et import Vinted complet, pour suivre tout ton stock.'}</p>
      <div class="pw-plans"><button type="button" class="pw-plan" data-bill="month"><b>6,99 €</b><span>par mois</span></button><button type="button" class="pw-plan best" data-bill="year"><b>59 €</b><span>par an · 2 mois offerts</span></button></div>
      <ul class="pw-list"><li>Articles illimités</li><li>Import Vinted complet</li><li>Résiliable à tout moment, remboursé si tu changes d’avis sous 14 jours</li></ul>
      <p class="pw-legal">Paiement sécurisé par Stripe. En t’abonnant, tu acceptes les <a href="legal.html#cgv" target="_blank" rel="noopener">conditions générales de vente</a>.</p>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost" type="button" data-pw="close">Plus tard</button></div>`;
    f.onsubmit = (e) => e.preventDefault();
    if (!dlg.open) dlg.showModal();
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-bill], [data-pw], [data-acct]'); if (!b) return;
    if (b.dataset.bill) checkout(b.dataset.bill, b);
    else if (b.dataset.pw === 'close') document.getElementById('dlg').close();
    else if (b.dataset.acct === 'portal') portal(b);
    else if (b.dataset.acct === 'logout') signOut();
    else if (b.dataset.acct === 'delete') {
      if (!b.dataset.arm) { b.dataset.arm = 1; b.textContent = 'Confirmer la suppression'; return; }
      b.disabled = true; b.textContent = 'Suppression…';
      photos.purge().catch(() => {}).then(() => billing('delete_account')).then((r) => { if (r && r.ok) signOut(true); else { b.disabled = false; b.textContent = 'Supprimer mon compte'; say('Suppression impossible, réessaie.'); } });
    }
  });
  /* ---------- photos des articles : stockage privé, un dossier par compte ---------- */
  // seuls les JPEG, PNG, WebP et HEIC de 20 Mo maximum partent (le stockage refuse aussi tout le reste, 5 Mo après compression)
  const PHOTO_TYPES = /^image\/(jpeg|png|webp|heic|heif)$/, PHOTO_MAX = 20 * 1024 * 1024;
  document.addEventListener('change', (e) => {
    const inp = e.target;
    if (!inp.matches || !inp.matches('#phs input[type="file"]')) return;
    const all = [...inp.files], ok = all.filter((f) => PHOTO_TYPES.test(f.type) && f.size <= PHOTO_MAX);
    if (ok.length === all.length) return;
    const dt = new DataTransfer(); ok.forEach((f) => dt.items.add(f)); inp.files = dt.files;
    say('Photos acceptées : JPEG, PNG, WebP ou HEIC de 20 Mo maximum');
  }, true);
  const photos = (() => {
    const B = 'photos', cache = new Map();
    const shrink = (file) => new Promise((ok, ko) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob((b) => (b ? ok(b) : ko(new Error('photo'))), 'image/jpeg', .86);
      };
      img.onerror = () => { URL.revokeObjectURL(url); ko(new Error('photo')); };
      img.src = url;
    });
    return {
      async upload(file, itemId) {
        const blob = await shrink(file), path = `${user.id}/${itemId}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.jpg`;
        const { error } = await sb.storage.from(B).upload(path, blob, { contentType: 'image/jpeg', upsert: false });
        if (error) throw error;
        cache.set(path, { url: URL.createObjectURL(blob), until: Infinity });
        return path;
      },
      async urls(paths) {
        const now = Date.now(), miss = paths.filter((p) => !(cache.get(p) && cache.get(p).until > now));
        if (miss.length) {
          const { data } = await sb.storage.from(B).createSignedUrls(miss, 3600);
          (data || []).forEach((d) => { if (d.signedUrl) cache.set(d.path, { url: d.signedUrl, until: now + 3300e3 }); });
        }
        return Object.fromEntries(paths.map((p) => [p, cache.get(p) && cache.get(p).url]).filter(([, u]) => u));
      },
      async remove(paths) { if (paths && paths.length) await sb.storage.from(B).remove(paths); paths.forEach((p) => cache.delete(p)); },
      async purge() {
        const { data: dirs } = await sb.storage.from(B).list(user.id, { limit: 1000 });
        for (const d of dirs || []) {
          const { data: fs } = await sb.storage.from(B).list(`${user.id}/${d.name}`, { limit: 1000 });
          if (fs && fs.length) await sb.storage.from(B).remove(fs.map((f) => `${user.id}/${d.name}/${f.name}`));
        }
      },
    };
  })();

  async function signOut(deleted) {
    try { await sb.auth.signOut(); } catch (e) {}
    user = null; clearTimeout(pushT);
    try { localStorage.removeItem('fripe-state-v1'); localStorage.removeItem(OWNER); localStorage.removeItem(SEEN); } catch (e) {}
    if (deleted) try { sessionStorage.setItem('fripe-bye', '1'); } catch (e) {}
    history.replaceState(null, '', location.pathname + '#accueil'); location.reload();
  }

  /* ---------- réglages : compte et abonnement ---------- */
  function mount() {
    const el = document.getElementById('acct-box'); if (!el || !user) return;
    const n = realCount(F() && F().S), pct = Math.min(100, n / FREE_MAX * 100);
    const plan = isPro()
      ? `<div class="acct-plan"><div class="acct-l"><span class="acct-tag pro mono">Pro</span><b>Articles illimités</b><small>${acct.pro_until ? (acct.cancel_at_period_end ? 'Se termine le ' : 'Renouvellement le ') + fdate(acct.pro_until) : 'Abonnement actif'}</small></div><button class="btn sm" type="button" data-acct="portal">Gérer mon abonnement</button></div>`
      : `<div class="acct-plan"><div class="acct-l"><span class="acct-tag mono">Gratuit</span><b>${n} / ${FREE_MAX} articles</b><div class="acct-bar"><i style="width:${pct.toFixed(0)}%"></i></div><small>Passe Pro pour des articles illimités.</small></div><div class="acct-buy"><button class="btn sm primary" type="button" data-bill="month">6,99 € / mois</button><button class="btn sm" type="button" data-bill="year">59 € / an</button></div></div>`;
    el.innerHTML = `<div class="setrow"><span class="lb"><span>Connecté</span><small>${esc(user.email)}</small></span><button class="btn sm" type="button" data-acct="logout">Se déconnecter</button></div>${plan}
      <div class="setrow"><span class="lb"><span>Supprimer mon compte</span><small>Efface ton compte et toutes tes données. ${isPro() ? 'Ton abonnement est arrêté.' : ''}</small></span><button class="btn sm danger" type="button" data-acct="delete">Supprimer mon compte</button></div>
      <div class="setrow"><span class="lb"><span>Informations légales</span><small><a href="legal.html#mentions" target="_blank" rel="noopener">Mentions légales</a> · <a href="legal.html#cgv" target="_blank" rel="noopener">Conditions générales</a> · <a href="legal.html#confidentialite" target="_blank" rel="noopener">Confidentialité</a></small></span></div>`;
  }

  /* ---------- styles de l'écran de connexion, du compte et de l'offre Pro ---------- */
  const st = document.createElement('style');
  st.textContent = `body.auth-on #site, body.auth-on #app, body.auth-on #bg3d, body.auth-on #progress { display: none !important; }
#auth { min-height: 100vh; min-height: 100dvh; display: grid; place-items: center; padding: max(24px, env(safe-area-inset-top, 0px)) 18px max(24px, env(safe-area-inset-bottom, 0px)); background: radial-gradient(70% 50% at 50% 0%, rgba(255,46,77,.18), transparent 70%), #060607; color: #f3f0ea; }
#auth[hidden] { display: none; }
.auth-card { width: min(420px, 100%); display: grid; gap: 16px; }
.auth-back { justify-self: start; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: rgba(243,240,234,.6); text-decoration: none; }
.auth-back:hover { color: #f3f0ea; }
.auth-logo { display: flex; align-items: center; gap: 10px; font: 400 28px/1 var(--f-cond); text-transform: uppercase; letter-spacing: .04em; margin-top: 18px; }
.auth-logo .lg { width: 34px; height: 34px; }
.auth-card h1 { font: 400 clamp(40px, 11vw, 58px)/.92 var(--f-cond); text-transform: uppercase; letter-spacing: .005em; }
.auth-sub { margin: -4px 0 6px; color: rgba(243,240,234,.7); }
.auth-google, .auth-main { width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; border-radius: 8px; padding: 14px 18px; font-weight: 600; border: 1px solid #26262d; transition: background .2s, border-color .2s, opacity .2s; }
.auth-google { background: #f3f0ea; color: #0c0c0e; border-color: #f3f0ea; }
.auth-google:hover { background: #fff; }
.auth-main { background: #ff2e4d; border-color: #ff2e4d; color: #fff; margin-top: 4px; }
.auth-main:hover { background: #ff4762; }
.auth-google:disabled, .auth-main:disabled { opacity: .6; cursor: progress; }
.auth-or { display: flex; align-items: center; gap: 12px; margin: 16px 0 4px; font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; color: rgba(243,240,234,.5); }
.auth-or::before, .auth-or::after { content: ""; flex: 1; height: 1px; background: #26262d; }
.auth-form { display: grid; gap: 8px; }
.auth-form label { font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; color: rgba(243,240,234,.6); }
.auth-form input { width: 100%; border: 1px solid #26262d; background: #111114; border-radius: 8px; padding: 14px; font-size: 16px; }
.auth-form input:focus { outline: none; border-color: #ff2e4d; box-shadow: 0 0 0 3px rgba(255,46,77,.22); }
#auth-code { font: 500 22px var(--f-mono); letter-spacing: .3em; text-align: center; }
.auth-sent { margin: 0 0 6px; color: rgba(243,240,234,.75); overflow-wrap: anywhere; }
.auth-links { display: flex; justify-content: space-between; gap: 10px; margin-top: 6px; }
.auth-links button { background: none; border: 0; padding: 4px 0; color: rgba(243,240,234,.7); text-decoration: underline; text-underline-offset: 3px; font-size: 13.5px; }
.auth-msg { min-height: 1.4em; margin: 0; font-size: 13.5px; color: #2fd17f; }
.auth-msg.bad { color: #ff5a6e; }
.auth-legal { margin: 0; font-size: 12px; color: rgba(243,240,234,.45); }
.auth-legal a, .pw-legal a, #acct-box .lb small a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
.pw-legal { margin: 0; font-size: 12px; color: var(--muted); }
.acct-plan { display: flex; align-items: center; justify-content: space-between; gap: 14px 18px; flex-wrap: wrap; padding: 16px; border-top: 1px solid var(--line); }
.acct-l { display: grid; gap: 6px; min-width: 0; flex: 1 1 220px; }
.acct-l b { font: 600 18px/1.2 var(--f-body); letter-spacing: -.02em; }
.acct-l small { color: var(--muted); font-size: 12.5px; }
.acct-tag { justify-self: start; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; padding: 4px 7px; border-radius: 3px; background: var(--surface2); color: var(--muted); }
.acct-tag.pro { background: var(--accent); color: #fff; }
.acct-bar { height: 4px; background: var(--surface2); border-radius: 1px; overflow: hidden; max-width: 260px; }
.acct-bar i { display: block; height: 100%; background: var(--accent); }
.acct-buy { display: flex; gap: 8px; flex-wrap: wrap; }
.pw-lead { margin: 0; color: var(--muted); }
.pw-plans { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pw-plan { display: grid; gap: 4px; text-align: left; padding: 16px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg); transition: border-color .2s, transform .2s; }
.pw-plan:hover { border-color: var(--accent); transform: translateY(-1px); }
.pw-plan.best { border-color: var(--accent); }
.pw-plan b { font: 400 34px/1 var(--f-cond); }
.pw-plan span { font: 500 10.5px var(--f-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.pw-plan:disabled { opacity: .6; cursor: progress; }
.pw-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; font-size: 14px; }
.pw-list li::before { content: "✓"; color: var(--accent); margin-right: 8px; font-weight: 700; }
@media (max-width: 420px) { .pw-plans { grid-template-columns: 1fr; } }`;
  document.head.appendChild(st);

  window.FripeAccount = {
    boot, save, pull, mount, paywall, showAuth, hideAuth,
    get user() { return user; }, get pro() { return isPro(); }, max: FREE_MAX,
    canAdd(S, k) { return isPro() || realCount(S) + (k || 1) <= FREE_MAX; },
    allows(S) { return isPro() || realCount(S) <= FREE_MAX; },
    count: realCount,
    photos,
  };
})();
