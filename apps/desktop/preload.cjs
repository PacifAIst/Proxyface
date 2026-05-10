// Context bridge — expose safe Electron APIs to the renderer if needed.
// Currently empty; ProxyFace runs as a pure web app.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
});