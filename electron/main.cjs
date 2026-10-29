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
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
};

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
