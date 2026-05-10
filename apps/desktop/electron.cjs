const { app, BrowserWindow, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');

const DEV_URL = 'http://localhost:5173';
const isDev = process.env.NODE_ENV !== 'production';

// Required BEFORE app.whenReady() — enables WebGPU in Electron's Chromium
app.commandLine.appendSwitch('enable-unsafe-webgpu');
app.commandLine.appendSwitch('enable-features', 'Vulkan,UseSkiaRenderer,WebGPU');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('disable-gpu-sandbox');

let win = null;
let tray = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: true,
    alwaysOnTop: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webgl: true,
    },
    title: 'ProxyFace',
    backgroundColor: '#0a0a0a',
    show: false,
  });

  if (isDev) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, '../../apps/web/dist/index.html'));
  }

  // Start maximized
  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
  });

  win.on('close', (e) => {
    e.preventDefault();
    win.hide();
  });
}

function createTray() {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABOSURBVDiNY2AYBfQDjIyM/ykxgIGBgYGJgYEBbgADAwMDIwMDA9wABgYGBiYGBga4AQwMDAxMDAwMcAMYGBgYmBgYGOAGMDAwMAAAVg8EAVAiAAAAAElFTkSuQmCC'
  );

  tray = new Tray(icon);
  tray.setToolTip('ProxyFace');

  const updateMenu = () => {
    const isTop = win?.isAlwaysOnTop() ?? false;
    tray.setContextMenu(Menu.buildFromTemplate([
      {
        label: win?.isVisible() ? 'Hide' : 'Show',
        click: () => win?.isVisible() ? win.hide() : win.show(),
      },
      {
        label: isTop ? '✓ Always on top' : 'Always on top',
        click: () => { win?.setAlwaysOnTop(!isTop); updateMenu(); },
      },
      { type: 'separator' },
      {
        label: 'Open DevTools',
        click: () => win?.webContents.openDevTools({ mode: 'detach' }),
      },
      { type: 'separator' },
      {
        label: 'Quit ProxyFace',
        click: () => { win?.removeAllListeners('close'); app.quit(); },
      },
    ]));
  };

  updateMenu();
  tray.on('click', () => win?.isVisible() ? win.hide() : win.show());
}

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', (e) => e.preventDefault());
