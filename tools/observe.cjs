// 실제 화면 관찰 도구 (/run-and-observe): 모바일 가로(915×412, DPR 2.625) 터치 기기로 게임을 열고
// 시나리오대로 탭해 스크린샷을 production/qa/evidence/에 남긴다. 미리 `npm run build`와 `npx vite preview --port 4173`.
// 사용: node tools/observe.cjs <시나리오> [--pc]   시나리오: menu | start | battle | battle-full | reward | shop | all
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

const OUT = path.join(__dirname, '..', 'production', 'qa', 'evidence');
const URL = process.env.OBSERVE_URL || 'http://localhost:4173/?debug';
const stamp = new Date().toISOString().slice(0, 10);

const runFixture = (stage) => ({
  version: 1, seed: 5, rng: 5, floor: 3, map: Array.from({ length: 36 }, () => [{ kind: 'battle' }, { kind: 'shop' }]), path: [],
  gold: 120, deck: ['K', 'N', 'N', 'P', 'P', 'B'], loadout: { enchants: { E01: 1, E13: 2 }, cards: ['A01', 'C03'], forge: { N: 1 } },
  wins: 2, crackGauge: 1, bosses: ['knight', 'rook'], ascension: 0, stage,
});

const scenarios = {
  async menu(page) {
    await page.evaluate(() => localStorage.clear());
    await page.reload(); await page.waitForTimeout(800);
    return ['menu'];
  },
  async start(page) {
    await scenarios.menu(page);
    await page.tap('[data-new]'); await page.waitForTimeout(400);
    return ['start-deck'];
  },
  async battle(page) {
    await scenarios.start(page);
    await page.tap('[data-deck="0"]'); await page.waitForTimeout(300);
    await page.tap('[data-node="0"]'); await page.waitForTimeout(1000);
    return ['battle-6x6'];
  },
  async 'battle-full'(page) {
    await scenarios.menu(page);
    await page.tap('[data-test]'); await page.tap('[data-sc="full"]'); await page.tap('[data-go]'); await page.waitForTimeout(1000);
    await page.evaluate(async () => { window.pawnisher.autoPlan(); await window.pawnisher.submit(); });
    await page.waitForTimeout(500);
    await page.evaluate(() => window.pawnisher.autoPlan());
    await page.waitForTimeout(300);
    return ['battle-8x8-planned'];
  },
  // 판 그래픽 (D-071): 기물을 골랐을 때 — 선택 모서리 · 갈 수 있는 칸 방울 · 치는 칸 과녁
  async 'battle-select'(page) {
    await scenarios.menu(page);
    await page.tap('[data-test]'); await page.tap('[data-sc="full"]'); await page.tap('[data-go]'); await page.waitForTimeout(1000);
    await page.evaluate(async () => { window.pawnisher.autoPlan(); await window.pawnisher.submit(); });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const c = window.pawnisher;
      const s = c.model().virtual;
      const p = s.pieces.find((q) => q.side === 0 && q.type === 'N') ?? s.pieces.find((q) => q.side === 0);
      c.tap({ x: p.x, y: p.y }, true);
    });
    await page.waitForTimeout(400);
    return ['battle-select'];
  },
  // 적 의도 (D-081): 아무것도 안 눌렀을 때 = 붉은 화살표 + 잃을 HP + 처치만 금색 숫자 / 적을 누르면 모든 피해 숫자
  async 'battle-intent'(page) {
    await scenarios.menu(page);
    await page.tap('[data-test]'); await page.tap('[data-sc="full"]'); await page.tap('[data-go]'); await page.waitForTimeout(1000);
    await page.evaluate(async () => { window.pawnisher.autoPlan(); await window.pawnisher.submit(); });
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, `${stamp}-battle-intent.png`) });
    await page.evaluate(() => {
      const c = window.pawnisher;
      const s = c.model().virtual;
      const p = s.pieces.find((q) => q.side === 1 && q.type === 'Q') ?? s.pieces.find((q) => q.side === 1);
      c.tap({ x: p.x, y: p.y }, true);
    });
    await page.waitForTimeout(400);
    return ['battle-intent-inspect'];
  },
  // 이형 거푸집 (D-084): 양 진영에 이형 4종 — 오른쪽 위 황동 문양 + 길게 누르기 설명
  async 'battle-variant'(page) {
    await scenarios.menu(page);
    await page.tap('[data-test]'); await page.tap('[data-sc="full"]'); await page.tap('[data-go]'); await page.waitForTimeout(800);
    await page.evaluate(() => {
      const c = window.pawnisher;
      const variants = { P: 'conveyor', N: 'hammer', B: 'mirror', R: 'radiator' };
      const lo = { enchants: {}, cards: [], forge: {}, variants };
      const s = c.state;
      c.start({ width: s.width, height: s.height, decks: [s.pieces.filter((p) => p.side === 0).map((p) => p.type), s.pieces.filter((p) => p.side === 1).map((p) => p.type)], weights: null }, 1, null, [lo, lo]);
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, `${stamp}-battle-variant.png`) });
    // 적 쇠망치 나이트 길게 누르기 → 설명
    const box = await page.locator('#board canvas').boundingBox();
    const s = await page.evaluate(() => { const st = window.pawnisher.state; const n = st.pieces.find((p) => p.side === 1 && p.type === 'N'); return { w: st.width, h: st.height, x: n.x, y: n.y }; });
    const cell = Math.min(box.width / s.w, box.height / s.h);
    void cell;
    await page.evaluate((pos) => window.pawnisher.tap(pos, true), { x: s.x, y: s.y });
    await page.waitForTimeout(300);
    return ['battle-variant-tap'];
  },
  // 공격 재생 중간 (4배 느리게): 이동 · 공격 이펙트 · 피해 숫자 · 재가 되는 처치
  async 'battle-attack'(page) {
    await page.goto(URL + '&fxslow'); await page.waitForTimeout(500);
    await scenarios.menu(page);
    await page.tap('[data-test]'); await page.tap('[data-sc="full"]'); await page.tap('[data-go]'); await page.waitForTimeout(1000);
    await page.evaluate(() => { window.pawnisher.autoPlan(); void window.pawnisher.submit(); });
    const shots = [];
    for (const at of [1500, 3000, 4500]) {
      await page.waitForTimeout(1500);
      const file = `battle-attack-${at}`;
      await page.screenshot({ path: path.join(OUT, `${stamp}-${file}.png`) });
      shots.push(file);
    }
    await page.goto(URL); await page.waitForTimeout(300);
    return [];
  },
  // 기록 줄 (D-073): 내 턴 + 적 턴이 끝난 뒤 오른쪽 레일
  async 'battle-log'(page) {
    await scenarios.menu(page);
    await page.tap('[data-test]'); await page.tap('[data-sc="full"]'); await page.tap('[data-go]'); await page.waitForTimeout(1000);
    for (let i = 0; i < 3; i++) await page.evaluate(async () => { window.pawnisher.autoPlan(); await window.pawnisher.submit(); });
    await page.waitForTimeout(400);
    return ['battle-log'];
  },
  // 턴 합계 (D-073): 내 실행이 끝나는 순간 판 가운데 큰 숫자 — 여러 번 찍어 잡는다
  async 'battle-summary'(page) {
    await scenarios.menu(page);
    await page.tap('[data-test]'); await page.tap('[data-sc="full"]'); await page.tap('[data-go]'); await page.waitForTimeout(1000);
    await page.evaluate(async () => { window.pawnisher.autoPlan(); await window.pawnisher.submit(); });
    await page.evaluate(() => { window.pawnisher.autoPlan(); void window.pawnisher.submit(); });
    for (let i = 0; i < 16; i++) {
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `${stamp}-battle-summary-${String(i).padStart(2, '0')}.png`) });
    }
    return [];
  },
  async reward(page) {
    await page.evaluate((run) => { localStorage.clear(); localStorage.setItem('pawnisher.run.v1', JSON.stringify(run)); },
      runFixture({ at: 'reward', title: '3층 승리', lines: ['골드 +34'], choices: [{ type: 'piece', options: ['N', 'R', 'P'] }, { type: 'enchant', options: ['E13', 'E15', 'E16'] }] }));
    await page.reload(); await page.waitForTimeout(700);
    await page.tap('[data-continue]'); await page.waitForTimeout(300);
    return ['reward-piece'];
  },
  async shop(page) {
    await page.evaluate((run) => { localStorage.clear(); localStorage.setItem('pawnisher.run.v1', JSON.stringify(run)); }, runFixture({ at: 'map' }));
    await page.reload(); await page.waitForTimeout(700);
    await page.tap('[data-continue]'); await page.waitForTimeout(300);
    await page.tap('[data-node="1"]'); await page.waitForTimeout(300);
    return ['shop'];
  },
};

(async () => {
  const name = process.argv[2] || 'all';
  const pc = process.argv.includes('--pc');
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext(pc ? { viewport: { width: 1600, height: 900 } } : { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(URL); await page.waitForTimeout(500);
  const list = name === 'all' ? Object.keys(scenarios) : [name];
  for (const s of list) {
    if (!scenarios[s]) { console.log(`NOT ASSESSED — 없는 시나리오: ${s}`); continue; }
    const shots = await scenarios[s](page);
    for (const shot of shots) {
      const file = path.join(OUT, `${stamp}-${shot}${pc ? '-pc' : ''}.png`);
      await page.screenshot({ path: file });
      console.log(`saved ${path.relative(process.cwd(), file)}`);
    }
  }
  console.log(errors.length ? `ERRORS ${JSON.stringify(errors)}` : 'no page errors');
  await browser.close();
})();
