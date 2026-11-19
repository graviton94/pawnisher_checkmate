// 조건 표시 (D-592 발동 유형): 손패 램프 · 판 조건 칸 모서리 · 기물 발치 램프 · 부품 칸 상태형 표지를 실제 화면에서 본다.
// 사용: node tools/slice-observe.cjs card-cond (OBSERVE_PRESET · OBSERVE_WIDTH/HEIGHT/DPR로 크기) — 결과 card-cond-hand · card-cond-board · card-cond-parts
module.exports = async (pg, shot) => {
  await pg.evaluate(() => window.sliceApi.parts(['vise', 'lastAxle', 'forkGear', 'horseshoe']));
  await pg.evaluate(() => window.sliceApi.startAt(1, 'battle'));
  await pg.waitForTimeout(2500);
  const skip = async () => { const s = await pg.$('.stagefx'); if (s) { await s.click(); await pg.waitForTimeout(400); } };
  await skip();
  // 판을 세운다: 나이트가 포크 칸을 갖게 적 둘을 옮기고(엔진 cardCond로 찾는다), 손패 = 포크 · 피의 질주 · 처형 · 방출 · 도약, 연쇄 3 · 나이트가 이번 턴 처치
  const info = await pg.evaluate(() => {
    const b = window.slice(), api = window.sliceApi;
    b.hand = ['knightFork', 'rebound', 'finisher', 'vent', 'leap'];
    b.ap = 3; b.kills = 3;
    const n = b.s.pieces.find((p) => p.side === 0 && p.type === 'N');
    const k = b.s.pieces.find((p) => p.side === 0 && p.type === 'K');
    b.killers = n ? [n.id] : [];
    if (k) k.hp = Math.max(1, Math.floor(k.maxHp * 0.25));
    const foes = b.s.pieces.filter((p) => p.side === 1 && p.type !== 'K').slice(0, 2);
    const free = [];
    for (let y = 0; y < b.s.height; y++) for (let x = 0; x < b.s.width; x++) if (!b.s.pieces.some((p) => p.x === x && p.y === y)) free.push({ x, y });
    let found = false;
    const save = foes.map((f) => ({ x: f.x, y: f.y }));
    outer: for (const a of free) for (const z of free) {
      if (a === z) continue;
      Object.assign(foes[0], a); Object.assign(foes[1], z);
      if (api.cardCond(b, 0).on) { found = true; break outer; }
    }
    if (!found) foes.forEach((f, i) => Object.assign(f, save[i]));
    if (foes[0]) { b.pinned = [foes[0].id]; }
    api.redraw();
    return { found, knight: n && { x: n.x, y: n.y }, cond: [0, 1, 2, 3, 4].map((i) => api.cardCond(b, i)) };
  });
  console.log('CARDCOND', JSON.stringify(info));
  await pg.waitForTimeout(600);
  await shot('card-cond-hand');
  // 카드(나이트 포크) → 나이트 → 조건 칸 황동 모서리
  await pg.tap('#hand [data-card="0"]'); await pg.waitForTimeout(300);
  if (info.knight) await pg.evaluate((pos) => window.sliceApi.tap(pos), info.knight);
  await pg.waitForTimeout(700);
  const sel = await pg.evaluate(() => window.sliceApi.sel());
  console.log('CARDCOND sel', JSON.stringify(sel));
  await shot('card-cond-board');
  // 부품 칸 상태 표지
  const chips = await pg.evaluate(() => [...document.querySelectorAll('.part-chip')].map((c) => c.getAttribute('aria-label')));
  console.log('CARDCOND parts', JSON.stringify(chips));
  const lit = await pg.evaluate(() => [...document.querySelectorAll('#hand .hc')].map((c) => `${c.className.replace(/\s+/g, ' ')} | ${c.querySelector('.hc-fx')?.textContent}`));
  console.log('CARDCOND hand', JSON.stringify(lit));
  const parts = await pg.$('.part-chip');
  if (parts) { await parts.scrollIntoViewIfNeeded(); }
  await shot('card-cond-parts');
};
