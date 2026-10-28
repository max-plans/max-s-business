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
/* Objets de la vitrine de l'espace perso : un objet par catégorie, à la couleur de la catégorie, avec une étiquette de prix qui porte son nom et ses chiffres.
   Même interface que FripeBox (glow, open, dispose). Les pièces animées sont des enfants directs de l'objet pour que le reflet les suive. */
window.FripeObject = function (T, p, n) {
  const KIND = { 'Vêtements': 'pull', 'Chaussures': 'sneaker', 'Sacs': 'bag', 'Accessoires': 'cap', 'Jeux & jouets': 'pad', 'Maison': 'lamp' };
  const kind = KIND[p.name] || 'tee';
  const geos = [], mats = [], texs = [], G = (g) => (geos.push(g), g), M = (m) => (mats.push(m), m);
  const col = new T.Color(p.hex).convertSRGBToLinear(), deep = col.clone().multiplyScalar(.62);
  const std = (o) => M(new T.MeshStandardMaterial(Object.assign({ roughness: .6, metalness: .03 }, o)));
  const main = std({ color: col, emissive: col, emissiveIntensity: .12 });
  const rib = std({ color: deep, emissive: deep, emissiveIntensity: .1, roughness: .75 });
  const dark = std({ color: 0x16161b, roughness: .5, metalness: .15 });
  const light = std({ color: 0xf3f0ea, roughness: .55, emissive: 0xf3f0ea, emissiveIntensity: .06 });
  const metal = std({ color: 0xd9b45a, roughness: .28, metalness: .9 });
  const mesh = (g, m, x, y, z) => { const o = new T.Mesh(G(g), m); o.position.set(x || 0, y || 0, z || 0); return o; };
  const extrude = (shape, depth, bevel, m) => { const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * .8, bevelSegments: 8, curveSegments: 40 }); g.translate(0, 0, -depth / 2); return new T.Mesh(G(g), m); };
  const mirror = (pts) => pts.concat(pts.slice().reverse().map(([x, y]) => [-x, y]));
  const poly = (pts) => { const sh = new T.Shape(); pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y))); sh.closePath(); return sh; };
  const root = new T.Group(), body = new T.Group(); root.add(body);
  let anchor = [0, .5, 0], bulb = null;

  /* maille : côtes verticales pour le pull et le T-shirt */
  const knit = () => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 32) { const gr = g.createLinearGradient(x, 0, x + 32, 0); gr.addColorStop(0, '#cfcfcf'); gr.addColorStop(.35, '#ffffff'); gr.addColorStop(.7, '#e4e4e4'); gr.addColorStop(1, '#a9a9a9'); g.fillStyle = gr; g.fillRect(x, 0, 32, 256); }
    for (let y = 0; y < 256; y += 8) { g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(0, y, 256, 2); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(5, 5); t.anisotropy = 16; texs.push(t); return t;
  };

  /* impressions : texte peint dans une texture haute définition, posé juste au-dessus de la surface */
  const painters = [], prints = [];
  const COND = 'Anton, Impact, "Arial Narrow", sans-serif', MONO = '"IBM Plex Mono", ui-monospace, monospace';
  const fit = (g, txt, size, weight, fam, maxW) => { let fs = size; g.font = `${weight} ${fs}px ${fam}`; while (g.measureText(txt).width > maxW && fs > 10) { fs -= 2; g.font = `${weight} ${fs}px ${fam}`; } return fs; };
  const spaced = (g, txt, x, y, sp) => { const w = [...txt].reduce((a, ch) => a + g.measureText(ch).width, 0) + sp * (txt.length - 1); let cx = x - w / 2; g.textAlign = 'left'; [...txt].forEach((ch) => { g.fillText(ch, cx, y); cx += g.measureText(ch).width + sp; }); g.textAlign = 'center'; };
  const stats = String(p.stat || '').split('·').map((x) => x.trim()).filter(Boolean);
  const printed = (geo, cw, ch, draw, o) => {
    const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d');
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 16; texs.push(t);
    const paint = () => { g.clearRect(0, 0, cw, ch); g.textAlign = 'center'; g.textBaseline = 'alphabetic'; draw(g, cw, ch); t.needsUpdate = true; };
    painters.push(paint); paint();
    const m = M(new T.MeshStandardMaterial(Object.assign({ map: t, transparent: true, roughness: .7, metalness: 0, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .07, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false }, o)));
    prints.push(m); return new T.Mesh(G(geo), m);
  };
  /* grain de sérigraphie : de minuscules manques dans l'encre */
  const wear = (g, w, h, n) => { g.save(); g.globalCompositeOperation = 'destination-out'; let k = 91 + n * 7; for (let i = 0; i < w * h / 900; i++) { k = (k * 1103515245 + 12345) & 0x7fffffff; const x = k % w; k = (k * 1103515245 + 12345) & 0x7fffffff; const y = k % h; g.globalAlpha = .25 + (k % 50) / 100; g.fillRect(x, y, 1 + (k % 3), 1 + ((k >> 4) % 2)); } g.restore(); };
  const INK = '#f3f0ea', DARK = '#0c0c0f', NAME = p.name.toUpperCase();

  if (kind === 'pull' || kind === 'tee') {
    const tee = kind === 'tee';
    const half = tee
      ? [[0, -.5], [.4, -.5], [.41, .14], [.7, -.06], [.82, .14], [.46, .5], [.16, .56]]
      : [[0, -.6], [.42, -.6], [.43, .12], [.78, -.42], [.92, -.32], [.5, .5], [.17, .6]];
    const sh = new T.Shape(); sh.moveTo(half[0][0], half[0][1]);
    half.slice(1).forEach(([x, y]) => sh.lineTo(x, y));
    sh.quadraticCurveTo(0, tee ? .38 : .42, -half[half.length - 1][0], half[half.length - 1][1]);
    half.slice(1, -1).reverse().forEach(([x, y]) => sh.lineTo(-x, y)); sh.lineTo(0, half[0][1]);
    const mat = std({ color: col, emissive: col, emissiveIntensity: .12, map: knit(), roughness: .85 });
    const top = extrude(sh, .2, .06, mat); body.add(top);
    if (!tee) {
      body.add(mesh(new T.BoxGeometry(.86, .1, .34), rib, 0, -.6, 0));
      [-1, 1].forEach((sd) => { const c = mesh(new T.BoxGeometry(.22, .09, .3), rib, sd * .85, -.37, 0); c.rotation.z = sd * .62; body.add(c); });
      const neck = mesh(new T.TorusGeometry(.17, .035, 16, 56, Math.PI), rib, 0, .6, .15); neck.rotation.z = Math.PI; body.add(neck);
      const chest = printed(new T.PlaneGeometry(.66, .4), 1024, 620, (g, w, h) => {
        g.fillStyle = INK; fit(g, 'FRIPE', 330, 400, COND, w * .9); g.fillText('FRIPE', w / 2, 330);
        g.fillRect(w * .12, 372, w * .76, 8);
        g.font = `500 ${fit(g, NAME, 70, 500, MONO, w * .8)}px ${MONO}`; spaced(g, NAME, w / 2, 466, 10);
        if (stats[0]) { g.globalAlpha = .75; g.font = `500 ${fit(g, stats.join('  ·  '), 46, 500, MONO, w * .84)}px ${MONO}`; g.fillText(stats.join('  ·  '), w / 2, 548); g.globalAlpha = 1; }
        wear(g, w, h, n);
      }); chest.position.set(0, .02, .162); body.add(chest);
      anchor = [-.5, .44, .2];
    } else {
      const neck = mesh(new T.TorusGeometry(.16, .025, 16, 56, Math.PI), rib, 0, .56, .14); neck.rotation.z = Math.PI; body.add(neck);
      /* cintre */
      const pts = [[.07, .66], [.02, .74], [-.05, .7], [-.06, .64], [0, .58], [0, .56], [-.72, .2], [-.74, .14], [.74, .14], [.72, .2], [0, .56]].map(([x, y]) => new T.Vector3(x, y + .02, 0));
      const hanger = mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts, false, 'catmullrom', .2), 240, .022, 12, false), metal); body.add(hanger);
      const chest = printed(new T.PlaneGeometry(.56, .4), 1024, 730, (g, w, h) => {
        g.fillStyle = INK; g.beginPath(); g.arc(w / 2, 130, 92, 0, Math.PI * 2); g.lineWidth = 14; g.strokeStyle = INK; g.stroke();
        g.font = `400 120px ${COND}`; g.fillText('F', w / 2, 174);
        fit(g, 'FRIPE', 250, 400, COND, w * .86); g.fillText('FRIPE', w / 2, 480);
        g.font = `500 ${fit(g, NAME, 62, 500, MONO, w * .8)}px ${MONO}`; spaced(g, NAME, w / 2, 572, 9);
        if (stats[0]) { g.globalAlpha = .75; g.font = `500 ${fit(g, stats.join('  ·  '), 42, 500, MONO, w * .84)}px ${MONO}`; g.fillText(stats.join('  ·  '), w / 2, 650); g.globalAlpha = 1; }
        wear(g, w, h, n);
      }); chest.position.set(0, -.04, .162); body.add(chest);
      top.position.y = -.08; body.position.y = -.08; anchor = [.62, .2, .18];
    }
  } else if (kind === 'sneaker') {
    const sole = new T.Shape(); sole.moveTo(-.68, -.36); sole.lineTo(.62, -.36); sole.quadraticCurveTo(.82, -.36, .8, -.22); sole.lineTo(-.74, -.22); sole.quadraticCurveTo(-.78, -.36, -.68, -.36);
    const soleM = extrude(sole, .44, .03, light); body.add(soleM);
    const out = mesh(new T.BoxGeometry(1.48, .03, .46), dark, .03, -.38, 0); body.add(out);
    const up = new T.Shape(); up.moveTo(-.72, -.22); up.lineTo(-.74, .1); up.quadraticCurveTo(-.72, .24, -.56, .24); up.quadraticCurveTo(-.36, .18, -.2, .22); up.lineTo(-.05, .36); up.quadraticCurveTo(.02, .38, .06, .32); up.lineTo(.5, .02); up.quadraticCurveTo(.76, -.06, .76, -.22); up.lineTo(-.72, -.22);
    body.add(extrude(up, .3, .07, main));
    /* bande latérale claire des deux côtés */
    const stripe = new T.Shape(); stripe.moveTo(-.5, -.14); stripe.quadraticCurveTo(-.1, -.12, .3, .1); stripe.lineTo(.36, .02); stripe.quadraticCurveTo(-.05, -.2, -.48, -.2); stripe.lineTo(-.5, -.14);
    [-1, 1].forEach((sd) => { const m = extrude(stripe, .02, 0, light); m.position.z = sd * .22; body.add(m); });
    /* lacets et ouverture */
    for (let i = 0; i < 4; i++) { const l = mesh(new T.CylinderGeometry(.014, .014, .3, 6), light, -.02 + i * .11, .3 - i * .075, 0); l.rotation.x = Math.PI / 2; body.add(l); }
    const hole = mesh(new T.CircleGeometry(.16, 24), dark, -.42, .23, 0); hole.rotation.x = -Math.PI / 2; hole.scale.set(1.3, .7, 1); body.add(hole);
    [-1, 1].forEach((sd) => {
      const sl = printed(new T.PlaneGeometry(1.02, .1), 1024, 100, (g, w) => { g.fillStyle = DARK; g.font = `500 ${fit(g, `FRIPE®  ·  ${NAME}  ·  ${stats[0] || 'VINTED'}`, 50, 500, MONO, w * .72)}px ${MONO}`; spaced(g, `FRIPE®  ·  ${NAME}  ·  ${stats[0] || 'VINTED'}`, w / 2, 68, 3); });
      sl.position.set(.03, -.29, sd * .252); if (sd < 0) sl.rotation.y = Math.PI; body.add(sl);
      const heel = printed(new T.PlaneGeometry(.34, .16), 512, 240, (g, w) => { g.fillStyle = INK; fit(g, 'FRIPE', 210, 400, COND, w * .92); g.fillText('FRIPE', w / 2, 200); });
      heel.position.set(-.5, .04, sd * .222); if (sd < 0) heel.rotation.y = Math.PI; body.add(heel);
    });
    body.position.y = .08; anchor = [-.62, .3, .27];
  } else if (kind === 'bag') {
    const r = .08, w0 = .64, w1 = .5, h = .42, b = new T.Shape();
    b.moveTo(-w0 + r, -h); b.lineTo(w0 - r, -h); b.quadraticCurveTo(w0, -h, w0, -h + r); b.lineTo(w1, h - r); b.quadraticCurveTo(w1, h, w1 - r, h); b.lineTo(-w1 + r, h); b.quadraticCurveTo(-w1, h, -w1, h - r); b.lineTo(-w0, -h + r); b.quadraticCurveTo(-w0, -h, -w0 + r, -h);
    body.add(extrude(b, .38, .06, main));
    const fl = new T.Shape(); fl.moveTo(-.54, .44); fl.lineTo(.54, .44); fl.lineTo(.6, .02); fl.quadraticCurveTo(0, -.16, -.6, .02); fl.lineTo(-.54, .44);
    const flap = extrude(fl, .03, .015, rib); flap.position.z = .26; body.add(flap);
    body.add(mesh(new T.BoxGeometry(.16, .1, .05), metal, 0, -.02, .29));
    const handle = mesh(new T.TorusGeometry(.34, .04, 20, 80, Math.PI), rib, 0, .46, 0); body.add(handle);
    [-1, 1].forEach((sd) => body.add(mesh(new T.CylinderGeometry(.05, .05, .04, 16), metal, sd * .34, .47, 0)));
    const foil = printed(new T.PlaneGeometry(.8, .24), 1024, 308, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#b8902f'); gr.addColorStop(.45, '#f6dc8a'); gr.addColorStop(.6, '#fff1c0'); gr.addColorStop(1, '#c9a043'); g.fillStyle = gr;
      fit(g, 'FRIPE', 210, 400, COND, w * .62); spaced(g, 'FRIPE', w / 2, 196, 8);
      g.font = `500 ${fit(g, `${NAME}  —  PARIS`, 46, 500, MONO, w * .8)}px ${MONO}`; spaced(g, `${NAME}  —  PARIS`, w / 2, 268, 8);
    }, { emissiveIntensity: .12, metalness: .6, roughness: .35 }); foil.position.set(0, .24, .297); body.add(foil);
    anchor = [.34, .5, .04];
  } else if (kind === 'cap') {
    const crown = mesh(new T.SphereGeometry(.5, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2), main, 0, -.12, 0); crown.scale.set(1, .82, 1.04); body.add(crown);
    body.add(mesh(new T.SphereGeometry(.055, 16, 12), rib, 0, .29, 0));
    const brim = mesh(new T.CylinderGeometry(.52, .52, .035, 96, 1, false, -Math.PI / 2, Math.PI), rib, 0, -.12, .02); brim.scale.set(1, 1, 1.45); brim.rotation.x = .1; body.add(brim);
    const badge = printed(new T.PlaneGeometry(.34, .17), 768, 384, (g, w, h) => {
      const r = 46; g.fillStyle = INK; g.beginPath(); g.moveTo(r, 0); g.arcTo(w, 0, w, h, r); g.arcTo(w, h, 0, h, r); g.arcTo(0, h, 0, 0, r); g.arcTo(0, 0, w, 0, r); g.fill();
      g.strokeStyle = p.css; g.lineWidth = 12; g.beginPath(); g.moveTo(r + 18, 22); g.arcTo(w - 22, 22, w - 22, h - 22, r - 18); g.arcTo(w - 22, h - 22, 22, h - 22, r - 18); g.arcTo(22, h - 22, 22, 22, r - 18); g.arcTo(22, 22, w - 22, 22, r - 18); g.stroke();
      g.fillStyle = DARK; fit(g, 'FRIPE', 210, 400, COND, w * .8); g.fillText('FRIPE', w / 2, 232);
      g.fillStyle = p.css; g.font = `500 ${fit(g, NAME, 50, 500, MONO, w * .8)}px ${MONO}`; spaced(g, NAME, w / 2, 316, 6);
    }, { transparent: false, alphaTest: .5, depthWrite: true, emissiveIntensity: .06 }); badge.position.set(0, .08, .468); badge.rotation.x = -.42; body.add(badge);
    body.scale.setScalar(1.3); body.position.y = -.05; anchor = [.5, -.02, -.25];
  } else if (kind === 'pad') {
    const s = new T.Shape(); s.moveTo(-.35, .3);
    const half = [[.35, .3], [.62, .3, .78, .2, .84, 0], [.9, -.2, .92, -.46, .78, -.52], [.66, -.58, .56, -.46, .48, -.32], [.42, -.22, .3, -.18, 0, -.18]];
    s.lineTo(.35, .3); half.slice(1).forEach((c) => s.bezierCurveTo(...c));
    [[-.3, -.18, -.42, -.22, -.48, -.32], [-.56, -.46, -.66, -.58, -.78, -.52], [-.92, -.46, -.9, -.2, -.84, 0], [-.78, .2, -.62, .3, -.35, .3]].forEach((c) => s.bezierCurveTo(...c));
    body.add(extrude(s, .16, .07, main));
    const zt = .16;
    [[.26, .07], [.07, .26]].forEach(([w, hh]) => body.add(mesh(new T.BoxGeometry(w, hh, .05), dark, -.48, .06, zt)));
    [[.48, .17], [.48, -.05], [.37, .06], [.59, .06]].forEach(([x, y], i) => { const bt = mesh(new T.CylinderGeometry(.05, .05, .05, 20), i % 2 ? light : dark, x, y, zt); bt.rotation.x = Math.PI / 2; body.add(bt); });
    [-.2, .2].forEach((x) => { const a = mesh(new T.CylinderGeometry(.085, .09, .05, 24), dark, x, -.12, zt); a.rotation.x = Math.PI / 2; body.add(a); const c = mesh(new T.CylinderGeometry(.065, .065, .04, 24), light, x, -.12, zt + .04); c.rotation.x = Math.PI / 2; body.add(c); });
    [-1, 1].forEach((sd) => body.add(mesh(new T.BoxGeometry(.3, .06, .12), dark, sd * .56, .33, 0)));
    body.add(mesh(new T.BoxGeometry(.16, .05, .02), light, 0, .16, zt));
    const logo = printed(new T.PlaneGeometry(.34, .12), 768, 272, (g, w) => {
      g.fillStyle = INK; fit(g, 'FRIPE', 170, 400, COND, w * .74); spaced(g, 'FRIPE', w / 2, 168, 12);
      g.globalAlpha = .8; g.font = `500 ${fit(g, NAME, 44, 500, MONO, w * .9)}px ${MONO}`; spaced(g, NAME, w / 2, 244, 5);
    }); logo.position.set(0, .05, .153); body.add(logo);
    body.rotation.x = -.5; body.scale.setScalar(1.15); anchor = [.7, .32, -.05];
  } else if (kind === 'lamp') {
    body.add(mesh(new T.CylinderGeometry(.3, .36, .08, 80), dark, 0, -.52, 0));
    body.add(mesh(new T.CylinderGeometry(.028, .028, .62, 12), metal, 0, -.18, 0));
    const shade = mesh(new T.CylinderGeometry(.24, .46, .46, 96, 1, true), std({ color: col, emissive: col, emissiveIntensity: .2, side: T.DoubleSide, roughness: .8 }), 0, .3, 0); body.add(shade);
    [[.24, .53], [.46, .07]].forEach(([r, y]) => { const t = mesh(new T.TorusGeometry(r, .014, 12, 96), metal, 0, y, 0); t.rotation.x = Math.PI / 2; body.add(t); });
    const band = printed(new T.CylinderGeometry(.2435, .4635, .46, 96, 1, true, -1.15, 2.3), 1024, 440, (g, w, h) => {
      g.fillStyle = DARK; g.globalAlpha = .86; g.fillRect(0, 70, w, 4); g.fillRect(0, h - 62, w, 4);
      fit(g, 'FRIPE', 200, 400, COND, w * .5); spaced(g, 'FRIPE', w / 2, 262, 22);
      g.font = `500 ${fit(g, `${NAME}${stats[0] ? '  ·  ' + stats[0] : ''}`, 44, 500, MONO, w * .7)}px ${MONO}`; spaced(g, `${NAME}${stats[0] ? '  ·  ' + stats[0] : ''}`, w / 2, 342, 6);
    }, { side: T.FrontSide }); band.position.y = .3; body.add(band);
    bulb = std({ color: 0xfff1cf, emissive: 0xffc96b, emissiveIntensity: .8 });
    body.add(mesh(new T.SphereGeometry(.11, 32, 24), bulb, 0, .16, 0));
    body.scale.setScalar(1.25); anchor = [.56, .2, .05];
  }

  /* étiquette de prix : papier, bande couleur, nom de la catégorie, chiffres, code-barres */
  const tc = document.createElement('canvas'); tc.width = 512; tc.height = 768; const tg = tc.getContext('2d');
  const tagTex = new T.CanvasTexture(tc); tagTex.encoding = T.sRGBEncoding; tagTex.anisotropy = 16; texs.push(tagTex);
  const paintTag = () => {
    const g = tg, w = 256, h = 384, name = p.name.toUpperCase();
    g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, w, h); g.fillStyle = '#f3f0ea'; g.fillRect(0, 0, w, h);
    g.fillStyle = p.css; g.fillRect(0, 0, w, 92);
    g.fillStyle = '#0c0c0f'; g.beginPath(); g.arc(w / 2, 40, 14, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0c0c0f'; g.textAlign = 'center'; g.font = '400 38px Anton, Impact, sans-serif'; g.fillText('FRIPE®', w / 2, 136);
    let fs = 54; g.font = `400 ${fs}px Anton, Impact, sans-serif`; while (g.measureText(name).width > 220 && fs > 24) { fs -= 2; g.font = `400 ${fs}px Anton, Impact, sans-serif`; }
    g.fillStyle = p.css; g.fillText(name, w / 2, 198);
    g.fillStyle = '#0c0c0f'; g.font = '500 17px "IBM Plex Mono", monospace';
    String(p.stat || '').split('·').map((x) => x.trim()).filter(Boolean).slice(0, 2).forEach((l, i) => g.fillText(l, w / 2, 240 + i * 26));
    let x = 40, k = 7 + n * 13; g.fillStyle = '#0c0c0f'; while (x < 216) { k = (k * 1103515245 + 12345) & 0x7fffffff; const bw = 1 + (k % 4); g.fillRect(x, 300, bw, 46); x += bw + 1 + ((k >> 3) % 3); }
    tagTex.needsUpdate = true;
  };
  paintTag(); if (document.fonts) { const all = () => { paintTag(); painters.forEach((f) => f()); }; Promise.all([document.fonts.load(`400 40px ${COND}`), document.fonts.load(`500 20px ${MONO}`)]).then(all, all); }
  const tagMat = std({ map: tagTex, emissive: 0xffffff, emissiveMap: tagTex, emissiveIntensity: .25, side: T.DoubleSide, roughness: .8 });
  const baseY = body.position.y;
  const tag = new T.Group(); tag.position.set(anchor[0], anchor[1] + body.position.y, anchor[2]);
  const card = mesh(new T.PlaneGeometry(.3, .45), tagMat, 0, -.3, 0); tag.add(card);
  tag.add(mesh(new T.CylinderGeometry(.005, .005, .09, 6), dark, 0, -.04, 0));
  root.add(tag);

  const glowMats = mats.filter((m) => m.emissive && m !== bulb && m !== tagMat && m !== light && !prints.includes(m) && m.emissiveIntensity > 0);
  const baseGlow = glowMats.map((m) => m.emissiveIntensity);
  root.userData = {
    glow(v) { glowMats.forEach((m, i) => { m.emissiveIntensity = baseGlow[i] * (.6 + v * 2.2); }); tagMat.emissiveIntensity = .15 + v * .5; if (bulb) bulb.emissiveIntensity = .5 + v * 3; },
    open(v) { body.position.y = baseY + v * .1; body.rotation.y = v * .35; tag.rotation.set(0, v * .7, -.12 + v * .35); },
    dispose() { geos.forEach((g) => g.dispose()); mats.forEach((m) => m.dispose()); texs.forEach((t) => t.dispose()); }
  };
  return root;
};

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
  renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio || 1, 1.5), 2.5));
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
    const m = (window.FripeObject || window.FripeBox)(T, { name: d.name, hex: d.hex, css: d.css, stat: d.label }, i), g = new T.Group(); g.add(m); world.add(g);
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
      b.g.position.set(x, y, z); b.g.scale.setScalar(.9 + near * .22);
      b.g.rotation.set(Math.sin(t * .8 + i) * .03, o * .38 + near * (-.42 + Math.sin(t * .55) * .42) + sp * .5, -o * .06);
      b.g.visible = b.rg.visible = Math.abs(o) < 3.2 && rise > 0;
      b.m.userData.glow(.14 + near * .28);
      b.open += ((i === sel ? .55 * e : 0) - b.open) * k; b.m.userData.open(b.open);
      b.rg.position.copy(b.g.position); b.rg.rotation.copy(b.g.rotation); b.rg.scale.copy(b.g.scale);
      b.m.children.forEach((c, ci) => { const rc = b.rm.children[ci]; rc.position.copy(c.position); rc.rotation.copy(c.rotation); rc.scale.copy(c.scale); });
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
