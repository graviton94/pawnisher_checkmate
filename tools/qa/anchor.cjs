// 기물 바닥 · 체력바 기준선 (D-525) — 2×2 반장(철갑 · 검수 · 조립, 격노 포함) · 일반 판 · 거대 주물 판을 찍고,
// 판 위 기물 위치(CSS px)를 JSON으로 남겨 체력바 확대 크롭(tools/qa/anchor_crop.py)에 쓴다.
// 사용: ANCHOR_TAG=before|after ANCHOR_SIZE=915|667 node tools/slice-observe.cjs anchor
//   (667은 OBSERVE_PRESET=small-mobile OBSERVE_DPR=2) → production/qa/evidence/2026-11-16-anchor-<태그>-<규격>-<판>.png (+ .json)
const fs = require('fs');
module.exports = async (pg) => {
  const tag = process.env.ANCHOR_TAG || 'after';
  const size = process.env.ANCHOR_SIZE || '915';
  const base = `production/qa/evidence/2026-11-16-anchor-${tag}-${size}`;
  const A = (fn, arg) => pg.evaluate(fn, arg);
  const settle = async (ms = 1600) => { await pg.waitForTimeout(ms); const s = await pg.$('.stagefx'); if (s) { await s.click(); await pg.waitForTimeout(500); } };
  const shot = async (n) => {
    await pg.screenshot({ path: `${base}-${n}.png` });
    const info = await A(() => {
      const b = window.slice();
      const one = window.sliceApi.screenOf({ x: 0, y: 0 }), two = window.sliceApi.screenOf({ x: 1, y: 0 });
      return {
        tile: Math.abs(two.x - one.x),
        dpr: window.devicePixelRatio,
        pieces: b.s.pieces.filter((p) => p.body === undefined).map((p) => ({ id: p.id, type: p.type, side: p.side, y: p.y, boss: !!(p.giant && p.giant.boss), giant: p.giant ? { dx: p.giant.dx, dy: p.giant.dy } : null, c: window.sliceApi.screenOf({ x: p.x, y: p.y }) })),
      };
    });
    fs.writeFileSync(`${base}-${n}.json`, JSON.stringify(info));
  };
  for (const [rule, act] of [['plate', 1], ['inspect', 1], ['spawn', 2]]) {
    await A(([r, a]) => window.sliceApi.bossOf(r, a), [rule, act]); await settle(2600);
    await shot(rule);
    await A(() => { const b = window.slice(); for (const p of b.s.pieces) if (p.giant && p.giant.boss) p.giant.rage = true; window.sliceApi.redraw(); });
    await pg.waitForTimeout(800);
    await shot(`${rule}-rage`);
  }
  await A(() => window.sliceApi.startAt(1, 'battle')); await settle(2600);
  await shot('normal');
  for (const g of ['P', 'R', 'Q']) { await A((t) => window.sliceApi.battleWith(2, 'check', { giants: [t], forms: undefined, process: undefined }), g); await settle(2600); await shot(`giant-${g}`); }
};
