// D-197 버그 수정 확인 (페르소나 테스트): 실제 화면에서 재현 시나리오를 다시 돌려 고쳐졌는지 본다.
// 미리 `npm run build` · `npx vite preview --port 4173`. 결과: production/qa/evidence/<날짜>-fix-*.png + 콘솔 JSON
const { chromium } = require('playwright');
const BASE = 'http://localhost:4173/';
const day = new Date().toISOString().slice(0, 10);
(async () => {
  const br = await chromium.launch();
  const out = {};
  const page = async (calm = true) => {
    const pg = await br.newPage({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true, reducedMotion: calm ? 'reduce' : 'no-preference' });
    pg.on('pageerror', (e) => (out.errors ??= []).push(e.message));
    return pg;
  };
  const shot = (pg, n) => pg.screenshot({ path: `production/qa/evidence/${day}-fix-${n}.png` });
  const A = (pg, fn, arg) => pg.evaluate(fn, arg);
  const playBest = (pg) => A(pg, () => {
    const b = window.slice(); const api = window.sliceApi; let best = null;
    for (let i = 0; i < b.hand.length; i++) for (const pc of api.cardPieces(b, i)) for (const to of api.cardMoves(b, i, pc.id)) {
      const sim = api.previewPlay(b, i, pc.id, to); if (!sim) continue; let sc = 0;
      for (const e of sim.events) if (e.type === 'attack') for (const h of e.hits) { const t = b.s.pieces.find((x) => x.id === h.targetId); if (t && t.side === 1) sc += h.damage; }
      if (!best || sc > best.sc) best = { i, pc, to, sc };
    }
    if (!best) return 0;
    document.querySelector(`[data-card="${best.i}"]`).click(); api.tap({ x: best.pc.x, y: best.pc.y }); api.tap(best.to); return best.sc;
  });

  // B1: 턴 끝 연타 (피해를 준 뒤 — 턴 합계 연출 대기 중)
  {
    const pg = await page(false);
    await pg.goto(BASE + '?debug'); await pg.waitForTimeout(900);
    await A(pg, () => window.sliceApi.startAt(1, 'battle'));
    await pg.waitForTimeout(2500);
    const dmg = await playBest(pg); await pg.waitForTimeout(2200);
    const t0 = await A(pg, () => window.slice().turn);
    for (let k = 0; k < 8; k++) { await pg.evaluate(() => document.getElementById('btn-end').click()); await pg.waitForTimeout(110); }
    await pg.waitForTimeout(6000);
    out.B1 = { dmg, turnBefore: t0, turnAfter: await A(pg, () => window.slice().turn) };
    await pg.close();
  }
  // M2: 이어하기 = 같은 손패
  {
    const pg = await page();
    await pg.goto(BASE + '?debug'); await pg.evaluate(() => localStorage.clear()); await pg.waitForTimeout(500);
    await A(pg, () => { window.sliceApi.map(2); });
    await pg.waitForTimeout(800);
    const go = async () => { const n = await pg.$('.mapfx .mnd.now'); if (n) { await n.click(); await pg.waitForTimeout(300); } const g = await pg.$$('.mapfx button'); for (const x of g) if ((await x.textContent()).trim() === '간다') { await x.click(); break; } await pg.waitForTimeout(4500); };
    await go();
    const h1 = await A(pg, () => ({ hand: window.slice().hand.join(','), at: JSON.parse(localStorage.getItem('pawnisher.slice.save') || '{}').at }));
    await pg.reload(); await pg.waitForTimeout(1500);
    // 오프닝 → 메뉴 → 이어하기
    const press = await pg.$('.opening'); if (press) { await press.click(); await pg.waitForTimeout(900); }
    const cont = await pg.$('[data-cont]'); if (cont) await cont.click();
    await pg.waitForTimeout(4500);
    const h2 = await A(pg, () => window.slice().hand.join(','));
    out.M2 = { before: h1, after: h2, same: h1.hand === h2, hadCont: !!cont };
    await pg.close();
  }
  // B2: 점화가 같은 턴에 다시 손에 들어오지 않는다
  {
    const pg = await page();
    await pg.goto(BASE + '?debug'); await pg.waitForTimeout(800);
    out.B2 = await A(pg, () => {
      window.sliceApi.startAt(1, 'battle');
      const b = window.slice();
      b.hand = ['spark', 'spark']; b.draw = []; b.discard = []; b.played = [];
      return 'set';
    });
    await pg.waitForTimeout(400);
    for (let k = 0; k < 6; k++) { await pg.evaluate(() => document.querySelector('[data-card="0"]')?.click()); await pg.waitForTimeout(500); }
    out.B2 = await A(pg, () => { const b = window.slice(); return { kills: b.kills, hand: b.hand.length, played: b.played?.length }; });
    await pg.close();
  }
  // 화면: 보드 크기(4×4 입문) · 안내서 ✕ · 반장 레일 · 고물상 확인 띠 · 판 사이 · 조사
  {
    const pg = await page();
    await pg.goto(BASE + '?debug'); await pg.waitForTimeout(800);
    await A(pg, () => window.sliceApi.start(0)); await pg.waitForTimeout(4200);
    const s = await pg.$('.stagefx'); if (s) { await s.click(); await pg.waitForTimeout(900); }
    out.board4 = await A(pg, () => { const b = window.slice(); return { w: b.s.width, h: b.s.height }; });
    await shot(pg, 'board4');
    await pg.click('#btn-help'); await pg.waitForTimeout(600); await shot(pg, 'help');
    await pg.click('#overlay .gd-x'); await pg.waitForTimeout(600);
    out.helpClosedX = await A(pg, () => document.getElementById('overlay').hidden);
    await pg.click('#btn-help'); await pg.waitForTimeout(600);
    await pg.mouse.click(30, 30); await pg.waitForTimeout(600);
    out.helpClosedOutside = await A(pg, () => document.getElementById('overlay').hidden);
    await A(pg, () => window.sliceApi.startAt(1, 'boss')); await pg.waitForTimeout(800);
    await A(pg, () => { const b = window.slice(); b.kills = 6; b.parts.push('coil', 'conductor', 'tape'); window.sliceApi.redraw(); });
    await pg.waitForTimeout(500);
    out.endBtn = await A(pg, () => { const r = document.getElementById('btn-end').getBoundingClientRect(); return { bottom: r.bottom, vh: innerHeight }; });
    await shot(pg, 'boss-rail');
    await A(pg, () => { window.sliceApi.gold(150); window.sliceApi.shop(); }); await pg.waitForTimeout(800);
    await shot(pg, 'shop');
    const items = await pg.$$('#overlay [data-buy]'); if (items.length) { await items[items.length - 1].click(); await pg.waitForTimeout(500); }
    out.josa = await A(pg, () => document.querySelector('.confirm-bar span')?.textContent);
    await shot(pg, 'shop-confirm');
    await pg.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await br.close();
})();
