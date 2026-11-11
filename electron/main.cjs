// PC(스팀) 빌드 진입점 (GDD 10장 M9). 웹 빌드(dist)를 창 하나로 띄운다.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

// 스팀 연동은 steamworks.js가 설치되어 있고 STEAM_APP_ID가 있을 때만 켠다 (개발 중에는 없어도 실행된다)
let steam = null;
try {
  const appId = Number(process.env.STEAM_APP_ID || 0);
  if (appId) steam = require('steamworks.js').init(appId);
} catch {
  steam = null;
}

ipcMain.handle('achievement', (_e, id) => {
  if (!steam) return false;
  try {
    return steam.achievement.activate(String(id));
  } catch {
    return false;
  }
});

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: '#16141C',
    autoHideMenuBar: true,
    title: 'Pawnisher : Checkmate',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true },
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
  win.maximize();
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
};

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
