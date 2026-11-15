// 2×2 특별 보스 (D-513) 판 위 읽힘 확인 — 반장 판 · 도금왕 판 · 길게 누르기 · 한 턴 뒤(걷기 · 내리찍기 예고)
// 사용: node tools/slice-observe.cjs boss2x2 → production/qa/evidence/2026-11-16-boss2x2-*.png
module.exports = async (pg) => {
  const shot = (n) => pg.screenshot({ path: `production/qa/evidence/2026-11-16-boss2x2-${n}.png` });
  const A = (fn, arg) => pg.evaluate(fn, arg);
  const settle = async (ms = 1600) => { await pg.waitForTimeout(ms); const s = await pg.$('.stagefx'); if (s) { await s.click(); await pg.waitForTimeout(500); } };
  await A(() => window.sliceApi.bossOf('plate', 1)); await settle(2600);
  await shot('plate-t1');
  await A(() => { const b = window.slice(); const k = b.s.pieces.find((p) => p.side === 1 && p.giant && p.giant.boss && p.body === undefined); window.sliceApi.peekAt({ x: k.x + 1, y: k.y + 1 }); });
  await pg.waitForTimeout(700); await shot('plate-peek');
  await pg.mouse.click(5, 5); await pg.waitForTimeout(300);
  await A(() => document.getElementById('btn-end').click()); await pg.waitForTimeout(400);
  await A(() => { const e = document.getElementById('btn-end'); if (e.classList.contains('warn')) e.click(); });
  await settle(9000);
  await shot('plate-t2');
  await A(() => window.sliceApi.bossOf('magnet', 2)); await settle(2600);
  await shot('magnet-t1');
  await A(() => window.sliceApi.finalAt(0)); await settle(2600);
  await shot('gilded-t1');
};
