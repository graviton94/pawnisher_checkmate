// 베타 점검 (D-477): 엔딩 갈래 전부 — 첫째 왕관 왕위 계승 · 넷째 왕관 「왕관을 던진다」 진엔딩 · 넷째 왕관 「왕관을 쓴다」 ·
// 도전 완료 · 패배. 컷 · 크레딧 · 결과 장부를 실제 탭으로 넘겨 「메인 화면으로」까지 가는지, 오류가 없는지.
// 사용: 프리뷰 서버를 띄운 뒤 node tools/qa/endings.cjs <출력 폴더>
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = (process.argv[2] ?? 'production/qa/endings') + '/';
fs.mkdirSync(OUT, { recursive: true });
const W = (ms) => new Promise((r) => setTimeout(r, ms));
const CASES = [
  ['throne-1', (a) => { a.richRun(); void a.endFlow(0); }, /왕관을 쓴다/],
  ['depart-4', (a) => { a.richRun(); void a.endFlow(3); }, /왕관을 던진다/],
  ['crown-4', (a) => { a.richRun(); void a.endFlow(3); }, /왕관을 쓴다/],
  ['challenge', (a) => { a.richRun(); void a.challengeEnd(6); }, null],
  ['defeat', (a) => { a.richRun(); void a.defeat(); }, null],
];
(async () => {
  const br = await chromium.launch();
  const lines = [];
  for (const [name, fn, choice] of CASES) {
    const p = await (await br.newContext({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })).newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(`PAGEERROR ${e.message} @ ${(e.stack || '').split('\n')[1] || ''}`));
    await p.goto('http://localhost:4173/?debug');
    await p.waitForFunction(() => window.sliceApi);
    await W(2000);
    await p.evaluate(`(${fn.toString()})(window.sliceApi)`);
    await W(2500);
    let end = false, steps = 0, last = '', same = 0;
    for (; steps < 250; steps++) {
      const st = await p.evaluate((src) => {
        const vis = (e) => e && e.getClientRects().length;
        const btns = [...document.querySelectorAll('button')].filter((b) => vis(b) && !b.disabled).map((b) => b.textContent.trim());
        return { btns, sub: (document.querySelector('.cut-sub, .credits, .promotion')?.textContent ?? '').slice(-50), home: btns.some((t) => /메인 화면으로/.test(t)) };
      });
      const key = st.btns.join('|') + st.sub;
      if (key === last) same += 1; else { same = 0; last = key; }
      if (same > 25) break;
      if (st.home) { end = true; await p.screenshot({ path: `${OUT}${name}-end.png` }); break; }
      const want = choice && st.btns.find((t) => choice.test(t));
      const pick = want ?? st.btns.find((t) => /결과를 본다|^\s*다음\s*$|나아간다|계속한다|확인/.test(t));
      if (pick) { await p.evaluate((t) => [...document.querySelectorAll('button')].find((b) => b.getClientRects().length && b.textContent.trim() === t).click(), pick); await W(1200); }
      else { await p.touchscreen.tap(457, 200); await W(600); }
    }
    if (!end) await p.screenshot({ path: `${OUT}${name}-STUCK.png` });
    const line = `${name}: ${end ? '메인 화면 단추까지 도달' : 'STUCK'} · ${steps}걸음${errs.length ? ` · 오류 ${errs.join(' / ')}` : ''}`;
    lines.push(line);
    console.log(line);
    await p.context().close();
  }
  fs.writeFileSync(OUT + 'report.txt', lines.join('\n'));
  await br.close();
})();
