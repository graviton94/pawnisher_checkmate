// 반장 장면 한 장 (D-690): node tools/qa/bossshot.cjs <out.png> <evalJS> <waitms> [기다릴 선택자] [찍은 뒤 평가할 JS] — 미리보기 서버 :4391 (OBSERVE_URL로 바꾼다)
const { chromium } = require(process.env.PW_PATH || 'playwright');
(async () => {
  const [out, js, ms, sel, probe] = process.argv.slice(2);
  const br = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await br.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.goto((process.env.OBSERVE_URL || 'http://localhost:4391/') + '?debug');
  await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 });
  await pg.waitForTimeout(500);
  const s0 = await pg.$('.stagefx'); if (s0) { await s0.click(); await pg.waitForTimeout(400); }
  await pg.evaluate(() => window.sliceApi.campaign(0));
  await pg.waitForTimeout(800);
  await pg.evaluate(js);
  if (sel) await pg.waitForSelector(sel, { timeout: 10000 }).catch(() => {});
  await pg.waitForTimeout(Number(ms));
  if (probe) console.log(await pg.evaluate(probe));
  await pg.screenshot({ path: out });
  console.log(JSON.stringify(await pg.evaluate(() => { const e = document.querySelector('.bossfx'); return e ? { cls: e.className, slab: getComputedStyle(e.querySelector('.bf-slab') || e).visibility, haz: !!e.querySelector('.bf-haz') } : null; })), errs.slice(0, 3));
  await br.close();
})();
