// 후기 남은 항목 (2026-11-14, D-503) 실화면 확인 — 915×412 DPR 2.625 · 667×375 DPR 2 · 터치.
// #11 자동 고르기 · #13 받침 맞물림 줄 · #17 작업대 수리 고르기 · #19 보강 글 · #24 지도 분대 현황 · #12 판돈 창 · 칩.
// 사용: npm run build → npx vite preview --port <포트> → OBSERVE_URL=http://localhost:<포트>/ node tools/qa/pe-items.cjs [915|667]
const { chromium } = require('playwright');
const BASE = process.env.OBSERVE_URL || 'http://localhost:4211/';
const size = process.argv[2] === '667' ? { width: 667, height: 375, dpr: 2 } : { width: 915, height: 412, dpr: 2.625 };
const OUT = `production/qa/evidence/2026-11-14-pe-`;
const W = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const pg = await br.newPage({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.dpr, hasTouch: true, isMobile: true });
  const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  const shot = (n) => pg.screenshot({ path: `${OUT}${n}-${size.width}.png` });
  const META = JSON.stringify({ tut: ['battle', 'battle-a', 'map', 'recruit', 'kit', 'promote', 'first_shop', 'heat'], runs: 3, prologue: true, ascOpen: 5, daily: {}, onboarded: true });
  const open = async () => {
    await pg.goto(BASE + '?debug');
    await pg.evaluate((m) => { localStorage.clear(); localStorage.setItem('pawnisher.slice.meta', m); }, META);
    await pg.goto(BASE + '?debug');
    await pg.waitForSelector('#boot', { state: 'detached' });
    await W(300);
    const s = await pg.$('.stagefx'); if (s) { await s.click(); await W(400); }
  };
  const tapPos = async (pos) => { const p = await pg.evaluate((q) => window.sliceApi.screenOf(q), pos); await pg.touchscreen.tap(p.x, p.y); await W(500); };
  const log = {};

  // #24 지도 분대 현황 — 다친 분대원 · 깨진 심장 톱니 · 버팀(하나 씀) · 기벽
  await open();
  await pg.evaluate(() => { const a = window.sliceApi; a.richRun(); const q = a.squad(); q[1].quirk = 'stubborn'; q[1].doorsSpent = 1; q[1].hp = 20; q[2].cracked = true; q[2].hp = 9; a.map(2); });
  await W(900);
  await shot('map-roster');
  log.roster = await pg.evaluate(() => [...document.querySelectorAll('.map-roster .mr-slot')].map((e) => e.getAttribute('aria-label')));
  // 현황 칸을 누르면 분대 창
  const slot = pg.locator('.map-roster .mr-slot').first();
  if (await slot.count()) { await slot.tap(); await W(800); await shot('map-roster-tap'); }
  // 분대 창을 닫으면 지도 그대로 · 노드를 고르면 (좁은 화면) 현황이 접히고 미리보기가 띠 전체
  const x = pg.locator('[data-x]'); if (await x.count()) { await x.first().tap(); await W(600); }
  const node = pg.locator('.mnd.now').first(); if (await node.count()) { await node.tap(); await W(600); await shot('map-node-peek'); }
  // 지도 값 = 대국 값 (단일 출처): 같은 분대로 대국을 열어 HP · 버팀 칸 수를 비교
  log.battleVsMap = await pg.evaluate(() => { const a = window.sliceApi; const q = a.squad(); a.startAt(1, 'battle'); const b = window.slice(); return q.map((u, i) => { const id = b.squadIds[i]; const p = b.s.pieces.find((x) => x.id === id); return { t: u.t, pt: p?.type, map: u.hp, battle: p?.hp, max: p?.maxHp, doors: (b.s.doorIds ?? []).filter((d) => d === id).length, n: q.length, ids: b.squadIds.length }; }); });

  // #19 · #17 작업대: 현황 줄 · 수리 고르기 · 보강 고르기
  await open();
  await pg.evaluate(() => { const a = window.sliceApi; a.richRun(); const q = a.squad(); q[1].hp = 12; q[1].quirk = 'spare'; q[1].doorsSpent = 1; a.forge(); });
  await W(1100);
  await shot('forge');
  await pg.locator('[data-slot="repair"]').tap(); await W(300);
  await pg.locator('[data-slot="repair"]').tap(); await W(1100);
  await shot('repair-pick');
  await pg.locator('[data-slot="1"]').tap(); await W(400);
  await shot('repair-sel');
  const hpBefore = await pg.evaluate(() => window.sliceApi.squad()[1].hp);
  await pg.locator('[data-slot="1"]').tap(); await W(1400);
  log.repair = { before: hpBefore, after: await pg.evaluate(() => window.sliceApi.squad()[1].hp) };
  await open();
  await pg.evaluate(() => { const a = window.sliceApi; a.richRun(); const q = a.squad(); q[1].quirk = 'spare'; q[1].doorsSpent = 1; a.brace(); });
  await W(1000);
  await shot('brace-pick');

  // #13 받침 아래 맞물림 줄 — 카드 보상
  await open();
  await pg.evaluate(() => { const a = window.sliceApi; a.richRun(); a.reward(); });
  await W(1500);
  await shot('fit-line');
  log.fit = await pg.evaluate(() => [...document.querySelectorAll('.pick-item')].map((e) => e.innerText.replace(/\s+/g, ' ').slice(-60)));

  // #11 자동 고르기 — 손패 [지휘 · 도약]에서 나이트를 누르면 도약
  await open();
  await pg.evaluate(() => { window.sliceApi.startAt(1, 'battle'); });
  await W(1500);
  const kn = await pg.evaluate(() => { const b = window.slice(); const n = b.s.pieces.find((p) => p.side === 0 && p.type === 'N'); b.hand = ['order', 'leap', 'advance']; b.ap = 3; window.sliceApi.redraw(); return n && { x: n.x, y: n.y }; });
  if (kn) {
    await tapPos(kn);
    log.auto = await pg.evaluate(() => document.querySelector('#hand .armed')?.textContent?.replace(/\s+/g, ' ').trim() ?? '');
    await shot('autopick');
    // 전용 카드를 못 쓸 때(태엽 1 · 칼날 세례 2) → 공용 + 독백
    await pg.evaluate(() => { const b = window.slice(); b.hand = ['bladeRain', 'stepAside']; b.ap = 1; window.sliceApi.redraw(); });
    const empty = await pg.evaluate(() => { const b = window.slice(); for (let y = 0; y < b.s.height; y++) for (let x = 0; x < b.s.width; x++) if (!b.s.pieces.some((p) => p.x === x && p.y === y)) return { x, y }; return null; });
    await tapPos(empty); await W(300);
    await tapPos(kn);
    await W(200);
    await shot('autopick-blocked');
    log.mono = await pg.evaluate(() => document.querySelector('.vmono')?.textContent ?? '');
    log.auto2 = await pg.evaluate(() => document.querySelector('#hand .armed')?.textContent?.replace(/\s+/g, ' ').trim() ?? '');
  }

  // #12 판돈 — 창 · 칩 · 깨짐 · 달성
  await open();
  await pg.evaluate(() => { window.sliceApi.startAt(2, 'battle'); });
  await W(1500);
  await pg.evaluate(() => { window.sliceApi.gold(160); window.sliceApi.bet(); });
  await W(900);
  await shot('wager-win');
  log.wager = await pg.evaluate(() => document.getElementById('overlay-panel')?.innerText?.replace(/\s+/g, ' ') ?? '');
  await pg.locator('[data-yes]').tap(); await W(1200);
  await shot('wager-chip');
  log.chip = await pg.evaluate(() => document.getElementById('bet-chip')?.innerText?.replace(/\s+/g, ' ') ?? '');
  await pg.evaluate(() => { window.sliceApi.betSet('kills'); window.sliceApi.betReach(); });
  await W(700);
  await shot('wager-reached');
  log.reached = await pg.evaluate(() => document.getElementById('bet-chip')?.innerText?.replace(/\s+/g, ' ') ?? '');
  await pg.evaluate(() => { window.sliceApi.betSet('unhit'); window.sliceApi.betBreak(); });
  await W(700);
  await shot('wager-broken');

  console.log(JSON.stringify({ size: size.width, errs, ...log }, null, 1));
  await br.close();
})();
