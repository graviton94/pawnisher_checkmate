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
  // PC 화면 맞춤 (D-392): 게임 화면은 모바일 가로 기준이고, 가장 작은 지원 화면은 667×375(작은 폰 가로)다 — 창이 그 몇 배인지 보고 **정수 배율**로 확대한다.
  // 정수라야 도트 그림이 고르게 커진다(1366×768 → ×2 = 논리 683×384, 1920×1080 → ×2 = 960×540, 2560×1440 → ×3 = 853×480, 3840×2160 → ×5). 확대하면 DPR이 바뀌고 pxsnap.ts가 --px를 다시 맞춘다.
  const fit = () => {
    const [w, h] = win.getContentSize();
    const s = Math.max(1, Math.floor(Math.min(w / 667, h / 375)));
    if (win.webContents.getZoomFactor() !== s) win.webContents.setZoomFactor(s);
  };
  win.on('resize', fit);
  win.webContents.on('did-finish-load', fit);
  win.maximize();
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
};

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
