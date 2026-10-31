const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('VelvetDesktop', Object.freeze({
  embedded: true,
  quit: () => ipcRenderer.invoke('velvet:quit'),
}));
