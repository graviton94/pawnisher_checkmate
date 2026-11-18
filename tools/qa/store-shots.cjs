// 스토어 스크린샷 후보 (D-560): 실제 게임 화면만 (스팀 규정) — 1920×1080 · 1280×720.
// 스팀판 = 일렉트론 (D-563 보강): 일렉트론은 창을 915×412 읽기 크기 기준 소수 배율로 확대한다(electron/main.cjs setZoomFactor) —
// 1920×1080 창 = 게임 화면 915×514 · DPR 2.0984, 1280×720 창 = 915×515 · DPR 1.3989 (실제 일렉트론을 xvfb로 띄워 잰 값).
// 기본은 이 일렉트론 배율을 그대로 흉내 내 찍는다(?debug 손잡이가 필요해 실제 앱 대신 같은 크롬 · 같은 배율 · pawnisherNative 자리표).
// --web이면 예전처럼 웹 PC 브라우저(DPR 1, 루트 정수 확대 D-539)로 찍는다.
// ?debug 손잡이는 장면에 닿는 데만 쓰고, 화면에 남는 검수 UI(타이틀 시험장 줄 등)는 걷고 찍는다.
// 사용: node tools/qa/store-shots.cjs <출력 폴더> [1920x1080] [--only 이름,…] [--web]   (미리보기 서버: OBSERVE_URL, 기본 http://localhost:4173/)
// 결과: <출력>/<폭>/<번호>-<장면>[-b<k>].png — 순간 FX는 몇 장 연속(-b1 …)으로 찍어 고른다.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const OUT = path.resolve(args[0] || 'store-shots');
const size = args.map((a) => a.match(/^(\d+)x(\d+)$/)).find(Boolean);
const [SW, SH] = size ? [+size[1], +size[2]] : [1920, 1080];
const WEB = args.includes('--web');
/** 일렉트론 창 → 게임 화면 (electron/main.cjs fit과 같은 셈: s = max(1, min(w/915, h/412)), 화면 = 창 ÷ s 내림) */
const ELECTRON = { s: Math.max(1, Math.min(SW / 915, SH / 412)) };
/** 실제 일렉트론(xvfb)에서 잰 게임 화면 크기 — 크롬이 소수 배율 높이를 크기마다 다르게 반올림한다 */
const MEASURED = { '1920x1080': [915, 514], '1280x720': [915, 515] };
const [VW, VH, DPR] = WEB ? [SW, SH, 1] : [...(MEASURED[`${SW}x${SH}`] ?? [Math.round(SW / ELECTRON.s), Math.round(SH / ELECTRON.s)]), ELECTRON.s];
const onlyArg = args.find((a, i) => args[i - 1] === '--only');
const ONLY = onlyArg ? onlyArg.split(',') : null;
const BASE = process.env.OBSERVE_URL || 'http://localhost:4173/';
const DIR = path.join(OUT, String(SW));
/** 입문 · 안내를 마친 사람 (sweep.cjs META와 같다) — 안내 띠 · 코치가 끼어들지 않는다 */
const META = { tut: ['battle', 'battle-a', 'map', 'recruit', 'kit', 'promote', 'first_shop', 'heat', 'event'], runs: 3, prologue: true, ascOpen: 5, storyCleared: 1, daily: {}, onboarded: true,
  terms: ['버팀', '심장 톱니', '부적', '보충병', '기벽', '회피 반격', '기어 쇼크', '기절', '방열판', '부품', '청록 합 표지', '주황 곱 표지'], termsNew: [] };

/** 검수 UI 걷기: 타이틀 시험장 줄 */
const CLEAN = () => { document.querySelectorAll('.op-dev').forEach((e) => e.remove()); };
/** 대국을 세운 뒤 막 입구 · 반장 띠(stagefx)가 있으면 넘긴다 */
const settle = async (pg, ms = 1800) => { await pg.waitForTimeout(ms); const s = await pg.$('.stagefx'); if (s) { await s.click().catch(() => {}); await pg.waitForTimeout(600); } };
/** 연속 찍기: 시작 후 at(ms) 시점마다 한 장 */
const burst = async (pg, shot, name, at) => { const t0 = Date.now(); for (let k = 0; k < at.length; k++) { const d = at[k] - (Date.now() - t0); if (d > 0) await pg.waitForTimeout(d); await shot(`${name}-b${k + 1}`); } };

const SCENES = [
  { name: 'title', url: '?debug&opening', run: async ({ pg, shot }) => { await pg.waitForTimeout(2600); await pg.evaluate(CLEAN); await shot('title'); } },
  { name: 'setup', url: '?debug&opening', run: async ({ pg, shot }) => {
    await pg.waitForTimeout(1500); await pg.mouse.click(VW / 2, VH * 0.72); await pg.waitForTimeout(1500); await pg.evaluate(CLEAN);
    await shot('menu');
    await pg.locator('[data-ship]').first().click(); await pg.waitForTimeout(1200); await pg.evaluate(CLEAN); await shot('setup');
  } },
  { name: 'battle', run: async ({ pg, A, shot }) => {
    await A(() => { const a = window.sliceApi; a.richRun(); a.setAct(1); a.startAt(2, 'battle'); }); await settle(pg);
    await shot('battle-t1');
    // 카드 한 장 고르기(카드 FX · 갈 칸 미리보기) → 탐욕 봇 수를 몇 번 두며 연속 찍기(타격 FX 순간을 고른다)
    await A(() => document.querySelector('#hand [data-card]')?.click()); await pg.waitForTimeout(700); await shot('battle-pick');
    await A(() => document.querySelector('#hand [data-card]')?.click()); await pg.waitForTimeout(400);
    for (let k = 1; k <= 4; k++) {
      await A(() => { void window.sliceApi.botMove('greedy'); });
      await burst(pg, shot, `battle-move${k}`, [120, 260, 420, 620, 900]);
      await pg.waitForTimeout(1600);
    }
  } },
  { name: 'enemy', run: async ({ pg, A, shot }) => {
    // 적 차례: 예고 화살표 → 적 타격
    await A(() => { const a = window.sliceApi; a.richRun(); a.setAct(1); a.startAt(2, 'battle'); }); await settle(pg);
    await A(() => window.sliceApi.botMove('greedy')); await pg.waitForTimeout(2600);
    await A(() => window.sliceApi.botMove('greedy')); await pg.waitForTimeout(2600);
    await shot('enemy-intent');
    await A(() => { const e = document.getElementById('btn-end'); e.click(); }); await pg.waitForTimeout(250);
    await A(() => { const e = document.getElementById('btn-end'); if (e.classList.contains('warn')) e.click(); });
    await burst(pg, shot, 'enemy-turn', [300, 600, 900, 1200, 1500, 1800, 2200, 2600]);
  } },
  { name: 'raid', run: async ({ pg, A, shot }) => {
    await A(() => { window.sliceApi.richRun(); window.sliceApi.bossOf('plate', 1); }); await settle(pg, 2600);
    await shot('raid');
    await A(() => window.sliceApi.botMove('greedy')); await pg.waitForTimeout(2600); await shot('raid-2');
  } },
  { name: 'giant', run: async ({ pg, A, shot }) => {
    for (const g of ['R', 'Q']) { await A((t) => { window.sliceApi.richRun(); window.sliceApi.battleWith(2, 'check', { giants: [t], forms: undefined, process: undefined }); }, g); await settle(pg); await shot(`giant-${g}`); }
  } },
  { name: 'gilded', run: async ({ pg, A, shot }) => { await A(() => { window.sliceApi.richRun(); window.sliceApi.finalAt(13); }); await settle(pg, 2600); await shot('gilded'); } },
  { name: 'process', run: async ({ pg, A, shot }) => {
    for (const k of ['furnace', 'conveyor']) { await A((p) => { window.sliceApi.richRun(); window.sliceApi.battleWith(3, 'battle', { process: p, giants: undefined, forms: undefined }); }, k); await settle(pg); await shot(`process-${k}`); }
  } },
  { name: 'variants', run: async ({ pg, A, shot }) => { await A(() => { window.sliceApi.richRun(); window.sliceApi.battleWith(2, 'check', { enemy: ['K', 'R', 'N', 'Q', 'B', 'R', 'P'], forms: ['cannon', 'camel', 'hopper', 'archbishop', 'chancellor'], giants: undefined, process: undefined }); }); await settle(pg); await shot('variants'); } },
  { name: 'boss-intro', run: async ({ pg, A, shot }) => {
    await A(() => { window.sliceApi.richRun(); window.sliceApi.intro(2, 'boss'); });
    await pg.locator('.bossfx').waitFor({ state: 'attached', timeout: 8000 }).catch(() => {});
    await burst(pg, shot, 'boss-intro', [600, 1200, 1800, 2400, 3600]);
  } },
  { name: 'p2', run: async ({ pg, A, shot }) => {
    await A(() => { window.sliceApi.richRun(); window.sliceApi.bossOf('magnet', 2); }); await settle(pg);
    await A(() => { void window.sliceApi.p2Rise('magnet'); }); await burst(pg, shot, 'p2', [400, 640, 900, 1300]);
  } },
  { name: 'map', run: async ({ pg, A, shot }) => {
    for (const act of [1, 2]) { await A((i) => { const a = window.sliceApi; a.richRun(); a.setAct(i); a.map(3); }, act); await pg.waitForTimeout(1400); await shot(`map-a${act + 1}`); }
  } },
  { name: 'event', run: async ({ pg, A, shot }) => {
    for (const id of ['tinker', 'crownAltar', 'safe']) { await A((k) => { window.sliceApi.gold(200); window.sliceApi.event(k); }, id); await pg.waitForTimeout(5200); await shot(`event-${id}`); }
  } },
  { name: 'event-fx', run: async ({ pg, A, shot }) => {
    await A(() => { window.sliceApi.gold(200); window.sliceApi.event('tinker'); }); await pg.waitForTimeout(3200);
    await pg.click(".choice[data-slot='0']").catch(() => {}); await pg.waitForTimeout(500); await pg.click(".choice[data-slot='0']").catch(() => {});
    await burst(pg, shot, 'event-result', [1500, 2500, 3500, 4500]);
  } },
  { name: 'shop', run: async ({ pg, A, shot }) => { await A(() => { const a = window.sliceApi; a.richRun(); a.gold(400); a.shop(); }); await pg.waitForTimeout(2000); await shot('shop'); } },
  { name: 'reward', run: async ({ pg, A, shot }) => {
    for (let seed = 1; seed < 60; seed++) { await A((k) => { window.sliceApi.seed(k); window.sliceApi.reward(); }, seed); await pg.waitForTimeout(250); const g = await A(() => [...document.querySelectorAll('[data-grade]')].map((e) => e.dataset.grade).join(',')); if (/rare/.test(g) && /gold/.test(g)) break; }
    await pg.waitForTimeout(500); await shot('reward-pop'); await pg.waitForTimeout(1800); await shot('reward');
    await A(() => window.sliceApi.partPick()); await pg.waitForTimeout(1800); await shot('part-pick');
  } },
  { name: 'forge', run: async ({ pg, A, shot }) => {
    await A(() => { window.sliceApi.richRun(); window.sliceApi.forge(); }); await pg.waitForTimeout(1800); await shot('forge');
    await A(() => window.sliceApi.refine()); await pg.waitForTimeout(1600); await shot('refine');
    const c = pg.locator('.overlay [data-card], #overlay-panel [data-slot]').first(); if (await c.count()) { await c.click({ force: true }).catch(() => {}); await pg.waitForTimeout(700); await shot('refine-pick'); }
  } },
  { name: 'crew', run: async ({ pg, A, shot }) => { await A(() => { const a = window.sliceApi; a.richRun(); a.crew(); }); await pg.waitForTimeout(1400); await shot('crew'); await A(() => window.sliceApi.deckView('view')); await pg.waitForTimeout(1400); await shot('deck'); } },
  { name: 'prologue', run: async ({ pg, A, shot }) => {
    await A(() => { void window.sliceApi.pro(); });
    for (let k = 1; k <= 8; k++) { await pg.waitForFunction(() => { const el = document.querySelector('.prologue'); return !el || el.dataset.beat === 'hold'; }, null, { timeout: 15000 }).catch(() => {}); await shot(`prologue-${k}`); await pg.mouse.click(VW / 2, VH * 0.35); await pg.waitForTimeout(400); }
  } },
  { name: 'ending', run: async ({ pg, A, shot }) => {
    await A(() => { void window.sliceApi.endFlow(0); });
    await pg.locator('.promotion').waitFor({ timeout: 10000 }).catch(() => {}); await pg.waitForTimeout(2000); await shot('end-throne');
    await A(() => { void window.sliceApi.defeatCut(); });
    for (let k = 1; k <= 4; k++) { await pg.waitForFunction(() => { const el = document.querySelector('.prologue'); return !el || el.dataset.beat === 'hold'; }, null, { timeout: 15000 }).catch(() => {}); await shot(`defeat-${k}`); await pg.mouse.click(VW / 2, VH * 0.35); await pg.waitForTimeout(400); }
  } },
  // 턴 피해 합계(「이번 턴 피해 N · 처치 K」)가 판에 뜬 순간을 잡는다 — 판 글(sliceApi.boardTexts)로 뜬 것을 확인하고 찍는다 (봇 수는 손패에 따라 달라 고정 시각으로는 놓친다)
  { name: 'tally', run: async ({ pg, A, shot }) => {
    for (let tryN = 0; tryN < 3; tryN++) {
      await A((n) => { const a = window.sliceApi; a.seed(11 + n); a.richRun(); a.setAct(1); a.startAt(2, 'battle'); }, tryN); await settle(pg);
      for (let k = 0; k < 12; k++) {
        await A(() => { void window.sliceApi.botMove('greedy'); });
        for (let t = 0; t < 40; t++) {
          await pg.waitForTimeout(60);
          if (await A(() => window.sliceApi.boardTexts().some((x) => x.text.includes('이번 턴 피해')))) {
            await burst(pg, shot, 'tally', [500, 800, 1100]);
            return;
          }
        }
        await pg.waitForTimeout(400);
      }
    }
  } },
];

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  for (const [i, sc] of SCENES.entries()) {
    if (ONLY && !ONLY.includes(sc.name)) continue;
    const ctx = await br.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DPR });
    const pg = await ctx.newPage();
    // 일렉트론 preload가 내보이는 창 기능 넷 (electron/preload.cjs) — 있으면 게임은 PC판으로 행동한다(웹 확대 없음 · 끝내기 단추)
    if (!WEB) await pg.addInitScript(() => { window.pawnisherNative = { achievement: async () => {}, quit: async () => {}, toggleFullscreen: async () => {}, isFullscreen: async () => false }; });
    const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
    let n = 0;
    const shot = async (name) => { n += 1; await pg.screenshot({ path: path.join(DIR, `${String(i + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}-${name}.png`) }); };
    const A = (f, a) => pg.evaluate(({ src, arg }) => { const r = (0, eval)(`(${src})`)(arg); return r && typeof r.then === 'function' ? null : r; }, { src: f.toString(), arg: a });
    const url = BASE + (sc.url ?? '?debug');
    try {
      await pg.goto(url);
      await pg.evaluate((m) => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('pawnisher.slice.meta', m); }, JSON.stringify(META));
      await pg.goto(url);
      await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 });
      await pg.waitForFunction(() => window.sliceApi, null, { timeout: 10000 });
      await pg.waitForTimeout(600);
      await Promise.race([sc.run({ pg, A, shot }), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 120000))]);
      console.log(`${sc.name}: ${n}장${errs.length ? ' · 오류 ' + errs.join(' | ') : ''}`);
    } catch (e) {
      console.log(`${sc.name}: 실패 ${e.message.slice(0, 160)} (${n}장)`);
    }
    await ctx.close();
  }
  await br.close();
})();
