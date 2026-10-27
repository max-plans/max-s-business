/* Scène 3D de la page d'accueil : une vitrine de nuit. Sept boîtes Fripe (une par catégorie) sous un anneau de lumière ; au scroll, la boîte choisie passe en grand sur un fond de sa couleur. */
window.FRIPE_PRODUCTS = [
  { name: 'Vêtements', hex: 0xff2e4d, css: '#ff2e4d', stat: 'Marge moyenne 41 %', note: 'vendu en 9 jours' },
  { name: 'Sneakers', hex: 0x22d37f, css: '#22d37f', stat: 'Marge moyenne 47 %', note: 'vendu en 6 jours' },
  { name: 'Sacs', hex: 0xff7a1a, css: '#ff7a1a', stat: 'Marge moyenne 52 %', note: 'vendu en 11 jours' },
  { name: 'Vintage', hex: 0xa98bff, css: '#a98bff', stat: 'Marge moyenne 63 %', note: 'vendu en 14 jours' },
  { name: 'Tech', hex: 0x2fb6ff, css: '#2fb6ff', stat: 'Marge moyenne 38 %', note: 'vendu en 5 jours' },
  { name: 'Luxe', hex: 0xf2c14e, css: '#f2c14e', stat: 'Marge moyenne 55 %', note: 'vendu en 21 jours' },
  { name: 'Maison', hex: 0xff5fa8, css: '#ff5fa8', stat: 'Marge moyenne 49 %', note: 'vendu en 12 jours' }
];

/* Une boîte Fripe : boîte de revendeur façon boîte à sneakers. Couvercle couleur de la catégorie, étiquette sur le côté, papier de soie et lueur à l'intérieur quand le couvercle se lève. Réutilisée par la mini boîte du tableau de bord. */
window.FripeBox = function (T, p, n) {
  const F = '400 {s}px Anton, Impact, "Arial Narrow", sans-serif', M = '500 {s}px "IBM Plex Mono", monospace';
  const font = (f, s) => f.replace('{s}', s), num = 'N°' + String(n + 1).padStart(2, '0'), name = p.name.toUpperCase();
  const canvases = [];
  const sheet = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8;
    canvases.push(() => { g.clearRect(0, 0, w, h); draw(g, w, h); t.needsUpdate = true; }); return t;
  };
  const grain = (g, w, h, a) => { for (let i = 0; i < w * h / 180; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * a})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 1 + Math.random() * 2); } };
  const barcode = (g, x, y, w, h) => { let cx = x; let k = 7 + n * 13; while (cx < x + w) { k = (k * 1103515245 + 12345) & 0x7fffffff; const bw = 1 + (k % 4); g.fillRect(cx, y, bw, h); cx += bw + 1 + ((k >> 3) % 3); } };
  /* grand côté : nom de la catégorie, bande de couleur, étiquette blanche */
  const side = sheet(1024, 420, (g, w, h) => {
    g.fillStyle = '#121216'; g.fillRect(0, 0, w, h); grain(g, w, h, .05);
    g.fillStyle = p.css; g.fillRect(0, h - 26, w, 26); g.fillRect(0, 0, 14, h);
    g.fillStyle = 'rgba(243,240,234,.55)'; g.font = font(M, 22); g.textBaseline = 'top'; g.fillText(num + ' — ÉDITION REVENDEUR', 48, 34);
    let fs = 168; g.font = font(F, fs); while (g.measureText(name).width > 610 && fs > 60) { fs -= 4; g.font = font(F, fs); }
    g.fillStyle = '#f3f0ea'; g.textBaseline = 'alphabetic'; g.fillText(name, 44, 268);
    g.fillStyle = p.css; g.font = font(M, 24); g.fillText(p.stat.toUpperCase(), 50, 330);
    g.fillStyle = '#f3f0ea'; g.fillRect(690, 60, 290, 270);
    g.fillStyle = '#0c0c0f'; g.font = font(F, 52); g.fillText('FRIPE®', 712, 124);
    g.font = font(M, 19); g.fillText('CATÉGORIE ' + name, 714, 162); g.fillText('PRIX D’ACHAT DÉDUIT', 714, 190); g.fillText('BÉNÉFICE NET', 714, 218);
    barcode(g, 714, 240, 240, 54); g.font = font(M, 15); g.fillText('3 760 ' + String(4102 + n * 77) + ' 0' + n + '9', 714, 318);
  });
  /* petit côté : logo vertical */
  const end = sheet(512, 420, (g, w, h) => {
    g.fillStyle = '#121216'; g.fillRect(0, 0, w, h); grain(g, w, h, .05);
    g.fillStyle = p.css; g.fillRect(0, h - 26, w, 26); g.fillRect(w / 2 - 70, 0, 140, h - 26);
    g.save(); g.translate(w / 2, (h - 26) / 2); g.rotate(-Math.PI / 2); g.fillStyle = '#0c0c0f'; g.font = font(F, 110); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('FRIPE', 0, 6); g.restore();
    g.fillStyle = 'rgba(243,240,234,.6)'; g.font = font(M, 20); g.fillText(num, 30, 50); g.fillText('T. U', w - 92, 50);
  });
  /* dessus du couvercle */
  const lidTop = sheet(1024, 640, (g, w, h) => {
    g.fillStyle = p.css; g.fillRect(0, 0, w, h);
    const sh = g.createLinearGradient(0, 0, w, h); sh.addColorStop(0, 'rgba(255,255,255,.18)'); sh.addColorStop(.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.18)'); g.fillStyle = sh; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(12,12,15,.85)'; g.lineWidth = 6; g.strokeRect(34, 34, w - 68, h - 68);
    g.save(); g.translate(w / 2, h / 2 + 10); g.transform(1, 0, -.18, 1, 0, 0); g.fillStyle = '#0c0c0f'; g.font = font(F, 300); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('FRIPE', 0, 0); g.restore();
    g.fillStyle = '#0c0c0f'; g.font = font(M, 24); g.fillText(num + ' · ' + name, 66, 88); g.textAlign = 'right'; g.fillText('SECONDE MAIN', w - 66, 88); g.fillText('REVENTE · PARIS', w - 66, h - 66); g.textAlign = 'left';
  });
  /* bord du couvercle */
  const lidSide = sheet(1024, 128, (g, w, h) => {
    g.fillStyle = p.css; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, h - 10, w, 10);
    g.fillStyle = '#0c0c0f'; g.font = font(M, 28); g.textBaseline = 'middle'; for (let x = 30; x < w; x += 360) g.fillText('FRIPE® — ' + name, x, h / 2);
  });
  /* intérieur : papier de soie froissé et lueur de la catégorie */
  const inside = sheet(1024, 640, (g, w, h) => {
    g.fillStyle = '#0c0c0f'; g.fillRect(0, 0, w, h);
    const gl = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * .55); gl.addColorStop(0, p.css); gl.addColorStop(.6, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.fillRect(0, 0, w, h);
    g.globalAlpha = .9; for (let i = 0; i < 46; i++) { const x = 40 + Math.random() * (w - 80), y = 40 + Math.random() * (h - 80), r = 60 + Math.random() * 140; const t = g.createRadialGradient(x, y, 0, x, y, r); t.addColorStop(0, 'rgba(255,255,255,.22)'); t.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = t; g.beginPath(); g.moveTo(x, y - r); for (let k = 1; k < 7; k++) { const a = k / 7 * Math.PI * 2, rr = r * (.6 + Math.random() * .5); g.lineTo(x + Math.sin(a) * rr, y - Math.cos(a) * rr); } g.closePath(); g.fill(); }
    g.globalAlpha = 1; g.strokeStyle = '#1a1a20'; g.lineWidth = 34; g.strokeRect(0, 0, w, h);
  });
  const paintAll = () => canvases.forEach((f) => f());
  paintAll(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(paintAll);

  const std = (map, extra) => new T.MeshStandardMaterial(Object.assign({ map, roughness: .62, metalness: .05, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: .2 }, extra || {}));
  const dark = new T.MeshStandardMaterial({ color: 0x0e0e12, roughness: .8 });
  const mSide = std(side), mEnd = std(end), mLidTop = std(lidTop, { roughness: .45 }), mLidSide = std(lidSide, { roughness: .45 }), mIn = std(inside, { roughness: .9 });
  const W = 1.75, D = 1.1, BH = .7, LH = .24;
  const baseGeo = new T.BoxGeometry(W, BH, D), lidGeo = new T.BoxGeometry(W * 1.035, LH, D * 1.05);
  /* ordre des faces : +x, -x, +y, -y, +z, -z */
  const base = new T.Mesh(baseGeo, [mEnd, mEnd, mIn, dark, mSide, mSide]); base.position.y = -.12;
  const lid = new T.Group(); const lidMesh = new T.Mesh(lidGeo, [mLidSide, mLidSide, mLidTop, dark, mLidSide, mLidSide]); lid.add(lidMesh);
  const lidRest = -.12 + BH / 2 + LH / 2 - .14; lid.position.y = lidRest;
  const edges = new T.LineSegments(new T.EdgesGeometry(lidGeo), new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .25 })); lidMesh.add(edges);
  const glowC = document.createElement('canvas'); glowC.width = glowC.height = 64; const gg = glowC.getContext('2d'); const gr = gg.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64);
  const glowTex = new T.CanvasTexture(glowC);
  const leak = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: new T.Color(p.hex).convertSRGBToLinear(), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending })); leak.scale.set(2.6, 1.1, 1); leak.position.y = .3;
  const root = new T.Group(); root.add(base, lid, leak);
  const mats = [mSide, mEnd, mLidTop, mLidSide, mIn];
  root.userData = {
    glow(v) { mats.forEach((m) => { m.emissiveIntensity = v; }); },
    open(v) { lid.position.y = lidRest + v * .62; lid.position.z = -v * .32; lid.rotation.x = -v * .42; leak.material.opacity = v * .9; leak.position.y = .25 + v * .15; },
    dispose() { [baseGeo, lidGeo, edges.geometry].forEach((x) => x.dispose()); mats.concat([dark, edges.material, leak.material]).forEach((m) => m.dispose()); [side, end, lidTop, lidSide, inside, glowTex].forEach((t) => t.dispose()); }
  };
  return root;
};

/* Post-traitement commun : rendu multi-échantillonné (bords nets), bloom léger, passe glitch pour les transitions, correction gamma. */
window.FripePost = function (T, renderer, scene, cam) {
  if (!window.FripePost.ok(T)) return null;
  let rt;
  if (renderer.capabilities.isWebGL2 && T.WebGLMultisampleRenderTarget) { rt = new T.WebGLMultisampleRenderTarget(2, 2, { format: T.RGBAFormat }); rt.samples = 4; }
  const composer = new T.EffectComposer(renderer, rt); composer.setPixelRatio(renderer.getPixelRatio());
  composer.addPass(new T.RenderPass(scene, cam));
  const bloom = new T.UnrealBloomPass(new T.Vector2(256, 256), .42, .28, .86); composer.addPass(bloom);
  const glitch = new T.ShaderPass({ uniforms: { tDiffuse: { value: null }, amt: { value: 0 }, time: { value: 0 }, res: { value: new T.Vector2(1, 1) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: [
      'uniform sampler2D tDiffuse; uniform float amt; uniform float time; uniform vec2 res; varying vec2 vUv;',
      'float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',
      'void main(){ vec2 uv = vUv; float a = amt;',
      ' float sl = floor(uv.y * 26.0 + time * 6.0); float j = (rnd(vec2(sl, floor(time * 24.0))) - .5) * step(.55, rnd(vec2(sl * 1.7, floor(time * 30.0))));',
      ' uv.x += j * a * .14;',
      ' float px = mix(1.0, 56.0, a * a); vec2 cell = px / res; if (px > 1.5) uv = (floor(uv / cell) + .5) * cell;',
      ' float o = a * .02; vec4 c = vec4(texture2D(tDiffuse, uv + vec2(o, 0.0)).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - vec2(o, 0.0)).b, 1.0);',
      ' vec2 q = vUv - .5; c.rgb *= 1.0 - dot(q, q) * .5;',
      ' gl_FragColor = c; }'].join('\n') });
  composer.addPass(glitch); composer.addPass(new T.ShaderPass(T.GammaCorrectionShader));
  return { composer, bloom, glitch };
};
window.FripePost.ok = (T) => !!(T.EffectComposer && T.UnrealBloomPass && T.RenderPass && T.ShaderPass && T.GammaCorrectionShader);

window.FripeScene = function ({ $, reduce }) {
  const cv = $('#bg3d'), T = window.THREE, P = window.FRIPE_PRODUCTS;
  if (!T) { document.body.classList.add('no3d'); return null; }
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' }); } catch (e) { document.body.classList.add('no3d'); return null; }
  const col = (h) => new T.Color(h).convertSRGBToLinear();
  const mobile = () => innerWidth < 900;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  if (!window.FripePost.ok(T)) { renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; }

  const BG = col(0x060607), scene = new T.Scene(); scene.background = BG.clone(); scene.fog = new T.Fog(BG.clone(), 10, 32);
  const cam = new T.PerspectiveCamera(36, 1, .1, 100);

  /* lumières */
  scene.add(new T.HemisphereLight(0xb8b8c8, 0x0a0a10, .35));
  const spot = new T.SpotLight(0xffffff, 2.4, 14, .48, .55, 1.2); spot.position.set(0, 3.4, .4); scene.add(spot, spot.target);
  const fill = new T.DirectionalLight(0xffffff, .35); fill.position.set(2, 1.5, 6); scene.add(fill);
  const rimA = new T.PointLight(0xffffff, 1.2, 14); rimA.position.set(-4, 1.5, -3); scene.add(rimA);
  const rimB = new T.PointLight(0xffffff, 1.2, 14); rimB.position.set(4, 1.5, -3); scene.add(rimB);

  /* sol miroir sombre */
  const floor = new T.Mesh(new T.PlaneGeometry(80, 80), new T.MeshStandardMaterial({ color: col(0x0b0b0e), roughness: .42, metalness: .6, transparent: true })); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.18; scene.add(floor);
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })();
  const pool = new T.Mesh(new T.PlaneGeometry(4.4, 4.4), new T.MeshBasicMaterial({ map: glowTex, color: col(0xff2e4d), transparent: true, opacity: .55, depthWrite: false, blending: T.AdditiveBlending })); pool.rotation.x = -Math.PI / 2; pool.position.y = -1.16; scene.add(pool);

  /* anneau de lumière */
  const halo = new T.Group(); halo.position.y = 2.4; scene.add(halo);
  const disc = new T.Mesh(new T.CylinderGeometry(1.32, 1.32, .1, 72), new T.MeshStandardMaterial({ color: col(0x1a1a20), metalness: .9, roughness: .35 })); halo.add(disc);
  const ringMat = new T.MeshBasicMaterial({ color: col(0xffffff), transparent: true });
  const ring = new T.Mesh(new T.TorusGeometry(1.22, .045, 16, 140), ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = -.07; halo.add(ring);
  const ring2 = new T.Mesh(new T.TorusGeometry(.9, .02, 12, 120), ringMat); ring2.rotation.x = Math.PI / 2; ring2.position.y = -.07; halo.add(ring2);
  const coneMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, uniforms: { op: { value: .085 } },
    vertexShader: 'varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float op; varying float vY; void main(){ gl_FragColor = vec4(1.0, 1.0, 1.0, op * pow(vY, 1.6)); }' });
  const cone = new T.Mesh(new T.CylinderGeometry(1.15, 2.1, 3.5, 72, 1, true), coneMat); cone.position.y = -1.8; halo.add(cone);
  const haloGlow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: col(0xffffff), transparent: true, opacity: .35, depthWrite: false, blending: T.AdditiveBlending })); haloGlow.scale.set(5, 1.6, 1); haloGlow.position.y = -.1; halo.add(haloGlow);

  /* les boîtes */
  const cans = P.map((p, i) => { const g = new T.Group(); const m = window.FripeBox(T, p, i); g.add(m); g.userData = { m, open: 0 }; scene.add(g); return g; });
  const backGlow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: col(0xff2e4d), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending })); backGlow.scale.set(9, 9, 1); backGlow.position.z = -2.5; scene.add(backGlow);

  /* rendu : bloom puis passe glitch, avec anticrénelage */
  const post = window.FripePost(T, renderer, scene, cam);
  const composer = post && post.composer, bloom = post && post.bloom, glitch = post && post.glitch;

  /* état : une cible, et des valeurs courantes qui la rejoignent en douceur */
  const tgt = { mode: 'line', idx: 0, side: 1 }, cur = { pos: 0, focus: 0, side: 1, dim: 0, bg: BG.clone() };
  let sel = 0, glitchAmt = 0, listeners = [];
  const pulse = (v) => { glitchAmt = Math.max(glitchAmt, v == null ? 1 : v); };
  const select = (i, silent) => { const n = P.length; i = ((i % n) + n) % n; if (i === sel && !silent) return; sel = i; tgt.idx = i; if (!silent) pulse(.85); listeners.forEach((f) => f(i, P[i])); };
  const go = (st) => { const ch = st.mode !== tgt.mode || (st.idx != null && st.idx !== sel); Object.assign(tgt, st); if (st.idx != null && st.idx !== sel) select(st.idx); else if (ch) pulse(.7); };

  let mx = 0, my = 0; addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
  const size = () => { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < 900 ? 46 : 36; cam.updateProjectionMatrix(); if (composer) { composer.setSize(w, h); bloom.setSize(w, h); glitch.uniforms.res.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio()); } };
  addEventListener('resize', size);

  const tmpC = new T.Color(), blk = new T.Color(0, 0, 0);
  let last = performance.now(), t = 0;
  const frame = (now) => {
    requestAnimationFrame(frame);
    if (!document.body.classList.contains('landing')) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
    const k = 1 - Math.pow(.0025, dt), m = mobile();
    cur.pos += (sel - cur.pos) * k * 1.3;
    cur.focus += ((tgt.mode === 'focus' ? 1 : 0) - cur.focus) * k;
    cur.dim += ((tgt.mode === 'dim' ? 1 : 0) - cur.dim) * k;
    cur.side += ((tgt.side || 1) - cur.side) * k;
    const f = cur.focus, pc = P[sel];

    /* fond : noir en vitrine, couleur de la boîte en gros plan */
    tmpC.set(pc.hex).convertSRGBToLinear().lerp(blk, .5);
    cur.bg.lerp(tmpC.clone().lerp(BG, 1 - f), k); scene.background.copy(cur.bg); scene.fog.color.copy(cur.bg);
    scene.fog.near = 10 - f * 3; scene.fog.far = 32 - f * 14;

    cans.forEach((g, i) => {
      let o = i - cur.pos; const n = P.length; if (o > n / 2) o -= n; if (o < -n / 2) o += n;
      const a = o * (m ? .46 : .4), R = m ? 5.2 : 7.4;
      let x = Math.sin(a) * R, z = (Math.cos(a) - 1) * R, y = 0, s = m ? .82 : .9, rz = -o * .06, ry = o * .35;
      const isSel = i === sel, near = Math.max(0, 1 - Math.abs(o));
      y += near * (.32 + Math.sin(t * 1.6) * .06); ry += near * t * .6;
      if (isSel) {
        const fx = m ? 0 : cur.side * 1.75, fy = m ? .85 : .15, fz = m ? .2 : 1.4;
        x += (fx - x) * f; y += (fy - y) * f; z += (fz - z) * f; s = s + f * (m ? .2 : .42); rz = rz * (1 - f) - cur.side * .22 * f; ry = ry * (1 - f) + f * (Math.sin(t * .7) * .55 - cur.side * .25);
      } else { y -= f * 4; }
      y -= cur.dim * .2;
      g.position.set(x, y, z); g.rotation.set(Math.sin(t * .8 + i) * .03, ry, rz); g.scale.setScalar(s);
      const vis = Math.abs(o) < 3.2; g.visible = vis;
      g.userData.m.userData.glow(.14 + near * .26 + (isSel ? f * .16 : 0) - cur.dim * .08);
      const op = isSel ? Math.max(near * .55, f) * (1 - cur.dim) : 0; g.userData.open += (op - g.userData.open) * k; g.userData.m.userData.open(g.userData.open);
    });

    halo.position.y = 2.4 + f * 3; ringMat.opacity = 1 - f; coneMat.uniforms.op.value = .085 * (1 - f) * (1 - cur.dim * .5); haloGlow.material.opacity = .35 * (1 - f);
    spot.intensity = 2.4 * (1 - f * .3); spot.target.position.set(cans[sel].position.x, 0, cans[sel].position.z);
    pool.material.color.set(pc.hex).convertSRGBToLinear(); pool.material.opacity = (.5 + Math.sin(t * 2) * .06) * (1 - f) * (1 - cur.dim * .6);
    floor.material.opacity = 1 - f;
    backGlow.material.color.set(pc.hex).convertSRGBToLinear(); backGlow.material.opacity = f * .5; backGlow.position.x = cans[sel].position.x; backGlow.position.y = cans[sel].position.y;
    rimA.color.set(pc.hex); rimB.color.set(pc.hex); rimA.intensity = rimB.intensity = 1 + f * 1.5;

    const cz = (m ? 9.6 : 7.6) + cur.dim * 2.5, cy = (m ? .9 : .75) + cur.dim * .6;
    cam.position.set(mx * .5, cy - my * .25, cz); cam.lookAt(0, m ? -.35 : .45, 0);

    glitchAmt *= Math.pow(.02, dt);
    if (composer) { glitch.uniforms.amt.value = reduce ? 0 : glitchAmt; glitch.uniforms.time.value = t; composer.render(dt); } else renderer.render(scene, cam);
  };
  size(); select(0, true); requestAnimationFrame(frame);

  /* glisser sur la vitrine pour changer de boîte */
  const bindSwipe = (el) => { let sx = null; el.addEventListener('pointerdown', (e) => { if (e.target.closest('a,button')) return; sx = e.clientX; }); addEventListener('pointerup', (e) => { if (sx == null) return; const d = e.clientX - sx; sx = null; if (Math.abs(d) > 40) select(sel + (d < 0 ? 1 : -1)); }); };

  return {
    products: P, go, select, pulse, bindSwipe,
    next: () => select(sel + 1), prev: () => select(sel - 1), get sel() { return sel; },
    onSelect: (fn) => { listeners.push(fn); fn(sel, P[sel]); },
    setChart() {}, measure() {}
  };
};

/* Vitrine de l'espace perso : une boîte par catégorie de ton stock, sous l'anneau de lumière, avec tes vrais chiffres.
   Créée une seule fois, puis déplacée d'un rendu à l'autre pour garder le même contexte WebGL. */
window.FripeStage = function ({ reduce }) {
  const T = window.THREE; if (!T || !window.FripeBox || !window.FripePost) return null;
  const el = document.createElement('section'); el.className = 'stage'; el.setAttribute('aria-label', 'Ta vitrine');
  el.innerHTML = `<canvas class="stage-cv" aria-hidden="true"></canvas><div class="stage-ui">
    <div class="stage-top mono"><span><i class="stage-dot"></i>Ta vitrine</span><span data-st="num"></span></div>
    <div class="stage-info"><div class="stage-k mono" data-st="kick"></div><h2 class="stage-name" data-st="name"></h2><div class="stage-stats" data-st="stats"></div>
      <div class="stage-act"><button class="btn sm primary" type="button" data-st="go">Voir ces articles</button><span class="stage-nav"><button type="button" class="stage-arr" data-st="prev" aria-label="Catégorie précédente">←</button><button type="button" class="stage-arr" data-st="next" aria-label="Catégorie suivante">→</button></span></div></div>
    <div class="stage-bar"><i data-st="bar"></i></div></div>`;
  /* styles de la vitrine (toujours en mode nuit, quel que soit le thème) */
  if (!document.getElementById('stage-css')) { const st = document.createElement('style'); st.id = 'stage-css'; st.textContent = `.stage { --sc: #ff2e4d; position: relative; height: clamp(400px, 38vw, 500px); margin: 0 0 18px; border-radius: 10px; overflow: hidden; background: #070709; color: #f3f0ea; border: 1px solid rgba(255,255,255,.08); isolation: isolate; touch-action: pan-y; user-select: none; }
.stage-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.stage-ui { position: absolute; inset: 0; pointer-events: none; display: grid; grid-template-rows: auto 1fr auto; padding: 18px 22px 0; background: linear-gradient(90deg, rgba(7,7,9,.86) 0%, rgba(7,7,9,.5) 34%, rgba(7,7,9,0) 58%); }
.stage-ui > * { pointer-events: auto; }
.stage-top { display: flex; justify-content: space-between; font-size: 10.5px; letter-spacing: .16em; text-transform: uppercase; color: rgba(243,240,234,.62); }
.stage-top span:first-child { display: inline-flex; align-items: center; gap: 9px; }
.stage-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--sc); box-shadow: 0 0 12px var(--sc); animation: stagePulse 1.8s ease-in-out infinite; transition: background .4s; }
@keyframes stagePulse { 50% { opacity: .35; } }
.stage-info { align-self: center; max-width: 430px; display: grid; gap: 14px; }
.stage-k { font-size: 10.5px; letter-spacing: .16em; text-transform: uppercase; color: var(--sc); transition: color .4s; }
.stage-name { font: 400 clamp(46px, 6.4vw, 92px)/.9 var(--f-cond); letter-spacing: .005em; text-transform: uppercase; margin: 0; color: #f3f0ea; text-shadow: 0 0 40px color-mix(in srgb, var(--sc) 45%, transparent); }
.stage-stats { display: grid; grid-template-columns: repeat(4, auto); gap: 6px 22px; justify-content: start; }
.stage-stats div { display: grid; gap: 3px; }
.stage-stats b { font: 400 24px/1 var(--f-cond); letter-spacing: .02em; color: #f3f0ea; }
.stage-stats b.up { color: #22d37f; } .stage-stats b.down { color: #ff5a6e; }
.stage-stats span { font: 500 9.5px var(--f-mono); letter-spacing: .12em; text-transform: uppercase; color: rgba(243,240,234,.55); }
.stage-act { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
body.in-app .stage .btn.primary { background: var(--sc); border-color: var(--sc); color: #0b0b0e; transition: background .4s, border-color .4s; }
.stage-nav { display: inline-flex; gap: 6px; }
.stage-arr { width: 36px; height: 36px; border-radius: 7px; border: 1px solid rgba(255,255,255,.18); background: rgba(7,7,9,.5); color: #f3f0ea; font: 500 15px var(--f-mono); cursor: pointer; transition: border-color .2s, background .2s; }
.stage-arr:hover { border-color: var(--sc); background: rgba(255,255,255,.06); }
.stage-bar { height: 2px; margin: 0 -22px; background: rgba(255,255,255,.08); }
.stage-bar i { display: block; height: 100%; background: var(--sc); transform-origin: left; transform: scaleX(0); }
@media (max-width: 900px) {
  .stage { height: 580px; margin: 0 -4px 18px; }
  .stage-ui { padding: 14px 16px 0; background: linear-gradient(0deg, rgba(7,7,9,.94) 0%, rgba(7,7,9,.72) 30%, rgba(7,7,9,0) 52%); }
  .stage-info { align-self: end; padding-bottom: 18px; gap: 11px; max-width: none; }
  .stage-name { font-size: clamp(44px, 13vw, 64px); }
  .stage-stats { grid-template-columns: repeat(2, auto); gap: 10px 26px; }
  .stage-bar { margin: 0 -16px; }
}`; document.head.appendChild(st); }
  const q = (k) => el.querySelector(`[data-st="${k}"]`), cv = el.querySelector('canvas');
  let renderer; try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  if (!window.FripePost.ok(T)) { renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; }
  const col = (h) => new T.Color(h).convertSRGBToLinear();
  const BG = col(0x070709), scene = new T.Scene(); scene.background = BG.clone(); scene.fog = new T.Fog(BG.clone(), 9, 26);
  const cam = new T.PerspectiveCamera(34, 2, .1, 60), FLOOR = -1.18;

  scene.add(new T.HemisphereLight(0xb8b8c8, 0x0a0a10, .35));
  const spot = new T.SpotLight(0xffffff, 2.5, 14, .5, .55, 1.2); spot.position.set(0, 3.4, .4); scene.add(spot, spot.target);
  const fill = new T.DirectionalLight(0xffffff, .35); fill.position.set(2, 1.5, 6); scene.add(fill);
  const rimA = new T.PointLight(0xffffff, 1.4, 14); rimA.position.set(-4, 1.5, -3); scene.add(rimA);
  const rimB = new T.PointLight(0xffffff, 1.4, 14); rimB.position.set(4, 1.5, -3); scene.add(rimB);

  /* sol : légèrement transparent pour laisser voir le reflet des boîtes */
  const floor = new T.Mesh(new T.PlaneGeometry(80, 80), new T.MeshStandardMaterial({ color: col(0x0b0b0e), roughness: .38, metalness: .55, transparent: true, opacity: .84 })); floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR; scene.add(floor);
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })();
  const pool = new T.Mesh(new T.PlaneGeometry(4.4, 4.4), new T.MeshBasicMaterial({ map: glowTex, color: col(0xff2e4d), transparent: true, opacity: .5, depthWrite: false, blending: T.AdditiveBlending })); pool.rotation.x = -Math.PI / 2; pool.position.y = FLOOR + .02; scene.add(pool);

  /* anneau de lumière, cône et poussière qui flotte dans le faisceau */
  const halo = new T.Group(); halo.position.y = 2.35; scene.add(halo);
  halo.add(new T.Mesh(new T.CylinderGeometry(1.32, 1.32, .1, 72), new T.MeshStandardMaterial({ color: col(0x1a1a20), metalness: .9, roughness: .35 })));
  const ringMat = new T.MeshBasicMaterial({ color: col(0xffffff) });
  const ring = new T.Mesh(new T.TorusGeometry(1.22, .045, 16, 140), ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = -.07; halo.add(ring);
  const ring2 = new T.Mesh(new T.TorusGeometry(.9, .02, 12, 120), ringMat); ring2.rotation.x = Math.PI / 2; ring2.position.y = -.07; halo.add(ring2);
  const coneMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, uniforms: { op: { value: .09 } },
    vertexShader: 'varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float op; varying float vY; void main(){ gl_FragColor = vec4(1.0, 1.0, 1.0, op * pow(vY, 1.6)); }' });
  const cone = new T.Mesh(new T.CylinderGeometry(1.15, 2.1, 3.5, 72, 1, true), coneMat); cone.position.y = -1.8; halo.add(cone);
  const haloGlow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: col(0xffffff), transparent: true, opacity: .35, depthWrite: false, blending: T.AdditiveBlending })); haloGlow.scale.set(5, 1.6, 1); haloGlow.position.y = -.1; halo.add(haloGlow);
  const DN = 150, dpos = new Float32Array(DN * 3), dsp = [];
  for (let i = 0; i < DN; i++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 1.8; dpos[i * 3] = Math.cos(a) * r; dpos[i * 3 + 1] = -3.5 + Math.random() * 3.4; dpos[i * 3 + 2] = Math.sin(a) * r; dsp.push(.08 + Math.random() * .16); }
  const dgeo = new T.BufferGeometry(); dgeo.setAttribute('position', new T.BufferAttribute(dpos, 3));
  const dust = new T.Points(dgeo, new T.PointsMaterial({ map: glowTex, size: .07, color: col(0xffffff), transparent: true, opacity: .55, depthWrite: false, blending: T.AdditiveBlending })); halo.add(dust);

  /* les boîtes et leur reflet (même boîte, retournée sous le sol) */
  const world = new T.Group(), mirror = new T.Group(); mirror.position.y = 2 * FLOOR; mirror.scale.y = -1; scene.add(world, mirror);
  let boxes = [], data = [], sel = 0, pos = 0, glitchAmt = 0, intro = 0, onGo = null, onSel = null;
  const build = (d, i) => {
    const m = window.FripeBox(T, { name: d.name, hex: d.hex, css: d.css, stat: d.label }, i), g = new T.Group(); g.add(m); world.add(g);
    const rm = m.clone(), rg = new T.Group(); rg.add(rm); mirror.add(rg);
    return { g, m, rg, rm, open: 0, sig: d.name + '|' + d.label + '|' + d.css };
  };
  const drop = (b) => { world.remove(b.g); mirror.remove(b.rg); b.m.userData.dispose(); };
  const pulse = (v) => { glitchAmt = Math.max(glitchAmt, v); };

  let auto = 0, idle = 0;
  const paint = () => {
    const d = data[sel]; if (!d) return;
    el.style.setProperty('--sc', d.css);
    q('num').textContent = `${String(sel + 1).padStart(2, '0')} / ${String(data.length).padStart(2, '0')}`;
    q('kick').textContent = d.kick; q('stats').innerHTML = d.stats;
    if (window.FripeFX) window.FripeFX.scramble(q('name'), d.name.toUpperCase(), 520); else q('name').textContent = d.name.toUpperCase();
    if (window.gsap && !reduce) gsap.fromTo(q('stats').children, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: .45, stagger: .05, ease: 'power2.out', clearProps: 'transform,opacity' });
    if (onSel) onSel(sel, d);
  };
  const select = (i, user) => { const n = data.length; if (!n) return; i = ((i % n) + n) % n; if (user) idle = 10; auto = 0; if (i === sel) return; sel = i; pulse(.8); paint(); };

  q('prev').onclick = () => select(sel - 1, true); q('next').onclick = () => select(sel + 1, true);
  q('go').onclick = () => { if (onGo && data[sel]) onGo(data[sel]); };
  let sx = null, mx = 0, my = 0;
  el.addEventListener('pointerdown', (e) => { if (e.target.closest('a,button')) return; sx = e.clientX; });
  addEventListener('pointerup', (e) => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) select(sel + (dx < 0 ? 1 : -1), true); });
  el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - .5; my = (e.clientY - r.top) / r.height - .5; });
  el.addEventListener('pointerleave', () => { mx = my = 0; });
  el.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') select(sel + 1, true); else if (e.key === 'ArrowLeft') select(sel - 1, true); });

  let W = 1, H = 1;
  const size = () => { W = Math.max(1, el.clientWidth); H = Math.max(1, el.clientHeight); renderer.setSize(W, H, false); cam.aspect = W / H; cam.fov = W / H > 1.25 ? 34 : 40; cam.updateProjectionMatrix(); if (post) { post.composer.setSize(W, H); post.bloom.setSize(W, H); post.glitch.uniforms.res.value.set(W * renderer.getPixelRatio(), H * renderer.getPixelRatio()); } };
  const post = window.FripePost(T, renderer, scene, cam);
  if (window.ResizeObserver) new ResizeObserver(size).observe(el); else addEventListener('resize', size);

  const tmpC = new T.Color(); let last = performance.now(), t = 0;
  const frame = (now) => {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (document.hidden || !el.isConnected || !boxes.length) return;
    const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight || !r.width) return;
    t += dt; intro = Math.min(1, intro + dt / 1.6);
    const k = 1 - Math.pow(.0025, dt), n = boxes.length, wide = W / H > 1.25, cx = wide ? 1.9 : 0;
    if (!reduce && n > 1) { if (idle > 0) idle -= dt; else { auto += dt; if (auto > 6.5) select(sel + 1); } }
    q('bar').style.transform = `scaleX(${reduce || n < 2 ? 0 : Math.min(1, auto / 6.5)})`;
    let d = sel - pos; if (n > 4) { if (d > n / 2) d -= n; if (d < -n / 2) d += n; }
    pos += d * k * 1.3; if (n > 4) pos = ((pos % n) + n) % n;
    const sp = Math.max(-1, Math.min(1, (r.top + r.height / 2) / innerHeight - .5));
    const pc = data[sel];
    boxes.forEach((b, i) => {
      let o = i - pos; if (n > 4) { if (o > n / 2) o -= n; if (o < -n / 2) o += n; }
      const a = o * .42, R = 6.6, near = Math.max(0, 1 - Math.abs(o));
      const rise = reduce ? 1 : Math.max(0, Math.min(1, (intro - .08 - Math.abs(o) * .12) / .7)), e = 1 - Math.pow(1 - rise, 3);
      const x = cx + Math.sin(a) * R, z = (Math.cos(a) - 1) * R;
      const y = near * (.34 + Math.sin(t * 1.6) * .06) - (1 - e) * 3.2;
      b.g.position.set(x, y, z); b.g.scale.setScalar(.9 + near * .08);
      b.g.rotation.set(Math.sin(t * .8 + i) * .03, o * .38 + near * (-.42 + Math.sin(t * .55) * .42) + sp * .5, -o * .06);
      b.g.visible = b.rg.visible = Math.abs(o) < 3.2 && rise > 0;
      b.m.userData.glow(.14 + near * .28);
      b.open += ((i === sel ? .55 * e : 0) - b.open) * k; b.m.userData.open(b.open);
      b.rg.position.copy(b.g.position); b.rg.rotation.copy(b.g.rotation); b.rg.scale.copy(b.g.scale);
      [1, 2].forEach((c) => { b.rm.children[c].position.copy(b.m.children[c].position); b.rm.children[c].rotation.copy(b.m.children[c].rotation); });
    });
    const sb = boxes[sel].g.position;
    halo.position.x += (sb.x - halo.position.x) * k; halo.position.z += (sb.z - halo.position.z) * k;
    dust.rotation.y += dt * .05;
    for (let i = 0; i < DN; i++) { let y = dpos[i * 3 + 1] + dsp[i] * dt; if (y > -.1) y = -3.5; dpos[i * 3 + 1] = y; } dgeo.attributes.position.needsUpdate = true;
    spot.position.x = halo.position.x; spot.target.position.set(sb.x, 0, sb.z);
    tmpC.set(pc.hex).convertSRGBToLinear();
    pool.material.color.lerp(tmpC, k); pool.position.x = halo.position.x; pool.position.z = halo.position.z; pool.material.opacity = .48 + Math.sin(t * 2) * .06;
    rimA.color.lerp(tmpC, k); rimB.color.lerp(tmpC, k);
    scene.background.copy(BG).lerp(tmpC, .07); scene.fog.color.copy(scene.background);
    const camZ = wide ? 7.5 : 10.6;
    cam.position.set(mx * .6 + (wide ? .3 : 0), (wide ? .8 : 1) - my * .3 + sp * .9, camZ - (1 - intro) * 1.5);
    cam.lookAt(wide ? .4 : 0, (wide ? .42 : -.95) + sp * .3, 0);
    glitchAmt *= Math.pow(.02, dt);
    if (post) { post.glitch.uniforms.amt.value = reduce ? 0 : glitchAmt; post.glitch.uniforms.time.value = t; post.composer.render(dt); } else renderer.render(scene, cam);
  };
  requestAnimationFrame(frame);

  return {
    el,
    setData(list) {
      if (JSON.stringify(list) === JSON.stringify(data)) return;
      const key = data[sel] && data[sel].name, old = boxes; data = list;
      boxes = list.map((d, i) => old[i] && old[i].sig === d.name + '|' + d.label + '|' + d.css ? old[i] : build(d, i));
      old.forEach((b) => { if (!boxes.includes(b)) drop(b); });
      const i = Math.max(0, list.findIndex((d) => d.name === key)); sel = Math.min(i, list.length - 1); paint();
    },
    replay() { intro = 0; pos = sel; pulse(.9); size(); },
    onGo(fn) { onGo = fn; }, onSelect(fn) { onSel = fn; }
  };
};
