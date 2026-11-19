// PC(스팀) 빌드 진입점 (GDD 10장 M9). 웹 빌드(dist)를 창 하나로 띄운다.
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const smoke = process.argv.includes('--smoke-test');
if (smoke) {
  app.setPath('userData', path.join(require('node:os').tmpdir(), `pawnisher-smoke-${process.pid}`));
  app.disableHardwareAcceleration();
  setTimeout(() => { console.error('SMOKE timeout'); app.exit(1); }, 60000).unref();
}

// 한 번에 하나만 (D-531): 두 번째 실행은 이미 뜬 창을 앞으로 가져오고 끝난다 (저장 파일을 두 창이 같이 쓰지 않게)
if (!smoke && !app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}
// 출시판(패키지)에는 기본 메뉴가 없다 (D-531) — Ctrl+R 새로고침 · 개발자 도구 단축키가 메뉴에서 온다
if (app.isPackaged) Menu.setApplicationMenu(null);

// 스팀 연동은 steamworks.js가 설치되어 있고 STEAM_APP_ID가 있을 때만 켠다 (개발 중에는 없어도 실행된다)
let steam = null;
try {
  const appId = Number(process.env.STEAM_APP_ID || 0);
  if (appId) steam = require('steamworks.js').init(appId);
} catch {
  steam = null;
}

/** 게임 페이지 (dist/index.html) — 창은 여기서 벗어나지 못한다 */
const PAGE = pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).href;
const DIST = pathToFileURL(path.join(__dirname, '..', 'dist') + path.sep).href;
/** IPC를 부른 쪽이 우리 창의 맨 위 문서(dist 안 file://)인가 (코드 리뷰 9 — 다른 프레임 · 다른 주소가 창 기능을 부르지 못하게) */
const trusted = (e) => {
  const f = e.senderFrame;
  return !!f && f.parent === null && typeof f.url === 'string' && f.url.startsWith(DIST) && !!main && e.sender === main.webContents;
};

ipcMain.handle('achievement', (e, id) => {
  if (!steam || !trusted(e)) return false;
  try {
    return steam.achievement.activate(String(id));
  } catch {
    return false;
  }
});

/** 지금 창 (두 번째 실행 · IPC가 찾는다) */
let main = null;
/** 전체 화면 켜고 끄기 → 바뀐 상태 */
const toggleFull = (win) => {
  if (!win) return false;
  win.setFullScreen(!win.isFullScreen());
  return win.isFullScreen();
};
// 웹 코드에서 부르는 창 기능 (D-531, src/slice/platform.ts): 게임 끝내기 · 전체 화면
// 끝내기 전 저장은 웹 쪽이 먼저 한다 (platform.ts quitGame → persistNow → quit)
ipcMain.handle('quit', (e) => { if (trusted(e)) app.quit(); });
ipcMain.handle('fullscreen', (e) => trusted(e) && toggleFull(BrowserWindow.fromWebContents(e.sender)));
ipcMain.handle('is-fullscreen', (e) => trusted(e) && !!BrowserWindow.fromWebContents(e.sender)?.isFullScreen());
// 창 단단히 (코드 리뷰 9): 게임 페이지 밖으로 가는 이동 · 새 창 · 웹뷰를 모두 막는다 (내용은 모두 로컬)
app.on('web-contents-created', (_e, wc) => {
  wc.on('will-navigate', (ev, url) => { if (url !== PAGE) ev.preventDefault(); });
  wc.on('will-redirect', (ev, url) => { if (url !== PAGE) ev.preventDefault(); });
  // 새 창은 늘 막고, 스튜디오 사이트(처리방침 등 — D-636)의 https 주소만 기본 브라우저로 넘긴다
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\/graviton94\.github\.io\//.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  wc.on('will-attach-webview', (ev) => ev.preventDefault());
});
app.on('second-instance', () => {
  if (!main) return;
  if (main.isMinimized()) main.restore();
  main.focus();
});

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: '#16141C',
    autoHideMenuBar: true,
    show: !smoke,
    title: 'Pawnisher : Checkmate',
    // 출시판은 개발자 도구를 열 수 없다 (D-531)
    // 모래 상자 · 격리 (코드 리뷰 9): 웹 코드는 Node에 닿지 못하고, preload는 창 기능 넷만 내보인다
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true, devTools: !app.isPackaged },
  });
  main = win;
  win.on('closed', () => { if (main === win) main = null; });
  // F11 · Alt+Enter = 전체 화면 (메뉴가 없어도 동작). 출시판은 새로고침 · 개발자 도구 키를 먹는다
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    const key = input.key;
    if (key === 'F11' || (key === 'Enter' && input.alt)) {
      e.preventDefault();
      toggleFull(win);
      return;
    }
    if (!app.isPackaged) return;
    const mod = input.control || input.meta;
    if (key === 'F5' || key === 'F12' || (mod && (key.toLowerCase() === 'r' || (input.shift && key.toLowerCase() === 'i')))) e.preventDefault();
  });
  // D-429: 기본 모바일 915×412의 읽기 크기를 기준으로 PC UI 전체를 확대한다.
  // 1280 폭에서 정수 내림으로 ×1에 머물던 문제를 제거한다.
  // 확대 뒤 실제 DPR의 도트 정렬은 pxsnap.ts와 BoardRenderer가 담당한다.
  const fit = () => {
    const [w, h] = win.getContentSize();
    const s = Math.max(1, Math.min(w / 915, h / 412));
    if (win.webContents.getZoomFactor() !== s) win.webContents.setZoomFactor(s);
  };
  win.on('resize', fit);
  win.webContents.on('did-finish-load', fit);
  if (!smoke) win.maximize();
  if (smoke) {
    win.webContents.on('did-fail-load', (_e, code, message) => { console.error('SMOKE load', code, message); app.exit(1); });
    win.webContents.on('render-process-gone', (_e, details) => { console.error('SMOKE renderer', details.reason); app.exit(1); });
    win.webContents.on('did-finish-load', async () => {
      try {
        const result = await win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const until=Date.now()+30000;const timer=setInterval(()=>{if(document.querySelector('.op-press,.op-menu,.prologue')?.checkVisibility()&&!document.querySelector('#boot')&&document.fonts.status==='loaded'){clearInterval(timer);resolve({title:document.title,width:innerWidth,height:innerHeight})}else if(Date.now()>until){clearInterval(timer);reject(new Error('game UI did not start'))}},100)})`);
        if (process.env.SMOKE_SHOT) require('node:fs').writeFileSync(process.env.SMOKE_SHOT, (await win.webContents.capturePage()).toPNG());
        const proof = { success: true, ...result, version: app.getVersion(), platform: process.platform, arch: process.arch };
        if (process.env.SMOKE_META) require('node:fs').writeFileSync(process.env.SMOKE_META, JSON.stringify(proof, null, 2));
        console.log('SMOKE PASS', JSON.stringify(proof));
        app.exit(0);
      } catch (e) { console.error('SMOKE failed', String(e)); app.exit(1); }
    });
  }
  win.loadURL(PAGE);
};

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
