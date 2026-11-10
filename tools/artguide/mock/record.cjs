// D-246 시안 녹화: d246.html의 render(t)를 12fps로 찍어 PNG 프레임으로 → record.py가 webp로 굽는다.
// 사용: (저장소 뿌리에서) python3 -m http.server 4174 & node tools/artguide/mock/record.cjs <출력 폴더> [장면...]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const out = process.argv[2];
const ALL = ['boss-plate', 'boss-spawn', 'boss-thorns', 'boss-boards', 'fx-plate', 'fx-spawn', 'fx-thorns', 'ending-credits', 'ending-photo', 'ev-coin', 'ev-gacha', 'ev-hammer', 'ev-dip', 'ev-chest', 'ev-auction'];
const scenes = process.argv.length > 3 ? process.argv.slice(3) : ALL;
(async () => {
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 1 });
  pg.on('pageerror', (e) => console.log('ERR', e.message));
  for (const s of scenes) {
    await pg.goto(`http://127.0.0.1:4174/tools/artguide/mock/d246.html?s=${s}`);
    await pg.evaluate(() => window.ready);
    const dur = await pg.evaluate(() => window.render(0));
    const dir = path.join(out, s);
    fs.mkdirSync(dir, { recursive: true });
    const step = 83;
    const n = Math.max(1, Math.ceil(dur / step));
    for (let i = 0; i < n; i++) {
      await pg.evaluate((t) => window.render(t), i * step);
      await pg.screenshot({ path: path.join(dir, `${String(i).padStart(4, '0')}.png`) });
    }
    console.log(s, n);
  }
  await br.close();
})();
