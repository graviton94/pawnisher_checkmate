// 본편(리뉴얼판, index.html) 실화면 확인 — 모바일 가로 915×412 · DPR 2.625 · 터치.
// 미리 `npm run build`와 `npx vite preview --port 4173`. 결과: production/qa/evidence/<날짜>-slice-<장면>.png
// 사용: node tools/slice-observe.cjs <title|menu|continue|event:<사건 id>|backlash|map|shop|forge> (menu = 메인 메뉴 · 출하 준비 창, D-539)
const { chromium } = require('playwright');
const BASE = process.env.OBSERVE_URL || 'http://localhost:4173/';
const day = new Date().toISOString().slice(0, 10);
(async () => {
  const sc = process.argv[2] || 'title';
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  // D-429: 대표 규격 네 개만 기본 검수한다. 임의 크기는 문제 재현 때만 사용한다.
  const presets = { 'small-mobile': [667, 375, 2.625], mobile: [915, 412, 2.625], tablet: [1024, 768, 2], pc: [1280, 720, 1] };
  const preset = presets[process.env.OBSERVE_PRESET || 'mobile'];
  if (!preset) throw new Error('OBSERVE_PRESET: small-mobile | mobile | tablet | pc');
  const width = Number(process.env.OBSERVE_WIDTH || preset[0]), height = Number(process.env.OBSERVE_HEIGHT || preset[1]);
  const suffix = width === 915 && height === 412 ? '' : `-${width}x${height}`;
  const pg = await br.newPage({ viewport: { width, height }, deviceScaleFactor: Number(process.env.OBSERVE_DPR || preset[2]), hasTouch: true, isMobile: width < 1024 });
  pg.on('pageerror', (e) => console.log('ERR', e.message));
  const shot = (n) => pg.screenshot({ path: `production/qa/evidence/${day}-slice-${n}${suffix}.png` });
  const skip = async () => { const s = await pg.$('.stagefx'); if (s) { await s.click(); await pg.waitForTimeout(500); } };
  if (sc === 'title' || sc === 'continue' || sc === 'menu') {
    await pg.goto(BASE); await pg.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await pg.reload();
    await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 }); await pg.waitForTimeout(1200);
    await shot('title');
    if (sc !== 'title') {
      // 메인 메뉴 (D-539 단추 다섯): 프롤로그를 본 사람 + 처음 화면 메뉴 표시를 심고 다시 연다
      const toMenu = async () => {
        await pg.evaluate(() => { const m = JSON.parse(localStorage.getItem('pawnisher.slice.meta') || '{}'); localStorage.setItem('pawnisher.slice.meta', JSON.stringify({ ...m, prologue: true, onboarded: true, tut: ['battle', 'battle-a', 'map', 'recruit', 'kit', 'promote', 'first_shop'] })); sessionStorage.setItem('op-menu', '1'); });
        await pg.reload(); await pg.waitForSelector('.op-menu:not([hidden]) [data-ship]', { timeout: 30000 }); await pg.waitForTimeout(900);
      };
      await toMenu(); await shot('menu');
      // 「출하」 → 출하 준비 창 → 「출하한다」 (시작 세트 화면은 첫 받침을 두 번)
      await pg.tap('.op-menu [data-ship]'); await pg.waitForSelector('.su-win [data-su-go]'); await pg.waitForTimeout(600); await shot('menu-setup');
      if (sc === 'continue') {
        await pg.tap('.su-win [data-su-go]'); await pg.waitForTimeout(1500);
        for (let i = 0; i < 2; i++) { const set = await pg.$('#overlay-panel [data-slot]:not([disabled]), #overlay-panel .start-set:not([disabled])'); if (set) { await set.tap(); await pg.waitForTimeout(600); } }
        await pg.waitForFunction(() => !!localStorage.getItem('pawnisher.slice.save'), null, { timeout: 30000 }); await pg.waitForTimeout(1500); await skip();
        await toMenu(); await shot('title-continue');
        await pg.tap('.op-menu [data-cont]'); await pg.waitForTimeout(2500); await shot('continued');
      }
    }
  } else {
    await pg.goto(BASE + '?debug'); await pg.waitForSelector('#boot', { state: 'detached' }); await pg.waitForTimeout(200); await skip();
    const A = (fn, arg) => pg.evaluate(fn, arg);
    if (sc === 'scene-input') await require('./qa/scene-input.cjs')(pg, shot);
    else if (sc === 'illustrations') await require('./qa/illustrations.cjs')(pg, shot);
    else if (sc === 'part-rules') await require('./qa/part-rules.cjs')(pg, shot);
    else if (sc === 'content-states') await require('./qa/content-states.cjs')(pg, shot);
    else if (sc === 'builds-complete') await require('./qa/build-completion.cjs')(pg, shot);
    else if (sc === 'builds') await require('./qa/build-prototype.cjs')(pg, shot);
    else if (sc === 'event-layout') await require('./qa/event-layout.cjs')(pg, shot);
    else if (sc === 'end-scenes') await require('./qa/end-scenes.cjs')(pg, shot);
    else if (sc === 'unit-info') await require('./qa/unit-info.cjs')(pg, shot);
    else if (sc === 'ability-info') await require('./qa/ability-info.cjs')(pg, shot);
    else if (sc === 'boss2x2') await require('./qa/boss2x2.cjs')(pg, shot);
    else if (sc === 'raid') await require('./qa/raid.cjs')(pg, shot);
    else if (sc === 'settings') await require('./qa/settings.cjs')(pg, shot);
    else if (sc === 'sfx') await require('./qa/sfx-check.cjs')(pg, shot);
    else if (sc === 'music') await require('./qa/music-check.cjs')(pg, shot);
    else if (sc === 'anchor') await require('./qa/anchor.cjs')(pg, shot);
    else if (sc === 'gbharmony') await require('./qa/gbharmony.cjs')(pg, shot);
    else if (sc === 'gbfit') await require('./qa/gbfit.cjs')(pg, shot);
    else if (sc === 'card-text') await require('./qa/card-text.cjs')(pg, (n) => pg.screenshot({ path: `production/qa/evidence/2026-11-15-cardtext-${n}${suffix}.png` }));
    else if (sc.startsWith('event:')) { await A((id) => { window.sliceApi.gold(50); window.sliceApi.event(id); }, sc.slice(6)); }
    else if (sc === 'map') await A(() => window.sliceApi.map(2));
    else if (sc === 'shop') await A(() => { window.sliceApi.gold(120); window.sliceApi.shop(); });
    else if (sc === 'forge') await A(() => window.sliceApi.forge());
    else if (sc === 'traits') await A(() => window.sliceApi.startAt(2, 'battle'));
    else if (sc === 'boss3') await A(() => window.sliceApi.startAt(3, 'boss'));
    await pg.waitForTimeout(600);
    await shot(sc.replace(':', '-'));
  }
  await br.close();
})();
