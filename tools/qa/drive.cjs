// 출시 완주 점검 공용 (2026-11-16): 실제 화면을 모는 도구 — completion.cjs · resume.cjs가 같이 쓴다.
// 대국만 판을 비워 이긴(또는 진) 것으로 끝내고, 그 밖의 화면은 실제 단추를 누른다.
const { chromium } = require('playwright');
let OUT = 'production/qa/';
const setOut = (o) => { OUT = o; };
const URL = 'http://localhost:4173/?debug';
const W = (ms) => new Promise((r) => setTimeout(r, ms));
const TUT = ['battle', 'battle-a', 'map', 'recruit', 'kit', 'promote', 'first_shop'];
const open = async (br) => {
  const ctx = await br.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  p.errs = [];
  p.missing = new Set();
  p.on('pageerror', (e) => p.errs.push(`PAGEERROR ${e.message} @ ${(e.stack || '').split('\n')[1] || ''}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) p.errs.push(`CONSOLE ${m.text().slice(0, 160)}`); });
  p.on('response', (r) => { if (r.status() >= 400 && /scenes\//.test(r.url())) p.missing.add(r.url().replace(/.*scenes\//, '')); });
  return p;
};
const meta = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('pawnisher.slice.meta') || 'null'));
const save = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('pawnisher.slice.save') || 'null'));
const seedMeta = async (p, m) => {
  await p.goto(URL); await p.waitForFunction(() => window.sliceApi);
  await p.evaluate((m) => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('pawnisher.slice.meta', JSON.stringify(m)); }, { mv: 1, campaignVersion: 1, runs: 3, clears: 0, ascOpen: 0, bestAct: 1, daily: {}, nemeses: [], tut: TUT, prologue: true, onboarded: true, storyCleared: 0, ...m });
};
/** 메인 메뉴가 떴는지 (D-539 단추 다섯: [이어하기] · 출하 · 기록 | 설정) */
const MENU = '.op-menu:not([hidden]) [data-ship]';
/** 실제 첫 화면 → 메뉴 */
const toMenu = async (p) => {
  await p.goto(URL + '&opening'); await p.waitForFunction(() => window.sliceApi);
  await p.waitForSelector('#boot', { state: 'detached', timeout: 20000 }).catch(() => {});
  for (let i = 0; i < 12 && !(await p.$(MENU)); i++) { await p.mouse.click(457, 300); await W(700); }
  return !!(await p.$(MENU));
};
const click = (p, sel) => p.evaluate((s) => { const e = [...document.querySelectorAll(s)].find((x) => x.getClientRects().length && !x.disabled); if (!e) return false; e.click(); return true; }, sel);
const clickText = (p, re) => p.evaluate((src) => { const re = new RegExp(src); const b = [...document.querySelectorAll('button')].find((x) => x.getClientRects().length && !x.disabled && re.test(x.textContent)); if (!b) return false; b.click(); return true; }, re.source);
/** 출하 준비 창(D-539)에서 지금 고른 것 한 줄: 본편 = 왕관 표지 · 별칭, 도전 = 난이도 줄, 오늘의 도전 = 날짜 줄 */
const setupLabel = (p) => p.evaluate(() => {
  const w = document.querySelector('.su-win') ?? document;
  const c = w.querySelector('.su-crown[aria-pressed="true"]');
  if (c) return `${c.querySelector('.choice-name')?.textContent ?? ''} · ${c.querySelector('.choice-res')?.textContent ?? ''}`;
  return (w.querySelector('.su-body .lead') ?? w.querySelector('.su-body'))?.textContent?.trim().slice(0, 60) ?? '';
});
/** 메뉴 「출하」 → 출하 준비 창을 연다 */
const openSetup = async (p) => {
  if (!(await click(p, '.op-menu [data-ship]'))) return false;
  await p.waitForSelector('.su-win [data-su-go]', { timeout: 5000 }).catch(() => {});
  return !!(await p.$('.su-win [data-su-go]'));
};
/**
 * 메뉴 「출하」 → 출하 준비 창(D-539): 탭(story · challenge · daily)을 고르고, 왕관(o.crown) · 도전 난이도(o.down = ◀ 몇 번)를 맞춘 뒤 「출하한다」.
 * 저장이 있으면 덮어쓰기 확인, 시작 세트 화면은 첫 받침을 두 번. 돌려주는 것 = 출하 준비 창에 보인 고른 것 한 줄.
 */
const startFromMenu = async (p, kind, o = {}) => {
  if (!(await openSetup(p))) return '';
  await click(p, `[data-su-tab="${kind}"]`); await W(300);
  if (o.crown !== undefined) { await click(p, `.su-crown[data-crown="${o.crown}"]`); await W(300); }
  for (let i = 0; i < (o.down ?? 0); i++) { await click(p, '[data-su-prev]'); await W(150); }
  const label = await setupLabel(p);
  await click(p, '[data-su-go]'); await W(700);
  await click(p, '[data-yes]'); await W(700);
  for (let i = 0; i < 3; i++) { if (await click(p, '#overlay-panel [data-slot]:not([disabled]), #overlay-panel .start-set:not([disabled])')) await W(500); }
  return label;
};
/** 멈춤 메뉴(D-539 — 대국 · 지도 머리 톱니 · Esc)를 열어 「처음으로」(저장한 뒤 메인 메뉴) */
const pauseToTitle = async (p) => {
  if (!(await click(p, '[data-map-menu]'))) await p.keyboard.press('Escape');
  await p.waitForSelector('.pause-win [data-pz-home]', { timeout: 15000 }).catch(() => {});
  const ok = await click(p, '.pause-win [data-pz-home]');
  await W(1500);
  return ok;
};

/**
 * 한 출하를 끝(「메인 화면으로」)까지 몬다. choice = 왕위 결정에서 누를 단추 (look → 돌아본 뒤 왕관을 쓴다).
 * stop(st) 이 참이면 그 자리에서 멈춘다 (이어하기 점검용). 지나간 장면은 tl에 순서대로.
 */
const drive = async (p, { tag, choice = 'crown', lose = false, stop = null, maxIt = 900 }) => {
  const tl = [];
  const mark = (s) => { if (tl[tl.length - 1] !== s) tl.push(s); };
  let lastSig = '', same = 0, looked = false, battles = 0;
  const shot = new Set();
  for (let it = 0; it < maxIt; it++) {
    const st = await p.evaluate(() => {
      const vis = (s) => [...document.querySelectorAll(s)].some((e) => e.getClientRects().length);
      const ov = document.getElementById('overlay');
      const panel = document.getElementById('overlay-panel');
      const cutImg = [...document.querySelectorAll('.prologue .pl-stage img')].at(-1)?.getAttribute('src')?.replace(/.*scenes\/|\.png/g, '') ?? '';
      return {
        cut: vis('.prologue'), cutImg, actcard: document.querySelector('.actcard .ac-name')?.textContent ?? '', boss: document.querySelector('.bossfx .bf-name')?.textContent ?? '',
        promo: vis('.promotion'), credits: vis('.credits'), map: vis('.mapfx'), mapAct: document.querySelector('.mapfx h1, .mapfx .map-title')?.textContent?.trim() ?? '',
        kit: vis('.kit-confirm'), overlay: !!ov && !ov.hidden, h2: panel?.querySelector('h2, .win-title, .plate-title')?.textContent?.trim().slice(0, 20) ?? '', tut: !!document.querySelector('.tut'),
        battle: !!document.querySelector('#hand [data-card]') && (!ov || ov.hidden) && !document.body.classList.contains('between') && !vis('.mapfx, .prologue, .actcard, .bossfx, .promotion, .credits, .stagefx') && !!localStorage.getItem('pawnisher.slice.save') && window.slice().s.winner === null,
        ev: [...document.querySelectorAll('.ws-choices .choice')].some((x) => x.offsetParent && !x.disabled) && !document.querySelector('.ws-sum:not([hidden])'), evOk: vis('.ev-ov-ok:not([hidden])'), evStage: vis('.ev-stage, .ws-choices'),
        shop: !!ov && !ov.hidden && !!document.querySelector('#overlay-panel.scr-shop, #overlay-panel .scr-shop, .scr-shop'),
        home: [...document.querySelectorAll('button')].some((x) => x.getClientRects().length > 0 && /메인 화면으로/.test(x.textContent)),
        ledger: document.querySelector('.scr-clear h2, .clr-title, .scr-result h2')?.textContent?.trim() ?? '',
        sub: ([...document.querySelectorAll('.cut-sub')].filter((e) => e.getClientRects().length).at(-1)?.textContent ?? '').slice(-30),
        lost: /하자 폐기/.test(panel?.textContent ?? '') && !!ov && !ov.hidden && !vis('.prologue'),
      };
    });
    if (st.cut && st.cutImg) mark(`cut:${st.cutImg}`);
    // 결말 컷 증거 (END-K 왕좌 · 쇠판 / END-T 하얀 땅 / END-F 태엽): 처음 보일 때 한 장
    if (st.cut && /^(crown-\d-throne|end-k-gild|end-t-throw|end-t-step|end-f-box|end-f-unwind)$/.test(st.cutImg) && !shot.has(st.cutImg)) { shot.add(st.cutImg); await W(700); await p.screenshot({ path: `${OUT}${tag}-cut-${st.cutImg}.png` }); }
    if (st.actcard) mark(`act:${st.actcard}`);
    if (st.boss) mark(`boss:${st.boss}`);
    if (st.promo) mark('promotion');
    if (st.credits) mark('credits');
    if (st.map && st.mapAct) mark(`map:${st.mapAct}`);
    if (st.lost) mark('lost');
    if (stop && stop(st)) return { stopped: true, tl, st, battles };
    const sig = JSON.stringify([st.sub, st.cut, st.cutImg, st.actcard, st.boss, st.promo, st.credits, st.map, st.kit, st.overlay, st.h2, st.battle, st.ev, st.evOk]);
    if (sig !== lastSig) { same = 0; lastSig = sig; } else same += 1;
    if (same > 40) { await p.screenshot({ path: `${OUT}${tag}-STUCK.png` }); return { end: false, stuck: sig, tl, battles }; }
    if (st.home) { mark('home-button'); return { end: true, tl, battles }; }
    if (lose && (await clickText(p, /눈을 감는다/))) { mark('rewind-declined'); await W(800); continue; }
    if (st.lost) { mark('quit'); await click(p, '[data-quit]'); await W(800); continue; }
    // 컷은 건너뛰지 않고 눌러 넘긴다 (모든 컷이 순서대로 나오는지 보려고) — 오래 같으면 건너뛰기
    if (st.cut || st.actcard || st.boss) { if (same > 12) await clickText(p, /건너뛰기|건너뛴다/); else await p.mouse.click(457, 200); await W(350); continue; }
    if (st.tut) { await click(p, '.tut-skip'); await W(400); continue; }
    if (st.promo) {
      if (choice === 'look' && !looked) { if (await click(p, '.promotion [data-lay]')) { looked = true; await W(800); continue; } }
      if (await click(p, choice === 'depart' ? '.promotion [data-lay]' : '.promotion [data-promote]')) { mark(`chose:${choice}`); await W(1000); continue; }
      await p.mouse.click(457, 200); await W(400); continue;
    }
    if (st.credits) { (await click(p, '.credits [data-cr-next]')) || (await p.mouse.click(457, 200)); await W(350); continue; }
    if (st.kit) { (await click(p, '.kit-confirm [data-yes]')) || (await click(p, '.kit-confirm .row .btn:last-child')); await W(500); continue; }
    if (await click(p, '.ev-tap')) { await W(700); continue; }
    if (st.evOk) { await click(p, '.ev-ov-ok'); await W(700); continue; }
    if (await click(p, '.ev-exit .btn, .ev-out .btn')) { await W(900); continue; }
    // 사건 안의 고르기 (카드 하나를 고른 뒤 단추 — 비뚤어진 저울추 등): 받침을 먼저 누른다
    if (await p.evaluate(() => { if (!document.querySelector('.ws-choices .choice.is-sel')) return false; const c = [...document.querySelectorAll('#overlay-panel .cf')].find((x) => x.getClientRects().length && !x.disabled); const g = [...document.querySelectorAll('button.go')].find((x) => x.getClientRects().length && x.disabled); if (c && g) { c.click(); return true; } return false; })) { await W(400); await click(p, 'button.go'); await W(1500); continue; }
    if (st.ev) { await click(p, '.ws-choices .choice'); await W(400); await click(p, '.ws-choices .choice'); await W(2000); continue; }
    if (st.overlay) {
      let done = false;
      for (const s of ['[data-pick]', '[data-kit]', '[data-part]', '[data-ref]', '[data-rec]', '[data-leave]', '[data-skip]', '#overlay-panel .row .btn.brass, #overlay-panel .row .btn.cyan, #overlay-panel .row .btn', '#overlay-panel button']) {
        if (await click(p, s)) { done = true; break; }
      }
      if (done) { await W(800); continue; }
    }
    if (st.map) { if (await click(p, '.mapfx .mnd.now, .mapfx [data-node].now')) { await W(600); await clickText(p, /진입/); await W(1500); continue; } }
    if (st.battle) {
      battles += 1;
      await p.evaluate((lose) => { const b = window.slice(); if (lose) { b.s.pieces = b.s.pieces.filter((x) => x.side === 1); b.s.winner = 1; } else { b.s.pieces = b.s.pieces.filter((x) => x.side === 0); b.s.winner = 0; } window.sliceApi.finish(); return 0; }, lose);
      await W(2500); continue;
    }
    if (await clickText(p, /나아간다|계속한다|다음으로|확인|^\s*다음\s*$|결과를 본다/)) { await W(900); continue; }
    await p.mouse.click(457, 300); await W(600);
  }
  return { end: false, stuck: 'max iterations', tl, battles };
};
module.exports = { chromium, URL, W, TUT, MENU, setOut, open, meta, save, seedMeta, toMenu, click, clickText, setupLabel, openSetup, startFromMenu, pauseToTitle, drive };
