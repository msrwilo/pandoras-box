// Pandora.exe: abre la interfaz a pantalla completa con el servidor por dentro.
'use strict';
const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');

// Ajustes, favoritos y partidas viven junto a Pandora.exe, en la carpeta datos.
// Empaquetada (Pandora.exe): junto al .exe. En desarrollo (npm start): junto al código.
const exeDir = app.isPackaged ? path.dirname(process.execPath) : __dirname;
process.env.PANDORA_DATA = process.env.PANDORA_DATA || path.join(exeDir, 'datos');
app.setPath('userData', path.join(process.env.PANDORA_DATA, 'navegador'));

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');

if (!app.requestSingleInstanceLock()) { app.quit(); }

let win = null;
function show() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show(); win.setFullScreen(true); win.focus(); win.moveTop();
}
app.on('second-instance', show);

app.whenReady().then(async () => {
  const appDir = __dirname;
  let srv, port;
  try {
    srv = require(path.join(appDir, 'server.js'));
    port = await srv.start(0);
  } catch (e) {
    dialog.showErrorBox('Pandora', 'No pude iniciar: ' + e.message);
    app.quit(); return;
  }
  win = new BrowserWindow({
    title: 'Pandora’s Box', fullscreen: true, autoHideMenuBar: true, backgroundColor: '#020110', show: false,
    icon: path.join(appDir, 'pandora.ico'),
    webPreferences: { preload: path.join(appDir, 'preload.js'), backgroundThrottling: false, contextIsolation: true },
  });
  win.setMenuBarVisibility(false);
  win.once('ready-to-show', () => win.show());
  win.loadURL(`http://127.0.0.1:${port}/`);

  // Al abrir un juego, Pandora espera a que el juego esté al frente y entonces se hace a un lado;
  // al cerrarlo, regresa al frente.
  srv.events.on('game-window', () => { if (win && !win.isMinimized()) win.minimize(); });
  srv.events.on('game-end', () => setTimeout(show, 300));

  ipcMain.on('quit', () => app.quit());
  // Elegir la carpeta de LaunchBox con el explorador de Windows.
  ipcMain.handle('pick-folder', async () => {
    const r = await dialog.showOpenDialog(win, { title: 'Elige la carpeta de LaunchBox', properties: ['openDirectory'] });
    return r.canceled ? null : r.filePaths[0];
  });
  // Avisa a la interfaz cuando deja de estar al frente (minimizada o en segundo plano) para que pause
  // videos y sonido; al volver, los reanuda.
  const tell = on => { if (win && !win.isDestroyed()) win.webContents.send('front', on); };
  win.on('minimize', () => tell(false)); win.on('hide', () => tell(false)); win.on('blur', () => tell(false));
  win.on('restore', () => tell(true)); win.on('show', () => tell(!win.isMinimized())); win.on('focus', () => tell(true));

  // Solo para pruebas: PANDORA_SHOT=archivo.png guarda una captura a los 6 s y cierra.
  if (process.env.PANDORA_SHOT) setTimeout(async () => {
    const img = await win.webContents.capturePage();
    fs.writeFileSync(process.env.PANDORA_SHOT, img.toPNG()); app.quit();
  }, 6000);
});
app.on('window-all-closed', () => app.quit());
