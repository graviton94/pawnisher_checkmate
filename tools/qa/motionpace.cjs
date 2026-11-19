// 움직임 박자 측정 (D-595 — D-554 framepace를 넓혔다): 등급 띠 · 등급 드러내기 · 화면 전환 · 반장 등장 번쩍임 · 맞음 번쩍임을
// CPU 느리게(기본 ×4, CDP Emulation.setCPUThrottlingRate) · 915×412 DPR 2.625에서 잰다.
// rAF마다 ① 프레임 간격(평균 fps · 가장 긴 프레임 · 34ms/50ms 넘는 프레임 수) ② 지켜볼 요소(그리고 ::before · ::after)의 모습이
// 바뀐 프레임 비율(= 프레임마다 움직이나, 계단이나)을 적고, CDP 화면 중계로 그려진 프레임을 받아 띠 그림을 남긴다.
// 미리 `npm run build` · `npx vite preview --port 4355`. 사용:
//   node tools/qa/motionpace.cjs <reveal|sweep|screen|boss|board|hit|all> [--url http://localhost:4355/] [--tag after] [--out <폴더>] [--cpu 4] [--light] [--q boardscale=2 | boardres=sharp|fast] [--boss plate|inspect|magnet|alarm…] [--early]
// 결과: <폴더>/motion-<tag>.json · <폴더>/strip-<장면>-<tag>/NNN.jpg
const { chromium } = require(process.env.PW_PATH || 'playwright');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('--url', 'http://localhost:4355/');
const TAG = opt('--tag', 'after');
const OUT = opt('--out', 'production/qa/evidence/motionpace');
const CPU = Number(opt('--cpu', 4));
const W = Number(opt('--w', 915)), H = Number(opt('--h', 412)), DPR = Number(opt('--dpr', 2.625));
const LIGHT = args.includes('--light');
const Q = opt('--q', '');
/** boss 장면의 반장 (D-647: 새 등장 효과 셋 — inspect · magnet · alarm) */
const BOSS = opt('--boss', 'plate');
const which = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) || 'all';

/** 페이지에 심는 측정기: rAF마다 모습 서명 + 프레임 시각 */
const PROBE = () => {
  const sig = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const m = cs.maskImage || cs.webkitMaskImage || '';
    let s = `${r.left.toFixed(2)},${r.top.toFixed(2)},${r.width.toFixed(1)},${r.height.toFixed(1)}|${cs.transform}|${cs.translate}|${cs.scale}|${m.length}:${m.slice(-24)}|${cs.visibility}|${cs.backgroundPosition}|${cs.clipPath.slice(0, 40)}`;
    for (const p of ['::before', '::after']) {
      const q = getComputedStyle(el, p);
      if (q.content && q.content !== 'none') s += `|${p}${q.backgroundPosition}${q.transform}${q.visibility}`;
    }
    if (el instanceof HTMLCanvasElement) {
      try {
        const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
        let h = 0;
        for (let i = 0; i < d.length; i += 4 * 13) h = (h * 31 + d[i] + d[i + 3] * 7) | 0;
        s += `|c${h}`;
      } catch { /* */ }
    }
    return s;
  };
  window.__mp = {
    run(sels, ms) {
      return new Promise((done) => {
        const frames = [];
        const t0 = performance.now();
        const step = (now) => {
          frames.push({ t: now - t0, s: sels.map((q) => [...document.querySelectorAll(q)].slice(0, 8).map(sig).join('#')) });
          if (now - t0 < ms) requestAnimationFrame(step);
          else done(frames);
        };
        requestAnimationFrame(step);
      });
    },
  };
};

/** 요약: 프레임 간격 + 선택자마다 바뀐 프레임 */
const summarize = (frames, sels) => {
  const dts = frames.slice(1).map((f, i) => f.t - frames[i].t);
  const span = frames.length > 1 ? frames[frames.length - 1].t - frames[0].t : 1;
  const per = {};
  sels.forEach((q, k) => {
    const ch = [];
    for (let i = 1; i < frames.length; i++) if (frames[i].s[k] !== frames[i - 1].s[k]) ch.push(i);
    if (ch.length < 2) return;
    // 움직이는 구간 = 바뀜이 이어지는 묶음 (250ms 넘게 멈추면 끊긴 묶음)
    const bursts = [];
    let cur = null;
    for (const i of ch) {
      const t = frames[i].t;
      if (cur && t - frames[cur.last].t <= 250) (cur.gaps.push(t - frames[cur.last].t), (cur.last = i), cur.n++);
      else (cur = { first: i, last: i, n: 1, gaps: [] }), bursts.push(cur);
    }
    const main = bursts.filter((b) => b.n >= 3);
    if (!main.length) return;
    const raf = main.reduce((a, b) => a + (b.last - b.first), 0);
    const chg = main.reduce((a, b) => a + b.n - 1, 0);
    const gaps = main.flatMap((b) => b.gaps);
    const ms = main.reduce((a, b) => a + frames[b.last].t - frames[b.first].t, 0);
    per[q] = { bursts: main.length, ms: Math.round(ms), changes: chg, changedPct: Math.round((100 * chg) / Math.max(1, raf)), motionFps: +(chg / Math.max(1e-3, ms / 1000)).toFixed(1), maxHoldMs: Math.round(Math.max(0, ...gaps)) };
  });
  return {
    frames: frames.length, avgFps: +((frames.length - 1) / (span / 1000)).toFixed(1),
    longestMs: Math.round(Math.max(0, ...dts)), over34: dts.filter((d) => d > 34).length, over50: dts.filter((d) => d > 50).length,
    per,
  };
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  // GPU 합성 길(실기기와 같은 짜임 — 주 스레드 · GPU 프로세스 분리). 기본 headless는 소프트웨어 합성이라 WebGL 판 캔버스를 프레임마다 ReadPixels로
  // 되읽어 주 스레드가 그것만으로 꽉 찬다(실기기에 없는 비용). --soft면 그 길로.
  const gpu = args.includes('--soft') ? [] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: gpu });
  const ctx = await br.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, hasTouch: true, isMobile: true });
  const pg = await ctx.newPage();
  const errors = [];
  pg.on('pageerror', (e) => errors.push(e.message));
  pg.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await pg.addInitScript(PROBE);
  const cdp = await ctx.newCDPSession(pg);
  const boot = async () => {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await pg.goto(BASE + '?debug' + (Q ? `&${Q}` : ''));
    await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 });
    await pg.waitForTimeout(500);
    const s0 = await pg.$('.stagefx'); if (s0) { await s0.click(); await pg.waitForTimeout(400); }
    await pg.evaluate(() => window.sliceApi.campaign(0));
    await pg.waitForTimeout(900);
    // 쉬는 틈 미리 받기(warmup.ts)가 끝난 뒤에 잰다 — 첫 1분의 그림 받기와 연출 박자를 섞지 않게 (받기 박자는 따로 본다)
    await pg.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  };
  const throttle = () => cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const strip = async (name, fn) => {
    const dir = path.join(OUT, `strip-${name}-${TAG}`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const shots = [];
    const on = (e) => { shots.push({ t: e.metadata.timestamp, data: e.data }); cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }).catch(() => {}); };
    cdp.on('Page.screencastFrame', on);
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
    mark = 0;
    const r = await fn();
    await cdp.send('Page.stopScreencast');
    cdp.off('Page.screencastFrame', on);
    // 띠 그림은 잰 구간(연출 시작)부터만 — 부팅 · 준비 화면은 뺀다
    const t0 = mark || (shots.length ? shots[0].t : 0);
    const kept = shots.filter((x) => x.t >= t0 - 0.1);
    shots.length = 0; shots.push(...kept);
    shots.forEach((s, i) => fs.writeFileSync(path.join(dir, `${String(i).padStart(3, '0')}-${Math.round((s.t - t0) * 1000)}.jpg`), Buffer.from(s.data, 'base64')));
    const st = shots.map((s) => s.t * 1000);
    const g = st.slice(1).map((t, i) => t - st[i]);
    return { ...r, painted: shots.length, paintedLongestMs: g.length ? Math.round(Math.max(...g)) : null, stripDir: dir };
  };
  // --light: 프레임 시각만 (모습 서명은 getComputedStyle · 캔버스 읽기라 그 자체가 프레임을 먹는다 — fps는 이것으로, 계단 여부는 서명 판으로)
  let mark = 0;
  const measure = (sels0, ms) => {
    mark = Date.now() / 1000; const sels = LIGHT ? [] : sels0; return pg.evaluate(([s, m]) => window.__mp.run(s, m), [sels, ms]).then((f) => summarize(f, sels)); };
  const CARD = '.cf[data-grade]:is(.g-rare, .g-gold)';

  const S = {
    /** 희귀 · 금 카드 드러내기: 부품 고르기(시드 2 = 금 1 · 희귀 2) — 들썩 · 귀퉁이 반짝 · 금빛 번쩍 · 불똥 */
    reveal: async () => {
      await boot();
      await throttle();
      await pg.evaluate(() => { window.sliceApi.seed(2); window.sliceApi.partPick(); });
      return measure([CARD, '.cf > .glint > i', '.fx3-gold', '.fx-flash', '.spk', '.cf-sheen > i'], 1800);
    },
    /** 쉬는 동안 등급 띠 · 금 불꽃 · 창 불티 (드러내기가 끝난 뒤 한 주기) */
    sweep: async () => {
      await boot();
      await pg.evaluate(() => { window.sliceApi.seed(2); window.sliceApi.partPick(); });
      await pg.waitForTimeout(2200);
      await throttle();
      return measure([CARD, `${CARD} > .cf-win`, '.cf-sheen > i', '.cf-spark'], 3800);
    },
    /** 화면 전환: 지도 → 고물상 (철문 · 디더) */
    screen: async () => {
      await boot();
      await pg.evaluate(() => window.sliceApi.map(2));
      await pg.waitForTimeout(1200);
      await throttle();
      await pg.evaluate(() => { void window.sliceApi.enter('shop'); });
      return measure(['.shutterfx .shut', '.shutterfx', '.wipefx canvas', '#app', 'body'], 1500);
    },
    /** 반장 등장 (흰 장 · 띠 · 초상 · 이름) */
    boss: async () => {
      await boot();
      await pg.evaluate((r) => { void window.sliceApi.bossIntroOf(r); }, BOSS);
      await pg.waitForSelector('.bossfx', { timeout: 8000 });
      await throttle();
      return measure(['.bossfx .bf-port', '.bossfx .bf-bar', '.bossfx .bf-name', '.bossfx .bf-fx canvas', '.fx-flash'], 2600);
    },
    /** 전투 판: 봇이 카드 한 장(이동 · 공격 연출)을 쓰는 동안 — 판 캔버스 채우기 비용 (--q boardscale=2 와 비교) */
    board: async () => {
      await boot();
      // --early: 대국을 세우기 전부터 느리게 — 판 선명도 「자동」 판정(판 세우기 동안 잰다, D-665)이 느린 기기로 보는지
      if (args.includes('--early')) await throttle();
      await pg.evaluate(() => window.sliceApi.startAt(1, 'battle'));
      await pg.waitForTimeout(3000);
      // 자동 판정은 판이 움직이는 프레임만 센다 — 한 수 더 두어 판정을 마치게 한 뒤 잰다
      if (args.includes('--early')) { await pg.evaluate(() => window.sliceApi.botMove('greedy')); await pg.waitForTimeout(5000); }
      await throttle();
      await pg.evaluate(() => { void window.sliceApi.botMove('greedy'); });
      const r = await measure(['#board canvas'], 2500);
      // 판 선명도 (D-665): 지금 캔버스 해상도 · 자동 판정 결과 (--q boardres=sharp|fast 로 비교)
      r.res = await pg.evaluate(() => { const c = document.querySelector('#board canvas'); return { canvas: [c.width, c.height], css: [c.clientWidth, c.clientHeight], scale: +(c.width / c.clientWidth).toFixed(4), auto: window.__boardAuto ?? null, pref: localStorage.getItem('pawnisher.boardres.auto') }; });
      return r;
    },
    /** 맞음 번쩍임: 분대원 첫 쓰러짐 — 번쩍 · 흔들림 · 톱니 */
    hit: async () => {
      await boot();
      await pg.evaluate(() => window.sliceApi.startAt(1, 'battle'));
      await pg.waitForTimeout(2500);
      await throttle();
      await pg.evaluate(() => { void window.sliceApi.die(); });
      return measure(['.fx3-flash', '.fx-flash', '.crackfx', '#board', '.crackfx .dr-face'], 1400);
    },
  };
  const list = which === 'all' ? Object.keys(S) : which.split(',');
  const res = {};
  for (const k of list) {
    try { res[k] = await strip(k, S[k]); } catch (e) { res[k] = { error: String(e) }; }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
    console.log(k, JSON.stringify(res[k]));
  }
  res.errors = errors;
  const file = path.join(OUT, `motion-${TAG}.json`);
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  fs.writeFileSync(file, JSON.stringify({ ...prev, ...res }, null, 1));
  console.log('errors', errors.length, errors.slice(0, 5));
  await br.close();
})();
