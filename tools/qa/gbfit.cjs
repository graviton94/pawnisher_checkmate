// 2×2 반장 · 거대 주물 판 위 어울림 비교 (D-526 검토 중) — 반장 다섯(1단계 · 격노) · 거대 주물 셋을 실제 판에서 찍는다.
// 사용: GBFIT_TAG=base|<안> [GBFIT_DIR=<대체 그림 폴더>] [GBFIT_ONLY=plate,magnet,P] node tools/slice-observe.cjs gbfit
//   GBFIT_DIR이 있으면 pieces/s|l-boss-*.png · s|l-giant*.png 요청을 그 폴더의 같은 이름 파일로 바꿔 준다(게임 기본값은 그대로 — 사용자가 고를 안 비교용).
//   결과: GBFIT_OUT(기본 production/qa/evidence)/2026-11-16-gbfit-<태그>-<판>.png + .json(기물 화면 위치)
const fs = require('fs');
const path = require('path');
module.exports = async (pg) => {
  const tag = process.env.GBFIT_TAG || 'base';
  const out = process.env.GBFIT_OUT || 'production/qa/evidence';
  const dir = process.env.GBFIT_DIR;
  const only = process.env.GBFIT_ONLY ? process.env.GBFIT_ONLY.split(',') : null; // 반장 · 거대 일부만 (예: plate,magnet,P)
  const want = (k) => !only || only.includes(k);
  if (dir) {
    await pg.route(/\/pieces\/[sl]-(boss-|giant)[^/]*\.png/, (route) => {
      const f = path.join(dir, path.basename(new URL(route.request().url()).pathname));
      if (fs.existsSync(f)) route.fulfill({ status: 200, contentType: 'image/png', body: fs.readFileSync(f) });
      else route.continue();
    });
    await pg.reload(); await pg.waitForSelector('#boot', { state: 'detached' }); await pg.waitForTimeout(300);
  }
  const A = (fn, arg) => pg.evaluate(fn, arg);
  const settle = async (ms = 1600) => { await pg.waitForTimeout(ms); const s = await pg.$('.stagefx'); if (s) { await s.click(); await pg.waitForTimeout(500); } };
  const shot = async (n) => {
    const base = `${out}/2026-11-16-gbfit-${tag}-${n}`;
    await pg.screenshot({ path: `${base}.png` });
    const info = await A(() => {
      const b = window.slice();
      const one = window.sliceApi.screenOf({ x: 0, y: 0 }), two = window.sliceApi.screenOf({ x: 1, y: 0 });
      return {
        tile: Math.abs(two.x - one.x), dpr: window.devicePixelRatio,
        pieces: b.s.pieces.filter((p) => p.body === undefined).map((p) => ({ id: p.id, type: p.type, side: p.side, x: p.x, y: p.y, boss: !!(p.giant && p.giant.boss), giant: p.giant ? { dx: p.giant.dx, dy: p.giant.dy } : null, c: window.sliceApi.screenOf({ x: p.x, y: p.y }) })),
      };
    });
    fs.writeFileSync(`${base}.json`, JSON.stringify(info));
  };
  for (const [rule, act] of [['plate', 1], ['inspect', 1], ['spawn', 2], ['magnet', 2], ['thorns', 3]]) {
    if (!want(rule)) continue;
    await A(([r, a]) => window.sliceApi.bossOf(r, a), [rule, act]); await settle(2600);
    await shot(rule);
    await A(() => { const b = window.slice(); for (const p of b.s.pieces) if (p.giant && p.giant.boss) p.giant.rage = true; window.sliceApi.redraw(); });
    await pg.waitForTimeout(800);
    await shot(`${rule}-rage`);
  }
  for (const g of ['P', 'R', 'Q']) { if (!want(g)) continue; await A((t) => window.sliceApi.battleWith(2, 'check', { giants: [t], forms: undefined, process: undefined }), g); await settle(2600); await shot(`giant-${g}`); }
};
