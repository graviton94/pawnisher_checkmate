// 용어 후보 띠 길이 확인 (2026-11-16 패링 · 회피 · 경직 용어 시안) — 실제 상태 띠(진홍)에 넣어 915×412로 찍는다
// 사용: OBSERVE_URL=http://localhost:4173/ node tools/qa/term-bands.cjs <출력 폴더>
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.OBSERVE_URL || 'http://localhost:4173/';
const BANDS = [
  ['now-parry', '패링! 철갑 반장 경직 — 받는 피해 ×1.6'],
  ['now-whiff', '헛방 — 철갑 반장 철갑이 벗겨진다'],
  ['p-anvil', '모루받기! 철갑 반장 기절 — 받는 피해 ×1.6'],
  ['p-anvil-jam', '모루받기! 철갑 반장 톱니 걸림 — 받는 피해 ×1.6'],
  ['p-bounce', '튕겨내기! 철갑 반장 기절 — 받는 피해 ×1.6'],
  ['p-long', '모루받기! 출하 반장 톱니 물림 — 받는 피해 ×1.6'],
  ['w-pass', '흘려보내기 — 철갑 반장 철갑이 벗겨진다'],
  ['w-mold', '빈 거푸집 — 철갑 반장 철갑이 벗겨진다'],
];
(async () => {
  const out = process.argv[2];
  fs.mkdirSync(out, { recursive: true });
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const pg = await br.newPage({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
  pg.on('pageerror', (e) => console.log('ERR', e.message));
  await pg.goto(`${BASE}?debug`);
  await pg.waitForSelector('#boot', { state: 'detached' });
  await pg.waitForTimeout(300);
  const skip = async () => { const s = await pg.$('.stagefx'); if (s) { await s.click(); await pg.waitForTimeout(500); } };
  await skip();
  await pg.evaluate(() => window.sliceApi.bossOf('plate', 1));
  await pg.waitForTimeout(2600); await skip();
  await pg.waitForTimeout(3000);
  for (const [name, text] of BANDS) {
    await pg.evaluate((t) => window.sliceApi.stateBand(t, 'crimson'), text);
    await pg.waitForTimeout(450);
    // 띠 자리(판 열 위 48px)만 잘라 둔다 + 띠 글이 칸을 넘는지 잰다
    const m = await pg.evaluate(() => {
      const els = [...document.querySelectorAll('.sband, .band, [class*="band"]')].filter((e) => e.getBoundingClientRect().width > 100 && e.getBoundingClientRect().top < 80);
      const e = els[els.length - 1];
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { w: Math.round(r.width), sw: e.scrollWidth, cw: e.clientWidth, cls: e.className };
    });
    console.log(name, JSON.stringify(m));
    await pg.screenshot({ path: `${out}/band-${name}.png`, clip: { x: 230, y: 0, width: 455, height: 60 } });
    await pg.waitForTimeout(1200);
  }
  await br.close();
})();
