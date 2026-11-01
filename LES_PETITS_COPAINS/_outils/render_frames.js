
const { chromium } = require('playwright');
(async () => {
  const [,, html, outdir, n, fps] = process.argv;
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1920,height:1080}});
  await p.goto('file://' + html); await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  for (let i = 0; i < +n; i++) {
    await p.evaluate(t => window.setT(t), i / +fps);
    await p.screenshot({ path: `${outdir}/f${String(i).padStart(5,'0')}.jpg`, type: 'jpeg', quality: 92 });
  }
  await b.close();
})();
