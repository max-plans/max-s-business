'use strict';

/* Vinted City : socle graphique (Three.js r128) — rendu réaliste vu du ciel.
   Matériaux PBR, reflets d'environnement, ombres douces, soleil qui suit l'heure réelle, brume, caméra aérienne. */
window.VQG = (() => {
  const T = window.THREE;
  if (!T) return null;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
  // r128 ne convertit pas les couleurs hex : on les passe en linéaire pour un rendu sRGB juste.
  const C = (hex) => new T.Color(hex).convertSRGBToLinear();

  /* ---------- matériaux ---------- */
  const matCache = new Map();
  function M(hex, rough = 0.85, metal = 0, o) {
    const key = `${hex}|${rough}|${metal}|${o ? JSON.stringify(o) : ''}`;
    let m = matCache.get(key);
    if (!m) { m = new T.MeshStandardMaterial(Object.assign({ color: C(hex), roughness: rough, metalness: metal, envMapIntensity: 0.6 }, o || {})); m.userData.shared = true; matCache.set(key, m); }
    return m;
  }
  const MU = (hex, rough = 0.85, metal = 0, o) => new T.MeshStandardMaterial(Object.assign({ color: C(hex), roughness: rough, metalness: metal, envMapIntensity: 0.6 }, o || {}));
  const nightMats = [];   // matériaux émissifs (lampes, phares) : allumés la nuit
  function lamp(hex, dim = 0.25) {
    const m = new T.MeshBasicMaterial({ color: C(hex) }); m.userData.lamp = { hex, dim }; nightMats.push(m); return m;
  }
  const flat = (hex, o) => new T.MeshBasicMaterial(Object.assign({ color: C(hex) }, o || {}));

  const shadowed = (m, cast = true) => { m.castShadow = cast; m.receiveShadow = true; return m; };
  const bx = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return shadowed(m); };
  const cy = (rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 14) => { const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); return shadowed(m); };
  const sp = (r, mat, x = 0, y = 0, z = 0, ws = 12, hs = 9) => { const m = new T.Mesh(new T.SphereGeometry(r, ws, hs), mat); m.position.set(x, y, z); return shadowed(m); };
  const pl = (w, d, mat, x = 0, y = 0, z = 0) => { const m = new T.Mesh(new T.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; return m; };

  // Fusionne les meshes immobiles d'un groupe (un par matériau) : bien moins d'appels de dessin.
  function mergeStatic(src, opts = {}) {
    src.updateMatrixWorld(true);
    const inv = new T.Matrix4().copy(src.matrixWorld).invert(), buckets = new Map();
    src.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      const g = o.geometry.clone(); g.applyMatrix4(new T.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      if (Array.isArray(o.material)) {   // boîtes à matériaux par face
        const groups = o.geometry.groups;
        groups.forEach((gr) => {
          const sub = g.clone(); const idx = []; for (let i = gr.start; i < gr.start + gr.count; i++) idx.push(g.index.array[i]);
          sub.setIndex(idx); sub.clearGroups();
          const mt = mats[gr.materialIndex]; let b = buckets.get(mt.uuid); if (!b) buckets.set(mt.uuid, b = { material: mt, geos: [], cast: o.castShadow }); b.geos.push(sub);
        });
        g.dispose(); return;
      }
      let b = buckets.get(o.material.uuid); if (!b) buckets.set(o.material.uuid, b = { material: o.material, geos: [], cast: o.castShadow }); b.geos.push(g);
    });
    const out = new T.Group(); out.position.copy(src.position); out.rotation.copy(src.rotation); out.scale.copy(src.scale);
    buckets.forEach(({ material, geos, cast }) => {
      let vc = 0, ic = 0; geos.forEach((g) => { vc += g.attributes.position.count; ic += g.index ? g.index.count : g.attributes.position.count; });
      const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), uv = new Float32Array(vc * 2), idx = new Uint32Array(ic);
      let vo = 0, io = 0;
      geos.forEach((g) => {
        const n = g.attributes.position.count;
        pos.set(g.attributes.position.array, vo * 3); if (g.attributes.normal) nor.set(g.attributes.normal.array, vo * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, vo * 2);
        if (g.index) { for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.array[i] + vo; io += g.index.count; } else { for (let i = 0; i < n; i++) idx[io + i] = vo + i; io += n; }
        vo += n; g.dispose();
      });
      const mg = new T.BufferGeometry();
      mg.setAttribute('position', new T.BufferAttribute(pos, 3)); mg.setAttribute('normal', new T.BufferAttribute(nor, 3)); mg.setAttribute('uv', new T.BufferAttribute(uv, 2)); mg.setIndex(new T.BufferAttribute(idx, 1));
      const me = new T.Mesh(mg, material); me.castShadow = opts.noCast ? false : (material.transparent ? false : cast !== false); me.receiveShadow = true; out.add(me);
    });
    src.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
    return out;
  }
  function disposeTree(g) { g.traverse((o) => { if (o.geometry) o.geometry.dispose(); const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { if (m && !(m.userData && m.userData.shared)) m.dispose(); }); }); }

  /* ---------- textures procédurales ---------- */
  function canvasTex(w, h, draw, rep, srgb = true) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
    const t = new T.CanvasTexture(cv); if (srgb) t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    return t;
  }
  const speckle = (x, w, h, n, cols, size = 2) => { for (let i = 0; i < n; i++) { x.fillStyle = pick(cols); x.fillRect(Math.random() * w, Math.random() * h, size * (0.5 + Math.random()), size * (0.5 + Math.random())); } };
  const texCache = {};
  function tex(name, rep) {
    const key = name + (rep ? rep.join('x') : '');
    if (texCache[key]) return texCache[key];
    let t;
    if (name === 'grass') t = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#5f9a47'; x.fillRect(0, 0, w, h); speckle(x, w, h, 5200, ['#6aa84f', '#548c3e', '#79b35c', '#4d8238', '#6fa04b'], 3); for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(40,90,30,.07)'; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 20 + Math.random() * 50, 0, 7); x.fill(); } }, rep);
    else if (name === 'asphalt') t = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#3b3e44'; x.fillRect(0, 0, w, h); speckle(x, w, h, 7000, ['#2f3237', '#464a51', '#53575e', '#34373c'], 2); for (let i = 0; i < 12; i++) { x.strokeStyle = 'rgba(20,20,22,.35)'; x.lineWidth = 1 + Math.random() * 2; x.beginPath(); x.moveTo(Math.random() * w, Math.random() * h); x.lineTo(Math.random() * w, Math.random() * h); x.stroke(); } }, rep);
    else if (name === 'concrete') t = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#b9b8b0'; x.fillRect(0, 0, w, h); speckle(x, w, h, 5000, ['#aaa9a1', '#c6c5bd', '#b2b1a9', '#9f9e97'], 2); }, rep);
    else if (name === 'pavers') t = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#c9c6bd'; x.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#c2bfb5' : '#cfccc2'; x.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); } speckle(x, w, h, 1500, ['#b5b2a8', '#d4d1c7'], 2); }, rep);
    else if (name === 'gravel') t = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#a2896a'; x.fillRect(0, 0, w, h); speckle(x, w, h, 9000, ['#8d7557', '#b59c7c', '#97805f', '#c3ab8a', '#7d6649'], 3); }, rep);
    else if (name === 'roof') t = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#4a4f57'; x.fillRect(0, 0, w, h); speckle(x, w, h, 2500, ['#40444b', '#545a63', '#3a3e44'], 2); for (let i = 0; i < 8; i++) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(i * 32, 0, 2, h); } }, rep);
    else if (name === 'metal') t = canvasTex(256, 64, (x, w, h) => { for (let i = 0; i < 32; i++) { x.fillStyle = i % 2 ? '#d7dadd' : '#c9ccd0'; x.fillRect(i * 8, 0, 8, h); x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(i * 8, 0, 1.5, h); } }, rep);
    texCache[key] = t; return t;
  }
  // façades : une tuile = 4 colonnes x 2 étages de fenêtres, avec fenêtres allumées aléatoires pour la nuit
  function facade(kind, wall, w, h) {
    const cols = Math.max(1, Math.round(w / 12)), rows = Math.max(1, Math.round(h / 6));
    const glass = kind === 'glass';
    const map = canvasTex(512, 256, (x, W, H) => {
      x.fillStyle = '#' + new T.Color(wall).getHexString(); x.fillRect(0, 0, W, H);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
        const wx = c * 128 + (glass ? 3 : 20), wy = r * 128 + (glass ? 3 : 26), ww = glass ? 122 : 88, wh = glass ? 122 : 70;
        const g = x.createLinearGradient(wx, wy, wx + ww, wy + wh); g.addColorStop(0, glass ? '#7fb3d9' : '#9ac4e4'); g.addColorStop(1, glass ? '#2c5878' : '#3d6a8c'); x.fillStyle = g; x.fillRect(wx, wy, ww, wh);
        x.fillStyle = 'rgba(255,255,255,.22)'; x.fillRect(wx, wy, ww * 0.45, 3); x.strokeStyle = 'rgba(20,30,40,.55)'; x.lineWidth = 3; x.strokeRect(wx, wy, ww, wh);
        if (!glass) { x.fillStyle = 'rgba(0,0,0,.10)'; x.fillRect(wx - 2, wy + wh, ww + 4, 4); }
      }
      if (glass) { x.fillStyle = 'rgba(15,25,35,.7)'; for (let i = 0; i <= 4; i++) x.fillRect(i * 128 - 2, 0, 4, H); x.fillRect(0, 126, W, 4); }
    }, [cols, rows]);
    const lit = canvasTex(512, 256, (x, W, H) => {
      x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) if (Math.random() < 0.55) { const wx = c * 128 + (glass ? 3 : 20), wy = r * 128 + (glass ? 3 : 26); x.fillStyle = pick(['#ffe2a1', '#ffd47a', '#fff0c9', '#ffc66b']); x.fillRect(wx, wy, glass ? 122 : 88, glass ? 122 : 70); }
    }, [cols, rows]);
    const m = new T.MeshStandardMaterial({ map, color: 0xffffff, roughness: glass ? 0.18 : 0.7, metalness: glass ? 0.7 : 0.05, emissive: 0xffffff, emissiveMap: lit, emissiveIntensity: 0 });
    m.userData.facade = true; nightMats.push(m); return m;
  }

  /* ---------- sprites : halos lumineux, émojis, étiquettes ---------- */
  let glowTex = null;
  function glowSprite(hex, size = 3, op = 0.9) {
    if (!glowTex) glowTex = canvasTex(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }, null, false);
    const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: C(hex), blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: op })); s.scale.set(size, size, 1); s.userData.glow = op; return s;
  }
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const emojiMats = {};
  function emojiSprite(ch, size = 1) {
    if (!emojiMats[ch]) { const t = canvasTex(128, 128, (x) => { x.font = `92px ${EMOJI_FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 64, 70); }); emojiMats[ch] = new T.SpriteMaterial({ map: t, transparent: true, depthTest: false }); }
    const s = new T.Sprite(emojiMats[ch]); s.scale.set(size, size, 1); s.renderOrder = 10; return s;
  }

  /* ---------- ciel, environnement, lumière du jour ---------- */
  function skyEnv(renderer, stops) {
    const s = new T.Scene();
    const t = canvasTex(8, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); stops.forEach(([p, c]) => g.addColorStop(p, c)); x.fillStyle = g; x.fillRect(0, 0, w, h); });
    const sky = new T.Mesh(new T.SphereGeometry(50, 32, 16), new T.MeshBasicMaterial({ map: t, side: T.BackSide })); s.add(sky);
    const pm = new T.PMREMGenerator(renderer); const rt = pm.fromScene(s, 0.02); pm.dispose(); t.dispose();
    return rt.texture;
  }
  const DAY = { start: 6.8, end: 19.4 };
  function dayState(h) {
    const d = clamp(Math.sin(((h - DAY.start) / (DAY.end - DAY.start)) * Math.PI), 0, 1);       // 0 nuit → 1 plein jour
    const k = smooth(d / 0.32), night = 1 - smooth(d / 0.22);
    const phi = lerp(0.12, Math.PI - 0.12, clamp((h - DAY.start) / (DAY.end - DAY.start), 0, 1));      // est → sud → ouest
    const el = lerp(0.1, 1.08, smooth(d * 1.1));
    let dir;
    if (night > 0.7) dir = new T.Vector3(-0.35, 0.8, -0.5).normalize();                                        // lune
    else dir = new T.Vector3(Math.cos(phi) * Math.cos(el), Math.sin(el), Math.sin(phi) * Math.cos(el) * 0.85 + 0.15).normalize();
    const warm = new T.Color(0xff9a52), noon = new T.Color(0xfff1dc), moon = new T.Color(0x8fb0ff);
    const sunColor = night > 0.7 ? moon.clone() : warm.clone().lerp(noon, k).lerp(moon, night * 0.9);
    return {
      night, day: k, dir, sunColor,
      sunInt: lerp(0.5, 2.3, k) * (1 - night * 0.82) + night * 0.55,
      hemiSky: new T.Color(0x9fc6f2).lerp(new T.Color(0x16224a), night), hemiGround: new T.Color(0x7d7360).lerp(new T.Color(0x0d1018), night), hemiInt: lerp(0.5, 0.78, k) * (1 - night * 0.45),
      bg: new T.Color(0xcfe2f4).lerp(new T.Color(0xf0b38a), (1 - k) * (1 - night)).lerp(new T.Color(0x0a1128), night),
      exposure: lerp(1.0, 1.1, k) + night * 0.1,
    };
  }

  /* ---------- scène, rendu, qualité ---------- */
  function createStage(container) {
    const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    const scene = new T.Scene(); scene.background = new T.Color(0xcfe2f4); scene.fog = new T.FogExp2(0xcfe2f4, 0.0022);
    const camera = new T.PerspectiveCamera(34, 1, 2, 900);
    const hemi = new T.HemisphereLight(0x9fc6f2, 0x7d7360, 0.7); scene.add(hemi);
    const sun = new T.DirectionalLight(0xfff1dc, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.06; sun.shadow.radius = 3;
    scene.add(sun, sun.target);
    const envDay = skyEnv(renderer, [[0, '#5f9be0'], [0.45, '#bfdcf5'], [0.5, '#e6eef4'], [0.55, '#8a7f6a'], [1, '#5b5546']]);
    const envNight = skyEnv(renderer, [[0, '#0a1230'], [0.45, '#1a2a52'], [0.5, '#27324f'], [0.55, '#15171f'], [1, '#0a0b10']]);
    scene.environment = envDay;
    const stage = { renderer, scene, camera, sun, hemi, envDay, envNight, quality: 2, shadowSpan: 70, night: 0, tod: null, frames: [] };
    stage.setQuality = (q) => {
      stage.quality = q;
      renderer.setPixelRatio(q >= 2 ? Math.min(window.devicePixelRatio || 1, 2) : q === 1 ? Math.min(window.devicePixelRatio || 1, 1.4) : 1);
      renderer.shadowMap.enabled = q > 0; sun.castShadow = q > 0;
      const s = q >= 2 ? 2048 : 1024; if (sun.shadow.mapSize.x !== s) { sun.shadow.mapSize.set(s, s); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
      scene.traverse((o) => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { m.needsUpdate = true; }); } });
      stage.resize();
    };
    stage.resize = () => { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.fov = w / h < 0.85 ? 48 : 34; camera.updateProjectionMatrix(); stage.w = w; stage.h = h; };
    stage.applyTime = (hours, target) => {
      const s = dayState(hours); stage.tod = s; stage.night = s.night;
      sun.color.copy(s.sunColor); sun.intensity = s.sunInt; hemi.color.copy(s.hemiSky); hemi.groundColor.copy(s.hemiGround); hemi.intensity = s.hemiInt;
      scene.background.copy(s.bg); scene.fog.color.copy(s.bg); renderer.toneMappingExposure = s.exposure;
      const env = s.night > 0.5 ? envNight : envDay; if (scene.environment !== env) scene.environment = env;
      const span = stage.shadowSpan; sun.position.copy(target).addScaledVector(s.dir, 160); sun.target.position.copy(target);
      const sc = sun.shadow.camera; sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.near = 20; sc.far = 400; sc.updateProjectionMatrix();
      nightMats.forEach((m) => {
        if (m.userData.facade) m.emissiveIntensity = s.night * 1.15;
        else if (m.userData.lamp) { const L = m.userData.lamp; m.color.copy(C(L.hex)).multiplyScalar(lerp(L.dim, 1.6, s.night)); }
      });
    };
    stage.adapt = (dt) => {      // qualité adaptative : on baisse si l'écran rame
      stage.frames.push(dt); if (stage.frames.length < 90) return;
      const avg = stage.frames.reduce((a, b) => a + b, 0) / stage.frames.length; stage.frames.length = 0;
      if (avg > 0.045 && stage.quality > 0) stage.setQuality(stage.quality - 1);
    };
    stage.setQuality(2);
    return stage;
  }

  /* ---------- caméra aérienne : glisser, pincer, tourner ---------- */
  function createRig(camera, dom, hooks) {
    const rig = { tx: 0, tz: 4, dist: 78, yaw: 0, pitch: 0.98, g: { tx: 0, tz: 4, dist: 78, yaw: 0 }, minD: 16, maxD: 170, bx: [-72, 72], bz: [-50, 52], enabled: true };
    const ptrs = new Map(); let drag = null, pinch = null, down = null;
    const pan = (dx, dy) => {
      const k = (2 * rig.g.dist * Math.tan((camera.fov * Math.PI) / 360)) / (dom.clientHeight || 600), c = Math.cos(rig.g.yaw), s = Math.sin(rig.g.yaw);
      // droite = (c, -s) ; avant (loin de la caméra) = (-s, -c)
      rig.g.tx += -dx * k * c - dy * k * s / Math.sin(rig.pitch); rig.g.tz += dx * k * s - dy * k * c / Math.sin(rig.pitch);
      rig.clampGoal();
    };
    rig.clampGoal = () => { rig.g.tx = clamp(rig.g.tx, rig.bx[0], rig.bx[1]); rig.g.tz = clamp(rig.g.tz, rig.bz[0], rig.bz[1]); rig.g.dist = clamp(rig.g.dist, rig.minD, rig.maxD); };
    rig.focus = (x, z, d, snap) => { rig.g.tx = x; rig.g.tz = z; if (d) rig.g.dist = d; rig.clampGoal(); if (snap) { rig.tx = rig.g.tx; rig.tz = rig.g.tz; rig.dist = rig.g.dist; } };
    rig.update = (dt) => {
      const a = 1 - Math.pow(0.0008, dt);
      rig.tx = lerp(rig.tx, rig.g.tx, a); rig.tz = lerp(rig.tz, rig.g.tz, a); rig.dist = lerp(rig.dist, rig.g.dist, a); rig.yaw += (Math.atan2(Math.sin(rig.g.yaw - rig.yaw), Math.cos(rig.g.yaw - rig.yaw))) * a;
      const r = rig.dist * Math.cos(rig.pitch), y = rig.dist * Math.sin(rig.pitch);
      camera.position.set(rig.tx + Math.sin(rig.yaw) * r, y, rig.tz + Math.cos(rig.yaw) * r); camera.lookAt(rig.tx, 0, rig.tz);
    };
    dom.addEventListener('pointerdown', (e) => {
      if (!rig.enabled) return; dom.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) { drag = { x: e.clientX, y: e.clientY }; down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 }; }
      else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x) }; drag = null; if (down) down.moved = 99; }
    });
    dom.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return; const p = ptrs.get(e.pointerId); const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (ptrs.size === 1 && drag) { if (down) down.moved += Math.abs(dx) + Math.abs(dy); if (!down || down.moved > 6) pan(dx, dy); }
      else if (ptrs.size === 2 && pinch) {
        const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
        rig.g.dist = clamp(rig.g.dist * (pinch.d / Math.max(30, d)), rig.minD, rig.maxD); rig.g.yaw -= Math.atan2(Math.sin(ang - pinch.ang), Math.cos(ang - pinch.ang)); pinch = { d, ang };
      }
    });
    const up = (e) => {
      if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
      if (ptrs.size === 0 && down && down.moved <= 6 && performance.now() - down.t < 450 && e.type === 'pointerup') hooks.onTap && hooks.onTap(e.clientX, e.clientY);
      if (ptrs.size < 2) pinch = null; if (ptrs.size === 0) { drag = null; down = null; } else if (ptrs.size === 1) { const [p] = [...ptrs.values()]; drag = { x: p.x, y: p.y }; if (down) down.moved = 99; }
    };
    dom.addEventListener('pointerup', up); dom.addEventListener('pointercancel', up);
    dom.addEventListener('wheel', (e) => { e.preventDefault(); rig.g.dist = clamp(rig.g.dist * Math.exp(e.deltaY * 0.0012), rig.minD, rig.maxD); }, { passive: false });
    dom.style.touchAction = 'none';
    rig.keys = {};
    rig.keyUpdate = (dt) => {
      const k = rig.keys, sp = dt * rig.g.dist * 0.9;
      const f = (k.up ? 1 : 0) - (k.down ? 1 : 0), r = (k.right ? 1 : 0) - (k.left ? 1 : 0), c = Math.cos(rig.g.yaw), s = Math.sin(rig.g.yaw);
      if (f || r) { rig.g.tx += (r * c - f * s) * sp; rig.g.tz += (-r * s - f * c) * sp; rig.clampGoal(); }
      if (k.rotL) rig.g.yaw += dt * 1.2; if (k.rotR) rig.g.yaw -= dt * 1.2; if (k.zin) rig.g.dist *= Math.exp(-dt * 0.9); if (k.zout) rig.g.dist *= Math.exp(dt * 0.9); if (k.zin || k.zout) rig.clampGoal();
    };
    return rig;
  }

  return { T, C, M, MU, lamp, flat, bx, cy, sp, pl, shadowed, mergeStatic, disposeTree, canvasTex, tex, facade, glowSprite, emojiSprite, createStage, createRig, dayState, clamp, lerp, smooth, rand, pick, hash, nightMats };
})();
