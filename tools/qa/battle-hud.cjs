// 대국 화면 폰 점검 (D-621 ~ D-624): 실제 대국을 열고 손가락으로 탭해 찍는다 — 손패 · 펼친 카드 창 · 과녁 옆 예상 피해 · HP 바 잃을 몫 ·
// 태엽 계기 · 피해 숫자(크기) · 적 HP 바. 915×412 DPR 2.625와 667×375 DPR 2 두 규격 (--only 960 = PC 960×540).
// 미리 `npm run build` · `npx vite preview --port 4391 --strictPort`. 사용:
//   node tools/qa/battle-hud.cjs [--url http://localhost:4391/] [--tag after] [--out production/qa/evidence] [--only 915|667|960]
// 결과: <폴더>/<날짜>-battle-hud-<tag>-<폭>-<장면>.png
const { chromium } = require(process.env.PW_PATH || 'playwright');
const path = require('path');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('--url', 'http://localhost:4391/');
const TAG = opt('--tag', 'after');
const OUT = opt('--out', 'production/qa/evidence');
const ONLY = opt('--only', '');
const DAY = new Date().toISOString().slice(0, 10);
const SIZES = [[915, 412, 2.625], [667, 375, 2], [960, 540, 2]].filter(([w]) => (ONLY ? String(w) === ONLY : w !== 960));
const META = { tut: ['battle', 'battle-a', 'map', 'recruit', 'kit', 'promote', 'first_shop', 'heat', 'event'], runs: 3, prologue: true, ascOpen: 5, storyCleared: 1, daily: {}, onboarded: true, termsNew: [] };

(async () => {
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const errors = [];
  for (const [w, h, dpr] of SIZES) {
    const pg = await br.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: true, isMobile: true });
    pg.on('pageerror', (e) => errors.push(`${w}: ${e}`));
    pg.on('console', (m) => m.type() === 'error' && errors.push(`${w} console: ${m.text()}`));
    const shot = async (name) => { const f = path.join(OUT, `${DAY}-battle-hud-${TAG}-${w}-${name}.png`); await pg.screenshot({ path: f }); console.log(f); };
    const url = `${BASE}?debug`;
    await pg.goto(url);
    await pg.evaluate((m) => { localStorage.clear(); localStorage.setItem('pawnisher.slice.meta', m); }, JSON.stringify(META));
    await pg.goto(url);
    await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 });
    await pg.waitForFunction(() => window.sliceApi, null, { timeout: 10000 });
    // 2막 일반 대국 — 손패가 다섯 장 이상 · 적 여럿
    await pg.evaluate(() => { window.sliceApi.setAct(1); window.sliceApi.startAt(2, 'battle'); });
    await pg.waitForTimeout(2600);
    await shot('1-idle');
    // 친다: 칠 수 있는 카드 · 기물 · 칸을 엔진(previewPlay)으로 찾는다 — 처치가 아닌 타격을 먼저
    const plan = await pg.evaluate(() => {
      const b = window.slice();
      const a = window.sliceApi;
      let best = null;
      b.hand.forEach((id, i) => {
        for (const p of a.cardPieces(b, i)) for (const to of a.cardMoves(b, i, p.id)) {
          const sim = a.previewPlay(b, i, p.id, to);
          const hits = sim?.events.flatMap((e) => (e.type === 'attack' && e.attackerId === p.id ? e.hits : [])) ?? [];
          if (!hits.length) continue;
          const kill = hits.some((x) => x.killed);
          const score = (kill ? 0 : 100) + hits.reduce((s, x) => s + x.damage, 0);
          if (!best || score > best.score) best = { i, pieceId: p.id, from: { x: p.x, y: p.y }, to, score, kill };
        }
      });
      return best;
    });
    if (!plan) { errors.push(`${w}: 칠 수 있는 수 없음`); await pg.close(); continue; }
    const tapAt = async (x, y) => { await pg.touchscreen.tap(Math.round(x), Math.round(y)); };
    const tapCell = async (pos) => { const s = await pg.evaluate((p) => window.sliceApi.screenOf(p), pos); await tapAt(s.x, s.y); };
    // 손패에서 그 카드를 탭 (레일 밖이면 「N장 더」를 눌러 내린다)
    for (let k = 0; k < 6; k++) {
      const box = await pg.locator(`#hand [data-card="${plan.i}"]`).boundingBox();
      const rail = await pg.locator('#hand').boundingBox();
      if (box && box.y + box.height / 2 < rail.y + rail.height - 50) { await tapAt(box.x + box.width / 2, box.y + Math.min(box.height / 2, 20)); break; }
      await pg.locator('#hand .hand-more').tap().catch(() => {});
      await pg.waitForTimeout(200);
    }
    await pg.waitForTimeout(500);
    await shot('2-card');
    // 글 넘침 · 누름 크기 (게임 UI 6장 1 · 7): 손패 줄 높이 ≥ 44 · 창 안 글이 잘리지 않는다 · 창 폭 · 높이
    const audit = await pg.evaluate(() => {
      const over = [...document.querySelectorAll('.card-win *, #hand .hc-t b')].filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible').map((e) => e.className || e.tagName);
      const strips = [...document.querySelectorAll('#hand > .hc')].map((e) => Math.round(e.getBoundingClientRect().height));
      const win = document.querySelector('.card-win')?.getBoundingClientRect();
      const clip = [...document.querySelectorAll('#hand .hc-t b')].filter((e) => e.getBoundingClientRect().right > e.closest('.hc').getBoundingClientRect().right).length;
      return { over, clip, strips, win: win && { w: Math.round(win.width), h: Math.round(win.height), top: Math.round(win.top), bottom: Math.round(win.bottom) } };
    });
    console.log(`${w} 점검`, JSON.stringify(audit));
    if (process.env.DBG) console.log(await pg.evaluate(() => document.querySelector('.card-win')?.dataset.dbg));
    const sel = await pg.evaluate(() => window.sliceApi.sel());
    if (sel.piece !== plan.pieceId) { await tapCell(plan.from); await pg.waitForTimeout(500); }
    await shot('3-aim');
    // 친다 — 피해 숫자 · HP 바를 세 번 찍는다
    await tapCell(plan.to);
    for (const [k, ms] of [[1, 380], [2, 120], [3, 120], [4, 160]]) { await pg.waitForTimeout(ms); await shot(`4-hit-${k}`); }
    await pg.waitForTimeout(1600);
    await shot('5-after');
    // 길게 누르기 없이 태엽 계기 · 손패 확대: 오른쪽 레일과 손패 레일만 잘라 둔다
    await pg.close();
  }
  await br.close();
  if (errors.length) { console.log('오류:'); for (const e of errors) console.log(' ', e); process.exitCode = 1; } else console.log('오류 0');
})();
