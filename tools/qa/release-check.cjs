// 출시 빌드 확인 (D-531): `npm run build:release` 뒤 프리뷰에서 — ?debug를 붙여도 손잡이가 없고 타이틀이 뜬다, legacy.html 없음,
// 메인 메뉴(D-539)에 시험장 · 빌드 시험 줄이 없다.
// 사용: OBSERVE_URL=http://localhost:4173/ node tools/qa/release-check.cjs → production/qa/evidence/<날짜>-release-title.png
const { chromium } = require('playwright');
const BASE = process.env.OBSERVE_URL || 'http://localhost:4173/';
const day = new Date().toISOString().slice(0, 10);
(async () => {
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const pg = await br.newPage({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
  let errors = 0;
  pg.on('pageerror', (e) => { errors++; console.log('ERR', e.message); });
  const t0 = Date.now();
  await pg.goto(BASE + '?debug&lab');
  await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 });
  const bootMs = Date.now() - t0;
  await pg.waitForTimeout(1000);
  const r = await pg.evaluate(() => ({ pngs: performance.getEntriesByType('resource').filter((e) => e.name.endsWith('.png')).length, scenes: performance.getEntriesByType('resource').filter((e) => e.name.includes('/scenes/')).length, lastPng: Math.round(Math.max(...performance.getEntriesByType('resource').filter((e) => e.name.endsWith('.png')).map((e) => e.responseEnd))), sliceApi: typeof window.sliceApi, opening: !!document.querySelector('.opening'), lab: !!document.querySelector('.op-dev') }));
  const legacy = (await pg.request.get(BASE + 'legacy.html')).status();
  await pg.screenshot({ path: `production/qa/evidence/${day}-release-title.png` });
  // 메인 메뉴 (D-539 단추 다섯): 프롤로그를 본 기록 + 처음 화면 메뉴 표시를 심고 다시 연다 — ?debug를 붙여도 시험장 · 빌드 시험 줄이 없다
  await pg.evaluate(() => { localStorage.setItem('pawnisher.slice.meta', JSON.stringify({ prologue: true, onboarded: true })); sessionStorage.setItem('op-menu', '1'); });
  await pg.reload();
  const menu = await pg.waitForSelector('.op-menu:not([hidden]) [data-ship]', { timeout: 20000 }).then(() => true).catch(() => false);
  await pg.waitForTimeout(800);
  const m = await pg.evaluate(() => ({ buttons: [...document.querySelectorAll('.op-menu button')].filter((b) => b.getClientRects().length).map((b) => b.textContent.trim().replace(/\s+/g, ' ')), dev: !!document.querySelector('.op-dev') }));
  await pg.screenshot({ path: `production/qa/evidence/${day}-release-menu.png` });
  console.log(JSON.stringify({ ...r, legacyStatus: legacy, bootMs, menu, menuButtons: m.buttons, menuDev: m.dev, errors }));
  await br.close();
})();
