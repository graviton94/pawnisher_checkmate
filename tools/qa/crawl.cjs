// 베타 점검 순회 (D-477): 한 판을 봇이 실제로 두며(카드 · 효과 · 패배 경로까지) 모든 화면을 지나 오류 · 멈춤을 모은다.
// 사용: 프리뷰 서버를 띄운 뒤 `node tools/qa/crawl.cjs <출력 폴더> <모드 story|challenge|daily> <단계> <시드> [rand]`
// rand가 있으면 사건 · 보상 · 지도 선택을 시드로 무작위로 고른다(늘 첫 칸만 고르면 못 보는 화면을 본다).
const { chromium } = require('playwright');
const fs = require('fs');
const [OUTARG, MODE = 'story', LEVEL = '0', SEED = '1', RAND] = process.argv.slice(2);
const OUT = (OUTARG ?? 'production/qa/crawl') + '/';
fs.mkdirSync(OUT, { recursive: true });
const W = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
let LOGF = '';
const note = (s) => { log.push(s); if (LOGF) fs.appendFileSync(LOGF, s + '\n'); };
const race = (pr, ms, tag) => Promise.race([pr, new Promise((r) => setTimeout(() => r(`HANG ${tag}`), ms))]);
let rs = Number(SEED) * 9301 + 49297;
const rnd = (n) => { rs = (rs * 9301 + 49297) % 233280; return Math.floor((rs / 233280) * n); };
(async () => {
  const br = await chromium.launch();
  // 줄인 움직임(prefers-reduced-motion): 규칙 · 화면 흐름은 같고 연출만 짧다 — 한 판을 빨리 돈다
  const p = await (await br.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 1, reducedMotion: process.env.FULLMOTION ? 'no-preference' : 'reduce' })).newPage();
  let errors = 0;
  p.on('pageerror', (e) => { errors += 1; note(`PAGEERROR ${e.message} @ ${(e.stack || '').split('\n').slice(1, 3).join(' | ')}`); });
  p.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) { errors += 1; note(`CONSOLE ${m.text().slice(0, 300)}`); } });
  await p.goto('http://localhost:4173/?debug'); await W(300);
  await p.evaluate(() => localStorage.setItem('pawnisher.slice.meta', JSON.stringify({ tut: ['battle', 'battle-a', 'map', 'recruit', 'kit', 'promote', 'first_shop'], runs: 3, prologue: true, ascOpen: 14, challengeOpen: 14, storyCleared: 4, daily: {}, onboarded: true })));
  await p.goto('http://localhost:4173/?debug'); await p.waitForFunction(() => window.sliceApi); await W(3000);
  await p.evaluate(([s, l, m]) => { void window.sliceApi.begin(s, l, m, m === 'daily' ? '2026-11-14' : null); return 0; }, [Number(SEED), Number(LEVEL), MODE]); await W(2500);
  let lastSig = '', same = 0, battles = 0, it = 0, result = 'unknown';
  const clickSel = async (sel, pick = 0) => p.evaluate(([s, k]) => { const es = [...document.querySelectorAll(s)].filter((x) => x.getClientRects().length > 0 && getComputedStyle(x).visibility !== 'hidden' && !x.disabled && !x.classList.contains('off')); if (!es.length) return false; es[Math.min(k, es.length - 1)].click(); return true; }, [sel, pick]);
  const count = async (sel) => p.evaluate((s) => [...document.querySelectorAll(s)].filter((x) => x.getClientRects().length > 0 && getComputedStyle(x).visibility !== 'hidden' && !x.disabled && !x.classList.contains('off')).length, sel);
  const pickIdx = async (sel) => (RAND ? rnd(Math.max(1, await count(sel))) : 0);
  const t0 = Date.now();
  LOGF = `${OUT}live-${MODE}${LEVEL}-${SEED}${RAND ? 'r' : ''}.txt`;
  fs.writeFileSync(LOGF, '');
  for (it = 0; it < 1500 && Date.now() - t0 < 25 * 60 * 1000; it++) {
    const st = await p.evaluate(() => {
      const vis = (s) => [...document.querySelectorAll(s)].some((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed');
      const ov = document.getElementById('overlay');
      const b = window.slice();
      return {
        cut: vis('.prologue, .finale, .credits, .cutfx, .cuts, .actcard'), kit: vis('.kit-confirm'), map: vis('.mapfx'), overlay: ov && !ov.hidden,
        battle: !!document.getElementById('btn-end')?.getClientRects().length && !document.querySelector('.prologue, .actcard, .credits, .promotion') && (!ov || ov.hidden) && !document.body.classList.contains('between') && !vis('.mapfx') && b && b.s.winner === null,
        ev: [...document.querySelectorAll('.ws-choices .choice')].some((x) => x.offsetParent && !x.disabled) && !document.querySelector('.ws-sum:not([hidden])'), evOk: vis('.ev-ov-ok:not([hidden])'), tut: !!document.querySelector('.tut'),
        end: [...document.querySelectorAll('button')].some((x) => x.getClientRects().length > 0 && /메인 화면으로/.test(x.textContent)),
        turn: b?.turn ?? 0, hand: b?.hand?.length ?? 0, title: (document.querySelector('#overlay-panel h2, .scr-title, .plate-title')?.textContent ?? '').trim().slice(0, 20),
      };
    });
    const sig = JSON.stringify([st.cut, st.kit, st.map, st.overlay, st.battle, st.ev, st.evOk, st.turn, st.hand, st.title]);
    if (sig !== lastSig) { same = 0; lastSig = sig; } else same += 1;
    if (same > 40) { note(`STUCK ${sig}`); await p.screenshot({ path: `${OUT}STUCK-${MODE}${LEVEL}-${SEED}.png` }); result = 'stuck'; break; }
    if (st.end) { result = (await p.evaluate(() => document.body.textContent.includes('하자 폐기'))) ? 'lost' : 'cleared'; break; }
    // 컷(프롤로그 · 그림자 · 막 카드 · 격파 컷)이 떠 있으면 먼저 넘긴다 — 아래 판을 건드리지 않는다
    if (await clickSel('.cut-skip')) { await W(900); continue; }
    if (st.tut) { await clickSel('.tut-skip'); await W(500); continue; }
    // 사건 확률 장치(판정기 · 긁기 · 동전): 「▼ 눌러서 …」 띠를 누른다
    if (await clickSel('.ev-tap')) { await W(700); continue; }
    if (st.kit) { (await clickSel('.kit-confirm [data-yes]')) || (await clickSel('.kit-confirm .row .btn:last-child')); await W(700); continue; }
    if (st.evOk) { await clickSel('.ev-ov-ok'); await W(900); continue; }
    if (await clickSel('.ev-exit .btn, .ev-out .btn')) { await W(1200); continue; }
    if (st.ev) { const k = await pickIdx('.ws-choices .choice'); await clickSel('.ws-choices .choice', k); await W(600); await clickSel('.ws-choices .choice', k); await W(2800); continue; }
    const prompt = await p.evaluate(() => [...document.querySelectorAll('button')].filter((x) => x.getClientRects().length && !x.disabled && /받아들인다|거절한다|^\s*건다|걸지 않는다|운명을 거스른다|눈을 감는다|받아들이지 않는다|버틴다|희생한다/.test(x.textContent)).map((x) => x.textContent.trim()));
    if (prompt.length) { const k = RAND ? rnd(prompt.length) : 0; note(`PROMPT ${prompt.join('|')} → ${prompt[k]}`); await p.evaluate((t) => { const b = [...document.querySelectorAll('button')].find((x) => x.getClientRects().length && x.textContent.trim() === t); if (b) b.click(); }, prompt[k]); await W(1500); continue; }
    if (st.battle) {
      // 봇이 실제로 둔다 — 대국 길이 상한 30턴(넘으면 멈춤으로 본다)
      if (st.turn > 30) { note(`LONGBATTLE turn ${st.turn}`); result = 'longbattle'; break; }
      const r = await race(p.evaluate(async () => { try { return await window.sliceApi.botMove('greedy'); } catch (e) { return 'ERR ' + e.message; } }), 20000, `botMove turn ${st.turn}`);
      if (typeof r === 'string' && r.startsWith('HANG')) { note(r); await p.screenshot({ path: `${OUT}HANG-${MODE}${LEVEL}-${SEED}-${it}.png` }); }
      if (it % 20 === 0) note(`#${it} ${sig}`);
      if (typeof r === 'string' && r.startsWith('ERR')) note(`BOTERR ${r}`);
      await W(r === 'end' ? 2600 : 900);
      if (r === 'end') battles += 0;
      continue;
    }
    if (st.overlay) {
      // 사이 화면: 선택 하나를 고르고(무작위면 아무 칸) 진행 단추
      if (await count('[data-slot]')) { const k = await pickIdx('[data-slot]'); await clickSel('[data-slot]', k); await W(400); }
      if (await clickSel('[data-pick]')) { await W(1300); continue; }
      for (const s of ['[data-kit]', '[data-part]', '[data-ref]', '[data-rec]']) if (await clickSel(s)) { await W(1100); break; }
      if (await clickSel('[data-leave]')) { await W(1100); continue; }
      if (await clickSel('[data-skip]')) { await W(1100); continue; }
      if (await clickSel('#overlay-panel .row .btn.brass, #overlay-panel .row .btn.cyan, #overlay-panel .row .btn')) { await W(1100); continue; }
      if (await clickSel('#overlay-panel button')) { await W(1100); continue; }
    }
    if (st.map) { const k = await pickIdx('.mapfx .mnd.now, .mapfx [data-node].now'); if (await clickSel('.mapfx .mnd.now, .mapfx [data-node].now', k)) { await W(2200); continue; } }
    if (await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.getClientRects().length > 0 && !x.disabled && /나아간다|계속한다|다음으로|확인|왕관을 쓴다|왕관을 던진다|^\s*다음\s*$|결과를 본다|고른다|넘긴다|떠난다/.test(x.textContent)); if (b) { b.click(); return true; } return false; })) { await W(1200); continue; }
    if (st.cut) { if (!(await clickSel('button.skip, [data-skip-cut]'))) await p.mouse.click(457, 300); await W(700); continue; }
    await p.mouse.click(457, 300); await W(700);
  }
  const meta = await p.evaluate(() => { const b = window.slice(); return { act: document.querySelector('.mapfx h1')?.textContent ?? '' , turn: b?.turn }; }).catch(() => ({}));
  const line = `${MODE} ${LEVEL} seed ${SEED}${RAND ? ' rand' : ''}: ${result} · steps ${it} · errors ${errors} · ${Math.round((Date.now() - t0) / 1000)}s`;
  note(line);
  if (result !== 'cleared' && result !== 'lost') await p.screenshot({ path: `${OUT}END-${MODE}${LEVEL}-${SEED}.png` });
  fs.writeFileSync(`${OUT}log-${MODE}${LEVEL}-${SEED}${RAND ? 'r' : ''}.txt`, log.join('\n'));
  console.log(line);
  await br.close();
})();
