const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tokerianDesktop', {
  isElectron: true,
  platform: process.platform,
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  toggleFullscreen: () => ipcRenderer.send('window-toggle-fullscreen'),
  checkExternalPlayers: (customPaths) => ipcRenderer.invoke('check-external-players', customPaths),
  openExternalPlayer: (options) => ipcRenderer.invoke('open-external-player', options),
  openVlc: (url, title, customPath) => ipcRenderer.invoke('open-external-player', { player: 'vlc', url, title, customPath }),
  openMpv: (url, title, customPath) => ipcRenderer.invoke('open-external-player', { player: 'mpv', url, title, customPath }),
});
