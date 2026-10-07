// ============================================================
// Studio — TikTok Content Agent (vanilla JS, aucune dépendance)
// ============================================================

// ---------- icônes (style Lucide) ----------
const I = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ICON = {
  home: I('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'),
  calendar: I('<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>'),
  script: I('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
  film: I('<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4M3 12h18"/>'),
  settings: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  sparkles: I('<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
  wand: I('<path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5"/>'),
  play: I('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>'),
  download: I('<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>'),
  check: I('<path d="M5 12.5 10 17l9-10"/>'),
  x: I('<path d="M6 6l12 12M18 6 6 18"/>'),
  trash: I('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3"/>'),
  copy: I('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
  edit: I('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  send: I('<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>'),
  clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  moon: I('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  sun: I('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  refresh: I('<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8M21 3v5h-5"/>'),
};

// ---------- comptes ----------
const ACC = {
  argent: { name: "Panda Boss", topic: "Argent & finance", color: "#12b981", img: "/static/img/argent.png",
    tagline: "Le panda en costume qui explique les règles de l'argent." },
  stoicisme: { name: "Stoïcisme", topic: "Philosophie & discipline", color: "#d4a03a", img: "/static/img/stoicisme.png",
    tagline: "La sagesse antique appliquée à la vie d'aujourd'hui." },
  reflexion: { name: "Réflexion", topic: "Remise en question de la vie", color: "#8b5cf6", img: "/static/img/reflexion.png",
    tagline: "Les questions qu'on évite, posées sans détour." },
};

// ---------- statuts ----------
const ST = {
  idee: { label: "Idée", desc: "Script à écrire" },
  script: { label: "Script prêt", desc: "Prête à être créée" },
  en_cours: { label: "En création", desc: "Vidéo en cours de montage" },
  terminee: { label: "Prête", desc: "Prête à publier" },
  exportee: { label: "Publiée", desc: "Exportée / publiée" },
  erreur: { label: "Erreur", desc: "À relancer" },
};
const STAGE = { todo: ["idee", "script", "erreur"], making: ["en_cours"], ready: ["terminee"], posted: ["exportee"] };

const S = {
  account: get("account", "argent"), page: get("page", "home"),
  accounts: [], videos: [], jobs: [], cfg: null,
  scriptFilter: "all", videoFilter: "todo",
  sheet: null, // { id, tab, edit }
  jobsKey: "",
};

// ---------- utilitaires ----------
function get(k, d) { try { return localStorage.getItem(k) || d; } catch { return d; } }
function set(k, v) { try { localStorage.setItem(k, v); } catch {} }
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const badge = (st, extra = "") => `<span class="badge ${st === "en_cours" ? "pulse" : ""}" style="--sc:var(--st-${st})">${ST[st]?.label || st}${extra}</span>`;
const today = () => new Date().toISOString().slice(0, 10);
const dObj = (d) => new Date(d + "T12:00:00");
const fmtDay = (d) => d ? dObj(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) : "—";
const fmtLong = (d) => d ? dObj(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : "Sans date";
const vids = (stage) => S.videos.filter((v) => STAGE[stage].includes(v.status));
const acc = () => ACC[S.account];

async function api(path, opts = {}) {
  const r = await fetch(path, { headers: { "content-type": "application/json" }, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.detail || r.statusText);
  return data;
}
function toast(msg, ms = 3200) {
  const t = $("#toast"); t.textContent = msg; t.classList.remove("hidden");
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.add("hidden"), ms);
}
async function run(fn, okMsg) {
  try { const r = await fn(); if (okMsg) toast(okMsg); await reload(); return r; }
  catch (e) { toast("⚠️ " + e.message, 5000); }
}

// ---------- actions métier ----------
const A = {
  writeScripts: (ids) => run(() => api("/api/scripts", { method: "POST", body: ids ? { video_ids: ids } : { account: S.account } }), "✍️ Écriture des scripts lancée"),
  render: (id) => run(() => api(`/api/videos/${id}/render`, { method: "POST" }), "🎬 Création de la vidéo lancée"),
  renderMany: (ids) => run(() => api("/api/render", { method: "POST", body: { video_ids: ids } }), `🎬 ${ids.length} vidéo(s) en file d'attente`),
  publish: (id) => run(async () => { const r = await api(`/api/videos/${id}/export`, { method: "POST" }); toast("✅ Marquée publiée — copie dans " + r.path, 5000); }),
  unpublish: (id) => run(() => api(`/api/videos/${id}/status`, { method: "POST", body: { status: "terminee" } })),
  remove: async (id) => { if (!confirm("Supprimer définitivement cette vidéo ?")) return; await run(() => api(`/api/videos/${id}`, { method: "DELETE" }), "Vidéo supprimée"); closeSheet(); },
  copy: async (text) => { try { await navigator.clipboard.writeText(text); toast("📋 Copié !"); } catch { toast("Impossible de copier"); } },
};

function primaryAction(v, size = "") {
  const s = size ? ` btn-${size}` : "";
  if (v.status === "idee") return `<button class="btn btn-accent${s}" data-act="script" data-id="${v.id}">${ICON.wand} Écrire le script</button>`;
  if (v.status === "script" || v.status === "erreur") return `<button class="btn btn-accent${s}" data-act="render" data-id="${v.id}">${ICON.sparkles} ${v.status === "erreur" ? "Réessayer" : "Créer la vidéo"}</button>`;
  if (v.status === "en_cours") return `<button class="btn${s}" disabled>${ICON.clock} Création… ${v.progress || 0}%</button>`;
  return `<a class="btn${s}" href="/media/${v.id}?download=1" data-stop>${ICON.download} Télécharger</a>`;
}
function bindActions(root = document) {
  $$("[data-act]", root).forEach((b) => b.onclick = (e) => {
    e.stopPropagation();
    const id = +b.dataset.id, a = b.dataset.act;
    if (a === "script") A.writeScripts([id]);
    if (a === "render") A.render(id);
    if (a === "open") openSheet(id);
  });
  $$("[data-open]", root).forEach((el) => el.onclick = () => openSheet(+el.dataset.open));
  $$("[data-stop]", root).forEach((el) => el.addEventListener("click", (e) => e.stopPropagation()));
  $$("[data-go]", root).forEach((el) => el.onclick = () => go(el.dataset.go, el.dataset.filter));
  $$("[data-plan]", root).forEach((el) => el.onclick = openPlanner);
}

// ---------- chargement ----------
async function reload() {
  const [accounts, videos] = await Promise.all([api("/api/accounts"), api(`/api/videos?account=${S.account}`)]);
  S.accounts = accounts; S.videos = videos;
  renderSidebar(); renderPage();
  if (S.sheet && !S.sheet.edit) renderSheet();
}
function go(page, filter) {
  S.page = page; set("page", page);
  if (filter && page === "videos") S.videoFilter = filter;
  if (filter && page === "scripts") S.scriptFilter = filter;
  renderSidebar(); renderPage(); window.scrollTo({ top: 0 });
}

// ---------- barre latérale ----------
function renderSidebar() {
  document.documentElement.style.setProperty("--acc", acc().color);
  $("#accountNav").innerHTML = Object.entries(ACC).map(([id, a]) => {
    const c = S.accounts.find((x) => x.id === id)?.counts || {};
    const ready = (c.terminee || 0), todo = (c.idee || 0) + (c.script || 0);
    return `<button class="acc-item ${id === S.account ? "active" : ""}" data-acc="${id}" style="--acc:${a.color}">
      <img src="${a.img}" alt=""><span class="meta"><span class="name">${a.name}</span><span class="sub">${ready ? `${ready} prête(s) à publier` : todo ? `${todo} à créer` : a.topic}</span></span></button>`;
  }).join("");
  $$("[data-acc]").forEach((b) => b.onclick = () => { S.account = b.dataset.acc; set("account", S.account); closeSheet(); reload(); });

  const n = (st) => vids(st).length;
  const items = [["home", "Accueil", ICON.home, ""], ["calendar", "Calendrier", ICON.calendar, ""],
    ["scripts", "Scripts", ICON.script, n("todo") || ""], ["videos", "Vidéos", ICON.film, n("ready") || ""], ["settings", "Réglages", ICON.settings, ""]];
  $("#mainNav").innerHTML = items.map(([id, l, ic, c]) => `<button class="nav-item ${S.page === id ? "active" : ""}" data-nav="${id}">${ic}<span>${l}</span>${c ? `<span class="count">${c}</span>` : ""}</button>`).join("");
  $$("[data-nav]").forEach((b) => b.onclick = () => go(b.dataset.nav));

  const dark = document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  $("#themeBtn").innerHTML = `${dark ? ICON.sun : ICON.moon} ${dark ? "Thème clair" : "Thème sombre"}`;
  $("#newPlanBtn").innerHTML = `${ICON.plus} Nouveau planning`;
}
$("#themeBtn").onclick = () => {
  const dark = document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "light" : "dark"; set("theme", document.documentElement.dataset.theme); renderSidebar();
};
$("#newPlanBtn").onclick = openPlanner;

// ---------- pages ----------
const TITLES = { home: "Accueil", calendar: "Calendrier", scripts: "Scripts", videos: "Vidéos", settings: "Réglages" };
function renderPage() {
  $("#pageTitle").innerHTML = `<h1>${TITLES[S.page]}</h1>${S.page !== "settings" ? `<span class="crumb">· ${acc().name}</span>` : ""}`;
  $("#newPlanBtn").classList.toggle("hidden", S.page === "settings");
  ({ home: pageHome, calendar: pageCalendar, scripts: pageScripts, videos: pageVideos, settings: pageSettings })[S.page]();
  bindActions($("#view"));
}

function pageHome() {
  const a = acc(), all = S.videos;
  const hero = `<div class="hero"><img src="${a.img}" alt=""><div><h2>${a.name}</h2><p>${a.tagline}</p></div>
    <div class="hero-cta"><button class="btn btn-accent btn-lg" data-plan>${ICON.plus} Préparer des vidéos</button></div></div>`;
  const steps = [
    ["Planifie", "Active le pilote automatique, ou crée un planning : l'IA cherche, écrit idées, hooks et scripts.", all.length > 0],
    ["Vérifie", "Relis ou modifie un script si tu veux (facultatif).", all.some((v) => v.scenes?.length)],
    ["Crée", "Un clic : voix, images, sous-titres et montage → MP4.", all.some((v) => ["terminee", "exportee"].includes(v.status))],
    ["Publie", "Télécharge la vidéo, copie la légende, poste sur TikTok.", all.some((v) => v.status === "exportee")],
  ];
  const how = `<div class="section"><div class="section-head"><h2>Comment ça marche</h2></div><div class="steps">${steps.map(([t, d, done], i) =>
    `<div class="card step ${done ? "done" : ""}"><div class="num">${done ? "✓" : i + 1}</div><h3>${t}</h3><p>${d}</p></div>`).join("")}</div></div>`;

  if (!all.length) {
    $("#view").innerHTML = hero + `<div id="autoCard" class="section"></div>` + `<div class="card empty section"><div class="em">✨</div><h3>Prêt à lancer ${esc(a.name)} ?</h3>
      <p>Commence par créer ton premier planning : par exemple 7 jours × 1 vidéo. L'agent s'occupe du reste.</p>
      <button class="btn btn-accent btn-lg" data-plan>${ICON.plus} Créer mon premier planning</button></div>` + how;
    renderAutopilot();
    return;
  }

  const n = (s) => vids(s).length;
  const stats = [["todo", "À créer", "script"], ["making", "En création", "en_cours"], ["ready", "Prêtes à publier", "terminee"], ["posted", "Publiées", "exportee"]];
  const statsHtml = `<div class="stats">${stats.map(([k, l, c]) => `<div class="card stat" data-go="videos" data-filter="${k}"><div class="n">${n(k)}</div><div class="l"><span class="badge" style="--sc:var(--st-${c});padding:0;background:none"></span>${l}</div></div>`).join("")}</div>`;

  // prochaine étape conseillée
  const ideas = all.filter((v) => v.status === "idee"), scripted = all.filter((v) => ["script", "erreur"].includes(v.status));
  let next;
  if (n("making")) next = [ICON.clock, `${n("making")} vidéo(s) en création`, "Tu peux fermer cet onglet ou continuer à travailler, ça tourne en arrière-plan.", `<button class="btn" data-go="videos" data-filter="making">Voir</button>`];
  else if (scripted.length) next = [ICON.sparkles, `${scripted.length} script(s) prêt(s)`, "Lance la création des vidéos : voix, visuels, sous-titres et montage automatiques.", `<button class="btn btn-accent" id="nextRender">${ICON.sparkles} Créer les ${Math.min(scripted.length, 5)} prochaines</button>`];
  else if (ideas.length) next = [ICON.wand, `${ideas.length} idée(s) sans script`, "Laisse l'IA écrire les scripts complets, scène par scène.", `<button class="btn btn-accent" id="nextScripts">${ICON.wand} Écrire les scripts</button>`];
  else if (n("ready")) next = [ICON.send, `${n("ready")} vidéo(s) prête(s) à publier`, "Télécharge-les, copie la légende et poste-les sur TikTok.", `<button class="btn btn-accent" data-go="videos" data-filter="ready">Voir les vidéos</button>`];
  else next = [ICON.plus, "Tout est à jour 🎉", "Prépare ta prochaine série de vidéos.", `<button class="btn btn-accent" data-plan>${ICON.plus} Nouveau planning</button>`];
  const nextHtml = `<div class="section"><div class="card next"><div class="ic">${next[0]}</div><div><h3>${next[1]}</h3><p>${next[2]}</p></div>${next[3]}</div></div>`;

  const upcoming = all.filter((v) => (v.pub_date || "") >= today() && v.status !== "exportee").slice(0, 6);
  const upHtml = upcoming.length ? `<div class="section"><div class="section-head"><h2>À venir</h2><button class="btn btn-ghost btn-sm" data-go="calendar">Tout le calendrier →</button></div>
    <div class="card list">${upcoming.map(rowHtml).join("")}</div></div>` : "";

  $("#view").innerHTML = hero + `<div id="autoCard" class="section"></div>` + statsHtml + nextHtml + upHtml + how;
  renderAutopilot();
  const nr = $("#nextRender"); if (nr) nr.onclick = () => A.renderMany(scripted.slice(0, 5).map((v) => v.id));
  const ns = $("#nextScripts"); if (ns) ns.onclick = () => A.writeScripts(null);
}

async function renderAutopilot() {
  const box = $("#autoCard"); if (!box) return;
  const all = await api("/api/autopilot").catch(() => null); if (!all || !$("#autoCard")) return;
  const c = all[S.account];
  const sel = (k, vals, unit) => `<select data-ap="${k}" style="width:auto">${vals.map((v) => `<option value="${v}" ${+c[k] === v ? "selected" : ""}>${v}${unit}</option>`).join("")}</select>`;
  box.innerHTML = `<div class="card next" style="flex-wrap:wrap">
    <div class="ic">${ICON.sparkles}</div>
    <div style="flex:1;min-width:260px"><h3>Pilote automatique ${c.enabled ? `<span class="badge" style="--sc:var(--st-terminee);margin-left:6px">Activé</span>` : ""}</h3>
      <p>${c.enabled ? `L'appli cherche les sujets, fait ses recherches, écrit et monte toute seule les vidéos des ${c.days_ahead} prochains jours, tant qu'elle est ouverte.${c.last ? ` <span class="faint">Dernière vérification : ${esc(c.last)}</span>` : ""}`
        : "Active-le : l'appli trouve les sujets, fait des recherches sur le web, écrit les scripts et monte les vidéos toute seule. Tu n'as plus qu'à publier."}</p>
      <div class="row-actions" style="margin-top:10px;align-items:center;gap:10px" >
        <span class="small muted">Vidéos/jour</span>${sel("per_day", [1, 2, 3], "")}
        <span class="small muted">D'avance</span>${sel("days_ahead", [2, 3, 7, 14], " j")}
        <span class="small muted">Durée</span>${sel("duration", [45, 60, 75, 90], " s")}
      </div></div>
    <label class="switch" style="margin-left:auto"><input type="checkbox" id="apToggle" ${c.enabled ? "checked" : ""}><span class="sw"></span></label></div>`;
  const put = async (patch) => {
    try { await api("/api/autopilot", { method: "PUT", body: { account: S.account, ...patch } }); toast(patch.enabled === true ? "🤖 Pilote automatique activé — la préparation commence" : "✓ Enregistré"); pollJobs(true); renderAutopilot(); }
    catch (e) { toast("⚠️ " + e.message); }
  };
  $("#apToggle").onchange = (e) => put({ enabled: e.target.checked });
  $$("[data-ap]").forEach((x) => x.onchange = () => put({ [x.dataset.ap]: +x.value }));
}

function rowHtml(v) {
  return `<div class="row" data-open="${v.id}">
    <div class="when"><b>${fmtDay(v.pub_date)}</b>${esc(v.post_time || "")}</div>
    <div style="min-width:0"><div class="t">${esc(v.title || v.subject)}</div><div class="h">« ${esc(v.hook)} »</div></div>
    <div class="right">${badge(v.status, v.status === "en_cours" ? ` ${v.progress || 0}%` : "")}${primaryAction(v, "sm")}</div></div>`;
}

function pageCalendar() {
  if (!S.videos.length) return emptyPlan();
  const byDay = {}; S.videos.forEach((v) => (byDay[v.pub_date] ||= []).push(v));
  const dates = Object.keys(byDay).filter(Boolean).sort();
  const months = [...new Set(dates.map((d) => d.slice(0, 7)))];
  const legend = `<div class="row-actions" style="margin-top:4px">${Object.keys(ST).map((s) => badge(s)).join("")}</div>`;
  const html = months.map((m) => {
    const first = dObj(m + "-01"), y = first.getFullYear(), mo = first.getMonth();
    const days = new Date(y, mo + 1, 0).getDate(), offset = (first.getDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(`<div class="day empty"></div>`);
    for (let d = 1; d <= days; d++) {
      const ds = `${m}-${String(d).padStart(2, "0")}`, list = byDay[ds] || [];
      cells.push(`<div class="day ${ds === today() ? "today" : ""}"><div class="dn"><span>${d}</span>${list.length ? `<span class="faint">${list.length}</span>` : ""}</div>
        ${list.map((v) => `<div class="chip" style="--sc:var(--st-${v.status})" data-open="${v.id}"><time>${esc(v.post_time || "")}</time><span>${esc(v.title || v.subject)}</span></div>`).join("")}</div>`);
    }
    return `<div class="month"><h3>${first.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</h3>
      <div class="cal">${["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((x) => `<div class="cal-head">${x}</div>`).join("")}${cells.join("")}</div></div>`;
  }).join("");
  $("#view").innerHTML = legend + html;
}

function pageScripts() {
  if (!S.videos.length) return emptyPlan();
  const F = { all: ["Toutes", () => true], idee: ["À écrire", (v) => v.status === "idee"], script: ["Prêts", (v) => ["script", "erreur"].includes(v.status)], done: ["Avec vidéo", (v) => ["en_cours", "terminee", "exportee"].includes(v.status)] };
  const list = S.videos.filter(F[S.scriptFilter][1]);
  const ideas = S.videos.filter((v) => v.status === "idee").length;
  $("#view").innerHTML = `<div class="section-head" style="margin-top:6px">
      <div class="seg">${Object.entries(F).map(([k, [l, f]]) => `<button class="${S.scriptFilter === k ? "on" : ""}" data-sf="${k}">${l}<span class="c">${S.videos.filter(f).length}</span></button>`).join("")}</div>
      ${ideas ? `<button class="btn btn-accent" id="allScripts">${ICON.wand} Écrire les ${ideas} scripts manquants</button>` : ""}</div>
    ${list.length ? `<div class="card list">${list.map(rowHtml).join("")}</div>` : `<div class="card empty"><div class="em">📭</div><h3>Rien ici</h3><p>Aucune vidéo dans cette catégorie.</p></div>`}`;
  $$("[data-sf]").forEach((b) => b.onclick = () => { S.scriptFilter = b.dataset.sf; pageScripts(); bindActions($("#view")); });
  const all = $("#allScripts"); if (all) all.onclick = () => A.writeScripts(null);
}

function pageVideos() {
  if (!S.videos.length) return emptyPlan();
  const F = { todo: "À créer", making: "En création", ready: "Prêtes", posted: "Publiées" };
  const list = vids(S.videoFilter);
  const creatable = S.videos.filter((v) => ["script", "erreur", "idee"].includes(v.status));
  $("#view").innerHTML = `<div class="section-head" style="margin-top:6px">
      <div class="seg">${Object.entries(F).map(([k, l]) => `<button class="${S.videoFilter === k ? "on" : ""}" data-vf="${k}">${l}<span class="c">${vids(k).length}</span></button>`).join("")}</div>
      ${S.videoFilter === "todo" && creatable.length ? `<button class="btn btn-accent" id="renderNext">${ICON.sparkles} Créer les ${Math.min(5, creatable.length)} prochaines</button>` : ""}</div>
    ${list.length ? `<div class="gallery">${list.map(tileHtml).join("")}</div>` : `<div class="card empty"><div class="em">🎞️</div><h3>Aucune vidéo ${F[S.videoFilter].toLowerCase()}</h3><p>${S.videoFilter === "ready" ? "Crée des vidéos depuis l'onglet « À créer »." : "Rien pour l'instant."}</p></div>`}`;
  $$("[data-vf]").forEach((b) => b.onclick = () => { S.videoFilter = b.dataset.vf; pageVideos(); bindActions($("#view")); });
  const rn = $("#renderNext"); if (rn) rn.onclick = () => A.renderMany(creatable.slice(0, 5).map((v) => v.id));
}
function tileHtml(v) {
  const done = ["terminee", "exportee"].includes(v.status);
  const visual = done
    ? `<img src="/media/${v.id}/poster?t=${encodeURIComponent(v.updated_at)}" loading="lazy" alt=""><div class="play"><span>${ICON.play}</span></div>`
    : `<div class="ph"><div class="hook">« ${esc(v.hook)} »</div>${v.status === "en_cours" ? `<div class="progress"><i style="width:${v.progress || 0}%"></i></div>` : primaryAction(v, "sm")}</div>`;
  return `<div class="vtile" data-open="${v.id}"><div class="thumb">${visual}<div class="tl">${badge(v.status, v.status === "en_cours" ? ` ${v.progress || 0}%` : "")}</div></div>
    <div class="cap"><div class="t">${esc(v.title || v.subject)}</div><div class="d">${fmtDay(v.pub_date)} · ${esc(v.post_time || "")}${v.duration_real ? ` · ${Math.round(v.duration_real)} s` : ""}</div></div></div>`;
}

function emptyPlan() {
  $("#view").innerHTML = `<div class="card empty"><div class="em">🗓️</div><h3>Aucune vidéo planifiée</h3><p>Crée un planning pour ${esc(acc().name)} : l'agent prépare les idées, les hooks et les scripts.</p>
    <button class="btn btn-accent btn-lg" data-plan>${ICON.plus} Nouveau planning</button></div>`;
}

// ---------- réglages ----------
async function pageSettings() {
  $("#view").innerHTML = `<div class="empty faint">Chargement…</div>`;
  const [cfg, st] = await Promise.all([api("/api/settings"), api("/api/status")]);
  S.cfg = cfg;
  const sel = (key, opts, cur) => `<select data-k="${key}">${opts.map(([v, l]) => `<option value="${v}" ${String(cur) === String(v) ? "selected" : ""}>${l}</option>`).join("")}</select>`;
  const row = (title, hint, ctl) => `<div class="set-row"><div class="lbl"><b>${title}</b>${hint ? `<span>${hint}</span>` : ""}</div><div class="ctl">${ctl}</div></div>`;
  const chk = (ok, txt) => `<span class="check ${ok ? "ok" : "ko"}">${ok ? ICON.check.replace("<svg", '<svg width="14" height="14"') : "—"} ${txt}</span>`;
  const ver = await api("/api/version").catch(() => ({}));
  const opt = await api("/api/options");
  const el = await api("/api/elevenlabs").catch(() => ({ configured: false, models: {} }));
  const q = el.quota, elVoices = el.voices || [];
  $("#view").innerHTML = `<div class="settings">
    <div class="set-group"><h2>Mise à jour</h2><div class="card">
      ${row(ver.available ? "Une nouvelle version est disponible ✨" : "Application à jour", ver.error ? "Vérification impossible (pas d'Internet ?)" : `Version installée : ${esc(ver.current || "—")}${ver.available ? ` → nouvelle : ${esc(ver.latest)}` : ""}. Les mises à jour s'installent aussi toutes seules au lancement.`,
        `<button class="btn ${ver.available ? "btn-accent" : ""}" id="updBtn">${ICON.refresh} ${ver.available ? "Mettre à jour" : "Vérifier"}</button>`)}
    </div></div>
    <div class="set-group"><h2>Voix ultra-réaliste (ElevenLabs)</h2><div class="card">
      ${row("Clé ElevenLabs", "Compte gratuit sur elevenlabs.io → Profil → API Keys. Sans carte bancaire, rien n'est jamais facturé.", `<input data-k="elevenlabs_key" type="password" value="${esc(cfg.elevenlabs_key || "")}" placeholder="sk_…">`)}
      ${row("Qualité", "« Économique » = 2× plus de vidéos avec le même crédit gratuit.", `<select data-k="elevenlabs_model">${Object.entries(el.models || {}).map(([k, l]) => `<option value="${k}" ${k === cfg.elevenlabs_model ? "selected" : ""}>${l}</option>`).join("")}</select>`)}
      ${el.configured ? row("Crédit du mois", el.error ? `<span style="color:#ef4444">${esc(el.error)}</span>` : `${q.used.toLocaleString("fr-FR")} / ${q.limit.toLocaleString("fr-FR")} caractères utilisés · reste ≈ ${Math.floor(q.remaining / (cfg.elevenlabs_model === "eleven_flash_v2_5" ? 450 : 900))} vidéo(s) de 60 s`,
        el.error ? "" : `<div class="progress" style="width:200px"><i style="width:${Math.min(100, q.used / Math.max(q.limit, 1) * 100)}%;background:var(--acc)"></i></div>`) : ""}
    </div></div>
    <div class="set-group"><h2>Voix & style des vidéos</h2>
      ${Object.entries(ACC).map(([id, a]) => {
        const dv = opt.defaults[id], curV = cfg.voices?.[id] || dv.voice, curS = cfg.image_styles?.[id] || dv.image_style;
        return `<div class="card" style="margin-bottom:12px"><div class="set-row" style="border:0"><img src="${a.img}" style="width:40px;height:40px;border-radius:50%"><div class="lbl"><b>${a.name}</b><span>${a.topic}</span></div></div>
        <div class="set-row"><div class="lbl"><b>Type de voix</b><span>${el.configured ? "ElevenLabs = ultra-réaliste (quota gratuit limité)." : "Ajoute une clé ElevenLabs ci-dessus pour débloquer les voix ultra-réalistes."}</span></div><div class="ctl">
          <select data-engine="${id}"><option value="edge">Voix gratuite illimitée (Edge)</option>${el.configured ? `<option value="elevenlabs" ${cfg.voice_engines?.[id] === "elevenlabs" ? "selected" : ""}>ElevenLabs — ultra-réaliste</option>` : ""}</select></div></div>
        ${el.configured ? (el.error ? `<div class="set-row"><div class="err" style="margin:0;flex:1">ElevenLabs : ${esc(el.error)}</div></div>`
          : elVoices.length ? `<div class="set-row"><div class="lbl"><b>Voix ElevenLabs</b><span>« Extrait » est gratuit (souvent en anglais). « Tester en français » lit un petit passage de 3 phrases avec 3 tons différents (~150 crédits, une seule fois par voix).</span></div>
          <div class="ctl" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
          <select data-elvoice="${id}" style="width:240px"><option value="">— choisir une voix —</option>${elVoices.map((v) => `<option value="${v.id}" data-prev="${esc(v.preview || "")}" ${v.id === cfg.eleven_voices?.[id] ? "selected" : ""}>${esc(v.name)}${v.desc ? " — " + esc(v.desc) : ""}</option>`).join("")}</select>
          <button class="btn" data-ellisten="${id}">${ICON.play} Extrait</button>
          <button class="btn btn-accent" data-eltest="${id}">${ICON.play} Tester en français</button></div></div>`
          : `<div class="set-row"><div class="lbl"><b>Aucune voix dans ton compte ElevenLabs</b><span>Sur elevenlabs.io → Voices → Voice Library : filtre « French », clique sur « Add » sur une voix, puis recharge cette page.</span></div></div>`) : ""}
        <div class="set-row"><div class="lbl"><b>${cfg.voice_engines?.[id] === "elevenlabs" ? "Voix gratuite de secours" : "Voix off"}</b><span>Écoute avant de choisir.</span></div><div class="ctl" style="display:flex;gap:8px;align-items:center">
          <select data-voice="${id}">${Object.entries(opt.voices).map(([v, l]) => `<option value="${v}" ${v === curV ? "selected" : ""}>${l}</option>`).join("")}</select>
          <button class="btn" data-listen="${id}">${ICON.play} Écouter</button></div></div>
        <div class="set-row"><div class="lbl"><b>Style des images</b><span>Teste une image (≈ 20 s) avant de lancer des vidéos.</span></div><div class="ctl" style="display:flex;gap:8px;align-items:center">
          <select data-istyle="${id}">${Object.entries(opt.image_styles).map(([v, l]) => `<option value="${v}" ${v === curS ? "selected" : ""}>${l}</option>`).join("")}</select>
          <button class="btn" data-testimg="${id}">${ICON.sparkles} Tester</button></div></div>
        <div class="preview-zone" id="pv-${id}"></div></div>`;
      }).join("")}</div>
    <div class="set-group"><h2>Écriture des scripts</h2><div class="card">
      ${row("Intelligence artificielle", "Claude Code utilise ton abonnement Pro : aucun frais en plus.", sel("llm_provider", [["claude_code", "Claude Code (abonnement Pro)"], ["ollama", "Ollama (local, gratuit)"], ["offline", "Hors-ligne (basique)"]], cfg.llm_provider))}
      ${row("Recherche web automatique", "Claude vérifie les chiffres et trouve des faits récents avant d'écrire (inclus dans ton abonnement, un peu plus lent).", `<select data-k="web_research"><option value="true" ${cfg.web_research !== false ? "selected" : ""}>Activée (recommandé)</option><option value="false" ${cfg.web_research === false ? "selected" : ""}>Désactivée</option></select>`)}
      ${row("Modèle Claude", "Laisse vide pour le modèle par défaut.", `<input data-k="claude_model" value="${esc(cfg.claude_model)}" placeholder="par défaut">`)}
    </div></div>
    <div class="set-group"><h2>Voix off</h2><div class="card">
      ${row("Moteur de voix", "Edge : très naturel (Internet). Piper : 100 % local.", sel("tts_engine", [["edge", "Edge TTS (gratuit)"], ["piper", "Piper (local)"]], cfg.tts_engine))}
    </div></div>
    <div class="set-group"><h2>Visuels</h2><div class="card">
      ${Object.entries(ACC).map(([id, a]) => row(`Images — ${a.name}`, "", `<select data-vs="${id}">${[["ai", "Images IA (Pollinations, gratuit)"], ["pexels", "Vidéos Pexels (clé gratuite)"], ["local", "Fonds générés localement"]].map(([v, l]) => `<option value="${v}" ${cfg.visual_source[id] === v ? "selected" : ""}>${l}</option>`).join("")}</select>`)).join("")}
      ${row("Mascotte Panda Boss", "Panda dans les images IA, ou panda animé dessiné sur ton PC.", sel("panda_mode", [["ai", "Panda en images IA"], ["local", "Panda animé (local)"]], cfg.panda_mode))}
      ${row("Clé Pollinations (gratuite, recommandée)", "Indispensable pour des images IA fiables : crée-la gratuitement sur enter.pollinations.ai (crédit offert chaque semaine, sans carte bancaire).", `<input data-k="pollinations_token" value="${esc(cfg.pollinations_token)}" placeholder="sk_… ou pk_…">`)}
      ${row("Clé Pexels", "Optionnel et gratuit (pexels.com/api).", `<input data-k="pexels_key" value="${esc(cfg.pexels_key)}" placeholder="facultatif">`)}
    </div></div>
    <div class="set-group"><h2>Publication</h2><div class="card">
      ${Object.entries(ACC).map(([id, a]) => row(`Pseudo — ${a.name}`, "Affiché en filigrane sur les vidéos.", `<input data-h="${id}" value="${esc(cfg.handles[id] || "")}" placeholder="@moncompte">`)).join("")}
      ${row("Heures de publication", "Dans l'ordre de priorité.", `<input data-k="posting_times" value="${esc(cfg.posting_times.join(", "))}">`)}
      ${row("Volume de la musique", "Vide = par défaut, 0 = sans musique. Musiques dans assets/music/&lt;compte&gt;.", `<input data-k="music_volume" type="number" step="0.01" min="0" max="1" value="${cfg.music_volume ?? ""}" placeholder="par défaut">`)}
      ${row("Dossier d'export", esc(cfg.export_dir_effective), `<input data-k="export_dir" value="${esc(cfg.export_dir)}" placeholder="par défaut">`)}
    </div></div>
    <div class="set-group"><h2>Diagnostic</h2><div class="card">
      ${row("Montage vidéo (ffmpeg)", st.ffmpeg ? "Installé" : "À installer : winget install Gyan.FFmpeg", chk(st.ffmpeg, st.ffmpeg ? "OK" : "Manquant"))}
      ${row("Claude Code", esc(st.claude_code.info), chk(st.claude_code.ok, st.claude_code.ok ? "Connecté" : "Absent"))}
      ${row("Voix Edge (en ligne)", st.edge_tts ? "Joignable" : "Injoignable : Piper prendra le relais", chk(st.edge_tts, st.edge_tts ? "OK" : "Hors ligne"))}
      ${row("Voix Piper (locale)", st.piper_voices.join(", ") || "Téléchargée au premier usage", chk(st.piper, st.piper ? "OK" : "Absent"))}
      ${row("Images IA (Pollinations)", st.pollinations ? "Joignable" : "Injoignable : fonds locaux", chk(st.pollinations, st.pollinations ? "OK" : "Hors ligne"))}
      ${row("Ollama", "Optionnel", chk(st.ollama, st.ollama ? "Détecté" : "Non installé"))}
      ${row("Musiques", Object.entries(st.music).map(([a, n]) => `${ACC[a]?.name || a} : ${n}`).join(" · "), chk(true, "OK"))}
      ${row("Services payants", "Aucun. Rien n'est facturé en plus de ton abonnement.", chk(true, "0 €"))}
    </div></div></div>`;
  const save = async (patch) => { try { S.cfg = await api("/api/settings", { method: "PUT", body: patch }); toast("✓ Enregistré"); } catch (e) { toast("⚠️ " + e.message); } };
  $("#updBtn").onclick = () => runUpdate();
  $$("[data-voice]").forEach((el) => el.onchange = () => save({ voices: { [el.dataset.voice]: el.value } }));
  $$("[data-engine]").forEach((x) => x.onchange = async () => { await save({ voice_engines: { [x.dataset.engine]: x.value } }); pageSettings(); refreshAlert(); });
  $$("[data-elvoice]").forEach((x) => x.onchange = () => save({ eleven_voices: { [x.dataset.elvoice]: x.value } }));
  const elZone = (id, html) => { $(`#pv-${id}`).innerHTML = `<div style="padding:0 18px 16px">${html}</div>`; };
  $$("[data-ellisten]").forEach((b) => b.onclick = () => {
    const id = b.dataset.ellisten, url = $(`[data-elvoice=${id}]`).selectedOptions[0]?.dataset.prev;
    if (!$(`[data-elvoice=${id}]`).value) return elZone(id, `<div class="err" style="margin:0">Choisis d'abord une voix dans la liste.</div>`);
    elZone(id, url ? `<audio src="${url}" controls autoplay style="width:100%"></audio><div class="small faint" style="margin-top:4px">Extrait de démonstration d'ElevenLabs (peut être en anglais). Utilise « Tester en français » pour l'entendre vraiment.</div>`
      : `<div class="muted small">Pas d'extrait gratuit pour cette voix : utilise « Tester en français ».</div>`);
  });
  $$("[data-eltest]").forEach((b) => b.onclick = async () => {
    const id = b.dataset.eltest, voice = $(`[data-elvoice=${id}]`).value;
    if (!voice) return elZone(id, `<div class="err" style="margin:0">Choisis d'abord une voix dans la liste.</div>`);
    b.disabled = true; elZone(id, `<div class="muted small">⏳ La voix lit une phrase en français…</div>`);
    try {
      const r = await api("/api/preview/eleven", { method: "POST", body: { account: id, voice } });
      elZone(id, `<audio src="${r.url}" controls autoplay style="width:100%"></audio><div class="small faint" style="margin-top:4px">${r.cached ? "Déjà généré : aucun crédit utilisé." : `Crédits utilisés : ~${r.cost}.`} Si elle te plaît, choisis « ElevenLabs » dans « Type de voix » juste au-dessus.</div>`);
    } catch (e) { elZone(id, `<div class="err" style="margin:0">${esc(e.message)}</div>`); }
    b.disabled = false;
  });
  $$("[data-istyle]").forEach((el) => el.onchange = () => save({ image_styles: { [el.dataset.istyle]: el.value } }));
  $$("[data-listen]").forEach((b) => b.onclick = async () => {
    const id = b.dataset.listen, zone = $(`#pv-${id}`);
    b.disabled = true; zone.innerHTML = `<div class="muted small" style="padding:0 18px 16px">⏳ Génération de l'extrait…</div>`;
    try {
      const r = await api("/api/preview/voice", { method: "POST", body: { account: id, voice: $(`[data-voice=${id}]`).value } });
      zone.innerHTML = `<div style="padding:0 18px 16px"><audio src="${r.url}" controls autoplay style="width:100%"></audio>${r.engine === "piper" ? `<div class="small" style="color:#ef4444;margin-top:6px">⚠️ Voix Edge injoignable : c'est la voix locale Piper (moins naturelle) qui a été utilisée.</div>` : ""}</div>`;
    } catch (e) { zone.innerHTML = `<div class="err" style="margin:0 18px 16px">${esc(e.message)}</div>`; }
    b.disabled = false;
  });
  $$("[data-testimg]").forEach((b) => b.onclick = async () => {
    const id = b.dataset.testimg, zone = $(`#pv-${id}`);
    b.disabled = true; zone.innerHTML = `<div class="muted small" style="padding:0 18px 16px">⏳ Génération d'une image test (jusqu'à 30 s)…</div>`;
    try {
      const r = await api("/api/preview/image", { method: "POST", body: { account: id, style: $(`[data-istyle=${id}]`).value } });
      zone.innerHTML = `<div style="padding:0 18px 16px"><img src="${r.url}" style="width:220px;border-radius:14px;box-shadow:var(--shadow)"></div>`;
    } catch (e) { zone.innerHTML = `<div class="err" style="margin:0 18px 16px">${esc(e.message)}</div>`; }
    b.disabled = false;
  });
  $$("[data-k]").forEach((el) => el.onchange = () => {
    let v = el.value.trim();
    if (el.dataset.k === "posting_times") v = v.split(/[,\s]+/).filter((t) => /^\d{1,2}:\d{2}$/.test(t));
    if (el.dataset.k === "music_volume") v = v === "" ? null : +v;
    if (el.dataset.k === "web_research") v = v === "true";
    save({ [el.dataset.k]: v }).then(() => { if (["elevenlabs_key", "elevenlabs_model"].includes(el.dataset.k)) { pageSettings(); refreshAlert(); } });
  });
  $$("[data-vs]").forEach((el) => el.onchange = () => save({ visual_source: { [el.dataset.vs]: el.value } }));
  $$("[data-h]").forEach((el) => el.onchange = () => save({ handles: { [el.dataset.h]: el.value.trim() } }));
}

// ---------- planificateur ----------
function openPlanner() {
  const P = { days: 7, per: 1, dur: 60, start: new Date(Date.now() + 864e5).toISOString().slice(0, 10), scripts: true };
  const a = acc();
  const draw = () => {
    const n = P.days * P.per;
    const mins = Math.max(1, Math.round(n / 12 * 1.2 + (P.scripts ? n * 0.5 : 0)));
    const ch = (key, vals, unit = "") => vals.map((x) => `<button class="choice ${P[key] === x ? "on" : ""}" data-p="${key}" data-v="${x}">${x}${unit}</button>`).join("");
    $("#dialogPanel").innerHTML = `<div class="planner">
      <div style="display:flex;align-items:center;gap:12px"><img src="${a.img}" style="width:44px;height:44px;border-radius:50%"><div><h2>Nouveau planning</h2><div class="muted small">${a.name} · ${a.topic}</div></div>
        <button class="icon-btn" data-close style="margin-left:auto">${ICON.x}</button></div>
      <p class="lead">Dis-moi combien de vidéos tu veux : l'agent trouve les sujets, écrit les hooks et les scripts, et remplit ton calendrier.</p>
      <div class="q"><label>Sur combien de jours ?</label><div class="choices">${ch("days", [7, 14, 30])}<input class="choice-input ${[7, 14, 30].includes(P.days) ? "" : "on"}" type="number" min="1" max="365" value="${[7, 14, 30].includes(P.days) ? "" : P.days}" placeholder="Autre" id="pDays"></div></div>
      <div class="q"><label>Combien de vidéos par jour ?</label><div class="choices">${ch("per", [1, 2, 3])}</div></div>
      <div class="q"><label>Durée de chaque vidéo</label><div class="choices">${ch("dur", [45, 60, 75, 90], " s")}</div></div>
      <div class="q"><label>Premier jour de publication</label><input type="date" id="pStart" value="${P.start}" style="max-width:220px"></div>
      <label class="switch"><input type="checkbox" id="pScripts" ${P.scripts ? "checked" : ""}><span class="sw"></span><span><b>Écrire aussi les scripts complets</b><br><span class="muted small">Scènes, texte à l'écran, visuels — prêts à être transformés en vidéo.</span></span></label>
      <div class="summary"><div class="big">${n}</div><div><b>vidéo${n > 1 ? "s" : ""} de ${P.dur} s</b><div class="muted small">${P.days} jour${P.days > 1 ? "s" : ""} × ${P.per} par jour · préparation ≈ ${mins < 60 ? mins + " min" : Math.round(mins / 60 * 10) / 10 + " h"} (avec ton abonnement Claude)</div></div></div>
      <button class="btn btn-accent btn-lg btn-block" id="pGo">${ICON.sparkles} Lancer la préparation</button></div>`;
    $$("[data-p]").forEach((b) => b.onclick = () => { P[b.dataset.p] = +b.dataset.v; draw(); });
    $("#pDays").oninput = (e) => { const v = +e.target.value; if (v >= 1) { P.days = Math.min(365, v); draw(); $("#pDays").focus(); } };
    $("#pStart").onchange = (e) => P.start = e.target.value;
    $("#pScripts").onchange = (e) => { P.scripts = e.target.checked; draw(); };
    $$("[data-close]", $("#dialog")).forEach((x) => x.onclick = closeDialog);
    $("#pGo").onclick = async () => {
      try {
        const r = await api("/api/plans", { method: "POST", body: { account: S.account, days: P.days, per_day: P.per, duration: P.dur, start_date: P.start, with_scripts: P.scripts } });
        closeDialog(); toast(`✨ Préparation de ${r.total} vidéos lancée — tu peux suivre l'avancement en bas à gauche`, 5000);
        go("calendar"); pollJobs(true);
      } catch (e) { toast("⚠️ " + e.message, 5000); }
    };
  };
  $("#dialog").classList.remove("hidden"); draw();
}
function closeDialog() { $("#dialog").classList.add("hidden"); }

// ---------- fiche vidéo ----------
function openSheet(id) { S.sheet = { id, tab: "script", edit: false }; $("#sheet").classList.remove("hidden"); renderSheet(); }
function closeSheet() { S.sheet = null; $("#sheet").classList.add("hidden"); }
$$("#sheet [data-close]").forEach((x) => x.onclick = closeSheet);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeDialog(); if (S.sheet && !S.sheet.edit) closeSheet(); } });

function renderSheet() {
  const v = S.videos.find((x) => x.id === S.sheet?.id);
  if (!v) return closeSheet();
  const done = ["terminee", "exportee"].includes(v.status);
  const order = ["idee", "script", "video", "exportee"];
  const lvl = { idee: 0, script: 1, erreur: 1, en_cours: 1, terminee: 2, exportee: 3 }[v.status];
  const tk = (i, l) => `<div class="tk ${i < lvl || (i === 3 && lvl === 3) ? "done" : i === lvl ? "cur" : ""}"><i>${i < lvl || (i === 3 && lvl === 3) ? "✓" : i + 1}</i>${l}</div>`;
  const track = `<div class="track">${tk(0, "Idée")}<div class="bar ${lvl > 0 ? "done" : ""}"></div>${tk(1, "Script")}<div class="bar ${lvl > 1 ? "done" : ""}"></div>${tk(2, "Vidéo")}<div class="bar ${lvl > 2 ? "done" : ""}"></div>${tk(3, "Publiée")}</div>`;

  const screen = done
    ? `<video src="/media/${v.id}?t=${encodeURIComponent(v.updated_at)}" poster="/media/${v.id}/poster?t=${encodeURIComponent(v.updated_at)}" controls playsinline></video>`
    : `<div class="ph"><div class="hook">« ${esc(v.hook)} »</div>${v.status === "en_cours" ? `<div style="width:80%"><div class="progress"><i style="width:${v.progress || 0}%"></i></div><div class="small" style="margin-top:8px;opacity:.8">Création… ${v.progress || 0}%</div></div>` : `<div class="small" style="opacity:.75">${ST[v.status].desc}</div>`}</div>`;
  const actions = done
    ? `<a class="btn btn-accent btn-block" href="/media/${v.id}?download=1">${ICON.download} Télécharger le MP4</a>
       <button class="btn btn-block" id="shCopy">${ICON.copy} Copier la légende</button>
       ${v.status === "terminee" ? `<button class="btn btn-block" id="shPub">${ICON.check} Marquer comme publiée</button>` : `<button class="btn btn-ghost btn-block" id="shUnpub">Remettre en « Prête »</button>`}
       <button class="btn btn-ghost btn-block" data-act="render" data-id="${v.id}">${ICON.refresh} Recréer la vidéo</button>`
    : `<div class="btn-block" style="display:flex">${primaryAction(v, "lg").replace('class="btn', 'class="btn btn-block')}</div>`;

  const tabs = [["script", "Script"], ["pub", "Publication"], ["info", "Détails"]];
  let body = "";
  if (S.sheet.tab === "script") body = sheetScript(v);
  if (S.sheet.tab === "pub") body = sheetPub(v);
  if (S.sheet.tab === "info") body = sheetInfo(v);

  $("#sheetPanel").innerHTML = `<div class="sheet-head">${badge(v.status)}<h2>${esc(v.title || v.subject)}</h2>
      <button class="icon-btn" id="shDel" title="Supprimer">${ICON.trash}</button><button class="icon-btn" data-close title="Fermer (Échap)">${ICON.x}</button></div>
    <div class="sheet-body">
      <div class="phone"><div class="phone-frame"><div class="phone-screen">${screen}</div></div><div class="phone-actions">${actions}</div>
        <div class="small faint" style="margin-top:10px;text-align:center">${fmtLong(v.pub_date)} · ${esc(v.post_time || "")}${v.duration_real ? ` · ${v.duration_real} s` : v.duration_est ? ` · ~${Math.round(v.duration_est)} s` : ""}</div></div>
      <div style="min-width:0">${track}${v.error && v.status === "erreur" ? `<div class="err">⚠️ ${esc(v.error)}</div>` : ""}
        ${done && /secours/.test(v.notes || "") ? `<div class="err">⚠️ Les images IA n'ont pas pu être générées (service gratuit injoignable) : cette vidéo utilise des fonds de secours. Clique sur « Recréer la vidéo » plus tard.</div>` : ""}
        ${done && /ElevenLabs (non configuré|invalide)|Crédit ElevenLabs insuffisant/.test(v.notes || "") ? `<div class="err">⚠️ La voix ElevenLabs n'a pas pu être utilisée (${esc((v.notes || "").match(/(Crédit ElevenLabs insuffisant[^·]*|ElevenLabs non configuré[^·]*|[^·]*invalide[^·]*)/)?.[0].replace(/→.*/, "").trim() || "crédit ou clé")}) : voix gratuite à la place. Change la clé dans Réglages, puis « Recréer la vidéo ».</div>` : ""}
        ${done && /Piper/.test(v.notes || "") ? `<div class="err">⚠️ La voix Edge était injoignable : la voix locale Piper (moins naturelle) a été utilisée. « Recréer la vidéo » pour réessayer.</div>` : ""}
        <div class="tabs">${tabs.map(([k, l]) => `<button class="${S.sheet.tab === k ? "on" : ""}" data-tab="${k}">${l}</button>`).join("")}</div>${body}</div>
    </div>`;
  const P = $("#sheetPanel");
  $$("[data-close]", P).forEach((x) => x.onclick = closeSheet);
  $$("[data-tab]", P).forEach((b) => b.onclick = () => { S.sheet.tab = b.dataset.tab; S.sheet.edit = false; renderSheet(); });
  $("#shDel").onclick = () => A.remove(v.id);
  if ($("#shCopy")) $("#shCopy").onclick = () => A.copy(v.caption || "");
  if ($("#shPub")) $("#shPub").onclick = () => A.publish(v.id);
  if ($("#shUnpub")) $("#shUnpub").onclick = () => A.unpublish(v.id);
  bindActions(P);
  bindSheetTab(v);
}

function sheetScript(v) {
  if (!v.scenes?.length) return `<div class="empty" style="padding:40px 10px"><div class="em">✍️</div><h3>Pas encore de script</h3>
    <p>L'IA va écrire le script complet : hook, scènes, texte à l'écran et idées de visuels.</p>${primaryAction(v, "lg")}</div>`;
  if (!S.sheet.edit) return `<div style="display:flex;gap:8px;margin-bottom:6px"><span class="muted small" style="flex:1;align-self:center">${v.scenes.length} scènes · ~${Math.round(v.duration_est || 0)} s</span>
      <button class="btn btn-sm" id="scEdit">${ICON.edit} Modifier</button><button class="btn btn-sm btn-ghost" id="scRe">${ICON.refresh} Réécrire avec l'IA</button></div>
    ${v.scenes.map((s, i) => `<div class="scene"><div class="sn">${i + 1}</div><div><div class="voice">${esc(s.voice)}</div>
      <div class="tags">${s.on_screen ? `<span class="tag screen">À l'écran : ${esc(s.on_screen)}</span>` : ""}${s.visual ? `<span class="tag">🎨 ${esc(s.visual)}</span>` : ""}</div></div></div>`).join("")}`;
  return `<div class="muted small" style="margin-bottom:10px">Modifie le texte lu par la voix, le texte affiché et l'image de chaque scène.</div>
    <div id="scList">${v.scenes.map(sceneEdit).join("")}</div>
    <div class="row-actions" style="margin-top:12px"><button class="btn btn-sm" id="scAdd">${ICON.plus} Ajouter une scène</button><span class="spacer"></span>
      <button class="btn btn-ghost" id="scCancel">Annuler</button><button class="btn btn-accent" id="scSave">${ICON.check} Enregistrer</button></div>`;
}
function sceneEdit(s, i) {
  return `<div class="scene" data-scene><div class="sn">${i + 1}</div><div class="scene-edit">
    <textarea data-s="voice" rows="2" placeholder="Texte lu par la voix off">${esc(s.voice)}</textarea>
    <div class="grid2"><input data-s="on_screen" value="${esc(s.on_screen)}" placeholder="Texte à l'écran (court)"><input data-s="emphasis" value="${esc((s.emphasis || []).join(", "))}" placeholder="Mots en couleur"></div>
    <div class="grid2"><input data-s="visual" value="${esc(s.visual)}" placeholder="Visuel (description)"><input data-s="image_prompt" value="${esc(s.image_prompt)}" placeholder="Prompt image (anglais)"></div>
    <div style="text-align:right;margin-top:6px"><button class="btn btn-sm btn-ghost btn-danger" data-delscene>${ICON.trash} Supprimer</button></div></div></div>`;
}
function sheetPub(v) {
  return `<div class="grid2"><div class="field"><label>Date de publication</label><input type="date" data-f="pub_date" value="${esc(v.pub_date)}"></div>
      <div class="field"><label>Heure</label><input data-f="post_time" value="${esc(v.post_time)}"></div></div>
    <div class="field"><label>Titre</label><input data-f="title" value="${esc(v.title)}"></div>
    <div class="field"><label>Description</label><textarea data-f="description" rows="3">${esc(v.description)}</textarea></div>
    <div class="field"><label>Hashtags</label><input data-f="hashtags" value="${esc((v.hashtags || []).join(" "))}"></div>
    <div class="row-actions"><button class="btn btn-accent" id="fSave">${ICON.check} Enregistrer</button></div>
    ${v.caption ? `<div class="field section"><label>Légende finale (à coller dans TikTok)</label><div class="caption-box">${esc(v.caption)}</div>
      <div style="margin-top:8px"><button class="btn btn-sm" id="capCopy">${ICON.copy} Copier</button></div></div>` : `<p class="muted small section">La légende finale sera prête quand la vidéo sera créée.</p>`}`;
}
function sheetInfo(v) {
  return `<div class="field"><label>Sujet</label><input data-f="subject" value="${esc(v.subject)}"></div>
    <div class="field"><label>Angle</label><textarea data-f="angle" rows="2">${esc(v.angle)}</textarea></div>
    <div class="field"><label>Hook (la toute première phrase)</label><textarea data-f="hook" rows="2">${esc(v.hook)}</textarea></div>
    <div class="field"><label>Idée de visuel</label><textarea data-f="visual_idea" rows="2">${esc(v.visual_idea)}</textarea></div>
    <div class="row-actions"><button class="btn btn-accent" id="fSave">${ICON.check} Enregistrer</button></div>
    <dl class="kv section"><dt>Durée visée</dt><dd>${v.duration_target || "—"} s</dd><dt>Durée estimée</dt><dd>${v.duration_est ? "~" + Math.round(v.duration_est) + " s" : "—"}</dd>
      <dt>Durée réelle</dt><dd>${v.duration_real ? v.duration_real + " s" : "—"}</dd><dt>Production</dt><dd>${esc(v.notes || "—")}</dd></dl>`;
}
function bindSheetTab(v) {
  const P = $("#sheetPanel");
  const ed = $("#scEdit", P); if (ed) ed.onclick = () => { S.sheet.edit = true; renderSheet(); };
  const re = $("#scRe", P); if (re) re.onclick = () => { if (confirm("Réécrire entièrement ce script avec l'IA ?")) A.writeScripts([v.id]); };
  const ca = $("#scCancel", P); if (ca) ca.onclick = () => { S.sheet.edit = false; renderSheet(); };
  const renum = () => $$("[data-scene] .sn", P).forEach((n, i) => n.textContent = i + 1);
  $$("[data-delscene]", P).forEach((b) => b.onclick = () => { b.closest("[data-scene]").remove(); renum(); });
  const add = $("#scAdd", P); if (add) add.onclick = () => { $("#scList", P).insertAdjacentHTML("beforeend", sceneEdit({ voice: "", on_screen: "", visual: "", image_prompt: "", emphasis: [] }, $$("[data-scene]", P).length)); bindSheetTab(v); };
  const sv = $("#scSave", P); if (sv) sv.onclick = async () => {
    const scenes = $$("[data-scene]", P).map((b) => { const s = {}; $$("[data-s]", b).forEach((e) => s[e.dataset.s] = e.value); s.emphasis = s.emphasis.split(",").map((x) => x.trim()).filter(Boolean); return s; }).filter((s) => s.voice.trim());
    if (!scenes.length) return toast("Ajoute au moins une scène");
    S.sheet.edit = false; await run(() => api(`/api/videos/${v.id}`, { method: "PUT", body: { scenes } }), "✓ Script enregistré");
  };
  const fs = $("#fSave", P); if (fs) fs.onclick = async () => {
    const d = {}; $$("[data-f]", P).forEach((e) => d[e.dataset.f] = e.value);
    if ("hashtags" in d) d.hashtags = d.hashtags.split(/[\s,]+/).filter(Boolean).map((t) => (t.startsWith("#") ? t : "#" + t));
    await run(() => api(`/api/videos/${v.id}`, { method: "PUT", body: d }), "✓ Enregistré");
  };
  const cc = $("#capCopy", P); if (cc) cc.onclick = () => A.copy(v.caption || "");
}

// ---------- alerte crédit ElevenLabs ----------
async function refreshAlert() {
  const a = await api("/api/elevenlabs/alert").catch(() => null);
  const bar = $("#alertBar");
  if (!a || a.level === "ok") { bar.classList.add("hidden"); return; }
  bar.className = `alert-bar ${a.level}`;
  bar.innerHTML = `<span style="font-size:18px">${a.level === "low" ? "⚠️" : "🔴"}</span><span class="msg">${esc(a.message)}</span>
    <button class="btn btn-sm" id="alertGo">Changer la clé</button><button class="icon-btn" id="alertX" title="Masquer">${ICON.x}</button>`;
  $("#alertGo").onclick = () => go("settings");
  $("#alertX").onclick = () => bar.classList.add("hidden");
}
setInterval(refreshAlert, 90000);

// ---------- mises à jour ----------
async function runUpdate() {
  toast("⏳ Recherche de la mise à jour…", 8000);
  try {
    const r = await api("/api/update", { method: "POST" });
    if (!r.updated) { toast(r.message, 4000); if (S.page === "settings") pageSettings(); return; }
    toast("✅ " + r.message + " Redémarrage…", 20000);
    await new Promise((ok) => setTimeout(ok, 4000));
    for (let i = 0; i < 60; i++) {
      try { await fetch("/api/version", { cache: "no-store" }); location.reload(); return; } catch { await new Promise((ok) => setTimeout(ok, 1500)); }
    }
    toast("Relance l'application avec l'icône du bureau.", 8000);
  } catch (e) { toast("⚠️ " + e.message, 6000); }
}
async function checkUpdate() {
  const v = await api("/api/version").catch(() => null);
  if (!v?.available) return;
  const b = document.createElement("button");
  b.className = "btn btn-sm"; b.style.marginRight = "8px";
  b.innerHTML = `${ICON.sparkles} Mise à jour disponible`;
  b.onclick = runUpdate;
  $(".topbar-actions").prepend(b);
}

// ---------- tâches en arrière-plan ----------
const KIND = { plan: "Préparation des idées", scripts: "Écriture des scripts", render: "Création de vidéo" };
async function pollJobs(force) {
  let recent;
  try { recent = await api("/api/jobs"); } catch { return; }
  S.jobs = recent.filter((j) => ["queued", "running"].includes(j.status)).reverse();
  // tâches échouées récemment : on les montre clairement au lieu de les laisser passer inaperçues
  const seen = JSON.parse(get("seenErrors", "[]"));
  const fresh = recent.filter((j) => j.status === "error" && !seen.includes(j.id) && Date.now() - new Date(j.updated_at).getTime() < 30 * 60e3);
  const box = $("#taskMini");
  if (fresh.length && !S.jobs.length) {
    const j = fresh[0];
    box.innerHTML = `<b style="color:#ef4444">⚠️ ${KIND[j.kind] || j.kind} : échec</b><div class="muted" style="margin-bottom:8px;max-height:96px;overflow:auto;white-space:pre-wrap">${esc(j.message)}</div><button class="btn btn-sm btn-block" id="errOk">OK, compris</button>`;
    box.classList.remove("hidden");
    $("#errOk").onclick = (e) => { e.stopPropagation(); set("seenErrors", JSON.stringify([...seen, ...fresh.map((x) => x.id)].slice(-50))); pollJobs(true); };
    if (!S.errToasted?.includes(j.id)) { (S.errToasted ||= []).push(j.id); toast("⚠️ Une tâche a échoué — détail en bas à gauche", 6000); }
  } else if (S.jobs.length) {
    const r = S.jobs.find((j) => j.status === "running") || S.jobs[0];
    box.innerHTML = `<b>⏳ ${S.jobs.length} tâche${S.jobs.length > 1 ? "s" : ""} en cours</b><div class="muted" style="margin-bottom:6px">${esc(r.message || "En attente…")}</div><div class="progress"><i style="width:${r.progress || 0}%"></i></div>`;
    box.classList.remove("hidden");
  } else box.classList.add("hidden");
  const key = JSON.stringify(S.jobs.map((j) => [j.id, j.progress, j.status]));
  const typing = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if ((force || key !== S.jobsKey) && !typing) await reload();
  if (S.jobsKey && S.jobsKey !== "[]" && !S.jobs.length && !fresh.length) toast("✅ Tout est terminé !");
  S.jobsKey = key;
}
$("#taskMini").onclick = () => {
  if (!S.jobs.length) return;
  $("#dialogPanel").innerHTML = `<div class="planner"><div style="display:flex;align-items:center"><h2>Tâches en cours</h2><button class="icon-btn" data-close style="margin-left:auto">${ICON.x}</button></div>
    <p class="lead">Les tâches s'exécutent une par une, en arrière-plan.</p>
    ${S.jobs.map((j) => `<div class="card pad" style="margin-bottom:10px"><div style="display:flex;gap:10px;align-items:center"><b style="flex:1">${KIND[j.kind] || j.kind}</b>
      ${j.status === "queued" ? `<button class="btn btn-sm btn-ghost" data-cancel="${j.id}">Annuler</button>` : `<span class="faint small">${j.progress}%</span>`}</div>
      <div class="muted small" style="margin:4px 0 8px">${esc(j.message)}</div><div class="progress"><i style="width:${j.progress}%"></i></div></div>`).join("") || `<p class="muted">Aucune tâche.</p>`}</div>`;
  $("#dialog").classList.remove("hidden");
  $$("[data-close]", $("#dialog")).forEach((x) => x.onclick = closeDialog);
  $$("[data-cancel]").forEach((b) => b.onclick = async () => { await api(`/api/jobs/${b.dataset.cancel}/cancel`, { method: "POST" }); closeDialog(); pollJobs(true); });
};
$$("#dialog > [data-close]").forEach((x) => x.onclick = closeDialog);

setInterval(pollJobs, 2500);
reload().then(() => { pollJobs(); checkUpdate(); refreshAlert(); });
