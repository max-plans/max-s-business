const sb = supabase.createClient(window.PLOP.url, window.PLOP.key);
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const CONCEPTS = [
  ["fusionx", "Fusion perso", "Les objets fusionnent, la voix dit ton mot de plus en plus grave."],
  ["infini", "Zoom infini", "Plongée hypnotique dans une fractale (2 crédits)."],
  ["billes", "Course de billes", "3 billes ou 3 pays font la course."],
  ["maths", "Course des maths", "×2, n², +32 : qui arrive en bas en premier ?"],
  ["fusion", "Fusion planètes", "Une nouvelle planète à chaque fusion."],
  ["anneaux", "Évasion des anneaux", "Une bille s'échappe de cercles qui tournent."],
  ["mur", "Mur arc-en-ciel", "Des balles cassent un mur de couleurs."],
  ["aleatoire", "Au hasard", "Un concept différent à chaque fois."],
];
const S = { user: null, concept: "fusionx", seconds: 20, theme: "planetes", images: [], signup: true };

function toast(msg) {
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 3200);
}
function cost() { return S.concept === "infini" || S.seconds >= 45 ? 2 : 1; }
function frError(e) {
  const m = (e && (e.message || e.error_description)) || String(e);
  if (/Invalid login credentials/i.test(m)) return "Adresse e-mail ou mot de passe incorrect.";
  if (/Email not confirmed/i.test(m)) return "Confirme d'abord ton adresse e-mail (regarde tes mails).";
  if (/User already registered/i.test(m)) return "Un compte existe déjà avec cette adresse : connecte-toi.";
  if (/Password should be at least/i.test(m)) return "Le mot de passe doit faire au moins 8 caractères.";
  if (/rate limit/i.test(m)) return "Trop d'essais : réessaie dans quelques minutes.";
  return m;
}

// ---------------- connexion
$("#switchAuth").onclick = (e) => {
  e.preventDefault(); S.signup = !S.signup;
  $("#authTitle").textContent = S.signup ? "Créer un compte" : "Se connecter";
  $("#authBtn").textContent = S.signup ? "Créer mon compte" : "Se connecter";
  $("#switchAuth").textContent = S.signup ? "J'ai déjà un compte" : "Je n'ai pas encore de compte";
  $("#authErr").textContent = "";
};
$("#authBtn").onclick = async () => {
  const email = $("#email").value.trim(), password = $("#pass").value;
  $("#authErr").textContent = "";
  if (password.length < 8) { $("#authErr").textContent = "Le mot de passe doit faire au moins 8 caractères."; return; }
  $("#authBtn").disabled = true;
  try {
    if (S.signup) {
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.session) { $("#authErr").textContent = "Compte créé ! Clique sur le lien reçu par e-mail pour l'activer, puis connecte-toi."; }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (e) { $("#authErr").textContent = frError(e); }
  $("#authBtn").disabled = false;
};
$("#logoutBtn").onclick = () => sb.auth.signOut();

sb.auth.onAuthStateChange((_ev, session) => {
  S.user = session ? session.user : null;
  $("#authView").classList.toggle("hidden", !!S.user);
  $("#appView").classList.toggle("hidden", !S.user);
  $("#creditsPill").classList.toggle("hidden", !S.user);
  $("#logoutBtn").classList.toggle("hidden", !S.user);
  if (S.user) { loadProfile(); loadJobs(); renderStudio(); }
});

// ---------------- profil / crédits
async function loadProfile() {
  const { data } = await sb.from("profiles").select("credits, plan").eq("id", S.user.id).single();
  if (data) {
    $("#credits").textContent = data.credits;
    $("#plan").textContent = { essai: "Essai", standard: "Standard", pro: "Pro", agence: "Agence" }[data.plan] || data.plan;
  }
}

// ---------------- studio
function renderStudio() {
  $("#concepts").innerHTML = CONCEPTS.map(([k, t, d]) =>
    `<button class="cc ${k === S.concept ? "on" : ""}" data-c="${k}"><b>${esc(t)}</b><span>${esc(d)}</span></button>`).join("");
  document.querySelectorAll("[data-c]").forEach((b) => b.onclick = () => { S.concept = b.dataset.c; renderStudio(); });
  $("#durations").innerHTML = [20, 30, 45, 60].map((s) => `<button data-s="${s}" class="${s === S.seconds ? "on" : ""}">${s} s</button>`).join("");
  document.querySelectorAll("[data-s]").forEach((b) => b.onclick = () => { S.seconds = +b.dataset.s; renderStudio(); });
  $("#fpBox").classList.toggle("hidden", S.concept !== "fusionx");
  $("#fpTheme").innerHTML = [["planetes", "Planètes en gelée"], ["fruits", "Fruits"]]
    .map(([v, l]) => `<button data-t="${v}" class="${v === S.theme ? "on" : ""}">${l}</button>`).join("");
  document.querySelectorAll("[data-t]").forEach((b) => b.onclick = () => { S.theme = b.dataset.t; renderStudio(); });
  renderImages();
  const c = cost();
  $("#createBtn").textContent = `Créer la vidéo (${c} crédit${c > 1 ? "s" : ""})`;
  $("#costHint").textContent = "Fabrication : 2 à 10 minutes selon le concept.";
}

async function renderImages() {
  const box = $("#fpImgs");
  const urls = await Promise.all(S.images.map(async (p) => {
    const { data } = await sb.storage.from("uploads").createSignedUrl(p, 3600);
    return data ? data.signedUrl : "";
  }));
  box.innerHTML = S.images.map((p, i) => `<div class="im"><i>${i + 1}</i><button data-del="${i}" aria-label="Retirer">✕</button><img src="${esc(urls[i])}" alt=""></div>`).join("")
    + (S.images.length < 12 ? `<label class="add" for="fpFile">＋ Ajouter des images</label>` : "");
  box.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
    const p = S.images.splice(+b.dataset.del, 1)[0];
    await sb.storage.from("uploads").remove([p]);
    renderImages();
  });
}
$("#fpFile").onchange = async (e) => {
  const files = [...e.target.files]; e.target.value = "";
  for (const f of files) {
    if (S.images.length >= 12) break;
    if (f.size > 5 * 1024 * 1024) { toast(`${f.name} : 5 Mo maximum.`); continue; }
    const ext = (f.type.split("/")[1] || "png").replace("jpeg", "jpg");
    const path = `${S.user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await sb.storage.from("uploads").upload(path, f, { contentType: f.type });
    if (error) { toast("Envoi impossible : " + error.message); continue; }
    S.images.push(path);
  }
  renderImages();
};

$("#createBtn").onclick = async () => {
  $("#createErr").textContent = "";
  if (S.concept === "fusionx" && S.images.length > 0 && S.images.length < 3) {
    $("#createErr").textContent = "Mets au moins 3 images (ou aucune pour les objets par défaut)."; return;
  }
  const options = S.concept === "fusionx" ? { word: $("#fpWord").value.trim(), theme: S.theme, images: S.images } : {};
  $("#createBtn").disabled = true;
  const { error } = await sb.rpc("create_job", { p_concept: S.concept, p_seconds: S.seconds, p_options: options });
  $("#createBtn").disabled = false;
  if (error) { $("#createErr").textContent = error.message; return; }
  toast("C'est parti ! Ta vidéo est en fabrication.");
  loadProfile(); loadJobs();
};

// ---------------- mes vidéos
const LABEL = Object.fromEntries(CONCEPTS.map(([k, t]) => [k, t]));
async function loadJobs() {
  if (!S.user) return;
  const { data } = await sb.from("jobs").select("*").order("created_at", { ascending: false }).limit(30);
  if (!data || !data.length) { $("#jobs").innerHTML = `<p class="muted">Aucune vidéo pour l'instant.</p>`; return; }
  $("#jobs").innerHTML = data.map((j) => {
    const when = new Date(j.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
    let right = "";
    if (j.status === "queued") right = `<span class="muted">En attente…</span>`;
    else if (j.status === "running") right = `<div class="bar"><i style="width:${j.progress}%"></i></div><span class="muted">${esc(j.message || "")}</span>`;
    else if (j.status === "done" && j.video_path) right = `<button class="btn go" data-dl="${esc(j.video_path)}">Télécharger</button>`;
    else if (j.status === "done") right = `<span class="muted">Expirée</span>`;
    else right = `<span class="muted" style="color:var(--bad)">${esc(j.message || "Échec")}</span>`;
    return `<div class="job"><div><b>${esc(LABEL[j.concept] || j.concept)}</b> · ${j.seconds} s<br><span class="muted">${when}</span></div><div class="row">${right}</div></div>`;
  }).join("");
  document.querySelectorAll("[data-dl]").forEach((b) => b.onclick = async () => {
    const { data: d, error } = await sb.storage.from("videos").createSignedUrl(b.dataset.dl, 600, { download: true });
    if (error) { toast("Téléchargement impossible : " + error.message); return; }
    location.href = d.signedUrl;
  });
}
setInterval(() => { if (S.user) { loadJobs(); loadProfile(); } }, 5000);
