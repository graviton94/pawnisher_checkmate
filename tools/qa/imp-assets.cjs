// 받은 그림 반입 확인 (2026-11-14, D-507): P-04 대주교 판 위 · CI-07 경보 2단계 컷 · TI-01/02 용어 아이콘(지도 현황 · 분대 카드 · 쓰러짐 의식 · 용어 사전 · 사건 정보) · WG-01 판돈 창.
// 사용: npm run build → npx vite preview --port <포트> → OBSERVE_URL=http://localhost:<포트>/ node tools/qa/imp-assets.cjs [915|667]
const { chromium } = require('playwright');
const BASE = process.env.OBSERVE_URL || 'http://localhost:4317/';
const size = process.argv[2] === '667' ? { width: 667, height: 375, dpr: 2 } : { width: 915, height: 412, dpr: 2.625 };
const OUT = 'production/qa/evidence/2026-11-14-imp-';
const W = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const pg = await br.newPage({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.dpr, hasTouch: true, isMobile: true });
  const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  const shot = (n) => pg.screenshot({ path: `${OUT}${n}-${size.width}.png` });
  const META = JSON.stringify({ tut: ['battle', 'battle-a', 'map', 'recruit', 'kit', 'promote', 'first_shop', 'heat'], runs: 3, prologue: true, ascOpen: 5, daily: {}, onboarded: true,
    terms: ['버팀', '심장 톱니', '부적', '보충병', '기벽', '회피 반격', '기어 쇼크', '기절', '방열판', '부품', '청록 합 표지', '주황 곱 표지'], termsNew: [] });
  const open = async () => {
    await pg.goto(BASE + '?debug');
    await pg.evaluate((m) => { localStorage.clear(); localStorage.setItem('pawnisher.slice.meta', m); }, META);
    await pg.goto(BASE + '?debug');
    await pg.waitForSelector('#boot', { state: 'detached' });
    await W(300);
    const s = await pg.$('.stagefx'); if (s) { await s.click(); await W(400); }
  };
  const tap = async (sel) => { const e = await pg.$(sel); if (!e) return false; const r = await e.boundingBox(); await pg.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await W(700); return true; };
  const log = {};
  const only = process.argv[3];

  if (!only || only === 'board') {
    // P-04: 판 위 48dp — 바탕 비숍 옆에 대주교 (흰 · 검)
    await open();
    await pg.evaluate(() => {
      const a = window.sliceApi; a.startAt(1, 'battle'); const b = window.slice();
      const mine = b.s.pieces.filter((p) => p.side === 0 && p.type !== 'K');
      const foe = b.s.pieces.filter((p) => p.side === 1 && p.type !== 'K');
      if (mine[0]) { mine[0].type = 'B'; mine[0].form = 'archbishop'; }
      if (mine[1]) { mine[1].type = 'B'; delete mine[1].form; }
      if (foe[0]) { foe[0].type = 'B'; foe[0].form = 'archbishop'; }
      if (foe[1]) { foe[1].type = 'B'; delete foe[1].form; }
      a.redraw();
    });
    await W(1200);
    await shot('p04-board');
  }

  if (!only || only === 'p2') {
    // CI-07: 경보 반장 대국 → 2단계 돌입 컷
    await open();
    await pg.evaluate(() => window.sliceApi.bossOf('alarm', 3));
    await W(1800);
    await pg.evaluate(() => { window.__p2 = window.sliceApi.p2Rise('alarm'); });
    await W(640);
    await shot('ci07-p2');
    await W(2600);
  }

  if (!only || only === 'icons') {
    // 지도 분대 현황: 버팀 철판(하나 씀) · 금 간 심장 톱니
    await open();
    await pg.evaluate(() => { const a = window.sliceApi; a.richRun(); const q = a.squad(); q[1].quirk = 'stubborn'; q[1].doorsSpent = 1; q[1].hp = 20; q[2].cracked = true; q[2].hp = 9; a.map(2); });
    await W(900);
    await shot('ti-map-roster');
    log.roster = await pg.evaluate(() => [...document.querySelectorAll('.map-roster .mr-slot')].map((e) => e.getAttribute('aria-label')));
    log.crackText = await pg.evaluate(() => [...document.querySelectorAll('.mr-crack')].map((e) => e.textContent));
    // 분대 창 (분대원 카드 — 버팀 철판 · 금 간 심장 톱니)
    await pg.evaluate(() => window.sliceApi.crew());
    await W(900);
    await shot('ti-crew');
    await pg.evaluate(() => { const x = document.querySelector('[data-x]'); x && x.click(); });
    await W(500);
    // 용어 사전
    await pg.evaluate(() => window.sliceApi.help('dict'));
    await W(900);
    await shot('ti-dict');
    await pg.evaluate(() => { const x = document.querySelector('[data-x]'); x && x.click(); });
    // 쓰러짐 의식 — 깨지는 것 = 심장 톱니
    await open();
    await pg.evaluate(() => window.sliceApi.startAt(1, 'battle'));
    await W(1400);
    await pg.evaluate(() => { window.__die = window.sliceApi.die(); });
    await W(420);
    await shot('ti-rite');
    await W(3000);
  }

  if (!only || only === 'event') {
    // 사건 정보 쪽: 결과 줄의 용어(심장 톱니 · 버팀) — 아이콘 + 이름
    await open();
    await pg.evaluate(() => { const a = window.sliceApi; a.richRun(); a.event('safe'); });
    await W(3500);
    const btns = await pg.$$('.btn-info');
    for (const bt of btns) {
      const r = await bt.boundingBox(); if (!r) continue;
      await pg.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await W(500);
      const nx = await pg.$('.ws-detail-next:not([hidden])'); const q = nx && await nx.boundingBox();
      if (q) { await pg.touchscreen.tap(q.x + q.width / 2, q.y + q.height / 2); await W(500); break; }
    }
    log.detail = await pg.evaluate(() => document.querySelector('.ws-detail-count')?.innerHTML ?? '');
    await shot('ti-event');
  }

  if (!only || only === 'wager') {
    await open();
    await pg.evaluate(() => window.sliceApi.startAt(1, 'battle'));
    await W(1500);
    await pg.evaluate(() => window.sliceApi.bet());
    await W(900);
    await shot('wg01-wager');
    log.scene = await pg.evaluate(() => { const e = document.querySelector('.bet-scene'); if (!e) return null; const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return { w: r.width, h: r.height, bg: s.backgroundImage.slice(-30), size: s.backgroundSize, pos: s.backgroundPosition }; });
    log.overflow = await pg.evaluate(() => { const w = document.querySelector('.win'); if (!w) return null; const r = w.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, vh: innerHeight }; });
  }
  console.log(JSON.stringify({ size, log, errs }, null, 1));
  await br.close();
})();
