// node tools/slice-observe.cjs builds — 모바일 터치·미리보기·실행·되감기·첫막·저장 격리.
const assert = require('node:assert/strict');
module.exports = async (pg, shot) => {
  const saved = await pg.evaluate(() => JSON.stringify(localStorage));
  const tile = (pos) => pg.evaluate((p) => window.sliceApi.screenOf(p), pos);
  const tapTile = async (pos) => { const p = await tile(pos); await pg.touchscreen.tap(p.x, p.y); };
  const read = () => pg.evaluate(() => { const b = window.slice(); return { ap: b.ap, once: b.once, shield: b.s.pieces.find((p) => p.id === b.squadIds[3])?.shield }; });
  await pg.evaluate(() => window.sliceApi.buildPick());
  await pg.waitForTimeout(600);
  await shot('builds-pick');
  const buttons = await pg.locator('[data-build]').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, y: r.y }; }));
  assert.equal(buttons.length, 3);
  assert(buttons.every((r) => r.h >= 48));
  assert(buttons.slice(1).every((r, i) => r.y - buttons[i].y - buttons[i].h >= 8));
  const panel = await pg.locator('#overlay-panel').evaluate((e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height }; });
  assert(Math.abs(panel.w - 592) <= 1);
  assert(panel.h <= 364);
  await pg.tap('[data-build="rook"]');
  await pg.waitForTimeout(500);
  await pg.tap('[data-part-info="siegeLatch"]');
  await pg.waitForTimeout(250);
  await shot('builds-rook-detail');
  await pg.tap('[data-card="2"]');
  await tapTile({ x: 5, y: 0 });
  const target = await tile({ x: 5, y: 2 });
  // CDP 터치 유지: 실제 Phaser longPress 경로를 통과한다.
  const cdp = await pg.context().newCDPSession(pg);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: target.x, y: target.y }] });
  await pg.waitForTimeout(550);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await pg.waitForTimeout(250);
  assert.match(await pg.locator('.k-peek').last().innerText(), /방열판 15 → 3/);
  await shot('builds-rook-preview');
  assert.equal((await read()).shield, 15);
  await tapTile({ x: 5, y: 2 });
  await pg.waitForFunction(() => window.slice().once.some((s) => s.startsWith('siegeLatch:')));
  await pg.waitForTimeout(1500);
  assert.equal((await read()).shield, 3);
  await shot('builds-rook-played');
  await pg.tap('#btn-rewind');
  await pg.waitForTimeout(300);
  // 기존 되감기 확인창의 진행 버튼을 터치한다.
  const yes = pg.locator('[data-yes]');
  if (await yes.count()) await yes.last().tap();
  await pg.waitForTimeout(1000);
  assert.equal((await read()).shield, 15);
  assert(!(await read()).once.some((s) => s.startsWith('siegeLatch:')));
  await shot('builds-rewound');
  for (const id of ['mixed', 'knight']) {
    await pg.evaluate(() => window.sliceApi.buildPick());
    await pg.tap(`[data-build="${id}"]`);
    await pg.waitForTimeout(500);
    await shot(`builds-${id}`);
  }
  // 종료 상태만 배치하고 이후는 실제 단추로 진행한다. 승률·재미를 판정하지 않는다.
  await pg.evaluate(() => { window.slice().s.winner = 0; window.sliceApi.finish(); });
  await pg.waitForTimeout(400);
  await pg.tap('[data-build-next]');
  await pg.waitForTimeout(500);
  assert.equal(await pg.evaluate(() => window.slice().boss), false);
  await shot('builds-act1');
  for (let i = 0; i < 2; i++) {
    await pg.evaluate(() => { window.slice().s.winner = 0; window.sliceApi.finish(); });
    await pg.waitForTimeout(300);
    await pg.tap('[data-build-next]');
    await pg.waitForTimeout(400);
  }
  assert.equal(await pg.evaluate(() => window.slice().boss), true);
  await shot('builds-boss1');
  assert.equal(await pg.evaluate(() => JSON.stringify(localStorage)), saved);
  console.log('Build UI: touch preview, execution, rewind, three builds, first-act transitions, save isolation PASS');
};
