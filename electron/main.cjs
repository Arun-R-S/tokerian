const { app, BrowserWindow, session, ipcMain, Menu } = require('electron');
const path = require('node:path');

// Hardware acceleration and video decode flags
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 780,
    minWidth: 900,
    minHeight: 560,
    backgroundColor: '#07090e',
    title: 'Tokerian',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Disables browser CORS restrictions for cross-origin IPTV streams
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // Seamless CORS bypass for any live media stream
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = Object.assign({}, details.responseHeaders);
    responseHeaders['access-control-allow-origin'] = ['*'];
    responseHeaders['access-control-allow-methods'] = ['GET, HEAD, OPTIONS, POST'];
    responseHeaders['access-control-allow-headers'] = ['*'];
    callback({ responseHeaders });
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    const devUrl = process.env.VITE_DEV_SERVER_URL;
    const tryLoad = () => {
      mainWindow?.loadURL(devUrl).catch(() => {
        setTimeout(tryLoad, 600);
      });
    };
    tryLoad();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Window IPC actions
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('window-toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

// External Players Engine (VLC & MPV Spawner ported)
const fs = require('node:fs');
const { spawn } = require('node:child_process');

function getDefaultVlcPaths() {
  if (process.platform === 'win32') {
    return [
      path.join('C:', 'Program Files', 'VideoLAN', 'VLC', 'vlc.exe'),
      path.join('C:', 'Program Files (x86)', 'VideoLAN', 'VLC', 'vlc.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'VLC', 'vlc.exe'),
    ];
  } else if (process.platform === 'darwin') {
    return [
      '/Applications/VLC.app/Contents/MacOS/VLC',
      path.join(process.env.HOME || '', 'Applications/VLC.app/Contents/MacOS/VLC'),
    ];
  } else {
    return ['/usr/bin/vlc', '/usr/local/bin/vlc', '/snap/bin/vlc', 'vlc'];
  }
}

function getDefaultMpvPaths() {
  if (process.platform === 'win32') {
    return [
      path.join('C:', 'Program Files', 'mpv', 'mpv.exe'),
      path.join('C:', 'Program Files (x86)', 'mpv', 'mpv.exe'),
      path.join('C:', 'ProgramData', 'chocolatey', 'bin', 'mpv.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'mpv', 'mpv.exe'),
    ];
  } else if (process.platform === 'darwin') {
    return [
      '/Applications/mpv.app/Contents/MacOS/mpv',
      '/opt/homebrew/bin/mpv',
      '/usr/local/bin/mpv',
    ];
  } else {
    return ['/usr/bin/mpv', '/usr/local/bin/mpv', '/snap/bin/mpv', 'mpv'];
  }
}

function resolvePlayerExecutable(player, customPath) {
  if (customPath && customPath.trim()) {
    const trimmed = customPath.trim();
    if (fs.existsSync(trimmed)) return trimmed;
  }

  const defaultList = player === 'vlc' ? getDefaultVlcPaths() : getDefaultMpvPaths();
  for (const p of defaultList) {
    if (fs.existsSync(p)) return p;
  }

  // Fallback to system PATH binary name
  return player === 'vlc' ? 'vlc' : 'mpv';
}

ipcMain.handle('check-external-players', async (_event, customPaths = {}) => {
  const vlcPath = resolvePlayerExecutable('vlc', customPaths.vlc);
  const mpvPath = resolvePlayerExecutable('mpv', customPaths.mpv);

  return {
    vlc: fs.existsSync(vlcPath),
    mpv: fs.existsSync(mpvPath),
    vlcPath,
    mpvPath,
    platform: process.platform,
  };
});

const activeExternalProcesses = new Map();

ipcMain.handle('open-external-player', async (_event, options) => {
  const { player = 'vlc', url, title, userAgent, referer, customPath } = options || {};

  if (!url) {
    return { success: false, error: 'No stream URL provided' };
  }

  const executable = resolvePlayerExecutable(player, customPath);
  const args = [];

  if (player === 'vlc') {
    if (title) args.push(`:meta-title=${title}`);
    if (userAgent) args.push(`:http-user-agent=${userAgent}`);
    if (referer) args.push(`:http-referrer=${referer}`);
    args.push(url);
  } else {
    // MPV args ported
    args.push('--ytdl=no');
    if (title) args.push(`--force-media-title=${title}`);
    if (userAgent) args.push(`--user-agent=${userAgent}`);
    if (referer) args.push(`--referrer=${referer}`);
    args.push(url);
  }

  try {
    const proc = spawn(executable, args, {
      detached: true,
      stdio: 'ignore',
      shell: false,
    });

    proc.unref();

    const pid = proc.pid;
    activeExternalProcesses.set(pid, { player, title, url, startTime: Date.now() });

    proc.on('close', () => {
      activeExternalProcesses.delete(pid);
    });

    return {
      success: true,
      player,
      executable,
      pid,
    };
  } catch (err) {
    console.error(`[External Player] Failed to launch ${player}:`, err);
    return {
      success: false,
      player,
      executable,
      error: err instanceof Error ? err.message : String(err),
    };
  }
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
