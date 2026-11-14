// 베타 점검 (D-477): 예전 버전 저장을 든 채 새 버전을 켤 때 — 옛 메타(캠페인 전) · 옛 출하 저장(나중에 생긴 칸이 없는 것)으로
// 첫 화면 → 메뉴 → 이어하기가 오류 없이 되는지. 사용: 프리뷰 서버를 띄운 뒤 node tools/qa/oldsave.cjs
const { chromium } = require('playwright');
const W = (ms) => new Promise((r) => setTimeout(r, ms));
const URL = 'http://localhost:4173/?debug&opening';
(async () => {
  const br = await chromium.launch();
  const p = await (await br.newContext({ viewport: { width: 915, height: 412 }, reducedMotion: 'reduce' })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(`PAGEERROR ${e.message} @ ${(e.stack || '').split('\n')[1] || ''}`));
  // 1) 지금 버전으로 저장 하나를 만든다 (지도에 선 상태)
  await p.goto('http://localhost:4173/?debug');
  await p.waitForFunction(() => window.sliceApi);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('pawnisher.slice.meta', JSON.stringify({ tut: ['battle', 'battle-a', 'map', 'recruit', 'kit', 'promote', 'first_shop'], runs: 3, prologue: true, daily: {}, onboarded: true })); });
  await p.goto('http://localhost:4173/?debug');
  await p.waitForFunction(() => window.sliceApi);
  await W(1500);
  await p.evaluate(() => { void window.sliceApi.begin(4242, 0, 'story'); });
  await W(1500);
  for (let i = 0; i < 10 && !(await p.evaluate(() => localStorage.getItem('pawnisher.slice.save'))); i++) { await p.evaluate(() => [...document.querySelectorAll('.cut-skip')].find((b) => b.getClientRects().length)?.click()); await W(800); }
  const fresh = await p.evaluate(() => localStorage.getItem('pawnisher.slice.save'));
  const sv = JSON.parse(fresh);
  // 2) 옛 모양으로 깎는다: 나중에 생긴 칸들을 지운다
  const old = { ...sv };
  for (const k of ['mode', 'chapter', 'promise', 'storyBeats', 'charms', 'first', 'svc', 'shopsSeen', 'bosses', 'actSnap', 'closeActs', 'highlight', 'clutchLeft', 'sacLeft']) delete old[k];
  old.picked = old.picked.slice(0, 3);
  old.squad = old.squad.map((u) => { const c = { ...u }; delete c.temper; delete c.doors; delete c.quirk; delete c.serial; return c; });
  const cases = [
    ['옛 메타(캠페인 전) + 지금 저장', { runs: 5, clears: 1, ascOpen: 3, bestAct: 4, daily: {}, prologue: true }, sv],
    ['옛 메타 + 옛 저장', { runs: 5, clears: 1, ascOpen: 3, bestAct: 4, daily: {}, prologue: true, unlocked: ['pawnFork'] }, old],
    ['깨진 저장(JSON 아님)', { runs: 2, prologue: true, daily: {} }, 'not-json'],
    ['저장 v1(버리는 옛 지도)', { runs: 2, prologue: true, daily: {} }, { ...sv, v: 1 }],
  ];
  for (const [name, meta, save] of cases) {
    const e0 = errs.length;
    await p.evaluate(([m, s]) => { localStorage.clear(); localStorage.setItem('pawnisher.slice.meta', JSON.stringify(m)); localStorage.setItem('pawnisher.slice.save', typeof s === 'string' ? s : JSON.stringify(s)); }, [meta, save]);
    await p.goto(URL);
    await p.waitForFunction(() => window.sliceApi);
    await W(2500);
    for (let i = 0; i < 8 && !(await p.$('[data-cont], [data-go]')); i++) { await p.mouse.click(457, 300); await W(800); }
    const hasCont = await p.evaluate(() => !!document.querySelector('[data-cont]'));
    if (hasCont) { await p.evaluate(() => document.querySelector('[data-cont]').click()); await W(3500); }
    const where = await p.evaluate(() => (document.querySelector('.mapfx') ? '지도' : document.getElementById('btn-end')?.getClientRects().length && !document.querySelector('.opening') ? '대국' : document.querySelector('[data-go]') ? '메뉴' : '?'));
    console.log(`${name}: 이어하기 ${hasCont ? '있음' : '없음'} → ${where}${errs.length > e0 ? ` · 오류 ${errs.slice(e0).join(' / ')}` : ' · 오류 없음'}`);
  }
  await br.close();
})();
