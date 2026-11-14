// 베타 점검 (D-477): PC판(Electron)을 실제로 띄워 첫 화면 → 메뉴 → 본편 시작 → 첫 대국까지 마우스로 누르고,
// 창 크기별 화면 · 오류를 남긴다. 사용: npm run build 뒤 xvfb-run -a node tools/qa/electron.cjs <출력 폴더>
const { _electron: electron } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = (process.argv[2] ?? 'production/qa/electron') + '/';
fs.mkdirSync(OUT, { recursive: true });
const W = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const app = await electron.launch({ executablePath: require('electron'), args: [path.join(__dirname, '..', '..'), '--no-sandbox'], env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' } });
  const win = await app.firstWindow();
  const errs = [];
  win.on('pageerror', (e) => errs.push(e.message));
  win.on('console', (m) => { if (m.type() === 'error' && !/GPU|WebGL|swiftshader/i.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await win.waitForSelector('#boot', { state: 'detached', timeout: 30000 }).catch(() => {});
  await W(3000);
  for (const [w, h] of [[1920, 1080], [1280, 720], [1366, 768]]) {
    await app.evaluate(({ BrowserWindow }, [ww, hh]) => { const b = BrowserWindow.getAllWindows()[0]; b.unmaximize(); b.setContentSize(ww, hh); }, [w, h]);
    await W(1200);
    const vp = await win.evaluate(() => ({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio }));
    await win.screenshot({ path: `${OUT}title-${w}x${h}.png` });
    console.log(`${w}x${h} → 게임 화면 ${vp.w}x${vp.h} · DPR ${vp.dpr}`);
  }
  // 첫 화면 → 프롤로그(처음이면) → 메뉴 → 본편 시작
  for (let i = 0; i < 60; i++) {
    const st = await win.evaluate(() => ({ go: !!document.querySelector('[data-go]')?.getClientRects().length, skip: [...document.querySelectorAll('.cut-skip')].some((b) => b.getClientRects().length), battle: !!document.getElementById('btn-end')?.getClientRects().length && !document.body.classList.contains('between') && !document.querySelector('.opening, .prologue') }));
    if (i % 5 === 0) console.log('step', i, JSON.stringify(st), await win.evaluate(() => [...document.querySelectorAll('button, .op-press')].filter((b) => b.getClientRects().length).map((b) => (b.className + ':' + b.textContent.trim()).slice(0, 30)).slice(0, 6).join(' | ')));
    if (st.battle) break;
    if (await win.evaluate(() => { const b = [...document.querySelectorAll('[data-yes]')].find((x) => x.getClientRects().length); if (b) { b.click(); return true; } return false; })) { await W(3000); continue; }
    if (st.skip) { await win.evaluate(() => [...document.querySelectorAll('.cut-skip')].find((b) => b.getClientRects().length).click()); await W(1200); continue; }
    if (st.go) { await win.evaluate(() => [...document.querySelectorAll('[data-go]')].find((b) => b.getClientRects().length).click()); await W(3000); continue; }
    await win.mouse.click(640, 400); await W(800);
  }
  await W(3000);
  await win.screenshot({ path: `${OUT}battle.png` });
  // 실제 창 픽셀 (Electron capturePage — 확대가 적용된 그대로)
  for (const [w, h] of [[1920, 1080], [1280, 720], [1366, 768], [1280, 800]]) {
    await app.evaluate(({ BrowserWindow }, [ww, hh]) => { BrowserWindow.getAllWindows()[0].setContentSize(ww, hh); }, [w, h]);
    await W(1500);
    const png = await app.evaluate(async ({ BrowserWindow }) => (await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString('base64'));
    fs.writeFileSync(`${OUT}battle-real-${w}x${h}.png`, Buffer.from(png, 'base64'));
  }
  // Esc는 창을 닫는다 (PC 키보드)
  await win.keyboard.press('Escape');
  await W(500);
  console.log('오류', errs.length ? errs.join(' / ') : '없음');
  await app.close();
})();
