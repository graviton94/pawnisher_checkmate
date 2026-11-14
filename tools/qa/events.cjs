// 베타 점검 (D-477): 사건 전부 × 선택지 전부를 실제 탭으로 고르고, 오류 · 멈춤 · 결과 화면을 남긴다.
// 사용: 프리뷰 서버를 띄운 뒤 node tools/qa/events.cjs <출력 폴더>
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = (process.argv[2] ?? 'production/qa/events') + '/';
fs.mkdirSync(OUT, { recursive: true });
const W = (ms) => new Promise((r) => setTimeout(r, ms));
const DONE_BTN = /나아간다|계속한다|고른다|건너뛴다|떠난다|닫는다|확인/;
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(`PAGEERROR ${e.message} @ ${(e.stack || '').split('\n')[1] || ''}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(`CONSOLE ${m.text().slice(0, 200)}`); });
  await p.goto('http://localhost:4173/?debug');
  await p.waitForFunction(() => window.sliceApi);
  await W(1500);
  const ids = (await p.evaluate(() => window.sliceApi.eventIds)).filter((x) => !process.env.ONLY || x === process.env.ONLY);
  const report = [];
  for (const id of ids) {
    for (let k = 0; k < 4; k++) {
      await p.goto('http://localhost:4173/?debug');
      await p.waitForFunction(() => window.sliceApi);
      await W(1200);
      await p.evaluate(() => { window.sliceApi.richRun(); window.sliceApi.gold(200); window.sliceApi.crack(1); window.sliceApi.hurt(0.7); });
      await p.evaluate((i) => window.sliceApi.event(i), id);
      await W(2200);
      const n = await p.evaluate(() => document.querySelectorAll('.ws-choices .choice').length);
      if (k >= n) break;
      const before = errs.length;
      const off = await p.evaluate((kk) => document.querySelectorAll('.ws-choices .choice')[kk].disabled, k);
      const label = await p.evaluate((kk) => document.querySelectorAll('.ws-choices .choice')[kk].textContent.trim().replace(/\s+/g, ' ').slice(0, 40), k);
      if (!off) {
        const all = await p.$$('.ws-choices .choice');
        const bb = await all[k].boundingBox();
        await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
        await W(600);
        await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
        await W(2600);
      }
      let steps = 0;
      let done = false;
      for (; steps < 25; steps++) {
        const st = await p.evaluate(() => ({
          ok: !!document.querySelector('.ev-ov-ok:not([hidden])'),
          exit: [...document.querySelectorAll('.ev-exit .btn, .ev-out .btn')].some((x) => x.offsetParent),
          pick: [...document.querySelectorAll('[data-pick]')].some((x) => x.offsetParent && !x.disabled),
          slot: [...document.querySelectorAll('[data-slot]')].filter((x) => x.offsetParent && !x.closest('.ws-choices')).length,
          map: !!document.querySelector('.mapfx'),
          battle: !!document.querySelector('#hand [data-card]') && !document.body.classList.contains('between'),
        }));
        if (st.map || st.battle) { done = true; break; }
        if (st.ok) { await p.click('.ev-ov-ok'); await W(900); continue; }
        if (st.exit) { await p.evaluate(() => [...document.querySelectorAll('.ev-exit .btn, .ev-out .btn')].find((x) => x.offsetParent).click()); await W(1400); continue; }
        if (st.slot) { await p.evaluate(() => [...document.querySelectorAll('[data-slot]')].find((x) => x.offsetParent && !x.closest('.ws-choices')).click()); await W(300); }
        if (st.pick) { await p.evaluate(() => [...document.querySelectorAll('[data-pick]')].find((x) => x.offsetParent && !x.disabled).click()); await W(1300); continue; }
        const clicked = await p.evaluate((src) => { const re = new RegExp(src); const x = [...document.querySelectorAll('button')].find((y) => y.getClientRects().length && !y.disabled && re.test(y.textContent)); if (x) { x.click(); return true; } return false; }, DONE_BTN.source);
        if (!clicked) await p.mouse.click(457, 120);
        await W(900);
      }
      await p.screenshot({ path: `${OUT}${id}-${k}.png` });
      const line = `${id} #${k} 「${label}」${off ? ' (잠김)' : ''} → ${done ? 'ok' : 'NOT DONE'}${errs.length > before ? ` · 오류 ${errs.slice(before).join(' / ')}` : ''}`;
      report.push(line);
      console.log(line);
    }
  }
  fs.writeFileSync(OUT + 'report.txt', report.join('\n') + '\n\n' + errs.join('\n'));
  await br.close();
})();
