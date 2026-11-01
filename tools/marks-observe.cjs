// 보드 표식 관찰: 풀 덱 대국에서 몇 턴 진행 → 예약 2개 + 다른 기물 선택 상태를 모바일 해상도로 찍는다. 사용: node tools/marks-observe.cjs <출력 폴더>
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4173/?debug'); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(800);
  await page.tap('[data-test]'); await page.tap('[data-sc="full"]'); await page.tap('[data-go]'); await page.waitForTimeout(800);
  for (let i = 0; i < 4; i++) { await page.evaluate(async () => { window.pawnisher.autoPlan(); await window.pawnisher.submit(); }); await page.waitForTimeout(200); }
  // 예약 2개 + 다른 기물 선택 상태
  await page.evaluate(() => {
    const c = window.pawnisher; c.autoPlan();
    while (c.plan.length > 2) c.undo();
    const used = new Set(c.plan.map((s) => s.pieceId));
    const p = c.state.pieces.find((q) => q.side === 0 && !used.has(q.id) && (q.type === 'B' || q.type === 'N' || q.type === 'Q'));
    c.tap({ x: p.x, y: p.y }, true);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/marks-plan.png` });
  await b.close();
})();
