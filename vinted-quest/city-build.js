'use strict';

/* Vinted City : bibliothèque de construction — bâtiments, terrains à vendre, rue, véhicules, employés.
   Coordonnées en mètres : x vers l'est, z vers le sud (vers la caméra par défaut), y vers le haut. */
window.VQB = (() => {
  const G = window.VQG;
  if (!G) return null;
  const { T, C, M, MU, lamp, flat, bx, cy, sp, pl, mergeStatic, tex, facade, glowSprite, emojiSprite, canvasTex, rand, pick, hash, lerp, clamp } = G;

  const LAYOUT = {
    boutique: { x: -22, z: 17, w: 18, d: 12, h: 5 },
    studio: { x: 22, z: 17, w: 16, d: 12, h: 5 },
    bureau: { x: 0, z: -24, w: 22, d: 16, h: 13 },
    entrepot: { x: -36, z: -23, w: 24, d: 16, h: 9 },
    expedition: { x: 36, z: -23, w: 26, d: 16, h: 7 },
  };
  const LANE = { west: -2, east: 2, sWest: 36.5, sEast: 40.5 };       // avenue : voie nord = vers l'ouest ; rue du Commerce (z=38,5) : idem
  const BRAND = 0x0f766e, GOLD = 0xf5b301, RED = 0xd62828;

  /* ---------- outils ---------- */
  function fadeKit() {
    const mats = [];
    const reg = (m, base = 1) => { m.transparent = true; m.userData.base = base; m.opacity = base; mats.push(m); return m; };
    return { mats, reg, mf: (hex, r = 0.8, mt = 0, o, base = 1) => reg(MU(hex, r, mt, o), base), apply(f) { mats.forEach((m) => { m.opacity = m.userData.base * (1 - 0.86 * f); m.depthWrite = f < 0.04; }); } };
  }
  function signTexture(text, bg, fg, w = 1024, h = 256, sub) {
    return canvasTex(w, h, (x, W, H) => {
      x.fillStyle = bg; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(255,255,255,.14)'; x.fillRect(0, 0, W, H * 0.45);
      x.fillStyle = fg; x.font = `bold ${sub ? 120 : 150}px system-ui,"Apple Color Emoji","Noto Color Emoji",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W / 2, sub ? H * 0.42 : H / 2 + 6, W - 60);
      if (sub) { x.font = `bold 62px system-ui,"Apple Color Emoji","Noto Color Emoji",sans-serif`; x.fillText(sub, W / 2, H * 0.8, W - 60); }
    });
  }
  const signPlane = (text, bg, fg, w, h, sub) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: signTexture(text, bg, fg, 1024, Math.round(1024 * h / w), sub), toneMapped: false })); return m; };
  function shellBox(w, d, h, mats) { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mats); m.position.y = h / 2; m.castShadow = m.receiveShadow = true; return m; }
  function parapet(S, w, d, y, mat, t = 0.5, hh = 0.55) {
    S.add(bx(w, hh, t, mat, 0, y + hh / 2, d / 2 - t / 2), bx(w, hh, t, mat, 0, y + hh / 2, -d / 2 + t / 2), bx(t, hh, d - 2 * t, mat, w / 2 - t / 2, y + hh / 2, 0), bx(t, hh, d - 2 * t, mat, -w / 2 + t / 2, y + hh / 2, 0));
  }
  function acUnit(S, x, y, z, mat) { S.add(bx(1.8, 1.0, 1.5, mat, x, y + 0.5, z)); const fan = cy(0.5, 0.5, 0.06, M(0x2b2f35, 0.5, 0.4), x, y + 1.03, z, 14); S.add(fan); return fan; }
  function fan(S, x, y, z, mat) {   // ventilateur de toit qui tourne
    const g = new T.Group(); g.position.set(x, y, z); g.add(cy(0.7, 0.8, 0.5, mat, 0, 0.25, 0, 14));
    const bl = new T.Group(); bl.position.y = 0.55; [0, 1, 2].forEach((i) => { const b = bx(0.1, 0.04, 0.6, M(0x222222, 0.5, 0.5), 0, 0, 0.32); const p = new T.Group(); p.rotation.y = (i * Math.PI * 2) / 3; p.add(b); bl.add(p); }); g.add(bl); S.add(g); return bl;
  }

  /* ---------- BOUTIQUE ---------- */
  function boutique(name) {
    const L = LAYOUT.boutique, { w, d, h } = L, fk = fadeKit(), root = new T.Group(), S = new T.Group(), I = new T.Group();
    root.position.set(L.x, 0, L.z);
    const plaster = (ww) => fk.reg(MU(0xeadcc2, 0.85, 0, { map: tex('concrete', [ww / 6, 1]) }));
    const roofMat = fk.reg(MU(0xffffff, 0.9, 0, { map: tex('roof', [w / 5, d / 5]) }));
    S.add(shellBox(w, d, h, [plaster(d), plaster(d), roofMat, roofMat, plaster(w), plaster(w)]));
    parapet(S, w, d, h, fk.mf(0xd9ccb2, 0.8), 0.5, 0.6);
    // vitrine
    const glass = fk.mf(0x9fd0ee, 0.06, 0.65, { envMapIntensity: 1.4 }, 0.42), frame = fk.mf(0x2b3138, 0.4, 0.6);
    S.add(bx(w - 3.4, 3.2, 0.15, glass, 0, 1.75, d / 2 + 0.06), bx(w - 3.2, 0.25, 0.3, frame, 0, 3.4, d / 2 + 0.1), bx(w - 3.2, 0.25, 0.3, frame, 0, 0.15, d / 2 + 0.1));
    for (let x = -w / 2 + 1.7; x <= w / 2 - 1.6; x += 3) S.add(bx(0.18, 3.3, 0.25, frame, x, 1.75, d / 2 + 0.1));
    S.add(bx(2.0, 2.7, 0.22, fk.mf(0x7ec6ea, 0.06, 0.65, {}, 0.5), -2.0, 1.4, d / 2 + 0.18));
    // auvent rayé
    for (let i = 0; i < 12; i++) { const stripe = bx((w - 2) / 12, 0.1, 2.2, fk.mf(i % 2 ? 0xffffff : RED, 0.85), -(w - 2) / 2 + (i + 0.5) * ((w - 2) / 12), 3.75, d / 2 + 1.1); stripe.rotation.x = 0.28; S.add(stripe); }
    // enseigne
    const band = bx(w - 8, 1.5, 0.25, fk.mf(0x1f2a2e, 0.5, 0.3), 0, 6.5, d / 2 - 0.3); band.rotation.x = -0.5; S.add(band);
    const sign = signPlane(name, '#1f2a2e', '#ffe39a', w - 8.6, 1.3); sign.position.set(0, 6.5, d / 2 - 0.15); sign.rotation.x = -0.5; root.add(sign);
    // toit
    const ac = fk.mf(0xc9ced3, 0.5, 0.5); const fans = [acUnit(S, -5, h, -2, ac), acUnit(S, -2.8, h, -2, ac), acUnit(S, 4, h, 1.5, ac)]; const spin = fan(S, 6, h, -2.4, ac);
    root.add(S);
    // intérieur : sol, gondoles, comptoir, réserve
    I.add(pl(w - 1, d - 1, M(0xe8e1d2, 0.45, 0.05), 0, 0.08, 0));
    const gond = [[-5.5, -1.0], [-1.8, -1.0], [1.8, -1.0], [5.5, -1.0]];
    gond.forEach(([x, z]) => { I.add(bx(3.4, 0.9, 1.5, M(0x9a6a3a, 0.7), x, 0.5, z), bx(3.5, 0.08, 1.6, M(0xc99a5b, 0.55), x, 0.99, z)); });
    I.add(bx(4.2, 1.0, 1.0, M(0x8a5a2b, 0.7), 4.6, 0.55, 3.9), bx(4.4, 0.1, 1.2, M(0xc99a5b, 0.5), 4.6, 1.08, 3.9), bx(0.6, 0.35, 0.45, M(0x2b2f35, 0.4, 0.4), 3.8, 1.3, 3.9));
    I.add(bx(w - 2, 0.9, 0.5, M(0x6f4a24, 0.8), 0, 0.5, -d / 2 + 0.6));
    const display = [], stock = [];
    gond.forEach(([x, z]) => { for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) display.push({ x: x + [-1.2, -0.4, 0.4, 1.2][k], y: 1.03, z: z + (r ? 0.4 : -0.4) }); });
    for (let r = 0; r < 2; r++) for (let k = 0; k < 16; k++) stock.push({ x: -8 + k * 1.07, y: 0.05, z: -d / 2 + 1.5 + r * 0.85 });
    root.add(I); I.visible = false;
    const site = new T.Group();    // parking devant la boutique (coordonnées monde)
    const pz = L.z + d / 2;        // façade
    const parking = { slots: [], aisle: pz + 7.0, entrance: { x: L.x - 11.5, z: LANE.sWest }, exit: { x: L.x + 11.5, z: LANE.sWest } };
    site.add(pl(27, 9, M(0x3b3e44, 0.95, 0, { map: tex('asphalt', [5, 2]) }), L.x, 0.03, pz + 4.5));
    site.add(pl(27, 1.6, M(0xc4c4bb, 0.9, 0, { map: tex('pavers', [5, 0.4]) }), L.x, 0.04, pz + 0.8));
    for (let i = 0; i <= 8; i++) site.add(bx(0.12, 0.02, 4.6, flat(0xf2f2f2), L.x - 10.8 + i * 2.7, 0.06, pz + 4.1));
    for (let i = 0; i < 8; i++) parking.slots.push({ x: L.x - 9.45 + i * 2.7, z: pz + 4.1 });
    site.add(bx(27, 0.2, 0.3, M(0x9a9a92, 0.8), L.x, 0.1, pz + 9.1));
    [-12.5, 12.5].forEach((px) => { [0, 1].forEach((k) => site.add(cy(0.5, 0.6, 0.5, M(0x8a8a82, 0.9), L.x + px, 0.25, pz + 1.2 + k * 6.2, 10), sp(0.7, M(0x3e9b4f, 0.9), L.x + px, 0.9, pz + 1.2 + k * 6.2, 10, 8))); });
    return { key: 'boutique', L, root, shell: S, fade: fk, interior: I, slots: { display, stock }, anchors: { door: { x: L.x - 2.0, z: pz + 0.8 }, counter: { x: L.x + 4.6, z: L.z + 3.9 }, wait: [{ x: L.x + 4.6, z: L.z + 5.1 }, { x: L.x + 4.6, z: L.z + 6.1 }, { x: L.x + 5.6, z: L.z + 6.1 }] }, parking, site, spin: [spin], fans, setName(n) { sign.material.map.dispose(); sign.material.map = signTexture(n, '#1f2a2e', '#ffe39a', 1024, Math.round(1024 * 0.8 / (w - 2.4))); sign.material.needsUpdate = true; }, gondolas: gond };
  }

  /* ---------- QG ---------- */
  function qg() {
    const L = LAYOUT.bureau, { w, d, h } = L, fk = fadeKit(), root = new T.Group(), S = new T.Group(), I = new T.Group();
    root.position.set(L.x, 0, L.z);
    const gE = fk.reg(facade('glass', 0x6f8da6, d, h)), gS = fk.reg(facade('glass', 0x6f8da6, w, h)), roofMat = fk.reg(MU(0xffffff, 0.9, 0, { map: tex('roof', [w / 5, d / 5]) }));
    S.add(shellBox(w, d, h, [gE, gE, roofMat, roofMat, gS, gS]));
    const metal = fk.mf(0xdfe5ea, 0.3, 0.8);
    S.add(bx(w + 0.4, 0.5, d + 0.4, metal, 0, h + 0.25, 0));
    parapet(S, w + 0.4, d + 0.4, h + 0.5, metal, 0.4, 0.7);
    // héliport, lucarne vitrée, climatisation
    S.add(cy(4.2, 4.2, 0.12, fk.mf(0x3d4349, 0.8), 5.5, h + 0.55, 2.5, 40));
    const H = new T.Mesh(new T.PlaneGeometry(6, 6), new T.MeshBasicMaterial({ map: canvasTex(256, 256, (x, W) => { x.clearRect(0, 0, W, W); x.strokeStyle = '#f5b301'; x.lineWidth = 12; x.beginPath(); x.arc(128, 128, 112, 0, 7); x.stroke(); x.fillStyle = '#f5b301'; x.font = 'bold 150px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('H', 128, 138); }), transparent: true })); H.rotation.x = -Math.PI / 2; H.position.set(5.5, h + 0.63, 2.5); S.add(H);
    S.add(bx(7, 0.25, 3, fk.mf(0x9fd0ee, 0.05, 0.7, { envMapIntensity: 1.5 }, 0.55), -4.5, h + 0.65, 1.0), bx(7.2, 0.45, 0.2, metal, -4.5, h + 0.62, 2.55), bx(7.2, 0.45, 0.2, metal, -4.5, h + 0.62, -0.55));
    const ac = fk.mf(0xc9ced3, 0.5, 0.5); acUnit(S, -8, h + 0.5, -4.5, ac); acUnit(S, -5.8, h + 0.5, -4.5, ac); const spin = [fan(S, 1, h + 0.5, -4.4, ac), fan(S, 8, h + 0.5, -4.4, ac)];
    // écran géant sur le toit (vrais bénéfices)
    const screenTex = canvasTex(1024, 380, (x, W, H2) => { x.fillStyle = '#12211f'; x.fillRect(0, 0, W, H2); });
    const screen = new T.Mesh(new T.PlaneGeometry(10.5, 3.9), new T.MeshBasicMaterial({ map: screenTex, toneMapped: false })); screen.position.set(-1.0, h + 2.6, d / 2 - 1.6); screen.rotation.x = -0.62; root.add(screen);
    S.add(bx(10.9, 0.3, 0.3, fk.mf(0x20262b, 0.5, 0.6), -1.0, h + 0.9, d / 2 - 1.15), bx(0.3, 2.0, 0.3, fk.mf(0x20262b, 0.5, 0.6), -5.9, h + 1.6, d / 2 - 1.35), bx(0.3, 2.0, 0.3, fk.mf(0x20262b, 0.5, 0.6), 3.9, h + 1.6, d / 2 - 1.35));
    // marquise d'entrée
    S.add(bx(7, 0.35, 3.2, fk.mf(0x1f2a2e, 0.4, 0.5), 0, 4.2, d / 2 + 1.6), bx(0.3, 4.2, 0.3, metal, -3.2, 2.1, d / 2 + 2.9), bx(0.3, 4.2, 0.3, metal, 3.2, 2.1, d / 2 + 2.9), bx(4.8, 3.6, 0.2, fk.mf(0x8fc4e6, 0.05, 0.7, { envMapIntensity: 1.4 }, 0.5), 0, 1.9, d / 2 + 0.12));
    const sign = signPlane('MAXSHOP', '#0f766e', '#ffffff', 5.6, 1.1, ''); sign.position.set(0, 4.75, d / 2 + 3.25); root.add(sign);
    // logo peint au sol sur la place
    root.add(S);
    // intérieur : bureaux, salle de réunion
    I.add(pl(w - 1, d - 1, M(0x93a8bd, 0.6, 0.05), 0, 0.1, 0));
    const desks = [];
    [-7, -3.4, 3.4, 7].forEach((x) => { [-3.2, 0.6].forEach((z) => { I.add(bx(2.6, 0.12, 1.1, M(0xc9a36b, 0.5), x, 0.8, z), bx(0.8, 0.5, 0.06, M(0x16181b, 0.3, 0.5), x, 1.1, z - 0.3), bx(0.7, 0.4, 0.02, flat(0x7dd3fc), x, 1.1, z - 0.27)); desks.push({ x, z }); }); });
    I.add(bx(5.4, 0.12, 2.4, M(0xe9e2d4, 0.4), 0, 0.85, 5.0)); I.add(bx(0.4, 0.85, 0.4, M(0x777777, 0.4, 0.5), 0, 0.42, 5.0));
    const site = new T.Group();
    site.add(pl(34, 9.5, M(0xc9c6bd, 0.85, 0, { map: tex('pavers', [7, 2]) }), L.x, 0.035, -10.9));
    site.add(cy(2.4, 2.4, 0.5, M(0xb7b4aa, 0.8), L.x + 9.5, 0.25, -10.5, 32), cy(1.9, 1.9, 0.42, M(0x6bb5e8, 0.05, 0.2, { transparent: true, opacity: 0.85, envMapIntensity: 1.5 }), L.x + 9.5, 0.45, -10.5, 32), cy(0.18, 0.18, 1.6, M(0xb7b4aa, 0.8), L.x + 9.5, 0.9, -10.5, 12));
    [-9.5, 9.5].forEach((px) => { site.add(cy(0.07, 0.09, 9, M(0xdadde0, 0.3, 0.8), L.x + px, 4.5, -8.5, 8)); });
    return { key: 'bureau', L, root, shell: S, fade: fk, interior: I, slots: { desks }, anchors: { door: { x: L.x, z: L.z + d / 2 + 3.4 }, desks: desks.map((p) => ({ x: L.x + p.x, z: L.z + p.z })), plaza: { x: L.x + 6, z: L.z + d / 2 + 5 } }, screen, spin, site, flagX: [L.x - 9.5, L.x + 9.5], setScreen(tex2) { screen.material.map.dispose(); screen.material.map = tex2; screen.material.needsUpdate = true; }, sign };
  }

  /* ---------- ENTREPÔT ---------- */
  function entrepot() {
    const L = LAYOUT.entrepot, { w, d, h } = L, fk = fadeKit(), root = new T.Group(), S = new T.Group(), I = new T.Group();
    root.position.set(L.x, 0, L.z);
    const wallM = (ww) => fk.reg(MU(0xffffff, 0.5, 0.45, { map: tex('metal', [ww / 3, 3]), envMapIntensity: 0.9 })), roofMat = fk.reg(MU(0xffffff, 0.5, 0.35, { map: tex('metal', [w / 3, d / 3]), color: C(0xaeb4ba) }));
    S.add(shellBox(w, d, h, [wallM(d), wallM(d), roofMat, roofMat, wallM(w), wallM(w)]));
    S.add(bx(w + 0.2, 1.4, 0.3, fk.mf(0x1d6fa5, 0.5, 0.2), 0, h - 1.0, d / 2 + 0.1), bx(w + 0.2, 0.35, d + 0.4, fk.mf(0x8a9097, 0.4, 0.5), 0, h + 0.05, 0));
    const sky = fk.mf(0xa7d6f0, 0.06, 0.7, { envMapIntensity: 1.5 }, 0.55);
    for (let i = 0; i < 5; i++) S.add(bx(3.4, 0.12, 5.5, sky, -9.6 + i * 4.8, h + 0.3, -2.0), bx(3.6, 0.22, 0.2, fk.mf(0x8a9097, 0.4, 0.5), -9.6 + i * 4.8, h + 0.25, -4.8), bx(3.6, 0.22, 0.2, fk.mf(0x8a9097, 0.4, 0.5), -9.6 + i * 4.8, h + 0.25, 0.8));
    const spin = [fan(S, -9, h + 0.3, 4.5, fk.mf(0xc9ced3, 0.5, 0.5)), fan(S, 9, h + 0.3, 4.5, fk.mf(0xc9ced3, 0.5, 0.5))];
    // portes de quai
    const doors = [-7, 0, 7];
    doors.forEach((x) => { S.add(bx(4.4, 4.2, 0.2, fk.mf(0x5f6770, 0.45, 0.6), x, 2.1, d / 2 + 0.12), bx(4.8, 0.4, 1.4, fk.mf(0xf5b301, 0.6), x, 4.55, d / 2 + 0.8)); for (let k = 0; k < 7; k++) S.add(bx(4.3, 0.04, 0.05, fk.mf(0x454b52, 0.5, 0.5), x, 0.5 + k * 0.58, d / 2 + 0.24)); });
    root.add(S);
    const sign = signPlane('ENTREPÔT', '#1d6fa5', '#ffffff', 8, 1.3, ''); sign.position.set(0, h + 1.4, d / 2 - 0.4); sign.rotation.x = -0.55; root.add(sign);
    // intérieur : racks avec stock
    I.add(pl(w - 1, d - 1, M(0xb9bcc2, 0.5, 0.15, { map: tex('concrete', [4, 3]) }), 0, 0.1, 0));
    const stock = [];
    [-4.6, 0, 4.6].forEach((z) => { I.add(bx(w - 3, 0.2, 1.6, M(0xf4a261, 0.5, 0.3), 0, 2.2, z), bx(0.2, 2.2, 1.6, M(0xf4a261, 0.5, 0.3), -w / 2 + 1.5, 1.1, z), bx(0.2, 2.2, 1.6, M(0xf4a261, 0.5, 0.3), w / 2 - 1.5, 1.1, z)); for (let k = 0; k < 12; k++) stock.push({ x: -w / 2 + 2.6 + k * 1.75, y: 2.3, z }); });
    I.add(bx(3.2, 0.12, 1.4, M(0xc9a36b, 0.5), -8, 0.95, 6.2), bx(10, 0.5, 1.2, M(0x3a3f47, 0.5, 0.4), 4, 0.35, 6.4));
    root.add(I); I.visible = false;
    const site = new T.Group();
    site.add(pl(w + 4, 9.5, M(0xb4b3ac, 0.9, 0, { map: tex('concrete', [6, 2]) }), L.x, 0.035, L.z + d / 2 + 4.9));
    [-7, 0, 7].forEach((x) => site.add(bx(0.2, 0.02, 7, flat(0xf5b301), L.x + x - 2.5, 0.07, L.z + d / 2 + 4.4)));
    // silos, citerne, clôture
    [[w / 2 + 3, 5], [w / 2 + 3, 0]].forEach(([dx, dz]) => { site.add(cy(1.5, 1.5, 8, M(0xdfe3e6, 0.3, 0.7), L.x + dx, 4, L.z + dz, 24), cy(1.5, 0.1, 1.2, M(0xcfd3d6, 0.3, 0.7), L.x + dx, 8.6, L.z + dz, 24)); });
    // palettes de cartons en cour (vrai stock)
    const yard = []; for (let p = 0; p < 6; p++) for (let k = 0; k < 4; k++) { const px = L.x - 10 + p * 4.2, pz = L.z + d / 2 + 2.2; yard.push({ x: px + (k % 2) * 1.1 - 0.55, y: 0.5, z: pz + Math.floor(k / 2) * 1.1 - 0.55 }); if (k === 0) site.add(bx(2.6, 0.18, 2.6, M(0xb98a55, 0.8), px, 0.15, pz)); }
    return { key: 'entrepot', L, root, shell: S, fade: fk, interior: I, slots: { stock, yard }, anchors: { pack: { x: L.x + 9, z: L.z + d / 2 + 4.2 }, door: { x: L.x, z: L.z + d / 2 + 2 }, driveway: { x: L.x + 14, z: -6 }, dock: [{ x: L.x - 7, z: -11.4 }, { x: L.x + 7, z: -11.4 }] }, site, spin };
  }

  /* ---------- CENTRE D'EXPÉDITION ---------- */
  function expedition() {
    const L = LAYOUT.expedition, { w, d, h } = L, fk = fadeKit(), root = new T.Group(), S = new T.Group(), I = new T.Group();
    root.position.set(L.x, 0, L.z);
    const wallM = (ww) => fk.reg(MU(0xf3f5f7, 0.45, 0.25, { map: tex('metal', [ww / 4, 2]), envMapIntensity: 0.9 })), roofMat = fk.reg(MU(0xffffff, 0.8, 0, { map: tex('roof', [w / 5, d / 5]) }));
    S.add(shellBox(w, d, h, [wallM(d), wallM(d), roofMat, roofMat, wallM(w), wallM(w)]));
    S.add(bx(w + 0.2, 1.6, 0.3, fk.mf(BRAND, 0.45, 0.2), 0, h - 1.2, d / 2 + 0.1), bx(w + 0.3, 0.3, d + 0.3, fk.mf(0xdfe5ea, 0.4, 0.6), 0, h + 0.05, 0));
    const sky = fk.mf(0xa7d6f0, 0.06, 0.7, { envMapIntensity: 1.5 }, 0.55);
    for (let i = 0; i < 6; i++) S.add(bx(3.0, 0.12, 4.5, sky, -9.8 + i * 3.9, h + 0.25, -1.5));
    const spin = [fan(S, -10, h + 0.3, 5, fk.mf(0xc9ced3, 0.5, 0.5)), fan(S, 10, h + 0.3, 5, fk.mf(0xc9ced3, 0.5, 0.5)), fan(S, 5, h + 0.3, -5.5, fk.mf(0xc9ced3, 0.5, 0.5))];
    // 4 quais de chargement
    const docks = [-9.2, -3.1, 3.0, 9.1];
    docks.forEach((x) => { S.add(bx(4.0, 3.6, 0.2, fk.mf(0x4a525a, 0.45, 0.6), x, 1.8, d / 2 + 0.12), bx(4.4, 0.35, 1.6, fk.mf(GOLD, 0.6), x, 3.95, d / 2 + 0.9), bx(0.5, 1.2, 0.4, fk.mf(0x222222, 0.9), x - 2.0, 0.7, d / 2 + 0.5), bx(0.5, 1.2, 0.4, fk.mf(0x222222, 0.9), x + 2.0, 0.7, d / 2 + 0.5)); for (let k = 0; k < 6; k++) S.add(bx(3.9, 0.04, 0.05, fk.mf(0x32373d, 0.5, 0.5), x, 0.5 + k * 0.55, d / 2 + 0.24)); });
    root.add(S);
    const sign = signPlane('EXPÉDITION', '#0f766e', '#ffffff', 9, 1.4, ''); sign.position.set(0, h + 1.5, d / 2 - 0.4); sign.rotation.x = -0.55; root.add(sign);
    const truck = emojiSprite('🚚', 3.2); truck.position.set(-8, h + 5.2, d / 2 - 1); root.add(truck);
    I.add(pl(w - 1, d - 1, M(0xbdbdb5, 0.5, 0.15, { map: tex('concrete', [4, 3]) }), 0, 0.1, 0));
    for (let i = 0; i < 3; i++) I.add(bx(w - 4, 0.4, 0.9, M(0x3a3f47, 0.5, 0.4), 0, 0.5, -4.5 + i * 3.4), bx(w - 4, 0.06, 0.8, M(0x22262b, 0.6, 0.2), 0, 0.72, -4.5 + i * 3.4));
    for (let k = 0; k < 14; k++) I.add(bx(0.8, 0.55, 0.6, M(0xd7b27a, 0.8), -9 + k * 1.4, 0.95, -4.5 + (k % 3) * 3.4));
    root.add(I); I.visible = false;
    const site = new T.Group();
    site.add(pl(w + 6, 9.5, M(0xb4b3ac, 0.9, 0, { map: tex('concrete', [7, 2]) }), L.x, 0.035, L.z + d / 2 + 4.9));
    site.add(bx(w + 6, 0.02, 0.16, flat(0xf2f2f2), L.x, 0.07, L.z + d / 2 + 8.2), bx(w + 6, 0.02, 0.16, flat(0xf5b301), L.x, 0.07, L.z + d / 2 + 1.6));
    docks.forEach((x) => site.add(bx(3.2, 0.02, 0.5, flat(0xf5b301), L.x + x, 0.075, L.z + d / 2 + 2.6)));
    // colis en cour (vrais envois de la semaine)
    const parcels = []; for (let p = 0; p < 6; p++) { const px = L.x + 16 + (p % 2) * 3.6, pz = L.z + d / 2 + 1.8 + Math.floor(p / 2) * 2.4; site.add(bx(2.8, 0.16, 2.2, M(0xb98a55, 0.8), px, 0.14, pz)); for (let k = 0; k < 3; k++) parcels.push({ x: px + (k - 1) * 0.85, y: 0.22, z: pz }); }
    const gate = { x: L.x - 14, z: -6.4 };
    return { key: 'expedition', L, root, shell: S, fade: fk, interior: I, slots: { parcels }, anchors: { docks: docks.map((x) => ({ x: L.x + x, z: L.z + d / 2 + 3.4 })), lane: -11.6, enter: { x: L.x + 20, z: -6 }, exit: { x: L.x - 16, z: -6 }, crew: { x: L.x + 2, z: L.z + d / 2 + 1.2 } }, site, spin, gate };
  }

  /* ---------- STUDIO PHOTO ---------- */
  function studio() {
    const L = LAYOUT.studio, { w, d, h } = L, fk = fadeKit(), root = new T.Group(), S = new T.Group(), I = new T.Group();
    root.position.set(L.x, 0, L.z);
    const white = fk.mf(0xf4f4f1, 0.5, 0.1), glass = fk.mf(0xbfe3f5, 0.04, 0.7, { envMapIntensity: 1.6 }, 0.28), frame = fk.mf(0x20262b, 0.4, 0.6);
    S.add(bx(w, 0.3, d, white, 0, 0.15, 0), bx(w + 0.6, 0.4, d + 0.6, white, 0, h + 0.2, 0));
    S.add(bx(w, h, 0.2, glass, 0, h / 2, d / 2), bx(0.2, h, d, glass, w / 2, h / 2, 0), bx(0.2, h, d, glass, -w / 2, h / 2, 0), bx(w, h, 0.2, white, 0, h / 2, -d / 2));
    for (let x = -w / 2; x <= w / 2 + 0.1; x += w / 4) S.add(bx(0.22, h, 0.3, frame, x, h / 2, d / 2));
    S.add(bx(w + 0.4, 0.3, 0.4, frame, 0, h + 0.3, d / 2 + 0.2), bx(w + 0.6, 0.25, d + 0.6, fk.mf(0xdfe5ea, 0.4, 0.6), 0, h + 0.55, 0));
    root.add(S);
    const sign = signPlane('STUDIO', '#2b1d33', '#ff9ecf', 4.4, 1.0, ''); sign.position.set(0, h + 1.0, d / 2 + 0.2); sign.rotation.x = -0.4; root.add(sign);
    // intérieur visible à travers le verre
    I.add(pl(w - 1, d - 1, M(0xfafafa, 0.25, 0.1), 0, 0.32, 0));
    I.add(bx(10, 3.6, 0.2, M(0xffffff, 0.6), 0, 1.8 + 0.3, -d / 2 + 0.7), bx(9, 0.04, 4.2, M(0xffffff, 0.2), 0, 0.36, -d / 2 + 2.8));
    [[-5.4, -1.2], [5.4, -1.2]].forEach(([x, z]) => { I.add(bx(0.5, 1.6, 1.3, lamp(0xfff4d6, 0.7), x, 1.5, z), cy(0.04, 0.04, 1.0, M(0x333333, 0.5, 0.6), x, 0.7, z, 8)); });
    const turn = new T.Group(); turn.position.set(0, 0.36, -1.5); turn.add(cy(1.1, 1.1, 0.2, M(0xf2f2f2, 0.3, 0.2), 0, 0.1, 0, 28), cy(1.1, 1.1, 0.03, M(0xff6b9d, 0.35, 0.2), 0, 0.22, 0, 28)); I.add(turn);
    I.add(bx(0.5, 0.4, 0.4, M(0x1d1d1d, 0.4, 0.5), -4.2, 1.7, 0.6), cy(0.03, 0.03, 1.7, M(0x333333, 0.5, 0.6), -4.2, 0.9, 0.6, 6));
    I.add(bx(2.4, 0.06, 0.1, M(0x888888, 0.4, 0.6), 5.2, 1.7, 2.5), bx(2.2, 0.8, 0.05, M(0xef476f, 0.8), 5.2, 1.3, 2.5));
    root.add(I);
    const site = new T.Group(); site.add(pl(w + 4, 8, M(0xc9c6bd, 0.85, 0, { map: tex('pavers', [4, 2]) }), L.x, 0.035, L.z + d / 2 + 4.0));
    return { key: 'studio', L, root, shell: S, fade: fk, interior: I, anchors: { door: { x: L.x, z: L.z + d / 2 + 2.4 }, shoot: { x: L.x - 3.2, z: L.z + 0.6 }, stage: { x: L.x, z: L.z - 1.5 } }, turn, site, spin: [], alwaysVisible: true };
  }

  /* ---------- terrains à vendre ---------- */
  function lot(key, name, icon, price) {
    const L = LAYOUT[key], g = new T.Group(), S = new T.Group();
    g.position.set(L.x, 0, L.z);
    S.add(pl(L.w + 4, L.d + 4, M(0xa08560, 1, 0, { map: tex('gravel', [4, 3]) }), 0, 0.03, 0));
    const fenceM = M(0x2b3138, 0.5, 0.6), hw = (L.w + 4) / 2, hd = (L.d + 4) / 2;
    for (let x = -hw; x <= hw; x += 2.2) { S.add(cy(0.07, 0.07, 1.6, fenceM, x, 0.8, hd, 6), cy(0.07, 0.07, 1.6, fenceM, x, 0.8, -hd, 6)); }
    for (let z = -hd; z <= hd; z += 2.2) { S.add(cy(0.07, 0.07, 1.6, fenceM, hw, 0.8, z, 6), cy(0.07, 0.07, 1.6, fenceM, -hw, 0.8, z, 6)); }
    S.add(bx(L.w + 4, 0.06, 0.06, fenceM, 0, 1.5, hd), bx(L.w + 4, 0.06, 0.06, fenceM, 0, 1.5, -hd), bx(0.06, 0.06, L.d + 4, fenceM, hw, 1.5, 0), bx(0.06, 0.06, L.d + 4, fenceM, -hw, 1.5, 0));
    for (let i = 0; i < 5; i++) S.add(cy(0.0, 0.32, 0.8, M(0xff6a1a, 0.6), -hw + 2 + i * 1.2, 0.4, hd + 0.6, 12), cy(0.4, 0.4, 0.05, M(0xffffff, 0.6), -hw + 2 + i * 1.2, 0.55, hd + 0.6, 12));
    S.add(bx(2.4, 1.3, 2.4, M(0xc69c6d, 0.85), -hw + 3, 0.65, -2), bx(2.0, 1.1, 2.0, M(0xd7b27a, 0.85), hw - 3, 0.55, 1));
    // grue
    const yellow = M(0xf5b301, 0.5, 0.3);
    const board = new T.Mesh(new T.PlaneGeometry(6.2, 3.1), new T.MeshBasicMaterial({ map: canvasTex(640, 320, (x, W, H) => { x.fillStyle = '#c1121f'; x.fillRect(0, 0, W, H); x.fillStyle = '#fff'; x.fillRect(14, 14, W - 28, H - 28); x.fillStyle = '#c1121f'; x.font = 'bold 84px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('À VENDRE', W / 2, 78); x.fillStyle = '#12211f'; x.font = 'bold 52px system-ui,"Apple Color Emoji","Noto Color Emoji",sans-serif'; x.fillText(`${icon} ${name}`, W / 2, 170, W - 50); x.fillStyle = '#b45309'; x.font = 'bold 60px system-ui,"Apple Color Emoji","Noto Color Emoji",sans-serif'; x.fillText(`${price} 🪙`, W / 2, 246); }), toneMapped: false })); board.position.set(0, 2.3, hd - 1.4); board.rotation.x = -0.35;
    g.add(board, bx(0.25, 2.4, 0.25, M(0x6f4a24, 0.8), -2.6, 1.2, hd - 1.4), bx(0.25, 2.4, 0.25, M(0x6f4a24, 0.8), 2.6, 1.2, hd - 1.4));
    S.add(bx(0.7, 13, 0.7, yellow, hw - 2.5, 6.5, -hd + 2.5), bx(1.4, 0.6, 1.4, M(0x555b62, 0.5, 0.5), hw - 2.5, 0.3, -hd + 2.5));
    g.add(mergeStatic(S));
    const mobile = new T.Group(); mobile.position.set(hw - 2.5, 0, -hd + 2.5); const mj = new T.Group(); mj.position.y = 13.2; mj.add(bx(11, 0.5, 0.5, yellow, -3.2, 0, 0), bx(3, 1.4, 1.2, M(0x555b62, 0.6, 0.4), 3.2, -0.3, 0), bx(1.2, 1.2, 1.2, yellow, 0.3, 0.9, 0), cy(0.03, 0.03, 4.5, M(0x222222, 0.5), -6.5, -2.3, 0, 6), bx(0.9, 0.5, 0.9, M(0xd62828, 0.5), -6.5, -4.7, 0)); mobile.add(mj); g.add(mobile);
    return { key, L, group: g, jib: mj, hit: { x: L.x, z: L.z, w: L.w + 4, d: L.d + 4 }, anchor: { x: L.x, z: L.z + L.d / 2 + 4 } };
  }

  /* ---------- rue, décor, ville au loin ---------- */
  function street() {
    const S = new T.Group();
    S.add(pl(280, 8, M(0x3b3e44, 0.95, 0, { map: tex('asphalt', [70, 2]) }), 0, 0.02, 0));
    S.add(pl(280, 2.5, M(0xc2c0b8, 0.9, 0, { map: tex('pavers', [70, 0.6]) }), 0, 0.04, -5.25), pl(280, 2.5, M(0xc2c0b8, 0.9, 0, { map: tex('pavers', [70, 0.6]) }), 0, 0.04, 5.25));
    S.add(bx(280, 0.16, 0.3, M(0xa5a49c, 0.8), 0, 0.08, -4.1), bx(280, 0.16, 0.3, M(0xa5a49c, 0.8), 0, 0.08, 4.1));
    for (let x = -138; x < 138; x += 5) S.add(bx(2.4, 0.02, 0.18, flat(0xf2f2f2), x, 0.05, 0));
    S.add(bx(280, 0.02, 0.14, flat(0xf2f2f2), 0, 0.05, -3.6), bx(280, 0.02, 0.14, flat(0xf2f2f2), 0, 0.05, 3.6));
    for (let i = 0; i < 9; i++) S.add(bx(0.7, 0.02, 7.2, flat(0xf2f2f2), -10 + i * 1.3, 0.055, 0));
    // rue du Commerce (devant la boutique et le studio)
    S.add(pl(280, 8, M(0x3b3e44, 0.95, 0, { map: tex('asphalt', [70, 2]) }), 0, 0.02, 38.5));
    S.add(pl(280, 2.5, M(0xc2c0b8, 0.9, 0, { map: tex('pavers', [70, 0.6]) }), 0, 0.04, 33.25), pl(280, 2.5, M(0xc2c0b8, 0.9, 0, { map: tex('pavers', [70, 0.6]) }), 0, 0.04, 43.75));
    S.add(bx(280, 0.16, 0.3, M(0xa5a49c, 0.8), 0, 0.08, 34.6), bx(280, 0.16, 0.3, M(0xa5a49c, 0.8), 0, 0.08, 42.4));
    for (let x = -138; x < 138; x += 5) S.add(bx(2.4, 0.02, 0.18, flat(0xf2f2f2), x, 0.05, 38.5));
    S.add(bx(280, 0.02, 0.14, flat(0xf2f2f2), 0, 0.05, 35.1), bx(280, 0.02, 0.14, flat(0xf2f2f2), 0, 0.05, 41.9));
    // routes de raccordement (ouest et est) qui relient l'avenue à la rue du Commerce
    [-58, 58].forEach((cx) => {
      S.add(pl(8, 39, M(0x3b3e44, 0.95, 0, { map: tex('asphalt', [2, 10]) }), cx, 0.021, 19.5), pl(2.5, 36, M(0xc2c0b8, 0.9, 0, { map: tex('pavers', [0.6, 9]) }), cx - 5.25, 0.04, 19), pl(2.5, 36, M(0xc2c0b8, 0.9, 0, { map: tex('pavers', [0.6, 9]) }), cx + 5.25, 0.04, 19));
      for (let z = 5; z < 34; z += 5) S.add(bx(0.18, 0.02, 2.4, flat(0xf2f2f2), cx, 0.055, z));
    });
    // lampadaires
    const poles = [];
    for (let x = -64; x <= 64; x += 16) [[-5.7, 1], [5.7, -1]].forEach(([z, s]) => { S.add(cy(0.09, 0.12, 7.5, M(0xdadde0, 0.35, 0.8), x, 3.75, z, 8), bx(0.1, 0.1, 2.0, M(0xdadde0, 0.35, 0.8), x, 7.4, z - s * 1.0)); const lm = lamp(0xfff0c2, 0.2); S.add(bx(0.7, 0.14, 0.4, lm, x, 7.3, z - s * 1.9)); poles.push({ x, z: z - s * 1.9 }); });
    // arbres
    const tr = (x, z, sc = 1) => { S.add(cy(0.14 * sc, 0.2 * sc, 2.2 * sc, M(0x6f4a2a, 0.9), x, 1.1 * sc, z, 6)); [[0, 3.2, 0, 1.7], [0.7, 2.7, 0.3, 1.2], [-0.6, 2.8, -0.4, 1.25]].forEach(([dx, dy, dz, r], i) => { const f = new T.Mesh(new T.IcosahedronGeometry(r * sc, 1), M(pick([0x3e9b4f, 0x4caf50, 0x2f8a45, 0x5bb85f]), 0.9)); f.position.set(x + dx * sc, dy * sc, z + dz * sc); f.castShadow = f.receiveShadow = true; S.add(f); }); };
    for (let x = -66; x <= 66; x += 8) { if (Math.abs(x % 16) < 1) continue; tr(x, 7.1, 0.9); tr(x + 3, -7.1, 0.9); tr(x, 44.2, 0.9); }
    for (let x = -64; x <= 64; x += 16) { S.add(cy(0.09, 0.12, 7.5, M(0xdadde0, 0.35, 0.8), x, 3.75, 33.2, 8), bx(0.1, 0.1, 2.0, M(0xdadde0, 0.35, 0.8), x, 7.4, 34.2)); const lm = lamp(0xfff0c2, 0.2); S.add(bx(0.7, 0.14, 0.4, lm, x, 7.3, 35.1)); poles.push({ x, z: 35.1 }); }
    [[-66, 24], [-50, 24], [-34, 26], [-8, 24], [10, 25], [40, 25], [56, 22], [66, 24], [-64, -8], [66, -10], [-8, 9], [8, 9], [-40, 9], [40, 9]].forEach(([x, z]) => tr(x, z, 1.15));
    // bancs, abri de bus
    [[-14, 5.9], [30, 5.9], [-30, -5.9], [14, -5.9]].forEach(([x, z]) => S.add(bx(1.8, 0.1, 0.5, M(0x8a5a2b, 0.7), x, 0.55, z), bx(1.8, 0.5, 0.08, M(0x8a5a2b, 0.7), x, 0.85, z + (z > 0 ? 0.25 : -0.25)), bx(0.1, 0.5, 0.4, M(0x333333, 0.5, 0.6), x - 0.8, 0.28, z), bx(0.1, 0.5, 0.4, M(0x333333, 0.5, 0.6), x + 0.8, 0.28, z)));
    S.add(bx(4.2, 0.12, 1.8, M(0x2b3138, 0.4, 0.6), 46, 3.0, 5.4), bx(4.2, 2.8, 0.06, M(0x9fd0ee, 0.05, 0.7, { transparent: true, opacity: 0.35, envMapIntensity: 1.5 }), 46, 1.5, 6.2), bx(0.1, 3, 0.1, M(0x2b3138, 0.4, 0.6), 44, 1.5, 6.2), bx(0.1, 3, 0.1, M(0x2b3138, 0.4, 0.6), 48, 1.5, 6.2));
    // ville au loin
    const fm = [facade('office', 0xb7b9bb, 20, 30), facade('glass', 0x6f8da6, 20, 30), facade('office', 0xc9b8a0, 20, 30)];
    for (let i = 0; i < 46; i++) {
      const side = Math.random() < 0.5 ? -1 : 1, x = rand(-170, 170), z = side * rand(60, 150) + (side > 0 ? 40 : 0), bw = rand(10, 24), bd = rand(10, 24), bh = rand(10, 46);
      if (Math.abs(x) < 82 && z > -60 && z < 66) continue;
      const m = fm[i % 3]; S.add(new T.Mesh(new T.BoxGeometry(bw, bh, bd), m)); const bm = S.children[S.children.length - 1]; bm.position.set(x, bh / 2, z); bm.castShadow = false; bm.receiveShadow = true;
    }
    const out = mergeStatic(S, {}); out.userData.poles = poles;
    return { group: out, poles };
  }

  /* ---------- véhicules ---------- */
  const paint = (hex) => M(hex, 0.3, 0.55, { envMapIntensity: 1.2 });
  const glassDark = () => M(0x10161c, 0.05, 0.9, { envMapIntensity: 1.6 });
  function wheel(r, w) { const g = new T.Group(); g.add(cy(r, r, w, M(0x15171a, 0.9), 0, 0, 0, 16), cy(r * 0.55, r * 0.55, w + 0.02, M(0xb9bec4, 0.3, 0.8), 0, 0, 0, 10)); g.rotation.x = Math.PI / 2; const o = new T.Group(); o.add(g); return o; }
  function car(color) {
    const g = new T.Group(), wheels = [];
    g.add(bx(4.2, 0.65, 1.8, paint(color), 0, 0.72, 0), bx(2.3, 0.62, 1.62, glassDark(), -0.15, 1.28, 0), bx(2.1, 0.08, 1.5, paint(color), -0.15, 1.62, 0), bx(0.12, 0.2, 0.5, lamp(0xfff2c9, 0.4), 2.12, 0.78, 0.6), bx(0.12, 0.2, 0.5, lamp(0xfff2c9, 0.4), 2.12, 0.78, -0.6), bx(0.1, 0.2, 0.55, lamp(0xff2a2a, 0.35), -2.12, 0.8, 0.62), bx(0.1, 0.2, 0.55, lamp(0xff2a2a, 0.35), -2.12, 0.8, -0.62), bx(0.1, 0.3, 1.5, M(0x222222, 0.5), 2.14, 0.5, 0));
    [[1.3, 0.95], [1.3, -0.95], [-1.3, 0.95], [-1.3, -0.95]].forEach(([x, z]) => { const w = wheel(0.38, 0.28); w.position.set(x, 0.38, z); g.add(w); wheels.push(w); });
    return { g, wheels, len: 4.2 };
  }
  function truck(opts = {}) {
    const g = new T.Group(), wheels = [], cab = opts.cab || RED;
    const box = opts.branded ? 0xf6f8fa : pick([0xe9edf0, 0xd9dee2, 0xc9d6df]);
    g.add(bx(6.8, 2.7, 2.5, M(box, 0.4, 0.2), -1.0, 2.35, 0), bx(1.9, 2.3, 2.4, paint(cab), 3.4, 1.6, 0), bx(0.12, 1.0, 2.1, glassDark(), 4.36, 2.0, 0), bx(8.8, 0.5, 2.1, M(0x2b2f35, 0.7, 0.4), 0.1, 0.7, 0), bx(0.5, 0.5, 2.5, M(0x555b62, 0.5, 0.6), 4.35, 0.75, 0));
    g.add(bx(0.12, 0.3, 0.55, lamp(0xfff2c9, 0.4), 4.42, 1.0, 0.8), bx(0.12, 0.3, 0.55, lamp(0xfff2c9, 0.4), 4.42, 1.0, -0.8), bx(0.1, 0.35, 0.6, lamp(0xff2a2a, 0.35), -4.42, 1.0, 0.9), bx(0.1, 0.35, 0.6, lamp(0xff2a2a, 0.35), -4.42, 1.0, -0.9));
    g.add(bx(0.2, 0.5, 0.2, M(0x222222, 0.4, 0.6), 3.7, 2.6, 1.35), bx(0.2, 0.5, 0.2, M(0x222222, 0.4, 0.6), 3.7, 2.6, -1.35));
    if (opts.branded) {
      const logo = new T.Mesh(new T.PlaneGeometry(5.4, 2.0), new T.MeshBasicMaterial({ map: canvasTex(540, 200, (x, W, H) => { x.fillStyle = '#0f766e'; x.fillRect(0, H * 0.62, W, H * 0.38); x.fillStyle = '#0f766e'; x.font = 'bold 92px system-ui,"Apple Color Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('MaxShop', W / 2, H * 0.34); x.fillStyle = '#fff'; x.font = 'bold 40px system-ui,"Apple Color Emoji","Noto Color Emoji",sans-serif'; x.fillText('Colis Vinted · livraison express', W / 2, H * 0.8); }), transparent: true }));
      const l1 = logo.clone(), l2 = logo.clone(); l1.position.set(-1.0, 2.35, 1.27); l2.position.set(-1.0, 2.35, -1.27); l2.rotation.y = Math.PI; g.add(l1, l2);
      const roofLogo = new T.Mesh(new T.PlaneGeometry(5.2, 2.2), new T.MeshBasicMaterial({ map: canvasTex(520, 220, (x, W, H) => { x.fillStyle = '#0f766e'; x.fillRect(0, 0, W, H); x.fillStyle = '#fff'; x.font = 'bold 110px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('MaxShop', W / 2, H / 2); }) })); roofLogo.rotation.x = -Math.PI / 2; roofLogo.position.set(-1.0, 3.72, 0); g.add(roofLogo);
    }
    [[3.2, 1.05], [3.2, -1.05], [-0.9, 1.05], [-0.9, -1.05], [-2.4, 1.05], [-2.4, -1.05]].forEach(([x, z]) => { const w = wheel(0.52, 0.34); w.position.set(x, 0.52, z); g.add(w); wheels.push(w); });
    return { g, wheels, len: 9 };
  }
  function van(color = 0xffffff) {
    const g = new T.Group(), wheels = [];
    g.add(bx(4.6, 1.9, 2.0, M(color, 0.35, 0.3), 0, 1.45, 0), bx(1.2, 1.0, 1.9, glassDark(), 2.0, 1.75, 0), bx(0.12, 0.25, 0.5, lamp(0xfff2c9, 0.4), 2.32, 0.9, 0.7), bx(0.12, 0.25, 0.5, lamp(0xfff2c9, 0.4), 2.32, 0.9, -0.7), bx(0.1, 0.3, 0.5, lamp(0xff2a2a, 0.35), -2.32, 1.0, 0.8), bx(0.1, 0.3, 0.5, lamp(0xff2a2a, 0.35), -2.32, 1.0, -0.8), bx(4.5, 0.55, 2.0, M(BRAND, 0.4, 0.4), 0, 0.75, 0));
    [[1.5, 0.95], [1.5, -0.95], [-1.4, 0.95], [-1.4, -0.95]].forEach(([x, z]) => { const w = wheel(0.4, 0.3); w.position.set(x, 0.4, z); g.add(w); wheels.push(w); });
    return { g, wheels, len: 4.6 };
  }
  function forklift() {
    const g = new T.Group(), yellow = M(0xf5b301, 0.5, 0.3);
    g.add(bx(2.4, 1.0, 1.4, yellow, 0, 0.9, 0), bx(0.12, 2.4, 1.2, M(0x333333, 0.4, 0.6), 1.3, 1.3, 0), bx(1.3, 0.1, 0.18, M(0x555b62, 0.4, 0.6), 1.9, 0.25, 0.4), bx(1.3, 0.1, 0.18, M(0x555b62, 0.4, 0.6), 1.9, 0.25, -0.4), bx(1.0, 0.05, 1.2, M(0x333333, 0.5), -0.3, 1.9, 0), bx(0.06, 1.0, 0.06, M(0x333333, 0.5), 0.2, 1.4, 0.55), bx(0.06, 1.0, 0.06, M(0x333333, 0.5), 0.2, 1.4, -0.55), bx(0.06, 1.0, 0.06, M(0x333333, 0.5), -0.8, 1.4, 0.55), bx(0.06, 1.0, 0.06, M(0x333333, 0.5), -0.8, 1.4, -0.55), bx(0.5, 0.2, 1.0, lamp(0xff8a00, 0.6), -0.3, 2.0, 0));
    [[0.7, 0.7], [0.7, -0.7], [-0.8, 0.7], [-0.8, -0.7]].forEach(([x, z]) => { const w = wheel(0.32, 0.26); w.position.set(x, 0.32, z); g.add(w); });
    return { g, wheels: [], len: 3 };
  }

  /* ---------- employés et passants ---------- */
  const SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac], SHIRTS = [0xef476f, 0x118ab2, 0x06d6a0, 0xffd166, 0x9b5de5, 0xf15bb5, 0x00bbf9, 0xfb8500], PANTS = [0x264653, 0x3a506b, 0x5c4033, 0x2b2d42, 0x4a4e69], HAIRS = [0x2b1d0e, 0x5a3825, 0xc9a227, 0x111111, 0xa0522d, 0x9e9e9e];
  function worker(o = {}) {
    const g = new T.Group(), skin = o.skin ?? pick(SKINS), shirt = o.shirt ?? pick(SHIRTS), pants = o.pants ?? pick(PANTS), hair = o.hair ?? pick(HAIRS), s = o.scale || 1;
    const shadow = new T.Mesh(new T.CircleGeometry(0.45, 14), new T.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.2, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.05; g.add(shadow);
    const limb = (ww, hh, dd, mat, x, y) => { const p = new T.Group(); const m = bx(ww, hh, dd, mat, 0, -hh / 2, 0); p.add(m); p.position.set(x, y, 0); g.add(p); return p; };
    const u = g.userData = { phase: Math.random() * 6, legL: limb(0.2, 0.8, 0.24, M(pants, 0.8), -0.14, 0.85), legR: limb(0.2, 0.8, 0.24, M(pants, 0.8), 0.14, 0.85), armL: limb(0.14, 0.7, 0.16, M(shirt, 0.8), -0.4, 1.55), armR: limb(0.14, 0.7, 0.16, M(shirt, 0.8), 0.4, 1.55) };
    const torso = cy(0.3, 0.34, 0.75, M(shirt, 0.8), 0, 1.25, 0, 12); g.add(torso); u.torso = torso;
    if (o.vest) g.add(cy(0.315, 0.355, 0.5, M(o.vest, 0.7), 0, 1.28, 0, 12), bx(0.62, 0.07, 0.62, M(0xffffff, 0.5), 0, 1.15, 0));
    g.add(sp(0.23, M(skin, 0.7), 0, 1.86, 0, 12, 10), sp(0.13, M(skin, 0.7), 0, 1.84, 0.21, 8, 6));
    if (o.hat) { const hh = new T.Mesh(new T.SphereGeometry(0.27, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), M(o.hat, 0.45, 0.1)); hh.position.y = 1.9; hh.castShadow = true; g.add(hh, bx(0.5, 0.04, 0.18, M(o.hat, 0.45), 0, 1.9, 0.25)); }
    else { const hh = new T.Mesh(new T.SphereGeometry(0.245, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), M(hair, 0.8)); hh.position.y = 1.9; hh.rotation.x = -0.25; hh.castShadow = true; g.add(hh); }
    if (o.long) g.add(bx(0.46, 0.5, 0.14, M(hair, 0.8), 0, 1.65, -0.2));
    g.scale.setScalar(s); return g;
  }
  function walk(g, t, amt, carry) {
    const u = g.userData, s = Math.sin(t * 9 + u.phase) * 0.8 * amt;
    u.legL.rotation.x = s; u.legR.rotation.x = -s;
    if (carry) { u.armL.rotation.x = u.armR.rotation.x = -1.2; } else { u.armL.rotation.x = -s * 0.9; u.armR.rotation.x = s * 0.9; }
    u.torso.position.y = 1.25 + Math.abs(Math.sin(t * 9 + u.phase)) * 0.03 * amt;
  }
  function sit(g, t) { const u = g.userData; u.legL.rotation.x = u.legR.rotation.x = -1.4; u.armL.rotation.x = -0.9 + Math.sin(t * 11) * 0.12; u.armR.rotation.x = -0.9 + Math.sin(t * 11 + 2) * 0.12; }

  /* ---------- objets en 3D (articles) ---------- */
  const PALETTE = [0xe76f51, 0x2a9d8f, 0xe9c46a, 0x6a4c93, 0x4361ee, 0xf28482, 0x84a59d, 0x8d99ae];
  const tn = (c, f) => { const k = new T.Color(c); return k.multiplyScalar(f).getHex(); };
  const ITEM = {
    vetements(c) { const g = new T.Group(); g.add(bx(0.5, 0.07, 0.42, M(c, 0.85), 0, 0.035), bx(0.5, 0.07, 0.42, M(tn(c, 0.85), 0.85), 0, 0.105), bx(0.16, 0.02, 0.07, M(0xffffff, 0.8), 0, 0.145, 0.12)); return g; },
    chaussures(c) { const g = new T.Group(); [-0.12, 0.12].forEach((x) => g.add(bx(0.17, 0.06, 0.42, M(0xf2f2f2, 0.6), x, 0.03), bx(0.15, 0.14, 0.26, M(c, 0.6), x, 0.13, 0.06))); return g; },
    accessoires(c) { const g = new T.Group(); g.add(bx(0.42, 0.3, 0.14, M(c, 0.6), 0, 0.17)); const h = new T.Mesh(new T.TorusGeometry(0.1, 0.017, 6, 14, Math.PI), M(0x2b2b2b, 0.5)); h.position.y = 0.32; g.add(h); return g; },
    jeux(c) { const g = new T.Group(); g.add(bx(0.3, 0.4, 0.04, M(c, 0.5), 0, 0.22), bx(0.26, 0.12, 0.05, M(0xffffff, 0.5), 0, 0.34)); return g; },
    livres(c) { const g = new T.Group(); g.add(bx(0.36, 0.07, 0.26, M(c, 0.8), 0, 0.035), bx(0.34, 0.07, 0.25, M(tn(c, 0.7), 0.8), 0.01, 0.105), bx(0.35, 0.07, 0.26, M(0xf4e9d8, 0.8), 0, 0.175)); return g; },
    maison(c) { const g = new T.Group(); g.add(cy(0.12, 0.09, 0.26, M(c, 0.4), 0, 0.13), sp(0.15, M(tn(c, 1.1), 0.4), 0, 0.2)); return g; },
    jouets(c) { const g = new T.Group(); g.add(sp(0.17, M(c, 0.9), 0, 0.2), sp(0.12, M(c, 0.9), 0, 0.44), sp(0.05, M(tn(c, 0.8), 0.9), -0.1, 0.55), sp(0.05, M(tn(c, 0.8), 0.9), 0.1, 0.55)); return g; },
    autre(c) { const g = new T.Group(); g.add(bx(0.36, 0.3, 0.3, M(0xc69c6d, 0.85), 0, 0.15)); return g; },
  };
  const itemMesh = (it) => (ITEM[it.category] || ITEM.autre)(PALETTE[hash(it.title || it.id) % PALETTE.length]);
  function carton(it, s = 1) {
    const g = new T.Group(); g.add(bx(0.7, 0.5, 0.52, M(0xc69c6d, 0.85), 0, 0.25), bx(0.1, 0.51, 0.53, M(0xe3c79a, 0.8), 0, 0.25));
    const l = new T.Mesh(new T.PlaneGeometry(0.3, 0.3), new T.MeshBasicMaterial({ color: C(PALETTE[hash(it.category || '') % PALETTE.length]) })); l.rotation.x = -Math.PI / 2; l.position.set(0.18, 0.512, 0.0); g.add(l);
    g.scale.setScalar(s); return g;
  }

  return { LAYOUT, LANE, BRAND, boutique, qg, entrepot, expedition, studio, lot, street, car, truck, van, forklift, worker, walk, sit, itemMesh, carton, signTexture, signPlane, fadeKit, PALETTE };
})();
