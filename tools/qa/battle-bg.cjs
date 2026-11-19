// 전투 바탕 · 더미 단추 확인 (D-640): 1 · 2 · 3막 실제 전투를 세 규격(915×412 · 667×375 DPR 2.625 · 1920×1080 DPR 1)에서 찍는다.
// 미리 `npm run build` · `npx vite preview --port 4173`. 사용: node tools/qa/battle-bg.cjs <before|after> [출력 폴더]
// after면 덱 단추를 눌러 「누름」, 카드를 더해 「새 카드」 상태도 찍는다.
const { chromium } = require('playwright');
const BASE = process.env.OBSERVE_URL || 'http://localhost:4173/';
const tag = process.argv[2] || 'after';
const dir = process.argv[3] || 'production/qa/evidence/2026-11-19-d640-bg';
(async () => {
  require('fs').mkdirSync(dir, { recursive: true });
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const sizes = [[915, 412, 2.625], [667, 375, 2.625], [1920, 1080, 1]];
  let errs = 0;
  for (const [w, h, dpr] of sizes) {
    const pg = await br.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: true, isMobile: w < 1024 });
    pg.on('pageerror', (e) => { errs++; console.log('ERR', e.message); });
    pg.on('console', (m) => { if (m.type() === 'error') { errs++; console.log('CONSOLE', m.text()); } });
    await pg.goto(BASE + '?debug');
    await pg.evaluate(() => { const m = JSON.parse(localStorage.getItem('pawnisher.slice.meta') || '{}'); localStorage.setItem('pawnisher.slice.meta', JSON.stringify({ ...m, prologue: true, onboarded: true, tut: ['battle', 'battle-a', 'map', 'recruit', 'kit', 'promote', 'first_shop', 'hud-deck'] })); });
    await pg.reload();
    await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 });
    await pg.waitForTimeout(300);
    for (const act of [1, 2, 3]) {
      await pg.evaluate((a) => window.sliceApi.startAt(a, 'battle'), act);
      await pg.waitForTimeout(2200);
      const s = await pg.$('.stagefx'); if (s) { await s.click(); await pg.waitForTimeout(600); }
      await pg.screenshot({ path: `${dir}/${tag}-act${act}-${w}x${h}.png` });
      if (tag === 'after' && act === 1) {
        // 새 카드: 덱에 카드가 들어온 직후 상태
        await pg.evaluate(() => { window.sliceApi.deckAdd([window.slice().hand[0]]); window.sliceApi.redraw(); });
        await pg.waitForTimeout(400);
        await pg.screenshot({ path: `${dir}/${tag}-act1-new-${w}x${h}.png` });
        const r = await pg.evaluate(() => [...document.querySelectorAll('#deckrow button')].map((e) => { const q = e.getBoundingClientRect(); return { cls: e.className, w: Math.round(q.width), h: Math.round(q.height), text: e.textContent }; }));
        console.log(w, h, JSON.stringify(r));
      }
    }
    await pg.close();
  }
  await br.close();
  console.log('errors', errs);
})();
