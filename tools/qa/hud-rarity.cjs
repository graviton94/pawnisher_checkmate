// HB-01 · HB-02 · RF-01~04 실화면 확인 (2026-11-14): 턴 끝 단추 상태 · 경고 맥동 · 속전 계기 · 보상/상점 등급 틀 · 반짝임.
// 미리 `npm run build` + `npx vite preview --port 4195 --strictPort`. 사용: node tools/qa/hud-rarity.cjs [접미사]
// 결과: production/qa/evidence/2026-11-14-ui-<장면>-<규격>.png (915×412 DPR 2.625 · 667×375 DPR 2)
const { chromium } = require('playwright');
const BASE = process.env.OBSERVE_URL || 'http://localhost:4195/';
const tag = process.argv[2] ? `-${process.argv[2]}` : '';
(async () => {
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  for (const [w, h, dpr] of [[915, 412, 2.625], [667, 375, 2]]) {
    const pg = await br.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: true, isMobile: true });
    const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message));
    const shot = (n) => pg.screenshot({ path: `production/qa/evidence/2026-11-14-ui-${n}-${w}${tag}.png` });
    const A = (fn, arg) => pg.evaluate(fn, arg);
    await pg.goto(BASE + '?debug');
    await pg.waitForSelector('#boot', { state: 'detached' });
    await pg.waitForTimeout(300);
    const s = await pg.$('.stagefx'); if (s) { await s.click(); await pg.waitForTimeout(400); }
    // 전투 HUD — 보통 · 속전 여러 상태
    await A(() => window.sliceApi.startAt(1, 'battle'));
    await pg.waitForTimeout(1500);
    await shot('hud-normal');
    for (const n of [11, 6, 3, 1, 0]) {
      await A((k) => { window.slice().coins = k; window.sliceApi.redraw(); }, n);
      await pg.waitForTimeout(250);
      const box = await pg.$('#right .gtop');
      if (box) await box.screenshot({ path: `production/qa/evidence/2026-11-14-ui-speed-${n}-${w}${tag}.png` });
    }
    await A(() => { window.slice().coins = 11; window.sliceApi.redraw(); });
    // 턴 끝 경고 — 맥동 세 프레임
    await A(() => { window.sliceApi.doom(); return window.sliceApi.warnNow(); });
    await pg.waitForTimeout(120);
    const btn = await pg.$('#btn-end');
    for (let i = 0; i < 3; i++) { if (btn) await btn.screenshot({ path: `production/qa/evidence/2026-11-14-ui-endwarn-f${i}-${w}${tag}.png` }); await pg.waitForTimeout(170); }
    await shot('hud-warn');
    // 보상 — 일반 · 희귀 · 금이 섞인 판을 씨앗으로 찾는다
    for (let seed = 1; seed < 60; seed++) {
      await A((k) => { window.sliceApi.seed(k); window.sliceApi.reward(); }, seed);
      await pg.waitForTimeout(250);
      const g = await A(() => [...document.querySelectorAll('[data-grade]')].map((e) => e.dataset.grade).join(','));
      if (/rare/.test(g) && /gold/.test(g)) break;
    }
    await pg.waitForTimeout(500);
    await shot('reward-pop');
    await pg.waitForTimeout(1800);
    await shot('reward');
    await A(() => window.sliceApi.partPick());
    await pg.waitForTimeout(1600);
    await shot('parts');
    await A(() => { window.sliceApi.gold(400); window.sliceApi.shop(); });
    await pg.waitForTimeout(1600);
    await shot('shop');
    await A(() => window.sliceApi.allFaces());
    await pg.waitForTimeout(1200);
    await shot('faces');
    if (errs.length) console.log('ERR', w, errs);
    await pg.close();
  }
  await br.close();
})();
