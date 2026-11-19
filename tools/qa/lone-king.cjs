// 홀로 남은 적 킹 (D-663) · 축 규칙 부품 (D-662) 실화면 확인 — node tools/slice-observe.cjs lone-king
// ① 축 규칙 부품 여섯을 끼우고 2막 일반 대국을 연다 → 부품 칸 ② 호위를 하나만 남겨(HP 1) 봇 수로 쓰러뜨린다 → 알림 한 줄 · 「적의 수」가 한 수
module.exports = async (pg, shot) => {
  const A = (fn, arg) => pg.evaluate(fn, arg);
  await A(() => { window.sliceApi.parts(['leadSpur', 'pikeRow', 'shieldEdge', 'quench', 'ramRod', 'snareFork']); window.sliceApi.startAt(2, 'battle'); });
  await pg.waitForTimeout(2500);
  for (let i = 0; i < 4; i++) { const s = await pg.$('.stagefx'); if (s) { await s.click(); await pg.waitForTimeout(500); } }
  await shot('lone-king-parts');
  // 호위 하나만 남기고 HP 1 — 내 기물이 칠 수 있는 자리에 둔다
  const ok = await A(() => {
    const b = window.slice();
    const foes = b.s.pieces.filter((p) => p.side === 1 && p.type !== 'K');
    const keep = foes[0];
    b.s.pieces = b.s.pieces.filter((p) => p.side === 0 || p.type === 'K' || p === keep);
    if (!keep) return false;
    keep.hp = 1; keep.shield = 0;
    const mine = b.s.pieces.find((p) => p.side === 0 && p.type === 'K');
    const spot = [[1, 1], [-1, 1], [1, 0], [-1, 0], [0, 1]].map(([dx, dy]) => ({ x: mine.x + dx, y: mine.y + dy })).find((q) => q.x >= 0 && q.y >= 0 && q.x < b.s.width && q.y < b.s.height && !b.s.pieces.some((p) => p.x === q.x && p.y === q.y));
    if (spot) Object.assign(keep, spot);
    b.intents = [];
    b.hand = ['kingStep', 'kingStep', 'kingStep'];
    b.ap = 3;
    window.sliceApi.redraw();
    return true;
  });
  if (!ok) throw new Error('no escort');
  await pg.waitForTimeout(600);
  for (let i = 0; i < 3; i++) {
    const left = await A(() => window.slice().s.pieces.filter((p) => p.side === 1 && p.type !== 'K').length);
    if (!left) break;
    await A(() => window.sliceApi.botMove('greedy'));
    await pg.waitForTimeout(1200);
  }
  await pg.waitForTimeout(900);
  await shot('lone-king-notice');
  await pg.waitForTimeout(2200);
  await shot('lone-king-notice2');
  // 턴을 끝내면 적 킹은 한 번만 움직이고, 다음 차례 예고도 한 수다
  for (let i = 0; i < 6; i++) { const r = await A(() => window.sliceApi.botMove('greedy')); await pg.waitForTimeout(1200); if (r === 'end') break; }
  await pg.waitForTimeout(4000);
  await shot('lone-king-plan');
  const state = await A(() => ({ told: !!window.slice().loneTold, foes: window.slice().s.pieces.filter((p) => p.side === 1).map((p) => p.type).join('') }));
  console.log('lone-king', JSON.stringify(state), 'intents', await A(() => window.slice().intents.length));
};
