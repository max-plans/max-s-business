'use strict';

/* Vinted World : la boutique en 3D (Three.js r128, chargé depuis cdnjs avant ce fichier).
   Chargé AVANT app.js ; lit à l'exécution `state`, `cat`, `LEVELS`, `computeStats`, `profitOf`, `gameCoins`,
   `today`, `toast`, `gameSaveSoon`, `updateHud`, `openItemCard`, `openSheet`, `eur` définis dans app.js. */
const world = (() => {
  const T = window.THREE;
  if (!T) return { available: false, mount: () => false, sync() {}, info: () => ({ served: 0, cap: 0, overflow: 0 }) };

  /* ---------- plan de la boutique (mètres ; la caméra regarde vers -z) ---------- */
  const UNIT_X = [-2.2, 2.2, -6.2, 6.2];          // rayons de vente, dans l'ordre où on les débloque
  const UNIT_Z = -1.6, STOCK_Z = -5.4, UNIT_W = 3.2;
  const TIER_Y = [0.48, 1.18], SLOT_DX = [-1.2, -0.4, 0.4, 1.2];
  const COUNTER = { x0: 2.8, x1: 6.2, z0: 2.75, z1: 3.65 };
  const REG = { x: 4.5, z: 3.2 };
  const QUEUE = [{ x: 4.5, z: 2.1 }, { x: 4.5, z: 1.4 }, { x: 4.5, z: 0.7 }];
  const DESK = { x: -6.3, z: 3.6 }, BOARD = { x: -7.5, z: 1.2 };
  const AISLE_Z = 1.2, BROWSE_Z = -0.45;
  const PALETTE = [0xe76f51, 0x2a9d8f, 0xe9c46a, 0x6a4c93, 0x4361ee, 0xf28482, 0x84a59d, 0x8d99ae];
  const SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];
  const SHIRTS = [0xef476f, 0x118ab2, 0x06d6a0, 0xffd166, 0x9b5de5, 0xf15bb5, 0x00bbf9, 0xfb8500];
  const PANTS = [0x264653, 0x3a506b, 0x5c4033, 0x2b2d42, 0x4a4e69];
  const HAIRS = [0x2b1d0e, 0x5a3825, 0xc9a227, 0x111111, 0xa0522d, 0x9e9e9e];
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
  const mat = (c, o) => new T.MeshLambertMaterial(Object.assign({ color: c }, o));
  const box = (w, h, d, c, x = 0, y = 0, z = 0) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); return m; };
  const cyl = (rt, rb, h, c, x = 0, y = 0, z = 0, seg = 12) => { const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg), mat(c)); m.position.set(x, y, z); return m; };
  const ball = (r, c, x = 0, y = 0, z = 0) => { const m = new T.Mesh(new T.SphereGeometry(r, 12, 10), mat(c)); m.position.set(x, y, z); return m; };
  const tint = (c, f) => new T.Color(c).multiplyScalar(f);
  const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

  /* ---------- état du moteur ---------- */
  let renderer, scene, camera, root, mounted = false, running = false, lastT = 0, clock = 0;
  let hemi, sun, neonLight, ground;
  let player, units = [], stockUnits = [], decor = {}, obstacles = [];
  let itemRoot = null, spots = [], displayItems = [], stockItems = [], lastSig = '', overflow = 0;
  let customers = [], clerk = null, kitty = null, truck = null, rain = [];
  let spawnT = 2, joy = { x: 0, y: 0, id: null }, keys = {}, focus = null, focusLabel = null, lastFocusKey = '';
  let signCanvas = null, signTex = null, signBlink = 0, camPos = new T.Vector3(0, 9, 11), camLook = new T.Vector3(0, 0.8, 3);
  let els = {};

  /* ---------- sprites emoji / étiquettes ---------- */
  const emojiMats = {};
  function emojiMat(ch) {
    if (!emojiMats[ch]) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 128;
      const x = cv.getContext('2d'); x.font = `92px ${EMOJI_FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 64, 70);
      const t = new T.CanvasTexture(cv);       emojiMats[ch] = new T.SpriteMaterial({ map: t, transparent: true, depthTest: false });
    }
    return emojiMats[ch];
  }
  function emojiSprite(ch, size = 0.5) { const s = new T.Sprite(emojiMat(ch)); s.scale.set(size, size, 1); s.renderOrder = 10; return s; }

  function drawLabel(cv, lines) {
    const x = cv.getContext('2d'), w = cv.width, h = cv.height;
    x.clearRect(0, 0, w, h);
    x.fillStyle = 'rgba(20,28,26,.88)'; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 26); x.fill();
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `bold 44px system-ui,sans-serif`; x.fillText(lines[0], w / 2, h * 0.36, w - 40);
    x.fillStyle = '#9be7d8'; x.font = `34px system-ui,sans-serif`; x.fillText(lines[1] || '', w / 2, h * 0.7, w - 40);
  }
  function makeFocusLabel() {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 160;
    const tex = new T.CanvasTexture(cv);     const s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    s.scale.set(2.6, 0.81, 1); s.renderOrder = 20; s.visible = false; s.userData = { cv, tex };
    return s;
  }

  /* ---------- personnages ---------- */
  function makePerson(o = {}) {
    const g = new T.Group();
    const shirt = o.shirt ?? pick(SHIRTS), skin = o.skin ?? pick(SKINS), pants = o.pants ?? pick(PANTS), hair = o.hair ?? pick(HAIRS);
    const shadow = new T.Mesh(new T.CircleGeometry(0.38, 16), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; g.add(shadow);
    g.add(cyl(0.24, 0.28, 0.62, shirt, 0, 0.92, 0, 10));
    g.add(ball(0.21, skin, 0, 1.44, 0));
    const h = new T.Mesh(new T.SphereGeometry(0.225, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), mat(hair)); h.position.set(0, 1.47, -0.01); g.add(h);
    g.add(ball(0.035, 0x111111, -0.075, 1.45, 0.19), ball(0.035, 0x111111, 0.075, 1.45, 0.19));
    const limb = (w, hh, d, c, x, y) => { const p = new T.Group(); const m = new T.Mesh(new T.BoxGeometry(w, hh, d), mat(c)); m.position.y = -hh / 2; p.add(m); p.position.set(x, y, 0); g.add(p); return p; };
    g.userData = {
      legL: limb(0.17, 0.62, 0.2, pants, -0.12, 0.62), legR: limb(0.17, 0.62, 0.2, pants, 0.12, 0.62),
      armL: limb(0.13, 0.5, 0.15, shirt, -0.34, 1.17), armR: limb(0.13, 0.5, 0.15, shirt, 0.34, 1.17), phase: Math.random() * 6,
    };
    return g;
  }
  function walkAnim(g, t, amount) {
    const u = g.userData, s = Math.sin(t * 9 + u.phase) * 0.75 * amount;
    u.legL.rotation.x = s; u.legR.rotation.x = -s; u.armL.rotation.x = -s * 0.8; u.armR.rotation.x = s * 0.8;
  }
  function faceTo(g, dx, dz, dt, rate = 10) {
    if (Math.abs(dx) + Math.abs(dz) < 1e-4) return;
    g.rotation.y += angleDiff(g.rotation.y, Math.atan2(dx, dz)) * Math.min(1, dt * rate);
  }
  function makeCat() {
    const g = new T.Group(), c = 0xe8a33d;
    g.add(box(0.34, 0.2, 0.2, c, 0, 0.26, 0), box(0.16, 0.16, 0.16, c, 0.2, 0.33, 0), box(0.04, 0.07, 0.04, c, 0.17, 0.44, 0.05), box(0.04, 0.07, 0.04, c, 0.17, 0.44, -0.05));
    const tail = box(0.22, 0.04, 0.04, c, -0.27, 0.36, 0); tail.rotation.z = 0.6; g.add(tail);
    [[-0.12, 0.08], [-0.12, -0.08], [0.12, 0.08], [0.12, -0.08]].forEach(([x, z]) => g.add(box(0.05, 0.16, 0.05, c, x, 0.08, z)));
    g.add(ball(0.02, 0x111111, 0.28, 0.35, 0.05), ball(0.02, 0x111111, 0.28, 0.35, -0.05));
    return g;
  }

  /* ---------- objets en 3D selon la catégorie ---------- */
  const makeItem = {
    vetements(c) { const g = new T.Group(); g.add(box(0.5, 0.07, 0.42, c, 0, 0.035), box(0.5, 0.07, 0.42, tint(c, 0.85), 0, 0.105), box(0.18, 0.02, 0.07, 0xffffff, 0, 0.145, 0.12), box(0.14, 0.12, 0.14, tint(c, 0.7), -0.28, 0.07, -0.06)); return g; },
    chaussures(c) { const g = new T.Group(); [-0.12, 0.12].forEach((x) => { g.add(box(0.17, 0.06, 0.42, 0xf2f2f2, x, 0.03), box(0.15, 0.14, 0.26, c, x, 0.13, 0.06), box(0.14, 0.07, 0.14, tint(c, 0.8), x, 0.08, -0.12)); }); return g; },
    accessoires(c) { const g = new T.Group(); g.add(box(0.42, 0.3, 0.14, c, 0, 0.17)); const h = new T.Mesh(new T.TorusGeometry(0.1, 0.017, 6, 14, Math.PI), mat(0x2b2b2b)); h.position.set(0, 0.32, 0); g.add(h); g.add(box(0.1, 0.05, 0.02, 0xe9c46a, 0, 0.24, 0.08)); return g; },
    jeux(c) { const g = new T.Group(); g.add(box(0.3, 0.4, 0.04, c, 0, 0.22), box(0.26, 0.12, 0.05, 0xffffff, 0, 0.34), box(0.12, 0.12, 0.05, tint(c, 0.6), 0, 0.14)); return g; },
    livres(c) { const g = new T.Group(); g.add(box(0.36, 0.07, 0.26, c, 0, 0.035), box(0.34, 0.07, 0.25, tint(c, 0.7), 0.01, 0.105), box(0.35, 0.07, 0.26, 0xf4e9d8, 0, 0.175), box(0.32, 0.06, 0.24, tint(c, 1.3), -0.01, 0.24)); return g; },
    maison(c) { const g = new T.Group(); g.add(cyl(0.12, 0.09, 0.26, c, 0, 0.13), cyl(0.05, 0.1, 0.1, tint(c, 0.8), 0, 0.31), ball(0.15, tint(c, 1.1), 0, 0.2)); g.children[2].scale.y = 0.9; return g; },
    jouets(c) { const g = new T.Group(); g.add(ball(0.17, c, 0, 0.2), ball(0.12, c, 0, 0.44), ball(0.05, tint(c, 0.8), -0.1, 0.55), ball(0.05, tint(c, 0.8), 0.1, 0.55), ball(0.02, 0x111111, -0.04, 0.46, 0.11), ball(0.02, 0x111111, 0.04, 0.46, 0.11), ball(0.04, 0xf4d6b0, 0, 0.42, 0.12)); return g; },
    autre(c) { const g = new T.Group(); g.add(box(0.36, 0.3, 0.3, 0xc69c6d, 0, 0.15), box(0.08, 0.31, 0.31, 0xe3c79a, 0, 0.15)); return g; },
  };
  function itemMesh(it) {
    const c = PALETTE[hash(it.title || it.id) % PALETTE.length];
    return (makeItem[it.category] || makeItem.autre)(c);
  }
  function carton(it) {
    const g = new T.Group();
    g.add(box(0.62, 0.46, 0.46, 0xc69c6d, 0, 0.23), box(0.1, 0.47, 0.47, 0xe3c79a, 0, 0.23));
    const s = emojiSprite(cat(it.category)[1], 0.34); s.position.set(0, 0.3, 0.3); g.add(s);
    return g;
  }

  /* ---------- décor fixe ---------- */
  function checkerTexture() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const x = cv.getContext('2d'); x.fillStyle = '#ead9b6'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#dcc79c'; x.fillRect(0, 0, 32, 32); x.fillRect(32, 32, 32, 32);
    const t = new T.CanvasTexture(cv); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(8, 6); t.magFilter = T.NearestFilter;     return t;
  }
  function makeUnit(w = UNIT_W) {
    const g = new T.Group(), wood = 0x9a6a3a, dark = 0x6f4a24;
    g.add(box(0.08, 2.0, 0.7, dark, -w / 2, 1.0, 0), box(0.08, 2.0, 0.7, dark, w / 2, 1.0, 0), box(w, 2.0, 0.05, 0xb9895a, 0, 1.0, -0.33));
    [0.45, 1.15, 1.85].forEach((y) => g.add(box(w, 0.06, 0.7, wood, 0, y, 0)));
    return g;
  }
  function drawSign() {
    if (!signCanvas) return;
    const x = signCanvas.getContext('2d'), w = signCanvas.width, h = signCanvas.height;
    const owns = (state.game.owned || []).includes('sign');
    x.fillStyle = '#134e4a'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#fff8e6'; x.beginPath(); x.roundRect(14, 14, w - 28, h - 28, 22); x.fill();
    x.fillStyle = '#134e4a'; x.font = 'bold 74px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(state.game.name || 'Ma boutique', w / 2, h / 2 + 4, w - 100);
    if (owns) for (let i = 0; i < 22; i++) {
      x.fillStyle = (i + signBlink) % 2 ? '#fbbf24' : '#a16207';
      const px = 30 + i * ((w - 60) / 21);
      x.beginPath(); x.arc(px, 8, 5, 0, 7); x.arc(px, h - 8, 5, 0, 7); x.fill();
    }
    signTex.needsUpdate = true;
  }

  function buildStatic() {
    scene.background = new T.Color(0xbfe6ff);
    hemi = new T.HemisphereLight(0xffffff, 0x8a7a66, 0.8); scene.add(hemi);
    sun = new T.DirectionalLight(0xffffff, 0.45); sun.position.set(5, 12, 8); scene.add(sun);
    // sol dehors + intérieur
    ground = new T.Mesh(new T.PlaneGeometry(60, 60), mat(0x8fbf7a)); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; scene.add(ground);
    const walk = new T.Mesh(new T.PlaneGeometry(60, 4), mat(0xb8b8b0)); walk.rotation.x = -Math.PI / 2; walk.position.set(0, -0.01, 8.2); scene.add(walk);
    const floor = new T.Mesh(new T.PlaneGeometry(16, 12), new T.MeshLambertMaterial({ map: checkerTexture() })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
    // murs : fond et côtés pleins, façade basse + vitrine
    const wall = 0xf3e3c3, trim = 0x7a5a43;
    scene.add(box(16.4, 3.4, 0.25, wall, 0, 1.7, -6.1), box(0.25, 3.4, 12.4, wall, -8.1, 1.7, 0), box(0.25, 3.4, 12.4, wall, 8.1, 1.7, 0));
    scene.add(box(16.4, 0.18, 0.3, trim, 0, 0.09, -6.0));
    scene.add(box(7.0, 1.0, 0.25, wall, -4.5, 0.5, 6.0), box(7.0, 1.0, 0.25, wall, 4.5, 0.5, 6.0));
    [-4.5, 4.5].forEach((x) => { const gl = new T.Mesh(new T.PlaneGeometry(7, 1.8), new T.MeshBasicMaterial({ color: 0xcfeeff, transparent: true, opacity: 0.18, side: T.DoubleSide })); gl.position.set(x, 1.9, 6.0); scene.add(gl); });
    scene.add(box(0.15, 1.0, 0.3, trim, -1.0, 0.5, 6.0), box(0.15, 1.0, 0.3, trim, 1.0, 0.5, 6.0));
    scene.add(box(1.8, 0.03, 1.0, 0x8b2e2e, 0, 0.02, 5.2));
    // enseigne au-dessus de la porte
    signCanvas = document.createElement('canvas'); signCanvas.width = 768; signCanvas.height = 192;
    signTex = new T.CanvasTexture(signCanvas);     const sign = new T.Mesh(new T.PlaneGeometry(3.6, 0.9), new T.MeshBasicMaterial({ map: signTex })); sign.position.set(0, 2.62, -5.9); scene.add(sign);
    scene.add(box(3.8, 1.1, 0.12, trim, 0, 2.62, -5.96));
    // rayons de vente
    UNIT_X.forEach((x, i) => { const u = makeUnit(); u.position.set(x, 0, UNIT_Z); scene.add(u); units.push(u); });
    // rayons de stock au fond
    UNIT_X.forEach((x) => { const u = makeUnit(); u.position.set(x, 0, STOCK_Z); scene.add(u); stockUnits.push(u); const t = emojiSprite('📦', 0.7); t.position.set(x, 2.3, STOCK_Z); scene.add(t); });
    // comptoir + caisse
    const cw = COUNTER.x1 - COUNTER.x0;
    scene.add(box(cw, 1.0, 0.9, 0x8a5a2b, REG.x, 0.5, REG.z), box(cw + 0.2, 0.1, 1.05, 0xc99a5b, REG.x, 1.02, REG.z));
    const reg = new T.Group(); reg.add(box(0.5, 0.18, 0.4, 0x3b3b3b, 0, 0.09), box(0.34, 0.25, 0.06, 0x2a2a2a, 0, 0.3, -0.12)); reg.position.set(REG.x - 0.6, 1.07, REG.z); scene.add(reg);
    const reg2 = new T.Group(); reg2.add(box(0.42, 0.05, 0.3, 0x2a9d8f, 0, 0.03)); reg2.position.set(REG.x + 0.5, 1.07, REG.z); scene.add(reg2);
    decor.cashier = box(0.3, 0.2, 0.05, 0x9be7d8, REG.x - 0.6, 1.5, REG.z - 0.05); decor.cashier.visible = false; scene.add(decor.cashier);
    // bureau
    const desk = new T.Group();
    desk.add(box(1.6, 0.08, 0.9, 0xb98a55, 0, 0.78), box(0.08, 0.78, 0.8, 0x6f4a24, -0.72, 0.39), box(0.08, 0.78, 0.8, 0x6f4a24, 0.72, 0.39));
    desk.add(box(0.7, 0.45, 0.05, 0x222222, 0, 1.12, -0.18), box(0.64, 0.38, 0.02, 0x4cc9f0, 0, 1.12, -0.15), box(0.5, 0.03, 0.2, 0xdddddd, 0, 0.84, 0.15), box(0.08, 0.2, 0.08, 0x333333, 0, 0.92, -0.18));
    desk.position.set(DESK.x, 0, DESK.z); scene.add(desk);
    const chair = new T.Group(); chair.add(box(0.5, 0.06, 0.5, 0x2b2d42, 0, 0.5), box(0.5, 0.55, 0.06, 0x2b2d42, 0, 0.8, 0.22), cyl(0.04, 0.04, 0.5, 0x555555, 0, 0.25)); chair.position.set(DESK.x, 0, DESK.z + 1.0); scene.add(chair);
    // panneau d'affichage (quêtes et magasin) au mur gauche
    const board = new T.Group(); board.add(box(0.1, 1.5, 2.3, 0x6f4a24, 0, 0, 0), box(0.06, 1.3, 2.1, 0xc99a5b, 0.05, 0, 0));
    [[0.5, 0.1, 0xffd166], [-0.4, 0.3, 0xef476f], [0.1, -0.3, 0x06d6a0], [-0.5, -0.35, 0x4cc9f0]].forEach(([z, y, c]) => board.add(box(0.02, 0.4, 0.5, c, 0.09, y, z)));
    board.position.set(BOARD.x - 0.35, 1.7, BOARD.z); scene.add(board);
    const bt = emojiSprite('🎯', 0.6); bt.position.set(BOARD.x, 2.8, BOARD.z); scene.add(bt);
    const dt = emojiSprite('💻', 0.6); dt.position.set(DESK.x, 2.0, DESK.z); scene.add(dt);
    const rt = emojiSprite('💶', 0.5); rt.position.set(REG.x - 0.6, 2.1, REG.z); scene.add(rt);
    // décor débloquable
    decor.rug = new T.Mesh(new T.PlaneGeometry(5, 2.6), mat(0xb8423b)); decor.rug.rotation.x = -Math.PI / 2; decor.rug.position.set(-1.2, 0.015, 3.2); scene.add(decor.rug);
    decor.plant = new T.Group(); decor.plant.add(cyl(0.28, 0.2, 0.4, 0xb5651d, 0, 0.2), ball(0.32, 0x2f9e44, 0, 0.7), ball(0.24, 0x40c057, 0.18, 0.95, 0.05), ball(0.22, 0x37b24d, -0.16, 0.98, -0.05)); decor.plant.position.set(-7.0, 0, 5.0); scene.add(decor.plant);
    decor.radio = new T.Group(); decor.radio.add(box(0.5, 0.28, 0.2, 0xe76f51, 0, 0.14), cyl(0.07, 0.07, 0.02, 0x222222, -0.12, 0.14, 0.11, 10), cyl(0.07, 0.07, 0.02, 0x222222, 0.12, 0.14, 0.11, 10), box(0.02, 0.3, 0.02, 0xcccccc, 0.2, 0.4, 0)); decor.radio.children[1].rotation.x = decor.radio.children[2].rotation.x = Math.PI / 2; decor.radio.position.set(REG.x + 1.2, 1.07, REG.z); scene.add(decor.radio);
    decor.note = emojiSprite('🎵', 0.4); decor.note.position.set(REG.x + 1.2, 1.9, REG.z); scene.add(decor.note);
    const neonCv = document.createElement('canvas'); neonCv.width = 512; neonCv.height = 160; const nx = neonCv.getContext('2d');
    nx.fillStyle = '#ff5fb7'; nx.shadowColor = '#ff5fb7'; nx.shadowBlur = 24; nx.font = 'bold 110px system-ui,sans-serif'; nx.textAlign = 'center'; nx.textBaseline = 'middle'; nx.fillText('OPEN', 256, 84);
    const neonTex = new T.CanvasTexture(neonCv);     decor.neon = new T.Mesh(new T.PlaneGeometry(2.0, 0.62), new T.MeshBasicMaterial({ map: neonTex, transparent: true })); decor.neon.position.set(0, 3.15, -5.9); scene.add(decor.neon);
    neonLight = new T.PointLight(0xff5fb7, 0, 9); neonLight.position.set(0, 2.5, -4.5); scene.add(neonLight);
    decor.trophy = new T.Group(); decor.trophy.add(cyl(0.12, 0.12, 0.05, 0xb8860b, 0, 0.03), cyl(0.03, 0.03, 0.14, 0xd4a017, 0, 0.12), cyl(0.15, 0.06, 0.2, 0xffd700, 0, 0.3)); decor.trophy.position.set(UNIT_X[0], 2.02, UNIT_Z); scene.add(decor.trophy);
    decor.deskNote = null;
    // chat de boutique
    kitty = { g: makeCat(), tx: -3, tz: 4.5, wait: 1 }; kitty.g.position.set(-3, 0, 4.5); scene.add(kitty.g);
    // vendeur
    clerk = makePerson({ shirt: 0x264653, skin: 0xe0ac69, pants: 0x222222 }); clerk.position.set(REG.x - 1.0, 0, 4.15); clerk.rotation.y = Math.PI; scene.add(clerk);
    clerk.add(box(0.07, 0.3, 0.02, 0xe63946, 0, 1.0, 0.25));
    // camion de livraison
    truck = new T.Group();
    truck.add(box(2.2, 1.3, 1.2, 0xf8f9fa, -0.5, 1.0, 0), box(0.9, 0.9, 1.15, 0x2a9d8f, 1.0, 0.8, 0), box(0.5, 0.45, 1.16, 0xbfe9ff, 1.25, 1.05, 0));
    [[-1.1, 0.5], [0.0, 0.5], [1.0, 0.5]].forEach(([x, z]) => { [-0.6, 0.6].forEach((zz) => { const w = cyl(0.28, 0.28, 0.2, 0x222222, x, 0.28, zz, 14); w.rotation.x = Math.PI / 2; truck.add(w); }); });
    const tbox = emojiSprite('📦', 0.7); tbox.position.set(-0.5, 1.9, 0); truck.add(tbox);
    truck.position.set(-30, 0, 8.8); truck.visible = false; truck.rotation.y = Math.PI / 2 * 0; scene.add(truck);
    focusLabel = makeFocusLabel(); scene.add(focusLabel);
    // joueur
    player = makePerson({ shirt: 0x0f766e, skin: 0xe0ac69, pants: 0x3a506b, hair: 0x2b1d0e });
    player.add(box(0.5, 0.05, 0.32, 0xfff8e6, 0, 0.98, 0.25));   // tablier
    player.position.set(0, 0, 4.6); player.rotation.y = Math.PI; scene.add(player);
    const marker = new T.Mesh(new T.RingGeometry(0.42, 0.52, 24), new T.MeshBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.8, side: T.DoubleSide })); marker.rotation.x = -Math.PI / 2; marker.position.y = 0.03; player.add(marker);
  }

  /* ---------- synchronisation avec les articles ---------- */
  function disposeGroup(g) { g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && !o.material.map) o.material.dispose(); }); }
  const owned = () => state.game.owned || [];
  const unitCount = () => 1 + ['shelf2', 'shelf3', 'shelf4'].filter((id) => owned().includes(id)).length;

  function sync() {
    if (!mounted) return;
    state.game = state.game || {};
    const sig = JSON.stringify([state.items.filter((i) => i.status !== 'vendu').map((i) => [i.id, i.status, i.category, i.title, i.listPrice, i.buyPrice]), owned(), state.game.name]);
    checkSales();
    if (sig === lastSig) return;
    lastSig = sig;
    const n = unitCount(), o = owned();
    displayItems = state.items.filter((i) => i.status === 'en_vente');
    stockItems = state.items.filter((i) => i.status === 'stock');
    units.forEach((u, i) => { u.visible = i < n; });
    decor.cashier.visible = o.includes('cashier'); decor.plant.visible = o.includes('plant'); decor.radio.visible = o.includes('radio'); decor.note.visible = o.includes('radio');
    decor.neon.visible = o.includes('neon'); decor.trophy.visible = o.includes('trophy'); clerk.visible = o.includes('clerk'); kitty.g.visible = o.includes('cat');
    // obstacles
    obstacles = [[COUNTER.x0, COUNTER.x1, COUNTER.z0, COUNTER.z1], [DESK.x - 0.8, DESK.x + 0.8, DESK.z - 0.45, DESK.z + 0.45]];
    for (let i = 0; i < n; i++) obstacles.push([UNIT_X[i] - UNIT_W / 2, UNIT_X[i] + UNIT_W / 2, UNIT_Z - 0.4, UNIT_Z + 0.4]);
    UNIT_X.forEach((x) => obstacles.push([x - UNIT_W / 2, x + UNIT_W / 2, STOCK_Z - 0.4, STOCK_Z + 0.4]));
    // objets
    if (itemRoot) { scene.remove(itemRoot); disposeGroup(itemRoot); }
    itemRoot = new T.Group(); scene.add(itemRoot); spots = [];
    const place = (it, x, y, z, isStock) => {
      const m = isStock ? carton(it) : itemMesh(it); if (!isStock) m.scale.setScalar(1.35); m.position.set(x, y, z); itemRoot.add(m);
      spots.push({ type: 'item', id: it.id, x, z, y: y + 0.6, label: it.title, sub: isStock ? 'En stock · ' + eur(it.buyPrice) : 'En rayon · ' + (it.listPrice ? eur(it.listPrice) : eur(it.buyPrice)), emoji: cat(it.category)[1] });
    };
    displayItems.slice(0, n * 8).forEach((it, idx) => { const u = Math.floor(idx / 8), r = idx % 8; place(it, UNIT_X[u] + SLOT_DX[r % 4], TIER_Y[Math.floor(r / 4)] + 0.03, UNIT_Z + 0.03, false); });
    stockItems.slice(0, 32).forEach((it, idx) => { const u = Math.floor(idx / 8), r = idx % 8; place(it, UNIT_X[u] + SLOT_DX[r % 4], TIER_Y[Math.floor(r / 4)] + 0.03, STOCK_Z + 0.02, true); });
    overflow = Math.max(0, displayItems.length - n * 8);
    drawSign();
  }

  /* ---------- règles du jeu (mêmes que la version 2D) ---------- */
  const served = () => (state.game.servedDate === today() ? state.game.servedN || 0 : 0);
  const dailyCap = () => 20 + 10 * unitCount();
  const level = () => { const p = computeStats(state.items).totalProfit; let li = 0; LEVELS.forEach((l, i) => { if (p >= l.min) li = i; }); return li; };
  const charm = () => ['plant', 'radio', 'neon', 'trophy'].filter((id) => owned().includes(id)).length;
  const rate = () => 1 + 0.25 * level() + 0.1 * charm() + (owned().includes('sign') ? 0.25 : 0);
  const maxCustomers = () => 3 + (owned().includes('cat') ? 1 : 0);
  const queueOf = () => customers.filter((c) => c.state === 'toQueue' || c.state === 'wait').sort((a, b) => a.joined - b.joined);
  let joinedCount = 0;

  function spawnCustomer() {
    const c = { g: makePerson(), state: 'enter', path: [], speed: rand(1.7, 2.3), timer: 0, patience: 10, auto: 0, joined: 0, qi: -1, item: null, bag: null, t: 0 };
    c.unit = Math.floor(Math.random() * unitCount());
    c.g.position.set(0, 0, 7.6);
    const ux = UNIT_X[c.unit];
    c.path = [{ x: 0, z: AISLE_Z }, { x: ux, z: AISLE_Z }, { x: ux, z: BROWSE_Z }];
    c.bubble = emojiSprite('🙂', 0.45); c.bubble.position.set(0.1, 2.25, 0); c.bubble.visible = false; c.g.add(c.bubble);
    c.bar = new T.Sprite(new T.SpriteMaterial({ color: 0x16a34a, depthTest: false })); c.bar.scale.set(0.7, 0.07, 1); c.bar.position.set(0, 1.95, 0); c.bar.renderOrder = 10; c.bar.visible = false; c.g.add(c.bar);
    scene.add(c.g); customers.push(c);
  }
  function setBubble(c, ch) { c.bubble.material = emojiMat(ch); c.bubble.visible = !!ch; }
  function leaveShop(c, bubble) {
    c.state = 'leave'; setBubble(c, bubble); c.bar.visible = false;
    c.path = [{ x: 3.1, z: 1.6 }, { x: 0.9, z: 3.6 }, { x: 0, z: 5.8 }, { x: 0, z: 8.2 }];
  }
  function pay(c, quick) {
    const price = c.item ? c.item.listPrice || c.item.buyPrice || 0 : 0;
    const gain = 2 + (owned().includes('cashier') ? 1 : 0) + Math.min(4, Math.floor(price / 10)) + (quick ? 1 : 0);
    const g = (state.game = { owned: [], claimed: {}, ...state.game });
    if (g.servedDate !== today()) { g.servedDate = today(); g.servedN = 0; }
    g.servedN++; g.clientCoins = (Number(g.clientCoins) || 0) + gain;
    popText(c.g.position.x, 2.6, c.g.position.z, `+${gain} 🪙${quick ? ' ⚡' : ''}`);
    leaveShop(c, '😊');
    updateHud(); gameSaveSoon();
  }
  function serve() {
    const f = queueOf()[0];
    if (f && f.state === 'wait') return pay(f, f.patience > 5);
    toast(!displayItems.length ? 'Mets des articles « En vente » en rayon pour attirer des clients' : customers.length ? 'Les clients arrivent…' : 'Pas de client pour l’instant');
  }

  /* ---------- effets : textes flottants, camion, pluie de pièces ---------- */
  const pops = [];
  function popText(x, y, z, text) {
    const cv = document.createElement('canvas'); cv.width = 384; cv.height = 96;
    const c = cv.getContext('2d'); c.font = `bold 56px ${EMOJI_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 9; c.strokeStyle = '#fff'; c.strokeText(text, 192, 50); c.fillStyle = '#0f766e'; c.fillText(text, 192, 50);
    const tex = new T.CanvasTexture(cv);     const s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false })); s.scale.set(2.2, 0.55, 1); s.position.set(x, y, z); s.renderOrder = 30; scene.add(s);
    pops.push({ s, life: 1.5 });
  }
  function celebrate(n, coins) {
    truck.visible = true; truck.position.x = -16; truck.userData.go = true;
    for (let i = 0; i < 36; i++) { const m = cyl(0.14, 0.14, 0.03, 0xffc928, rand(-6, 6), rand(6, 14), rand(-3, 5), 14); m.rotation.x = Math.PI / 2; scene.add(m); rain.push({ m, vy: rand(2.5, 5), spin: rand(2, 6) }); }
    popText(player.position.x, 3.2, player.position.z, `🎉 +${coins} 🪙`);
    toast(`${n} vente${n > 1 ? 's' : ''} ! Le colis part : +${coins} 🪙`);
  }
  function checkSales() {
    const sold = state.items.filter((i) => i.status === 'vendu');
    const g = (state.game = { owned: [], claimed: {}, ...state.game });
    if (g.seenSold === undefined || sold.length < g.seenSold) { g.seenSold = sold.length; gameSaveSoon(); return; }
    if (sold.length > g.seenSold) {
      const n = sold.length - g.seenSold;
      const recent = [...sold].sort((a, b) => (b.soldAt || '').localeCompare(a.soldAt || '')).slice(0, n);
      const coins = recent.reduce((s, i) => s + 5 + Math.max(0, Math.round(profitOf(i))), 0);
      g.seenSold = sold.length; gameSaveSoon(); celebrate(n, coins); updateHud();
    }
  }

  /* ---------- mouvement et collisions ---------- */
  const blockedAt = (x, z, r = 0.3) => {
    if (x < -7.5 || x > 7.5 || z < -5.6 || z > 5.5) return true;
    for (const b of obstacles) if (x > b[0] - r && x < b[1] + r && z > b[2] - r && z < b[3] + r) return true;
    return false;
  };
  const inputBlocked = () => !!document.querySelector('dialog[open]');

  function inputVec() {
    let x = joy.x, y = joy.y;
    if (keys.left) x -= 1; if (keys.right) x += 1; if (keys.up) y -= 1; if (keys.down) y += 1;
    const m = Math.hypot(x, y);
    return m > 1 ? { x: x / m, y: y / m } : { x, y };
  }

  /* ---------- interactions ---------- */
  function currentFocus() {
    const px = player.position.x, pz = player.position.z;
    let best = null, bestScore = 1;
    const test = (s, range) => { const d = Math.hypot(s.x - px, s.z - pz) / range; if (d < bestScore) { bestScore = d; best = s; } };
    test({ type: 'register', x: REG.x, z: REG.z + 0.4, label: 'Caisse', sub: queueOf().length ? 'Un client attend !' : 'Encaisser les clients', emoji: '💶', y: 2.1 }, 2.0);
    test({ type: 'desk', x: DESK.x, z: DESK.z + 0.5, label: 'Bureau', sub: 'Stats, articles, ajout', emoji: '💻', y: 2.0 }, 2.0);
    test({ type: 'board', x: BOARD.x + 0.4, z: BOARD.z, label: 'Panneau', sub: 'Quêtes et magasin', emoji: '🎯', y: 2.7 }, 2.0);
    spots.forEach((s) => test(s, 1.25));
    return best;
  }
  function doInteract() {
    if (!focus || inputBlocked()) return;
    if (focus.type === 'item') openItemCard(focus.id);
    else if (focus.type === 'register') serve();
    else if (focus.type === 'desk') openSheet('home');
    else if (focus.type === 'board') openSheet('shop');
  }
  function updateFocus() {
    focus = inputBlocked() ? null : currentFocus();
    const key = focus ? focus.type + (focus.id || '') + focus.label + focus.sub : '';
    if (key !== lastFocusKey) {
      lastFocusKey = key;
      if (focus) {
        drawLabel(focusLabel.userData.cv, [`${focus.emoji} ${focus.label}`.slice(0, 26), focus.sub]); focusLabel.userData.tex.needsUpdate = true;
        els.act.hidden = false; els.actLbl.textContent = focus.type === 'item' ? 'Voir' : focus.type === 'register' ? 'Servir' : 'Ouvrir';
      } else els.act.hidden = true;
    }
    focusLabel.visible = !!focus;
    if (focus) focusLabel.position.set(focus.x, (focus.y || 1.9) + 0.35, focus.z + 0.2);
  }

  /* ---------- boucle ---------- */
  function update(dt) {
    clock += dt;
    // joueur
    const iv = inputBlocked() ? { x: 0, y: 0 } : inputVec(), sp = 4.0, moving = Math.hypot(iv.x, iv.y) > 0.08;
    if (moving) {
      const nx = player.position.x + iv.x * sp * dt, nz = player.position.z + iv.y * sp * dt;
      if (!blockedAt(nx, player.position.z)) player.position.x = nx;
      if (!blockedAt(player.position.x, nz)) player.position.z = nz;
      faceTo(player, iv.x, iv.y, dt, 12);
    }
    walkAnim(player, clock, moving ? Math.min(1, Math.hypot(iv.x, iv.y)) : 0);
    updateFocus();
    // clients
    spawnT -= dt;
    if (spawnT <= 0) {
      spawnT = Math.max(2.4, 7 / rate()) * rand(0.7, 1.3);
      if (displayItems.length && served() + customers.filter((c) => c.state !== 'leave').length < dailyCap() && customers.length < maxCustomers()) spawnCustomer();
    }
    const q = queueOf();
    for (const c of customers) {
      c.t += dt;
      const p = c.g.position;
      if (c.path.length) {
        const t = c.path[0], dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz), step = c.speed * dt;
        if (d <= step) { p.x = t.x; p.z = t.z; c.path.shift(); } else { p.x += (dx / d) * step; p.z += (dz / d) * step; faceTo(c.g, dx, dz, dt, 9); }
        walkAnim(c.g, c.t, 1);
        continue;
      }
      walkAnim(c.g, c.t, 0);
      if (c.state === 'enter') { c.state = 'browse'; c.timer = rand(1.4, 2.8); faceTo(c.g, 0, -1, 1, 1); c.g.rotation.y = Math.PI; }
      else if (c.state === 'browse') {
        c.timer -= dt;
        if (c.timer <= 0) {
          const mine = displayItems.slice(c.unit * 8, c.unit * 8 + 8);
          c.item = mine.length ? pick(mine) : pick(displayItems);
          if (!c.item || q.length >= QUEUE.length) { leaveShop(c, '😕'); continue; }
          c.bag = box(0.2, 0.26, 0.1, PALETTE[hash(c.item.title || '') % PALETTE.length], 0.38, 0.75, 0.05); c.g.add(c.bag);
          setBubble(c, cat(c.item.category)[1]);
          c.state = 'toQueue'; c.joined = ++joinedCount;
          const slot = QUEUE[queueOf().indexOf(c)]; c.path = [{ x: slot.x, z: slot.z }];
        }
      } else if (c.state === 'toQueue') { c.state = 'wait'; c.patience = 10; c.bar.visible = true; c.g.rotation.y = 0; }
      else if (c.state === 'wait') {
        c.patience -= dt;
        const qi = queueOf().indexOf(c); c.qi = qi;
        const slot = QUEUE[qi];
        if (slot && (Math.abs(p.x - slot.x) > 0.05 || Math.abs(p.z - slot.z) > 0.05)) c.path = [{ x: slot.x, z: slot.z }];
        const f = Math.max(0, c.patience / 10);
        c.bar.scale.x = 0.7 * f + 0.001; c.bar.material.color.set(f > 0.5 ? 0x16a34a : f > 0.25 ? 0xf59e0b : 0xdc2626);
        if (f < 0.3) setBubble(c, '😠');
        if (qi === 0 && owned().includes('clerk')) { c.auto += dt; if (c.auto > 1.2) pay(c, false); }
        if (c.patience <= 0) { popText(p.x, 2.6, p.z, '😡'); leaveShop(c, '😡'); }
      } else if (c.state === 'leave') c.done = true;
    }
    customers = customers.filter((c) => { if (c.done) { scene.remove(c.g); disposeGroup(c.g); } return !c.done; });
    // vendeur : se tourne vers la file
    if (clerk.visible) { walkAnim(clerk, clock, 0); clerk.rotation.y = Math.PI + Math.sin(clock * 0.7) * 0.15; }
    // chat
    if (kitty.g.visible) {
      const k = kitty, dx = k.tx - k.g.position.x, dz = k.tz - k.g.position.z, d = Math.hypot(dx, dz);
      if (d < 0.08) { k.wait -= dt; if (k.wait <= 0) { k.tx = rand(-7, 1.8); k.tz = rand(2.2, 5.2); k.wait = rand(1, 4); } }
      else { k.g.position.x += (dx / d) * 0.9 * dt; k.g.position.z += (dz / d) * 0.9 * dt; k.g.rotation.y += angleDiff(k.g.rotation.y, Math.atan2(-dz, dx)) * Math.min(1, dt * 8); k.g.position.y = Math.abs(Math.sin(clock * 10)) * 0.02; }
    }
    // camion et pluie de pièces
    if (truck.visible) { truck.position.x += 8 * dt; if (truck.position.x > 18) truck.visible = false; }
    rain.forEach((r) => { r.m.position.y -= r.vy * dt; r.m.rotation.z += r.spin * dt; });
    rain = rain.filter((r) => { if (r.m.position.y < 0.05) { scene.remove(r.m); disposeGroup(r.m); return false; } return true; });
    pops.forEach((p) => { p.life -= dt; p.s.position.y += 0.8 * dt; p.s.material.opacity = Math.min(1, p.life * 1.5); });
    for (let i = pops.length - 1; i >= 0; i--) if (pops[i].life <= 0) { scene.remove(pops[i].s); pops[i].s.material.map.dispose(); pops[i].s.material.dispose(); pops.splice(i, 1); }
    // enseigne qui clignote
    if (owned().includes('sign') && Math.floor(clock * 2) !== signBlink) { signBlink = Math.floor(clock * 2); drawSign(); }
    // nuit
    const h = new Date().getHours(), night = h >= 20 || h < 7;
    hemi.intensity = night ? 0.42 : 0.8; sun.intensity = night ? 0.2 : 0.45;
    scene.background.setHex(night ? 0x1b2447 : 0xbfe6ff); ground.material.color.setHex(night ? 0x35523a : 0x8fbf7a);
    neonLight.intensity = night && owned().includes('neon') ? 1.1 : 0;
    // caméra
    const aspect = els.w / els.h, portrait = aspect < 0.85;
    const off = portrait ? { y: 10.4, z: 7.2 } : { y: 9.2, z: 5.8 };
    const tx = THREE_clamp(player.position.x * 0.6, -4.5, 4.5), tz = THREE_clamp(player.position.z, -3.6, 5.5);
    camPos.lerp(new T.Vector3(tx, off.y, tz + off.z), 1 - Math.pow(0.0005, dt));
    camLook.lerp(new T.Vector3(tx, 0.7, tz - 0.8), 1 - Math.pow(0.0005, dt));
    camera.fov = portrait ? 66 : 48; camera.position.copy(camPos); camera.lookAt(camLook); camera.updateProjectionMatrix();
  }
  const THREE_clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function loop(ts) {
    if (!running) return;
    const dt = Math.min(0.05, (ts - lastT) / 1000 || 0); lastT = ts;
    if (!document.hidden) { update(dt); renderer.render(scene, camera); }
    requestAnimationFrame(loop);
  }

  /* ---------- entrées : joystick, clavier, bouton d'action ---------- */
  function bindInputs() {
    const joyEl = els.joy, knob = els.knob;
    const move = (e) => {
      const r = joyEl.getBoundingClientRect();
      let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
      joy.x = Math.abs(dx) < 0.12 ? 0 : dx; joy.y = Math.abs(dy) < 0.12 ? 0 : dy;
      knob.style.transform = `translate(${dx * 34}px,${dy * 34}px)`;
    };
    joyEl.addEventListener('pointerdown', (e) => { joy.id = e.pointerId; joyEl.setPointerCapture(e.pointerId); move(e); e.preventDefault(); });
    joyEl.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) move(e); });
    const end = (e) => { if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; } };
    joyEl.addEventListener('pointerup', end); joyEl.addEventListener('pointercancel', end);
    els.act.addEventListener('click', doInteract);
    const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', z: 'up', w: 'up', s: 'down', q: 'left', a: 'left', d: 'right' };
    window.addEventListener('keydown', (e) => {
      if (inputBlocked() || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || '')) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (map[k]) { keys[map[k]] = true; e.preventDefault(); }
      else if (k === 'e' || k === ' ' || k === 'Enter') { e.preventDefault(); doInteract(); }
    });
    window.addEventListener('keyup', (e) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (map[k]) keys[map[k]] = false; });
    window.addEventListener('blur', () => { keys = {}; });
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    els.w = w; els.h = h;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  /* ---------- API ---------- */
  function mount(container) {
    try {
      renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch (e) { return false; }
    try {
      els = { joy: document.getElementById('joy'), knob: document.getElementById('joy-knob'), act: document.getElementById('act'), actLbl: document.getElementById('act-lbl'), w: 1, h: 1 };
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.appendChild(renderer.domElement);
      scene = new T.Scene(); camera = new T.PerspectiveCamera(48, 1, 0.1, 120);
      buildStatic(); mounted = true; sync(); resize(); bindInputs();
      camPos.set(player.position.x, 9, player.position.z + 7); camLook.set(player.position.x, 0.7, player.position.z - 0.8);
      window.addEventListener('resize', resize);
      running = true; lastT = performance.now(); requestAnimationFrame(loop);
      return true;
    } catch (e) { console.error(e); mounted = false; running = false; return false; }
  }

  return {
    available: true, mount, sync,
    info: () => ({ served: served(), cap: dailyCap(), overflow, level: level(), queue: queueOf().length, display: displayItems.length, stock: stockItems.length }),
    _debug: () => ({ player: { x: player.position.x, z: player.position.z }, customers: customers.map((c) => ({ state: c.state, x: c.g.position.x, z: c.g.position.z, qi: c.qi })), spots, focus: focus && { type: focus.type, id: focus.id }, rain: rain.length, truck: truck.visible, pops: pops.length }),
    _teleport: (x, z) => { player.position.x = x; player.position.z = z; },
    _interact: doInteract,
  };
})();
