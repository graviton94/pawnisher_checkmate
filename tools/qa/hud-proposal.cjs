// 속전 계기 · 반장 띠 시안 촬영 (2026-11-16 피드백) — 915×412 · DPR 2.625 · 터치
// 미리 `npm run build`와 미리보기 서버. 사용: OBSERVE_URL=http://localhost:4173/ node tools/qa/hud-proposal.cjs <출력 폴더> [이름=쿼리 ...]
// 예: node tools/qa/hud-proposal.cjs production/qa/evidence/2026-11-16-hudp now= a=hud=a x=boss=x
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.OBSERVE_URL || 'http://localhost:4173/';
(async () => {
  const [out, ...cases] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  for (const c of cases) {
    const [name, ...qs] = c.split('=');
    const query = qs.join('=');
    const pg = await br.newPage({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
    pg.on('pageerror', (e) => console.log('ERR', name, e.message));
    const shot = (n) => pg.screenshot({ path: `${out}/${name}-${n}.png` });
    await pg.goto(`${BASE}?debug${query ? `&${query.replace(/,/g, '&')}` : ''}`);
    await pg.waitForSelector('#boot', { state: 'detached' });
    await pg.waitForTimeout(300);
    const skip = async () => { const s = await pg.$('.stagefx'); if (s) { await s.click(); await pg.waitForTimeout(500); } };
    await skip();
    // 레이드 반장 판 (raid.cjs와 같은 자리): 2턴 · 속전 10칸 — 지금 화면 증거와 같은 상태
    await pg.evaluate(() => window.sliceApi.bossOf('plate', 1));
    await pg.waitForTimeout(2600); await skip();
    const stage = () => pg.evaluate(() => {
      const b = window.slice();
      const k = b.s.pieces.find((p) => p.side === 1 && p.type === 'K' && p.body === undefined);
      const at = { x: k.x, y: k.y - 1 };
      b.s.pieces = b.s.pieces.filter((p) => !(p.x === at.x && p.y === at.y) || p.side === 0);
      const r = b.s.pieces.find((p) => p.side === 0 && p.type === 'R') || b.s.pieces.find((p) => p.side === 0 && p.type !== 'K');
      Object.assign(r, at); r.shield = 40;
      b.coins = 10; b.turn = 2; b.intents = [];
      window.sliceApi.redraw();
    });
    await stage();
    await pg.waitForTimeout(1800);
    await shot('t2');
    // 줄어드는 순간: 10 → 9 (턴 끝 한 번) — 예비 · 굴림 · 출렁 · 도트 낱말을 시간대별로
    await pg.evaluate(() => { const b = window.slice(); b.coins = 9; b.turn = 3; window.sliceApi.redraw(); });
    for (const [i, ms] of [[0, 60], [1, 220], [2, 420], [3, 900]]) { await pg.waitForTimeout(ms - (i ? [60, 220, 420, 900][i - 1] : 0)); await shot(`drop${i}`); }
    // 막판 두 턴
    await pg.evaluate(() => { const b = window.slice(); b.coins = 2; b.turn = 10; window.sliceApi.redraw(); });
    await pg.waitForTimeout(1600);
    await shot('t10');
    await pg.close();
  }
  await br.close();
})();
