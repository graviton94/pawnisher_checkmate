// 밸런스 패스 (2026-11-14) 실화면 확인 — 915×412 · DPR 2.625 · 터치.
// 버팀 표시 · 교착 압박 띠 · 퀸 공용 카드 두 번 · 보병 세트 막사의 호출.
// 사용: npm run build → npx vite preview --port <포트> → OBSERVE_URL=http://localhost:<포트>/ node tools/qa/balance-pass.cjs
const { chromium } = require('playwright');
const BASE = process.env.OBSERVE_URL || 'http://localhost:4193/';
const OUT = 'production/qa/evidence/2026-11-14-bal-';
const W = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const pg = await br.newPage({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
  const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  const shot = (n) => pg.screenshot({ path: `${OUT}${n}.png` });
  const META = JSON.stringify({ tut: ['battle', 'battle-a', 'map', 'recruit', 'kit', 'promote', 'first_shop'], runs: 3, prologue: true, ascOpen: 5, daily: {}, onboarded: true });
  const open = async () => {
    await pg.goto(BASE + '?debug');
    await pg.evaluate((m) => { localStorage.clear(); localStorage.setItem('pawnisher.slice.meta', m); }, META);
    await pg.goto(BASE + '?debug');
    await pg.waitForSelector('#boot', { state: 'detached' });
    await W(300);
    const s = await pg.$('.stagefx'); if (s) { await s.click(); await W(400); }
  };
  const tapPos = async (pos) => { const p = await pg.evaluate((q) => window.sliceApi.screenOf(q), pos); await pg.touchscreen.tap(p.x, p.y); await W(450); };
  const tapCard = async (i) => { await pg.locator(`#hand [data-card="${i}"]`).tap(); await W(350); };
  const endTurn = async () => { await pg.locator('#btn-end').tap(); await W(400); if (await pg.locator('#btn-end.warn').count()) { await pg.locator('#btn-end').tap(); } };
  const waitMine = async () => { await W(2500); await pg.waitForFunction(() => document.querySelectorAll('#hand [data-card]').length > 0, null, { timeout: 20000 }); await W(300); };

  // ① 버팀 — 분대원 카드: 고집 센 축(버팀 2) 중 하나를 썼다 → 하트 하나 켜짐 · 하나 깨짐
  await open();
  await pg.evaluate(() => { const a = window.sliceApi; a.richRun(); const q = a.squad(); q[1].quirk = 'stubborn'; q[1].doorsSpent = 1; q[2].doors = 1; a.crew(); });
  await W(900);
  await shot('brace-crew');
  await pg.evaluate(() => window.sliceApi.help('dict'));
  await W(700);
  const dict = await pg.evaluate(() => document.body.innerText.includes('버팀') && !document.body.innerText.includes('생명'));
  await shot('brace-dict');

  // ② 교착 압박 — 12턴부터 피해 없는 턴 둘: 띠 + 적의 수 줄에 적 킹 −N
  await open();
  await pg.evaluate(() => { window.sliceApi.startAt(1, 'battle'); });
  await W(1200);
  await pg.evaluate(() => { const b = window.slice(); b.turn = 12; b.quiet = 0; b.dealt = []; window.sliceApi.redraw(); });
  await endTurn();
  await pg.waitForFunction(() => [...document.querySelectorAll('.state-band')].some((e) => e.textContent.includes('교착')), null, { timeout: 20000 });
  await W(250);
  await shot('stall-band');
  await waitMine();
  await W(2400);
  const row = await pg.evaluate(() => document.getElementById('intents')?.innerText ?? '');
  await shot('stall-intents');
  const hp0 = await pg.evaluate(() => window.slice().s.pieces.find((p) => p.side === 1 && p.type === 'K').hp);
  await endTurn();
  await waitMine();
  const hp1 = await pg.evaluate(() => window.slice().s.pieces.find((p) => p.side === 1 && p.type === 'K')?.hp ?? 0);
  await shot('stall-rusted');

  // ③ 퀸이 공용 카드(지휘)로 한 턴에 두 번
  await open();
  await pg.evaluate(() => { const a = window.sliceApi; const q = a.squad(); q.push({ t: 'Q', name: '녹슨 홀' }); a.startAt(1, 'battle'); });
  await W(1200);
  const qid = await pg.evaluate(() => { const b = window.slice(); b.hand = ['order', 'order', 'advance']; b.ap = 5; const q = b.s.pieces.find((p) => p.side === 0 && p.type === 'Q'); window.sliceApi.redraw(); return q.id; });
  const moves = async () => pg.evaluate((id) => window.sliceApi.cardMoves(window.slice(), 0, id), qid);
  await tapCard(0);
  let qp = await pg.evaluate((id) => { const p = window.slice().s.pieces.find((x) => x.id === id); return { x: p.x, y: p.y }; }, qid);
  await tapPos(qp);
  let m = await moves();
  const empty = (b, q) => !b.s.pieces.some((p) => p.x === q.x && p.y === q.y);
  let to = await pg.evaluate(({ id, ms }) => { const b = window.slice(); return ms.find((q) => !b.s.pieces.some((p) => p.x === q.x && p.y === q.y)) ?? ms[0]; }, { id: qid, ms: m });
  await shot('queen-first-aim');
  await tapPos(to);
  await W(1200);
  await tapCard(0);
  qp = await pg.evaluate((id) => { const p = window.slice().s.pieces.find((x) => x.id === id); return { x: p.x, y: p.y }; }, qid);
  await tapPos(qp);
  await shot('queen-second-aim');
  m = await moves();
  const second = m.length;
  if (m.length) { await tapPos(m[0]); await W(1200); }
  const handAfter = await pg.evaluate(() => window.slice().hand.filter((c) => c === 'order').length);
  await shot('queen-second-done');

  // ④ 보병 세트: 폰이 다 쓰러지면 턴 시작에 막사의 호출 / 표준 세트는 서지 않는다
  const callTest = async (set) => {
    await open();
    await pg.evaluate((s) => { void window.sliceApi.begin(7, 0, 'story', null, s); }, set);
    for (let k = 0; k < 12; k++) {
      await W(700);
      const sk = await pg.$('.cut-skip, .tut-skip, .stagefx');
      if (sk) await sk.click().catch(() => undefined);
    }
    await pg.evaluate(() => { window.sliceApi.startAt(1, 'battle'); });
    await W(1200);
    await pg.evaluate(() => { const b = window.slice(); b.s.pieces = b.s.pieces.filter((p) => !(p.side === 0 && p.type === 'P')); b.draw = ['advance', 'advance', 'advance', 'advance', 'advance', ...b.draw]; window.sliceApi.redraw(); });
    await endTurn();
    await waitMine();
    const pawns = await pg.evaluate(() => window.slice().s.pieces.filter((p) => p.side === 0 && p.type === 'P').length);
    await shot(`barracks-${set}`);
    return pawns;
  };
  const infPawns = await callTest('infantry');
  const stdPawns = await callTest('standard');
  console.log(JSON.stringify({ dict, row, hp0, hp1, second, handAfter, infPawns, stdPawns, errs }));
  await br.close();
})();
