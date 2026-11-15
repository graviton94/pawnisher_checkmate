// 받은 MP-06 · OP-01 · OP-02 · OP-04 반입 (2026-11-15, D-509) 실화면 확인 — 915×412 DPR 2.625 · 터치.
// 사용: npm run build → npx vite preview --port <포트> → OBSERVE_URL=http://localhost:<포트>/ node tools/qa/op-map.cjs [prologue|map|bet|all]
// 증거: production/qa/evidence/2026-11-15-op-prologue-<nn>.png (쪽마다) · -op-map-a4.png · -op-bet.png
const { chromium } = require('playwright');
const BASE = process.env.OBSERVE_URL || 'http://localhost:4173/';
const what = process.argv[2] || 'all';
const OUT = 'production/qa/evidence/2026-11-15-op-';
const W = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const pg = await br.newPage({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
  const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const shot = (n) => pg.screenshot({ path: `${OUT}${n}.png` });
  const META = JSON.stringify({ tut: ['battle', 'battle-a', 'map', 'recruit', 'kit', 'promote', 'first_shop', 'heat', 'event'], runs: 3, prologue: true, ascOpen: 5, daily: {}, onboarded: true });
  const open = async () => {
    await pg.goto(BASE + '?debug');
    await pg.evaluate((m) => { localStorage.clear(); localStorage.setItem('pawnisher.slice.meta', m); }, META);
    await pg.goto(BASE + '?debug');
    await pg.waitForSelector('#boot', { state: 'detached' });
    await W(300);
    const s = await pg.$('.stagefx'); if (s) { await s.click(); await W(400); }
  };
  const log = { pages: [] };
  if (what === 'prologue' || what === 'all') {
    await open();
    await pg.evaluate(() => { void window.sliceApi.pro(); });
    await pg.locator('.prologue').waitFor({ state: 'attached' });
    const tap = () => pg.locator('.prologue').tap({ position: { x: 457, y: 140 } });
    let n = 0;
    for (let k = 0; k < 80 && (await pg.locator('.prologue').count()); k++) {
      await W(800);
      if (await pg.locator('.cut-sub.typing').count()) await W(1800);
      const img = await pg.evaluate(() => document.querySelector('.prologue img[data-film]')?.getAttribute('src') ?? '');
      const name = `prologue-${String(n++).padStart(2, '0')}`;
      await shot(name);
      log.pages.push(`${name} ${img}`);
      if (await pg.locator('.prologue.go-wait').count()) { await tap(); break; }
      await tap().catch(() => {});
    }
  }
  if (what === 'map' || what === 'all') {
    await open();
    await pg.evaluate(() => { const a = window.sliceApi; a.richRun(); a.setAct(3); a.map(2); });
    await W(1000);
    await shot('map-a4');
    log.mapBg = await pg.evaluate(() => document.querySelector('.mapfx')?.style.getPropertyValue('--act'));
  }
  if (what === 'bet' || what === 'all') {
    await open();
    await pg.evaluate(() => window.sliceApi.startAt(1, 'battle'));
    await W(2600);
    await pg.evaluate(() => window.sliceApi.bet());
    await W(1000);
    await shot('bet');
  }
  console.log(JSON.stringify({ errs, log }, null, 1));
  await br.close();
})();
