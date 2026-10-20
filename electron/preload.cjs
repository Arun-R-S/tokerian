const { contextBridge, ipcRenderer } = require('electron');

const desktopApi = {
  isElectron: true,
  platform: process.platform,
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  toggleFullscreen: () => ipcRenderer.send('window-toggle-fullscreen'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizedChange: (callback) => {
    const handler = (_event, isMax) => callback(isMax);
    ipcRenderer.on('window-maximize-changed', handler);
    return () => {
      ipcRenderer.removeListener('window-maximize-changed', handler);
    };
  },
  checkExternalPlayers: (customPaths) => ipcRenderer.invoke('check-external-players', customPaths),
  openExternalPlayer: (options) => ipcRenderer.invoke('open-external-player', options),
  openVlc: (url, title, customPath) => ipcRenderer.invoke('open-external-player', { player: 'vlc', url, title, customPath }),
  openMpv: (url, title, customPath) => ipcRenderer.invoke('open-external-player', { player: 'mpv', url, title, customPath }),
};

contextBridge.exposeInMainWorld('tokerianDesktop', desktopApi);
contextBridge.exposeInMainWorld('electronAPI', desktopApi);

