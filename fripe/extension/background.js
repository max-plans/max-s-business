/* Garde l'annonce à publier le temps d'ouvrir Vinted, puis la remet au formulaire de vente. */
const DOMAINS = /^vinted\.(fr|be|lu|es|it|de|at|nl|pl|pt|cz|sk|lt|co\.uk|com|se|fi|dk|ro|hu|hr|gr|ie)$/;
const MAX_AGE = 15 * 60 * 1000;

chrome.runtime.onMessage.addListener((msg, sender, send) => {
  if (msg.type === 'publish') {
    if (!sender.url || !sender.url.startsWith('https://fripe-iota.vercel.app/')) { send({ ok: false, error: 'origine refusée' }); return; }
    const domain = DOMAINS.test(msg.item.domain || '') ? msg.item.domain : 'vinted.fr';
    chrome.storage.local.set({ pending: { item: msg.item, at: Date.now() } }, () => {
      chrome.tabs.create({ url: `https://www.${domain}/items/new` }, () => send({ ok: true }));
    });
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
