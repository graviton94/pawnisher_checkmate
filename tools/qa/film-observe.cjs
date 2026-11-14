// 영화 문법 컷신 실화면 확인 (D-503, 후기 #31 · #1 · #22 · #23): 프롤로그 · 반장 격파 · 왕관 결말(돌아봄 포함) · 진엔딩 · 패배 · 사건 결과를
// 실제 터치로 넘기며 프레임을 찍는다. 미리 `npm run build` · `npx vite preview --port 4196`.
// 사용: node tools/qa/film-observe.cjs <prologue|boss|crown|true|defeat|event|all> [--small] [--calm]
// 결과: production/qa/evidence/2026-11-14-pd-<장면>-<nn>[-667x375][-calm].png
const { chromium } = require('playwright');
const BASE = process.env.OBSERVE_URL || 'http://localhost:4196/';
const args = process.argv.slice(2);
const sc = args.find((a) => !a.startsWith('--')) || 'all';
const small = args.includes('--small');
const calm = args.includes('--calm');
const [W, H, DPR] = small ? [667, 375, 2] : [915, 412, 2.625];
const suffix = `${small ? '-667x375' : ''}${calm ? '-calm' : ''}`;
(async () => {
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const pg = await br.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, hasTouch: true, isMobile: true });
  const errors = [];
  pg.on('pageerror', (e) => errors.push(e.message));
  pg.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (calm) await pg.emulateMedia({ reducedMotion: 'reduce' });
  await pg.goto(BASE + '?debug');
  await pg.waitForSelector('#boot', { state: 'detached' });
  await pg.waitForTimeout(300);
  const s0 = await pg.$('.stagefx'); if (s0) { await s0.click(); await pg.waitForTimeout(400); }
  const wait = (ms) => pg.waitForTimeout(ms);
  const shot = (name) => pg.screenshot({ path: `production/qa/evidence/2026-11-14-pd-${name}${suffix}.png` });
  const tapFilm = () => pg.locator('.prologue').tap({ position: { x: Math.round(W / 2), y: Math.round(H * 0.35) } });
  /** 컷신 하나를 끝까지: 쪽마다 다 찍힌 뒤 한 장, 최대 max장 */
  const film = async (name, max = 40, every = 1) => {
    await pg.locator('.prologue').waitFor({ state: 'attached' });
    let n = 0;
    for (let k = 0; k < 120 && (await pg.locator('.prologue').count()); k++) {
      await wait(calm ? 250 : 700);
      const title = await pg.locator('.film-title').count();
      const typing = await pg.locator('.cut-sub.typing').count();
      if (typing) { await wait(1500); }
      if (n < max && (k % every === 0 || title)) await shot(`${name}-${String(n++).padStart(2, '0')}`);
      if (!(await pg.locator('.prologue').count())) break;
      if (await pg.locator('.prologue.go-wait').count()) { await tapFilm(); break; }
      await tapFilm().catch(() => {});
    }
    await pg.locator('.prologue').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
  };
  const run = async (what) => {
    if (what === 'prologue') { await pg.evaluate(() => { void window.sliceApi.pro(); }); await film('prologue', 60); }
    if (what === 'boss') { await pg.evaluate(() => { window.sliceApi.campaign(0); window.sliceApi.fallCut('plate'); }); await wait(600); await film('boss', 12); }
    if (what === 'defeat') { await pg.evaluate(() => { void window.sliceApi.defeatCut(); }); await film('defeat', 12); }
    if (what === 'true') { await pg.evaluate(() => { void window.sliceApi.trueEnd(); }); await film('true', 30); }
    if (what === 'crown') {
      await pg.evaluate(() => { void window.sliceApi.endFlow(0); });
      await pg.locator('.promotion').waitFor();
      await wait(1800);
      await pg.locator('.pm-dialogue').tap();
      await shot('crown-throne');
      await pg.locator('[data-lay]').tap();
      await film('crown-look', 8);
      await wait(400);
      await shot('crown-throne-after');
      await pg.locator('[data-promote]').tap();
      await film('crown', 40);
      await pg.locator('.credits').waitFor({ timeout: 8000 }).catch(() => {});
      await wait(900); await shot('crown-credits-0');
      await wait(5200); await shot('crown-credits-1');
    }
    if (what === 'event') {
      for (const seed of [Number(process.env.SEED || 1)]) {
        await pg.evaluate((s) => { window.sliceApi.seed(s); window.sliceApi.gold(300); window.sliceApi.event('dipping'); }, seed);
        await wait(900);
        await pg.locator('.ws-cap').tap().catch(() => {}); await wait(80);
        await pg.locator('.ws-say').tap().catch(() => {});
        await pg.waitForFunction(() => !document.querySelector('#overlay-panel')?.classList.contains('locked'), null, { timeout: 6000 }).catch(() => {});
        await wait(200);
        await pg.locator('[data-slot="0"]').tap(); await wait(120);
        await pg.locator('[data-slot="0"]').tap();
        const frames = [200, 500, 800, 1100, 1400, 1700, 2100, 2600, 3200];
        let t0 = 0;
        for (const [k, t] of frames.entries()) { await wait(t - t0); t0 = t; await shot(`event-dipping-s${seed}-${String(k).padStart(2, '0')}`); }
        break;
      }
    }
  };
  for (const w of sc === 'all' ? ['prologue', 'boss', 'crown', 'true', 'defeat', 'event'] : [sc]) await run(w);
  console.log(errors.length ? `ERRORS\n${errors.join('\n')}` : 'no errors');
  await br.close();
})();
