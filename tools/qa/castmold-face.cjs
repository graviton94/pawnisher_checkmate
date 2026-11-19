// D-700 확인: 「버려진 주물들」(castMold) 결과 대사 칸 얼굴이 주물 틀 그림이 아니라 폰 기물 얼굴인지 — 915×412 · DPR 2.625.
// 미리 `npm run build` · `npx vite preview --port 4173`. 사용: node tools/qa/castmold-face.cjs <출력 png>
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || 'production/qa/evidence/castmold-face.png';
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
  pg.on('pageerror', (e) => console.log('ERR', e.message));
  await pg.goto('http://localhost:4173/?debug'); await pg.waitForSelector('#boot', { state: 'detached' }); await pg.waitForTimeout(300);
  const s = await pg.$('.stagefx'); if (s) { await s.click(); await pg.waitForTimeout(500); }
  await pg.evaluate(() => { window.sliceApi.gold(80); window.sliceApi.event('castMold'); });
  for (let i = 0; i < 20; i++) {
    await pg.waitForTimeout(700);
    if (await pg.$('.ws-face.ws-crew')) break;
    const b = await pg.$('.ws-choices button:not([disabled])');
    if (b) await b.tap({ timeout: 1500 }).catch(() => {});
  }
  await pg.waitForTimeout(2500);
  console.log('crew face', !!(await pg.$('.ws-face.ws-crew')));
  await pg.screenshot({ path: out });
  await br.close();
})();
