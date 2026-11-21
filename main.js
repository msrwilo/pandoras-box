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

// Actualización automática desde GitHub (lib/actualizar.js). Si el módulo falla, Pandora sigue sin él.
const DATA_DIR = process.env.PANDORA_DATA;
function logArranque(m) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.appendFileSync(path.join(DATA_DIR, 'registro.txt'), `${new Date().toLocaleString('es-MX', { hour12: false })}  ${m}\n`); } catch {}
}
let upd = null;
try { upd = require('./lib/actualizar.js').crear({ appDir: __dirname, dataDir: DATA_DIR, log: logArranque }); }
catch (e) { logArranque('Actualización: no se pudo cargar el actualizador (' + e.message + ')'); }
const autoActualizar = () => { try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'ajustes.json'), 'utf8')).autoUpdate !== false; } catch { return true; } };
const reiniciar = () => { app.relaunch(); app.exit(0); };

let win = null;
function show() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show(); win.setFullScreen(true); win.focus(); win.moveTop();
}
app.on('second-instance', show);

app.whenReady().then(async () => {
  const appDir = __dirname;
  // Lo que se descargó en la sesión anterior se instala aquí, antes de cargar nada más.
  // Si cambió este archivo, el preload o el actualizador, se reinicia para usar los nuevos.
  let instalados = [];
  try { instalados = upd && upd.hayPendiente() ? upd.instalarPendiente() : []; } catch {}
  if (instalados.some(f => /^(main|preload)\.js$|^lib\/actualizar\.js$|^package\.json$/.test(f))) return reiniciar();
  let srv, port;
  try {
    srv = require(path.join(appDir, 'server.js'));
    port = await srv.start(0);
  } catch (e) {
    // Si recién se instaló una actualización y ya no arranca, se regresa a la anterior y se reinicia.
    if (instalados.length && upd && upd.revertir()) return reiniciar();
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
  // Errores de la interfaz al registro (datos/registro.txt): si la pantalla se queda en el logo, ahí se ve por qué.
  const wlog = m => { try { srv.log(m); } catch {} };
  win.webContents.on('console-message', (e, level, message, line, source) => { if (level >= 2) wlog(`Pantalla (error): ${String(message).slice(0, 300)} — ${String(source || '').split('/').pop()}:${line}`); });
  win.webContents.on('did-fail-load', (e, code, desc, url) => wlog(`Pantalla: no cargó ${url} (${code} ${desc})`));
  win.webContents.on('render-process-gone', (e, d) => wlog(`Pantalla: el proceso se cerró (${d.reason})`));
  win.webContents.on('unresponsive', () => wlog('Pantalla: dejó de responder'));
  win.loadURL(`http://127.0.0.1:${port}/`);

  // Al abrir un juego, Pandora espera a que el juego esté al frente y entonces se hace a un lado;
  // al cerrarlo, regresa al frente.
  let jugando = false;
  srv.events.on('game-start', () => { jugando = true; });
  srv.events.on('game-window', () => { jugando = true; if (win && !win.isMinimized()) win.minimize(); });
  srv.events.on('game-end', () => { jugando = false; setTimeout(show, 300); });

  // Busca cambios en GitHub al minuto de abrir y luego cada 30 minutos. Cuando hay una versión lista,
  // la interfaz espera a que nadie toque el control unos minutos y pide reiniciar (nunca durante un juego).
  const avisar = r => { if (win && !win.isDestroyed()) win.webContents.send('actualizacion', r); };
  if (instalados.length) win.webContents.once('did-finish-load', () => setTimeout(() => avisar({ estado: 'instalada', cambios: instalados.length }), 2500));
  async function revisar(manual) {
    if (!upd || (!manual && !autoActualizar())) return { estado: 'apagada' };
    const r = await upd.buscar();
    if (r.estado === 'lista' || r.estado === 'requiere-zip' || manual) avisar({ ...r, manual: !!manual });
    return r;
  }
  setTimeout(revisar, 60 * 1000);
  setInterval(revisar, 30 * 60 * 1000);
  ipcMain.handle('buscar-actualizacion', () => revisar(true));
  ipcMain.handle('version', () => ({ app: app.getVersion(), ...(upd ? upd.version() : {}) }));
  ipcMain.on('reiniciar-para-actualizar', () => { if (!jugando && upd && upd.hayPendiente()) reiniciar(); });

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
