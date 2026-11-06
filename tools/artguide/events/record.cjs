// 사건 15종 실제 게임 녹화 (D-259): 사건을 열고 선택지를 고른 뒤, 사건 창(.ev-wrap)을 나가기 버튼이 뜰 때까지 찍는다.
// 손으로 하는 장치(탭 · 단추 · 긁기 · 카드)는 사람처럼 눌러 준다. 프레임마다 실제 걸린 시간을 적어 record.py가 같은 박자로 굽는다.
// 사용: (빌드 후) npx vite preview --port 4173 & node tools/artguide/events/record.cjs <출력 폴더> <사건[:시드[:선택지]]>...
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const out = process.argv[2];
const jobs = process.argv.slice(3);
(async () => {
  const br = await chromium.launch();
  for (const job of jobs) {
    const [id, seed, pick] = job.split(':');
    const pg = await br.newPage({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 1, hasTouch: true });
    pg.on('pageerror', (e) => console.log('ERR', id, e.message));
    await pg.goto('http://localhost:4173/?debug');
    await pg.evaluate(() => localStorage.setItem('pawnisher.slice.meta', JSON.stringify({ tut: ['battle', 'map', 'recruit', 'kit', 'promote'], runs: 3 })));
    await pg.goto('http://localhost:4173/?debug');
    await pg.waitForTimeout(2500);
    await pg.evaluate(([i, s]) => { window.sliceApi.gold(300); if (s) window.sliceApi.seed(Number(s)); window.sliceApi.event(i); }, [id, seed]);
    const dir = path.join(out, job.replace(/:/g, '-'));
    fs.mkdirSync(dir, { recursive: true });
    const times = [];
    let n = 0;
    const t0 = Date.now();
    const shot = async () => {
      const w = await pg.$('.ev-wrap');
      if (!w) return;
      await w.screenshot({ path: path.join(dir, `${String(n++).padStart(4, '0')}.png`) });
      times.push(Date.now() - t0);
    };
    for (let i = 0; i < 12; i++) { await shot(); await pg.waitForTimeout(60); }
    const choices = await pg.$$('.ev-choice:not(.off)');
    const b = choices[Number(pick ?? 0)] ?? choices[0];
    await b.click(); await shot(); await pg.waitForTimeout(200); await shot(); await b.click();
    let scraped = 0, pressed = false, tapped = 0;
    for (let k = 0; k < 320; k++) {
      await shot();
      const card = await pg.$('.ev-cards .ev-card');
      if (card) { await card.click().catch(() => {}); continue; }
      const tap = await pg.$('.ev-tap');
      if (tap && k % 5 === 4) { tapped++; await tap.click({ force: true }).catch(() => {}); continue; }
      const mg = await pg.$('.mg-stage');
      if (mg) {
        const r = await mg.boundingBox();
        if (id === 'brokenGacha' && !pressed && k > 8) { pressed = true; await pg.mouse.click(r.x + r.width * 0.9, r.y + r.height * 0.55); continue; }
        if (id === 'auction' && scraped < 6 && k > 8 && k % 3 === 0) {
          // 칸 하나씩 지그재그로 긁는다 (봉인판 칸: 가로 0.29 · 0.51 · 0.72, 세로 0.52 ~ 0.84)
          const cx = r.x + r.width * [0.29, 0.51, 0.72][scraped % 3], top = r.y + r.height * 0.53;
          await pg.mouse.move(cx - 44, top); await pg.mouse.down();
          for (let z = 0; z < 12; z++) { await pg.mouse.move(cx + (z % 2 ? 44 : -44), top + z * 9, { steps: 4 }); if (z % 3 === 2) await shot(); }
          await pg.mouse.up(); scraped++; continue;
        }
      }
      if (await pg.$('.ev-exit:not([hidden])')) { for (let i = 0; i < 10; i++) { await shot(); await pg.waitForTimeout(80); } break; }
    }
    fs.writeFileSync(path.join(dir, 'times.json'), JSON.stringify(times));
    console.log(job, n, 'taps', tapped);
    await pg.close();
  }
  await br.close();
})();
