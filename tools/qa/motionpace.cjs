// 움직임 박자 측정 (D-595 — D-554 framepace를 넓혔다): 등급 띠 · 등급 드러내기 · 화면 전환 · 반장 등장 번쩍임 · 맞음 번쩍임을
// CPU 느리게(기본 ×4, CDP Emulation.setCPUThrottlingRate) · 915×412 DPR 2.625에서 잰다.
// rAF마다 ① 프레임 간격(평균 fps · 가장 긴 프레임 · 34ms/50ms 넘는 프레임 수) ② 지켜볼 요소(그리고 ::before · ::after)의 모습이
// 바뀐 프레임 비율(= 프레임마다 움직이나, 계단이나)을 적고, CDP 화면 중계로 그려진 프레임을 받아 띠 그림을 남긴다.
// 미리 `npm run build` · `npx vite preview --port 4355`. 사용:
//   node tools/qa/motionpace.cjs <reveal|sweep|screen|boss|board|hit|title|all> [--tapAt 1200] [--probe] [--url http://localhost:4355/] [--tag after] [--out <폴더>] [--cpu 4] [--light] [--q boardscale=2 | boardres=sharp|fast] [--boss plate|inspect|magnet|alarm…] [--early]
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
  /**
   * 타이틀 → 메뉴 펼침 (D-676 — 사용자 실기기: 「로딩 완료 후 로고가 왼쪽으로 가면서 버튼 등장할 때 프레임 구림」).
   * 콜드 스타트부터 CPU 감속을 걸고(실기기처럼 부팅 · 판 세우기 · 미리 받기가 다 느리다), 타이틀이 뜨고 --tapAt ms 뒤에 누른다 →
   * 누른 뒤 1600ms 동안 rAF 간격만 잰다(--light와 같이 모습 서명 없음 — 서명 자체가 프레임을 먹는다).
   * CDP 추적으로 그 구간의 주 스레드 일을 이름별로 나눠 적는다(무엇이 프레임을 먹나).
   */
  S.title = async () => {
    const tapAt = Number(opt('--tapAt', 1200));
    await ctx.addInitScript(() => { try { localStorage.setItem('pawnisher.slice.meta', JSON.stringify({ prologue: true, runs: 1 })); } catch { /* */ } });
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await throttle();
    await pg.goto(BASE);
    await pg.waitForSelector('.opening', { timeout: 60000 });
    await pg.waitForTimeout(tapAt);
    // 추적 시작 → 누름 → 잰다
    const chunks = [];
    const onData = (e) => chunks.push(...e.value);
    cdp.on('Tracing.dataCollected', onData);
    await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,v8,blink,cc,gpu,disabled-by-default-devtools.timeline.frame', transferMode: 'ReportEvents' });
    const tTap = await pg.evaluate(() => performance.now());
    // --probe: 프레임마다 로고 · 첫 단추 자리도 적는다(배치 읽기 한 번 — fps 판과 따로 돌린다) → 눈에 보이는 움직임 횟수
    const PROBE_POS = args.includes('--probe');
    const meas = pg.evaluate(([ms, probe]) => new Promise((done) => {
      const f = [], pos = [], btn = [];
      const t0 = performance.now();
      const step = (now) => {
        f.push(now - t0);
        if (probe) {
          const l = document.querySelector('.op-logo');
          const b = document.querySelector('.op-menu > *');
          pos.push(l ? (() => { const r = l.getBoundingClientRect(); return Math.round((r.left + r.width / 2) * 10) + ':' + Math.round((r.top + r.height / 2) * 10); })() : null);
          btn.push(b ? Math.round(b.getBoundingClientRect().left * 10) + ':' + Math.round(b.getBoundingClientRect().height) : null);
        }
        if (now - t0 < ms) requestAnimationFrame(step); else done({ f, pos, btn });
      };
      requestAnimationFrame(step);
    }), [1600, PROBE_POS]);
    mark = Date.now() / 1000;
    await pg.touchscreen.tap(Math.round(W / 2), Math.round(H * 0.8));
    const got = await meas;
    const ts = got.f;
    // 보이는 움직임: 자리가 바뀐 프레임 수 · 첫 바뀜 ~ 마지막 바뀜 사이 초당 바뀜 · 가장 오래 멈춘 시간
    const moves = (arr) => {
      const ch = [];
      for (let i = 1; i < arr.length; i++) if (arr[i] !== arr[i - 1]) ch.push(i);
      if (ch.length < 2) return { changes: ch.length };
      const ms = ts[ch[ch.length - 1]] - ts[ch[0] - 1];
      const gaps = ch.slice(1).map((c, k) => ts[c] - ts[ch[k]]);
      return { changes: ch.length, ms: Math.round(ms), perSec: +(ch.length / (ms / 1000)).toFixed(1), maxHoldMs: Math.round(Math.max(...gaps)) };
    };
    const logoMotion = PROBE_POS ? moves(got.pos) : undefined;
    const btnMotion = PROBE_POS ? moves(got.btn) : undefined;
    const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
    await cdp.send('Tracing.end');
    await done;
    cdp.off('Tracing.dataCollected', onData);
    const dts = ts.slice(1).map((t, i) => t - ts[i]);
    const span = ts[ts.length - 1] - ts[0];
    // 주 스레드 일 나누기 (CrRendererMain의 X 사건 — 겹친 사건은 바깥 것만 더하지 않도록 이름별 합만 적는다)
    const meta = chunks.filter((e) => e.name === 'thread_name' && e.args?.name === 'CrRendererMain');
    const mains = new Set(meta.map((e) => `${e.pid}:${e.tid}`));
    const main = chunks.filter((e) => e.ph === 'X' && mains.has(`${e.pid}:${e.tid}`) && e.dur);
    const by = {};
    for (const e of main) by[e.name] = (by[e.name] || 0) + e.dur / 1000;
    const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, v]) => [k, Math.round(v)]);
    const tasks = main.filter((e) => e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask').map((e) => e.dur / 1000);
    // 긴 작업 속: 가장 긴 작업 셋 안에서 이름별 합
    const longT = main.filter((e) => (e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask') && e.dur > 30000).sort((a, b) => b.dur - a.dur).slice(0, 3);
    const inside = longT.map((t) => {
      const sub = {};
      for (const e of main) if (e !== t && e.ts >= t.ts && e.ts + e.dur <= t.ts + t.dur) sub[e.name] = (sub[e.name] || 0) + e.dur / 1000;
      const fn = main.filter((e) => e.ts >= t.ts && e.ts + e.dur <= t.ts + t.dur && e.name === 'FunctionCall').map((e) => e.args?.data?.url?.split('/').pop() + ':' + e.args?.data?.functionName).slice(0, 4);
      return { ms: Math.round(t.dur / 1000), top: Object.entries(sub).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => [k, Math.round(v)]), fn };
    });
    return {
      tapAt, cpu: CPU, tTap: Math.round(tTap), frames: ts.length, avgFps: +((ts.length - 1) / (span / 1000)).toFixed(1),
      longestMs: Math.round(Math.max(0, ...dts)), over17: dts.filter((d) => d > 17.5).length, over34: dts.filter((d) => d > 34).length, over50: dts.filter((d) => d > 50).length,
      longTasks: tasks.filter((d) => d > 50).length, logoMotion, btnMotion, mainTop: top, longInside: inside,
    };
  };
  const list = which === 'all' ? Object.keys(S).filter((k) => k !== 'title') : which.split(',');
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
