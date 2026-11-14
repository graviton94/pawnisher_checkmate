// 베타 점검 (D-477 → P-C D-502): 처음 설치한 사람의 흐름 — 저장이 빈 상태에서 첫 화면 → 프롤로그 → 메뉴 → 안내서 「목표」 →
// 입문 시험대 A · B · C(부관 박차) → 영입 → 지도 → 첫 실전 대국이 설 때까지 실제 탭으로 따라간다.
// 안내 걸음 · 안내서 쪽 · 로딩 쪽지마다 사진 · 오류 · 멈춤을 남기고, 걸린 시간(첫 판 손대기 · 첫 실전 대국)을 적는다.
// 사용: 프리뷰 서버를 띄운 뒤 node tools/qa/firstrun.cjs <출력 폴더>
//   환경: PORT(4173) · VW · VH · DPR(915 · 412 · 1) · RM=1(줄인 움직임) · TAG(사진 이름 머리)
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = (process.argv[2] ?? 'production/qa/firstrun') + '/';
fs.mkdirSync(OUT, { recursive: true });
const W = (ms) => new Promise((r) => setTimeout(r, ms));
const URL0 = `http://localhost:${process.env.PORT || 4173}/?debug&opening`;
const VW = +(process.env.VW || 915), VH = +(process.env.VH || 412), DPR = +(process.env.DPR || 1);
const TAG = process.env.TAG ? `${process.env.TAG}-` : '';
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DPR, hasTouch: true, isMobile: true, reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage();
  const errs = [];
  const log = [];
  const t0 = Date.now();
  const sec = () => ((Date.now() - t0) / 1000).toFixed(1);
  p.on('pageerror', (e) => errs.push(`PAGEERROR ${e.message} @ ${(e.stack || '').split('\n')[1] || ''}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(`CONSOLE ${m.text().slice(0, 200)}`); });
  await p.goto(URL0);
  await p.evaluate(() => localStorage.clear());
  await p.goto(URL0);
  await p.waitForFunction(() => window.sliceApi);
  await W(2500);
  let shot = 0, lastText = '', same = 0, taps = 0;
  const snap = async (tag) => { shot += 1; await p.screenshot({ path: `${OUT}${TAG}${String(shot).padStart(3, '0')}-${tag}.png` }); };
  const tap = async (x, y) => { taps += 1; await p.touchscreen.tap(x, y); };
  const tapEl = async (sel) => {
    const r = await p.evaluate((s) => { const e = [...document.querySelectorAll(s)].find((x) => x.getClientRects().length && !x.disabled); if (!e) return null; const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }, sel);
    if (r) await tap(r.x, r.y);
    return !!r;
  };
  let done = false;
  for (let it = 0; it < 600 && !done; it++) {
    const st = await p.evaluate(() => {
      const vis = (e) => !!e && e.getClientRects().length > 0;
      const tut = document.querySelector('.tut');
      const fr = tut?.querySelector('.tut-frame');
      const r = fr && !fr.hidden ? fr.getBoundingClientRect() : null;
      const tel = JSON.parse(localStorage.getItem('pawnisher.telemetry') ?? '[]');
      return {
        tut: !!tut, act: !!tut?.classList.contains('act'), text: tut?.querySelector('.line')?.textContent ?? '',
        // 구멍 안에서 부관 띠에 가리지 않은 점 (가운데부터 위로 훑는다 — 사람은 보이는 곳을 누른다)
        hole: r ? (() => { const x = r.left + r.width / 2; for (let k = 0; k <= 8; k++) { const y = r.top + r.height / 2 - (r.height / 2 - 6) * (k / 8); if (!document.elementFromPoint(x, y)?.closest('.tut-say')) return { x, y }; } return { x, y: r.top + r.height / 2 }; })() : null,
        go: vis(document.querySelector('[data-go]')), map: !!document.querySelector('.mapfx'),
        guide: vis(document.querySelector('.win .gd3')) ? document.querySelector('.win .gd-text3 .lead')?.textContent : null,
        tip: vis(document.querySelector('.ld-tip-wrap')) ? document.querySelector('.ld-tip .lead')?.textContent : null,
        cut: !!document.querySelector('.prologue, .actcard'), press: vis(document.querySelector('.op-press')),
        battle: !!document.querySelector('#hand [data-card]') && !document.body.classList.contains('between'),
        drill: document.body.dataset.drill ?? '', title: window.slice?.() ? null : null,
        turn: window.slice()?.turn ?? 0, winner: window.slice()?.s?.winner ?? null, sub: (document.querySelector('.cut-sub, .prologue')?.textContent ?? '').slice(-40),
        botOk: (window.sliceApi.progress().tut ?? []).includes('battle'),
        ftue: tel.filter((e) => e.e === 'ftue_step').map((e) => `${e.step_id}@${e.elapsed_sec}`),
      };
    });
    const key = `${st.tut}|${st.act}|${st.text.slice(0, 20)}|${st.map}|${st.cut}|${st.turn}|${st.sub}|${st.guide}|${st.tip}`;
    if (key === lastText) same += 1; else {
      same = 0; lastText = key;
      if (st.tut && st.text) { await snap(st.act ? 'tut-act' : 'tut'); log.push(`${sec()}s TUT ${st.act ? '[행동]' : '[읽기]'} ${st.drill ? `(${st.drill}) ` : ''}${st.text.replace(/\s+/g, ' ').slice(0, 60)}`); }
      if (st.guide) { await snap('guide'); log.push(`${sec()}s 안내서 「${st.guide}」`); }
      if (st.tip) { await snap('tip'); log.push(`${sec()}s 로딩 쪽지 「${st.tip}」`); }
    }
    if (same > 40) { log.push(`STUCK ${key}`); await snap('STUCK'); break; }
    if (st.ftue.some((f) => f.startsWith('first_real_battle')) && st.battle && !st.tut) {
      await W(1500);
      // 첫 실전 대국의 부관 한 줄(배치 턴)까지 받고 끝낸다
      const t = await p.evaluate(() => document.querySelector('.tut .line')?.textContent ?? '');
      if (t) { await W(1500); await snap('real-heat'); log.push(`${sec()}s TUT [읽기] ${t.replace(/\s+/g, ' ').slice(0, 60)}`); }
      else await snap('real-battle');
      log.push(`${sec()}s 첫 실전 대국에 섰다`);
      done = true;
      break;
    }
    if (st.tip) { await tap(VW / 2, VH / 2); await W(500); continue; }
    if (st.guide && !st.tut) { await tapEl('.win [data-next]'); await W(900); continue; }
    if (st.tut) {
      // 안내 걸음 중 확인 창(되감기 등)이 뜨면 사람처럼 그 창의 진행 단추를 실제 탭으로 누른다 — 막혀 있으면 멈춤으로 잡힌다
      const conf = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.getClientRects().length && !x.disabled && /시간을 거스른다|운명을 거스른다/.test(x.textContent)); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, hit: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('button') === b }; });
      if (conf) { log.push(`CONFIRM 창 — 단추가 눌리는가: ${conf.hit ? '예' : '아니오(막힘!)'}`); await tap(conf.x, conf.y); await W(2500); continue; }
      // 지도의 「빛나는 대국」 걸음: 구멍이 두 노드를 감싸면 가운데가 빈 땅이다 — 열린 노드 하나를 누른다
      if (st.act && st.map && /빛나는 대국/.test(st.text)) { await p.evaluate(() => document.querySelector('.mnd.now')?.click()); taps += 1; await W(1200); continue; }
      // 고르기 화면(영입 · 핵심 부품): 받침 하나를 두 번 — 고름 → 정함
      if (st.act && /고르십시오/.test(st.text) && (await tapEl('.scr-items .card-slot'))) { await W(700); await tapEl('.scr-items .card-slot'); await W(1500); continue; }
      if (st.act && st.hole) { await tap(st.hole.x, st.hole.y); await W(1200); }
      // 읽기 걸음: 「아무 데나」 — 사람처럼 부관 글 위를 누른다(띠 속 [건너뛴다]를 피해서)
      else { if (!(await tapEl('.tut .line'))) await tap(VW / 2, VH / 2 - 6); await W(450); }
      continue;
    }
    if (st.go) { await p.evaluate(() => document.querySelector('[data-go]').click()); taps += 1; await W(2500); continue; }
    if (st.press || st.cut) { await tap(VW / 2, VH * 0.72); await W(700); continue; }
    // 입문 안내(시험대 C 「battle」)를 마치기 전의 빈틈에는 봇이 두지 않는다 — 대본이 짠 판을 흐트러뜨린다
    if (st.battle && st.winner === null && !st.botOk) { await W(400); continue; }
    if (st.battle && st.winner === null) {
      // 안내가 끝난 뒤의 자유 수(시험대 C 마무리)는 사람 대신 봇이 둔다
      const r = await Promise.race([p.evaluate(async () => window.sliceApi.botMove('greedy')), W(20000).then(() => 'HANG')]);
      if (r === 'HANG') { log.push('HANG botMove'); await snap('HANG'); }
      taps += 3;
      await W(r === 'end' ? 2500 : 900);
      continue;
    }
    // 보상 · 그 밖: 진행 단추
    const clicked = await p.evaluate(() => { const s = [...document.querySelectorAll('[data-slot]')].find((x) => x.getClientRects().length); if (s) s.click(); const b = [...document.querySelectorAll('button')].find((x) => x.getClientRects().length && !x.disabled && /고른다|나아간다|확인|계속한다|^\s*다음\s*$|시작한다|진입/.test(x.textContent)); if (b) { b.click(); return true; } return false; });
    taps += 1;
    if (!clicked) await tap(VW / 2, VH * 0.72);
    await W(1000);
  }
  const fin = await p.evaluate(() => ({
    ftue: JSON.parse(localStorage.getItem('pawnisher.telemetry') ?? '[]').filter((e) => e.e === 'ftue_step' || e.e === 'tutorial').map((e) => (e.e === 'tutorial' ? `tutorial:${e.part}:${e.completed}` : `${e.step_id}@${e.elapsed_sec}s`)),
    charms: (() => { try { const r = JSON.parse(localStorage.getItem('pawnisher.slice.save') ?? 'null'); return r?.charms ?? null; } catch { return null; } })(),
    tips: localStorage.getItem('pc-loadtips'),
  }));
  const line = `firstrun ${VW}×${VH}@${DPR}${process.env.RM ? ' 줄인 움직임' : ''}: ${log.at(-1)} · 안내 ${log.filter((l) => l.includes('TUT')).length}걸음 · 탭 약 ${taps} · ${sec()}초 · 오류 ${errs.length}`;
  fs.writeFileSync(OUT + `${TAG}report.txt`, [line, `ftue: ${fin.ftue.join(' · ')}`, `부적(저장): ${JSON.stringify(fin.charms)}`, `로딩 쪽지: ${fin.tips}`, ...log, '', ...errs].join('\n'));
  console.log(line);
  console.log(errs.join('\n'));
  await br.close();
})();
