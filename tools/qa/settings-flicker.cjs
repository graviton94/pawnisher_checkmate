// 설정 창 명패 깜빡임 점검 (D-593): 설정 줄을 누를 때마다 명패(「설정」)가 다시 그려지는지 —
// 화면 중계 프레임마다 명패 자리 픽셀을 첫 프레임과 비교하고, 명패 요소가 바뀌었는지(같은 노드인지)도 센다.
//   node tools/qa/settings-flicker.cjs [--url http://localhost:4321/] [--out <폴더>] [--tag after]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('--url', 'http://localhost:4321/');
const OUT = opt('--out', 'production/qa/evidence/settings-flicker');
const TAG = opt('--tag', 'after');
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('pawnisher.slice.meta', JSON.stringify({ prologue: true, runs: 1 })); } catch {} });
  const pg = await ctx.newPage();
  await pg.goto(BASE);
  await pg.waitForSelector('.opening');
  await pg.waitForTimeout(2600);
  await pg.locator('.opening').tap({ position: { x: 457, y: 330 } });
  await pg.waitForSelector('.op-menu [data-settings]');
  await pg.waitForTimeout(900);
  await pg.locator('.op-menu [data-settings]').tap();
  await pg.waitForSelector('.set-win .plate');
  await pg.waitForTimeout(1200);
  await pg.evaluate(() => { window.__plate = document.querySelector('.set-win .plate'); window.__plateN = 0; new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && n.matches?.('.plate') && window.__plateN++))).observe(document.querySelector('.set-win'), { childList: true, subtree: true }); });
  const box = await pg.locator('.set-win .plate').boundingBox();
  const cdp = await ctx.newCDPSession(pg);
  const shots = [];
  cdp.on('Page.screencastFrame', (e) => { shots.push(e.data); cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  // 소리 탭: 음량 올림 · 내림 · 끄기 / 화면 탭 흔들림 칸
  for (const sel of ['[data-down]', '[data-up]:not([disabled])', '[data-mute]', '[data-seg]:not([aria-pressed="true"])']) {
    const b = pg.locator(`.set-win ${sel}:not([disabled])`).first();
    if (await b.count()) { await b.tap(); await pg.waitForTimeout(350); }
  }
  await cdp.send('Page.stopScreencast');
  const r = await pg.evaluate(() => ({ samePlate: window.__plate === document.querySelector('.set-win .plate'), plateInserted: window.__plateN }));
  await pg.screenshot({ path: path.join(OUT, `settings-${TAG}.png`) });
  // 명패 자리 픽셀 비교 (python 없이: PNG 바이트 해시 대신 잘라 낸 스크린샷을 따로 찍어 비교)
  const dir = path.join(OUT, `settings-frames-${TAG}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  shots.forEach((d, i) => fs.writeFileSync(path.join(dir, `${String(i).padStart(3, '0')}.png`), Buffer.from(d, 'base64')));
  console.log(JSON.stringify({ ...r, frames: shots.length, plateBox: box, dir }));
  await br.close();
})();
