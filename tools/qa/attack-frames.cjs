// 공격 하나의 끊김 측정 (D-680): 나이트가 내려앉아 폰을 처치하는 한 수를 CPU ×N · 915×412 · DPR 2.625(GPU 합성 길)에서 둔다.
// rAF 프레임 간격(가장 긴 프레임 · 50ms 넘는 프레임 · 그 시각) + (선택) CPU 프로파일 + 화면 중계 프레임(띠 그림 재료).
// 미리 `npm run build` · `npx vite preview --port 4391`. 사용:
//   node tools/qa/attack-frames.cjs --url http://localhost:4391/ --tag after [--cpu 4] [--prof] [--strip <프레임 폴더>] [--runs 3] [--dpr 2.625] [--out <폴더>]
const { chromium } = require(process.env.PW_PATH || 'playwright');
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('--url', 'http://localhost:4391/');
const TAG = opt('--tag', 'x');
const CPU = Number(opt('--cpu', 4));
const STRIP = opt('--strip', '');
const RUNS = Number(opt('--runs', 3));
const DPR = Number(opt('--dpr', 2.625));
const OUT = opt('--out', 'production/qa/evidence');
const META = { tut: ['battle', 'battle-a', 'map', 'recruit', 'kit', 'promote', 'first_shop', 'heat', 'event'], runs: 3, prologue: true, ascOpen: 5, storyCleared: 1, daily: {}, onboarded: true, termsNew: [] };

(async () => {
  const gpu = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];
  const br = await chromium.launch({ args: gpu });
  const ctx = await br.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: DPR, hasTouch: true, isMobile: true });
  const pg = await ctx.newPage();
  const errors = [];
  pg.on('pageerror', (e) => errors.push(e.message));
  const cdp = await ctx.newCDPSession(pg);
  await pg.goto(BASE + '?debug');
  await pg.evaluate((m) => { localStorage.clear(); localStorage.setItem('pawnisher.slice.meta', m); }, JSON.stringify(META));
  const results = [];
  for (let run = 0; run < RUNS; run++) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await pg.goto(BASE + '?debug');
    await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 });
    await pg.evaluate(() => window.sliceApi.campaign(0));
    await pg.waitForTimeout(800);
    await pg.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    await pg.evaluate(() => window.sliceApi.startAt(1, 'battle'));
    await pg.waitForTimeout(3500);
    // 나이트가 (2,2)에 내려앉아 (3,4) 폰을 친다 — 그 폰만 HP 1 (처치)
    await pg.evaluate(() => {
      const b = window.slice();
      for (const p of b.s.pieces) if (p.side === 1 && p.type === 'P' && p.x === 3 && p.y === 4) p.hp = 1;
      b.hand = ['leap', 'advance', 'advance', 'order', 'advance'];
      window.sliceApi.redraw();
      window.__pace = []; window.__fxlog = [];
    });
    await pg.waitForTimeout(600);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    const shots = [];
    const onShot = (e) => { shots.push({ t: e.metadata.timestamp, data: e.data }); cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }).catch(() => {}); };
    if (STRIP && run === 0) { cdp.on('Page.screencastFrame', onShot); await cdp.send('Page.startScreencast', { format: 'png', maxWidth: 915 * 2, maxHeight: 412 * 2, everyNthFrame: 1 }); }
    if (args.includes('--prof') && run === 0) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start'); }
    const t0 = Date.now() / 1000;
    const r = await pg.evaluate(async () => {
      const frames = [];
      let on = true;
      const step = (now) => { frames.push(now); if (on) requestAnimationFrame(step); };
      requestAnimationFrame(step);
      const h0 = performance.now();
      const card = await window.sliceApi.botMove('greedy');
      const h1 = performance.now();
      await new Promise((r) => setTimeout(r, 300));
      on = false;
      const dts = frames.slice(1).map((f, i) => f - frames[i]).filter((_, i) => frames[i + 1] <= h1 + 300);
      const heap = performance.memory ? performance.memory.usedJSHeapSize : 0;
      return { card, ms: Math.round(h1 - h0), frames: dts.length, longest: Math.round(Math.max(...dts)), over34: dts.filter((d) => d > 34).length, over50: dts.filter((d) => d > 50).length, avgFps: +(dts.length / ((h1 + 300 - h0) / 1000)).toFixed(1), dts: dts.map((d) => Math.round(d)), long: frames.slice(1).map((f, i) => [Math.round(frames[i] - h0), Math.round(f - frames[i])]).filter(([, d]) => d > 50), h1: Math.round(h1 - h0), pace: window.__pace, fx: window.__fxlog, heap };
    });
    if (args.includes('--prof') && run === 0) {
      const { profile } = await cdp.send('Profiler.stop');
      fs.writeFileSync(path.join(OUT, `prof-${TAG}.cpuprofile`), JSON.stringify(profile));
    }
    if (STRIP && run === 0) {
      await cdp.send('Page.stopScreencast'); cdp.off('Page.screencastFrame', onShot);
      fs.rmSync(STRIP, { recursive: true, force: true }); fs.mkdirSync(STRIP, { recursive: true });
      shots.forEach((s, i) => fs.writeFileSync(path.join(STRIP, `${String(i).padStart(3, '0')}-${Math.round((s.t - t0) * 1000)}.png`), Buffer.from(s.data, 'base64')));
    }
    const won = await pg.evaluate(() => window.slice().s.pieces.filter((p) => p.side === 1).length);
    results.push({ ...r, foesLeft: won });
    console.log(TAG, run, JSON.stringify({ card: r.card, ms: r.ms, frames: r.frames, avgFps: r.avgFps, longest: r.longest, over34: r.over34, over50: r.over50, foesLeft: won }));
  }
  fs.writeFileSync(path.join(OUT, `atk-${TAG}.json`), JSON.stringify({ results, errors }, null, 1));
  console.log('errors', errors.slice(0, 5));
  await br.close();
})();
