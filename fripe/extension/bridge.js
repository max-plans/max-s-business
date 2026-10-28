/* Pont entre le site Fripe et l'extension : le site demande une publication, l'extension ouvre Vinted. */
(() => {
  const VERSION = chrome.runtime.getManifest().version;
  document.documentElement.dataset.fripeConnect = VERSION;
  /* l'identifiant de la demande passe en dernier : une réponse de Vinted peut contenir son propre champ « id » */
  const reply = (id, data) => window.postMessage({ ...data, source: 'fripe-connect', id }, location.origin);

  window.addEventListener('message', (e) => {
    if (e.source !== window || e.origin !== location.origin) return;
    const m = e.data;
    if (!m || m.source !== 'fripe' || typeof m.type !== 'string') return;
    if (m.type === 'ping') return reply(m.id, { type: 'pong', version: VERSION });
    if (m.type === 'vinted' && typeof m.op === 'string') {
      chrome.runtime.sendMessage({ type: 'vinted', op: m.op, args: m.args, domain: m.domain }, (res) => {
        if (chrome.runtime.lastError) return reply(m.id, { type: 'vinted', error: chrome.runtime.lastError.message });
        reply(m.id, { type: 'vinted', ...(res || { error: 'vide' }) });
      });
      return;
    }
    if (m.type === 'publish' && m.item && typeof m.item.title === 'string') {
      chrome.runtime.sendMessage({ type: 'publish', item: m.item }, (res) => {
        if (chrome.runtime.lastError) return reply(m.id, { type: 'published', ok: false, error: chrome.runtime.lastError.message });
        reply(m.id, { type: 'published', ok: !!(res && res.ok), error: res && res.error });
      });
    }
  });
  window.postMessage({ source: 'fripe-connect', type: 'ready', version: VERSION }, location.origin);
})();
