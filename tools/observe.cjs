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
