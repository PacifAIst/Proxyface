// Minimal preload — Electron detection now uses navigator.userAgent in renderer.
// contextBridge kept for future use.
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
});
