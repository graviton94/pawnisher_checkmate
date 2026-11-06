// UI 통일성 전수 점검 (D-262): 본편의 화면 · 팝업 · 안내창 · 띠 · 토스트를 장면마다 새 페이지로 찍는다 (915×412, 1배).
// 사용: (빌드 · 미리보기 후) node tools/artguide/ui-audit.cjs <출력 폴더> [장면 이름 걸러내기]
const { chromium } = require('playwright');
const out = process.argv[2] || 'ui-audit';
const only = process.argv[3];
require('fs').mkdirSync(out, { recursive: true });
const META = JSON.stringify({ tut: ['battle', 'map', 'recruit', 'kit', 'promote'], runs: 3 });
const SCENES = [
  ['battle', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2600); await S('a'); await A(() => document.getElementById('btn-end').click()); await W(350); await S('enemy-a'); await W(600); await S('enemy-b'); await W(2600); await S('after'); }],
  ['help', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2400); await A(() => document.getElementById('btn-help').click()); await W(900); await S(''); }],
  ['crew', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2400); await A(() => window.sliceApi.crew()); await W(900); await S(''); }],
  ['taunt', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2400); await A(() => window.sliceApi.taunt('gloat')); await W(900); await S(''); }],
  ['stand', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2400); await A(() => { window.sliceApi.stand(); }); await W(1500); await S(''); }],
  ['bet', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2400); await A(() => window.sliceApi.bet()); await W(1500); await S(''); }],
  ['death', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2400); await A(() => { window.sliceApi.die(); }); await W(1500); await S('a'); await W(2000); await S('b'); }],
  ['doom', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2400); await A(() => window.sliceApi.doom()); await A(() => document.getElementById('btn-end').click()); await W(3000); await S('a'); await W(2000); await S('b'); }],
  ['reward', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(1, 'battle')); await W(2400); await A(() => window.sliceApi.finish()); await W(2600); await S('a'); await W(2500); await S('b'); }],
  ['map', async (p, A, W, S) => { await A(() => window.sliceApi.map(2)); await W(2600); await S(''); }],
  ['shop', async (p, A, W, S) => { await A(() => { window.sliceApi.gold(10); window.sliceApi.shop(); }); await W(2600); await S('a'); await p.click('#overlay [data-buy]').catch(() => {}); await W(400); await S('toast'); }],
  ['forge', async (p, A, W, S) => { await A(() => window.sliceApi.forge()); await W(2600); await S(''); }],
  ['partpick', async (p, A, W, S) => { await A(() => window.sliceApi.partPick()); await W(2200); await S(''); }],
  ['event', async (p, A, W, S) => { await A(() => window.sliceApi.event('nightShift')); await W(2600); await S(''); }],
  ['boss', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'boss')); await W(2500); await S('intro-a'); await W(2500); await S('intro-b'); await W(5000); await S('battle'); }],
  ['endfail', async (p, A, W, S) => { await A(() => window.sliceApi.end(false)); await W(2800); await S(''); }],
  ['endclear', async (p, A, W, S) => { await A(() => window.sliceApi.end(true)); await W(2800); await S(''); }],
];
(async () => {
  const br = await chromium.launch();
  for (const [name, fn] of SCENES) {
    if (only && !name.includes(only)) continue;
    const p = await br.newPage({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
    p.on('pageerror', (e) => console.log('ERR', name, e.message));
    const A = (f, a) => p.evaluate(f, a).catch((e) => console.log('A', name, e.message.slice(0, 120)));
    const W = (ms) => p.waitForTimeout(ms);
    const S = (n) => p.screenshot({ path: `${out}/${name}${n ? '-' + n : ''}.png` }).catch(() => console.log('shot fail', name, n));
    try {
      await p.goto('http://localhost:4173/?debug');
      await p.evaluate((m) => localStorage.setItem('pawnisher.slice.meta', m), META);
      await p.goto('http://localhost:4173/?debug'); await W(2400); await p.mouse.click(450, 300); await W(1200);
      await fn(p, A, W, S);
    } catch (e) { console.log('FAIL', name, e.message.slice(0, 160)); }
    await p.close().catch(() => {});
  }
  await br.close();
})();
