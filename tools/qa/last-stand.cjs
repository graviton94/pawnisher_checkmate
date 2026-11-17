// 사선(자원 희생) 시점 점검 (D-548): 킹이 쓰러질 판에서 「턴 끝」 첫 누름 = 경고만 · 둘째 누름 = 적 공격 전에 창 ·
// 받아들이면 자리 바꿈 뒤 적 차례 · 맞은 뒤 내 차례 시작에는 창이 다시 뜨지 않는다.
// 사용: node tools/slice-observe.cjs last-stand
module.exports = async (pg, shot) => {
  const A = (fn, arg) => pg.evaluate(fn, arg);
  pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console', m.type(), m.text().slice(0, 200)); });
  const W = (ms) => pg.waitForTimeout(ms);
  const win = () => A(() => !document.getElementById('overlay').hidden && !!document.querySelector('#overlay-panel [data-yes]'));
  const kingHp = () => A(() => window.slice().s.pieces.find((p) => p.side === 0 && p.type === 'K')?.hp);
  await A(() => window.sliceApi.startAt(1, 'battle')); await W(2500);
  const ok = await A(() => {
    const api = window.sliceApi; const b = window.slice();
    api.sacSet(1);
    if (!api.doom()) return 'no-danger-square';
    const k = b.s.pieces.find((p) => p.side === 0 && p.type === 'K');
    const mate = b.s.pieces.find((p) => p.side === 0 && p.type !== 'K');
    // 곁의 분대원을 바꿔 서면 킹이 사는 칸에 세운다 (모두 예고 안이면 창이 뜨지 않는 게 맞다)
    const cells = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dy]) => ({ x: k.x + dx, y: k.y + dy }))
      .filter((c) => c.x >= 0 && c.y >= 0 && c.x < b.s.width && c.y < b.s.height && !b.s.pieces.some((p) => p.x === c.x && p.y === c.y));
    const others = b.s.pieces.filter((p) => p.side === 0 && p.type !== 'K');
    for (const c of cells) {
      Object.assign(mate, { x: c.x, y: c.y });
      // 다른 분대원은 킹 곁에서 비킨다 (후보가 하나뿐이게)
      if (api.offerPeek() === mate.id) { b.snap = JSON.stringify({ ...b, snap: '' }); api.redraw(); return 'ok ' + JSON.stringify(c) + ' others ' + others.length; }
    }
    return 'no-saving-cell';
  });
  console.log('setup', ok);
  await W(500); await shot('stand-0-doomed');
  await pg.tap('#btn-end'); await W(900);
  console.log('first press -> window?', await win(), '(want false: warn only)');
  await shot('stand-1-warn');
  await pg.tap('#btn-end'); await W(900);
  console.log('second press -> window?', await win(), '(want true) · king hp before hits', await kingHp());
  await shot('stand-2-offer');
  const kpos = () => A(() => { const k = window.slice().s.pieces.find((p) => p.side === 0 && p.type === 'K'); return k ? `${k.x},${k.y}` : '-'; });
  console.log('king at', await kpos(), 'mate/cands', await A(() => { const b = window.slice(); const k = b.s.pieces.find((p) => p.side === 0 && p.type === 'K'); return JSON.stringify(b.s.pieces.filter((p) => p.side === 0).map((p) => [p.id, p.type, p.x, p.y, p.hp])) + ' squadIds ' + JSON.stringify(b.squadIds); }));
  await W(800);
  if (await win()) { const r = await pg.$eval('#overlay-panel [data-yes]', (e) => { const b = e.getBoundingClientRect(); return [b.x, b.y, b.width, b.height, document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)?.outerHTML.slice(0, 80)]; }); console.log('yes rect', r); await pg.tap('#overlay-panel [data-yes]'); }
  await W(1500);
  console.log('after accept: king at', await kpos(), '· window?', await win(), '· winner', await A(() => window.slice().s.winner));
  await pg.waitForFunction(() => window.slice().turn >= 2 || window.slice().s.winner !== null, null, { timeout: 30000 }).catch(() => {});
  await W(6000);
  console.log('after enemy turn -> window?', await win(), '(want false) · turn', await A(() => window.slice().turn), '· king hp', await kingHp(), 'at', await kpos());
  await shot('stand-3-after');
};
