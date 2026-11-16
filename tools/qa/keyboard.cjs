// 키보드로만 부팅 → 타이틀 → 대국 (D-531). 915×412 · DPR 2.625에서 Playwright 키 누름만 쓴다.
// 사용: OBSERVE_URL=http://localhost:4173/ node tools/qa/keyboard.cjs → production/qa/evidence/<날짜>-kb-*.png
const { chromium } = require('playwright');
const BASE = process.env.OBSERVE_URL || 'http://localhost:4173/';
const day = new Date().toISOString().slice(0, 10);
(async () => {
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const pg = await br.newPage({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
  let errors = 0;
  pg.on('pageerror', (e) => { errors++; console.log('ERR', e.message); });
  const state = () => pg.evaluate(() => {
    const a = document.activeElement;
    let el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    while (el && el.parentElement && el.parentElement !== document.body) el = el.parentElement;
    return { focus: a && a !== document.body ? `${a.tagName.toLowerCase()} ${(a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24)}` : '-', top: el?.id || String(el?.className).split(' ')[0], between: document.body.classList.contains('between') };
  });
  const step = async (name, keys, wait = 700) => {
    for (const k of keys) { await pg.keyboard.press(k); await pg.waitForTimeout(wait); }
    const s = await state();
    console.log(name.padEnd(14), keys.join(' ').padEnd(28), JSON.stringify(s));
    if (name) await pg.screenshot({ path: `production/qa/evidence/${day}-kb-${name}.png` });
    return s;
  };
  await pg.goto(BASE);
  await pg.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await pg.reload();
  await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 });
  await pg.waitForTimeout(1000);
  await step('title', []);
  // 첫 실행: 「누르세요」 → 프롤로그 → 연습 대국 — Enter만으로 넘긴다 (대국 판이 맨 위가 두 번 연속이면 멈춤)
  let s, hits = 0;
  for (let i = 0; i < 40 && hits < 2; i++) {
    s = await step('', ['Enter'], 500);
    hits = s.top === 'app' && !s.between ? hits + 1 : 0;
  }
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(400);
  await step('battle', []);
  await step('battle-card1', ['1']);
  await step('battle-card1-arm', ['1']);
  await step('battle-esc', ['Escape']);
  await step('battle-arrows', ['ArrowRight', 'ArrowDown']);
  await step('battle-end', ['e']);
  await step('battle-end2', ['e'], 2500);
  // 두 번째 실행: 타이틀 → 메뉴 → 방향키 초점 → 안내서 창 → Esc로 닫기
  await pg.reload();
  await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 });
  await pg.waitForTimeout(1000);
  await step('title2', ['Enter'], 900);
  await step('menu', ['ArrowDown']);
  await step('menu-move', ['ArrowDown', 'ArrowDown']);
  await step('menu-right', ['ArrowRight']);
  await step('menu-enter', ['Enter'], 900);
  await step('menu-esc', ['Escape'], 900);
  // 세 번째: 연습이 아닌 1막 대국 (?debug로 바로) — 카드 1 장전(탭 한 번과 같다) → Esc 내려놓기 → E 턴 끝
  await pg.goto(BASE + '?debug');
  await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 });
  await pg.evaluate(() => window.sliceApi.startAt(1, 'battle'));
  await pg.waitForTimeout(1500);
  for (let i = 0; i < 6 && (await state()).top !== 'app'; i++) { await pg.keyboard.press('Enter'); await pg.waitForTimeout(600); }
  await step('b2', []);
  await step('b2-card1', ['1']);
  const armed = await pg.evaluate(() => !!document.querySelector('#hand .hc.armed'));
  await step('b2-esc', ['Escape']);
  const cleared = await pg.evaluate(() => !document.querySelector('#hand .hc.armed'));
  console.log('armed by key', armed, '· cleared by Esc', cleared);
  const t0 = await pg.evaluate(() => window.slice().turn);
  await step('b2-end', ['e'], 1200);
  await step('b2-end2', ['e'], 3500);
  console.log('turn', t0, '→', await pg.evaluate(() => window.slice().turn));
  await pg.waitForTimeout(3000);
  // 네 번째: 가짜 게임패드 (표준 배치) — 십자키로 초점 → A 누름(창 열림) → B 닫기
  await pg.evaluate(() => {
    const pad = { index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    window.__pad = pad;
    navigator.getGamepads = () => [pad];
    window.dispatchEvent(new Event('gamepadconnected'));
  });
  const pad = async (i) => {
    await pg.evaluate((n) => { window.__pad.buttons[n].pressed = true; }, i); await pg.waitForTimeout(120);
    await pg.evaluate((n) => { window.__pad.buttons[n].pressed = false; }, i); await pg.waitForTimeout(500);
  };
  console.log('pad installed', await pg.evaluate(() => navigator.getGamepads().length + ' ' + document.activeElement?.tagName + ' btns ' + document.querySelectorAll('#app button:not(:disabled)').length));
  await pad(13);
  const padFocus = (await state()).focus;
  await pad(0);
  const padOpened = (await state()).top;
  await pg.screenshot({ path: `production/qa/evidence/${day}-kb-pad-a.png` });
  await pad(1);
  console.log('pad: d-pad focus', padFocus, '· A opened', padOpened, '· B back to', (await state()).top);
  // 다섯째: 설정 창(PC 줄 견본) — 방향키 초점 → Esc로 닫기
  await pg.evaluate(() => window.sliceApi.settingsWin(true));
  await pg.waitForTimeout(700);
  await step('settings', ['ArrowDown', 'ArrowDown']);
  await step('settings-esc', ['Escape']);
  console.log('page errors', errors);
  await br.close();
})();
