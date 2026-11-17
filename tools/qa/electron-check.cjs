// PC 창 기능 확인 (D-531): `npm run build:release` 뒤 xvfb-run node tools/qa/electron-check.cjs
// preload가 끝내기 · 전체 화면을 내놓는가, F11 · Alt+Enter가 전체 화면을 켜고 끄는가, 두 번째 실행이 바로 끝나는가.
const { _electron: electron } = require('playwright');
const { spawnSync } = require('node:child_process');
(async () => {
  const app = await electron.launch({ executablePath: require('electron'), args: ['.', '--no-sandbox'] });
  const win = await app.firstWindow();
  await win.waitForSelector('#boot', { state: 'detached', timeout: 60000 });
  const api = await win.evaluate(() => Object.keys(window.pawnisherNative || {}));
  const full = () => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen());
  const ipc = await win.evaluate(() => window.pawnisherNative.toggleFullscreen());
  await win.waitForTimeout(800);
  const afterIpc = await full();
  // 진짜 키 입력 길(before-input-event)로 보낸다
  const key = (keyCode, modifiers = []) => app.evaluate(({ BrowserWindow }, k) => { const wc = BrowserWindow.getAllWindows()[0].webContents; wc.sendInputEvent({ type: 'keyDown', keyCode: k.keyCode, modifiers: k.modifiers }); wc.sendInputEvent({ type: 'keyUp', keyCode: k.keyCode, modifiers: k.modifiers }); }, { keyCode, modifiers });
  await key('F11');
  await win.waitForTimeout(800);
  const afterF11 = await full();
  await key('Enter', ['alt']);
  await win.waitForTimeout(800);
  const afterAltEnter = await full();
  const menu = await app.evaluate(({ Menu, app: a }) => ({ packaged: a.isPackaged, menu: !!Menu.getApplicationMenu() }));
  // 설정 창(대국 메뉴 단추 → 멈춤 → 설정, D-538)에 PC 줄(전체 화면)이 보이고, 전체 화면 단추가 실제로 켜고 끈다 — 게임 끝내기는 메인 메뉴로 옮겼다
  await win.evaluate(() => document.getElementById('btn-menu').click());
  await win.waitForTimeout(600);
  await win.evaluate(() => document.querySelector('[data-pz-set]').click());
  await win.waitForTimeout(600);
  await win.evaluate(() => document.querySelector('[data-set-tab="screen"]')?.click());
  await win.waitForTimeout(600);
  const rows = await win.evaluate(() => ({ full: !!document.querySelector('[data-full]') }));
  const before = await full();
  await win.evaluate(() => document.querySelector('[data-full]')?.click());
  await win.waitForTimeout(800);
  const settingsToggled = (await full()) !== before;
  await win.screenshot({ path: `production/qa/evidence/${new Date().toISOString().slice(0, 10)}-electron-settings.png` });
  Object.assign(menu, { settingsRows: rows, settingsToggled });
  // 두 번째 실행: 잠금을 못 얻고 곧 끝나야 한다
  const t0 = Date.now();
  const second = spawnSync(require('electron'), ['.', '--no-sandbox'], { timeout: 20000 });
  console.log(JSON.stringify({ api, ipc, afterIpc, afterF11, afterAltEnter, ...menu, secondExit: second.status, secondMs: Date.now() - t0 }));
  await win.evaluate(() => window.pawnisherNative.quit());
  await app.waitForEvent('close', { timeout: 10000 }).catch(() => app.close());
})();
