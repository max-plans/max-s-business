// Rendu de la pub : chaque image est positionnée dans la timeline (seek), capturée par Chromium puis encodée par ffmpeg.
//   node render.js preview 0.9 5.5 9.5 …   → captures PNG dans preview/
//   node render.js video                    → fripe-pub.mp4 (avec musique.wav si présent)
const path = require('path'), fs = require('fs'), { spawn } = require('child_process');
const { chromium } = require(process.env.PW || 'playwright-core');
const DIR = __dirname, FPS = 30, [mode, ...times] = process.argv.slice(2);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox', '--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('erreur page :', e.message));
  await page.goto('file://' + path.join(DIR, 'index.html'));
  await page.waitForFunction(() => window.ready === true);
  const dur = await page.evaluate(() => window.DUR);

  if (mode === 'preview') {
    fs.mkdirSync(path.join(DIR, 'preview'), { recursive: true });
    for (const t of times.map(Number)) {
      await page.evaluate((x) => window.seek(x), t);
      await page.screenshot({ path: path.join(DIR, 'preview', `t${t.toFixed(2)}.png`) });
    }
  } else {
    const music = path.join(DIR, 'musique.wav'), out = path.join(DIR, 'fripe-pub.mp4');
    const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-'];
    if (fs.existsSync(music)) args.push('-i', music, '-c:a', 'aac', '-b:a', '192k', '-shortest');
    args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out);
    const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round(dur * FPS);
    for (let i = 0; i < n; i++) {
      await page.evaluate((x) => window.seek(x), i / FPS);
      const img = await page.screenshot({ type: 'jpeg', quality: 95 });
      if (!ff.stdin.write(img)) await new Promise((r) => ff.stdin.once('drain', r));
      if (i % 150 === 0) console.log(`image ${i} / ${n}`);
    }
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
    console.log('vidéo :', out);
  }
  await browser.close();
})();
