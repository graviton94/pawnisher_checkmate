// 공격 이펙트 관찰 도구: 기물 유형마다 공격 장면을 만들어 4배 느리게(?fxslow) 재생하고 프레임을 찍는다.
// 미리 `npm run build`와 `npx vite preview --port 4173`.
// 사용: node tools/fx-observe.cjs <출력 폴더> [P,N,B,R,Q,K]
const { chromium } = require('playwright');

/** 엔진 좌표 (플레이어 아래쪽, y가 클수록 적 쪽). 공격자 출발 → 도착, 적 폰 배치 */
const CASES = {
  P: { from: [3, 1], to: [3, 2], foes: [[2, 3], [4, 3]] },
  N: { from: [1, 0], to: [2, 2], foes: [[1, 4], [4, 3], [3, 4]] },
  B: { from: [2, 0], to: [4, 2], foes: [[6, 4], [2, 4], [7, 5]] },
  R: { from: [0, 2], to: [3, 2], foes: [[3, 6], [6, 2]] },
  Q: { from: [3, 0], to: [3, 3], foes: [[3, 6], [6, 6], [0, 6], [6, 3]] },
  K: { from: [4, 0], to: [4, 1], foes: [[3, 2], [5, 2]] },
};

(async () => {
  const out = process.argv[2] || 'production/qa/evidence';
  const only = process.argv[3] ? process.argv[3].split(',') : Object.keys(CASES);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4173/?debug&fxslow');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(800);
  await page.tap('[data-test]');
  await page.tap('[data-sc="full"]');
  await page.tap('[data-go]');
  await page.waitForTimeout(800);
  for (const type of only) {
    const c = CASES[type];
    await page.evaluate(([type, c]) => {
      const ctl = window.pawnisher;
      ctl.start({ id: 'fx', title: 'fx', desc: '', width: 8, height: 8, decks: [type === 'K' ? ['K', 'P'] : ['K', type], ['K', 'P', 'P', 'P', 'P']], weights: ctl.enemyWeights }, 0, null);
      const s = structuredClone(ctl.state);
      const mine = s.pieces.filter((p) => p.side === 0);
      const actor = type === 'K' ? mine.find((p) => p.type === 'K') : mine.find((p) => p.type === type);
      const king = mine.find((p) => p !== actor);
      if (king) Object.assign(king, { x: 7, y: 0 });
      Object.assign(actor, { x: c.from[0], y: c.from[1] });
      const foes = s.pieces.filter((p) => p.side === 1);
      Object.assign(foes.find((p) => p.type === 'K'), { x: 7, y: 7 });
      foes.filter((p) => p.type !== 'K').forEach((p, i) => Object.assign(p, c.foes[i] ? { x: c.foes[i][0], y: c.foes[i][1] } : { x: i, y: 7 }));
      ctl.state = s;
      ctl.view.setup(s);
      ctl.plan = [{ pieceId: actor.id, to: { x: c.to[0], y: c.to[1] } }];
      ctl.refresh();
    }, [type, c]);
    await page.waitForTimeout(400);
    const done = page.evaluate(() => window.pawnisher.submit());
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(i === 0 ? 250 : 160);
      await page.screenshot({ path: `${out}/fx-${type}-${i}.png`, clip: { x: 220, y: 0, width: 330, height: 412 } });
    }
    await done;
  }
  await b.close();
})();
