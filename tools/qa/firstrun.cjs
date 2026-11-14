// 베타 점검 (D-477): 처음 설치한 사람의 흐름 — 저장이 빈 상태에서 첫 화면 → 프롤로그 → 메뉴 → 첫 대국 안내(부관 박차)를
// 실제 탭으로 따라가 첫 대국을 이기고 지도에 설 때까지. 안내 걸음마다 사진 · 오류 · 멈춤을 남긴다.
// 사용: 프리뷰 서버를 띄운 뒤 node tools/qa/firstrun.cjs <출력 폴더>
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = (process.argv[2] ?? 'production/qa/firstrun') + '/';
fs.mkdirSync(OUT, { recursive: true });
const W = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch();
  const p = await (await br.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true })).newPage();
  const errs = [];
  const log = [];
  p.on('pageerror', (e) => errs.push(`PAGEERROR ${e.message} @ ${(e.stack || '').split('\n')[1] || ''}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(`CONSOLE ${m.text().slice(0, 200)}`); });
  await p.goto('http://localhost:4173/?debug&opening');
  await p.evaluate(() => localStorage.clear());
  await p.goto('http://localhost:4173/?debug&opening');
  await p.waitForFunction(() => window.sliceApi);
  await W(2500);
  let shot = 0, lastText = '', same = 0;
  const snap = async (tag) => { shot += 1; await p.screenshot({ path: `${OUT}${String(shot).padStart(3, '0')}-${tag}.png` }); };
  const tap = async (x, y) => { await p.touchscreen.tap(x, y); };
  for (let it = 0; it < 400; it++) {
    const st = await p.evaluate(() => {
      const vis = (e) => !!e && e.getClientRects().length > 0;
      const tut = document.querySelector('.tut');
      const fr = tut?.querySelector('.tut-frame');
      const r = fr && !fr.hidden ? fr.getBoundingClientRect() : null;
      return {
        tut: !!tut, act: !!tut?.classList.contains('act'), text: tut?.querySelector('.line')?.textContent ?? '',
        hole: r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null,
        go: vis(document.querySelector('[data-go]')), map: !!document.querySelector('.mapfx'),
        cut: !!document.querySelector('.prologue, .actcard'), press: vis(document.querySelector('.op-press')),
        battle: !!document.querySelector('#hand [data-card]') && !document.body.classList.contains('between'),
        turn: window.slice()?.turn ?? 0, winner: window.slice()?.s?.winner ?? null, sub: (document.querySelector('.cut-sub, .prologue')?.textContent ?? '').slice(-40),
      };
    });
    const key = `${st.tut}|${st.act}|${st.text.slice(0, 20)}|${st.map}|${st.cut}|${st.turn}|${st.sub}`;
    if (key === lastText) same += 1; else { same = 0; lastText = key; if (st.tut && st.text) { await snap(st.act ? 'tut-act' : 'tut'); log.push(`TUT ${st.act ? '[행동]' : '[읽기]'} ${st.text.replace(/\s+/g, ' ').slice(0, 60)}`); } }
    if (same > 30) { log.push(`STUCK ${key}`); await snap('STUCK'); break; }
    if (st.map && !st.tut) { log.push('첫 대국 뒤 지도에 섰다'); await snap('map'); break; }
    if (st.tut) {
      // 안내 걸음 중 확인 창(되감기 등)이 뜨면 사람처럼 그 창의 진행 단추를 실제 탭으로 누른다 — 막혀 있으면 멈춤으로 잡힌다
      const conf = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.getClientRects().length && !x.disabled && /시간을 거스른다|운명을 거스른다/.test(x.textContent)); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, hit: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('button') === b }; });
      if (conf) { log.push(`CONFIRM 창 — 단추가 눌리는가: ${conf.hit ? '예' : '아니오(막힘!)'}`); await tap(conf.x, conf.y); await W(2500); continue; }
      if (st.act && st.hole) { await tap(st.hole.x, st.hole.y); await W(1200); }
      else { await tap(457, 200); await W(450); }
      continue;
    }
    if (st.go) { await p.evaluate(() => document.querySelector('[data-go]').click()); await W(2500); continue; }
    if (st.press || st.cut) { await tap(457, 300); await W(700); continue; }
    if (st.battle && st.winner === null) {
      const r = await Promise.race([p.evaluate(async () => window.sliceApi.botMove('greedy')), W(20000).then(() => 'HANG')]);
      if (r === 'HANG') { log.push('HANG botMove'); await snap('HANG'); }
      await W(r === 'end' ? 2500 : 900);
      continue;
    }
    // 보상 · 그 밖: 진행 단추
    const clicked = await p.evaluate(() => { const s = [...document.querySelectorAll('[data-slot]')].find((x) => x.getClientRects().length); if (s) s.click(); const b = [...document.querySelectorAll('button')].find((x) => x.getClientRects().length && !x.disabled && /고른다|나아간다|확인|계속한다|^\s*다음\s*$|시작한다/.test(x.textContent)); if (b) { b.click(); return true; } return false; });
    if (!clicked) await tap(457, 300);
    await W(1000);
  }
  const line = `firstrun: ${log.at(-1)} · 안내 ${log.filter((l) => l.startsWith('TUT')).length}걸음 · 오류 ${errs.length}`;
  fs.writeFileSync(OUT + 'report.txt', [line, ...log, '', ...errs].join('\n'));
  console.log(line);
  console.log(errs.join('\n'));
  await br.close();
})();
