const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('VelvetDesktop', Object.freeze({
  embedded: true,
  automation: process.argv.includes('--velvet-automation'),
  quit: () => ipcRenderer.invoke('velvet:quit'),
}));
