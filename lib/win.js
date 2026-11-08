// Funciones de Windows que Node no trae: leer controles XInput, encontrar las ventanas de un juego
// y ponerlas al frente. Usa koffi (FFI). Si algo falla, Pandora sigue funcionando sin esto.
'use strict';
const os = require('os');

function load() {
  if (process.platform !== 'win32') return { ok: false, error: 'no es Windows' };
  let k;
  try { k = require('koffi'); } catch (e) { return { ok: false, error: 'koffi: ' + e.message }; }
  const user32 = k.load('user32.dll'), kernel32 = k.load('kernel32.dll');

  // ---------- XInput ----------
  let XInputGetState = null;
  const XPad = k.struct('PandoraXPad', { wButtons: 'uint16', bLeftTrigger: 'uint8', bRightTrigger: 'uint8', sThumbLX: 'int16', sThumbLY: 'int16', sThumbRX: 'int16', sThumbRY: 'int16' });
  const XState = k.struct('PandoraXState', { dwPacketNumber: 'uint32', Gamepad: XPad });
  let xinputName = '';
  for (const n of ['xinput1_4.dll', 'xinput1_3.dll', 'xinput9_1_0.dll']) {
    try { XInputGetState = k.load(n).func('uint32 __stdcall XInputGetState(uint32 user, _Out_ PandoraXState *state)'); xinputName = n; break; } catch {}
  }
  // Devuelve un arreglo con {buttons, lt, rt} de los controles conectados.
  function pads() {
    if (!XInputGetState) return [];
    const out = [];
    for (let i = 0; i < 4; i++) {
      const s = {};
      if (XInputGetState(i, s) === 0) out.push({ buttons: s.Gamepad.wButtons, lt: s.Gamepad.bLeftTrigger, rt: s.Gamepad.bRightTrigger });
    }
    return out;
  }

  // ---------- Procesos ----------
  const PE32 = k.struct('PandoraPE32', {
    dwSize: 'uint32', cntUsage: 'uint32', th32ProcessID: 'uint32', th32DefaultHeapID: 'uintptr_t', th32ModuleID: 'uint32',
    cntThreads: 'uint32', th32ParentProcessID: 'uint32', pcPriClassBase: 'int32', dwFlags: 'uint32', szExeFile: k.array('char16_t', 260, 'String'),
  });
  const CreateToolhelp32Snapshot = kernel32.func('void * __stdcall CreateToolhelp32Snapshot(uint32 flags, uint32 pid)');
  const Process32FirstW = kernel32.func('bool __stdcall Process32FirstW(void *snap, _Inout_ PandoraPE32 *entry)');
  const Process32NextW = kernel32.func('bool __stdcall Process32NextW(void *snap, _Inout_ PandoraPE32 *entry)');
  const CloseHandle = kernel32.func('bool __stdcall CloseHandle(void *h)');
  const GetCurrentThreadId = kernel32.func('uint32 __stdcall GetCurrentThreadId()');
  const size = k.sizeof(PE32);

  function processes() {
    const snap = CreateToolhelp32Snapshot(0x2, 0);
    const list = [];
    if (!snap || k.address(snap) === 0xFFFFFFFFFFFFFFFFn) return list;
    try {
      const e = { dwSize: size };
      let ok = Process32FirstW(snap, e);
      while (ok) {
        list.push({ pid: e.th32ProcessID, ppid: e.th32ParentProcessID, exe: e.szExeFile });
        e.dwSize = size;
        ok = Process32NextW(snap, e);
      }
    } finally { CloseHandle(snap); }
    return list;
  }
  // El proceso y todos sus descendientes (un .bat o un acceso directo abren el juego como hijo).
  function tree(root) {
    const all = processes(), ids = new Map([[root, all.find(p => p.pid === root)?.exe || '']]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const p of all) if (!ids.has(p.pid) && ids.has(p.ppid)) { ids.set(p.pid, p.exe); grew = true; }
    }
    return ids; // pid -> exe
  }

  // ---------- Ventanas ----------
  const RECT = k.struct('PandoraRECT', { left: 'int32', top: 'int32', right: 'int32', bottom: 'int32' });
  const EnumProc = k.proto('bool __stdcall PandoraEnumProc(void *hwnd, intptr_t lp)');
  const EnumWindows = user32.func('bool __stdcall EnumWindows(PandoraEnumProc *cb, intptr_t lp)');
  const GetWindowThreadProcessId = user32.func('uint32 __stdcall GetWindowThreadProcessId(void *hwnd, _Out_ uint32 *pid)');
  const IsWindowVisible = user32.func('bool __stdcall IsWindowVisible(void *hwnd)');
  const IsIconic = user32.func('bool __stdcall IsIconic(void *hwnd)');
  const GetWindow = user32.func('void * __stdcall GetWindow(void *hwnd, uint32 cmd)');
  const GetWindowRect = user32.func('bool __stdcall GetWindowRect(void *hwnd, _Out_ PandoraRECT *r)');
  const GetWindowTextW = user32.func('int __stdcall GetWindowTextW(void *hwnd, _Out_ char16_t *buf, int max)');
  const GetForegroundWindow = user32.func('void * __stdcall GetForegroundWindow()');
  const SetForegroundWindow = user32.func('bool __stdcall SetForegroundWindow(void *hwnd)');
  const BringWindowToTop = user32.func('bool __stdcall BringWindowToTop(void *hwnd)');
  const ShowWindow = user32.func('bool __stdcall ShowWindow(void *hwnd, int cmd)');
  const SetWindowPos = user32.func('bool __stdcall SetWindowPos(void *hwnd, intptr_t after, int x, int y, int cx, int cy, uint32 flags)');
  const AttachThreadInput = user32.func('bool __stdcall AttachThreadInput(uint32 a, uint32 b, bool attach)');
  const AllowSetForegroundWindow = user32.func('bool __stdcall AllowSetForegroundWindow(uint32 pid)');
  const keybd_event = user32.func('void __stdcall keybd_event(uint8 vk, uint8 scan, uint32 flags, uintptr_t extra)');

  const addr = hwnd => hwnd ? Number(k.address(hwnd)) : 0;
  function title(hwnd) {
    const buf = Buffer.alloc(512);
    const n = GetWindowTextW(hwnd, buf, 256);
    return n > 0 ? buf.toString('utf16le', 0, n * 2) : '';
  }
  function pidOf(hwnd) { const p = [0]; GetWindowThreadProcessId(hwnd, p); return p[0]; }

  // Ventanas principales visibles de un conjunto de procesos, la más grande primero.
  function windowsOf(pids) {
    const out = [];
    EnumWindows((hwnd) => {
      try {
        if (!IsWindowVisible(hwnd)) return true;
        if (addr(GetWindow(hwnd, 4))) return true; // tiene dueño: es un diálogo o una ventana secundaria
        const pid = pidOf(hwnd);
        if (!pids.has(pid)) return true;
        const r = {}; GetWindowRect(hwnd, r);
        const w = r.right - r.left, hgt = r.bottom - r.top;
        if (w < 160 || hgt < 120) return true;
        out.push({ hwnd, pid, area: w * hgt, title: title(hwnd), minimized: IsIconic(hwnd) });
      } catch {}
      return true;
    }, 0);
    return out.sort((a, b) => b.area - a.area);
  }

  function foreground() {
    const f = GetForegroundWindow();
    return { hwnd: f, pid: f && addr(f) ? pidOf(f) : 0 };
  }

  // Pone una ventana al frente aunque Windows se resista (bloqueo de primer plano).
  function toFront(hwnd) {
    if (IsIconic(hwnd)) ShowWindow(hwnd, 9);
    if (SetForegroundWindow(hwnd) && addr(GetForegroundWindow()) === addr(hwnd)) return 'directo';
    const fg = GetForegroundWindow(), me = GetCurrentThreadId();
    const fgThread = addr(fg) ? GetWindowThreadProcessId(fg, [0]) : 0;
    // Una pulsación de Alt hace que Windows considere que Pandora recibió la última entrada.
    keybd_event(0x12, 0, 0x1, 0); keybd_event(0x12, 0, 0x1 | 0x2, 0);
    let attached = false;
    if (fgThread && fgThread !== me) attached = AttachThreadInput(me, fgThread, true);
    SetWindowPos(hwnd, -1, 0, 0, 0, 0, 0x1 | 0x2 | 0x40);
    SetWindowPos(hwnd, -2, 0, 0, 0, 0, 0x1 | 0x2 | 0x40);
    BringWindowToTop(hwnd);
    SetForegroundWindow(hwnd);
    if (attached) AttachThreadInput(me, fgThread, false);
    return addr(GetForegroundWindow()) === addr(hwnd) ? 'forzado' : 'falló';
  }

  function setHigh(pid) {
    try { os.setPriority(pid, os.constants.priority.PRIORITY_HIGH); return true; } catch { return false; }
  }

  return {
    ok: true, xinput: xinputName, pads, tree, windowsOf, foreground, toFront, setHigh, addr,
    allow: pid => { try { return AllowSetForegroundWindow(pid); } catch { return false; } },
  };
}

let cached = null;
module.exports = () => (cached ||= (() => { try { return load(); } catch (e) { return { ok: false, error: e.message }; } })());
