// TikTok Content Agent — interface (vanilla JS, aucune dépendance)
const S = {
  account: localStorage.getItem("account") || "argent",
  tab: localStorage.getItem("tab") || "calendar",
  accounts: [], videos: [], jobs: [], selScript: null, filter: new Set(),
  modalOpen: false, lastJobsKey: "",
};
const STATUS = {
  idee: "Idée", script: "Script prêt", en_cours: "En cours", terminee: "Terminée", exportee: "Exportée", erreur: "Erreur",
};
const GROUP = { a_creer: ["idee", "script", "erreur"], en_cours: ["en_cours"], terminee: ["terminee"], exportee: ["exportee"] };

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pill = (st) => `<span class="pill" style="--pc:var(--s-${st})">${STATUS[st] || st}</span>`;
const fmtDate = (d) => d ? new Date(d + "T12:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : "Sans date";

async function api(path, opts = {}) {
  const r = await fetch(path, { headers: { "content-type": "application/json" }, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.detail || r.statusText);
  return data;
}
function toast(msg, ms = 3500) { const t = $("#toast"); t.textContent = msg; t.classList.remove("hidden"); clearTimeout(t._t); t._t = setTimeout(() => t.classList.add("hidden"), ms); }

// ------------------------------------------------------------------ comptes
async function loadAccounts() {
  S.accounts = await api("/api/accounts");
  $("#accounts").innerHTML = S.accounts.map((a) => {
    const c = a.counts;
    const n = (k) => GROUP[k].reduce((s, st) => s + (c[st] || 0), 0);
    return `<button class="acc ${a.id === S.account ? "active" : ""}" style="--c:${a.color}" data-acc="${a.id}">
      <div class="t">${a.emoji} ${esc(a.label)}</div>
      <div class="counts">
        <span class="pill" style="--pc:var(--s-script)">${n("a_creer")} à créer</span>
        <span class="pill" style="--pc:var(--s-en_cours)">${n("en_cours")} en cours</span>
        <span class="pill" style="--pc:var(--s-terminee)">${n("terminee")} terminées</span>
        <span class="pill" style="--pc:var(--s-exportee)">${n("exportee")} exportées</span>
      </div></button>`;
  }).join("");
  document.querySelectorAll(".acc").forEach((b) => b.onclick = () => { S.account = b.dataset.acc; localStorage.setItem("account", S.account); S.selScript = null; refresh(); });
}
const acc = () => S.accounts.find((a) => a.id === S.account) || {};

async function loadVideos() { S.videos = await api(`/api/videos?account=${S.account}`); }

// ------------------------------------------------------------------ onglets
document.querySelectorAll("#tabs button").forEach((b) => b.onclick = () => { S.tab = b.dataset.tab; localStorage.setItem("tab", S.tab); render(); });

async function refresh() { await loadAccounts(); await loadVideos(); render(); }

function render() {
  document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === S.tab));
  ({ calendar: viewCalendar, ideas: viewIdeas, scripts: viewScripts, videos: viewVideos, settings: viewSettings })[S.tab]();
}

function legend() {
  return `<div class="legend">${Object.keys(STATUS).map((st) =>
    `<span class="pill ${S.filter.size && !S.filter.has(st) ? "off" : ""}" data-f="${st}" style="--pc:var(--s-${st})">${STATUS[st]} (${S.videos.filter((v) => v.status === st).length})</span>`).join("")}</div>`;
}
function bindLegend() {
  document.querySelectorAll("[data-f]").forEach((p) => p.onclick = () => { const f = p.dataset.f; S.filter.has(f) ? S.filter.delete(f) : S.filter.add(f); render(); });
}
const filtered = () => S.videos.filter((v) => !S.filter.size || S.filter.has(v.status));

// ------------------------------------------------------------------ CALENDRIER
function viewCalendar() {
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  const byDay = {};
  filtered().forEach((v) => (byDay[v.pub_date] ||= []).push(v));
  const days = Object.keys(byDay).sort();
  $("#view").innerHTML = `
  <div class="card">
    <h2>${acc().emoji} Préparer du contenu — ${esc(acc().label)}</h2>
    <div class="row">
      <div><label>Nombre de jours</label><input id="pDays" type="number" min="1" max="365" value="30"></div>
      <div><label>Vidéos par jour</label><input id="pPer" type="number" min="1" max="10" value="2"></div>
      <div><label>Durée des vidéos (secondes)</label><input id="pDur" type="number" min="20" max="600" value="70"></div>
      <div><label>À partir du</label><input id="pStart" type="date" value="${tomorrow}"></div>
    </div>
    <label style="display:flex;gap:8px;align-items:center;margin-top:12px;color:var(--text)"><input id="pScripts" type="checkbox" checked style="width:auto"> Écrire aussi les scripts complets (scènes, textes à l'écran...) juste après les idées</label>
    <div class="total" id="pTotal"></div>
    <div class="btns" style="margin-top:12px"><button class="btn primary big" id="pGo">GÉNÉRER LE CALENDRIER</button></div>
    <p class="muted small">THÈME → IDÉE → HOOK → SCRIPT → SCÈNES. Les idées tiennent compte de tout ce qui existe déjà sur ce compte pour éviter les répétitions.</p>
  </div>
  ${legend()}
  ${days.length ? `<div class="cal">${days.map((d) => `<div class="day"><div class="d">${fmtDate(d)}</div>${byDay[d].map((v) =>
    `<div class="slot" style="--pc:var(--s-${v.status})" data-open="${v.id}"><span class="h">${esc(v.post_time || "")}</span><span class="ti">${esc(v.title || v.subject)}<br>${pill(v.status)}</span></div>`).join("")}</div>`).join("")}</div>`
    : `<div class="empty">Aucune vidéo planifiée pour ce compte. Remplis le formulaire ci-dessus 👆</div>`}`;
  const upd = () => { const n = (+$("#pDays").value || 0) * (+$("#pPer").value || 0); $("#pTotal").innerHTML = `${$("#pDays").value} jours × ${$("#pPer").value} vidéos/jour = <b>${n} vidéos</b> de ${$("#pDur").value} s pour ${esc(acc().short)}`; };
  ["#pDays", "#pPer", "#pDur"].forEach((s) => $(s).oninput = upd); upd();
  $("#pGo").onclick = async () => {
    const body = { account: S.account, days: +$("#pDays").value, per_day: +$("#pPer").value, duration: +$("#pDur").value, start_date: $("#pStart").value || null, with_scripts: $("#pScripts").checked };
    try { const r = await api("/api/plans", { method: "POST", body }); toast(`Calendrier lancé : ${r.total} vidéos en préparation...`); pollJobs(true); }
    catch (e) { toast("Erreur : " + e.message); }
  };
  bindLegend(); bindOpen();
}

// ------------------------------------------------------------------ IDÉES
function viewIdeas() {
  const vs = filtered();
  const missing = S.videos.filter((v) => !v.scenes?.length && v.status !== "en_cours").length;
  $("#view").innerHTML = `
  <div class="card"><div class="btns" style="justify-content:space-between;align-items:center">
    <div><h2 style="margin:0">💡 Idées — ${esc(acc().short)}</h2><span class="muted">${S.videos.length} idées · ${missing} sans script</span></div>
    <button class="btn primary" id="allScripts" ${missing ? "" : "disabled"}>Écrire les ${missing} scripts manquants</button></div></div>
  ${legend()}
  ${vs.length ? `<div class="card" style="padding:0;overflow:auto"><table><tr><th>Date</th><th>Sujet & angle</th><th>Hook</th><th>Titre</th><th>Visuel</th><th>Statut</th></tr>
  ${vs.map((v) => `<tr class="click" data-open="${v.id}"><td class="small">${esc(v.pub_date || "")}<br>${esc(v.post_time || "")}</td>
    <td><b>${esc(v.subject)}</b><br><span class="muted small">${esc(v.angle)}</span></td><td>« ${esc(v.hook)} »</td><td>${esc(v.title)}</td>
    <td class="small muted">${esc(v.visual_idea)}</td><td>${pill(v.status)}</td></tr>`).join("")}</table></div>` : `<div class="empty">Pas encore d'idées : va dans Calendrier.</div>`}`;
  $("#allScripts").onclick = async () => { const r = await api("/api/scripts", { method: "POST", body: { account: S.account } }); toast(`${r.count} scripts en cours d'écriture...`); pollJobs(true); };
  bindLegend(); bindOpen();
}

// ------------------------------------------------------------------ SCRIPTS
function viewScripts() {
  const vs = S.videos.filter((v) => v.scenes?.length);
  if (!S.selScript || !vs.find((v) => v.id === S.selScript)) S.selScript = vs[0]?.id;
  const v = vs.find((x) => x.id === S.selScript);
  $("#view").innerHTML = vs.length ? `<div class="split">
    <div class="card list">${vs.map((x) => `<div class="li ${x.id === S.selScript ? "sel" : ""}" data-sel="${x.id}"><div>${esc(x.title)}</div><div class="small muted">${esc(x.pub_date || "")} · ~${x.duration_est || "?"} s · ${pill(x.status)}</div></div>`).join("")}</div>
    <div class="card" id="scriptEditor">${scriptEditor(v)}</div></div>`
    : `<div class="empty">Aucun script pour l'instant. Écris-les depuis l'onglet Idées.</div>`;
  document.querySelectorAll("[data-sel]").forEach((e) => e.onclick = () => { S.selScript = +e.dataset.sel; viewScripts(); });
  if (v) bindEditor(v, $("#scriptEditor"));
}

function scriptEditor(v) {
  const hasMp4 = ["terminee", "exportee"].includes(v.status);
  return `
  <div class="btns" style="justify-content:space-between"><div>${pill(v.status)} <span class="muted small">Durée estimée ~${v.duration_est || "?"} s (cible ${v.duration_target} s)</span></div>
    <div class="btns">
      <button class="btn" data-act="rescript">↻ Réécrire le script</button>
      <button class="btn primary big" data-act="render" ${v.status === "en_cours" ? "disabled" : ""}>${v.status === "en_cours" ? "EN COURS..." : hasMp4 ? "RE-GÉNÉRER LA VIDÉO" : "GÉNÉRER LA VIDÉO"}</button>
    </div></div>
  ${v.status === "en_cours" ? `<div class="bar"><i style="width:${v.progress || 0}%"></i></div>` : ""}
  ${v.error ? `<div class="err">⚠️ ${esc(v.error)}</div>` : ""}
  <div class="grid2">
    <div><label>Sujet</label><input data-f="subject" value="${esc(v.subject)}"></div>
    <div><label>Angle</label><input data-f="angle" value="${esc(v.angle)}"></div>
  </div>
  <label>Hook (1re phrase)</label><input data-f="hook" value="${esc(v.hook)}">
  <div class="grid2">
    <div><label>Titre</label><input data-f="title" value="${esc(v.title)}"></div>
    <div><label>Hashtags</label><input data-f="hashtags" value="${esc((v.hashtags || []).join(" "))}"></div>
  </div>
  <label>Description</label><textarea data-f="description">${esc(v.description)}</textarea>
  <label>Idée de visuel</label><input data-f="visual_idea" value="${esc(v.visual_idea)}">
  <div class="grid2"><div><label>Date de publication</label><input type="date" data-f="pub_date" value="${esc(v.pub_date)}"></div><div><label>Heure</label><input data-f="post_time" value="${esc(v.post_time)}"></div></div>
  <h3>Découpage scène par scène (${(v.scenes || []).length} scènes)</h3>
  <div id="scenes">${(v.scenes || []).map((s, i) => sceneBox(s, i)).join("")}</div>
  <div class="btns"><button class="btn" data-act="addScene">+ Ajouter une scène</button><button class="btn primary" data-act="save">💾 Enregistrer</button></div>`;
}
function sceneBox(s, i) {
  return `<div class="scene" data-scene="${i}"><div class="btns" style="justify-content:space-between"><span class="n">Scène ${i + 1}</span><button class="btn small danger" data-del="${i}">Supprimer</button></div>
    <label>Voix off</label><textarea data-s="voice">${esc(s.voice)}</textarea>
    <div class="grid2"><div><label>Texte à l'écran</label><input data-s="on_screen" value="${esc(s.on_screen)}"></div>
    <div><label>Mots en couleur (séparés par des virgules)</label><input data-s="emphasis" value="${esc((s.emphasis || []).join(", "))}"></div></div>
    <div class="grid2"><div><label>Visuel (description)</label><input data-s="visual" value="${esc(s.visual)}"></div>
    <div><label>Prompt image (anglais)</label><input data-s="image_prompt" value="${esc(s.image_prompt)}"></div></div></div>`;
}
function collectEditor(root) {
  const data = {};
  root.querySelectorAll("[data-f]").forEach((e) => data[e.dataset.f] = e.value);
  data.hashtags = data.hashtags.split(/[\s,]+/).filter(Boolean).map((t) => (t.startsWith("#") ? t : "#" + t));
  data.scenes = [...root.querySelectorAll("[data-scene]")].map((b) => {
    const s = {}; b.querySelectorAll("[data-s]").forEach((e) => s[e.dataset.s] = e.value);
    s.emphasis = s.emphasis.split(",").map((x) => x.trim()).filter(Boolean); return s;
  }).filter((s) => s.voice.trim());
  return data;
}
function bindEditor(v, root) {
  const save = async (quiet) => { const d = collectEditor(root); if (!d.scenes.length) delete d.scenes; const nv = await api(`/api/videos/${v.id}`, { method: "PUT", body: d }); if (!quiet) toast("Script enregistré ✔"); return nv; };
  root.querySelectorAll("[data-act]").forEach((b) => b.onclick = async () => {
    try {
      const a = b.dataset.act;
      if (a === "save") { await save(); await refresh(); }
      if (a === "addScene") { root.querySelector("#scenes").insertAdjacentHTML("beforeend", sceneBox({ voice: "", on_screen: "", visual: "", image_prompt: "", emphasis: [] }, root.querySelectorAll("[data-scene]").length)); bindEditor(v, root); }
      if (a === "rescript") { if (!confirm("Réécrire entièrement le script avec l'IA ?")) return; await api("/api/scripts", { method: "POST", body: { video_ids: [v.id] } }); toast("Réécriture en cours..."); pollJobs(true); }
      if (a === "render") { if (v.scenes?.length) await save(true); await api(`/api/videos/${v.id}/render`, { method: "POST" }); toast("Génération de la vidéo lancée 🎬"); closeModal(); pollJobs(true); refresh(); }
    } catch (e) { toast("Erreur : " + e.message); }
  });
  root.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => { b.closest(".scene").remove(); root.querySelectorAll("[data-scene]").forEach((s, i) => { s.dataset.scene = i; s.querySelector(".n").textContent = `Scène ${i + 1}`; }); });
}

// ------------------------------------------------------------------ VIDÉOS
function viewVideos() {
  const cols = [["a_creer", "À créer", "script"], ["en_cours", "En cours", "en_cours"], ["terminee", "Terminées", "terminee"], ["exportee", "Exportées", "exportee"]];
  $("#view").innerHTML = `<div class="board">${cols.map(([k, label, c]) => {
    const vs = S.videos.filter((v) => GROUP[k].includes(v.status));
    return `<div class="col"><h3><span>${pill(c).replace(STATUS[c], label)}</span><span class="muted">${vs.length}</span></h3>
      ${k === "a_creer" && vs.length ? `<button class="btn small" id="renderAll" style="width:100%;margin-bottom:10px">Générer les ${Math.min(vs.length, 5)} prochaines</button>` : ""}
      ${vs.map(videoCard).join("") || `<div class="muted small">—</div>`}</div>`;
  }).join("")}</div>`;
  document.querySelectorAll("[data-render]").forEach((b) => b.onclick = async () => { try { await api(`/api/videos/${b.dataset.render}/render`, { method: "POST" }); toast("Génération lancée 🎬"); pollJobs(true); refresh(); } catch (e) { toast(e.message); } });
  document.querySelectorAll("[data-export]").forEach((b) => b.onclick = async () => { try { const r = await api(`/api/videos/${b.dataset.export}/export`, { method: "POST" }); toast("Exportée dans " + r.path, 6000); refresh(); } catch (e) { toast(e.message); } });
  document.querySelectorAll("[data-copy]").forEach((b) => b.onclick = () => { const v = S.videos.find((x) => x.id === +b.dataset.copy); navigator.clipboard?.writeText(`${v.caption || ""}`); toast("Légende copiée 📋"); });
  const ra = $("#renderAll");
  if (ra) ra.onclick = async () => { const ids = S.videos.filter((v) => GROUP.a_creer.includes(v.status)).slice(0, 5).map((v) => v.id); await api("/api/render", { method: "POST", body: { video_ids: ids } }); toast(`${ids.length} vidéos en file d'attente`); pollJobs(true); refresh(); };
  bindOpen();
}
function videoCard(v) {
  const done = ["terminee", "exportee"].includes(v.status);
  return `<div class="vcard"><div class="small muted">${esc(v.pub_date || "")} ${esc(v.post_time || "")}</div>
    <div class="ti" data-open="${v.id}">${esc(v.title || v.subject)}</div>${pill(v.status)}
    ${v.status === "en_cours" ? `<div class="bar"><i style="width:${v.progress || 0}%"></i></div><div class="small muted">${v.progress || 0} %</div>` : ""}
    ${v.error && v.status === "erreur" ? `<div class="err">${esc(v.error.slice(0, 200))}</div>` : ""}
    ${done ? `<video src="/media/${v.id}?t=${encodeURIComponent(v.updated_at)}" controls preload="metadata"></video><div class="small muted">${v.duration_real || ""} s · ${esc(v.notes || "")}</div>` : ""}
    <div class="btns" style="margin-top:6px">
      ${GROUP.a_creer.includes(v.status) ? `<button class="btn primary" data-render="${v.id}">GÉNÉRER LA VIDÉO</button>` : ""}
      ${done ? `<a class="btn" href="/media/${v.id}?download=1">⬇ MP4</a><button class="btn" data-copy="${v.id}">📋 Légende</button>` : ""}
      ${v.status === "terminee" ? `<button class="btn" data-export="${v.id}">📤 Exporter</button>` : ""}
    </div></div>`;
}

// ------------------------------------------------------------------ fiche vidéo (panneau)
function bindOpen() { document.querySelectorAll("[data-open]").forEach((e) => e.onclick = () => openVideo(+e.dataset.open)); }
async function openVideo(id) {
  const v = await api(`/api/videos/${id}`);
  S.modalOpen = true;
  const done = ["terminee", "exportee"].includes(v.status);
  $("#modalBox").innerHTML = `<div class="btns" style="justify-content:space-between"><h2>${esc(v.title || v.subject)}</h2><button class="btn" id="mClose">✕</button></div>
    ${done ? `<video src="/media/${v.id}?t=${encodeURIComponent(v.updated_at)}" controls style="width:260px;border-radius:10px;background:#000"></video>
      <div class="btns" style="margin:8px 0"><a class="btn" href="/media/${v.id}?download=1">⬇ Télécharger le MP4</a>
      ${v.status === "terminee" ? `<button class="btn" id="mExport">📤 Exporter</button>` : ""}
      <button class="btn" id="mMark">${v.status === "exportee" ? "↩ Marquer comme terminée" : "✔ Marquer comme exportée"}</button></div>
      <label>Légende à copier dans TikTok</label><textarea readonly rows="5">${esc(v.caption)}</textarea>` : ""}
    ${v.scenes?.length ? `<div id="mEditor">${scriptEditor(v)}</div>` : `
      <p>${pill(v.status)}</p><p><b>Hook :</b> « ${esc(v.hook)} »</p><p><b>Angle :</b> ${esc(v.angle)}</p><p><b>Description :</b> ${esc(v.description)}</p>
      <p><b>Visuel :</b> ${esc(v.visual_idea)}</p><p class="muted">${esc((v.hashtags || []).join(" "))}</p>
      <div class="btns"><button class="btn" id="mScript">📝 Écrire le script</button><button class="btn primary big" id="mRender">GÉNÉRER LA VIDÉO</button></div>`}
    <h3 class="muted">Zone dangereuse</h3><button class="btn danger" id="mDel">Supprimer cette vidéo</button>`;
  $("#modal").classList.remove("hidden");
  $("#mClose").onclick = closeModal;
  if ($("#mEditor")) bindEditor(v, $("#mEditor"));
  if ($("#mScript")) $("#mScript").onclick = async () => { await api("/api/scripts", { method: "POST", body: { video_ids: [v.id] } }); toast("Écriture du script..."); closeModal(); pollJobs(true); };
  if ($("#mRender")) $("#mRender").onclick = async () => { await api(`/api/videos/${v.id}/render`, { method: "POST" }); toast("Génération lancée 🎬 (le script sera écrit d'abord)"); closeModal(); pollJobs(true); refresh(); };
  if ($("#mExport")) $("#mExport").onclick = async () => { const r = await api(`/api/videos/${v.id}/export`, { method: "POST" }); toast("Exportée dans " + r.path, 6000); closeModal(); refresh(); };
  if ($("#mMark")) $("#mMark").onclick = async () => { await api(`/api/videos/${v.id}/status`, { method: "POST", body: { status: v.status === "exportee" ? "terminee" : "exportee" } }); closeModal(); refresh(); };
  $("#mDel").onclick = async () => { if (!confirm("Supprimer définitivement cette vidéo ?")) return; await api(`/api/videos/${v.id}`, { method: "DELETE" }); closeModal(); refresh(); };
}
function closeModal() { S.modalOpen = false; $("#modal").classList.add("hidden"); }
$("#modal").onclick = (e) => { if (e.target.id === "modal") closeModal(); };

// ------------------------------------------------------------------ PARAMÈTRES
async function viewSettings() {
  $("#view").innerHTML = `<div class="empty">Chargement...</div>`;
  const [cfg, st] = await Promise.all([api("/api/settings"), api("/api/status")]);
  const chk = (ok, label, info = "") => `<div class="chk"><span class="${ok ? "ok" : "ko"}">${ok ? "✔" : "✖"}</span> ${label}<div class="small muted">${esc(info)}</div></div>`;
  const opt = (name, val, cur, title, desc) => `<label class="opt ${val === cur ? "sel" : ""}"><input type="radio" name="${name}" value="${val}" ${val === cur ? "checked" : ""}><div><b style="color:var(--text)">${title}</b><div class="small muted">${desc}</div></div></label>`;
  $("#view").innerHTML = `
  <div class="card"><h2>🩺 Environnement détecté</h2><div class="status-grid">
    ${chk(st.ffmpeg, "ffmpeg (montage vidéo)", st.ffmpeg ? "OK" : "À installer : https://ffmpeg.org")}
    ${chk(st.claude_code.ok, "Claude Code (abonnement Pro)", st.claude_code.info)}
    ${chk(st.ollama, "Ollama (IA locale, optionnel)", st.ollama ? "détecté" : "non détecté")}
    ${chk(st.edge_tts, "Voix Edge TTS (gratuit, en ligne)", st.edge_tts ? "joignable" : "injoignable → Piper local utilisé")}
    ${chk(st.piper, "Voix Piper (100 % local)", st.piper_voices.length ? "voix : " + st.piper_voices.join(", ") : "voix téléchargée au 1er usage")}
    ${chk(st.pollinations, "Images IA Pollinations (gratuit)", st.pollinations ? "joignable" : "injoignable → fonds locaux")}
    ${chk(st.fonts.length >= 3, "Polices des sous-titres", st.fonts.join(", ") || "téléchargées au 1er rendu")}
    ${chk(true, "Musiques", Object.entries(st.music).map(([a, n]) => `${a}: ${n}`).join(" · ") + " (dossier assets/music/<compte>)")}
    <div class="chk"><span class="ok">✔</span> Services payants<div class="small muted">Aucun. Rien n'est facturé en plus de ton abonnement.</div></div>
  </div></div>

  <div class="card"><h2>✍️ Écriture des idées et scripts</h2>
    ${opt("llm", "claude_code", cfg.llm_provider, "Claude Code — ton abonnement Pro (recommandé)", "Utilise la commande « claude -p » déjà installée. Aucune clé API, aucun coût en plus : ça consomme seulement ton quota Pro (limite par tranche de 5 h).")}
    ${opt("llm", "ollama", cfg.llm_provider, "Ollama — IA 100 % locale et gratuite", "Nécessite d'installer Ollama + un modèle (ex : llama3.1, qwen2.5). Qualité inférieure en français, mais illimité.")}
    ${opt("llm", "offline", cfg.llm_provider, "Hors-ligne — modèles de phrases (dépannage)", "Sans IA. Qualité basique, utile seulement pour tester ou si tout le reste est indisponible.")}
    <div class="grid2"><div><label>Modèle Claude (vide = défaut de ton Claude Code, ex : sonnet, opus)</label><input id="sModel" value="${esc(cfg.claude_model)}"></div>
    <div><label>Modèle Ollama</label><input id="sOllama" value="${esc(cfg.ollama_model)}"></div></div>
  </div>

  <div class="card"><h2>🎙️ Voix off</h2>
    ${opt("tts", "edge", cfg.tts_engine, "Edge TTS — voix neuronales Microsoft (gratuit)", "Très naturel, sans clé, nécessite Internet. Bascule automatique sur Piper si indisponible.")}
    ${opt("tts", "piper", cfg.tts_engine, "Piper — 100 % local et open source", "Fonctionne hors-ligne. Voix un peu moins naturelle. ~60 Mo téléchargés une fois par voix.")}
  </div>

  <div class="card"><h2>🖼️ Visuels</h2>
    ${["argent", "stoicisme", "reflexion"].map((a) => `<label>${esc(S.accounts.find((x) => x.id === a)?.label || a)}</label>
      <select data-vs="${a}">${[["ai", "Images IA gratuites (Pollinations.ai)"], ["pexels", "Vidéos Pexels (clé gratuite requise)"], ["local", "Fonds générés localement"]].map(([v, l]) => `<option value="${v}" ${cfg.visual_source[a] === v ? "selected" : ""}>${l}</option>`).join("")}</select>`).join("")}
    <h3>🐼 Mascotte du compte Argent</h3>
    ${opt("panda", "ai", cfg.panda_mode, "Panda en images IA", "Le panda en costume apparaît dans chaque image générée (style 3D). Nécessite Internet.")}
    ${opt("panda", "local", cfg.panda_mode, "Panda animé dessiné localement", "Mascotte vectorielle animée : bouche synchronisée sur la voix, clignements, gestes. 100 % hors-ligne.")}
    <div class="grid2"><div><label>Jeton Pollinations (optionnel, gratuit — plus rapide, sans filigrane)</label><input id="sPoll" value="${esc(cfg.pollinations_token)}" placeholder="auth.pollinations.ai"></div>
    <div><label>Clé API Pexels (optionnel, gratuit)</label><input id="sPexels" value="${esc(cfg.pexels_key)}" placeholder="pexels.com/api"></div></div>
  </div>

  <div class="card"><h2>📤 Publication</h2>
    <div class="grid2">${["argent", "stoicisme", "reflexion"].map((a) => `<div><label>Pseudo TikTok — ${a} (affiché en filigrane)</label><input data-h="${a}" value="${esc(cfg.handles[a] || "")}" placeholder="@moncompte"></div>`).join("")}
    <div><label>Dossier d'export</label><input id="sExport" value="${esc(cfg.export_dir)}" placeholder="${esc(cfg.export_dir_effective)}"></div></div>
    <label>Heures de publication conseillées (dans l'ordre de priorité)</label><input id="sTimes" value="${esc(cfg.posting_times.join(", "))}">
    <label>Volume de la musique (vide = par défaut du compte, 0 = sans musique)</label><input id="sMusic" type="number" step="0.01" min="0" max="1" value="${cfg.music_volume ?? ""}">
  </div>
  <button class="btn primary big" id="sSave">💾 Enregistrer les paramètres</button>`;
  document.querySelectorAll(".opt input").forEach((i) => i.onchange = () => document.querySelectorAll(`input[name=${i.name}]`).forEach((x) => x.closest(".opt").classList.toggle("sel", x.checked)));
  $("#sSave").onclick = async () => {
    const val = (n) => document.querySelector(`input[name=${n}]:checked`)?.value;
    const vs = {}; document.querySelectorAll("[data-vs]").forEach((s) => vs[s.dataset.vs] = s.value);
    const hs = {}; document.querySelectorAll("[data-h]").forEach((s) => hs[s.dataset.h] = s.value.trim());
    const mv = $("#sMusic").value.trim();
    await api("/api/settings", { method: "PUT", body: {
      llm_provider: val("llm"), tts_engine: val("tts"), panda_mode: val("panda"), visual_source: vs, handles: hs,
      claude_model: $("#sModel").value.trim(), ollama_model: $("#sOllama").value.trim(), pollinations_token: $("#sPoll").value.trim(),
      pexels_key: $("#sPexels").value.trim(), export_dir: $("#sExport").value.trim(),
      posting_times: $("#sTimes").value.split(/[,\s]+/).filter((t) => /^\d{1,2}:\d{2}$/.test(t)),
      music_volume: mv === "" ? null : +mv,
    } });
    toast("Paramètres enregistrés ✔");
  };
}

// ------------------------------------------------------------------ tâches
async function pollJobs(force) {
  try { S.jobs = await api("/api/jobs?active=1"); } catch { return; }
  const b = $("#jobsBadge");
  if (S.jobs.length) {
    const run = S.jobs.find((j) => j.status === "running");
    b.textContent = `⏳ ${S.jobs.length} tâche(s) — ${run ? run.message + " " + run.progress + "%" : "en attente"}`;
    b.classList.remove("hidden");
  } else b.classList.add("hidden");
  $("#jobsPanel").innerHTML = `<b>Tâches en cours</b>` + (S.jobs.map((j) => `<div class="job">#${j.id} ${j.kind} — ${esc(j.message)} <div class="bar"><i style="width:${j.progress}%"></i></div>${j.status === "queued" ? `<button class="btn small" data-cancel="${j.id}">Annuler</button>` : ""}</div>`).join("") || `<div class="muted small">Aucune</div>`);
  document.querySelectorAll("[data-cancel]").forEach((x) => x.onclick = async () => { await api(`/api/jobs/${x.dataset.cancel}/cancel`, { method: "POST" }); pollJobs(true); refresh(); });
  const key = JSON.stringify(S.jobs.map((j) => [j.id, j.progress, j.status]));
  if ((force || key !== S.lastJobsKey) && !S.modalOpen && S.tab !== "settings" && !(S.tab === "scripts" && document.activeElement?.closest("#scriptEditor"))) {
    await loadAccounts(); await loadVideos(); render();
  }
  if (S.lastJobsKey && !S.jobs.length && key !== S.lastJobsKey) toast("✅ Tâches terminées");
  S.lastJobsKey = key;
}
$("#jobsBadge").onclick = () => $("#jobsPanel").classList.toggle("hidden");
setInterval(pollJobs, 2500);

refresh();
