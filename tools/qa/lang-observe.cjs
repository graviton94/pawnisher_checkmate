// 언어 전환 실화면 (D-651 · D-653): ?lang=en|ko로 타이틀 · 메인 메뉴 · 설정(소리 · 게임 탭 언어 줄) · 대국 HUD · (D-671) 지도 · 고물상 · 작업대 · 보상 · 사건 · 용어 사전 · 덱을 915×412 DPR 2.625 터치로 찍는다.
// 미리 `npm run build` + `npx vite preview --port 4173`. 사용: node tools/qa/lang-observe.cjs [en|ko] [출력 폴더]
// 글자 점검: 각 장면의 화면 글에서 한글이 남은 줄을 TXT로 남긴다(영어 미번역 자리 확인용 — 실패가 아니다).
const fs = require('fs');
const { chromium } = require('playwright');
const BASE = process.env.OBSERVE_URL || 'http://localhost:4173/';
(async () => {
  const lang = process.argv[2] || 'en';
  const dir = process.argv[3] || `production/qa/evidence/${new Date().toISOString().slice(0, 10)}-lang`;
  fs.mkdirSync(dir, { recursive: true });
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const errs = [];
  // 장면마다 새 탭을 열 수 있게 (D-673: 한 탭에서 열 번 넘게 다시 읽으면 DPR 2.625 렌더러가 죽는다)
  const open = async () => {
    const p = await br.newPage({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
    p.on('pageerror', (e) => errs.push(e.message));
    p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    return p;
  };
  let pg = await open();
  const wait = (ms = 500) => pg.waitForTimeout(ms);
  const notes = [];
  const shot = async (n) => {
    await pg.screenshot({ path: `${dir}/${lang}-${n}.png` });
    const ko = await pg.evaluate(() => [...new Set(document.body.innerText.split('\n').map((s) => s.trim()).filter((s) => /[가-힣]/.test(s)))]);
    notes.push(`## ${n}\n${ko.length ? ko.map((s) => `- ${s}`).join('\n') : '(한글 없음)'}`);
  };
  const q = `?lang=${lang}`;
  // 타이틀 (처음 온 사람)
  await pg.goto(BASE + q); await pg.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await pg.reload();
  await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 }); await wait(1500);
  await shot('1-title');
  // 메인 메뉴 (프롤로그를 본 사람)
  await pg.evaluate(() => { localStorage.setItem('pawnisher.slice.meta', JSON.stringify({ prologue: true, onboarded: true, tut: ['battle', 'battle-a', 'map', 'recruit', 'kit', 'promote', 'first_shop'] })); sessionStorage.setItem('op-menu', '1'); });
  await pg.reload(); await pg.waitForSelector('.op-menu:not([hidden]) [data-ship]', { timeout: 30000 }); await wait(1000);
  await shot('2-menu');
  // 설정: 소리 탭 → 게임 탭(언어 줄)
  await pg.tap('[data-settings]'); await wait(700);
  await shot('3-settings-sound');
  await pg.tap('[data-set-tab="game"]'); await wait(500);
  await shot('4-settings-game');
  const langRow = await pg.$$eval('[data-lang]', (b) => b.map((x) => `${x.dataset.lang}:${x.getAttribute('aria-pressed')}`));
  console.log('LANG_ROW', langRow.join(' '));
  // 설정에서 다른 언어를 누르면 다시 읽고 그 언어로 (전환 확인)
  const other = lang === 'en' ? 'ko' : 'en';
  if (langRow.length) {
    await Promise.all([pg.waitForNavigation({ timeout: 30000 }), pg.tap(`[data-lang="${other}"]`)]);
    await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 }); await wait(1200);
    console.log('AFTER_SWITCH', await pg.evaluate(() => ({ url: location.search, html: document.documentElement.lang, stored: localStorage.getItem('pawnisher.lang') })));
    await shot(`5-switched-to-${other}`);
  }
  // 대국 HUD (?debug 직행)
  await pg.close(); pg = await open();
  await pg.goto(BASE + `?debug&lang=${lang}`); await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 }); await wait(300);
  const sk = await pg.$('.stagefx'); if (sk) { await sk.click(); await wait(500); }
  await pg.evaluate(() => window.sliceApi.startAt(1, 'battle')); await wait(2500);
  const sk2 = await pg.$('.stagefx'); if (sk2) { await sk2.click(); await wait(800); }
  await shot('6-battle-hud');
  // 메뉴(멈춤) 창
  await pg.tap('#btn-menu'); await wait(700);
  await shot('7-pause');
  // 둘째 묶음 (D-671): 지도 · 고물상 · 작업대 · 보상 · 사건 · 용어 사전 — 장면마다 새로 읽고 debug 손잡이로 연다
  const META = JSON.stringify({ tut: ['battle', 'battle-a', 'map', 'recruit', 'kit', 'promote', 'first_shop'], runs: 3, prologue: true, onboarded: true });
  const scene = async (n, fn, after) => {
    await pg.close(); pg = await open();
    await pg.goto(BASE + `?debug&lang=${lang}`); await pg.evaluate((m) => localStorage.setItem('pawnisher.slice.meta', m), META);
    await pg.goto(BASE + `?debug&lang=${lang}`); await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 }); await wait(1500);
    const s0 = await pg.$('.stagefx'); if (s0) { await s0.click(); await wait(500); }
    await pg.evaluate(fn); await wait(2600);
    if (after) await after();
    await shot(n);
  };
  await scene('8-map', () => window.sliceApi.map(2), async () => { await pg.click('.mnd.now').catch(() => {}); await wait(600); });
  await scene('9-map-roster', () => { const a = window.sliceApi; a.richRun(); a.map(2); }, async () => { await pg.click('.mr-slot >> nth=1').catch(() => {}); await wait(600); });
  await scene('10-shop', () => { window.sliceApi.gold(40); window.sliceApi.shop(); }, async () => { await pg.locator('[data-slot]').first().click({ force: true }).catch(() => {}); await wait(400); });
  await scene('11-forge', () => window.sliceApi.forge());
  await scene('12-repair', () => { const a = window.sliceApi; a.richRun(); a.hurt(0.5); a.forge(); }, async () => { await pg.click('[data-slot="repair"]').catch(() => {}); await wait(500); });
  await scene('13-reward', async () => { window.sliceApi.startAt(1, 'battle'); await new Promise((r) => setTimeout(r, 2400)); window.slice().s.winner = 0; window.sliceApi.finish(); }, async () => { await wait(2500); });
  await scene('14-event', () => { window.sliceApi.gold(200); window.sliceApi.event('tinker'); }, async () => { await pg.click(".choice[data-slot='1']").catch(() => {}); await wait(1200); });
  await scene('15-dict', async () => { window.sliceApi.startAt(1, 'battle'); await new Promise((r) => setTimeout(r, 2400)); window.sliceApi.help('dict'); }, async () => { await wait(600); });
  await scene('16-deck', () => window.sliceApi.deckView('view'));
  fs.writeFileSync(`${dir}/${lang}-hangul-left.md`, `# 화면에 남은 한글 (${lang}) — 미번역 자리\n\n${notes.join('\n\n')}\n`);
  console.log('ERRORS', errs.length ? errs.join(' | ') : 'none');
  await br.close();
})();
