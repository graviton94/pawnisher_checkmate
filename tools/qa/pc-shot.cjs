// P-C 점검 (D-502): 디버그 API로 장면 하나를 세우고 사진 한 장 — node tools/qa/pc-shot.cjs <출력.png> "<sliceApi 식>" [기다림ms]
//   환경: PORT · VW · VH · DPR · RM=1
const { chromium } = require('playwright');
const W = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const [out, expr, wait] = process.argv.slice(2);
  const VW = +(process.env.VW || 915), VH = +(process.env.VH || 412), DPR = +(process.env.DPR || 1);
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DPR, hasTouch: true, isMobile: true, reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(`PAGEERROR ${e.message}`));
  await p.goto(`http://localhost:${process.env.PORT || 4173}/?debug`);
  await p.waitForFunction(() => window.sliceApi);
  await W(2500);
  const r = await p.evaluate((e) => { try { return JSON.stringify(eval(e)); } catch (x) { return 'ERR ' + x.message; } }, expr);
  await W(+(wait || 2500));
  await p.screenshot({ path: out });
  console.log(r?.slice(0, 2000));
  console.log(errs.join('\n'));
  await br.close();
})();
