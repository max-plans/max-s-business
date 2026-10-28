/* Relais entre Fripe et Vinted : garde l'annonce à publier, et transmet les demandes (messages, bordereaux)
   à un onglet Vinted, qui les exécute avec la session Vinted de l'utilisateur. */
const DOMAINS = /^vinted\.(fr|be|lu|es|it|de|at|nl|pl|pt|cz|sk|lt|co\.uk|com|se|fi|dk|ro|hu|hr|gr|ie)$/;
const MAX_AGE = 15 * 60 * 1000;
const FRIPE = 'https://fripe-iota.vercel.app/';
const pickDomain = (d) => (DOMAINS.test(d || '') ? d : 'vinted.fr');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* un onglet Vinted prêt : celui déjà ouvert, sinon un nouvel onglet en arrière-plan */
async function vintedTab(domain) {
  const open = await chrome.tabs.query({ url: `https://www.${domain}/*` });
  let tab = open.find((t) => t.status === 'complete') || open[0];
  if (!tab) tab = await chrome.tabs.create({ url: `https://www.${domain}/`, active: false });
  if (tab.status !== 'complete') {
    await new Promise((ok) => {
      const h = (id, info) => { if (id === tab.id && info.status === 'complete') { chrome.tabs.onUpdated.removeListener(h); ok(); } };
      chrome.tabs.onUpdated.addListener(h); setTimeout(ok, 20000);
    });
  }
  return tab;
}
async function askVinted(domain, op, args) {
  const tab = await vintedTab(domain);
  for (let i = 0; i < 8; i++) {
    try {
      const res = await chrome.tabs.sendMessage(tab.id, { type: 'op', op, args });
      if (res) return res;
    } catch (e) { /* le script de la page n'est pas encore prêt */ }
    await sleep(600);
  }
  return { error: 'tab' };
}

chrome.runtime.onMessage.addListener((msg, sender, send) => {
  const fromFripe = sender.url && sender.url.startsWith(FRIPE);
  if (msg.type === 'publish') {
    if (!fromFripe) { send({ ok: false, error: 'origine refusée' }); return; }
    const domain = pickDomain(msg.item.domain);
    chrome.storage.local.set({ pending: { item: msg.item, at: Date.now() } }, () => {
      chrome.tabs.create({ url: `https://www.${domain}/items/new` }, () => send({ ok: true }));
    });
    return true;
  }
  if (msg.type === 'vinted') {
    if (!fromFripe) { send({ error: 'origine refusée' }); return; }
    askVinted(pickDomain(msg.domain), msg.op, msg.args || {}).then(send, (e) => send({ error: String(e && e.message || e) }));
    return true;
  }
  if (msg.type === 'take') {
    chrome.storage.local.get('pending', ({ pending }) => {
      if (!pending || Date.now() - pending.at > MAX_AGE) { chrome.storage.local.remove('pending'); send({ item: null }); return; }
      chrome.storage.local.remove('pending', () => send({ item: pending.item }));
    });
    return true;
  }
});
