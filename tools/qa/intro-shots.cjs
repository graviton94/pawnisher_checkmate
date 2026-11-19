// D-610 · D-611 실제 화면: 처음 출하 프롤로그 앞 9쪽 · 프롤로그 뒷장 · 출하 시작 인트로 A~D · 두 번째 패배 컷을 915×412 터치로 넘기며 쪽마다 찍는다.
// 사용: 프리뷰 서버를 띄운 뒤 node tools/qa/intro-shots.cjs <출력 폴더>   환경: PORT(4173) · DPR(2.625)
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = (process.argv[2] ?? 'production/qa/evidence/intro') + '/';
fs.mkdirSync(OUT, { recursive: true });
const W = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = process.env.PORT || 4173;
const DPR = +(process.env.DPR || 2.625);
(async () => {
  const br = await chromium.launch();
  const errs = [];
  const log = [];
  const page = async () => {
    const ctx = await br.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: DPR, hasTouch: true, isMobile: true });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(`PAGEERROR ${e.message}`));
    p.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(`CONSOLE ${m.text().slice(0, 200)}`); });
    return p;
  };
  /** 컷 · 막 카드가 끝날 때까지: 쪽이 다 서면 찍고 누른다 */
  const walk = async (p, tag, max = 60) => {
    let n = 0, idle = 0;
    for (let it = 0; it < 400 && n < max; it++) {
      const st = await p.evaluate(() => {
        const pl = document.querySelector('.prologue');
        const ac = document.querySelector('.actcard');
        return {
          pl: !!pl, beat: pl?.dataset.beat ?? '', logo: !!pl?.classList.contains('go-wait'), title: !!document.querySelector('.prologue .film-over .ttl, .prologue .title-card, .prologue .tc'),
          ac: !!ac, acDone: !!ac && !ac.querySelector('.cut-sub.typing'),
          text: (pl?.querySelector('.cut-lines')?.textContent ?? ac?.querySelector('.cut-lines')?.textContent ?? '').trim().slice(0, 50),
          skip: pl ? getComputedStyle(pl.querySelector('.cut-skip') ?? pl).visibility : '',
        };
      });
      if (!st.pl && !st.ac) { if (++idle > 12) break; await W(250); continue; }
      idle = 0;
      if (st.ac) {
        if (!st.acDone) { await W(300); continue; }
        await W(400);
        n += 1; await p.screenshot({ path: `${OUT}${tag}-${String(n).padStart(2, '0')}-actcard.png` }); log.push(`${tag} ${n} 막 카드 · ${st.text}`);
        await W(900); await p.touchscreen.tap(457, 300); await W(1500);
        continue;
      }
      if (st.beat === 'hold' || st.logo) {
        await W(250);
        n += 1; await p.screenshot({ path: `${OUT}${tag}-${String(n).padStart(2, '0')}.png` }); log.push(`${tag} ${n} ${st.logo ? '로고' : ''} 건너뛴다:${st.skip} · ${st.text}`);
        if (st.logo) break;
        await p.touchscreen.tap(457, 300); await W(500);
        continue;
      }
      // 제목 카드 · 맺음 카드는 탭을 기다린다
      await W(700);
      const still = await p.evaluate(() => document.querySelector('.prologue')?.dataset.beat ?? '');
      if (still === 'move') { const has = await p.evaluate(() => !!document.querySelector('.prologue .film-over *')); if (has) { n += 1; await p.screenshot({ path: `${OUT}${tag}-${String(n).padStart(2, '0')}-card.png` }); await p.touchscreen.tap(457, 300); await W(800); } }
    }
    return n;
  };
  // 1) 처음 출하 프롤로그 앞 (빈 저장 · 첫 화면부터)
  {
    const p = await page();
    await p.goto(`http://localhost:${PORT}/?debug&opening`);
    await p.evaluate(() => localStorage.clear());
    await p.goto(`http://localhost:${PORT}/?debug&opening`);
    await p.waitForFunction(() => window.sliceApi);
    await W(2500);
    await p.touchscreen.tap(457, 300);
    await W(1500);
    const t0 = Date.now();
    const n = await walk(p, 'pro-open', 40);
    log.push(`pro-open: ${n}장 · ${(Date.now() - t0) / 1000}s`);
    await p.context().close();
  }
  // 2) 프롤로그 뒷장 · 인트로 A~D · 두 번째 패배
  const scenes = [
    ['pro-late', 'proLate()'],
    ['intro-A', 'introAt(0, 1)'],
    ['intro-B', 'introAt(0, 2)'],
    ['intro-C2', "introAt(1, 0, '킹 없는 세트는 출하하지 않는다')"],
    ['intro-C4', "introAt(3, 0, '정비 라인을 끈다')"],
    ['intro-D', "introAt(1, 1, '킹 없는 세트는 출하하지 않는다')"],
    ['defeat-2nd', 'defeatN(2)'],
  ];
  for (const [tag, call] of scenes) {
    const p = await page();
    await p.goto(`http://localhost:${PORT}/?debug`);
    await p.waitForFunction(() => window.sliceApi);
    await W(2000);
    await p.evaluate(`void window.sliceApi.${call}`);
    await W(800);
    const n = await walk(p, tag, 40);
    log.push(`${tag}: ${n}장`);
    await p.context().close();
  }
  fs.writeFileSync(`${OUT}report.txt`, [...log, '', ...errs].join('\n'));
  console.log(log.join('\n'));
  console.log(errs.length ? errs.join('\n') : '오류 0');
  await br.close();
})();
