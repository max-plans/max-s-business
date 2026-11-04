// Rendu des 5 vidéos courtes (1080 × 1920, 30 i/s). Chaque image = window.seek(t) puis capture Chromium → ffmpeg.
//   node render.js preview 2 1 3 5 …   → preview/v2-t1.00.png …
//   node render.js video 3              → fripe-video-3.mp4 (avec musique-3.wav si présent)
//   node render.js video all            → les cinq
const path = require('path'), fs = require('fs'), { spawn } = require('child_process');
const { chromium } = require(process.env.PW || 'playwright');
const DIR = __dirname, FPS = 30, [mode, which, ...times] = process.argv.slice(2);

async function open(browser, v) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error(`v${v} erreur page :`, e.message));
  page.on('console', (m) => m.type() === 'error' && console.error(`v${v} console :`, m.text()));
  await page.goto('file://' + path.join(DIR, 'video.html') + '?v=' + v);
  await page.waitForFunction(() => window.ready === true);
  return page;
}

async function video(browser, v) {
  const page = await open(browser, v), dur = await page.evaluate(() => window.DUR);
  const music = path.join(DIR, `musique-${v}.wav`), out = path.join(DIR, `fripe-video-${v}.mp4`);
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-'];
  if (fs.existsSync(music)) args.push('-i', music, '-c:a', 'aac', '-b:a', '192k', '-shortest');
  args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out);
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round(dur * FPS);
  for (let i = 0; i < n; i++) {
    await page.evaluate((x) => window.seek(x), i / FPS);
    const img = await page.screenshot({ type: 'jpeg', quality: 94 });
    if (!ff.stdin.write(img)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await page.close();
  console.log('vidéo :', out);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox', '--force-color-profile=srgb'] });
  if (mode === 'preview') {
    fs.mkdirSync(path.join(DIR, process.env.OUT || 'preview'), { recursive: true });
    const page = await open(browser, which);
    for (const t of times.map(Number)) {
      await page.evaluate((x) => window.seek(x), t);
      await page.screenshot({ path: path.join(DIR, process.env.OUT || 'preview', `v${which}-t${t.toFixed(2)}.png`) });
    }
  } else {
    const list = which === 'all' ? [1, 2, 3, 4, 5] : [Number(which)];
    await Promise.all(list.map((v) => video(browser, v)));
  }
  await browser.close();
})();
