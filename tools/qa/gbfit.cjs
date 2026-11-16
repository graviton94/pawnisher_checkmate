// 2×2 반장 · 거대 주물 · 이형 판 위 어울림 비교 (D-526 · D-527 검토 중) — 반장 일곱(1단계 · 격노) · 거대 주물 셋 · 이형 다섯(forms)을 실제 판에서 찍는다.
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
    await pg.route(/\/pieces\/[sl]-(boss-|giant|cannon|camel|hopper|archbishop|chancellor)[^/]*\.png/, (route) => {
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
        pieces: b.s.pieces.filter((p) => p.body === undefined).map((p) => ({ id: p.id, type: p.type, form: p.form ?? null, side: p.side, x: p.x, y: p.y, boss: !!(p.giant && p.giant.boss), giant: p.giant ? { dx: p.giant.dx, dy: p.giant.dy } : null, c: window.sliceApi.screenOf({ x: p.x, y: p.y }) })),
      };
    });
    fs.writeFileSync(`${base}.json`, JSON.stringify(info));
  };
  for (const [rule, act] of [['plate', 1], ['inspect', 1], ['spawn', 2], ['magnet', 2], ['thorns', 3], ['alarm', 3], ['gilded', 0]]) {
    if (!want(rule)) continue;
    // 도금왕(D-527)은 종막 판(8×7) — 다른 반장은 그 막 반장 판
    if (rule === 'gilded') await A(() => window.sliceApi.finalAt(0)); else await A(([r, a]) => window.sliceApi.bossOf(r, a), [rule, act]);
    await settle(2600);
    await shot(rule);
    await A(() => { const b = window.slice(); for (const p of b.s.pieces) if (p.giant && p.giant.boss) p.giant.rage = true; window.sliceApi.redraw(); });
    await pg.waitForTimeout(800);
    await shot(`${rule}-rage`);
  }
  // 이형 다섯 (D-527): 바탕 기물과 같은 판(적 = 이형 다섯 + 보통 기물)
  if (want('forms')) { await A(() => window.sliceApi.battleWith(2, 'check', { enemy: ['K', 'R', 'N', 'Q', 'B', 'R', 'P'], forms: ['cannon', 'camel', 'hopper', 'archbishop', 'chancellor'], giants: undefined, process: undefined })); await settle(2600); await shot('forms'); }
  // 약점 딱지 (D-527 RD-01): 이형 판에서 이형 하나 · 우리 기물 하나에 약점 창을 걸고 다시 그린다 (GBFIT_ONLY=weak으로만)
  if (only && only.includes('weak')) {
    await A(() => window.sliceApi.battleWith(2, 'check', { enemy: ['K', 'R', 'N', 'Q', 'B', 'R', 'P'], forms: ['cannon', 'camel', 'hopper', 'archbishop', 'chancellor'], giants: undefined, process: undefined })); await settle(2600);
    await A(() => { const b = window.slice(); const f = b.s.pieces.find((p) => p.form); const m = b.s.pieces.find((p) => p.side === 0 && p.type !== 'K'); if (f) f.weak = 1.4; if (m) m.weak = 1.6; window.sliceApi.redraw(); });
    await pg.waitForTimeout(800); await shot('weak');
  }
  for (const g of ['P', 'R', 'Q']) { if (!want(g)) continue; await A((t) => window.sliceApi.battleWith(2, 'check', { giants: [t], forms: undefined, process: undefined }), g); await settle(2600); await shot(`giant-${g}`); }
};
