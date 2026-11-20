// Render words in the site's script font onto a canvas at a large size; save PNG + metrics.
const { chromium } = require('playwright');
const fs = require('fs');
const words = process.argv.slice(2);
const FS = 400, PAD = 200;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('https://the-parkway-church.webflow.io/', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  for (const w of words) {
    const out = await p.evaluate(({ w, FS, PAD }) => {
      const c = document.createElement('canvas'), x = c.getContext('2d');
      x.font = FS + 'px "Aesthetics Script"';
      const m = x.measureText(w);
      c.width = Math.ceil(m.width + 2 * PAD); c.height = Math.ceil(FS * 1.6 + 2 * PAD);
      x.font = FS + 'px "Aesthetics Script"'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = '#000'; x.textBaseline = 'alphabetic';
      const ox = PAD, base = PAD + FS * 1.0;
      x.fillText(w, ox, base);
      return { png: c.toDataURL('image/png'), ox, base, fs: FS, advance: m.width, font: getComputedStyle(document.querySelector('.text-style-script')).fontFamily };
    }, { w, FS, PAD });
    fs.writeFileSync(`scripts/trim-paths/out/${w}.png`, Buffer.from(out.png.split(',')[1], 'base64'));
    delete out.png; fs.writeFileSync(`scripts/trim-paths/out/${w}.json`, JSON.stringify(out));
    console.log(w, JSON.stringify(out));
  }
  await b.close();
})();
