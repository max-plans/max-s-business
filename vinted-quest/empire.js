'use strict';

/* Vinted Empire : rue, terrains à vendre, bâtiments (entrepôt, bureau, studio, expédition) et employés
   qui travaillent pour toi. Chargé AVANT world.js, qui l'initialise (makeEmpire) quand la scène 3D est prête.
   Lit à l'exécution les globales de app.js : state, SHOP_BY_ID, cat, eur, today, computeStats, openSheet, toast. */
window.makeEmpire = function (c) {
  const { T, scene, box, cyl, ball, tint, rand, makePerson, animate, faceTo, emojiSprite, mergeStatic, popText, earn, itemMesh, carton } = c;

  const FONT = 'system-ui,"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const WOOD = 0xb98a55, DARK = 0x6f4a24;
  const DEFS = {
    entrepot: { cx: -17, id: 'b_entrepot', name: 'Entrepôt', icon: '📦', floor: [0xc5c8cc, 0xb9bcc2], wall: 0xdfe3e6, accent: 0xf4a261 },
    studio: { cx: -33, id: 'b_studio', name: 'Studio photo', icon: '📸', floor: [0xfafafa, 0xececec], wall: 0xffffff, accent: 0xff6b9d },
    bureau: { cx: 17, id: 'b_bureau', name: 'Bureau', icon: '🏢', floor: [0x93a8bd, 0x889eb4], wall: 0xe6edf3, accent: 0x4361ee },
    expedition: { cx: 33, id: 'b_expedition', name: 'Expédition', icon: '🚚', floor: [0xcfcfc6, 0xc3c3ba], wall: 0xe8e8e0, accent: 0xffd166 },
  };
  const KEYS = Object.keys(DEFS);
  const B = {};                    // état par bâtiment
  KEYS.forEach((k) => { B[k] = { k, d: DEFS[k], built: false, root: null, lot: null, obstacles: [], doors: [], spots: [], stock: null, dyn: null }; });
  const BOUTIQUE_DOOR = { x0: -0.85, x1: 0.85 };

  const own = (k) => (state.game.owned || []).includes(DEFS[k].id);
  const hired = (id) => (state.game.owned || []).includes(id);
  const priceOf = (id) => (SHOP_BY_ID[id] ? SHOP_BY_ID[id].price : 0);
  const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const basicCache = new Map();
  const basic = (col) => { const k = new T.Color(col).getHex(); let m = basicCache.get(k); if (!m) { m = new T.MeshBasicMaterial({ color: k }); m.userData.shared = true; basicCache.set(k, m); } return m; };
  const glow = (w, h, d, col, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), basic(col)); m.position.set(x, y, z); return m; };
  const rot = (m, x, y, z) => { m.rotation.set(x || 0, y || 0, z || 0); return m; };

  function canvasTex(w, h, draw) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    return new T.CanvasTexture(cv);
  }
  function signPlane(text, icon, color, w = 4.2, h = 0.85) {
    const hex = '#' + new T.Color(color).getHexString();
    const tex = canvasTex(768, 156, (x, W, H) => {
      x.fillStyle = hex; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(0,0,0,.14)'; x.fillRect(0, H * 0.62, W, H * 0.38);
      x.fillStyle = '#fff'; x.font = `bold 78px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(`${icon}  ${text.toUpperCase()}`, W / 2, H / 2 + 2, W - 60);
    });
    return new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex }));
  }
  function checkerMat(c1, c2) {
    const tex = canvasTex(64, 64, (x) => { x.fillStyle = '#' + new T.Color(c1).getHexString(); x.fillRect(0, 0, 64, 64); x.fillStyle = '#' + new T.Color(c2).getHexString(); x.fillRect(0, 0, 32, 32); x.fillRect(32, 32, 32, 32); });
    tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(7, 6); tex.magFilter = T.NearestFilter;
    return new T.MeshLambertMaterial({ map: tex });
  }

  /* ---------- meubles ---------- */
  function desk(g, x, z, w = 2.2, d = 0.9) {
    g.add(box(w, 0.08, d, WOOD, x, 0.8, z), box(0.08, 0.76, d - 0.1, DARK, x - w / 2 + 0.06, 0.38, z), box(0.08, 0.76, d - 0.1, DARK, x + w / 2 - 0.06, 0.38, z), box(w - 0.2, 0.5, 0.04, DARK, x, 0.55, z - d / 2 + 0.05));
  }
  function chair(g, x, z, ry = 0, col = 0x2b2d42) {
    const k = new T.Group(); k.add(box(0.5, 0.07, 0.5, col, 0, 0.5, 0), box(0.5, 0.55, 0.06, col, 0, 0.82, -0.22), cyl(0.04, 0.04, 0.45, 0x555555, 0, 0.25, 0), cyl(0.28, 0.28, 0.04, 0x333333, 0, 0.04, 0));
    k.position.set(x, 0, z); k.rotation.y = ry; g.add(k);
  }
  function monitor(g, x, z, ry = 0, col = 0x4cc9f0) {
    const m = new T.Group();
    m.add(box(0.72, 0.46, 0.05, 0x1e1e1e, 0, 1.14, 0), glow(0.64, 0.38, 0.02, col, 0, 1.14, 0.03), box(0.08, 0.22, 0.08, 0x333333, 0, 0.92, 0), box(0.34, 0.03, 0.2, 0x333333, 0, 0.84, 0));
    m.position.set(x, 0, z); m.rotation.y = ry; g.add(m);
  }
  function rack(g, x, z, w, accent) {
    [-w / 2, w / 2].forEach((dx) => g.add(box(0.1, 2.5, 0.7, accent, x + dx, 1.25, z)));
    [0.4, 1.1, 1.8].forEach((y) => g.add(box(w, 0.06, 0.7, 0x9aa0a8, x, y, z)));
    g.add(box(w, 0.06, 0.08, accent, x, 2.5, z + 0.3), box(w, 2.5, 0.04, 0xaeb4bb, x, 1.25, z - 0.33));
  }
  function plant(g, x, z, s = 1) {
    g.add(cyl(0.25 * s, 0.18 * s, 0.4 * s, 0xb5651d, x, 0.2 * s, z), ball(0.3 * s, 0x2f9e44, x, 0.7 * s, z), ball(0.22 * s, 0x40c057, x + 0.16 * s, 0.95 * s, z + 0.04));
  }
  const addAll = (g, arr) => arr.forEach((m) => g.add(m));

  /* ---------- coque d'un bâtiment (sol, murs, façade basse, enseigne) ---------- */
  function shell(S, b, gaps) {
    const d = b.d, wall = d.wall, trim = tint(d.wall, 0.62);
    const fl = new T.Mesh(new T.PlaneGeometry(14, 12), checkerMat(d.floor[0], d.floor[1])); fl.rotation.x = -Math.PI / 2; S.add(fl);
    S.add(box(14.4, 3.4, 0.25, wall, 0, 1.7, -6.1), box(0.25, 3.4, 12.4, wall, -7.1, 1.7, 0), box(0.25, 3.4, 12.4, wall, 7.1, 1.7, 0), box(14.4, 0.18, 0.3, trim, 0, 0.09, -6.0));
    // façade basse avec passages
    const edges = [-7.2]; gaps.forEach(([a, z2]) => edges.push(a, z2)); edges.push(7.2);
    for (let i = 0; i < edges.length; i += 2) {
      const a = edges[i], z2 = edges[i + 1];
      if (z2 - a > 0.1) {
        S.add(box(z2 - a, 1.0, 0.25, wall, (a + z2) / 2, 0.5, 6.0));
        const gl = new T.Mesh(new T.PlaneGeometry(z2 - a, 1.7), new T.MeshBasicMaterial({ color: 0xcfeeff, transparent: true, opacity: 0.16, side: T.DoubleSide })); gl.position.set((a + z2) / 2, 1.85, 6.0); S.add(gl);
      }
    }
    gaps.forEach(([a, z2]) => S.add(box(0.15, 1.0, 0.3, trim, a, 0.5, 6.0), box(0.15, 1.0, 0.3, trim, z2, 0.5, 6.0)));
    const sg = signPlane(d.name, d.icon, d.accent); sg.position.set(0, 2.75, -5.9); S.add(sg, box(4.4, 1.05, 0.12, trim, 0, 2.75, -5.97));
    b.doors = gaps.map(([a, z2]) => ({ x0: d.cx + a + 0.12, x1: d.cx + z2 - 0.12 }));
  }
  function finish(b, S, obstacles) {
    const R = new T.Group(); R.position.x = b.d.cx;
    R.add(mergeStatic(S));
    b.dyn = new T.Group(); R.add(b.dyn);
    b.root = R; b.obstacles = obstacles.map(([x0, x1, z0, z1]) => [x0 + b.d.cx, x1 + b.d.cx, z0, z1]);
    scene.add(R);
  }

  /* ---------- ENTREPÔT ---------- */
  let belt = [], beltTimer = 0;
  function buildEntrepot(b) {
    const d = b.d, S = new T.Group(); shell(S, b, [[-0.9, 0.9]]);
    [-4.6, 0, 4.6].forEach((x) => rack(S, x, -5.4, 4.0, d.accent));
    S.add(box(2.6, 0.08, 1.0, 0xc9a36b, -3, 0.9, 0.9), box(0.08, 0.86, 0.9, DARK, -4.2, 0.43, 0.9), box(0.08, 0.86, 0.9, DARK, -1.8, 0.43, 0.9));
    S.add(box(0.3, 0.12, 0.18, 0xd62828, -2.3, 0.99, 0.65), box(0.5, 0.22, 0.4, 0xc69c6d, -3.5, 1.05, 0.9), box(0.38, 0.16, 0.3, 0xd7b27a, -2.8, 1.0, 1.1));
    S.add(box(6.6, 0.45, 0.95, 0x3a3f47, 2.5, 0.225, 2.9));
    for (let i = 0; i < 14; i++) S.add(rot(cyl(0.07, 0.07, 0.9, 0x8a8f98, -0.6 + i * 0.46, 0.47, 2.9, 8), Math.PI / 2));
    [[5.7, 0.1], [5.7, -2.0]].forEach(([x, z]) => S.add(box(1.3, 0.14, 1.1, WOOD, x, 0.07, z), box(1.0, 0.5, 0.9, 0xc69c6d, x, 0.45, z), box(0.8, 0.4, 0.8, 0xd7b27a, x, 0.9, z)));
    S.add(box(1.2, 0.9, 1.6, 0xf4a261, 5.8, 0.65, 4.6), box(0.1, 2.0, 0.1, 0x333333, 5.8, 1.2, 5.5), box(0.9, 0.06, 0.9, 0x555555, 5.8, 0.2, 5.9));
    [[-6.2, 4.7], [-5.5, 5.0], [-6.3, 3.9]].forEach(([x, z]) => S.add(cyl(0.3, 0.3, 0.8, 0x1d6fa5, x, 0.4, z, 12)));
    S.add(box(1.0, 0.9, 0.5, 0x3a3f47, 6.3, 0.45, 0.2), box(0.86, 0.5, 0.06, 0x1b2a2a, 6.3, 1.2, 0.0), glow(0.74, 0.38, 0.02, 0x2dd4bf, 6.3, 1.2, 0.04));
    finish(b, S, [[-6.7, -2.5, -5.8, -5.0], [-2.6, 2.6, -5.8, -5.0], [2.5, 6.7, -5.8, -5.0], [-4.5, -1.5, 0.3, 1.5], [-1.0, 5.9, 2.4, 3.4], [5.0, 6.5, -2.7, 0.7], [4.9, 6.7, 3.6, 5.6], [5.8, 6.8, -0.2, 0.7]]);
    b.spots = [{ type: 'action', x: d.cx + 5.4, z: 0.95, y: 1.9, label: 'Inventaire', sub: 'Voir tout le stock', emoji: '📋', range: 1.8, run: () => { state.filter = 'stock'; openSheet('items'); } }];
    b.stock = new T.Group(); scene.add(b.stock);
  }
  function placeEntrepotStock(b) {
    scene.remove(b.stock); b.stock = new T.Group(); scene.add(b.stock); b.stockSpots = [];
    const items = c.stockItems(), cx = b.d.cx, TY = [0.43, 1.13, 1.83], DX = [-1.6, -0.8, 0, 0.8, 1.6];
    items.slice(0, 45).forEach((it, i) => {
      const r = Math.floor(i / 15), t = Math.floor((i % 15) / 5), k = i % 5;
      const m = carton(it); m.scale.setScalar(0.88); m.position.set(cx + [-4.6, 0, 4.6][r] + DX[k], TY[t], -5.38); b.stock.add(m);
      b.stockSpots.push({ type: 'item', id: it.id, x: m.position.x, z: m.position.z, y: m.position.y + 0.7, label: it.title, sub: 'En stock · ' + eur(it.buyPrice), emoji: cat(it.category)[1] });
    });
  }

  /* ---------- BUREAU ---------- */
  function buildBureau(b) {
    const d = b.d, S = new T.Group(); shell(S, b, [[-0.9, 0.9]]);
    [-5, -1.7, 1.7, 5].forEach((x) => { desk(S, x, -1.3); monitor(S, x, -1.15, Math.PI, 0x7dd3fc); S.add(box(0.5, 0.03, 0.18, 0xdddddd, x, 0.84, -1.55), box(0.12, 0.1, 0.12, 0xd62828, x + 0.8, 0.88, -1.3)); chair(S, x, -2.6, 0); });
    desk(S, -5.2, 3.4, 2.2, 0.9); monitor(S, -5.2, 3.55, 0, 0x2dd4bf); chair(S, -5.2, 4.55, Math.PI);
    S.add(box(2.0, 0.08, 1.2, 0xe9e2d4, 4.5, 0.75, 3.2), cyl(0.12, 0.12, 0.7, 0x777777, 4.5, 0.38, 3.2)); [[3.6, 3.2], [5.4, 3.2], [4.5, 2.2], [4.5, 4.2]].forEach(([x, z]) => chair(S, x, z, Math.atan2(4.5 - x, 3.2 - z) + Math.PI));
    S.add(box(3.4, 1.9, 0.08, 0xffffff, 5.0, 1.9, -5.9), box(3.5, 0.06, 0.1, 0x999999, 5.0, 0.93, -5.88));
    [[4.0, 0xffd166], [4.6, 0xef476f], [5.2, 0x06d6a0], [5.8, 0x4cc9f0]].forEach(([x, col], i) => S.add(box(0.28, 0.28, 0.01, col, x, 2.1 - (i % 2) * 0.4, -5.84)));
    [-6.5, -5.8].forEach((x) => S.add(box(0.6, 1.4, 0.55, 0x9aa5b1, x, 0.7, -5.4)));
    S.add(box(0.5, 1.0, 0.5, 0xe8f1f8, 6.4, 0.5, -5.4), cyl(0.2, 0.2, 0.4, 0x9ed8ff, 6.4, 1.2, -5.4, 10));
    plant(S, -6.7, 5.0, 1.1); plant(S, 6.6, 5.2, 1.0); plant(S, 2.0, -5.2, 0.9);
    finish(b, S, [[-6.1, -3.9, -1.75, -0.85], [-2.8, -0.6, -1.75, -0.85], [0.6, 2.8, -1.75, -0.85], [3.9, 6.1, -1.75, -0.85], [-6.3, -4.1, 2.95, 3.85], [3.5, 5.5, 2.2, 4.2], [-6.9, -5.4, -5.8, -5.0], [6.1, 6.7, -5.8, -5.0]]);
    // tableau de bord réel : bénéfice des 6 derniers mois
    b.chart = new T.Mesh(new T.PlaneGeometry(5.0, 1.85), new T.MeshBasicMaterial({ color: 0x12211f })); b.chart.position.set(-1.6, 1.38, -5.9); b.dyn.add(b.chart);
    b.spots = [{ type: 'action', x: d.cx - 5.2, z: 4.15, y: 1.9, label: 'Poste du patron', sub: 'Tes stats en détail', emoji: '📊', range: 1.9, run: () => openSheet('home') }];
  }
  function drawChart(b) {
    if (!b.chart) return;
    const months = computeStats(state.items).months, W = 1024, H = 380;
    const tex = canvasTex(W, H, (x) => {
      x.fillStyle = '#12211f'; x.fillRect(0, 0, W, H); x.fillStyle = '#9be7d8'; x.font = `bold 34px ${FONT}`; x.textAlign = 'left'; x.fillText('📈 Bénéfice des 6 derniers mois', 28, 46);
      const vals = months.map((m) => m.profit), maxV = Math.max(1, ...vals, 0), minV = Math.min(0, ...vals), range = maxV - minV || 1, top = 90, bot = 320, y = (v) => top + ((maxV - v) / range) * (bot - top);
      x.strokeStyle = 'rgba(255,255,255,.25)'; x.beginPath(); x.moveTo(28, y(0)); x.lineTo(W - 28, y(0)); x.stroke();
      months.forEach((m, i) => {
        const bx = 60 + i * 160, y1 = y(Math.max(m.profit, 0)), y2 = y(Math.min(m.profit, 0));
        x.fillStyle = m.profit < 0 ? '#f87171' : '#2dd4bf'; x.fillRect(bx, y1, 100, Math.max(m.profit ? 4 : 0, y2 - y1));
        x.fillStyle = '#fff'; x.font = `bold 28px ${FONT}`; x.textAlign = 'center'; x.fillText(m.profit ? Math.round(m.profit) + ' €' : '', bx + 50, (m.profit < 0 ? y2 + 30 : y1 - 10));
        x.fillStyle = '#9fb3ae'; x.font = `26px ${FONT}`; x.fillText(m.label, bx + 50, H - 22);
      });
    });
    if (b.chart.material.map) b.chart.material.map.dispose();
    b.chart.material.map = tex; b.chart.material.color.set(0xffffff); b.chart.material.needsUpdate = true;
  }

  /* ---------- STUDIO PHOTO ---------- */
  let studioItem = null;
  function buildStudio(b) {
    const d = b.d, S = new T.Group(); shell(S, b, [[-0.9, 0.9]]);
    S.add(box(9.6, 2.2, 0.2, 0xffffff, 0, 1.1, -5.65), box(9.0, 0.03, 5.2, 0xffffff, 0, 0.02, -3.1));
    [[-4.4, -3.4, 0.4], [4.4, -3.4, -0.4]].forEach(([x, z, ry]) => { S.add(rot(glow(0.35, 1.5, 1.1, 0xfff4d6, x, 1.55, z), 0, ry), cyl(0.04, 0.04, 0.9, 0x333333, x, 0.45, z, 8), box(0.8, 0.04, 0.8, 0x333333, x, 0.02, z)); });
    // trépied + appareil
    [[-0.25, 0.2], [0.25, 0.2], [0, -0.28]].forEach(([dx, dz]) => S.add(rot(cyl(0.025, 0.025, 1.3, 0x222222, -1.9 + dx * 0.7, 0.62, -2.3 + dz * 0.7, 6), dz * 0.25, 0, -dx * 0.25)));
    S.add(box(0.42, 0.3, 0.32, 0x1d1d1d, -1.9, 1.35, -2.3), rot(cyl(0.1, 0.12, 0.3, 0x333333, -1.62, 1.35, -2.3, 12), 0, 0, Math.PI / 2));
    // portant à vêtements + mannequin
    S.add(box(0.06, 1.7, 0.06, 0x666666, 4.2, 0.85, 1.0), box(0.06, 1.7, 0.06, 0x666666, 6.2, 0.85, 1.0), box(2.1, 0.05, 0.05, 0x888888, 5.2, 1.65, 1.0));
    [4.5, 4.9, 5.3, 5.7, 6.0].forEach((x, i) => S.add(box(0.34, 0.7, 0.06, [0xef476f, 0x06d6a0, 0xffd166, 0x118ab2, 0x9b5de5][i], x, 1.28, 1.0)));
    S.add(cyl(0.04, 0.04, 1.0, 0x444444, -5.0, 0.5, 1.0, 8), cyl(0.2, 0.17, 0.5, 0xd9d4c8, -5.0, 1.25, 1.0, 12), ball(0.14, 0xd9d4c8, -5.0, 1.65, 1.0), box(0.5, 0.04, 0.5, 0x444444, -5.0, 0.02, 1.0));
    desk(S, -5.2, 4.3, 1.9, 0.8); monitor(S, -5.2, 4.45, 0, 0xff9ecf); chair(S, -5.2, 5.3, Math.PI);
    plant(S, 6.5, 5.0, 1.1); plant(S, -6.6, -4.8, 1.0);
    S.add(box(0.5, 0.5, 0.5, 0xffffff, 3.0, 0.25, 3.5), box(0.5, 0.5, 0.5, 0xfdeaf1, 3.7, 0.25, 3.9));
    finish(b, S, [[-4.9, -3.9, -3.9, -2.9], [3.9, 4.9, -3.9, -2.9], [-2.2, -1.5, -2.7, -1.9], [3.9, 6.5, 0.6, 1.4], [-5.5, -4.5, 0.6, 1.4], [-6.2, -4.2, 3.9, 4.7], [-1.2, 1.2, -4.5, -2.3]]);
    // plateau tournant avec un vrai article
    b.turn = new T.Group(); b.turn.position.set(0, 0, -3.4); b.turn.add(cyl(0.9, 0.9, 0.18, 0xf2f2f2, 0, 0.09, 0, 24), cyl(0.9, 0.9, 0.02, 0xff6b9d, 0, 0.19, 0, 24)); b.dyn.add(b.turn);
    b.flashLight = new T.PointLight(0xffffff, 0, 9); b.flashLight.position.set(d.cx - 1.5, 2.2, -2.2); scene.add(b.flashLight);
    b.flashSprite = emojiSprite('✨', 1.0); b.flashSprite.position.set(d.cx - 1.5, 1.6, -2.3); b.flashSprite.visible = false; scene.add(b.flashSprite);
    b.spots = [{ type: 'action', x: d.cx, z: -1.7, y: 1.9, label: 'Photographier', sub: 'Une belle photo, +2 🪙', emoji: '📸', cta: 'Photo', range: 1.9, run: () => photoShoot(b) }];
  }
  function setTurnItem(b) {
    if (!b.turn) return;
    if (studioItem) { b.turn.remove(studioItem); studioItem = null; }
    const list = c.displayItems().concat(c.stockItems());
    if (!list.length) return;
    studioItem = itemMesh(list[Math.floor(Math.random() * list.length)]); studioItem.scale.setScalar(1.9); studioItem.position.y = 0.2; b.turn.add(studioItem);
  }
  function doFlash(b) { flash = 1; if (b.flashSprite) b.flashSprite.visible = true; setTurnItem(b); }
  function photoShoot(b) {
    if (photoCooldown > 0) return toast(`L'appareil recharge… ${Math.ceil(photoCooldown)} s`);
    photoCooldown = 20; doFlash(b); earn(2, b.d.cx, 1.0, true); toast('📸 Belle photo ! +2 🪙');
  }

  /* ---------- EXPÉDITION ---------- */
  let van = null;
  function buildExpedition(b) {
    const d = b.d, S = new T.Group(); shell(S, b, [[-4.9, 0.9]]);
    [-4.6, 0, 4.6].forEach((x) => rack(S, x, -5.4, 4.0, d.accent));
    [[-5.2, 0.4], [-0.9, 0.4]].forEach(([x, z]) => S.add(box(0.12, 0.01, 4.6, 0xffd166, x, 0.015, z + 1.9)));
    S.add(box(4.4, 0.01, 0.12, 0xffd166, -3.05, 0.015, 4.6), box(4.4, 0.01, 0.12, 0xffd166, -3.05, 0.015, -0.1));
    desk(S, 4.6, 0.8, 2.4, 1.0); S.add(box(0.7, 0.14, 0.5, 0x4a4e57, 4.3, 0.9, 0.8), box(0.5, 0.3, 0.4, 0xc69c6d, 5.1, 0.99, 0.8)); chair(S, 4.6, -0.2, 0);
    S.add(cyl(0.3, 0.3, 0.8, 0xd62828, 6.3, 0.4, 3.8, 12), cyl(0.3, 0.3, 0.8, 0xd62828, 5.6, 0.4, 4.3, 12), box(1.4, 1.5, 1.0, 0xc9a36b, 5.8, 0.75, 2.2), box(1.2, 1.2, 0.8, 0xd7b27a, 4.4, 0.6, 4.6));
    finish(b, S, [[-6.7, -2.5, -5.8, -5.0], [-2.6, 2.6, -5.8, -5.0], [2.5, 6.7, -5.8, -5.0], [3.3, 5.9, 0.3, 1.3], [5.0, 6.6, 1.6, 2.8], [5.2, 6.7, 3.3, 4.8], [3.7, 5.1, 4.1, 5.1]]);
    b.parcels = new T.Group(); scene.add(b.parcels);
    van = makeVan(); van.g.position.set(d.cx - 3, 0, 2.2); van.home = { x: d.cx - 3, z: 2.2 }; van.state = 'parked'; scene.add(van.g);
    b.spots = [{ type: 'action', x: d.cx, z: -3.7, y: 2.1, label: 'Colis à expédier', sub: 'Tes ventes de la semaine', emoji: '📦', range: 2.2, run: () => { const n = recentSold().length; toast(n ? `📦 ${n} colis cette semaine` : 'Aucun colis cette semaine'); state.filter = 'vendu'; openSheet('items'); } }];
  }
  function makeVan() {
    const g = new T.Group();
    g.add(box(1.7, 1.5, 2.5, 0xf8f9fa, 0, 1.15, -0.4), box(1.7, 1.0, 1.0, 0x2a9d8f, 0, 0.9, 1.35), box(1.5, 0.45, 0.06, 0xbfe9ff, 0, 1.25, 1.88), box(1.72, 0.12, 2.5, 0x2a9d8f, 0, 0.5, -0.4));
    [[-0.85, 0.9], [0.85, 0.9], [-0.85, -1.1], [0.85, -1.1]].forEach(([x, z]) => g.add(rot(cyl(0.3, 0.3, 0.2, 0x222222, x, 0.3, z, 14), 0, 0, Math.PI / 2)));
    const s = emojiSprite('📦', 0.8); s.position.set(0, 2.2, -0.4); g.add(s);
    return { g, state: 'parked', path: [], speed: 4.6, home: { x: 0, z: 0 } };
  }
  function recentSold() {
    const lim = new Date(); lim.setDate(lim.getDate() - 7);
    const iso = `${lim.getFullYear()}-${String(lim.getMonth() + 1).padStart(2, '0')}-${String(lim.getDate()).padStart(2, '0')}`;
    return state.items.filter((i) => i.status === 'vendu' && i.soldAt && i.soldAt >= iso);
  }
  function placeParcels(b) {
    scene.remove(b.parcels); b.parcels = new T.Group(); scene.add(b.parcels);
    const list = recentSold().slice(0, 15), cx = b.d.cx, TY = [0.43, 1.13, 1.83], DX = [-1.6, -0.8, 0, 0.8, 1.6];
    list.forEach((it, i) => {
      const r = Math.floor(i / 15), t = Math.floor((i % 15) / 5), k = i % 5, g = new T.Group();
      g.add(box(0.6, 0.42, 0.44, 0xd7b27a, 0, 0.21, 0), box(0.1, 0.43, 0.45, 0xf1e0b8, 0, 0.21, 0)); const ok = emojiSprite('✅', 0.3); ok.position.set(0.16, 0.34, 0.26); g.add(ok);
      g.position.set(cx + [0][r] + DX[k], TY[t], -5.38); b.parcels.add(g);
    });
  }

  /* ---------- rue, terrains à vendre ---------- */
  function buildStreet() {
    const S = new T.Group();
    const sw = new T.Mesh(new T.PlaneGeometry(110, 3.4), new T.MeshLambertMaterial({ color: 0xc4c4bb })); sw.rotation.x = -Math.PI / 2; sw.position.set(0, 0.005, 7.9); S.add(sw);
    S.add(box(110, 0.12, 0.2, 0x9a9a92, 0, 0.06, 9.7));
    const rd = new T.Mesh(new T.PlaneGeometry(110, 4.6), new T.MeshLambertMaterial({ color: 0x4b4f55 })); rd.rotation.x = -Math.PI / 2; rd.position.set(0, 0.004, 12.0); S.add(rd);
    for (let x = -52; x < 52; x += 4) S.add(box(1.8, 0.01, 0.14, 0xf1f1f1, x, 0.012, 12.0));
    for (let x = -48; x <= 48; x += 8) {
      S.add(cyl(0.06, 0.07, 3.4, 0x444a52, x, 1.7, 9.2, 8), box(0.7, 0.07, 0.07, 0x444a52, x - 0.3, 3.35, 9.2), glow(0.3, 0.12, 0.3, 0xffe9a8, x - 0.6, 3.28, 9.2));
    }
    for (let x = -44; x <= 44; x += 11) { S.add(cyl(0.14, 0.18, 1.5, 0x7a5a43, x, 0.75, 15.0, 8), ball(0.95, 0x3e9b4f, x, 2.2, 15.0), ball(0.7, 0x4caf50, x + 0.5, 2.8, 15.1)); }
    [[-12, 'c'], [25, 'c']].forEach(([x]) => { S.add(box(1.6, 0.08, 0.5, 0x8a5a2b, x, 0.55, 8.6), box(1.6, 0.4, 0.06, 0x8a5a2b, x, 0.8, 8.4), box(0.08, 0.5, 0.4, 0x444444, x - 0.7, 0.28, 8.6), box(0.08, 0.5, 0.4, 0x444444, x + 0.7, 0.28, 8.6)); });
    scene.add(mergeStatic(S));
  }
  function buildLot(b) {
    const d = b.d, g = new T.Group(); g.position.x = d.cx;
    const S = new T.Group();
    const dirt = new T.Mesh(new T.PlaneGeometry(14, 12), new T.MeshLambertMaterial({ color: 0xa08560 })); dirt.rotation.x = -Math.PI / 2; dirt.position.y = 0.01; S.add(dirt);
    for (let x = -6.5; x <= 6.5; x += 1.3) { if (Math.abs(x) < 1.2) continue; S.add(box(0.12, 1.0, 0.12, 0x9a6a3a, x, 0.5, 6.0)); }
    S.add(box(5.6, 0.1, 0.06, 0xb98a55, -3.8, 0.8, 6.0), box(5.6, 0.1, 0.06, 0xb98a55, 3.8, 0.8, 6.0), box(5.6, 0.1, 0.06, 0xb98a55, -3.8, 0.45, 6.0), box(5.6, 0.1, 0.06, 0xb98a55, 3.8, 0.45, 6.0));
    S.add(box(0.12, 1.0, 0.12, 0x9a6a3a, -1.0, 0.5, 6.0), box(0.12, 1.0, 0.12, 0x9a6a3a, 1.0, 0.5, 6.0));
    [[-5, 2], [4, -1], [-3, -3]].forEach(([x, z]) => S.add(box(1.2, 0.9, 1.0, 0xc69c6d, x, 0.45, z)));
    S.add(box(0.12, 1.4, 0.12, 0x6f4a24, -1.4, 0.7, 4.6), box(0.12, 1.4, 0.12, 0x6f4a24, 1.4, 0.7, 4.6));
    g.add(mergeStatic(S));
    const price = priceOf(d.id), tex = canvasTex(640, 300, (x, W, H) => {
      x.fillStyle = '#c1121f'; x.fillRect(0, 0, W, H); x.fillStyle = '#fff'; x.fillRect(14, 14, W - 28, H - 28);
      x.fillStyle = '#c1121f'; x.font = `bold 78px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('À VENDRE', W / 2, 78);
      x.fillStyle = '#12211f'; x.font = `bold 50px ${FONT}`; x.fillText(`${d.icon} ${d.name}`, W / 2, 168, W - 50);
      x.fillStyle = '#b45309'; x.font = `bold 54px ${FONT}`; x.fillText(`${price} 🪙`, W / 2, 238);
    });
    const board = new T.Mesh(new T.PlaneGeometry(2.8, 1.31), new T.MeshBasicMaterial({ map: tex })); board.position.set(0, 1.6, 4.55); g.add(board);
    const crane = emojiSprite('🏗️', 1.6); crane.position.set(0, 3.0, -1.0); g.add(crane);
    b.lot = g; scene.add(g);
    b.lotSpot = { type: 'action', x: d.cx, z: 7.0, y: 2.2, label: 'Terrain à vendre', sub: `${d.name} · ${price} 🪙`, emoji: d.icon, cta: 'Voir', range: 2.4, run: () => openSheet('empire') };
  }

  /* ---------- employés ---------- */
  const STAFF = {
    e_packer: { b: 'entrepot', name: 'Léa', role: 'Emballeuse', line: 'J’emballe les colis, +1 🪙 sur chaque client.', look: { shirt: 0xf4a261, skin: 0xe0ac69, pants: 0x2b2d42, style: 'pony', hair: 0x5a3825, outfit: 'hoodie', vest: 0xff9f1c, glasses: false, beard: false, skirt: false } },
    e_stocker: { b: 'entrepot', name: 'Hugo', role: 'Magasinier', line: 'Je range les cartons dans ta boutique, +3 🪙 par livraison.', look: { shirt: 0x1d3557, skin: 0xc68642, pants: 0x3a506b, style: 'cap', hat: 0xffb703, outfit: 'tee', vest: 0xff9f1c, glasses: false, beard: false, skirt: false } },
    e_photog: { b: 'studio', name: 'Inès', role: 'Photographe', line: 'Mes photos attirent +30 % de clients.', look: { shirt: 0x222222, skin: 0xf1c27d, pants: 0x4a4e69, style: 'beanie', hat: 0xff6b9d, outfit: 'hoodie', glasses: true, beard: false, skirt: false } },
    e_cm: { b: 'bureau', name: 'Karim', role: 'Community manager', line: 'Je fais parler de ta boutique : +25 % de clients.', look: { shirt: 0xef476f, skin: 0x8d5524, pants: 0x2b2d42, style: 'curly', hair: 0x111111, outfit: 'hoodie', glasses: false, beard: false, skirt: false } },
    e_acc: { b: 'bureau', name: 'Chloé', role: 'Comptable', line: 'Je récupère des factures : +1 🪙 toutes les 20 s.', look: { shirt: 0xffffff, skin: 0xffdbac, pants: 0x264653, style: 'bun', hair: 0x2b1d0e, outfit: 'shirt', tie: 0x118ab2, glasses: true, beard: false, skirt: false } },
    e_driver: { b: 'expedition', name: 'Tom', role: 'Livreur', line: 'Je livre les colis en ville : +5 🪙 par tournée.', look: { shirt: 0xd62828, skin: 0xf1c27d, pants: 0x222222, style: 'cap', hat: 0xd62828, outfit: 'tee', vest: 0xffd166, glasses: false, beard: true, skirt: false } },
  };
  const S_ = {};   // employés actifs

  function steps(id) {
    const d = DEFS[STAFF[id].b], cx = d.cx, P = (x, z, sp) => ({ k: 'goto', x: cx + x, z, sp }), W = (x, z, sp) => ({ k: 'goto', x, z, sp });
    const doit = (fn) => ({ k: 'do', fn }), an = (mode, t, a) => ({ k: 'anim', mode, d: t, a });
    if (id === 'e_packer') return [an('type', 5, 0), doit((s) => carry(s, true)), P(-1.0, -0.2), P(-1.25, 2.1), doit((s) => { carry(s, false); spawnParcel(cx); }), P(-1.0, -0.2), P(-3, -0.2)];
    if (id === 'e_stocker') {
      const out = [W(cx - 4.6, -4.0), doit((s) => carry(s, true)), W(cx - 6.3, -4.0), W(cx - 6.3, 4.7), W(cx, 4.7), W(cx, 7.4), W(0, 7.4), W(0, 4.8), W(0, 1.2), W(-2.2, 1.2), W(-2.2, -0.45)];
      return [...out, doit((s) => { carry(s, false); earn(3, -2.2, -0.45); }), W(-2.2, 1.2), W(0, 1.2), W(0, 4.8), W(0, 7.4), W(cx, 7.4), W(cx, 4.7), W(cx - 6.3, 4.7), W(cx - 6.3, -4.0)].map((s) => ({ ...s, sp: s.sp || 2.0 }));
    }
    if (id === 'e_photog') return [an('shoot', 2.2, 2.0), doit(() => { doFlash(B.studio); earn(1, cx - 1.5, -2.3); }), an('idle', 1.6, 2.0), an('shoot', 1.6, 2.0), doit(() => doFlash(B.studio)), an('idle', 3.0, 2.0)];
    if (id === 'e_cm') return [an('sit', 6, 0), doit(() => floatEmoji(cx - 5, 2.4, -2.4, ['❤️', '💬', '📣', '👍'][Math.floor(Math.random() * 4)]))];
    if (id === 'e_acc') return [an('sit', 10, 0), doit(() => floatEmoji(cx - 1.7, 2.4, -2.4, '🧾')), an('sit', 10, 0), doit(() => { floatEmoji(cx - 1.7, 2.4, -2.4, '💶'); earn(1, cx - 1.7, -2.4); })];
    if (id === 'e_driver') {
      const sh = P(0, -3.4), side = P(-1.6, 2.2);
      return [sh, doit((s) => carry(s, true)), side, doit((s) => carry(s, false)), sh, doit((s) => carry(s, true)), side, doit((s) => carry(s, false)),
        P(-2.0, 3.4), doit((s) => { s.g.visible = false; departVan(); }), { k: 'wait', until: () => van && van.state === 'parked' }, doit((s) => { s.g.visible = true; s.g.position.set(cx - 2.0, 0, 3.4); })];
    }
    return [];
  }
  function startPos(id) {
    const cx = DEFS[STAFF[id].b].cx;
    return { e_packer: [cx - 3, -0.2, 0], e_stocker: [cx - 4.6, -4.0, 0], e_photog: [cx - 2.8, -2.3, 2.0], e_cm: [cx - 5, -2.3, 0], e_acc: [cx - 1.7, -2.3, 0], e_driver: [cx - 1.6, 2.2, 0] }[id];
  }
  function carry(s, on) {
    if (on && !s.box) { s.box = box(0.34, 0.28, 0.3, 0xd7b27a, 0, 0.35, 0.4); s.box.add(box(0.06, 0.29, 0.31, 0xf1e0b8, 0, 0, 0)); s.g.userData.upper.add(s.box); }
    if (!on && s.box) { s.g.userData.upper.remove(s.box); s.box = null; }
  }
  function spawnParcel(cx) {
    if (belt.length > 6) return;
    const m = box(0.5, 0.36, 0.4, 0xd7b27a, 0, 0, 0); m.add(box(0.08, 0.37, 0.41, 0xf1e0b8, 0, 0, 0)); m.position.set(cx - 0.4, 0.68, 2.9); scene.add(m); belt.push({ m, cx });
  }
  function departVan() {
    if (!van || van.state !== 'parked') return;
    const x = van.home.x;
    van.path = [{ x, z: 7.4 }, { x, z: 10.4 }, { x: 4, z: 10.4 }, { x: 4, z: 13.6 }, { x, z: 13.6 }, { x, z: 7.4 }, { x: van.home.x, z: van.home.z }];
    van.state = 'out';
  }
  function floatEmoji(x, y, z, ch) { const s = emojiSprite(ch, 0.55); s.position.set(x, y, z); scene.add(s); floats.push({ s, life: 2 }); }
  let floats = [], flash = 0, photoCooldown = 0;

  function hire(id) {
    const def = STAFF[id], g = makePerson(def.look), p = startPos(id);
    g.position.set(p[0], 0, p[1]); g.rotation.y = p[2]; scene.add(g);
    S_[id] = { id, def, g, steps: steps(id), i: 0, t: 0, box: null };
    popText(p[0], 2.8, p[1], `${def.name} embauché(e) !`);
  }
  function runStaff(s, dt, clock) {
    const st = s.steps[s.i];
    if (!st) return;
    const g = s.g, next = () => { s.i = (s.i + 1) % s.steps.length; s.t = 0; };
    if (st.k === 'goto') {
      const dx = st.x - g.position.x, dz = st.z - g.position.z, dist = Math.hypot(dx, dz), step = (st.sp || 1.7) * dt;
      if (dist <= step) { g.position.x = st.x; g.position.z = st.z; next(); animate(g, clock, dt, 'idle', 0); }
      else { g.position.x += (dx / dist) * step; g.position.z += (dz / dist) * step; faceTo(g, dx, dz, dt, 10); animate(g, clock, dt, 'walk', 1); }
    } else if (st.k === 'do') { st.fn(s); next(); }
    else if (st.k === 'anim') {
      s.t += dt; animate(g, clock, dt, st.mode, 0);
      if (st.a !== undefined) g.rotation.y += angleDiff(g.rotation.y, st.a) * Math.min(1, dt * 8);
      if (s.t >= st.d) next();
    } else if (st.k === 'wait') { animate(g, clock, dt, 'idle', 0); if (st.until()) next(); }
    if (s.box) { const u = g.userData; u.armL.sh.rotation.x = u.armR.sh.rotation.x = -1.15; u.armL.el.rotation.x = u.armR.el.rotation.x = -0.35; u.armL.sh.rotation.z = -0.12; u.armR.sh.rotation.z = 0.12; }
  }

  /* ---------- API pour world.js ---------- */
  function sync() {
    KEYS.forEach((k) => {
      const b = B[k], has = own(k);
      if (has && !b.built) { b.built = true; ({ entrepot: buildEntrepot, bureau: buildBureau, studio: buildStudio, expedition: buildExpedition })[k](b); b.appear = 0; if (b.firstSync !== undefined) popText(b.d.cx, 3.4, 7.2, `${b.d.icon} ${b.d.name} ouvert !`); }
      b.firstSync = true;
      if (b.root) b.root.visible = has;
      if (b.lot) b.lot.visible = !has;
    });
    Object.keys(STAFF).forEach((id) => { if (hired(id) && !S_[id] && own(STAFF[id].b) && B[STAFF[id].b].built) hire(id); });
    if (own('entrepot') && B.entrepot.built) placeEntrepotStock(B.entrepot);
    if (own('bureau') && B.bureau.built) drawChart(B.bureau);
    if (own('expedition') && B.expedition.built) placeParcels(B.expedition);
    if (own('studio') && B.studio.built && !studioItem) setTurnItem(B.studio);
  }
  function update(dt, clock) {
    KEYS.forEach((k) => { const b = B[k]; if (b.root && b.appear !== undefined && b.appear < 1) { b.appear = Math.min(1, b.appear + dt * 1.6); const e = 1 - Math.pow(1 - b.appear, 3); b.root.scale.y = Math.max(0.02, e); } });
    Object.values(S_).forEach((s) => runStaff(s, dt, clock));
    // convoyeur
    belt.forEach((p) => { p.m.position.x += 0.55 * dt; });
    belt = belt.filter((p) => { if (p.m.position.x > p.cx + 5.4) { scene.remove(p.m); return false; } return true; });
    // plateau tournant et flash
    if (B.studio.turn) B.studio.turn.rotation.y += dt * 0.8;
    if (photoCooldown > 0) photoCooldown -= dt;
    if (flash > 0) { flash = Math.max(0, flash - dt * 4); if (B.studio.flashLight) B.studio.flashLight.intensity = flash * 3.2; if (flash === 0 && B.studio.flashSprite) B.studio.flashSprite.visible = false; }
    // fourgon de livraison
    if (van && van.state === 'out') {
      const t = van.path[0];
      if (!t) { van.state = 'parked'; van.g.position.set(van.home.x, 0, van.home.z); van.g.rotation.y = 0; earn(5, van.home.x, van.home.z + 1.5); }
      else {
        const dx = t.x - van.g.position.x, dz = t.z - van.g.position.z, d = Math.hypot(dx, dz), step = van.speed * dt;
        if (d <= step) { van.g.position.x = t.x; van.g.position.z = t.z; van.path.shift(); }
        else { van.g.position.x += (dx / d) * step; van.g.position.z += (dz / d) * step; van.g.rotation.y += angleDiff(van.g.rotation.y, Math.atan2(dx, dz)) * Math.min(1, dt * 5); }
      }
    }
    // emojis qui flottent
    floats.forEach((f) => { f.life -= dt; f.s.position.y += 0.5 * dt; });
    floats = floats.filter((f) => { if (f.life <= 0) { scene.remove(f.s); return false; } return true; });
  }
  function spots() {
    const out = [];
    KEYS.forEach((k) => {
      const b = B[k];
      if (!own(k) && b.lotSpot) out.push(b.lotSpot);
      if (own(k) && b.built) { out.push(...b.spots); if (b.stockSpots && k === 'entrepot') out.push(...b.stockSpots); }
    });
    Object.values(S_).forEach((s) => out.push({ type: 'action', x: s.g.position.x, z: s.g.position.z, y: 2.15, label: s.def.name, sub: s.def.role, emoji: '👷', cta: 'Parler', range: 1.4, run: () => toast(`👷 ${s.def.name}, ${s.def.role} : « ${s.def.line} »`) }));
    return out;
  }
  function blocked(x, z, r, shop) {
    if (z >= 6.5) return z > 13.2 || Math.abs(x) > 52;
    if (z > 5.6) { if (x > BOUTIQUE_DOOR.x0 && x < BOUTIQUE_DOOR.x1) return false; return !KEYS.some((k) => own(k) && B[k].built && B[k].doors.some((dd) => x > dd.x0 && x < dd.x1)); }
    if (Math.abs(x) <= 8.2) return shop(x, z, r);
    const k = KEYS.find((kk) => Math.abs(x - DEFS[kk].cx) < 7);
    if (!k || !own(k) || !B[k].built) return true;
    const cx = DEFS[k].cx;
    if (x < cx - 6.7 || x > cx + 6.7 || z < -5.6) return true;
    return B[k].obstacles.some((o) => x > o[0] - r && x < o[1] + r && z > o[2] - r && z < o[3] + r);
  }
  function placeAt(x, z) {
    if (z >= 6.2) return 'Rue';
    if (Math.abs(x) <= 8.2) return 'Boutique';
    const k = KEYS.find((kk) => Math.abs(x - DEFS[kk].cx) < 7.2);
    return k ? DEFS[k].name : 'Rue';
  }
  const hiredCount = () => Object.keys(S_).length + (hired('clerk') ? 1 : 0);
  const bonus = () => ({
    rate: (hired('e_photog') ? 0.3 : 0) + (hired('e_cm') ? 0.25 : 0),
    cap: (hired('e_cm') ? 10 : 0) + (hired('e_stocker') ? 5 : 0),
    pay: hired('e_packer') ? 1 : 0,
  });
  const travel = (k) => (k === 'boutique' ? { x: 0, z: 7.4 } : { x: DEFS[k].cx, z: 7.4 });

  const debug = () => ({
    built: Object.fromEntries(KEYS.map((k) => [k, B[k].built])),
    lotsVisible: Object.fromEntries(KEYS.map((k) => [k, !!(B[k].lot && B[k].lot.visible)])),
    rootVisible: Object.fromEntries(KEYS.map((k) => [k, !!(B[k].root && B[k].root.visible)])),
    staff: Object.values(S_).map((s) => ({ id: s.id, x: s.g.position.x, z: s.g.position.z, box: !!s.box, step: s.steps[s.i] && s.steps[s.i].k, visible: s.g.visible })),
    belt: belt.length, van: van && { state: van.state, x: van.g.position.x, z: van.g.position.z }, stockSpots: B.entrepot.stockSpots ? B.entrepot.stockSpots.length : 0, chart: !!(B.bureau.chart && B.bureau.chart.material.map),
  });
  buildStreet();
  KEYS.forEach((k) => buildLot(B[k]));
  KEYS.forEach((k) => { B[k].lot.visible = true; });
  return { sync, update, spots, blocked, placeAt, bonus, travel, hiredCount, buildingCount: () => KEYS.filter(own).length, stockInEntrepot: () => own('entrepot'), DEFS, debug };
};
