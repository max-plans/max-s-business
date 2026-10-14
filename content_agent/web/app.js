// Plop Lab — studio de vidéos satisfaisantes (100 % local).
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = { get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ico = (id) => `<svg class="i"><use href="#i-${id}"/></svg>`;

async function api(path, opts = {}) {
  const r = await fetch(path, { headers: { "content-type": "application/json" }, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const text = await r.text();
  let data = {}; try { data = JSON.parse(text); } catch { /* réponse non JSON */ }
  if (!r.ok) throw new Error((typeof data.detail === "string" ? data.detail : "") || text.slice(0, 300) || r.statusText);
  return data;
}
function toast(msg, ms = 3200, err = false) {
  const t = $("#toast"); t.textContent = msg; t.classList.toggle("err", err); t.classList.add("show");
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), ms);
}
const fail = (e) => toast("⚠️ " + e.message, 6000, true);

// ---------- concepts : couleur + mini-aperçu animé ----------
const ORDER = ["maths", "anneaux", "plinko", "mur", "gelees", "pendules", "grossit", "dominos", "aleatoire"];
const COLOR = { anneaux: "#FF3D9A", plinko: "#29E0FF", mur: "#FF7A1A", gelees: "#D4FF3F", pendules: "#8B5CFF", grossit: "#5AA8FF", dominos: "#FF5468", maths: "#3DDC84", aleatoire: "#F5F3F8" };
const LONG = ["pendules", "grossit", "dominos"];       // ces concepts durent au moins 45 s
const hsl = (h, s = 90, l = 60, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
const hash = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const tri = (x) => 1 - Math.abs((x % 2 + 2) % 2 - 1);

function ball(c, x, y, r, hue, l = 60) {
  const g = c.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r);
  g.addColorStop(0, "#fff"); g.addColorStop(.25, hsl(hue, 95, l + 15)); g.addColorStop(1, hsl(hue, 85, l - 30));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
}
const PREVIEW = {
  anneaux(c, w, h, t) {
    const cx = w / 2, cy = h * .46, cyc = t % 10, gone = Math.floor(cyc / 2);
    for (let k = 5; k >= 0; k--) {
      if (k < gone) continue;
      const r = 12 + k * 10, a0 = t * (k % 2 ? -1.3 : 1.1) + k;
      c.strokeStyle = hsl(330 - k * 32, 95, 62); c.lineWidth = 3.4; c.shadowColor = c.strokeStyle; c.shadowBlur = 8;
      c.beginPath(); c.arc(cx, cy, r, a0 + .55, a0 + Math.PI * 2 - .55); c.stroke();
    }
    c.shadowBlur = 0;
    const R = 10 + gone * 10, a = t * 2.7;
    ball(c, cx + Math.cos(a) * R * Math.abs(Math.sin(t * 3.1)), cy + Math.sin(a) * R * Math.abs(Math.sin(t * 3.1)), 4.5, 50);
    if (cyc % 2 < .35) for (let p = 0; p < 10; p++) {           // éclats de l'anneau qui casse
      const an = p / 10 * 6.28, d = (12 + gone * 10) + (cyc % 2) * 60;
      c.fillStyle = hsl(330 - gone * 32, 95, 65, 1 - (cyc % 2) / .35); c.fillRect(cx + Math.cos(an) * d, cy + Math.sin(an) * d, 3, 3);
    }
  },
  plinko(c, w, h, t) {
    const rows = 8, rh = h * .78 / rows, sx = w / 9;
    c.fillStyle = "rgba(255,255,255,.5)";
    for (let r = 0; r < rows; r++) for (let k = 0; k <= r + 1; k++) { c.beginPath(); c.arc(w / 2 + (k - (r + 1) / 2) * sx, 18 + r * rh, 1.7, 0, 7); c.fill(); }
    const hues = [330, 190, 75, 265];
    for (let i = 0; i < 8; i++) {
      const p = (t * .28 + i / 8) % 1, y = 10 + p * h * .9, row = Math.min(rows, Math.floor((y - 18) / rh)), f = ((y - 18) / rh) % 1;
      let x = w / 2;
      for (let r = 0; r < row; r++) x += (hash(i + Math.floor(t * .28 + i / 8) * 9, r) < .5 ? -1 : 1) * sx / 2;
      if (row < rows && row >= 0) x += (hash(i + Math.floor(t * .28 + i / 8) * 9, row) < .5 ? -1 : 1) * sx / 2 * Math.max(0, f - .5) * 2;
      ball(c, x, y, 4, hues[i % 4]);
    }
    for (let k = 0; k < 4; k++) { c.fillStyle = hsl(hues[k], 90, 55, .5); c.fillRect(w * (.1 + k * .2) + 2, h - 12, w * .2 - 4, 8); }
  },
  mur(c, w, h, t) {
    const cyc = t % 9, cols = 8, rows = 7, bw = (w - 16) / cols, bh = 9;
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      if (hash(r, k) * 7.5 < cyc) continue;
      c.fillStyle = hsl((k * 40 + r * 12) % 360, 90, 58); c.fillRect(8 + k * bw + 1, 14 + r * (bh + 2), bw - 2, bh);
    }
    const n = 1 + Math.floor(cyc / 1.6);
    for (let i = 0; i < Math.min(n, 8); i++) ball(c, 10 + tri(t * (.9 + i * .13) + i) * (w - 20), h * .25 + tri(t * (1.2 + i * .11) + i * .7) * h * .68, 4, i * 45);
  },
  gelees(c, w, h, t) {
    const n = 6, sw = w / (n + .6), sh = h * .75 / n;
    for (let k = 0; k < n; k++) { c.fillStyle = `rgba(255,255,255,${.1 + k * .03})`; c.fillRect(k * sw, 30 + (k + 1) * sh, sw + 2, h); c.fillStyle = hsl(70 + k * 30, 90, 60, .9); c.fillRect(k * sw, 30 + (k + 1) * sh, sw, 2.5); }
    for (let j = 0; j < 3; j++) {
      const p = (t * 1.3 + j * 2) % n, k = Math.floor(p), f = p - k, x = (k + .5 + f) * sw, y = 30 + (k + 1 + f) * sh - Math.sin(f * Math.PI) * sh * 1.2;
      const sq = f < .12 ? 1 - (.12 - f) * 3 : 1, hue = (k * 55 + j * 120) % 360, s = 9;
      c.fillStyle = hsl(hue, 95, 60); c.shadowColor = c.fillStyle; c.shadowBlur = 10;
      c.beginPath(); c.roundRect(x - s / sq, y - 2 * s * sq, 2 * s / sq, 2 * s * sq, 5); c.fill(); c.shadowBlur = 0;
      c.fillStyle = "rgba(255,255,255,.7)"; c.fillRect(x - s / sq + 3, y - 2 * s * sq + 3, 4, 4);
    }
  },
  pendules(c, w, h, t) {
    const n = 13, T = 12, top = h * .2;
    c.fillStyle = "#D8DCEB"; c.fillRect(8, top - 4, w - 16, 4);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const x = 14 + (w - 28) * i / (n - 1), y = top + h * .42 + h * .2 * Math.cos(2 * Math.PI * (15 + i) * t / T);
      c.strokeStyle = "rgba(200,205,230,.45)"; c.lineWidth = 1; c.beginPath(); c.moveTo(x, top); c.lineTo(x, y); c.stroke(); pts.push([x, y, i]);
    }
    c.strokeStyle = "rgba(255,255,255,.6)"; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
    pts.forEach(([x, y, i]) => ball(c, x, y, 5, 250 + i * 9));
  },
  grossit(c, w, h, t) {
    const cx = w / 2, cy = h * .5, R = Math.min(w, h) * .4, f = (t % 8) / 7, r = 4 + (R - 8) * Math.min(1, f);
    const hue = 200 + f * 120;
    c.strokeStyle = hsl(hue, 95, 65); c.lineWidth = 3; c.shadowColor = c.strokeStyle; c.shadowBlur = 14;
    c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke(); c.shadowBlur = 0;
    const d = Math.max(0, R - r - 1), a = t * 3.3;
    ball(c, cx + Math.cos(a) * d * Math.abs(Math.sin(t * 4.2)), cy + Math.sin(a * 1.3) * d * Math.abs(Math.cos(t * 3.7)), r, hue);
  },
  dominos(c, w, h, t) {
    const N = 90, sp = 8, front = (t * 9) % N, cam = Math.max(0, front * sp * .55 - h * .45);
    for (let i = 0; i < N; i++) {
      const y = 20 + i * sp * .55 - cam; if (y < -10 || y > h + 10) continue;
      const x = w / 2 + w * .3 * Math.sin(i * .14), tx = Math.cos(i * .14) * w * .3 * .14, ty = sp * .55, l = Math.hypot(tx, ty), ux = tx / l, uy = ty / l;
      const fall = Math.max(0, Math.min(1, (front - i) * 1.5)), len = 2.5 + 9 * fall;
      c.save(); c.translate(x + ux * len / 2, y + uy * len / 2); c.rotate(Math.atan2(uy, ux));
      c.fillStyle = hsl((i * 6 + 340) % 360, 85, fall >= 1 ? 48 : 62); c.fillRect(-len / 2, -5, len, 10); c.restore();
    }
  },
  maths(c, w, h, t) {
    const cols = [["×2", 350], ["+32", 200], ["n²", 130]], cw = (w - 16) / 3, cyc = t % 9;
    cols.forEach(([lbl, hue], i) => {
      const x0 = 6 + i * (cw + 2), bars = 5, gone = Math.min(bars, Math.floor(i === 0 ? Math.pow(cyc / 9, 2.2) * 6 : cyc / (3.5 + i)));
      c.strokeStyle = i === 0 && cyc > 6 ? hsl(hue, 90, 60) : "rgba(255,255,255,.15)"; c.lineWidth = 1.2; c.strokeRect(x0, 30, cw, h - 38);
      c.fillStyle = hsl(hue, 90, 62); c.font = `italic 800 ${w * .11}px "Barlow Condensed", sans-serif`; c.textAlign = "center"; c.fillText(lbl, x0 + cw / 2, 22);
      for (let b = gone; b < bars; b++) { const y = 50 + b * (h - 70) / bars; c.fillStyle = hsl(hue, 70, 35); c.fillRect(x0 + 3, y, cw - 6, 3); c.fillStyle = hsl(hue, 90, 60); c.fillRect(x0 + 3, y, (cw - 6) * (b === gone ? 1 - (cyc * 1.7 % 1) : 1), 3); }
      const floor = gone >= bars ? h - 12 : 50 + gone * (h - 70) / bars, ph = (t * 1.6 + i * .3) % 1;
      ball(c, x0 + cw / 2 + Math.sin(t * 2 + i) * cw * .25, floor - 6 - 26 * 4 * ph * (1 - ph), 4.5, hue);
    });
  },
  aleatoire(c, w, h, t) {
    const cx = w / 2, cy = h * .45;
    ORDER.slice(0, 7).forEach((k, i) => {
      const a = t * .9 + i / 7 * 6.28, rr = w * .3 + Math.sin(t * 2 + i) * 6;
      const col = COLOR[k]; c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 12;
      c.beginPath(); c.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .8, 6, 0, 7); c.fill();
    });
    c.shadowBlur = 0; c.fillStyle = "#fff"; c.font = `italic 900 ${w * .38}px "Barlow Condensed", sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
    c.save(); c.translate(cx, cy); c.rotate(Math.sin(t * 1.5) * .15); c.fillText("?", 0, 2); c.restore();
  },
};

// une seule boucle d'animation pour tous les aperçus visibles
const previews = new Set();
const seen = new WeakSet();
const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting ? seen.add(e.target) : seen.delete(e.target))) : null;
function addPreview(cv, kind) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const fit = () => { const r = cv.getBoundingClientRect(); cv.width = Math.max(1, r.width * dpr); cv.height = Math.max(1, r.height * dpr); };
  fit(); cv._fit = fit; cv._kind = kind; cv._dpr = dpr; previews.add(cv);
  if (io) io.observe(cv); else seen.add(cv);
}
function drawPreviews(now) {
  const t = now / 1000;
  for (const cv of previews) {
    if (!cv.isConnected) { previews.delete(cv); continue; }
    if (!seen.has(cv) && !REDUCED) continue;
    const c = cv.getContext("2d"), d = cv._dpr, w = cv.width / d, h = cv.height / d;
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, w, h);
    PREVIEW[cv._kind]?.(c, w, h, REDUCED ? 3 : t);
  }
  if (!REDUCED) requestAnimationFrame(drawPreviews);
}
addEventListener("resize", () => previews.forEach((cv) => cv._fit()));

// ---------- fond : bulles 3D qui flottent (clique dessus : plop !) ----------
const BG = (() => {
  const cv = $("#bg"), c = cv.getContext("2d"), dpr = Math.min(2, devicePixelRatio || 1);
  const hues = [330, 190, 75, 265, 25, 210];
  let W = 0, H = 0, mx = 0, my = 0, orbs = [], sparks = [];
  const sprites = hues.map((hue) => {
    const s = document.createElement("canvas"); s.width = s.height = 256; const g = s.getContext("2d");
    const gr = g.createRadialGradient(90, 80, 8, 128, 128, 126);
    gr.addColorStop(0, "#fff"); gr.addColorStop(.18, hsl(hue, 100, 82)); gr.addColorStop(.55, hsl(hue, 90, 55)); gr.addColorStop(1, hsl(hue, 80, 18));
    g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); return s;
  });
  const spawn = (o = {}) => { const z = Math.random(); return Object.assign({ x: Math.random() * W, y: Math.random() * H, z, r: 10 + z * 46, vx: (Math.random() - .5) * 14, vy: (Math.random() - .5) * 14 - 4, s: Math.floor(Math.random() * hues.length), born: performance.now() }, o); };
  function size() { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; if (!orbs.length) orbs = Array.from({ length: W < 720 ? 8 : 15 }, () => spawn()); }
  size(); addEventListener("resize", size);
  addEventListener("pointermove", (e) => { mx = e.clientX / W - .5; my = e.clientY / H - .5; });
  addEventListener("pointerdown", (e) => {
    if (e.target.closest("button,a,input,select,video,.tile,.modal")) return;
    const hit = orbs.find((o) => Math.hypot(o.x - mx * 40 * o.z - e.clientX, o.y - my * 40 * o.z - e.clientY) < o.r);
    if (hit) pop(hit);
  });
  function pop(o) {
    for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28, v = 80 + Math.random() * 220; sparks.push({ x: o.x - mx * 40 * o.z, y: o.y - my * 40 * o.z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, h: hues[o.s] }); }
    Object.assign(o, spawn({ y: H + 80, born: performance.now() }));
  }
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    orbs.sort((a, b) => a.z - b.z);
    for (const o of orbs) {
      o.x += o.vx * dt * (.4 + o.z); o.y += o.vy * dt * (.4 + o.z);
      if (o.x < -80) o.x = W + 80; if (o.x > W + 80) o.x = -80; if (o.y < -80) o.y = H + 80; if (o.y > H + 80) o.y = -80;
      const x = o.x - mx * 40 * o.z, y = o.y - my * 40 * o.z, r = o.r * (1 + .04 * Math.sin(now / 700 + o.r));
      c.globalAlpha = (.18 + o.z * .5) * Math.min(1, (now - o.born) / 900);
      c.drawImage(sprites[o.s], x - r, y - r, r * 2, r * 2);
    }
    c.globalAlpha = 1;
    sparks = sparks.filter((p) => (p.life -= dt * 1.6) > 0);
    for (const p of sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; c.fillStyle = hsl(p.h, 95, 65, p.life); c.beginPath(); c.arc(p.x, p.y, 3 * p.life + 1, 0, 7); c.fill(); }
    if (!document.hidden) requestAnimationFrame(frame); else setTimeout(() => requestAnimationFrame(frame), 500);
  }
  if (!REDUCED) requestAnimationFrame(frame); else frame(performance.now());
  return { pop };
})();

// ---------- effets : inclinaison 3D, compteurs, confettis ----------
function tilt(el, max = 10) {
  if (REDUCED || el._tilt) return; el._tilt = true;
  el.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.transition = "transform .12s linear";
    el.style.transform = `perspective(900px) rotateX(${(.5 - y) * max}deg) rotateY(${(x - .5) * max}deg) translateZ(6px)`;
    el.style.setProperty("--mx", x * 100 + "%"); el.style.setProperty("--my", y * 100 + "%");
  });
  el.addEventListener("pointerleave", () => { el.style.transition = ""; el.style.transform = ""; });
}
function countUp(el, to) {
  const from = +el.dataset.v || 0; el.dataset.v = to;
  if (REDUCED || from === to) { el.textContent = to; return; }
  const t0 = performance.now();
  const step = (now) => { const f = Math.min(1, (now - t0) / 1000), e = 1 - Math.pow(1 - f, 4); el.textContent = Math.round(from + (to - from) * e); if (f < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function confetti(el, n = 34) {
  if (REDUCED) return;
  const r = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2, cols = Object.values(COLOR);
  for (let i = 0; i < n; i++) {
    const d = document.createElement("i"), s = 6 + Math.random() * 10, a = Math.random() * 6.28, v = 120 + Math.random() * 260;
    d.className = "conf"; d.style.cssText = `left:${cx - s / 2}px;top:${cy - s / 2}px;width:${s}px;height:${s}px;background:radial-gradient(circle at 35% 30%,#fff,${cols[i % cols.length]} 55%)`;
    document.body.appendChild(d);
    d.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${Math.cos(a) * v}px,${Math.sin(a) * v - 120}px) scale(.9)`, opacity: 1, offset: .55 },
      { transform: `translate(${Math.cos(a) * v * 1.3}px,${Math.sin(a) * v + 200}px) scale(.3)`, opacity: 0 }], { duration: 1300 + Math.random() * 600, easing: "cubic-bezier(.16,1,.3,1)" }).onfinish = () => d.remove();
  }
}

// ---------- état ----------
const S = {
  data: { concepts: {}, videos: [], stats: { total: 0, today: 0, week: 0, days: [0, 0, 0, 0, 0, 0, 0], by_concept: {}, size_gb: 0 }, folder: "" },
  concept: store.get("concept", "aleatoire"), seconds: +store.get("seconds", 45), count: 1, logo: store.get("logo", ""),
  filter: "all", shown: 24, jobs: [], errors: [], auto: null, logos: [], known: null, fresh: new Set(), cfg: {},
};
const label = (k) => k === "aleatoire" ? "Au hasard" : S.data.concepts[k]?.label || k;

// ---------- hero & stats ----------
function renderHero() {
  const now = new Date(), hr = now.getHours();
  $("#hello").textContent = hr < 5 ? "Bonne nuit" : hr < 12 ? "Bonjour" : hr < 18 ? "Salut" : "Bonsoir";
  $("#today").textContent = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const st = S.data.stats, goal = S.auto?.per_day || 3, busy = S.jobs.length;
  $("#heroLine").innerHTML = busy ? `Le labo tourne : <b>${busy} production${busy > 1 ? "s" : ""}</b> en cours. Les vidéos arrivent dans la galerie.`
    : st.today >= goal ? `Objectif du jour atteint : <b>${st.today} vidéo${st.today > 1 ? "s" : ""}</b> prêtes à poster. 🔥`
    : st.total ? `<b>${st.today} / ${goal}</b> vidéos aujourd'hui. Encore ${goal - st.today} et la journée est bouclée.`
    : `Ton labo est prêt. Choisis un concept et lance ta <b>première vidéo</b>.`;
  const f = Math.min(1, st.today / goal);
  $("#goalRing").style.strokeDashoffset = 314 * (1 - f);
  $("#goalPct").textContent = Math.round(f * 100) + "%";
  $("#goalTxt").textContent = `${st.today} / ${goal}`;
}
function renderStats() {
  const st = S.data.stats, goal = S.auto?.per_day || 3;
  $$("[data-count]").forEach((el) => countUp(el, st[el.dataset.count] || 0));
  $("#sizeHint").textContent = st.total ? `${st.size_gb.toLocaleString("fr-FR")} Go sur ton PC` : "Aucune pour l'instant";
  const n = Math.max(goal, st.today);
  $("#todaySegs").style.setProperty("--n", n);
  $("#todaySegs").innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < st.today ? "on" : ""}"></i>`).join("");
  const mx = Math.max(1, ...st.days);
  $("#bars7").innerHTML = st.days.map((d, i) => `<i style="--i:${i};height:${Math.max(8, d / mx * 100)}%" class="${i === 6 ? "today" : ""}" title="${d} vidéo(s)"></i>`).join("");
}

// ---------- studio ----------
function renderConcepts() {
  const box = $("#concepts"), keys = ORDER.filter((k) => k === "aleatoire" || S.data.concepts[k]);
  if (!keys.includes(S.concept)) S.concept = "aleatoire";
  if (box.dataset.keys !== keys.join()) {
    box.dataset.keys = keys.join();
    box.innerHTML = keys.map((k, i) => `<button class="cc" data-c="${k}" style="--c:${COLOR[k]};--i:${i}" aria-pressed="false">
      <div class="face"><canvas></canvas><span class="n score"></span>
      <div class="lbl"><b>${esc(label(k))}</b><span>${esc(k === "aleatoire" ? "L'agent choisit un concept différent à chaque vidéo." : S.data.concepts[k].desc)}</span></div></div></button>`).join("");
    $$(".cc", box).forEach((b) => {
      addPreview($("canvas", b), b.dataset.c); tilt(b, 16);
      b.onclick = () => { S.concept = b.dataset.c; store.set("concept", S.concept); renderStudio(); };
    });
  }
  $$(".cc", box).forEach((b) => {
    const on = b.dataset.c === S.concept; b.classList.toggle("sel", on); b.setAttribute("aria-pressed", on);
    const n = S.data.stats.by_concept[b.dataset.c]; $(".n", b).textContent = n ? `${n} vid.` : ""; $(".n", b).classList.toggle("hidden", !n);
  });
}
function renderStudio() {
  renderConcepts();
  const segs = [20, 30, 45, 60];
  if (!segs.includes(S.seconds)) S.seconds = 45;
  const seg = $("#segSec");
  seg.innerHTML = `<i class="tp"></i>` + segs.map((s) => `<button data-s="${s}" class="${s === S.seconds ? "on" : ""}">${s} s</button>`).join("");
  const place = () => { const b = $(".on", seg), tp = $(".tp", seg); if (b) { tp.style.left = b.offsetLeft + "px"; tp.style.width = b.offsetWidth + "px"; } };
  requestAnimationFrame(place);
  $$("button", seg).forEach((b) => b.onclick = () => { S.seconds = +b.dataset.s; store.set("seconds", S.seconds); $$("button", seg).forEach((x) => x.classList.toggle("on", x === b)); place(); renderHint(); });
  $("#count").textContent = S.count;
  $("#logoOpt").classList.toggle("hidden", !["mur", "aleatoire"].includes(S.concept));
  const sel = $("#logoSel");
  sel.innerHTML = `<option value="">Aucun</option><option value="auto">L'agent choisit</option>` +
    S.logos.map((l) => `<option value="${esc(l.id)}">${l.kind === "drapeau" ? "🏳️" : "⭐"} ${esc(l.name)}</option>`).join("");
  sel.value = S.logos.some((l) => l.id === S.logo) || S.logo === "auto" ? S.logo : "";
  $("#goTxt").textContent = S.count > 1 ? `Lancer ${S.count} vidéos` : "Lancer la production";
  renderHint();
}
function renderHint() {
  const parts = [];
  if (LONG.includes(S.concept) && S.seconds < 45) parts.push(`« ${label(S.concept)} » dure au moins 45 s pour aller jusqu'au bout.`);
  if (S.concept === "aleatoire") parts.push("Un concept différent pour chaque vidéo : jamais deux fois la même.");
  if (S.logo && ["mur", "aleatoire"].includes(S.concept)) parts.push("Le logo apparaît sur le mur arc-en-ciel, et le titre parle de lui.");
  $("#studioHint").textContent = parts.join(" ");
}
$$("[data-step]").forEach((b) => b.onclick = () => { S.count = Math.max(1, Math.min(10, S.count + +b.dataset.step)); renderStudio(); });
$("#logoSel").onchange = (e) => { S.logo = e.target.value; store.set("logo", S.logo); renderHint(); };
async function launch(btn) {
  btn.disabled = true;
  try {
    await api("/api/satisfying", { method: "POST", body: { concept: S.concept, seconds: S.seconds, count: S.count, logo: S.logo } });
    confetti(btn); toast(S.count > 1 ? `${S.count} vidéos en production !` : "Production lancée !");
    pollJobs();
  } catch (e) { fail(e); }
  setTimeout(() => btn.disabled = false, 900);
}
$("#goBtn").onclick = (e) => launch(e.currentTarget);
$("#heroGo").onclick = () => $("#studio").scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });

// ---------- production en direct ----------
function renderQueue() {
  const q = $("#queue"), run = S.jobs.find((j) => j.status === "running"), wait = S.jobs.filter((j) => j.status === "queued");
  let html = "";
  if (run) {
    const p = run.progress || 0, m = /Vidéo (\d+)\/(\d+)/.exec(run.message || ""), c = run.params?.concept;
    html += `<div class="q-now"><div class="ring big prod"><svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="50" stroke-width="10" fill="none"/>
      <circle class="fg" cx="60" cy="60" r="50" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="314" stroke-dashoffset="${314 * (1 - p / 100)}"/></svg><b>${p}%</b></div>
      <div class="ttl">${m ? `Vidéo ${m[1]} sur ${m[2]}` : "En production"}</div>
      <div class="wave">${Array.from({ length: 9 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div>
      <div class="msg">${esc(c ? label(c) : "")}${c ? " · " : ""}${esc((run.message || "").replace(/^Vidéo \d+\/\d+ · /, ""))}</div></div>`;
  }
  html += wait.map((j) => `<div class="q-item"><b>${esc(label(j.params?.concept || "aleatoire"))} · ${j.params?.count || 1} vidéo${(j.params?.count || 1) > 1 ? "s" : ""}</b><span class="score" style="color:var(--muted);font-size:12px">en attente</span>
    <button class="ibtn" data-cancel="${j.id}" aria-label="Annuler" style="width:30px;height:30px">${ico("x")}</button></div>`).join("");
  html += S.errors.map((j) => `<div class="q-item err"><b>Échec<small>${esc(j.message)}</small></b><button class="ibtn" data-dismiss="${j.id}" aria-label="Masquer" style="width:30px;height:30px">${ico("x")}</button></div>`).join("");
  if (!html) html = `<div class="q-empty"><div class="zz"></div><div>Rien en cours.<br>Lance une vidéo, elle se fabrique ici en direct.</div></div>`;
  q.innerHTML = html;
  $$("[data-cancel]", q).forEach((b) => b.onclick = async () => { await api(`/api/jobs/${b.dataset.cancel}/cancel`, { method: "POST" }).catch(fail); pollJobs(); });
  $$("[data-dismiss]", q).forEach((b) => b.onclick = () => { const d = JSON.parse(store.get("dismissed", "[]")); d.push(+b.dataset.dismiss); store.set("dismissed", JSON.stringify(d.slice(-60))); pollJobs(); });
  const pill = $("#livePill");
  pill.classList.toggle("busy", !!S.jobs.length);
  $("#liveTxt").textContent = run ? `Production · ${run.progress || 0} %` : S.jobs.length ? "En file d'attente" : "Prêt";
}
let wasBusy = false, lastRefresh = 0;
async function pollJobs() {
  let list; try { list = await api("/api/jobs"); } catch { return; }
  const sat = list.filter((j) => j.kind === "satisfying");
  const dismissed = JSON.parse(store.get("dismissed", "[]"));
  S.jobs = sat.filter((j) => ["queued", "running"].includes(j.status)).reverse();
  S.errors = sat.filter((j) => j.status === "error" && !dismissed.includes(j.id) && Date.now() - new Date(j.updated_at).getTime() < 3 * 3600e3);
  renderQueue();
  const busy = S.jobs.length > 0;
  if ((busy && Date.now() - lastRefresh > 8000) || (wasBusy && !busy)) { lastRefresh = Date.now(); await refresh(); }
  if (wasBusy && !busy && !S.errors.length) { toast("Plop ! Tes vidéos sont prêtes", 4000); confetti($(".a-gallery h2"), 40); }
  wasBusy = busy;
}

// ---------- pilote automatique ----------
function renderAuto() {
  const a = S.auto; if (!a) return;
  const sw = $("#autoSw"); sw.setAttribute("aria-checked", !!a.enabled);
  $("#autoN").textContent = a.per_day; $("#autoSec").value = [30, 45, 60].includes(+a.seconds) ? a.seconds : 45;
  const st = $("#autoSt"); st.classList.toggle("on", !!a.enabled);
  st.innerHTML = `<i></i><span>${a.enabled ? `Actif · ${a.today} / ${a.per_day} aujourd'hui${a.last ? ` · ${esc(a.last)}` : ""}` : "En pause : active-le pour que l'agent produise tout seul."}</span>`;
}
async function saveAuto(patch) {
  try { S.auto = await api("/api/autopilot", { method: "PUT", body: patch }); renderAuto(); renderHero(); renderStats(); if (patch.enabled) { toast("Pilote auto activé"); setTimeout(pollJobs, 1500); } }
  catch (e) { fail(e); }
}
$("#autoSw").onclick = () => saveAuto({ enabled: !S.auto?.enabled });
$$("[data-astep]").forEach((b) => b.onclick = () => saveAuto({ per_day: Math.max(1, Math.min(20, (S.auto?.per_day || 3) + +b.dataset.astep)) }));
$("#autoSec").onchange = (e) => saveAuto({ seconds: +e.target.value });

// ---------- répartition ----------
function renderMix() {
  const bc = S.data.stats.by_concept, keys = ORDER.filter((k) => S.data.concepts[k]), mx = Math.max(1, ...keys.map((k) => bc[k] || 0));
  const box = $("#mix");
  if (!box.children.length) box.innerHTML = keys.map((k) => `<div class="row" data-k="${k}" style="--c:${COLOR[k]}"><span>${esc(label(k))}</span><b>0</b><div class="bar"><i></i></div></div>`).join("");
  requestAnimationFrame(() => $$(".row", box).forEach((r) => { const n = bc[r.dataset.k] || 0; $("b", r).textContent = n; $("i", r).style.width = (n / mx * 100) + "%"; }));
}

// ---------- galerie ----------
function renderGallery() {
  const vids = S.data.videos, present = ORDER.filter((k) => vids.some((v) => v.concept === k));
  if (S.filter !== "all" && !present.includes(S.filter)) S.filter = "all";
  $("#filters").innerHTML = [["all", "Tout", "var(--pink)"], ...present.map((k) => [k, label(k), COLOR[k]])]
    .map(([k, l, c]) => `<button class="chip ${S.filter === k ? "on" : ""}" data-f="${k}" style="--c:${c}">${esc(l)}</button>`).join("");
  $$("[data-f]").forEach((b) => b.onclick = () => { S.filter = b.dataset.f; S.shown = 24; renderGallery(); });
  const list = vids.filter((v) => S.filter === "all" || v.concept === S.filter);
  const g = $("#gallery");
  if (!list.length) { g.innerHTML = `<div class="empty"><b>La galerie est vide</b>Tes vidéos apparaîtront ici dès qu'elles sont prêtes.</div>`; return; }
  g.innerHTML = list.slice(0, S.shown).map((v, i) => `<button class="vc ${S.fresh.has(v.name) ? "new" : ""}" data-v="${esc(v.name)}" style="--c:${COLOR[v.concept] || "#fff"};--i:${Math.min(i, 12)}" aria-label="Lire ${esc(v.label)}">
    <div class="face"><video poster="${v.thumb}" data-src="${v.url}" muted loop playsinline preload="none"></video>
    <div class="ov"><span class="tag">${esc(v.label)}</span><div class="meta"><b>${esc(v.date)}</b><span>${v.size_mb} Mo</span></div></div>
    <div class="playi">${ico("play")}</div></div></button>`).join("") +
    (list.length > S.shown ? `<button class="btn more" id="more">Voir plus (${list.length - S.shown})</button>` : "");
  $$(".vc", g).forEach((b) => {
    tilt(b, 14);
    const vid = $("video", b);
    b.onpointerenter = (e) => { if (e.pointerType === "touch") return; if (!vid.src) vid.src = vid.dataset.src; vid.play().catch(() => {}); };
    b.onpointerleave = () => vid.pause();
    b.onclick = () => openVideo(S.data.videos.find((v) => v.name === b.dataset.v));
  });
  const more = $("#more"); if (more) more.onclick = () => { S.shown += 24; renderGallery(); };
}
function openVideo(v) {
  if (!v) return;
  const m = $("#modal"), box = $("#modalIn");
  box.style.setProperty("--c", COLOR[v.concept] || "#fff");
  box.innerHTML = `<button class="ibtn x" data-close aria-label="Fermer">${ico("x")}</button>
    <video src="${v.url}" poster="${v.thumb}" controls autoplay loop playsinline></video>
    <div class="side"><span class="tag">${esc(v.label)}</span><h3>${esc(v.label)}</h3><span class="when">${esc(v.date)} · ${v.size_mb} Mo</span>
      <div class="cap">${esc(v.caption || "Pas de légende.")}</div>
      <div class="acts"><a class="btn go" href="${v.url}" download>${ico("down")}Télécharger</a>
      <button class="btn" id="mMail" title="Environ 16 Mo : part en pièce jointe, pas en lien Drive">${ico("mail")}Version mail</button>
      <button class="btn" id="mCap">${ico("copy")}Copier la légende</button>
      <button class="btn danger" id="mDel">${ico("trash")}Supprimer</button></div></div>`;
  m.classList.remove("hidden");
  $$("[data-close]", m).forEach((x) => x.onclick = closeModal);
  $("#mCap").onclick = async () => { try { await navigator.clipboard.writeText(v.caption || ""); toast("Légende copiée"); } catch { toast("Impossible de copier", 3000, true); } };
  $("#mMail").onclick = async (e) => {
    const b = e.currentTarget; b.disabled = true; b.lastChild.textContent = "Compression…";
    try { const r = await api(`/api/satisfying/${encodeURIComponent(v.name)}/mail`, { method: "POST" });
      const a = document.createElement("a"); a.href = r.url; a.download = ""; document.body.appendChild(a); a.click(); a.remove();
      toast(`Version mail prête (${r.size_mb} Mo)`, 4500); } catch (err) { fail(err); }
    b.disabled = false; b.lastChild.textContent = "Version mail";
  };
  $("#mDel").onclick = async () => {
    if (!confirm("Supprimer cette vidéo ?")) return;
    try { await api(`/api/satisfying/${encodeURIComponent(v.name)}`, { method: "DELETE" }); closeModal(); toast("Vidéo supprimée"); refresh(); } catch (e) { fail(e); }
  };
}
function closeModal() { const m = $("#modal"); $$("video", m).forEach((x) => x.pause()); m.classList.add("hidden"); $("#modalIn").innerHTML = ""; }
addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

// ---------- logos ----------
function renderLogos() {
  const mine = S.logos.filter((l) => l.kind === "perso"), flags = S.logos.filter((l) => l.kind !== "perso");
  $("#logos").innerHTML = [...mine, ...flags].map((l) => `<span class="lg ${l.kind === "perso" ? "mine" : ""}"><img src="/logo-preview/${encodeURIComponent(l.id)}" alt="" loading="lazy">${esc(l.name)}
    ${l.kind === "perso" ? `<button data-ldel="${esc(l.id)}" aria-label="Supprimer ${esc(l.name)}">✕</button>` : ""}</span>`).join("");
  $$("[data-ldel]").forEach((b) => b.onclick = async () => { await api(`/api/logos/${encodeURIComponent(b.dataset.ldel)}`, { method: "DELETE" }).catch(fail); await loadLogos(); });
}
async function loadLogos() { S.logos = await api("/api/logos").catch(() => []); renderLogos(); renderStudio(); }
$("#logoFile").onchange = async (e) => {
  const f = e.target.files[0], name = $("#logoName").value.trim(); e.target.value = "";
  if (!f) return;
  if (!name) { toast("Écris d'abord le nom du logo", 3500, true); $("#logoName").focus(); return; }
  const data = await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(f); });
  try { const r = await api("/api/logos", { method: "POST", body: { name, data } }); S.logo = r.id; store.set("logo", r.id); $("#logoName").value = ""; toast("Logo ajouté"); await loadLogos(); }
  catch (err) { fail(err); }
};

// ---------- dossier & mises à jour ----------
function renderFolder() {
  $("#folderPath").textContent = S.data.folder || "—";
  $("#folderIn").value = S.cfg.export_dir || "";
  $("#folderHint").textContent = `${S.data.stats.total} vidéo(s) · ${S.data.stats.size_gb.toLocaleString("fr-FR")} Go. Chaque vidéo a sa légende dans un fichier .txt à côté.`;
}
$("#folderSave").onclick = async () => {
  try { S.cfg = await api("/api/settings", { method: "PUT", body: { export_dir: $("#folderIn").value.trim() } }); toast("Dossier enregistré"); refresh(); } catch (e) { fail(e); }
};
async function runUpdate() {
  toast("Mise à jour en cours…", 8000);
  try {
    const r = await api("/api/update", { method: "POST" });
    if (!r.updated) { toast(r.message, 4000); return; }
    toast("Mise à jour installée, redémarrage…", 20000);
    await new Promise((ok) => setTimeout(ok, 4000));
    for (let i = 0; i < 60; i++) { try { await fetch("/api/version", { cache: "no-store" }); location.reload(); return; } catch { await new Promise((ok) => setTimeout(ok, 1500)); } }
    toast("Relance l'application avec l'icône du bureau.", 8000);
  } catch (e) { fail(e); }
}
$("#updBtn").onclick = runUpdate;

// ---------- chargement ----------
async function refresh() {
  try { S.data = await api("/api/satisfying"); } catch { return; }
  const names = S.data.videos.map((v) => v.name);
  if (S.known) names.filter((n) => !S.known.has(n)).forEach((n) => S.fresh.add(n));
  S.known = new Set(names);
  renderHero(); renderStats(); renderStudio(); renderMix(); renderGallery(); renderFolder();
}
function intro() {
  const el = $("#intro"), go = () => document.body.classList.add("ready");
  let first = true; try { first = !sessionStorage.getItem("intro"); sessionStorage.setItem("intro", "1"); } catch {}
  if (REDUCED || !first) { el.classList.add("done"); go(); return; }
  const spans = $$(".cnt span", el);
  spans.forEach((s, i) => setTimeout(() => s.classList.add("on"), i * 380));
  setTimeout(() => { el.classList.add("out"); go(); }, spans.length * 380 + 150);
  setTimeout(() => el.classList.add("done"), spans.length * 380 + 1200);
}

(async function boot() {
  intro();
  setTimeout(() => document.body.classList.add("ready"), 4000);   // filet de sécurité
  $$(".tilt").forEach((el) => tilt(el, 6));
  const [cfg, auto] = await Promise.all([api("/api/settings").catch(() => ({})), api("/api/autopilot").catch(() => null)]);
  S.cfg = cfg; S.auto = auto;
  await refresh();
  renderAuto();
  await loadLogos();
  await pollJobs();
  requestAnimationFrame(drawPreviews);
  setInterval(pollJobs, 2000);
  setInterval(async () => { S.auto = await api("/api/autopilot").catch(() => S.auto); renderAuto(); renderHero(); }, 60000);
  api("/api/version").then((v) => { if (v?.available) $("#updBtn").classList.remove("hidden"); }).catch(() => {});
})();
