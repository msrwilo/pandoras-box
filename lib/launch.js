// Lanzador: arma la línea de comandos igual que LaunchBox y vigila el juego mientras corre.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');

const isWin = process.platform === 'win32';
const isAbsWin = p => /^[a-zA-Z]:[\\/]|^\\\\/.test(p);

module.exports = function createLauncher({ getLB, appDir, onEnd, events, getSettings, log = () => {} }) {
  let emulators = new Map(), platCmd = new Map(), lbExit = null;

  // El atajo de LaunchBox para salir del juego (InputBindings.xml): «mantener» un botón y «presionar» otro.
  // Sus números de botón siguen el orden de XInput: 1 A, 2 B, 3 X, 4 Y, 5 LB, 6 RB, 7 Vista, 8 Menú, 9 LS, 10 RS.
  const LB_BTN = { Button1: 'a', Button2: 'b', Button3: 'x', Button4: 'y', Button5: 'lb', Button6: 'rb', Button7: 'view', Button8: 'menu', Button9: 'ls', Button10: 'rs',
    TriggerLeft: 'lt', TriggerRight: 'rt', DPadUp: 'up', DPadDown: 'down', DPadLeft: 'left', DPadRight: 'right' };
  function loadExitBinding(records, readXML) {
    try {
      const xml = readXML(path.join(getLB(), 'Data', 'InputBindings.xml'));
      const all = records(xml, 'InputBinding');
      const b = all.find(x => x.InputAction === 'BigBoxExitGame') || all.find(x => x.InputAction === 'LaunchBoxExitGame');
      if (!b) return null;
      const hold = LB_BTN[b.ControllerHoldBinding], press = LB_BTN[b.ControllerBinding];
      if (!press) return null;
      return { list: hold ? [hold, press] : [press], hold: hold || null, press };
    } catch { return null; }
  }

  function load(records, readXML) {
    lbExit = loadExitBinding(records, readXML);
    if (lbExit) log(`Atajo de LaunchBox para salir: mantener ${lbExit.hold || '—'} y presionar ${lbExit.press}`);
    const xml = readXML(path.join(getLB(), 'Data', 'Emulators.xml'));
    emulators = new Map(records(xml, 'Emulator').map(e => [e.ID, e]));
    platCmd = new Map();
    // Una misma plataforma puede tener varias líneas para el mismo emulador (un núcleo por línea):
    // como LaunchBox, se usa la marcada como predeterminada; si ninguna lo está, la primera.
    for (const m of records(xml, 'EmulatorPlatform')) {
      const k = m.Emulator + '|' + m.Platform, prev = platCmd.get(k);
      if (!prev || (m.Default === 'true' && prev.Default !== 'true')) platCmd.set(k, m);
    }
  }

  // Rutas de LaunchBox: relativas a su carpeta o absolutas (H:\...).
  function resolve(p) {
    if (!p) return '';
    if (isAbsWin(p)) return isWin ? path.normalize(p) : p;
    return path.resolve(getLB(), p.replace(/\\/g, path.sep));
  }
  const exists = p => { if (process.env.CUBO_FAKE) return true; try { return isWin || !isAbsWin(p) ? fs.existsSync(p) : true; } catch { return false; } };

  function build(game, app) {
    const src = app || game;
    const target = resolve(src.appPath);
    const useEmu = app ? app.useEmulator : !!game.emulatorId;
    const emuId = app ? (app.emulatorId || game.emulatorId) : game.emulatorId;
    const emu = useEmu && emuId ? emulators.get(emuId) : null;
    if (useEmu && emuId && !emu) return { error: 'El emulador asignado a este juego ya no existe en LaunchBox.' };

    if (emu) {
      const exe = resolve(emu.ApplicationPath);
      let cmd = (src.commandLine || '').trim();
      if (!cmd) {
        const pc = platCmd.get(emu.ID + '|' + game.platform);
        cmd = (pc && pc.CommandLine != null ? pc.CommandLine : emu.CommandLine || '').trim();
      }
      let rom = target;
      if (emu.FileNameWithoutExtensionAndPath === 'true') rom = path.basename(rom.replace(/\\/g, '/')).replace(/\.[^.]+$/, '');
      const quoted = emu.NoQuotes === 'true' ? rom : `"${rom}"`;
      let args;
      if (/%romfile%|%romlocation%|%romname%/i.test(cmd)) {
        args = cmd.replace(/%romfile%/gi, rom).replace(/%romlocation%/gi, path.dirname(target))
          .replace(/%romname%/gi, path.basename(target).replace(/\.[^.]+$/, ''));
      } else {
        args = cmd ? cmd + (emu.NoSpace === 'true' ? '' : ' ') + quoted : quoted;
      }
      return { exe, args, cwd: path.dirname(exe), kind: 'emulador', via: emu.Title, rom: target, needsRom: true };
    }

    const ext = path.extname(target).toLowerCase();
    const cwd = resolve(game.rootFolder) || path.dirname(target);
    if (ext === '.exe') return { exe: target, args: src.commandLine || '', cwd, kind: 'programa', via: path.basename(target) };
    if (ext === '.bat' || ext === '.cmd') return { exe: 'cmd.exe', args: `/c ""${target}" ${src.commandLine || ''}"`, cwd, kind: 'programa', via: path.basename(target), check: target };
    // Accesos directos (.lnk), enlaces (.url, steam://) y cualquier otro archivo: los abre Windows.
    return { exe: 'cmd.exe', args: `/c start "" /wait "${target}"`, cwd, kind: 'acceso', via: 'Windows', check: target };
  }

  // ---------- Partida en curso ----------
  let run = null, last = null;
  const W = isWin ? require('./win')() : { ok: false };
  if (isWin) log(W.ok ? `Funciones de Windows listas (XInput: ${W.xinput || 'no encontrado'})` : `Sin funciones de Windows: ${W.error}`);

  function launch(game, app) {
    if (run) return { error: `Ya está abierto «${run.title}».` };
    const c = build(game, app);
    if (c.error) return c;
    const mustExist = c.kind === 'emulador' ? c.exe : (c.check || c.exe);
    if (!exists(mustExist)) return { error: `No encuentro ${c.kind === 'emulador' ? 'el emulador' : 'el archivo'}: ${mustExist}` };
    if (c.needsRom && !exists(c.rom)) return { error: `No encuentro el juego: ${c.rom}` };
    let child;
    if (isWin) {
      child = spawn(c.exe, c.args ? [c.args] : [], {
        cwd: c.cwd, argv0: `"${c.exe}"`, windowsVerbatimArguments: true, stdio: 'ignore', windowsHide: false,
      });
    } else if (process.env.CUBO_FAKE) {
      child = spawn('sleep', [process.env.CUBO_FAKE]); // solo para pruebas fuera de Windows
    } else return { error: 'Solo puedo lanzar juegos en Windows.', dry: c };
    run = { child, id: game.id, title: (app && app.name) ? `${game.title} ${app.name}` : game.title, start: Date.now(), kind: c.kind, via: c.via, tracked: true, front: null, fronts: 0, high: new Set(), hidden: false };
    log(`Abrir «${run.title}» (pid ${child.pid}): "${c.exe}" ${c.args}`);
    if (W.ok && child.pid) W.allow(child.pid);
    child.on('error', err => { log('Error al abrir: ' + err.message); finish(`No se pudo abrir: ${err.message}`); });
    child.on('exit', code => {
      log(`El proceso ${child.pid} terminó (código ${code})`);
      // Si un acceso directo regresa enseguida (Steam, URL), no podemos seguir el juego.
      if (run && run.child === child && run.kind === 'acceso' && Date.now() - run.start < 8000) { run.tracked = false; hidePandora('acceso directo'); return; }
      // Algunos emuladores se relanzan a sí mismos: si queda un hijo vivo con ventana, seguimos con él.
      if (run && run.child === child && run.orphans?.size) {
        const alive = W.ok ? W.windowsOf(new Set(run.orphans.keys())) : [];
        if (alive.length) { run.rootPid = alive[0].pid; log(`Sigo con el proceso hijo ${alive[0].pid}`); return; }
      }
      finish();
    });
    run.rootPid = child.pid;
    startWatch();
    events && events.emit('game-start', child.pid);
    if (!W.ok) hidePandora('sin funciones de Windows');
    return { ok: true, command: `"${c.exe}" ${c.args}`, via: c.via };
  }

  // Pandora se hace a un lado (Electron minimiza su ventana) cuando el juego ya está al frente.
  function hidePandora(why) {
    if (!run || run.hidden) return;
    run.hidden = true; log('Pandora se minimiza: ' + why);
    events && events.emit('game-window');
  }

  function finish(error) {
    if (!run) return;
    const seconds = Math.round((Date.now() - run.start) / 1000);
    last = { id: run.id, title: run.title, seconds, error: error || null, at: Date.now() };
    stopWatch();
    const r = run; run = null;
    log(`Fin de «${r.title}» tras ${seconds} s${error ? ' · ' + error : ''}`);
    if (!error && seconds > 5) onEnd && onEnd(r.id, seconds);
    if (events && events.listenerCount('game-end')) events.emit('game-end');
    else focusApp();
  }

  function close(why = 'botón') {
    if (!run) return { ok: true };
    log('Cerrar juego: ' + why);
    if (!run.tracked) { finish(); return { ok: true }; }
    const r = run, child = run.child;
    const pids = new Set([child.pid, r.rootPid, ...(r.orphans ? r.orphans.keys() : [])]);
    // Primero se le pide cerrar (guarda partida), luego a la fuerza si no responde.
    for (const pid of pids) execFile('taskkill', ['/PID', String(pid), '/T'], () => {});
    setTimeout(() => { if (run === r) for (const pid of pids) execFile('taskkill', ['/PID', String(pid), '/T', '/F'], () => {}); }, 5000);
    setTimeout(() => { if (run === r) finish(); }, 9000);
    return { ok: true };
  }

  // ---------- Vigía: combinación para salir, ventana al frente y prioridad ----------
  const MASK = { up: 0x1, down: 0x2, left: 0x4, right: 0x8, menu: 0x10, view: 0x20, ls: 0x40, rs: 0x80, lb: 0x100, rb: 0x200, a: 0x1000, b: 0x2000, x: 0x4000, y: 0x8000 };
  // Por defecto se usa el mismo atajo que LaunchBox y se dispara al instante, como en LaunchBox.
  // Si eliges otra combinación en Pandora, se usa la tuya (sostenida el tiempo que elijas, o al instante).
  function comboOf() {
    const s = getSettings ? getSettings() : {};
    const useLB = s.exitFromLaunchBox !== false && lbExit;
    const list = useLB ? lbExit.list : Array.isArray(s.exitCombo) && s.exitCombo.length >= 2 ? s.exitCombo : ['ls', 'rs', 'b'];
    const hold = s.exitHold == null ? 0 : +s.exitHold;
    const holdMs = useLB ? 0 : Math.max(0, Math.min(3000, hold * 1000));
    let mask = 0, lt = false, rt = false;
    for (const b of list) { if (b === 'lt') lt = true; else if (b === 'rt') rt = true; else mask |= MASK[b] || 0; }
    return { list, mask, lt, rt, holdMs, from: useLB ? 'LaunchBox' : 'Pandora' };
  }
  let timer = null, psWatcher = null;
  function startWatch() {
    stopWatch();
    if (!isWin) return;
    const combo = comboOf();
    log(`Combinación para salir (${combo.from}): ${combo.list.join(' + ')} (${combo.holdMs ? combo.holdMs + ' ms' : 'al instante'})`);
    if (!W.ok || !W.xinput) startPsWatcher(combo);
    let held = 0, tick = 0, offFor = 0, lastTick = 0;
    timer = setInterval(() => {
      if (!run) return;
      tick++;
      // 1) Controles: 20 veces por segundo.
      if (W.ok && W.xinput) {
        let on = false;
        try {
          const ps = W.pads();
          // Diagnóstico: cuántos controles ve y qué botones llegan (pocas líneas, para no llenar el registro).
          if (tick === 1 || tick % 200 === 0) log(`Controles vistos: ${ps.length}${ps.length ? ' · botones ' + ps.map(p => '0x' + p.buttons.toString(16)).join(', ') : ''}`);
          const any = ps.reduce((m, p) => m | p.buttons, 0);
          if (any && any !== run.lastBtn && (run.btnLogs = (run.btnLogs || 0) + 1) <= 15) log(`Botones presionados: 0x${any.toString(16)} (se busca 0x${combo.mask.toString(16)})`);
          run.lastBtn = any;
          for (const p of ps) {
            if ((p.buttons & combo.mask) === combo.mask && (!combo.lt || p.lt > 100) && (!combo.rt || p.rt > 100)) on = true;
          }
        } catch (e) { log('XInput falló: ' + e.message); W.xinput = ''; startPsWatcher(combo); }
        // Tolera parpadeos cortos (apretar un stick mientras se presiona otro botón no siempre es parejo).
        const now = Date.now(), step = Math.min(250, now - (lastTick || now)); lastTick = now;
        if (on) { if (held === 0 && combo.holdMs) log('Combinación detectada, sosteniendo…'); held += step || 50; offFor = 0; if (held >= combo.holdMs) { held = -1e9; close('combinación ' + combo.list.join('+')); } }
        else if (held > 0) { offFor += step || 50; if (offFor > 300) { held = 0; offFor = 0; } }
      }
      // 2) Ventana del juego y prioridad: cada 0.5 s al principio, luego cada 3 s.
      const age = Date.now() - run.start;
      if (W.ok && run.tracked && (tick % (age < 30000 ? 10 : 60) === 0)) { try { manage(age); } catch (e) { log('Error al buscar la ventana: ' + e.message); } }
      if (!run.hidden && age > 15000) hidePandora('el juego no mostró ventana en 15 s');
    }, 50);
  }
  function manage(age) {
    const r = run, ids = W.tree(r.rootPid);
    for (const pid of r.orphans?.keys() || []) if (!ids.has(pid)) ids.set(pid, '');
    r.orphans = ids;
    for (const [pid, exe] of ids) if (!r.high.has(pid) && !/^(cmd|conhost|powershell)\.exe$/i.test(exe)) { if (W.setHigh(pid)) log(`Prioridad alta: ${exe || pid} (${pid})`); r.high.add(pid); }
    const wins = W.windowsOf(new Set(ids.keys()));
    if (!wins.length) return;
    const fg = W.foreground(), mine = ids.has(fg.pid);
    const win = wins[0];
    if (!r.front || W.addr(r.front) !== W.addr(win.hwnd)) { r.front = win.hwnd; log(`Ventana del juego: «${win.title}» (${ids.get(win.pid) || win.pid})`); }
    // Durante los primeros 25 s, si el juego no está al frente, se le pone; después se respeta lo que hagas.
    if (mine) r.wasFront = true;
    // Solo se insiste mientras el juego no haya estado nunca al frente; después se respeta lo que hagas.
    if (!mine && !r.wasFront && age < 25000 && r.fronts < 6) {
      r.fronts++;
      const how = W.toFront(win.hwnd);
      log(`Al frente (${how})`);
      // Aunque Windows se resista, al minimizarse Pandora el juego queda como la siguiente ventana.
      hidePandora('juego puesto al frente');
      return;
    }
    if (mine || W.foreground().pid === win.pid) hidePandora('el juego ya está al frente');
  }
  function stopWatch() {
    clearInterval(timer); timer = null;
    if (psWatcher) { try { psWatcher.kill(); } catch {} psWatcher = null; }
  }
  // Respaldo si koffi no carga: el vigía de PowerShell.
  function startPsWatcher(combo) {
    if (psWatcher) return;
    log('Uso el vigía de PowerShell');
    psWatcher = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(appDir, 'lib', 'vigia.ps1'), String(combo.mask), String(combo.lt ? 1 : 0), String(combo.rt ? 1 : 0), String(combo.holdMs)], { windowsHide: true });
    psWatcher.stdout.on('data', d => { if (String(d).includes('salir')) close('combinación (PowerShell)'); });
    psWatcher.stderr.on('data', d => log('Vigía: ' + String(d).trim().slice(0, 300)));
    psWatcher.on('error', e => { log('Vigía no arrancó: ' + e.message); psWatcher = null; });
  }

  function focusApp() {
    if (!isWin) return;
    execFile('powershell.exe', ['-NoProfile', '-Command', "(New-Object -ComObject WScript.Shell).AppActivate('Pandora') | Out-Null"], { windowsHide: true }, () => {});
  }

  function status() {
    return {
      running: run ? { id: run.id, title: run.title, since: run.start, kind: run.kind, via: run.via, tracked: run.tracked } : null,
      last,
    };
  }

  return { load, build, launch, close: why => close(why), status, finish, exitBinding: () => lbExit };
};
