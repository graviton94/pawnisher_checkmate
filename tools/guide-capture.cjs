// 안내서 왼쪽 예시 그림 찍기 (D-205): 실제 게임 화면을 정사각으로 잘라 public/guide/*.png 로.
// 미리 `npm run build` · `npx vite preview --port 4173`. 사용: node tools/guide-capture.cjs
const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  await pg.goto('http://localhost:4173/?debug'); await pg.waitForTimeout(900);
  const boardSq = async () => pg.evaluate(() => { const r = document.querySelector('#board canvas').getBoundingClientRect(); const s = Math.min(r.width, r.height); return { x: r.left + (r.width - s) / 2, y: r.top + (r.height - s) / 2, width: s, height: s }; });
  const shot = async (name, clip) => pg.screenshot({ path: `public/guide/${name}.png`, clip });
  // 1 적 예고: 1막 대국 시작 (붉은 칸 · 번호)
  await pg.evaluate(() => window.sliceApi.startAt(1, 'battle')); await pg.waitForTimeout(1200);
  await shot('intent', await boardSq());
  // 2 조작: 카드를 고르고 기물을 누른 모습 (갈 칸 점 · 칠 칸 과녁 · 예상 피해)
  await pg.evaluate(() => { const b = window.slice(); const api = window.sliceApi; for (let i = 0; i < b.hand.length; i++) { const ps = api.cardPieces(b, i).filter((p) => p.type !== 'K'); if (ps.length) { document.querySelector(`[data-card="${i}"]`).click(); api.tap({ x: ps[0].x, y: ps[0].y }); return; } } });
  await pg.waitForTimeout(500);
  await shot('play', await boardSq());
  // 3 태엽 + 손패 (왼쪽 레일 위)
  await pg.evaluate(() => { window.sliceApi.startAt(1, 'battle'); }); await pg.waitForTimeout(1000);
  await shot('keys', { x: 0, y: 0, width: 260, height: 260 });
  // 4 연쇄 계기판: 처치 2 (합 +8)
  await pg.evaluate(() => { const b = window.slice(); b.kills = 2; window.sliceApi.redraw(); });
  await pg.waitForTimeout(300);
  await shot('chain', await pg.evaluate(() => { const r = document.getElementById('right').getBoundingClientRect(); return { x: r.left, y: 0, width: r.width, height: r.width }; }));
  // 5 반장 · 불꽃 줄 예고
  await pg.evaluate(() => window.sliceApi.startAt(1, 'boss')); await pg.waitForTimeout(1200);
  await shot('boss', await boardSq());
  // 6 분대 창
  await pg.evaluate(() => document.querySelector('[data-crew]')?.click()); await pg.waitForTimeout(700);
  await shot('squad', await pg.evaluate(() => { const r = document.getElementById('overlay-panel').getBoundingClientRect(); const s = Math.min(r.width, r.height); return { x: r.left, y: r.top, width: s, height: s }; }));
  await br.close();
})();
