// 한 판 전체 자동 플레이 (D-381 · D-385 화면 리뷰 전용): 메뉴 → 출하 시작 → 1막 ~ 종막 → 결과까지, 화면마다 사진 + 오류 기록.
// 대국은 판을 비워 이긴 것으로 끝낸다(흐름 점검이 목적). 그 밖의 화면은 실제 버튼을 누른다.
const { chromium } = require('playwright');
const fs = require('fs');
// 화면 리뷰용 한 판 (D-385): 프리뷰 서버(npx vite preview --port 4173)를 띄운 뒤 `npm run review -- <출력 폴더>`. 밸런스 수치는 재지 않는다 — 그건 `npm run climb`.
const OUT = (process.argv[2] ?? 'production/qa/run') + '/';
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.unlinkSync(OUT + f);
const W = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
const note = (s) => { log.push(s); console.log(s); };
(async () => {
  const br = await chromium.launch();
  const p = await br.newPage({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 1.5 });
  p.on('pageerror', (e) => note(`PAGEERROR ${e.message} @ ${(e.stack || '').split('\n')[1] || ''}`));
  p.on('console', (m) => { if (m.type() === 'error') note(`CONSOLE ${m.text().slice(0, 200)}`); });
  await p.goto('http://localhost:4173/?debug'); await W(400);
  await p.evaluate(() => localStorage.setItem('pawnisher.slice.meta', JSON.stringify({ tut: ['battle', 'battle-a', 'map', 'recruit', 'kit', 'promote', 'first_shop'], runs: 3, prologue: true, ascOpen: 5, daily: {}, onboarded: true })));
  await p.goto('http://localhost:4173/?debug'); await p.waitForFunction(() => window.sliceApi); await W(4000);
  await p.evaluate(() => { void window.sliceApi.begin(1); return 0; }); await W(2500);
  let shot = 0, lastSig = '', same = 0;
  const snap = async (tag) => { shot += 1; await p.screenshot({ path: `${OUT}${String(shot).padStart(3, '0')}-${tag}.png` }); };
  const clickSel = async (sel) => { const ok = await p.evaluate((s) => { const e = [...document.querySelectorAll(s)].find((x) => x.offsetParent !== null && !x.disabled); if (!e) return false; e.click(); return true; }, sel); return ok; };
  for (let it = 0; it < 500; it++) {
    const st = await p.evaluate(() => {
      const vis = (s) => [...document.querySelectorAll(s)].some((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed');
      const ov = document.getElementById('overlay');
      const panel = document.getElementById('overlay-panel');
      const h2 = panel?.querySelector('h2')?.textContent?.trim().slice(0, 30) ?? '';
      return {
        stage: vis('.stagefx'), cut: vis('.prologue, .finale, .credits, .cutfx, .cuts'), kit: vis('.kit-confirm'), map: vis('.mapfx'),
        overlay: ov && !ov.hidden, h2, act: document.querySelector('.mapfx h1, .mapfx .map-title')?.textContent?.trim() ?? '',
        battle: !!document.querySelector('#hand [data-card]') && (!ov || ov.hidden) && !document.body.classList.contains('between') && !vis('.mapfx') && window.slice().s.winner === null,
        ev: [...document.querySelectorAll('.ws-choices .choice')].some((x) => x.offsetParent && !x.disabled) && !document.querySelector('.ws-sum:not([hidden])'), evOk: vis('.ev-ov-ok:not([hidden])'), end: /출하 (완료|중단)/.test(panel?.textContent ?? '') || [...document.querySelectorAll('button')].some((x) => x.getClientRects().length > 0 && /메인 화면으로/.test(x.textContent)),
      };
    });
    const sig = JSON.stringify([st.stage, st.cut, st.kit, st.map, st.overlay, st.h2, st.battle, st.ev, st.evOk]);
    if (sig !== lastSig) { same = 0; lastSig = sig; await snap(st.map ? 'map' : st.battle ? 'battle' : st.kit ? 'confirm' : st.overlay ? 'ov' : st.stage ? 'stage' : st.cut ? 'cut' : 'x'); note(`#${it} ${sig}`); } else same += 1;
    if (same > 25) { note(`STUCK at ${sig}`); await snap('STUCK'); break; }
    if (st.end) { note('RUN END reached'); await snap('END'); break; }
    // 부관 안내 (처음 보는 반장 등): 건너뛴다 — 안내 창이 화면을 덮으면 다른 단추가 눌리지 않는다
    if (await p.evaluate(() => !!document.querySelector('.tut'))) { await clickSel('.tut-skip'); await W(900); continue; }
    if (st.kit) { (await clickSel('.kit-confirm [data-yes]')) || (await clickSel('.kit-confirm .row .btn:last-child')); await W(900); continue; }
    if (st.evOk) { await clickSel('.ev-ov-ok'); await W(1200); continue; }
    if (await clickSel('.ev-exit .btn, .ev-out .btn')) { await W(1500); continue; }
    if (st.ev) { await clickSel('.ws-choices .choice'); await W(800); await clickSel('.ws-choices .choice'); await W(3500); continue; }
    if (st.overlay) {
      // 화면별 첫 선택 → 없으면 넘기기 · 닫기 · 마지막 단추
      if (await clickSel('[data-pick]')) { await W(1500); continue; }
      if (await clickSel('[data-kit]')) { await W(900); continue; }
      if (await clickSel('[data-part]')) { await W(1200); continue; }
      if (await clickSel('[data-ref]')) { await W(1200); continue; }
      if (await clickSel('[data-rec]')) { await W(1200); continue; }
      if (await clickSel('[data-forge]')) { await W(900); await clickSel('[data-forge]'); await W(1200); continue; }
      if (await clickSel('[data-leave]')) { await W(1200); continue; }
      if (await clickSel('[data-skip]')) { await W(1200); continue; }
      if (await clickSel('#overlay-panel .row .btn.brass, #overlay-panel .row .btn.cyan, #overlay-panel .row .btn')) { await W(1200); continue; }
      if (await clickSel('#overlay-panel button')) { await W(1200); continue; }
    }
    if (st.map) { if (await clickSel('.mapfx .mnd.now, .mapfx [data-node].now')) { await W(2500); continue; } }
    if (st.battle) {
      await p.evaluate(() => { const b = window.slice(); b.s.pieces = b.s.pieces.filter((x) => x.side === 0); b.s.winner = 0; window.sliceApi.finish(); return 0; });
      await W(4000); continue;
    }
    // 그 밖의 화면 (막 결산 등): 진행 단추를 누른다
    if (await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.getClientRects().length > 0 && !x.disabled && /나아간다|계속한다|다음으로|확인|왕관을 쓴다|^\s*다음\s*$|결과를 본다/.test(x.textContent)); if (b) { b.click(); return true; } return false; })) { await W(1500); continue; }
    await p.mouse.click(457, 300); await W(900);
    if (st.stage || st.cut) { if (!(await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.offsetParent !== null && /건너뛰기|건너뛴다/.test(x.textContent)); if (b) { b.click(); return true; } return false; }))) await p.mouse.click(457, 300); await W(900); continue; }
  }
  fs.writeFileSync(OUT + 'log.txt', log.join('\n'));
  await br.close();
})();
