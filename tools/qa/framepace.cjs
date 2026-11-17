// 프레임 박자 측정 (D-554): 전환 · 컷신 움직임이 화면 프레임마다 바뀌는지(뚝뚝 끊김 없음), 위치가 기기 픽셀 정수인지 잰다.
// 페이지 안에서 requestAnimationFrame마다 지켜볼 요소의 모습(위치 · 크기 · 변환 · 가면 · 캔버스 내용 체크섬)을 적고,
// 바뀐 시각 사이 간격(머문 시간)을 센다. 동시에 CDP 화면 중계로 실제 그려진 프레임을 받아 띠 그림(strip)을 만든다.
// 미리 `npm run build` · `npx vite preview --port 4196`. 사용:
//   node tools/qa/framepace.cjs <intro|boss|screen|window|vn|all> [--url http://localhost:4196/] [--tag after] [--out <폴더>]
// 결과: <폴더>/pace-<tag>.json (장면마다 수치) · <폴더>/strip-<장면>-<tag>/NN.jpg (그려진 프레임)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('--url', process.env.OBSERVE_URL || 'http://localhost:4196/');
const TAG = opt('--tag', 'after');
const OUT = opt('--out', 'production/qa/evidence/framepace');
const which = args.find((a) => !a.startsWith('--') && ![opt('--url'), opt('--tag'), opt('--out')].includes(a)) || 'all';
const small = args.includes('--small');
const [W, H] = small ? [667, 375] : [915, 412];
const DPR = Number(opt('--dpr', small ? 2 : 2.625));

/** 페이지에 심는 측정기 */
const PROBE = () => {
  const sig = (el) => {
    if (el instanceof HTMLCanvasElement) {
      try {
        const g = el.getContext('2d');
        const d = g.getImageData(0, 0, el.width, el.height).data;
        let h = 0;
        for (let i = 0; i < d.length; i += 4 * 7) h = (h * 31 + d[i] + d[i + 1] * 3 + d[i + 3] * 7) | 0;
        return `c${h}`;
      } catch { return 'c?'; }
    }
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const m = cs.maskImage || cs.webkitMaskImage || '';
    return `${r.left.toFixed(3)},${r.top.toFixed(3)},${r.width.toFixed(2)},${r.height.toFixed(2)}|${cs.transform}|${cs.translate}|${m.length}:${m.slice(-40)}|${cs.clipPath}|${cs.visibility}|${cs.backgroundImage.length}`;
  };
  window.__pace = {
    run(sels, ms, posSel) {
      return new Promise((done) => {
        const frames = [];
        const t0 = performance.now();
        const step = (now) => {
          const s = sels.map((q) => [...document.querySelectorAll(q)].map(sig).join('#'));
          const pos = posSel ? [...document.querySelectorAll(posSel)].map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.top]; }) : [];
          frames.push({ t: now - t0, s, pos });
          if (now - t0 < ms) requestAnimationFrame(step);
          else done(frames);
        };
        requestAnimationFrame(step);
      });
    },
  };
};

/** 측정값 요약: 바뀐 프레임 · 머문 시간 · 정수 위치 */
const summarize = (frames, dpr, sels) => {
  const per = {};
  sels.forEach((q, k) => {
    const sub = frames.map((f) => ({ t: f.t, s: f.s[k], pos: [] }));
    const r = one(sub, dpr);
    if (r.changes) per[q] = { changes: r.changes, bursts: r.bursts, maxHoldMs: r.maxHoldMs, holdsOver33: r.holdsOver33 };
  });
  return { ...one(frames.map((f) => ({ ...f, s: f.s.join('|') })), dpr), per };
};
const one = (frames, dpr) => {
  const changes = [];
  for (let i = 1; i < frames.length; i++) if (frames[i].s !== frames[i - 1].s) changes.push(frames[i].t);
  const dts = frames.slice(1).map((f, i) => f.t - frames[i].t);
  const frameMs = dts.length ? dts.sort((a, b) => a - b)[Math.floor(dts.length / 2)] : 16.7;
  // 움직이는 구간 = 바뀜이 이어지는 묶음 (180ms 넘게 멈추면 끊긴 묶음)
  const bursts = [];
  let cur = null;
  for (const t of changes) {
    if (cur && t - cur.end <= 180) (cur.end = t, cur.n++, cur.gaps.push(t - cur.last), (cur.last = t));
    else (cur = { start: t, end: t, last: t, n: 1, gaps: [] }), bursts.push(cur);
  }
  const main = bursts.filter((b) => b.n >= 4);
  const gaps = main.flatMap((b) => b.gaps);
  const held = gaps.filter((g) => g > 34).length;
  let posN = 0, posInt = 0;
  for (const f of frames) for (const [x, y] of f.pos) { posN++; const fx = Math.abs(x * dpr - Math.round(x * dpr)), fy = Math.abs(y * dpr - Math.round(y * dpr)); if (fx < 0.1 && fy < 0.1) posInt++; }
  return {
    frames: frames.length, frameMs: +frameMs.toFixed(1), changes: changes.length,
    bursts: main.map((b) => {
      // 그 구간의 화면 프레임 중 모습이 바뀐 비율 (기계가 느려 프레임이 늦어도 「프레임마다 바뀌나」는 따로 보인다)
      const inb = frames.filter((f) => f.t > b.start && f.t <= b.end).length;
      return { startMs: Math.round(b.start), ms: Math.round(b.end - b.start), changes: b.n, rafFrames: inb, changedPct: Math.round((100 * (b.n - 1)) / Math.max(1, inb)), fps: +((b.n - 1) / Math.max(1e-3, (b.end - b.start) / 1000)).toFixed(1), maxHoldMs: Math.round(Math.max(0, ...b.gaps)) };
    }),
    maxHoldMs: Math.round(Math.max(0, ...gaps)), holdsOver33: held, gapsMeasured: gaps.length,
    intPos: posN ? `${posInt}/${posN}` : 'n/a',
  };
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--disable-gpu-vsync=false'] });
  const ctx = await br.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, hasTouch: true, isMobile: true });
  const pg = await ctx.newPage();
  const errors = [];
  pg.on('pageerror', (e) => errors.push(e.message));
  pg.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await pg.addInitScript(PROBE);
  const boot = async () => {
    await pg.goto(BASE + '?debug');
    await pg.waitForSelector('#boot', { state: 'detached' });
    await pg.waitForTimeout(400);
    const s0 = await pg.$('.stagefx'); if (s0) { await s0.click(); await pg.waitForTimeout(400); }
  };
  const cdp = await ctx.newCDPSession(pg);
  /** 화면 중계로 그려진 프레임 받기 */
  const strip = async (name, fn) => {
    const dir = path.join(OUT, `strip-${name}-${TAG}`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const shots = [];
    const on = (e) => { shots.push({ t: e.metadata.timestamp, data: e.data }); cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }).catch(() => {}); };
    cdp.on('Page.screencastFrame', on);
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 60, maxWidth: 915, maxHeight: 412, everyNthFrame: 1 });
    const r = await fn();
    await cdp.send('Page.stopScreencast');
    cdp.off('Page.screencastFrame', on);
    shots.forEach((s, i) => fs.writeFileSync(path.join(dir, `${String(i).padStart(3, '0')}.jpg`), Buffer.from(s.data, 'base64')));
    const st = shots.map((s) => s.t * 1000);
    const g = st.slice(1).map((t, i) => t - st[i]);
    return { ...r, painted: shots.length, paintedGapMedian: g.length ? +g.sort((a, b) => a - b)[Math.floor(g.length / 2)].toFixed(1) : null, stripDir: dir };
  };
  const measure = (sels, ms, pos) => pg.evaluate(([s, m, p]) => window.__pace.run(s, m, p), [sels, ms, pos]).then((f) => summarize(f, DPR, sels));
  const tap = () => pg.locator('.prologue').tap({ position: { x: Math.round(W / 2), y: Math.round(H * 0.35) } }).catch(() => {});

  const S = {
    intro: async () => {
      await boot();
      await pg.evaluate(() => { void window.sliceApi.pro(); });
      return measure(['.film-wipe', '.pl-stage img[data-film]', '.film-title', '.film-title > *', '.film-lb', '.vn-actor'], 5200, '.pl-stage img[data-film]');
    },
    boss: async () => {
      await boot();
      await pg.evaluate(() => { window.sliceApi.campaign(0); });
      await pg.waitForTimeout(600);
      await pg.evaluate(() => { void window.sliceApi.bossIntroOf('plate'); });
      await pg.waitForSelector('.bossfx', { timeout: 8000 });
      return measure(['.bossfx .bf-port', '.bossfx .bf-bar', '.bossfx .bf-name', '.bossfx .bf-board'], 1800, null);
    },
    screen: async () => {
      await boot();
      await pg.evaluate(() => { window.sliceApi.campaign(0); });
      await pg.waitForTimeout(800);
      await pg.evaluate(() => { window.sliceApi.map(2); });
      await pg.waitForTimeout(1200);
      await pg.evaluate(() => { void window.sliceApi.enter('shop'); });
      return measure(['.shutterfx .shut'], 1400, '.shutterfx .shut');
    },
    window: async () => {
      await boot();
      await pg.evaluate(() => { window.sliceApi.win('m'); });
      return measure(['#overlay-panel', '#overlay'], 900, null);
    },
    vn: async () => {
      await boot();
      const has = await pg.evaluate(() => typeof window.sliceApi.vnCut === 'function');
      if (has) await pg.evaluate(() => { void window.sliceApi.vnCut('상자 안의 다툼'); });
      else {
        // 옛 빌드: 프롤로그를 넘겨 「상자 안의 다툼」 첫 대사까지
        await pg.evaluate(() => { void window.sliceApi.pro(); });
        for (let k = 0; k < 40; k++) {
          await pg.waitForTimeout(900);
          if (await pg.locator('.cut-who .cw-name', { hasText: '흰 퀸' }).count()) break;
          await tap();
        }
      }
      await pg.waitForSelector('.cut-who', { timeout: 15000 }).catch(() => {});
      return measure(['.vn-actor', '.pl-stage img[data-film]', '.cut-who', '.film-wipe'], 2400, '.pl-stage img[data-film], .vn-actor');
    },
  };
  const list = which === 'all' ? Object.keys(S) : which.split(',');
  const res = {};
  for (const k of list) {
    try { res[k] = await strip(k, S[k]); } catch (e) { res[k] = { error: String(e) }; }
    console.log(k, JSON.stringify(res[k]));
  }
  res.errors = errors;
  const file = path.join(OUT, `pace-${TAG}.json`);
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  fs.writeFileSync(file, JSON.stringify({ ...prev, ...res }, null, 1));
  console.log('errors', errors.length, errors.slice(0, 5));
  await br.close();
})();
