// 지도 에셋 MP-01~05 · 사건 결과 / 판돈 코드 연출 (2026-11-14, D-506) 실화면 확인 — 915×412 DPR 2.625 · 667×375 DPR 2 · 터치.
// 사용: npm run build → npx vite preview --port <포트> → OBSERVE_URL=http://localhost:<포트>/ node tools/qa/mp-fx.cjs [915|667] [map|fx|bet|all] [--calm]
// 증거: production/qa/evidence/2026-11-14-mp-*.png (지도) · -fx-*.png (사건 결과 · 판돈, 프레임마다)
const { chromium } = require('playwright');
const BASE = process.env.OBSERVE_URL || 'http://localhost:4237/';
const size = process.argv[2] === '667' ? { width: 667, height: 375, dpr: 2 } : { width: 915, height: 412, dpr: 2.625 };
const what = process.argv[3] || 'all';
const calm = process.argv.includes('--calm');
const OUT = 'production/qa/evidence/2026-11-14-';
const W = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const pg = await br.newPage({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.dpr, hasTouch: true, isMobile: true, reducedMotion: calm ? 'reduce' : 'no-preference' });
  const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  const tag = `${size.width}${calm ? '-calm' : ''}`;
  const shot = (n) => pg.screenshot({ path: `${OUT}${n}-${tag}.png` });
  const META = JSON.stringify({ tut: ['battle', 'battle-a', 'map', 'recruit', 'kit', 'promote', 'first_shop', 'heat', 'event'], runs: 3, prologue: true, ascOpen: 5, daily: {}, onboarded: true });
  const open = async () => {
    await pg.goto(BASE + '?debug');
    await pg.evaluate((m) => { localStorage.clear(); localStorage.setItem('pawnisher.slice.meta', m); }, META);
    await pg.goto(BASE + '?debug');
    await pg.waitForSelector('#boot', { state: 'detached' });
    await W(300);
    const s = await pg.$('.stagefx'); if (s) { await s.click(); await W(400); }
  };
  const log = {};

  if (what === 'map' || what === 'all') {
    // 막마다 지도: 다친 · 위험 · 금 간 · 버팀 쓴 분대원
    await open();
    await pg.evaluate(() => { const a = window.sliceApi; a.richRun(); const q = a.squad(); q[1].quirk = 'stubborn'; q[1].doorsSpent = 1; q[1].hp = 20; q[2].cracked = true; q[2].hp = 9; });
    for (const act of [0, 1, 2, 3]) {
      await pg.evaluate((i) => { const a = window.sliceApi; a.setAct(i); a.map(2); }, act);
      await W(900);
      await shot(`mp-map-a${act + 1}`);
    }
    log.roster = await pg.evaluate(() => [...document.querySelectorAll('.map-roster .mr-slot')].map((e) => e.getAttribute('aria-label')));
    // 분대원을 누르면 아래 띠(넓은 화면) · 노드를 고르면 미리보기
    await pg.evaluate(() => { const a = window.sliceApi; a.setAct(0); a.map(2); });
    await W(900);
    const slot = pg.locator('.map-roster .mr-slot').nth(2);
    if (size.width > 760 && await slot.count()) { await slot.tap(); await W(600); await shot('mp-roster-peek'); }
    const node = pg.locator('.mnd.now').first(); if (await node.count()) { await node.tap(); await W(600); await shot('mp-node-peek'); }
  }

  if (what === 'fx' || what === 'all') {
    // 사건 결과 코드 연출 — 종류마다 프레임 (sliceApi.resultFx)
    const kinds = ['molten', 'quench', 'rust', 'repair', 'upgrade', 'break', 'screws', 'crate'];
    for (const k of kinds) {
      await open();
      await pg.evaluate((kk) => { const a = window.sliceApi; a.richRun(); window.__fxSlow = 6; a.resultFx(kk); }, k);
      // 도트 연출 캔버스가 뜨는 순간부터 프레임마다 (예비 · 터짐 · 출렁 · 퇴장)
      await pg.waitForSelector('canvas.rfx', { timeout: 12000, state: 'attached' }).catch(() => null);
      let prev = 0;
      for (const [i, t] of [[0, 200], [1, 1350], [2, 1700], [3, 2700]]) { await W(t - prev); prev = t; await shot(`fx-${k}-${i}`); }
      await W(3500);
    }
  }

  if (what === 'bet' || what === 'all') {
    // 판돈: 칩 표지(진행 · 위험 · 달성) → 이김 / 짐 결과 연출
    for (const won of [true, false]) {
      await open();
      await pg.evaluate(() => { const a = window.sliceApi; a.richRun(); a.startAt(1, 'battle'); });
      await W(1600);
      await pg.evaluate(() => window.sliceApi.betSet('kills'));
      await W(500);
      await shot(`fx-bet-chip-active`);
      if (won) { await pg.evaluate(() => window.sliceApi.betReach()); await W(260); await shot('fx-bet-chip-reach'); }
      else { await pg.evaluate(() => window.sliceApi.betSet('unhit')); await W(300); await pg.evaluate(() => window.sliceApi.betBreak()); await W(200); await shot('fx-bet-chip-break'); }
      await pg.evaluate((w) => { window.__fxSlow = 6; void window.sliceApi.betEnd(w); }, won);
      await pg.waitForSelector('canvas.rfx', { timeout: 5000, state: 'attached' }).catch(() => null);
      let prev = 0;
      for (const [i, t] of [[0, 200], [1, 1350], [2, 1700], [3, 2700]]) { await W(t - prev); prev = t; await shot(`fx-bet-${won ? 'win' : 'lose'}-${i}`); }
      await W(1200);
    }
  }
  console.log(JSON.stringify({ errs, log }, null, 1));
  await br.close();
})();
