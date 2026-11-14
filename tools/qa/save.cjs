// 베타 점검 (D-477): 저장 · 이어하기 — 지도 · 대국 중간 · 사이 화면에서 새로고침(앱 강제 종료와 같음)한 뒤
// 메뉴 「이어하기」로 같은 자리 · 같은 상태(막 · 줄 · 나사 · 덱 · 분대 HP)로 돌아오는지, 오류가 없는지 본다.
// 사용: 프리뷰 서버를 띄운 뒤 node tools/qa/save.cjs <출력 폴더>
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = (process.argv[2] ?? 'production/qa/save') + '/';
fs.mkdirSync(OUT, { recursive: true });
const W = (ms) => new Promise((r) => setTimeout(r, ms));
const URL = 'http://localhost:4173/?debug';
(async () => {
  const br = await chromium.launch();
  const p = await (await br.newContext({ viewport: { width: 915, height: 412 }, hasTouch: true })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(`PAGEERROR ${e.message} @ ${(e.stack || '').split('\n')[1] || ''}`));
  const state = () => p.evaluate(() => { const s = JSON.parse(localStorage.getItem('pawnisher.slice.save') || 'null'); return s && { at: s.at, actI: s.actI, rowI: s.rowI, node: s.node, gold: s.gold, deck: s.deck.length, hp: s.squad.map((u) => u.hp ?? 'full').join(','), parts: s.parts.length }; });
  const live = () => p.evaluate(() => { const a = window.sliceApi; const sq = a.squad(); return { squad: sq.length, hp: sq.map((u) => u.hp ?? 'full').join(','), battle: !!document.querySelector('#hand [data-card]') && !document.body.classList.contains('between'), map: !!document.querySelector('.mapfx'), turn: window.slice()?.turn }; });
  const cont = async () => {
    // 디버그 주소는 곧장 판을 세운다 — 실제 앱처럼 첫 화면(opening)부터 연다
    await p.goto(URL + '&opening');
    await p.waitForFunction(() => window.sliceApi);
    await p.waitForSelector('#boot', { state: 'detached', timeout: 20000 }).catch(() => {});
    await W(1500);
    // 첫 화면 누르기 → 메뉴 → 이어하기
    for (let i = 0; i < 6 && !(await p.$('[data-cont]')); i++) { await p.mouse.click(457, 300); await W(900); }
    const ok = await p.evaluate(() => { const b = document.querySelector('[data-cont]'); if (!b) return false; b.click(); return true; });
    await W(2500);
    for (let i = 0; i < 10; i++) { const c = await p.evaluate(() => { const b = [...document.querySelectorAll('.cut-skip')].find((x) => x.getClientRects().length); if (b) { b.click(); return true; } return false; }); if (!c) break; await W(900); }
    return ok;
  };
  const results = [];
  const check = async (label) => {
    const before = await state();
    const e0 = errs.length;
    const ok = await cont();
    const after = await state();
    const now = await live();
    await p.screenshot({ path: `${OUT}${label}.png` });
    const same = JSON.stringify(before) === JSON.stringify(after);
    const line = `${label}: 이어하기 ${ok ? '있음' : '없음!'} · 저장 ${same ? '그대로' : `바뀜 ${JSON.stringify(before)} → ${JSON.stringify(after)}`} · 화면 ${now.battle ? '대국' : now.map ? '지도' : '?'}${errs.length > e0 ? ` · 오류 ${errs.slice(e0).join(' / ')}` : ''}`;
    results.push(line);
    console.log(line);
  };
  // 새 출하
  await p.goto(URL);
  await p.waitForFunction(() => window.sliceApi);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('pawnisher.slice.meta', JSON.stringify({ tut: ['battle', 'battle-a', 'map', 'recruit', 'kit', 'promote', 'first_shop'], runs: 3, prologue: true, daily: {}, onboarded: true, storyCleared: 1 })); });
  await p.goto(URL);
  await p.waitForFunction(() => window.sliceApi);
  await W(2500);
  await p.evaluate(() => { void window.sliceApi.begin(777, 0, 'story'); });
  await W(2000);
  // 두 번째 출하부터 나오는 그림자 컷 · 판 소개를 눌러 넘긴다
  for (let i = 0; i < 30 && !(await p.evaluate(() => !!document.querySelector('#hand [data-card]') && !document.body.classList.contains('between') && !document.querySelector('.prologue, .actcard, .stagefx'))); i++) { await p.evaluate(() => { const b = [...document.querySelectorAll('.cut-skip')].find((x) => x.getClientRects().length); if (b) b.click(); }); await p.mouse.click(457, 300); await W(700); }
  console.log('in battle');
  // 1) 첫 대국 중간 (카드 하나 낸 뒤)
  console.log('move', await Promise.race([p.evaluate(async () => window.sliceApi.botMove('greedy')), W(15000).then(() => 'HANG')]));
  await W(1200);
  await check('01-battle-mid');
  // 판을 비워 이기고 보상 화면을 넘겨 지도로
  const win = async () => { await p.evaluate(() => { const b = window.slice(); b.s.pieces = b.s.pieces.filter((x) => x.side === 0); b.s.winner = 0; window.sliceApi.finish(); }); await W(4000); };
  const toMap = async () => {
    for (let i = 0; i < 30; i++) {
      if (await p.evaluate(() => !!document.querySelector('.mapfx') && !document.querySelector('#overlay:not([hidden])'))) return true;
      await p.evaluate(() => { const s = [...document.querySelectorAll('[data-slot]')].find((x) => x.offsetParent); if (s) s.click(); const b = [...document.querySelectorAll('[data-pick], [data-skip], button')].find((x) => x.getClientRects().length && !x.disabled && /고른다|건너뛴다|나아간다|확인|계속한다|떠난다/.test(x.textContent)); if (b) b.click(); });
      await W(1200);
    }
    return false;
  };
  await win();
  await toMap();
  await check('02-map-after-first');
  // 2) 지도에서 대국 노드로 → 대국 시작 직후
  await p.evaluate(() => { const n = document.querySelector('.mapfx .mnd.now, .mapfx [data-node].now'); if (n) n.click(); }); await W(900); await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.getClientRects().length && !x.disabled && /진입/.test(x.textContent)); if (b) b.click(); });
  await W(3000);
  await check('03-battle-start');
  await win();
  await toMap();
  // 3) 지도 몇 칸 더 (고물상 · 사건 · 작업대가 있으면 들어갔다 나온다)
  for (let step = 0; step < 4; step++) {
    await p.evaluate(() => { const n = document.querySelector('.mapfx .mnd.now, .mapfx [data-node].now'); if (n) n.click(); }); await W(900); await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.getClientRects().length && !x.disabled && /진입/.test(x.textContent)); if (b) b.click(); });
    await W(3000);
    if (await p.evaluate(() => !!document.querySelector('#hand [data-card]') && !document.body.classList.contains('between'))) { await win(); }
    await check(`04-mid-${step}`);
    await toMap();
  }
  fs.writeFileSync(OUT + 'report.txt', results.join('\n') + '\n\n' + errs.join('\n'));
  await br.close();
})();
