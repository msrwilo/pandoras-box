// Lo poco que la interfaz puede pedirle a la app.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('pandora', {
  app: true,
  quit: () => ipcRenderer.send('quit'),
  onFront: fn => ipcRenderer.on('front', (_e, on) => fn(!!on)),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  // Actualización automática desde GitHub.
  onActualizacion: fn => ipcRenderer.on('actualizacion', (_e, r) => fn(r)),
  buscarActualizacion: () => ipcRenderer.invoke('buscar-actualizacion'),
  reiniciarParaActualizar: () => ipcRenderer.send('reiniciar-para-actualizar'),
  version: () => ipcRenderer.invoke('version'),
});
