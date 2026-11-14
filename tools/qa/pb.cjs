// P-B 판 위 글 갈래 확인 — node tools/qa/pb.cjs <장면> [파일 머리]
// 915×412 DPR 2.625 기본, OBSERVE_PRESET=small-mobile → 667×375 DPR 2. 장면은 tools/qa/pb-scenes.cjs
const { chromium } = require('playwright');
const BASE = process.env.OBSERVE_URL || 'http://localhost:4194/';
(async () => {
  const sc = process.argv[2] || 'battle';
  const small = process.env.OBSERVE_PRESET === 'small-mobile';
  const [w, h, d] = small ? [667, 375, 2] : [915, 412, 2.625];
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const pg = await br.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: d, hasTouch: true, isMobile: true });
  pg.on('pageerror', (e) => console.log('ERR', e.message));
  pg.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  const pre = process.argv[3] || 'production/qa/evidence/2026-11-14-pb';
  const sfx = small ? '-667' : '';
  const shot = (n) => pg.screenshot({ path: `${pre}-${n}${sfx}.png` });
  const A = (fn, arg) => pg.evaluate(fn, arg);
  const wait = (ms) => pg.waitForTimeout(ms);
  await pg.goto(BASE + '?debug');
  await pg.waitForSelector('#boot', { state: 'detached' });
  await wait(300);
  const s = await pg.$('.stagefx');
  if (s) { await s.click(); await wait(400); }
  const scenes = require('./pb-scenes.cjs');
  await scenes[sc]({ pg, A, wait, shot, small });
  await br.close();
})();
