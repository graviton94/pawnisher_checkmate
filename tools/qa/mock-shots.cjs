// 시안 촬영 (2026-11-10): 사건 · 출하 결과 화면을 ?mock=<시안>으로 열어 단계별로 찍는다.
// 사용: node tools/qa/mock-shots.cjs <ev|end|map> <mock|-> <출력 접두사> [w h dpr]
const { chromium } = require('playwright');
const BASE = process.env.OBSERVE_URL || 'http://localhost:4183/';
(async () => {
  const [kind, mock, out, w = 915, h = 412, dpr = 2.625] = process.argv.slice(2);
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr, hasTouch: true, isMobile: true });
  const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  const q = `?debug${mock && mock !== '-' ? `&mock=${mock}` : ''}`;
  await pg.addInitScript(() => { try { const k = 'pawnisher.slice.meta'; const m = JSON.parse(localStorage.getItem(k) || '{}'); m.tut = ['battle', 'battle-a', 'battle-b', 'recruit', 'map', 'kit', 'event', 'shop', 'forge']; localStorage.setItem(k, JSON.stringify(m)); } catch {} });
  await pg.goto(BASE + q); await pg.waitForTimeout(900);
  // 부팅 화면(#boot)이 걷힐 때까지 — 그 아래에서 의식이 지나가지 않게
  for (let i = 0; i < 60 && (await pg.$('#boot')); i++) await pg.waitForTimeout(200);
  const s = await pg.$('.stagefx'); if (s) { await s.click(); await pg.waitForTimeout(400); }
  const A = (fn, arg) => pg.evaluate(fn, arg);
  const shot = (n) => pg.screenshot({ path: `${out}-${n}.png` });
  const tapSel = async (sel) => { const e = await pg.$(sel); if (e) { await e.tap().catch(() => e.click()); return true; } return false; };
  if (kind === 'ev') {
    const id = process.env.EV || 'tinker';
    await A((id) => { window.sliceApi.gold(50); window.sliceApi.hurt(0.6); window.sliceApi.event(id); }, id);
    await pg.waitForTimeout(3200); await shot('intro');
    await tapSel('.choice[data-slot="0"]'); await pg.waitForTimeout(2600); await shot('choice');
    await tapSel('.choice[data-slot="0"]'); await pg.waitForTimeout(900);
    for (let i = 0; i < 4; i++) { if (!(await tapSel('.ev-ov .ev-tap'))) { const st = await pg.$('.ev-ov-stage'); if (st && !(await pg.$('.ev-ov-ok:not([hidden])'))) await st.tap().catch(() => {}); } await pg.waitForTimeout(500); }
    const fr = +(process.env.FRAMES || 0);
    for (let i = 0; i < fr; i++) { await shot(`fx${i}`); await pg.waitForTimeout(160); }
    for (let i = 0; i < 20 && !(await pg.$('.ev-ov-ok:not([hidden])')); i++) await pg.waitForTimeout(250);
    await pg.waitForTimeout(400); await shot('stage');
    await tapSel('.ev-ov-ok'); await pg.waitForTimeout(4200); await shot('result');
  } else if (kind === 'ev2') {
    // 2차 시안: 소개 → 고름(미리보기) → 다시 누름 → FX 1박 프레임 → 결과 쪽지 2박
    const id = process.env.EV || 'tinker';
    await A((id) => { window.sliceApi.gold(50); window.sliceApi.hurt(0.6); window.sliceApi.event(id); }, id);
    await pg.waitForTimeout(3600); await shot('intro');
    await tapSel('.choice[data-slot="0"]'); await pg.waitForTimeout(2600); await shot('sel');
    await tapSel('.choice[data-slot="0"]');
    const fr = +(process.env.FRAMES || 0), step = +(process.env.STEP || 160);
    await pg.waitForTimeout(+(process.env.AT || 300));
    for (let i = 0; i < 6; i++) { if (await tapSel('.ev-ov .ev-tap')) await pg.waitForTimeout(400); else break; }
    for (let i = 0; i < fr; i++) { await shot(`fx${i}`); await pg.waitForTimeout(step); }
    for (let i = 0; i < 40 && !(await pg.$('.mk2-done .ws-work .go:not([data-pick])')); i++) await pg.waitForTimeout(250);
    await pg.waitForTimeout(600); await shot('slip');
    const geo = await pg.evaluate(() => { const r = (s) => { const e = document.querySelector(s); if (!e) return '-'; const b = e.getBoundingClientRect(); return `${Math.round(b.left)},${Math.round(b.top)} ${Math.round(b.width)}x${Math.round(b.height)}`; }; return ['#overlay-panel', '.ws-work', '.ws-say', '.ws-sum', '.ws-work .btn-row', '.mk2-cap'].map((s) => s + ' ' + r(s)).join(' | '); });
    console.log(geo);
  } else if (kind === 'end') {
    await pg.waitForTimeout(+(process.env.PRE || 0));
    await A(() => window.sliceApi.startAt(3, 'boss')); await pg.waitForTimeout(1500);
    await A(() => { const api = window.sliceApi; api.mockRun(); api.setAct(2); });
    await A(() => window.sliceApi.endNow(true));
    const fr = +(process.env.FRAMES || 0), step = +(process.env.STEP || 120), at = +(process.env.AT || 0);
    if (at) await pg.waitForTimeout(at);
    for (let i = 0; i < fr; i++) { await shot('f' + i); await pg.waitForTimeout(step); }
    await pg.waitForTimeout(+(process.env.FINAL || 7500)); await shot('final');
  } else if (kind === 'act') {
    await pg.waitForTimeout(+(process.env.PRE || 0));
    await A(() => window.sliceApi.startAt(1, 'boss')); await pg.waitForTimeout(1500);
    await A((n) => { const api = window.sliceApi; api.mockRun(); api.setAct(n); api.nextAct(); }, +(process.env.ACT || 0));
    const fr = +(process.env.FRAMES || 0), step = +(process.env.STEP || 120), at = +(process.env.AT || 0);
    if (at) await pg.waitForTimeout(at);
    for (let i = 0; i < fr; i++) { await shot('f' + i); await pg.waitForTimeout(step); }
    await pg.waitForTimeout(+(process.env.FINAL || 7500)); await shot('final');
  } else if (kind === 'map') {
    const geo = () => pg.evaluate(() => { const b = document.querySelector('.peek-bar').getBoundingClientRect(); const n = document.querySelector('.mnd.now').getBoundingClientRect(); return 'bar ' + b.top.toFixed(1) + '-' + b.bottom.toFixed(1) + ' h' + b.height.toFixed(1) + ' node ' + n.top.toFixed(1); });
    await A(() => window.sliceApi.map(2)); await pg.waitForTimeout(900); await shot('legend'); console.log('legend', await geo());
    await tapSel('.mnd.now');
    const fr = +(process.env.FRAMES || 0);
    for (let i = 0; i < fr; i++) { await shot('open' + i); await pg.waitForTimeout(50); }
    await pg.waitForTimeout(500); await shot('sel'); console.log('sel', await geo());
    const ns = await pg.$$('.mnd.now'); if (ns[1]) { await ns[1].tap(); await pg.waitForTimeout(400); await shot('sel2'); }
  }
  if (errs.length) console.log('ERR', errs.join(' | '));
  await br.close();
})();
