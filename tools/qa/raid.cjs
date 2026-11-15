// 레이드 반장 (D-518) 판 위 읽힘 확인 — 패링 직전(예고 칸 위 방열판 룩) · 패링 순간(띠 · 몸 위 「경직!」) · 경직 턴(별 딱지 · 약점 딱지 · 토스트) · 길게 누르기
// 사용: node tools/slice-observe.cjs raid → production/qa/evidence/2026-11-16-raid-*.png
module.exports = async (pg) => {
  const shot = (n) => pg.screenshot({ path: `production/qa/evidence/2026-11-16-raid-${n}.png` });
  const A = (fn, arg) => pg.evaluate(fn, arg);
  const settle = async (ms = 1600) => { await pg.waitForTimeout(ms); const s = await pg.$('.stagefx'); if (s) { await s.click(); await pg.waitForTimeout(500); } };
  await A(() => window.sliceApi.bossOf('plate', 1)); await settle(2600);
  // 반장 바로 앞(1턴 내리찍기 = 우리 쪽 한 변) 칸에 내 룩을 세우고 방열판 40 — 막아 낼 수 있는 자리
  await A(() => {
    const b = window.slice();
    const k = b.s.pieces.find((p) => p.side === 1 && p.giant && p.giant.boss && p.body === undefined);
    const at = { x: k.x, y: k.y - 1 };
    b.s.pieces = b.s.pieces.filter((p) => !(p.x === at.x && p.y === at.y) || p.side === 0);
    const r = b.s.pieces.find((p) => p.side === 0 && p.type === 'R') || b.s.pieces.find((p) => p.side === 0 && p.type !== 'K');
    Object.assign(r, at);
    r.shield = 40;
    b.intents = [];
    window.sliceApi.redraw();
  });
  await pg.waitForTimeout(700);
  await shot('parry-ready');
  await A(() => document.getElementById('btn-end').click()); await pg.waitForTimeout(300);
  await A(() => { const e = document.getElementById('btn-end'); if (e.classList.contains('warn')) e.click(); });
  await pg.waitForTimeout(1000); await shot('parry'); // 띠 「패링! … 경직」 · 몸 위 「경직!」 (적 차례 약 1초 뒤)
  await settle(7000);
  await A(() => { const b = window.slice(); const k = b.s.pieces.find((p) => p.side === 1 && p.giant && p.giant.boss && p.body === undefined); window.sliceApi.peekAt({ x: k.x + 1, y: k.y + 1 }); });
  await pg.waitForTimeout(700); await shot('stun-peek');
};
