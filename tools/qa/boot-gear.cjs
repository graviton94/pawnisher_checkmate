// 부팅 톱니가 메인 스레드가 막혀도 도는지 (D-593): CPU ×4 감속 콜드 스타트 동안 화면 중계 프레임에서 톱니 자리만 잘라
// 바뀐 시각 사이 최대 간격(ms)을 잰다. 톱니 한 칸 = 100ms — 합성기 애니메이션이면 최대 간격이 ~100~200ms에 머문다.
//   node tools/qa/boot-gear.cjs [--url http://localhost:4321/] [--tag after] [--out <폴더>]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('--url', 'http://localhost:4321/');
const TAG = opt('--tag', 'after');
const OUT = opt('--out', 'production/qa/evidence/bootperf');
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const pg = await ctx.newPage();
  const cdp = await ctx.newCDPSession(pg);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const shots = [];
  cdp.on('Page.screencastFrame', (e) => { shots.push({ t: e.metadata.timestamp * 1000, d: e.data }); cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }).catch(() => {}); });
  // 톱니 자리: 문서가 서자마자 잰다 (옛 빌드는 부팅 화면이 금방 걷혀 나중에 찾으면 없다)
  await ctx.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const g = document.querySelector('#boot .boot-gear'); if (g) { const r = g.getBoundingClientRect(); window.__gear = { x: r.left, y: r.top, w: r.width, h: r.height }; } }));
  await pg.goto('about:blank');
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 });
  const nav = pg.goto(BASE);
  await nav;
  await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 });
  const box = await pg.evaluate(() => window.__gear);
  await cdp.send('Page.stopScreencast');
  await br.close();
  const dir = path.join(OUT, `gear-${TAG}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  shots.forEach((s, i) => fs.writeFileSync(path.join(dir, `${String(i).padStart(3, '0')}_${Math.round(s.t - shots[0].t)}.jpg`), Buffer.from(s.d, 'base64')));
  fs.writeFileSync(path.join(dir, 'box.json'), JSON.stringify(box));
  console.log(JSON.stringify({ frames: shots.length, box, dir }));
})();
