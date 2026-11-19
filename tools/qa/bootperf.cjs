// 부팅 성능 측정 (D-593): 콜드 스타트 → 타이틀 → 메뉴 펼침을 CPU ×4 감속(중급 안드로이드)에서 잰다.
// 긴 작업(>50ms) 수 · 총 막힘 시간(TBT) · 구간별 끊긴 프레임(rAF 간격 > 25ms) · 타이틀 조작 가능 시각, CDP 추적으로 긴 작업 속을 나눈다.
// 미리 `npm run build` · `npx vite preview --port 4321`. 사용:
//   node tools/qa/bootperf.cjs [--url http://localhost:4321/] [--tag before] [--out <폴더>] [--cpu 4] [--runs 3] [--small]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('--url', 'http://localhost:4321/');
const TAG = opt('--tag', 'after');
const OUT = opt('--out', 'production/qa/evidence/bootperf');
const CPU = Number(opt('--cpu', 4));
const RUNS = Number(opt('--runs', 3));
const small = args.includes('--small');
const [W, H] = small ? [667, 375] : [915, 412];
const DPR = small ? 2 : 2.625;

/** 페이지에 심는 기록기: 긴 작업 · 매 프레임 시각 · 화면 사건 시각 */
const PROBE = () => {
  const P = (window.__bp = { lt: [], fr: [], ev: {} });
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => P.lt.push([e.startTime, e.duration]))).observe({ type: 'longtask', buffered: true }); } catch {}
  const loop = (t) => { P.fr.push(t); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  const mark = (k) => { if (!(k in P.ev)) P.ev[k] = performance.now(); };
  new MutationObserver(() => {
    if (document.querySelector('#boot')) mark('bootShown');
    else if ('bootShown' in P.ev) mark('bootGone');
    if (document.querySelector('.opening')) mark('title');
    const nav = document.querySelector('.op-menu');
    if (nav && !nav.hidden && nav.querySelector('button')) mark('menu');
  }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
};

const win = (fr, a, b) => {
  const f = fr.filter((t) => t >= a && t <= b);
  const g = f.slice(1).map((t, i) => t - f[i]);
  const dropped = g.reduce((s, x) => s + Math.max(0, Math.round(x / 16.67) - 1), 0);
  return { frames: f.length, dropped, worstMs: Math.round(Math.max(0, ...g)), over50: g.filter((x) => x > 50).length };
};
const lts = (lt, a, b) => {
  const l = lt.filter(([s]) => s >= a && s <= b);
  return { n: l.length, tbt: Math.round(l.reduce((s, [, d]) => s + Math.max(0, d - 50), 0)), max: Math.round(Math.max(0, ...l.map(([, d]) => d))) };
};

/** 추적에서 긴 작업(>50ms) 안 자식 사건을 이름별로 합친다 */
const traceBreakdown = (events) => {
  const main = events.filter((e) => e.name === 'RunTask' && e.dur > 50000);
  const tid = (() => { const c = {}; main.forEach((e) => (c[`${e.pid}:${e.tid}`] = (c[`${e.pid}:${e.tid}`] || 0) + e.dur)); return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0]; })();
  const tasks = main.filter((e) => `${e.pid}:${e.tid}` === tid);
  const kids = events.filter((e) => e.ph === 'X' && `${e.pid}:${e.tid}` === tid && e.name !== 'RunTask');
  const sum = {};
  const t0 = Math.min(...events.filter((e) => e.ph === 'X' && `${e.pid}:${e.tid}` === tid).map((e) => e.ts));
  const top = tasks.map((t) => {
    const inside = kids.filter((k) => k.ts >= t.ts && k.ts + (k.dur || 0) <= t.ts + t.dur);
    // 바로 아래 자식만 (겹친 것 빼고)
    const direct = inside.filter((k) => !inside.some((o) => o !== k && o.ts <= k.ts && o.ts + o.dur >= k.ts + k.dur && o.dur > k.dur));
    const by = {};
    for (const k of direct) {
      const u = k.args?.data?.url || k.args?.data?.stackTrace?.[0]?.url || k.args?.data?.functionName || '';
      const nm = `${k.name}${u ? ' ' + String(u).replace(/^.*\//, '').slice(0, 40) : ''}`;
      by[nm] = (by[nm] || 0) + k.dur / 1000;
      sum[k.name] = (sum[k.name] || 0) + k.dur / 1000;
    }
    return { at: Math.round((t.ts - t0) / 1000), ms: Math.round(t.dur / 1000), parts: Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k}:${Math.round(v)}`) };
  });
  return { tasks: top, byName: Object.fromEntries(Object.entries(sum).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => [k, Math.round(v)])) };
};

const once = async (br, i, trace) => {
  const ctx = await br.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('pawnisher.slice.meta', JSON.stringify({ prologue: true, runs: 1 })); } catch {} });
  await ctx.addInitScript(PROBE);
  const pg = await ctx.newPage();
  const cdp = await ctx.newCDPSession(pg);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const evs = [];
  if (trace) {
    cdp.on('Tracing.dataCollected', (d) => evs.push(...d.value));
    await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,v8.execute,blink.user_timing', transferMode: 'ReportEvents' });
  }
  await pg.goto(BASE);
  await pg.waitForSelector('.opening', { timeout: 30000 });
  await pg.waitForTimeout(3500); // 타이틀 베기 연출
  const tTap = await pg.evaluate(() => performance.now());
  await pg.locator('.opening').tap({ position: { x: Math.round(W / 2), y: Math.round(H * 0.8) } });
  await pg.waitForSelector('.op-menu button', { timeout: 10000 });
  await pg.waitForTimeout(1200);
  if (i === 0) await pg.screenshot({ path: path.join(OUT, `title-menu-${TAG}${small ? '-small' : ''}.png`) });
  const P = await pg.evaluate(() => window.__bp);
  let br2 = null;
  if (trace) {
    const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
    await cdp.send('Tracing.end');
    await done;
    br2 = traceBreakdown(evs);
    if (args.includes('--save-trace')) fs.writeFileSync(path.join(OUT, `trace-${TAG}.json`), JSON.stringify(evs));
  }
  await ctx.close();
  const e = P.ev;
  const t1 = e.title ?? 0;
  return {
    titleAt: Math.round(t1), bootGoneAt: Math.round(e.bootGone ?? 0), menuAt: Math.round((e.menu ?? 0) - tTap),
    boot: { ...win(P.fr, 0, e.bootGone ?? t1), ...lts(P.lt, 0, e.bootGone ?? t1) },
    burst: { ...win(P.fr, t1, t1 + 3000), ...lts(P.lt, t1, t1 + 3000) },
    menu: { ...win(P.fr, tTap, tTap + 1000), ...lts(P.lt, tTap, tTap + 1000) },
    all: lts(P.lt, 0, 1e9), trace: br2,
    longList: P.lt.map(([a, d]) => [Math.round(a), Math.round(d)]),
  };
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const runs = [];
  for (let i = 0; i < RUNS; i++) runs.push(await once(br, i, i === 0));
  await br.close();
  const med = (f) => { const v = runs.map(f).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
  const row = (k) => ({ dropped: med((r) => r[k].dropped), worstMs: med((r) => r[k].worstMs), longTasks: med((r) => r[k].n), tbt: med((r) => r[k].tbt), maxTask: med((r) => r[k].max) });
  const sum = { tag: TAG, cpu: CPU, viewport: `${W}x${H}@${DPR}`, runs: RUNS, titleAt: med((r) => r.titleAt), menuAt: med((r) => r.menuAt), totalTbt: med((r) => r.all.tbt), totalLong: med((r) => r.all.n), boot: row('boot'), burst: row('burst'), menu: row('menu') };
  fs.writeFileSync(path.join(OUT, `bootperf-${TAG}${small ? '-small' : ''}.json`), JSON.stringify({ sum, runs }, null, 1));
  console.log(JSON.stringify(sum, null, 1));
  console.log(JSON.stringify(runs[0].trace, null, 1).slice(0, 6000));
})();
