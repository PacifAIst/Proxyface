const { app, BrowserWindow, Tray, Menu, nativeImage, dialog, protocol, net, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); process.exit(0); }

// WebGPU + Speech API flags
app.commandLine.appendSwitch('enable-unsafe-webgpu');
app.commandLine.appendSwitch('enable-features', 'Vulkan,UseSkiaRenderer,WebGPU');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('enable-speech-api');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required'); // allow Web Audio API without user click

protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
}]);

let win = null;
let tray = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 800, minHeight: 600,
    frame: true, alwaysOnTop: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webgl: true,
    },
    title: 'ProxyFace',
    backgroundColor: '#06070d',
    show: false,
  });

  // Grant mic + camera permissions automatically
  win.webContents.session.setPermissionRequestHandler((_wc, permission, callback) => {
    const allowed = ['media', 'microphone', 'camera', 'audioCapture', 'videoCapture', 'mediaKeySystem'];
    callback(allowed.includes(permission));
  });

  // Also handle permission checks (Electron 15+)
  win.webContents.session.setPermissionCheckHandler((_wc, permission) => {
    const allowed = ['media', 'microphone', 'camera', 'audioCapture', 'videoCapture'];
    return allowed.includes(permission);
  });

  // Open https:// links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    const indexPath = path.join(process.resourcesPath, 'dist', 'index.html');
    if (!fs.existsSync(indexPath)) {
      dialog.showErrorBox('ProxyFace', `Cannot find:\n${indexPath}\n\nPlease reinstall.`);
      app.quit();
      return;
    }

    const distDir = path.join(process.resourcesPath, 'dist');

    // Redirect wrong file:// drive-root paths → resources/dist/
    win.webContents.session.webRequest.onBeforeRequest((details, callback) => {
      const url = details.url;
      // Catch /sprites/, /models/, /sounds/ folders AND root-level audio files like /easter.mp3
      const folderMatch = url.match(/^file:\/\/\/[A-Za-z]:\/(sprites|models|sounds)(\/.*)?$/);
      const audioMatch  = url.match(/^file:\/\/\/[A-Za-z]:\/([^/]+\.(mp3|wav|ogg|aac|flac))$/);
      if (folderMatch || audioMatch) {
        const relativePath = folderMatch
          ? (folderMatch[1] + (folderMatch[2] || ''))
          : (audioMatch && audioMatch[1]) || '';
        const newFile = path.join(distDir, relativePath).replace(/\\/g, '/');
        callback({ redirectURL: 'file:///' + newFile });
        return;
      }
      callback({});
    });

    win.loadFile(indexPath).catch(err => {
      dialog.showErrorBox('ProxyFace load error', err.message);
    });
  }

  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.on('close', (e) => { e.preventDefault(); win.hide(); });
}

app.on('second-instance', () => {
  if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
});

function createTray() {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABOSURBVDiNY2AYBfQDjIyM/ykxgIGBgYGJgYEBbgADAwMDIwMDA9wABgYGBiYGBga4AQwMDAxMDAwMcAMYGBgYmBgYGOAGMDAwMAAAVg8EAVAiAAAAAElFTkSuQmCC'
  );
  tray = new Tray(icon);
  tray.setToolTip('ProxyFace');
  const updateMenu = () => {
    const isTop = win?.isAlwaysOnTop() ?? false;
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: win?.isVisible() ? 'Hide' : 'Show', click: () => win?.isVisible() ? win.hide() : win.show() },
      { label: isTop ? '✓ Always on top' : 'Always on top', click: () => { win?.setAlwaysOnTop(!isTop); updateMenu(); } },
      { type: 'separator' },
      { label: 'Open DevTools', click: () => win?.webContents.openDevTools({ mode: 'detach' }) },
      { type: 'separator' },
      { label: 'Quit ProxyFace', click: () => { win?.removeAllListeners('close'); app.quit(); } },
    ]));
  };
  updateMenu();
  tray.on('click', () => win?.isVisible() ? win.hide() : win.show());
}

app.whenReady().then(() => {
  const distDir = app.isPackaged
    ? path.join(process.resourcesPath, 'dist')
    : path.join(__dirname, '../../apps/web/dist');

  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    const rel = url.pathname.replace(/^\/dist\//, '');
    const filePath = path.join(distDir, rel).replace(/\\/g, '/');
    return net.fetch('file:///' + filePath);
  });

  createWindow();
  createTray();
});

app.on('window-all-closed', (e) => e.preventDefault());
