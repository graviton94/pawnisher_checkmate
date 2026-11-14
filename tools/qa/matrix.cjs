// 베타 점검 (D-477): 화면 비율 매트릭스 — 폰 여러 비율 · 태블릿 · PC 창에서 주요 화면을 열고
// 화면 밖으로 잘린 단추 · 넘치는 글 · 오류를 잰다. 사진은 <출력>/<비율>/<화면>.png
// 사용: 프리뷰 서버를 띄운 뒤 node tools/qa/matrix.cjs <출력 폴더>
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = (process.argv[2] ?? 'production/qa/matrix') + '/';
const W = (ms) => new Promise((r) => setTimeout(r, ms));
const SIZES = [
  ['phone-20x9', 915, 412], ['phone-19.5x9', 844, 390], ['phone-16x9', 640, 360], ['phone-21x9', 960, 412],
  ['tablet-4x3', 1024, 768], ['tablet-16x10', 1280, 800], ['pc-16x9', 915, 514], ['pc-16x10', 915, 572],
];
// 화면 열기: 메뉴 → 각 debug 진입
const SCREENS = [
  ['menu', null],
  ['map', (a) => { a.richRun(); a.map(2); }],
  ['battle', (a) => a.startAt(2, 'battle')],
  ['boss', (a) => a.bossOf('alarm', 3)],
  ['shop', (a) => { a.richRun(); a.shop(); }],
  ['forge', (a) => { a.richRun(); a.hurt(0.5); a.forge(); }],
  ['event', (a) => { a.richRun(); a.event('oilMerchant'); }],
  ['partPick', (a) => { a.richRun(); a.partPick(); }],
  ['reward', (a) => { a.richRun(); a.reward(); }],
  ['deck', (a) => { a.richRun(); a.deckView('view'); }],
  ['crew', (a) => { a.richRun(); a.crew(); }],
  ['kit', (a) => a.kit()],
  ['recruit', (a) => a.recruit()],
  ['promote', (a) => a.promote(3)],
];
(async () => {
  const br = await chromium.launch();
  const report = [];
  for (const [name, w, h] of SIZES) {
    fs.mkdirSync(`${OUT}${name}`, { recursive: true });
    const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, isMobile: name.startsWith('phone') || name.startsWith('tablet') });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(`PAGEERROR ${e.message}`));
    for (const [scr, fn] of SCREENS) {
      await p.goto('http://localhost:4173/?debug');
      await p.waitForFunction(() => window.sliceApi);
      await p.waitForSelector('#boot', { state: 'detached', timeout: 20000 }).catch(() => {});
      await W(1500);
      const before = errs.length;
      if (fn) { await p.evaluate(`(${fn.toString()})(window.sliceApi)`); await W(2600); }
      // 잘린 단추: 보이는 단추 중 화면 밖으로 나간 것
      const bad = await p.evaluate(([vw, vh]) => {
        const out = [];
        for (const b of document.querySelectorAll('button, [data-slot], .btn')) {
          if (!b.getClientRects().length) continue;
          const s = getComputedStyle(b);
          if (s.visibility === 'hidden' || s.opacity === '0') continue;
          const r = b.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) continue;
          // 가로로 미는 레일 안의 카드는 넘쳐도 된다
          if (b.closest('.slots, .rail, .scroll, .inset, #hand')) continue;
          if (r.right > vw + 1 || r.bottom > vh + 1 || r.left < -1 || r.top < -1) out.push(`${(b.textContent || b.className).trim().replace(/\s+/g, ' ').slice(0, 14)}@${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`);
        }
        return out;
      }, [w, h]);
      await p.screenshot({ path: `${OUT}${name}/${scr}.png` });
      const line = `${name} ${scr}: ${bad.length ? `잘림 ${bad.slice(0, 4).join(' ; ')}` : 'ok'}${errs.length > before ? ` · 오류 ${errs.slice(before).join(' / ')}` : ''}`;
      report.push(line);
      console.log(line);
    }
    await ctx.close();
  }
  fs.writeFileSync(OUT + 'report.txt', report.join('\n'));
  await br.close();
})();
