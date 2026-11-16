// 2×2 반장 몸 그림 × 일반 흑 기물 어울림 (D-524) — 반장 판 1단계 · 격노를 같은 판에서 찍는다
// 사용: GB_TAG=before|after node tools/slice-observe.cjs gbharmony → production/qa/evidence/2026-11-16-gbharmony-<태그>-<반장>[-rage].png
module.exports = async (pg) => {
  const tag = process.env.GB_TAG || 'after';
  const shot = (n) => pg.screenshot({ path: `production/qa/evidence/2026-11-16-gbharmony-${tag}-${n}.png` });
  const A = (fn, arg) => pg.evaluate(fn, arg);
  const settle = async (ms = 1600) => { await pg.waitForTimeout(ms); const s = await pg.$('.stagefx'); if (s) { await s.click(); await pg.waitForTimeout(500); } };
  for (const [rule, act] of [['plate', 1], ['inspect', 1], ['spawn', 2]]) {
    await A(([r, a]) => window.sliceApi.bossOf(r, a), [rule, act]); await settle(2600);
    await shot(rule);
    await A(() => { const b = window.slice(); for (const p of b.s.pieces) if (p.giant && p.giant.boss) p.giant.rage = true; window.sliceApi.redraw(); });
    await pg.waitForTimeout(800);
    await shot(`${rule}-rage`);
  }
};
