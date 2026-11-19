// 반장전 흐름 띠 그림 (D-690): 반장마다 실제 흐름(등장 → 판 → 2단계 돌입 → 반장 공격 → 격파)을 915×412 DPR 2.625에서 돌리며
// CDP 화면 중계로 그려진 프레임을 받아 장면마다 띠 그림 한 장(PNG)을 남긴다. 반장 HP만 줄여 두고 손은 봇(sliceApi.botMove)이 둔다.
// 미리 `npm run build` · `npx vite preview --port 4391`. 사용:
//   node tools/qa/bossflow.cjs [--url http://localhost:4391/] [--boss plate,spawn,…] [--tag before] [--out production/qa/evidence/<폴더>]
// 결과: <폴더>/<tag>-<반장>-<entry|p2|attack|death>.png (프레임 8장 가로 띠) · <폴더>/<tag>-report.json (장면마다 사건 기록 · 콘솔 오류)
const { chromium } = require(process.env.PW_PATH || 'playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('--url', 'http://localhost:4391/');
const TAG = opt('--tag', 'after');
const OUT = opt('--out', 'production/qa/evidence/bossflow');
const BOSSES = opt('--boss', 'plate,inspect,spawn,magnet,thorns,alarm,gilded').split(',');
const ACT = { plate: 1, inspect: 1, spawn: 2, magnet: 2, thorns: 3, alarm: 3, gilded: 3 };
const W = 915, H = 412, DPR = 2.625;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'bossflow-'));
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await br.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, hasTouch: true, isMobile: true });
  const pg = await ctx.newPage();
  const errors = [];
  pg.on('pageerror', (e) => errors.push(e.message));
  pg.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  // 사건 기록: 판 위 알림 · 승패 띠 · 2단계 컷인 · 격파 컷이 몇 번 붙었나 (같은 연출이 두 번 터지는지 센다)
  await pg.addInitScript(() => {
    window.__log = [];
    const watch = ['ko3', 'p2cut', 'p2-warn', 'bossfx', 'p2-notice', 'fx-letterbox', 'bossplate-p2'];
    const mo = new MutationObserver((rs) => {
      for (const r of rs) for (const n of r.addedNodes) if (n.nodeType === 1) for (const c of watch) if (n.classList?.contains(c)) window.__log.push({ t: Date.now() / 1000, add: c, text: (n.textContent || '').trim().slice(0, 30) });
    });
    window.addEventListener('bossstrike', (e) => window.__log.push({ t: Date.now() / 1000, add: 'strike', text: e.detail }));
    document.addEventListener('DOMContentLoaded', () => mo.observe(document.documentElement, { childList: true, subtree: true }));
  });
  const cdp = await ctx.newCDPSession(pg);
  const A = (fn, a) => pg.evaluate(fn, a);
  const nap = (ms) => pg.waitForTimeout(ms);
  /** 장면 하나를 찍는다: fn이 끝날 때까지 프레임을 받고 고르게 n장 골라 띠 한 장 */
  const film = async (name, fn, n = 8, focus = null, span = [-0.6, 3.4]) => {
    // 프레임은 바로 디스크로 (메모리에 쌓으면 긴 장면에서 힙이 넘친다)
    const shots = [];
    const raw = fs.mkdtempSync(path.join(tmp, `${name}-`));
    const on = (e) => { const f = path.join(raw, `${shots.length}.jpg`); fs.writeFileSync(f, Buffer.from(e.data, 'base64')); shots.push({ t: e.metadata.timestamp, f }); cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }).catch(() => {}); };
    cdp.on('Page.screencastFrame', on);
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 72, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
    const t0 = Date.now() / 1000;
    let info;
    try { info = await fn(); } catch (e) { info = { error: String(e) }; }
    await cdp.send('Page.stopScreencast');
    cdp.off('Page.screencastFrame', on);
    let kept = shots.filter((s) => s.t >= t0 - 0.05);
    // 초점 연출(사건 기록의 첫 붙음) 둘레만 촘촘히 — 없으면 장면 전체
    const log = focus ? await A(() => window.__log) : [];
    const hit = log.find((e) => focus && focus.includes(e.add) && e.t >= t0);
    if (hit) kept = kept.filter((s) => s.t >= hit.t + span[0] && s.t <= hit.t + span[1]);
    const pick = kept.length <= n ? kept : Array.from({ length: n }, (_, i) => kept[Math.round((i * (kept.length - 1)) / (n - 1))]);
    const z = hit ? hit.t : t0;
    const files = pick.map((s) => `${s.f}@${Math.round((s.t - z) * 1000)}`);
    const out = path.join(OUT, `${TAG}-${name}.png`);
    if (files.length) execFileSync('python3', ['-I', path.join(__dirname, 'bossflow_strip.py'), out, ...files]);
    fs.rmSync(raw, { recursive: true, force: true });
    return { frames: kept.length, strip: out, focus: hit?.add, ...info };
  };
  const waitIdle = async (ms = 20000) => {
    const t = Date.now();
    while (Date.now() - t < ms) {
      if (await A(() => !document.querySelector('.bossfx, .p2cut, .ko3, .vn, .cutfx') && !!document.querySelector('#hand [data-card]'))) return true;
      await nap(200);
    }
    return false;
  };
  /** 반장 킹 HP를 hp로 (방열판 · 철갑을 걷는다) — 봇이 처치 수를 고를 만큼 낮게 */
  const weaken = (hp) => A((h) => { const b = window.slice(); const k = b.s.pieces.find((p) => p.side === 1 && p.type === 'K' && p.body === undefined); if (!k) return false; k.hp = Math.min(k.hp, h); k.shield = 0; return true; }, hp);
  /** 봇이 둔다 — cond가 참이 되거나 수가 바닥날 때까지 (턴 끝까지 포함) */
  const playUntil = async (cond, max = 14) => {
    for (let i = 0; i < max; i++) {
      if (await A(cond)) return true;
      // 봇 수는 기다리지 않고 건다 — 도중에 컷(도금왕 2단계 · 격파 컷)이 누름을 기다리면 눌러 넘긴다
      await A(() => { window.__bmr = undefined; window.sliceApi.botMove('greedy').then((r) => (window.__bmr = r), (e) => (window.__bmr = String(e))); });
      for (let k = 0; k < 160; k++) {
        await nap(250);
        if (await A(() => window.__bmr !== undefined && !document.querySelector('.p2cut, .ko3, .bossfx, .prologue'))) break;
        if (k > 12 && (await A(() => !!document.querySelector('.prologue')))) await pg.mouse.click(W / 2, H / 2).catch(() => {});
      }
      await waitIdle(6000);
      if ((await A(() => window.__bmr)) === 'busy') await nap(600);
    }
    return A(cond);
  };
  const report = {};
  await pg.goto(BASE + '?debug');
  await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 });
  await nap(500);
  for (const rule of BOSSES) {
    const R = (report[rule] = {});
    await pg.goto(BASE + '?debug');
    await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 });
    await nap(400);
    const s0 = await pg.$('.stagefx'); if (s0) { await s0.click(); await nap(400); }
    await A(() => window.sliceApi.campaign(0));
    await nap(800);
    await A(() => (window.__log = []));
    // ① 등장 — 실제 startBattle(반장 판) → 철문 → 반장 등장
    R.entry = await film(`${rule}-entry`, async () => {
      await A(([r, a]) => { if (r === 'gilded') { window.sliceApi.finalAt(13); } else window.sliceApi.bossIntroOf(r, a); }, [rule, ACT[rule]]);
      if (rule === 'gilded') return { note: 'finalAt skips intro' };
      await pg.waitForSelector('.bossfx', { timeout: 10000 }).catch(() => {});
      await pg.waitForSelector('.bossfx', { state: 'detached', timeout: 20000 }).catch(() => {});
      return {};
    }, 10);
    await waitIdle();
    await nap(800);
    // ② 2단계 돌입 — 반장 HP를 낮추고 봇이 쓰러뜨린다
    await weaken(1);
    R.p2 = await film(`${rule}-p2`, async () => ({ phase2: await playUntil(() => !!window.slice().phase2, 8) }), 10, ['p2cut', 'p2-notice']);
    await waitIdle();
    // ③ 반장 공격 — 적 차례: 내리찍기 순간 둘레만 촘촘히
    await A(() => (window.__log = []));
    R.attack = await film(`${rule}-attack`, async () => {
      for (let i = 0; i < 3; i++) {
        await A(() => window.sliceApi.warnNow());
        await nap(500);
        await waitIdle(20000);
      }
      return { log: await A(() => window.__log.filter((e) => e.add === 'strike')) };
    }, 10, ['strike'], [-0.15, 1.1]);
    // ④ 격파 — 다시 HP를 낮추고 봇이 끝낸다. 보상 창 · 격파 컷까지
    await A(() => (window.__log = []));
    await weaken(1);
    R.death = await film(`${rule}-death`, async () => {
      const won = await playUntil(() => window.slice().s.winner === 0, 10);
      await nap(6000);
      return { won, log: await A(() => window.__log) };
    }, 10, ['ko3'], [-2.6, 3]);
    console.log(rule, JSON.stringify({ p2: R.p2.phase2, won: R.death.won, log: R.death.log }));
  }
  report.errors = errors;
  fs.writeFileSync(path.join(OUT, `${TAG}-report.json`), JSON.stringify(report, null, 1));
  console.log('errors', errors.length, errors.slice(0, 5));
  fs.rmSync(tmp, { recursive: true, force: true });
  await br.close();
})();
