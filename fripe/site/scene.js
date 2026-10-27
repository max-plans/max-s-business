/* Scène 3D de la page d'accueil : tunnel d'expédition traversé au scroll. */
window.FripeScene = function ({ $, eur, reduce, monthlyOrDemo }) {
  const cv = $('#bg3d'), T = window.THREE;
  if (!T) { document.body.classList.add('no3d'); return null; }
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' }); } catch (e) { document.body.classList.add('no3d'); return null; }
  const col = (h) => new T.Color(h).convertSRGBToLinear();
  const BG = 0x060812, V = 0x7b6cff, M = 0xff4fa3, C = 0x38f0d0, G = 0xffcf5c, O = 0xff7a59;
  let pr = Math.min(devicePixelRatio || 1, 1.5); renderer.setPixelRatio(pr);
  const hasComp = !!(T.EffectComposer && T.UnrealBloomPass && T.RenderPass && T.ShaderPass && T.GammaCorrectionShader);
  if (!hasComp) { renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; }
  const scene = new T.Scene(); scene.background = col(BG); scene.fog = new T.FogExp2(col(BG), 0.036);
  const cam = new T.PerspectiveCamera(50, 1, 0.1, 400); cam.position.set(0, 1.6, 14);

  scene.add(new T.HemisphereLight(0x9a8cff, 0x1a0f2a, 0.4));
  const key = new T.DirectionalLight(0xffffff, 0.55); key.position.set(4, 8, 6); scene.add(key);
  const lights = [];
  const plight = (hex, x, y, z, i, d) => { const l = new T.PointLight(hex, i * .03, d || 26); l.position.set(x, y, z); i *= .03; l.userData.i = i; scene.add(l); lights.push(l); return l; };

  /* sol et poussière */
  const grid = new T.GridHelper(420, 210, col(V), col(0x2a2f6a)); grid.position.set(0, -3.4, -100); grid.material.transparent = true; grid.material.opacity = 0.5; scene.add(grid);
  const N = 900, pp = new Float32Array(N * 3); for (let i = 0; i < N; i++) { pp[i * 3] = (Math.random() - .5) * 34; pp[i * 3 + 1] = (Math.random() - .35) * 16; pp[i * 3 + 2] = 14 - Math.random() * 210; }
  const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pp, 3));
  const dust = new T.Points(pg, new T.PointsMaterial({ color: col(0xb9a8ff), size: .07, transparent: true, opacity: .75, depthWrite: false, blending: T.AdditiveBlending })); scene.add(dust);

  /* utilitaires */
  const edges = (mesh, hex, op) => { const l = new T.LineSegments(new T.EdgesGeometry(mesh.geometry), new T.LineBasicMaterial({ color: col(hex), transparent: true, opacity: op == null ? 1 : op })); mesh.add(l); return l; };
  const nb = (hex) => new T.MeshBasicMaterial({ color: col(hex) });
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })();
  const glow = (hex, s, x, y, z, op) => { const sp = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: col(hex), transparent: true, opacity: op == null ? .8 : op, depthWrite: false, blending: T.AdditiveBlending })); sp.scale.set(s, s, 1); sp.position.set(x, y, z); return sp; };
  const label = (text, w, h, fg, bg, px) => { const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w); const g = c.getContext('2d');
    if (bg) { g.fillStyle = bg; const r = c.height / 2; g.beginPath(); g.moveTo(r, 0); g.arcTo(c.width, 0, c.width, c.height, r); g.arcTo(c.width, c.height, 0, c.height, r); g.arcTo(0, c.height, 0, 0, r); g.arcTo(0, 0, c.width, 0, r); g.fill(); }
    g.fillStyle = fg; g.font = `700 ${px || 56}px "Bricolage Grotesque", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, c.width / 2, c.height / 2 + 3);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false })); return m; };
  const kraft = (labelOn) => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#c79a69'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(${90 + Math.random() * 60 | 0},${60 + Math.random() * 40 | 0},30,${Math.random() * .09})`; g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 6); }
    g.fillStyle = '#ff4fa3'; g.fillRect(112, 0, 32, 256);
    if (labelOn) { g.fillStyle = '#fbfaf6'; g.fillRect(24, 150, 96, 72); g.fillStyle = '#0d1a2a'; g.font = '700 22px sans-serif'; g.fillText('Fripe', 34, 182); g.fillRect(34, 192, 70, 3); g.fillRect(34, 200, 50, 3); g.fillRect(34, 208, 62, 3); }
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; };
  const kt = kraft(true), kt2 = kraft(false);
  const box = (w, h, d, tex, x, y, z, ry, neon) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshStandardMaterial({ color: col(0x141a3a), roughness: .38, metalness: .75, emissive: col(neon || M), emissiveIntensity: .16 })); m.position.set(x, y, z); m.rotation.y = ry || 0; edges(m, neon || M, .95); const tape = new T.Mesh(new T.BoxGeometry(w * 1.015, h * 1.015, d * .12), nb(neon || M)); m.add(tape); const core = new T.Mesh(new T.BoxGeometry(w * .5, h * .5, d * .5), new T.MeshBasicMaterial({ color: col(neon || M), transparent: true, opacity: .3 })); m.add(core); return m; };

  /* scènes (z de chaque scène, x de base : côté opposé au texte) */
  const Z = [0, -34, -68, -102, -136, -172], BX = [3.6, 3.8, -3.8, 3.8, 0, 0];
  const groups = Z.map((z, i) => { const g = new T.Group(); g.position.set(BX[i], 0, z); scene.add(g); return g; });
  const [gA, gB, gC, gD, gE, gF] = groups;

  // A : colis, étiquette, pièces, anneaux
  const hero = new T.Group(); gA.add(hero); hero.scale.setScalar(1.35);
  const pBig = box(2.6, 1.7, 2.0, kt, -.2, -.6, 0, .45, C), pMid = box(1.7, 1.2, 1.5, kt, 1.8, -.9, 1.1, -.35, M), pSm = box(1.2, .9, 1.0, kt2, -2.2, -1.1, 1.2, .8, V), pTop = box(1.5, .9, 1.2, kt, 0, .7, .1, -.25, G);
  hero.add(pBig, pMid, pSm, pTop);
  const tag = new T.Group(); const shape = new T.Shape(); shape.moveTo(-.55, -.5); shape.lineTo(.55, -.5); shape.lineTo(.55, .3); shape.lineTo(.28, .62); shape.lineTo(-.28, .62); shape.lineTo(-.55, .3); shape.lineTo(-.55, -.5);
  const hole = new T.Path(); hole.absarc(0, .38, .09, 0, Math.PI * 2, true); shape.holes.push(hole);
  const tmesh = new T.Mesh(new T.ExtrudeGeometry(shape, { depth: .08, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 3 }), new T.MeshStandardMaterial({ color: col(M), emissive: col(M), emissiveIntensity: .9, roughness: .3 })); tag.add(tmesh);
  const price = label('45 €', 1.0, .5, '#ffffff', null, 150); price.position.set(0, -.1, .13); tag.add(price); tag.position.set(2.6, 1.7, .6); tag.rotation.z = -.28; hero.add(tag);
  const coins = []; const cmat = new T.MeshStandardMaterial({ color: col(G), emissive: col(0xff9a1f), emissiveIntensity: .75, metalness: .9, roughness: .3 });
  [[-2.8, 1.8, .4, .9], [-1.3, 2.7, -.4, .7], [3.3, -.1, 1.4, .6], [.8, 3.0, .2, .55]].forEach(([x, y, z, s]) => { const c = new T.Mesh(new T.CylinderGeometry(.5 * s, .5 * s, .09 * s, 40), cmat); c.rotation.x = Math.PI / 2; c.position.set(x, y, z); c.userData = { y, ph: Math.random() * 6 }; hero.add(c); coins.push(c); });
  const ringA = new T.Mesh(new T.TorusGeometry(4.6, .028, 8, 120), nb(M)); ringA.position.set(0, .2, -1.2); ringA.rotation.set(1.2, .2, 0); hero.add(ringA);
  const ringB = new T.Mesh(new T.TorusGeometry(5.4, .02, 8, 120), nb(C)); ringB.position.set(0, .2, -1.2); ringB.rotation.set(1.9, -.3, .5); hero.add(ringB);
  hero.add(glow(V, 12, 0, 0, -2, .55), glow(M, 6, 2, -1.5, 1, .35));
  plight(M, -5, 2, 4, 40, 26); plight(C, 8, 0, 3, 30, 26); plight(V, 0, 6, -4, 30, 26);

  // B : histogramme 3D du chiffre d'affaires
  const chartG = new T.Group(); gB.add(chartG); let bars = [], chartDisposables = [];
  const slab = new T.Mesh(new T.BoxGeometry(11.5, .2, 3.4), new T.MeshStandardMaterial({ color: col(0x10172b), roughness: .4, metalness: .6 })); slab.position.set(0, -2.75, 0); edges(slab, V, .9); gB.add(slab);
  gB.add(glow(V, 14, 0, 0, -3, .4));
  plight(V, -4, 4, 5, 34, 24); plight(C, 5, 2, 6, 24, 22); plight(M, 0, -1, 4, 16, 16);
  function setChart(data) {
    chartDisposables.forEach((o) => o.dispose && o.dispose()); chartDisposables = []; while (chartG.children.length) chartG.remove(chartG.children[0]); bars = [];
    const n = data.length, max = Math.max(1, ...data.map((d) => d.ca)), H = 5.4, gap = 11 / n;
    const pts = [];
    data.forEach((d, i) => { const t = n > 1 ? i / (n - 1) : 0, c = col(V).lerp(col(M), t); const geo = new T.BoxGeometry(gap * .62, 1, gap * .62); const mat = new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: .85, roughness: .3, metalness: .25 }); chartDisposables.push(geo, mat);
      const b = new T.Mesh(geo, mat); b.position.x = (i - (n - 1) / 2) * gap; b.userData = { h: Math.max(.18, d.ca / max * H), i }; b.scale.y = .001; chartG.add(b); bars.push(b);
      pts.push(new T.Vector3(b.position.x, -2.65 + Math.max(0, d.pr) / max * H + .15, .6)); });
    const curve = new T.CatmullRomCurve3(pts), tg = new T.TubeGeometry(curve, 80, .05, 8), tm = nb(C); chartDisposables.push(tg, tm);
    const tube = new T.Mesh(tg, tm); chartG.add(tube);
    pts.forEach((p) => { const s = new T.Mesh(new T.SphereGeometry(.1, 12, 12), nb(0xffffff)); s.position.copy(p); chartG.add(s); chartDisposables.push(s.geometry, s.material); });
    const tot = data.reduce((s, d) => s + d.ca, 0), lab = label(eur(tot) + ' sur 12 mois', 5.4, .9, '#ffffff', 'rgba(124,92,255,.55)', 54); lab.position.set(0, 3.8, 0); chartG.add(lab); chartDisposables.push(lab.geometry, lab.material.map, lab.material);
  }
  setChart(monthlyOrDemo());

  // C : tapis d'expédition, portail, remorque
  const belt = new T.Mesh(new T.BoxGeometry(15, .3, 2.6), new T.MeshStandardMaterial({ color: col(0x121a30), roughness: .35, metalness: .7 })); belt.position.set(1, -2.2, 0); edges(belt, C, .9); gC.add(belt);
  const trailer = new T.Mesh(new T.BoxGeometry(5.2, 3, 3), new T.MeshStandardMaterial({ color: col(0x161f3a), roughness: .3, metalness: .6, transparent: true, opacity: .78 })); trailer.position.set(-8.4, -.5, 0); edges(trailer, O, .95); gC.add(trailer);
  const cab = new T.Mesh(new T.BoxGeometry(1.8, 2.2, 2.7), new T.MeshStandardMaterial({ color: col(0x1d2748), roughness: .3, metalness: .7 })); cab.position.set(-12.1, -.9, 0); edges(cab, O, .95); gC.add(cab);
  const gate = new T.Mesh(new T.TorusGeometry(2, .07, 10, 80), nb(M)); gate.position.set(-3.2, -.2, 0); gate.rotation.y = Math.PI / 2; gC.add(gate);
  const gate2 = new T.Mesh(new T.TorusGeometry(2.5, .03, 8, 80), nb(C)); gate2.position.set(-3.2, -.2, 0); gate2.rotation.y = Math.PI / 2; gC.add(gate2);
  gC.add(glow(M, 7, -3.2, -.2, 0, .6), glow(O, 8, -8, 0, 0, .35));
  const pk = []; const mint = new T.MeshStandardMaterial({ color: col(0x35e0a1), emissive: col(0x35e0a1), emissiveIntensity: .8, roughness: .4 });
  for (let i = 0; i < 8; i++) { const m = box(1.1, .9, 1.0, kt2, 0, -1.55, 0, 0); m.userData = { off: i * 2.0, base: m.material }; gC.add(m); pk.push(m); }
  plight(M, -3, 2, 5, 40, 24); plight(C, 4, 3, 5, 28, 24);

  // D : bulles de messages
  const bubbles = []; const msgs = [['Dernier prix ?', V], ['Colis parti', C], ['Merci !', M], ['Toujours dispo ?', V], ['Avis laissé ★', G], ['Envoi demain', M]];
  msgs.forEach(([t, hex], i) => { const g = new T.Group(); const w = 2.2 + t.length * .17, h = 1.05;
    const body = new T.Mesh(new T.SphereGeometry(.5, 24, 16), new T.MeshStandardMaterial({ color: col(hex), emissive: col(hex), emissiveIntensity: .55, roughness: .25, metalness: .1, transparent: true, opacity: .92 })); body.scale.set(w, h, .55); g.add(body);
    const tail = new T.Mesh(new T.ConeGeometry(.28, .5, 4), body.material); tail.position.set(i % 2 ? w * .3 : -w * .3, -h * .55, 0); tail.rotation.z = i % 2 ? .5 : -.5; g.add(tail);
    const lab = label(t, w * .9, h * .62, '#ffffff', null, 64); lab.position.z = .31; g.add(lab);
    g.position.set((i % 2 ? 1 : -1) * (1 + (i % 3) * .6) + (i % 2 ? 1.6 : -1.2), -2 + i * 1.15, -i * .9); g.userData = { y: g.position.y, ph: i * 1.3 }; gD.add(g); bubbles.push(g); });
  gD.add(glow(M, 13, 0, 1, -3, .35)); plight(M, 3, 3, 5, 36, 24); plight(V, -4, 0, 5, 28, 24);

  // E : portails néon
  const gates = [[-4, M, 3.4], [-13, C, 3.8], [-22, G, 4.2]].map(([dz, hex, r], i) => { const m = new T.Mesh(new T.TorusGeometry(r, .06, 10, 100), nb(hex)); m.position.set(0, .4, dz); gE.add(m); const m2 = new T.Mesh(new T.TorusGeometry(r + .5, .02, 8, 100), nb(hex)); m2.position.set(0, .4, dz); gE.add(m2); gE.add(glow(hex, r * 3, 0, .4, dz, .3)); return [m, m2]; });
  plight(C, 0, 3, -10, 30, 30);

  // F : tourbillon de pièces
  const vortex = new T.Group(); gF.add(vortex); const vc = [];
  for (let i = 0; i < 64; i++) { const c = new T.Mesh(new T.CylinderGeometry(.34, .34, .07, 28), cmat); const a = i * .62, r = 1.6 + i * .085; c.position.set(Math.cos(a) * r, (i - 32) * .06, Math.sin(a) * r - 2); c.rotation.x = Math.PI / 2 + Math.random(); c.userData = { a, r, y: (i - 32) * .06, s: .5 + Math.random() }; vortex.add(c); vc.push(c); }
  gF.add(glow(G, 16, 0, 0, -3, .5), glow(M, 22, 0, 0, -6, .3)); plight(G, 0, 2, 3, 40, 28); plight(M, 5, -1, 2, 24, 24);

  /* post-traitement */
  let composer = null, bloom = null;
  if (hasComp) {
    composer = new T.EffectComposer(renderer); composer.addPass(new T.RenderPass(scene, cam));
    bloom = new T.UnrealBloomPass(new T.Vector2(512, 512), .7, .6, .55); composer.addPass(bloom);
    composer.addPass(new T.ShaderPass(T.GammaCorrectionShader));
  }
  let W = 1, H = 1, aspect = 1;
  function size() { W = innerWidth; H = innerHeight; aspect = W / H; renderer.setPixelRatio(pr); renderer.setSize(W, H, false); if (composer) { composer.setPixelRatio(pr); composer.setSize(W, H); } cam.aspect = aspect; cam.fov = aspect < .8 ? 62 : 50; cam.updateProjectionMatrix(); layout(); }
  function layout() { const mob = aspect < 1.05; groups.forEach((g, i) => { g.position.x = BX[i] * (mob ? .25 : 1); g.position.y = mob ? 2.2 : 0; g.scale.setScalar(mob ? .72 : 1); }); }

  /* scroll -> caméra */
  const ids = ['s-hero', 'f-ca', 'f-cmd', 'f-msg', 'f-how', 's-cta'], camZ = Z.map((z) => z + 14), cents = [];
  function measure() { cents.length = 0; ids.forEach((id) => { const el = document.getElementById(id); if (!el) { cents.push(null); return; } const r = el.getBoundingClientRect(); cents.push(r.top + scrollY + r.height / 2); }); }
  const sm = (x) => x * x * (3 - 2 * x);
  function target() {
    if (cents.some((c) => c === null) || !cents.length) return { z: camZ[0], vis: [1, 0, 0, 0, 0, 0] };
    const vc = scrollY + innerHeight / 2; let i = 0; while (i < cents.length - 1 && vc >= cents[i + 1]) i++;
    if (vc <= cents[0]) return { z: camZ[0], vis: [1, 0, 0, 0, 0, 0] };
    if (i >= cents.length - 1) return { z: camZ[camZ.length - 1], vis: [0, 0, 0, 0, 0, 1] };
    const f = Math.min(1, Math.max(0, (vc - cents[i]) / (cents[i + 1] - cents[i]))), e = sm(f);
    const vis = [0, 0, 0, 0, 0, 0]; vis[i] = 1 - e; vis[i + 1] = e;
    return { z: camZ[i] + (camZ[i + 1] - camZ[i]) * e, vis };
  }
  let cz = camZ[0], mx = 0, my = 0, tm = 0, visS = [1, 0, 0, 0, 0, 0], slow = 0, frames = 0, run = true, last = performance.now();
  addEventListener('pointermove', (e) => { mx = (e.clientX / innerWidth - .5) * 2; my = (e.clientY / innerHeight - .5) * 2; }, { passive: true });
  addEventListener('resize', () => { size(); measure(); });
  document.addEventListener('visibilitychange', () => { run = !document.hidden; });

  function draw(dt) {
    tm += dt; const tg = target(); cz += (tg.z - cz) * Math.min(1, dt * 3.2); if (reduce) cz = tg.z;
    visS = visS.map((v, i) => v + (tg.vis[i] - v) * Math.min(1, dt * 4));
    cam.position.set(mx * .7, 1.5 - my * .4 + Math.sin(tm * .4) * .15, cz); cam.lookAt(mx * .5, .2 - my * .2, cz - 18);
    // A
    hero.rotation.y = Math.sin(tm * .35) * .3 + mx * .15; hero.position.y = Math.sin(tm * .8) * .12;
    pTop.position.y = .7 + Math.sin(tm * 1.2) * .1; tag.rotation.y = Math.sin(tm * .9) * .4; tag.position.y = 1.7 + Math.sin(tm * 1.1) * .15;
    coins.forEach((c) => { c.rotation.z += dt * 1.8; c.position.y = c.userData.y + Math.sin(tm * 1.3 + c.userData.ph) * .18; });
    ringA.rotation.z += dt * .35; ringB.rotation.z -= dt * .28; ringB.rotation.x += dt * .05;
    // B
    const vb = visS[1]; bars.forEach((b) => { const s = sm(Math.min(1, Math.max(0, vb * 1.6 - b.userData.i * .045))); const h = Math.max(.001, b.userData.h * s); b.scale.y = h; b.position.y = -2.65 + h / 2; });
    chartG.rotation.y = Math.sin(tm * .3) * .12 - .25;
    // C
    pk.forEach((m) => { const x = ((tm * 1.7 + m.userData.off) % 16) - 8 + 3; m.position.x = x; m.visible = x > -6.2; const passed = x < -3.2; m.material = passed ? mint : m.userData.base; m.rotation.y = Math.sin(tm + m.userData.off) * .1; });
    gate.rotation.x += dt * .6; gate2.rotation.x -= dt * .4;
    // D
    bubbles.forEach((g) => { g.position.y = g.userData.y + Math.sin(tm * 1.1 + g.userData.ph) * .18; g.rotation.y = Math.sin(tm * .6 + g.userData.ph) * .18; });
    // E
    gates.forEach(([a, b], i) => { a.rotation.z += dt * (.3 + i * .1); b.rotation.z -= dt * .2; });
    // F
    vortex.rotation.y += dt * .25; vc.forEach((c) => { c.rotation.z += dt * c.userData.s * 2; });
    // lumières selon proximité
    lights.forEach((l) => { const near = Math.max(...visS.map((v, i) => Math.abs(l.position.z - Z[i]) < 12 ? v : 0)); l.intensity = l.userData.i * (.25 + .75 * near); });
    groups.forEach((g, i) => { g.visible = visS[i] > .02 || Math.abs(cz - camZ[i]) < 30; });
    dust.rotation.y = tm * .01;
    if (bloom) bloom.strength = .7 + Math.sin(tm * .8) * .06;
    composer ? composer.render() : renderer.render(scene, cam);
  }
  size(); measure(); setTimeout(measure, 400); setTimeout(measure, 1500);
  addEventListener('load', measure);
  if (reduce) { addEventListener('scroll', () => draw(0.016), { passive: true }); draw(0.016); }
  else (function loop(n) {
    requestAnimationFrame(loop); const dt = Math.min(.05, (n - last) / 1000); last = n;
    if (!run || !document.body.classList.contains('landing')) return;
    draw(dt);
    frames++; if (dt > 1 / 28) slow++; if (frames === 90) { if (slow > 45 && pr > 1) { pr = 1; size(); } else if (slow > 70 && bloom) { composer = null; bloom = null; renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; } frames = 0; slow = 0; }
  })(last);
  return { setChart, measure };
};
