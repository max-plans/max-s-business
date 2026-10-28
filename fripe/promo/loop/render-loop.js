// Rendu de la boucle 1440×1440 : chaque image est positionnée par window.seek(t), capturée par Chromium, encodée par ffmpeg.
//   node render-loop.js beats              → une image par temps (28) dans preview/ + planche contact
//   node render-loop.js preview 1.2 7.8    → images fixes dans preview/
//   node render-loop.js video [debut fin]  → fripe-loop.mp4 : 240 sous-images/s, 4 fusionnées (tmix) → 60 i/s
const path = require('path'), fs = require('fs'), { spawn } = require('child_process');
const { chromium } = require(process.env.PW || 'playwright-core');
const DIR = __dirname, FPS = 60, SUB = 4, [mode, ...rest] = process.argv.slice(2);
const PAGE = process.env.PAGE || 'fripe-loop.html', MUSIC = path.join(DIR, process.env.MUSIC || 'musique-loop.wav');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox', '--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1440 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('erreur page :', e.message));
  await page.goto('file://' + path.join(DIR, PAGE));
  await page.waitForFunction(() => window.ready === true);
  const P = await page.evaluate(() => window.P);
  const shot = async (t, file) => { await page.evaluate((x) => window.seek(x), t); await page.screenshot({ path: file }); };

  if (mode === 'beats' || mode === 'preview') {
    const out = path.join(DIR, 'preview'); fs.mkdirSync(out, { recursive: true });
    const times = mode === 'beats' ? Array.from({ length: P * 2 }, (_, i) => i / 2) : rest.map(Number);
    for (const t of times) await shot(t, path.join(out, `t${t.toFixed(2).padStart(5, "0")}.png`));
    if (mode === 'beats') {
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-pattern_type', 'glob', '-i', path.join(out, 't*.png'),
        '-vf', 'scale=360:360,tile=7x4', '-frames:v', '1', path.join(out, 'planche.png')], { stdio: 'inherit' });
      await new Promise((r) => ff.on('close', r));
    }
  } else {
    const t0 = Number(rest[0] || 0), t1 = Number(rest[1] || P), test = rest.length > 0;
    const out = path.join(DIR, test ? 'fripe-loop-test.mp4' : 'fripe-loop.mp4');
    const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-c:v', 'mjpeg', '-i', '-'];
    if (!test && fs.existsSync(MUSIC)) args.push('-i', MUSIC, '-c:a', 'aac', '-b:a', '256k', '-shortest');
    // tmix moyenne 4 sous-images consécutives, framestep en garde une sur 4 : flou de bouge réel, 60 i/s.
    args.push('-vf', `tmix=frames=${SUB}:weights='1 1 1 1',framestep=${SUB},setpts=N/${FPS}/TB`, '-r', String(FPS),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out);
    const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round((t1 - t0) * FPS * SUB);
    for (let i = 0; i < n; i++) {
      // Les sous-images d'une image de sortie couvrent [t − 3/240, t] : l'image 0 reprend la fin de la période.
      const t = t0 + (i - (SUB - 1)) / (FPS * SUB);
      await page.evaluate((x) => window.seek(x), ((t % P) + P) % P);
      const img = await page.screenshot({ type: 'jpeg', quality: 94 });
      if (!ff.stdin.write(img)) await new Promise((r) => ff.stdin.once('drain', r));
      if (i % 480 === 0) console.log(`sous-image ${i} / ${n}`);
    }
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
    console.log('vidéo :', out);
  }
  await browser.close();
})();
