// Rend une liste de pages HTML en PNG (ou PDF) avec le Chromium préinstallé.
// Usage : node render.js jobs.json   (jobs = [{html, out, w, h, transparent, pdf}])
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const j of jobs) {
    await page.setViewportSize({ width: j.w, height: j.h });
    await page.goto('file://' + j.html);
    await page.evaluate(() => document.fonts.ready);
    if (j.pdf) {
      await page.pdf({ path: j.out, printBackground: true, width: j.w + 'px', height: j.h + 'px' });
    } else {
      await page.screenshot({ path: j.out, omitBackground: !!j.transparent, fullPage: !!j.full });
    }
    console.log('OK', j.out);
  }
  await browser.close();
})();
