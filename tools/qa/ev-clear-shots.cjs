// 사건 창 · 막 장부 촬영 (D-402): 단계별로 실제 탭으로 찍는다.
// 사용: OBSERVE_URL=http://localhost:4185/ node tools/qa/ev-clear-shots.cjs <ev|act|end> <출력 접두사> [w h dpr]
//  ev: 소개 → 고름(미리보기) → 같은 판 다시 누름 → 나사 굴림 프레임(ROLL) → 1박 프레임(FRAMES, STEP) → 2박 쪽지
//  act: 1막 반장 뒤 막 장부(ACT=막 번호 0부터) · end: 출하 끝 = 크레딧(이름 · 제작진) → 닫는 장 장부 (D-403)
//  ev 타자기 (D-403): TYPE=1이면 소개 · 고름 반응을 찍는 중에 한 장씩 더(intro-t* · sel-t*)
const { chromium } = require('playwright');
const BASE = process.env.OBSERVE_URL || 'http://localhost:4185/';
(async () => {
  const [kind, out, w = 915, h = 412, dpr = 2.625] = process.argv.slice(2);
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const pg = await br.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr, hasTouch: true, isMobile: true });
  const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { try { const k = 'pawnisher.slice.meta'; const m = JSON.parse(localStorage.getItem(k) || '{}'); m.tut = ['battle', 'battle-a', 'battle-b', 'recruit', 'map', 'kit', 'event', 'shop', 'forge']; localStorage.setItem(k, JSON.stringify(m)); } catch {} });
  await pg.goto(BASE + '?debug'); await pg.waitForTimeout(900);
  for (let i = 0; i < 60 && (await pg.$('#boot')); i++) await pg.waitForTimeout(200);
  const A = (fn, arg) => pg.evaluate(fn, arg);
  const shot = (n) => pg.screenshot({ path: `${out}-${n}.png` });
  const tapSel = async (sel) => { const e = await pg.$(sel); if (e) { await e.tap().catch(() => e.click()); return true; } return false; };
  const geo = (sels) => pg.evaluate((sels) => sels.map((s) => { const e = document.querySelector(s); if (!e) return `${s} -`; const b = e.getBoundingClientRect(); return `${s} ${Math.round(b.left)},${Math.round(b.top)} ${Math.round(b.width)}x${Math.round(b.height)} bottom ${Math.round(b.bottom)}`; }).join(' | '), sels);
  if (kind === 'ev') {
    const id = process.env.EV || 'tinker', slot = process.env.SLOT || '0';
    await A(([id, g]) => { window.sliceApi.gold(g); window.sliceApi.hurt(0.6); window.sliceApi.event(id); }, [id, +(process.env.GOLD || 50)]);
    if (process.env.TYPE) for (const t of [700, 1400, 2300, 2800]) { await pg.waitForTimeout(t - (t === 700 ? 0 : [700, 1400, 2300, 2800][[700, 1400, 2300, 2800].indexOf(t) - 1])); await shot(`intro-t${t}`); }
    await pg.waitForTimeout(process.env.TYPE ? 2400 : 3600); await shot('intro');
    await tapSel(`.choice[data-slot="${slot}"]`);
    if (process.env.TYPE) { await pg.waitForTimeout(450); await shot('sel-t450'); await tapSel('.ws-say'); await pg.waitForTimeout(80); await shot('sel-skip'); }
    await pg.waitForTimeout(2600); await shot('sel');
    await tapSel(`.choice[data-slot="${slot}"]`);
    const rf = +(process.env.ROLL || 0);
    for (let i = 0; i < rf; i++) { await pg.waitForTimeout(70); await shot(`roll${i}`); }
    await pg.waitForTimeout(+(process.env.AT || 300));
    for (let i = 0; i < 6; i++) { if (await tapSel('.ev-ov .ev-tap')) await pg.waitForTimeout(400); else break; }
    const fr = +(process.env.FRAMES || 0), step = +(process.env.STEP || 160);
    for (let i = 0; i < fr; i++) { await shot(`fx${i}`); await pg.waitForTimeout(step); }
    for (let i = 0; i < 60 && !(await pg.$('[data-final]')); i++) await pg.waitForTimeout(250);
    await pg.waitForTimeout(600); await shot('slip');
    console.log(await geo(['#overlay-panel', '.ws-work', '.ws-say', '.ws-sum', '.ws-work .btn-row', '.ws-cap']));
  } else if (kind === 'act' || kind === 'end') {
    await A((k) => window.sliceApi.startAt(k === 'end' ? 3 : 1, 'boss'), kind); await pg.waitForTimeout(1500);
    if (kind === 'end') {
      await A(() => { const api = window.sliceApi; api.richRun(); api.setAct(2); api.endNow(true); });
      await pg.locator('.credits').waitFor({ state: 'visible' });
      await pg.waitForTimeout(300); await shot('credits');
      await tapSel('[data-cr-result]');
      for (let i = 0; i < 20 && !(await pg.$('.clr')); i++) await pg.waitForTimeout(150);
    }
    else await A((n) => { const api = window.sliceApi; api.richRun(); api.setAct(n); api.nextAct(); }, +(process.env.ACT || 0));
    const fr = +(process.env.FRAMES || 0), step = +(process.env.STEP || 120);
    await pg.waitForTimeout(+(process.env.AT || 0));
    for (let i = 0; i < fr; i++) { await shot('f' + i); await pg.waitForTimeout(step); }
    await pg.waitForTimeout(+(process.env.FINAL || 7500)); await shot('final');
    console.log(await geo(['.clr', '.clr-work', '.clr-mvp', '.clr-next', '.clr-work .btn-row', '.clr-work .btn-row .go']));
    if (process.env.GO) { await tapSel('.clr [data-go]'); await pg.waitForTimeout(1600); await shot('after'); await pg.waitForTimeout(3200); await shot('after2'); }
  }
  if (errs.length) console.log('ERR', errs.join(' | '));
  await br.close();
})();
