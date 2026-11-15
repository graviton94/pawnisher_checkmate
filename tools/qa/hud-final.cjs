// 속전 계기 · 오른쪽 머리 한 줄 확정본 촬영 (D-520) — 915×412 DPR 2.625 · 667×375 DPR 2, 터치
// 미리 `npm run build`와 미리보기 서버. 사용: OBSERVE_URL=http://localhost:4173/ node tools/qa/hud-final.cjs <출력 폴더> [접두어]
// 찍는 것: 일반 판(3턴 · 8관) · 반장 판(2턴 · 10관, 이번 턴 끝에 꺼질 관 깜빡) · 줄어드는 순간 프레임(10 → 9).
const { chromium } = require('playwright');
const fs = require('fs');
const textAudit = require('./text-audit.cjs');
const BASE = process.env.OBSERVE_URL || 'http://localhost:4173/';
const VIEWS = [['915', { width: 915, height: 412 }, 2.625], ['667', { width: 667, height: 375 }, 2]];
(async () => {
  const [out, prefix = 'hud-final'] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  for (const [tag, viewport, dpr] of VIEWS) {
    const pg = await br.newPage({ viewport, deviceScaleFactor: dpr, hasTouch: true, isMobile: true });
    pg.on('pageerror', (e) => console.log('ERR', tag, e.message));
    const shot = (n) => pg.screenshot({ path: `${out}/${prefix}-${n}-${tag}.png` });
    await pg.goto(`${BASE}?debug`);
    await pg.waitForSelector('#boot', { state: 'detached' });
    await pg.waitForTimeout(300);
    const skip = async () => { const s = await pg.$('.stagefx'); if (s) { await s.click(); await pg.waitForTimeout(500); } };
    await skip();
    // 일반 판: 3턴 — 8관 · 이기면 32
    await pg.evaluate(() => { const b = window.slice(); b.coins = 8; b.turn = 3; window.sliceApi.redraw(); });
    await pg.waitForTimeout(1500);
    await shot('normal');
    console.log(tag, 'normal TXT', JSON.stringify(await textAudit(pg)));
    // 반장 판 (레이드): 2턴 · 10관
    await pg.evaluate(() => window.sliceApi.bossOf('plate', 1));
    await pg.waitForTimeout(2600); await skip();
    await pg.evaluate(() => { const b = window.slice(); b.coins = 10; b.turn = 2; window.sliceApi.redraw(); });
    await pg.waitForTimeout(1500);
    await shot('boss');
    console.log(tag, 'boss TXT', JSON.stringify(await textAudit(pg)));
    // 줄어드는 순간 10 → 9: 예비 · 꺼짐 계단 · 출렁 · 「−4」
    await pg.evaluate(() => { const b = window.slice(); b.coins = 9; b.turn = 3; window.sliceApi.redraw(); });
    let t = 0;
    for (const [i, ms] of [[0, 80], [1, 420], [2, 900]]) { await pg.waitForTimeout(ms - t); t = ms; await shot(`drop${i}`); }
    // 머리 줄 누름 영역 · 넘침 측정
    const m = await pg.evaluate(() => {
      const r = (id) => { const e = document.getElementById(id); const x = e.getBoundingClientRect(); return { x: Math.round(x.left), w: Math.round(x.width), h: Math.round(x.height) }; };
      const help = document.getElementById('btn-help');
      const hb = getComputedStyle(help, '::before');
      const mid = document.querySelector('.rmid');
      return { help: r('btn-help'), helpHit: { w: hb.width, h: hb.height }, boss: r('boss'), midScrollX: mid.scrollWidth - mid.clientWidth, row: r('coins').w, tubes: document.querySelector('.sp-row').getBoundingClientRect().width };
    });
    console.log(tag, JSON.stringify(m));
    await pg.close();
  }
  await br.close();
})();
