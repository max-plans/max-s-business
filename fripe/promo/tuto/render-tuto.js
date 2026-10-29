// Rendu du tuto : chaque image est positionnée par window.seek(t), capturée par Chromium, encodée par ffmpeg.
//   node render-tuto.js preview 5.4 11.5 …  → images fixes dans preview/
//   node render-tuto.js video               → fripe-connect-tuto.mp4 (muet, 30 i/s) + affiche .jpg
const path = require('path'), fs = require('fs'), { spawn } = require('child_process');
const { chromium } = require(process.env.PW || 'playwright-core');
const DIR = __dirname, FPS = 30, [mode, ...times] = process.argv.slice(2);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox', '--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('erreur page :', e.message));
  await page.goto('file://' + path.join(DIR, 'tuto.html'));
  await page.waitForFunction(() => window.ready === true);
  const dur = await page.evaluate(() => window.DUR);
  if (mode === 'preview') {
    fs.mkdirSync(path.join(DIR, 'preview'), { recursive: true });
    for (const t of times.map(Number)) {
      await page.evaluate((x) => window.seek(x), t);
      await page.screenshot({ path: path.join(DIR, 'preview', `t${t.toFixed(2).padStart(5, '0')}.png`) });
    }
  } else {
    const out = path.join(DIR, 'fripe-connect-tuto.mp4');
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'veryslow', '-crf', '26', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round(dur * FPS);
    for (let i = 0; i < n; i++) {
      await page.evaluate((x) => window.seek(x), i / FPS);
      const img = await page.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(img)) await new Promise((r) => ff.stdin.once('drain', r));
    }
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
    await page.evaluate(() => window.seek(0));
    await page.screenshot({ path: path.join(DIR, 'fripe-connect-tuto.jpg'), type: 'jpeg', quality: 80 });
    console.log('vidéo :', out);
  }
  await browser.close();
})();
