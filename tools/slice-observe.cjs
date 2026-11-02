// 본편(리뉴얼판, index.html) 실화면 확인 — 모바일 가로 915×412 · DPR 2.625 · 터치.
// 미리 `npm run build`와 `npx vite preview --port 4173`. 결과: production/qa/evidence/<날짜>-slice-<장면>.png
// 사용: node tools/slice-observe.cjs <title|continue|event:<사건 id>|backlash|map|shop|forge>
const { chromium } = require('playwright');
const BASE = process.env.OBSERVE_URL || 'http://localhost:4173/';
const day = new Date().toISOString().slice(0, 10);
(async () => {
  const sc = process.argv[2] || 'title';
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
  pg.on('pageerror', (e) => console.log('ERR', e.message));
  const shot = (n) => pg.screenshot({ path: `production/qa/evidence/${day}-slice-${n}.png` });
  const skip = async () => { const s = await pg.$('.stagefx'); if (s) { await s.click(); await pg.waitForTimeout(500); } };
  if (sc === 'title' || sc === 'continue') {
    await pg.goto(BASE); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(1200);
    await shot('title');
    if (sc === 'continue') {
      await pg.click('#overlay [data-go]'); await pg.waitForTimeout(700); await skip();
      await pg.reload(); await pg.waitForTimeout(1200); await shot('title-continue');
      await pg.click('#overlay [data-cont]'); await pg.waitForTimeout(1200); await shot('continued');
    }
  } else {
    await pg.goto(BASE + '?debug'); await pg.waitForTimeout(900); await skip();
    const A = (fn, arg) => pg.evaluate(fn, arg);
    if (sc.startsWith('event:')) { await A((id) => { window.sliceApi.gold(50); window.sliceApi.event(id); }, sc.slice(6)); }
    else if (sc === 'map') await A(() => window.sliceApi.map(2));
    else if (sc === 'shop') await A(() => { window.sliceApi.gold(120); window.sliceApi.shop(); });
    else if (sc === 'forge') await A(() => window.sliceApi.forge());
    else if (sc === 'backlash') {
      const f = await A(() => { const S = window.sliceApi; S.startAt(2, 'battle'); const b = window.slice();
        for (const p of b.s.pieces) if (p.side === 1 && p.type !== 'K') p.hp = 1;
        const occ = (x, y) => b.s.pieces.some((q) => q.x === x && q.y === y);
        const find = () => { for (let i = 0; i < b.hand.length; i++) for (const p of S.cardPieces(b, i)) for (const to of S.cardMoves(b, i, p.id)) { const sim = S.previewPlay(b, i, p.id, to); if (sim && sim.state.winner === null && S.backlashOf(b, sim) > 0) return { i, x: p.x, y: p.y }; } return null; };
        for (const ep of b.s.pieces.filter((q) => q.side === 1 && q.type === 'P')) { const ox = ep.x, oy = ep.y;
          for (let x = 0; x < b.s.width; x++) for (let y = 0; y < b.s.height; y++) { if (occ(x, y)) continue; ep.x = x; ep.y = y; const r = find(); if (r) { S.redraw(); return r; } ep.x = ox; ep.y = oy; } }
        return null; });
      if (f) { await pg.click(`[data-card="${f.i}"]`); await pg.mouse.move(900, 400); await pg.waitForTimeout(300); await A((p) => window.sliceApi.tap(p), f); }
    }
    await pg.waitForTimeout(600);
    await shot(sc.replace(':', '-'));
  }
  await br.close();
})();
