/* Scène 3D de la page d'accueil : une vitrine de nuit. Sept canettes Fripe (une par catégorie) sous un anneau de lumière ; au scroll, la canette choisie passe en grand sur un fond de sa couleur. */
window.FRIPE_PRODUCTS = [
  { name: 'Vêtements', hex: 0xff2e4d, css: '#ff2e4d', stat: 'Marge moyenne 41 %', note: 'vendu en 9 jours' },
  { name: 'Sneakers', hex: 0x22d37f, css: '#22d37f', stat: 'Marge moyenne 47 %', note: 'vendu en 6 jours' },
  { name: 'Sacs', hex: 0xff7a1a, css: '#ff7a1a', stat: 'Marge moyenne 52 %', note: 'vendu en 11 jours' },
  { name: 'Vintage', hex: 0xa98bff, css: '#a98bff', stat: 'Marge moyenne 63 %', note: 'vendu en 14 jours' },
  { name: 'Tech', hex: 0x2fb6ff, css: '#2fb6ff', stat: 'Marge moyenne 38 %', note: 'vendu en 5 jours' },
  { name: 'Luxe', hex: 0xf2c14e, css: '#f2c14e', stat: 'Marge moyenne 55 %', note: 'vendu en 21 jours' },
  { name: 'Maison', hex: 0xff5fa8, css: '#ff5fa8', stat: 'Marge moyenne 49 %', note: 'vendu en 12 jours' }
];

/* Une canette Fripe : profil tourné, étiquette peinte sur un canvas. Réutilisée par la mini canette du tableau de bord. */
window.FripeCan = function (T, p, n) {
  const W = 1024, H = 668, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding; tex.anisotropy = 4;
  const paint = () => {
    g.fillStyle = '#0c0c0f'; g.fillRect(0, 0, W, H);
    const sil = g.createLinearGradient(0, 0, 0, H * .07); sil.addColorStop(0, '#d9d9de'); sil.addColorStop(1, '#5d5d66');
    g.fillStyle = sil; g.fillRect(0, 0, W, H * .07); g.save(); g.translate(0, H); g.scale(1, -1); g.fillRect(0, 0, W, H * .06); g.restore();
    g.fillStyle = p.css; g.fillRect(0, H * .1, W, 6); g.fillRect(0, H * .9 - 6, W, 6);
    g.fillRect(W * .3, H * .1, W * .4, H * .8);
    g.save(); g.translate(W * .5, H * .5); g.rotate(-Math.PI / 2); g.transform(1, 0, -.22, 1, 0, 0);
    g.fillStyle = '#0c0c0f'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '400 300px Anton, Impact, "Arial Narrow", sans-serif'; g.fillText('FRIPE', 0, 16); g.restore();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.font = '500 26px "IBM Plex Mono", monospace'; g.textAlign = 'left';
    g.fillText('N°' + String(n + 1).padStart(2, '0'), W * .74, H * .2); g.fillText(p.name.toUpperCase(), W * .74, H * .26);
    g.fillStyle = p.css; g.fillText('ÉDITION', W * .74, H * .74); g.fillText('REVENDEUR', W * .74, H * .8);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '500 20px "IBM Plex Mono", monospace'; g.fillText('PRIX D’ACHAT DÉDUIT', W * .04, H * .8); g.fillText('BÉNÉFICE NET', W * .04, H * .85);
    tex.needsUpdate = true;
  };
  paint(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint);
  const prof = [[0, -1.13], [.4, -1.13], [.49, -1.09], [.55, -1.0], [.55, -.5], [.55, 0], [.55, .5], [.55, .95], [.5, 1.04], [.43, 1.1], [.45, 1.14], [.41, 1.15], [0, 1.12]].map(([x, y]) => new T.Vector2(x, y));
  const geo = new T.LatheGeometry(prof, 72, Math.PI, Math.PI * 2);
  const pos = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setY(i, (pos.getY(i) + 1.15) / 2.3);
  geo.computeVertexNormals();
  const mat = new T.MeshStandardMaterial({ map: tex, metalness: .45, roughness: .3, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .2 });
  const mesh = new T.Mesh(geo, mat); mesh.userData = { mat, tex, geo }; return mesh;
};

window.FripeScene = function ({ $, reduce }) {
  const cv = $('#bg3d'), T = window.THREE, P = window.FRIPE_PRODUCTS;
  if (!T) { document.body.classList.add('no3d'); return null; }
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' }); } catch (e) { document.body.classList.add('no3d'); return null; }
  const col = (h) => new T.Color(h).convertSRGBToLinear();
  const mobile = () => innerWidth < 900;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const hasComp = !!(T.EffectComposer && T.UnrealBloomPass && T.RenderPass && T.ShaderPass && T.GammaCorrectionShader);
  if (!hasComp) { renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; }

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

  /* les canettes */
  const cans = P.map((p, i) => { const g = new T.Group(); const m = window.FripeCan(T, p, i); g.add(m); g.userData = { m, k: 0, y: 0, s: 1, op: 1 }; scene.add(g); return g; });
  const backGlow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: col(0xff2e4d), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending })); backGlow.scale.set(9, 9, 1); backGlow.position.z = -2.5; scene.add(backGlow);

  /* rendu : bloom puis passe glitch (pixels, couleurs décalées, lignes) */
  let composer = null, bloom = null, glitch = null;
  if (hasComp) {
    composer = new T.EffectComposer(renderer); composer.addPass(new T.RenderPass(scene, cam));
    bloom = new T.UnrealBloomPass(new T.Vector2(innerWidth, innerHeight), .5, .35, .85); composer.addPass(bloom);
    glitch = new T.ShaderPass({ uniforms: { tDiffuse: { value: null }, amt: { value: 0 }, time: { value: 0 }, res: { value: new T.Vector2(1, 1) } },
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
  }

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

    /* fond : noir en vitrine, couleur de la canette en gros plan */
    tmpC.set(pc.hex).convertSRGBToLinear().lerp(blk, .5);
    cur.bg.lerp(tmpC.clone().lerp(BG, 1 - f), k); scene.background.copy(cur.bg); scene.fog.color.copy(cur.bg);
    scene.fog.near = 10 - f * 3; scene.fog.far = 32 - f * 14;

    cans.forEach((g, i) => {
      let o = i - cur.pos; const n = P.length; if (o > n / 2) o -= n; if (o < -n / 2) o += n;
      const a = o * (m ? .34 : .3), R = m ? 5.2 : 7.4;
      let x = Math.sin(a) * R, z = (Math.cos(a) - 1) * R, y = 0, s = 1, rz = -o * .1, ry = o * .25;
      const isSel = i === sel, near = Math.max(0, 1 - Math.abs(o));
      y += near * (.32 + Math.sin(t * 1.6) * .06); ry += near * t * .6;
      if (isSel) {
        const fx = m ? 0 : cur.side * 1.75, fy = m ? .85 : .15, fz = m ? .2 : 1.4;
        x += (fx - x) * f; y += (fy - y) * f; z += (fz - z) * f; s = 1 + f * (m ? .1 : .32); rz = rz * (1 - f) - cur.side * .22 * f; ry = ry * (1 - f) + f * (Math.sin(t * .7) * .55 - cur.side * .25);
      } else { y -= f * 4; }
      y -= cur.dim * .2;
      g.position.set(x, y, z); g.rotation.set(Math.sin(t * .8 + i) * .03, ry, rz); g.scale.setScalar(s);
      const vis = Math.abs(o) < 3.6; g.visible = vis;
      g.userData.m.material.emissiveIntensity = .12 + near * .3 + (isSel ? f * .2 : 0) - cur.dim * .08;
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

  /* glisser sur la vitrine pour changer de canette */
  const bindSwipe = (el) => { let sx = null; el.addEventListener('pointerdown', (e) => { if (e.target.closest('a,button')) return; sx = e.clientX; }); addEventListener('pointerup', (e) => { if (sx == null) return; const d = e.clientX - sx; sx = null; if (Math.abs(d) > 40) select(sel + (d < 0 ? 1 : -1)); }); };

  return {
    products: P, go, select, pulse, bindSwipe,
    next: () => select(sel + 1), prev: () => select(sel - 1), get sel() { return sel; },
    onSelect: (fn) => { listeners.push(fn); fn(sel, P[sel]); },
    setChart() {}, measure() {}
  };
};
