// 웹 코드에 노출하는 네이티브 기능 (스팀 업적 · 끝내기 · 전체 화면 D-531). 웹·안드로이드에서는 window.pawnisherNative가 없다.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pawnisherNative', {
  achievement: (id) => ipcRenderer.invoke('achievement', id),
  quit: () => ipcRenderer.invoke('quit'),
  toggleFullscreen: () => ipcRenderer.invoke('fullscreen'),
  isFullscreen: () => ipcRenderer.invoke('is-fullscreen'),
});
