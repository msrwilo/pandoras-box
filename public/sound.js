// Efectos y ambiente. Temas sintetizados (originales) + los paquetes de LaunchBox (E:\LaunchBox\Sounds).
// El tema de sonido es independiente del visual; «auto» usa el que trae el tema visual.

let ctx = null, master = null, sfxBus = null, ambBus = null, echo = null, ambNodes = [], ambOn = false;
let theme = 'cubo', ambTheme = 'cubo', volume = 0.7, ambientLevel = 0.6;

export const SYNTH = {
  cubo: 'Cubo', barra: 'Barra', mosaico: 'Mosaicos', canal: 'Canales', panel: 'Paneles',
  torre: 'Torres', onda: 'Ondas', esfera: 'Esfera', naranja: 'Naranja',
  lavanda: 'Ventanas', cuatro: 'Cuatro', bloque: 'Bloques', pantalla: 'Pantalla',
  cristal: 'Cristal', retro: 'Retro 8 bits', madera: 'Madera', espacial: 'Espacial', silencio: 'Silencio',
};
const packs = {}; // id -> { name, files, buffers }
export function registerPacks(list) { for (const p of list) packs[p.id] = { name: p.name, files: p.files, buffers: null }; }
// Sonidos que no pertenecen a ningún tema, más los paquetes de LaunchBox.
export function extras() {
  return { cristal: 'Cristal', retro: 'Retro 8 bits', madera: 'Madera', espacial: 'Espacial', silencio: 'Silencio', ...Object.fromEntries(Object.entries(packs).map(([id, p]) => [id, 'LaunchBox: ' + p.name])) };
}
export function themes() {
  return { auto: 'Según el tema visual', ...SYNTH, ...Object.fromEntries(Object.entries(packs).map(([id, p]) => [id, 'LaunchBox: ' + p.name])) };
}

export function unlock() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = volume; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    ambBus = ctx.createGain(); ambBus.gain.value = 0; ambBus.connect(master);
    // Eco para el tema espacial.
    echo = ctx.createDelay(1); echo.delayTime.value = 0.23;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const wet = ctx.createGain(); wet.gain.value = 0.5;
    echo.connect(fb); fb.connect(echo); echo.connect(wet); wet.connect(master);
    if (packs[theme]) loadPack(theme);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx.state === 'running';
}
// Sonido del logo de Pandora's Box, sincronizado con la animación del arranque (ver .pd-lid en el CSS):
// el clic de la tapa al destrabarse, el roce al levantarse, la luz que sube y un acorde cálido que queda.
// `at` es cuántos segundos faltan para que la tapa empiece a abrirse.
export function logo(at = 0.3) {
  if (!unlock()) return false;
  const t0 = Math.max(0, at), wet = echo;
  // Clic de la tapa (dos golpecitos secos) y un golpe grave muy corto.
  click({ f: 3400, t: t0, gain: 0.05, dur: 0.018, body: 1400 });
  click({ f: 2600, t: t0 + 0.045, gain: 0.035, dur: 0.02, body: 900 });
  tone({ f: 110, f2: 70, t: t0, dur: 0.16, gain: 0.07, type: 'sine' });
  // La tapa se levanta: un roce que sube.
  noise({ t: t0 + 0.06, dur: 0.5, gain: 0.025, from: 500, to: 2600 });
  tone({ f: 196, f2: 262, t: t0 + 0.05, dur: 0.45, gain: 0.02, type: 'triangle', q: 1200 });
  // La luz sale: un barrido brillante y destellos (arpegio de La mayor con novena).
  noise({ t: t0 + 0.22, dur: 1.1, gain: 0.03, from: 1800, to: 9000 });
  [1318.5, 1661.2, 1975.5, 2489, 2637].forEach((f, i) => {
    tone({ f, t: t0 + 0.26 + i * 0.07, dur: 0.9, gain: 0.022, attack: 0.003 });
    tone({ f, t: t0 + 0.26 + i * 0.07, dur: 0.6, gain: 0.012, attack: 0.003, out: wet });
  });
  // Acorde que se abre y se queda flotando con la luz.
  [220, 329.6, 440, 554.4, 659.3, 987.8].forEach((f, i) => tone({ f, t: t0 + 0.3 + i * 0.02, dur: 2.6, gain: i < 2 ? 0.035 : 0.022, attack: 0.45, type: i % 2 ? 'sine' : 'triangle', q: 3200 }));
  // Un último destello al final.
  tone({ f: 3520, t: t0 + 1.45, dur: 0.7, gain: 0.012, attack: 0.002, out: wet });
  return true;
}
// En segundo plano todo el audio sintetizado se duerme (no gasta nada) y despierta al volver.
export function sleep(on) { if (!ctx) return; if (on) ctx.suspend(); else ctx.resume(); }
export const running = () => ctx && ctx.state === 'running';

export function configure(opts) {
  if (opts.theme !== undefined && opts.theme !== theme) {
    theme = opts.theme;
    const amb = AMB[theme] ? theme : 'cubo';
    if (amb !== ambTheme) { ambTheme = amb; if (ctx) { rebuildAmbient(); if (ambOn) setAmbient(true); } }
    if (packs[theme]) loadPack(theme);
  }
  if (opts.volume !== undefined) { volume = opts.volume; if (master) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.05); }
  if (opts.ambientLevel !== undefined) { ambientLevel = opts.ambientLevel; if (ambOn) setAmbient(true); }
}

async function loadPack(id) {
  const p = packs[id];
  if (!p || p.buffers || !ctx) return;
  p.buffers = {};
  for (const [k, urls] of Object.entries(p.files)) {
    p.buffers[k] = [];
    for (const u of [...urls].sort(() => Math.random() - 0.5).slice(0, 10)) {
      try { p.buffers[k].push(await ctx.decodeAudioData(await (await fetch(u)).arrayBuffer())); } catch {}
    }
  }
}

function tone({ f = 440, f2, type = 'sine', t = 0, dur = 0.12, gain = 0.12, attack = 0.004, q, out, vib }) {
  const now = ctx.currentTime + t;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, now);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, now + dur);
  if (vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = vib; lg.gain.value = f * 0.012; l.connect(lg); lg.connect(o.frequency); l.start(now); l.stop(now + dur + 0.05); }
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  let node = o;
  if (q) { const bp = ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = q; o.connect(bp); node = bp; }
  node.connect(g); g.connect(out || sfxBus);
  o.start(now); o.stop(now + dur + 0.05);
  return g;
}
function noise({ t = 0, dur = 0.4, gain = 0.05, from = 300, to = 3000, out }) {
  const now = ctx.currentTime + t, len = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
  f.frequency.setValueAtTime(from, now); f.frequency.exponentialRampToValueAtTime(to, now + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(gain, now + dur * 0.4); g.gain.linearRampToValueAtTime(0, now + dur);
  s.connect(f); f.connect(g); g.connect(out || sfxBus); s.start(now); s.stop(now + dur);
}
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
const note = (base, p) => base * Math.pow(2, PENTA[((p % 8) + 8) % 8] / 12);
const marimba = (f, t = 0, g = 0.09) => { tone({ f, t, dur: 0.45, gain: g, attack: 0.002 }); tone({ f: f * 4, t, dur: 0.08, gain: g * 0.25, attack: 0.001 }); };

const SFX = {
  cubo: {
    move: (p = 0) => tone({ f: 520 + (p % 6) * 18, f2: 480 + (p % 6) * 18, dur: 0.09, gain: 0.07 }),
    rotate: () => { noise({ dur: 0.45, gain: 0.05, from: 200, to: 1400 }); tone({ f: 196, f2: 220, type: 'triangle', dur: 0.4, gain: 0.05, q: 900 }); },
    select: () => { tone({ f: 392, dur: 0.18, gain: 0.08, type: 'triangle', q: 2400 }); tone({ f: 587, t: 0.07, dur: 0.3, gain: 0.07, type: 'triangle', q: 2400 }); },
    back: () => tone({ f: 440, f2: 330, dur: 0.16, gain: 0.06, type: 'triangle', q: 1800 }),
    open: () => { noise({ dur: 0.6, gain: 0.06, from: 300, to: 4000 }); tone({ f: 293, t: 0.05, dur: 0.5, gain: 0.06 }); tone({ f: 440, t: 0.16, dur: 0.6, gain: 0.05 }); },
    toggle: () => tone({ f: 660, dur: 0.07, gain: 0.06, type: 'square', q: 1500 }),
    error: () => { tone({ f: 180, dur: 0.12, gain: 0.07, type: 'square', q: 700 }); tone({ f: 150, t: 0.1, dur: 0.16, gain: 0.07, type: 'square', q: 700 }); },
    startup: () => { noise({ dur: 1.4, gain: 0.05, from: 120, to: 2400 }); [146.8, 220, 293.7, 440].forEach((f, i) => tone({ f, t: 0.3 + i * 0.16, dur: 1.4, gain: 0.05, type: 'triangle', q: 2200 })); },
    launch: () => { noise({ dur: 0.9, gain: 0.07, from: 200, to: 6000 }); [293.7, 370, 440, 587].forEach((f, i) => tone({ f, t: i * 0.07, dur: 0.8, gain: 0.05, type: 'triangle', q: 3000 })); },
  },
  cristal: {
    move: (p = 0) => tone({ f: 1320 + (p % 5) * 66, dur: 0.16, gain: 0.04 }),
    rotate: () => { tone({ f: 880, dur: 0.5, gain: 0.04 }); tone({ f: 1318, t: 0.06, dur: 0.6, gain: 0.03 }); },
    select: () => { tone({ f: 1046, dur: 0.3, gain: 0.05 }); tone({ f: 1568, t: 0.08, dur: 0.5, gain: 0.04 }); },
    back: () => tone({ f: 988, f2: 740, dur: 0.22, gain: 0.04 }),
    open: () => [784, 988, 1175, 1568].forEach((f, i) => tone({ f, t: i * 0.06, dur: 0.6, gain: 0.035 })),
    toggle: () => tone({ f: 1760, dur: 0.08, gain: 0.035 }),
    error: () => tone({ f: 330, f2: 300, dur: 0.25, gain: 0.05, type: 'triangle' }),
    startup: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ f, t: i * 0.12, dur: 1.2, gain: 0.035 })),
    launch: () => [1046, 1318, 1568, 2093].forEach((f, i) => tone({ f, t: i * 0.05, dur: 0.9, gain: 0.035 })),
  },
  retro: {
    move: (p = 0) => tone({ f: note(880, p), dur: 0.05, gain: 0.04, type: 'square', attack: 0.001 }),
    rotate: () => tone({ f: 220, f2: 660, dur: 0.14, gain: 0.04, type: 'square' }),
    select: () => [523, 659, 784].forEach((f, i) => tone({ f, t: i * 0.045, dur: 0.06, gain: 0.045, type: 'square', attack: 0.001 })),
    back: () => [784, 523].forEach((f, i) => tone({ f, t: i * 0.05, dur: 0.07, gain: 0.04, type: 'square', attack: 0.001 })),
    open: () => [392, 523, 659, 784, 1046].forEach((f, i) => tone({ f, t: i * 0.05, dur: 0.07, gain: 0.04, type: 'square', attack: 0.001 })),
    toggle: () => tone({ f: 1318, dur: 0.035, gain: 0.035, type: 'square', attack: 0.001 }),
    error: () => tone({ f: 98, dur: 0.18, gain: 0.05, type: 'square', attack: 0.001 }),
    startup: () => [262, 330, 392, 523, 392, 523, 659, 784].forEach((f, i) => tone({ f, t: i * 0.09, dur: 0.1, gain: 0.04, type: 'square', attack: 0.001 })),
    launch: () => { [523, 784, 1046, 1568].forEach((f, i) => tone({ f, t: i * 0.04, dur: 0.06, gain: 0.045, type: 'square', attack: 0.001 })); tone({ f: 110, f2: 880, t: 0.18, dur: 0.4, gain: 0.03, type: 'triangle' }); },
  },
  madera: {
    move: (p = 0) => marimba(note(392, p), 0, 0.07),
    rotate: () => { marimba(294); marimba(440, 0.08); },
    select: () => { marimba(523); marimba(784, 0.09); },
    back: () => { marimba(587); marimba(392, 0.09); },
    open: () => [392, 494, 587, 784].forEach((f, i) => marimba(f, i * 0.08, 0.07)),
    toggle: () => marimba(988, 0, 0.05),
    error: () => { marimba(196, 0, 0.09); marimba(185, 0.1, 0.09); },
    startup: () => [262, 330, 392, 523, 659].forEach((f, i) => marimba(f, i * 0.14, 0.07)),
    launch: () => [523, 659, 784, 1046].forEach((f, i) => marimba(f, i * 0.06, 0.07)),
  },
  espacial: {
    move: (p = 0) => tone({ f: note(660, p), dur: 0.14, gain: 0.04, out: echo, vib: 7 }),
    rotate: () => { tone({ f: 110, f2: 440, dur: 0.5, gain: 0.04, type: 'sawtooth', q: 900, out: echo }); },
    select: () => { tone({ f: 660, f2: 990, dur: 0.25, gain: 0.05, out: echo }); },
    back: () => tone({ f: 880, f2: 440, dur: 0.25, gain: 0.04, out: echo }),
    open: () => { noise({ dur: 0.8, gain: 0.04, from: 4000, to: 300, out: echo }); tone({ f: 220, f2: 880, dur: 0.7, gain: 0.04, out: echo }); },
    toggle: () => tone({ f: 1320, dur: 0.06, gain: 0.03, out: echo }),
    error: () => tone({ f: 140, f2: 90, dur: 0.3, gain: 0.05, type: 'sawtooth', q: 600 }),
    startup: () => { tone({ f: 55, f2: 220, dur: 2, gain: 0.05, type: 'sawtooth', q: 700 }); [440, 660, 880].forEach((f, i) => tone({ f, t: 0.6 + i * 0.2, dur: 1, gain: 0.03, out: echo, vib: 5 })); },
    launch: () => { noise({ dur: 1, gain: 0.05, from: 200, to: 8000, out: echo }); tone({ f: 110, f2: 1760, dur: 0.9, gain: 0.04, out: echo }); },
  },
};
// Clic seco: un golpe de ruido filtrado muy corto más un tono agudo.
function click({ f = 2400, t = 0, gain = 0.06, dur = 0.03, body = 900 }) {
  noise({ t, dur, gain: gain * 0.8, from: f, to: f * 0.9 });
  tone({ f: body, t, dur: dur * 2, gain: gain * 0.6, attack: 0.001, type: 'triangle' });
}
const pluck = (f, t = 0, g = 0.06, out) => { tone({ f, t, dur: 0.5, gain: g, attack: 0.002, type: 'triangle', out }); tone({ f: f * 2, t, dur: 0.18, gain: g * 0.3, attack: 0.001, out }); };
Object.assign(SFX, {
  // Barra: tics finos y aireados, casi silenciosos.
  barra: {
    move: () => tone({ f: 2600, dur: 0.035, gain: 0.035, attack: 0.001, q: 5000 }),
    rotate: () => { tone({ f: 1900, dur: 0.05, gain: 0.04, attack: 0.001, q: 4000 }); tone({ f: 2850, t: 0.03, dur: 0.05, gain: 0.025, attack: 0.001, q: 5000 }); },
    select: () => { tone({ f: 1318, dur: 0.22, gain: 0.04 }); tone({ f: 1975, t: 0.06, dur: 0.3, gain: 0.03 }); },
    back: () => tone({ f: 1480, f2: 1100, dur: 0.12, gain: 0.035 }),
    open: () => { noise({ dur: 0.5, gain: 0.03, from: 6000, to: 1500 }); tone({ f: 988, t: 0.05, dur: 0.5, gain: 0.03 }); },
    toggle: () => tone({ f: 3200, dur: 0.03, gain: 0.03, attack: 0.001 }),
    error: () => tone({ f: 330, dur: 0.18, gain: 0.05, type: 'triangle' }),
    startup: () => { noise({ dur: 2.2, gain: 0.03, from: 200, to: 5000 }); [220, 330, 440, 660, 880].forEach((f, i) => tone({ f, t: 0.4 + i * 0.05, dur: 2.4, gain: 0.025, attack: 0.6 })); },
    launch: () => { tone({ f: 1318, dur: 0.6, gain: 0.035 }); tone({ f: 1760, t: 0.08, dur: 0.8, gain: 0.03 }); noise({ dur: 0.8, gain: 0.03, from: 1500, to: 8000 }); },
  },
  // Mosaicos: clics secos y rápidos, sin adornos.
  mosaico: {
    move: () => click({ f: 3400, gain: 0.06, body: 1300, dur: 0.022 }), // un solo clic seco, como en su consola
    rotate: () => click({ f: 2600, gain: 0.07, body: 900 }),
    select: () => { click({ f: 3600, gain: 0.08, body: 1500 }); click({ f: 4200, t: 0.07, gain: 0.06, body: 1900 }); },
    back: () => { click({ f: 2400, gain: 0.07, body: 800 }); },
    open: () => { click({ f: 3000, gain: 0.07, body: 1100 }); tone({ f: 660, f2: 990, t: 0.02, dur: 0.12, gain: 0.04 }); },
    toggle: () => click({ f: 4000, gain: 0.05, body: 1700, dur: 0.02 }),
    error: () => { tone({ f: 200, dur: 0.08, gain: 0.07, type: 'square', q: 900 }); tone({ f: 200, t: 0.11, dur: 0.08, gain: 0.07, type: 'square', q: 900 }); },
    startup: () => { click({ f: 3000, gain: 0.08, body: 1200 }); click({ f: 3800, t: 0.12, gain: 0.08, body: 1600 }); },
    launch: () => { click({ f: 3600, gain: 0.08, body: 1500 }); tone({ f: 523, t: 0.05, dur: 0.15, gain: 0.05 }); tone({ f: 1046, t: 0.12, dur: 0.25, gain: 0.05 }); },
  },
  // Canales: burbujas y campanitas suaves, juguetón.
  canal: {
    move: () => { tone({ f: 1320, dur: 0.06, gain: 0.04, attack: 0.003 }); tone({ f: 660, dur: 0.05, gain: 0.02, attack: 0.002, type: 'triangle' }); },
    rotate: () => { tone({ f: 600, f2: 1200, dur: 0.12, gain: 0.05 }); },
    select: () => { pluck(784); pluck(1175, 0.08); },
    back: () => tone({ f: 900, f2: 520, dur: 0.16, gain: 0.05 }),
    open: () => { tone({ f: 300, f2: 1400, dur: 0.35, gain: 0.04 }); [1046, 1318, 1568].forEach((f, i) => pluck(f, 0.2 + i * 0.07, 0.04)); },
    toggle: () => tone({ f: 1568, f2: 1760, dur: 0.06, gain: 0.04 }),
    error: () => { tone({ f: 330, f2: 300, dur: 0.14, gain: 0.06, type: 'triangle' }); tone({ f: 262, t: 0.12, dur: 0.18, gain: 0.06, type: 'triangle' }); },
    startup: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => pluck(f, i * 0.13, 0.05)),
    launch: () => { tone({ f: 200, f2: 1600, dur: 0.5, gain: 0.04 }); [784, 988, 1175, 1568].forEach((f, i) => pluck(f, 0.3 + i * 0.06, 0.045)); },
  },
  // Paneles: barridos de aire al cambiar de panel y bips limpios.
  panel: {
    move: () => tone({ f: 1800, f2: 1500, dur: 0.04, gain: 0.04, attack: 0.001 }),
    rotate: () => { noise({ dur: 0.32, gain: 0.07, from: 500, to: 4500 }); tone({ f: 700, f2: 1100, dur: 0.18, gain: 0.03 }); },
    select: () => { tone({ f: 988, dur: 0.12, gain: 0.05, type: 'triangle' }); tone({ f: 1480, t: 0.06, dur: 0.18, gain: 0.045, type: 'triangle' }); },
    back: () => { noise({ dur: 0.25, gain: 0.05, from: 4000, to: 600 }); tone({ f: 1100, f2: 700, dur: 0.15, gain: 0.03 }); },
    open: () => { noise({ dur: 0.45, gain: 0.07, from: 400, to: 6000 }); tone({ f: 660, t: 0.1, dur: 0.3, gain: 0.04, type: 'triangle' }); },
    toggle: () => tone({ f: 2200, dur: 0.035, gain: 0.035, attack: 0.001 }),
    error: () => tone({ f: 220, dur: 0.2, gain: 0.06, type: 'square', q: 800 }),
    startup: () => { noise({ dur: 1.6, gain: 0.05, from: 150, to: 3000 }); [330, 494, 659, 988].forEach((f, i) => tone({ f, t: 0.5 + i * 0.1, dur: 1.4, gain: 0.03, type: 'triangle', q: 3000 })); },
    launch: () => { noise({ dur: 0.7, gain: 0.07, from: 300, to: 7000 }); [659, 988, 1318].forEach((f, i) => tone({ f, t: i * 0.06, dur: 0.6, gain: 0.035, type: 'triangle' })); },
  },
});
Object.assign(SFX, {
  // Torres: golpes graves con eco largo y destellos de cristal, como un espacio enorme.
  torre: {
    move: (p = 0) => { tone({ f: 98, f2: 82, dur: 0.22, gain: 0.07, attack: 0.004 }); tone({ f: note(1320, p), t: 0.01, dur: 0.12, gain: 0.018, out: echo }); },
    rotate: () => { noise({ dur: 0.7, gain: 0.04, from: 3000, to: 250, out: echo }); tone({ f: 65, f2: 55, dur: 0.6, gain: 0.07 }); },
    select: () => { [196, 294, 392, 587].forEach((f, i) => tone({ f, t: i * 0.04, dur: 1.1, gain: 0.03, out: echo, attack: 0.02 })); },
    back: () => { tone({ f: 330, f2: 165, dur: 0.35, gain: 0.04, out: echo }); tone({ f: 82, dur: 0.3, gain: 0.05 }); },
    open: () => { noise({ dur: 1.1, gain: 0.05, from: 150, to: 5000, out: echo }); tone({ f: 49, f2: 98, dur: 1, gain: 0.07 }); },
    toggle: () => tone({ f: 1760, dur: 0.08, gain: 0.02, out: echo }),
    error: () => { tone({ f: 70, dur: 0.25, gain: 0.08, type: 'triangle' }); tone({ f: 66, t: 0.14, dur: 0.3, gain: 0.08, type: 'triangle' }); },
    startup: () => { tone({ f: 41, f2: 82, dur: 3, gain: 0.08, attack: 1.2 }); noise({ dur: 3, gain: 0.03, from: 100, to: 6000, out: echo });
      [523, 784, 1046, 1568, 2093].forEach((f, i) => tone({ f, t: 1.6 + i * 0.09, dur: 1.6, gain: 0.018, out: echo })); },
    launch: () => { tone({ f: 55, f2: 220, dur: 1.2, gain: 0.07, attack: 0.2 }); [784, 1175, 1568].forEach((f, i) => tone({ f, t: 0.5 + i * 0.08, dur: 1, gain: 0.02, out: echo })); },
  },
  // Ondas: tics redondos de plástico, cortos y suaves (portátil).
  onda: {
    move: () => { tone({ f: 1480, dur: 0.045, gain: 0.04, attack: 0.001, type: 'triangle' }); tone({ f: 740, dur: 0.03, gain: 0.02, attack: 0.001 }); },
    rotate: () => { tone({ f: 1175, dur: 0.06, gain: 0.04, attack: 0.001, type: 'triangle' }); tone({ f: 1568, t: 0.045, dur: 0.06, gain: 0.03, attack: 0.001, type: 'triangle' }); },
    select: () => { tone({ f: 880, dur: 0.12, gain: 0.05, type: 'triangle' }); tone({ f: 1320, t: 0.05, dur: 0.2, gain: 0.04, type: 'triangle' }); },
    back: () => tone({ f: 990, f2: 740, dur: 0.09, gain: 0.04, type: 'triangle' }),
    open: () => { tone({ f: 660, f2: 1320, dur: 0.18, gain: 0.04 }); tone({ f: 1760, t: 0.12, dur: 0.25, gain: 0.025 }); },
    toggle: () => tone({ f: 2093, dur: 0.03, gain: 0.03, attack: 0.001, type: 'triangle' }),
    error: () => tone({ f: 247, dur: 0.15, gain: 0.05, type: 'triangle' }),
    startup: () => { [392, 523, 659, 784, 1046].forEach((f, i) => tone({ f, t: i * 0.05, dur: 1.6, gain: 0.022, attack: 0.25 })); noise({ dur: 1.5, gain: 0.02, from: 3000, to: 9000 }); },
    launch: () => { tone({ f: 523, dur: 0.4, gain: 0.04, type: 'triangle' }); tone({ f: 1046, t: 0.08, dur: 0.6, gain: 0.03 }); },
  },
  // Esfera: burbujas y golpes mecánicos graves, orgánico y pesado.
  esfera: {
    move: (p = 0) => tone({ f: 260 + (p % 4) * 30, f2: 620 + (p % 4) * 40, dur: 0.07, gain: 0.05, attack: 0.002 }),
    rotate: () => { noise({ dur: 0.35, gain: 0.06, from: 2500, to: 200 }); tone({ f: 70, f2: 45, dur: 0.3, gain: 0.1, type: 'triangle' }); },
    select: () => { tone({ f: 220, dur: 0.12, gain: 0.06, type: 'square', q: 900 }); tone({ f: 330, t: 0.08, dur: 0.2, gain: 0.06, type: 'square', q: 1100 }); tone({ f: 55, dur: 0.25, gain: 0.08 }); },
    back: () => { tone({ f: 600, f2: 240, dur: 0.12, gain: 0.05 }); tone({ f: 60, dur: 0.2, gain: 0.07 }); },
    open: () => { tone({ f: 45, f2: 90, dur: 0.5, gain: 0.12, type: 'triangle' }); noise({ dur: 0.6, gain: 0.05, from: 200, to: 3000 }); [0, 0.07, 0.15].forEach((t, i) => tone({ f: 400 + i * 150, f2: 900 + i * 200, t: 0.1 + t, dur: 0.06, gain: 0.03 })); },
    toggle: () => tone({ f: 500, f2: 1000, dur: 0.05, gain: 0.04 }),
    error: () => { tone({ f: 90, dur: 0.18, gain: 0.09, type: 'square', q: 400 }); tone({ f: 85, t: 0.12, dur: 0.22, gain: 0.09, type: 'square', q: 400 }); },
    startup: () => { tone({ f: 30, f2: 60, dur: 2.4, gain: 0.12, attack: 0.8, type: 'triangle' }); noise({ dur: 2.2, gain: 0.04, from: 80, to: 1500 });
      for (let i = 0; i < 8; i++) tone({ f: 300 + Math.random() * 400, f2: 900 + Math.random() * 600, t: 1.2 + i * 0.09, dur: 0.07, gain: 0.025 }); },
    launch: () => { tone({ f: 40, f2: 160, dur: 0.9, gain: 0.12, type: 'triangle' }); noise({ dur: 0.9, gain: 0.06, from: 300, to: 6000 }); },
  },
  // Naranja: bips brillantes y limpios que suben de tono, alegres.
  naranja: {
    move: (p = 0) => tone({ f: note(1046, p % 3), f2: note(1046, p % 3) * 1.12, dur: 0.07, gain: 0.04, attack: 0.002 }),
    rotate: () => tone({ f: 784, f2: 1568, dur: 0.12, gain: 0.04 }),
    select: () => [1046, 1318, 1568].forEach((f, i) => tone({ f, t: i * 0.06, dur: 0.14, gain: 0.04 })),
    back: () => [1318, 988].forEach((f, i) => tone({ f, t: i * 0.06, dur: 0.12, gain: 0.04 })),
    open: () => { [784, 1046, 1318, 1568, 2093].forEach((f, i) => tone({ f, t: i * 0.045, dur: 0.18, gain: 0.03 })); },
    toggle: () => tone({ f: 2093, dur: 0.04, gain: 0.03 }),
    error: () => { tone({ f: 466, dur: 0.1, gain: 0.05, type: 'triangle' }); tone({ f: 440, t: 0.1, dur: 0.14, gain: 0.05, type: 'triangle' }); },
    startup: () => { [523, 659, 784, 1046, 1318, 1568, 2093].forEach((f, i) => tone({ f, t: i * 0.07, dur: 0.9, gain: 0.025, out: echo })); },
    launch: () => { tone({ f: 523, f2: 2093, dur: 0.35, gain: 0.04 }); [1568, 2093].forEach((f, i) => tone({ f, t: 0.3 + i * 0.08, dur: 0.5, gain: 0.03, out: echo })); },
  },
});
Object.assign(SFX, {
  // Ventanas: campanitas de cristal y cuerdas pulsadas, como un menú de juego de rol.
  lavanda: {
    rotate: () => { pluck(659, 0, 0.04); pluck(988, 0.05, 0.03); },
    select: () => { [784, 988, 1175].forEach((f, i) => tone({ f, t: i * 0.05, dur: 0.35, gain: 0.04, type: 'triangle' })); },
    back: () => { tone({ f: 784, dur: 0.1, gain: 0.04, type: 'square', q: 2000 }); tone({ f: 523, t: 0.07, dur: 0.14, gain: 0.04, type: 'square', q: 2000 }); },
    open: () => { [523, 659, 784, 1046].forEach((f, i) => pluck(f, i * 0.05, 0.04)); },
    toggle: () => tone({ f: 1568, dur: 0.05, gain: 0.03, type: 'square', q: 3000 }),
    error: () => { tone({ f: 233, dur: 0.12, gain: 0.06, type: 'square', q: 900 }); tone({ f: 220, t: 0.1, dur: 0.16, gain: 0.06, type: 'square', q: 900 }); },
    startup: () => { [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone({ f, t: i * 0.11, dur: 1.4, gain: 0.03, type: 'triangle', out: echo })); },
    launch: () => { [523, 784, 1046, 1568].forEach((f, i) => tone({ f, t: i * 0.06, dur: 0.6, gain: 0.035, type: 'triangle', out: echo })); },
  },
  // Cuatro: rebotes y resortes, juguetón y con cuerpo.
  volumen: {
    rotate: () => { tone({ f: 180, f2: 720, dur: 0.18, gain: 0.06, type: 'triangle' }); tone({ f: 720, f2: 540, t: 0.16, dur: 0.12, gain: 0.04, type: 'triangle' }); },
    select: () => { tone({ f: 392, f2: 784, dur: 0.12, gain: 0.06, type: 'square', q: 1800 }); tone({ f: 1046, t: 0.1, dur: 0.25, gain: 0.05, type: 'triangle' }); },
    back: () => tone({ f: 660, f2: 220, dur: 0.2, gain: 0.06, type: 'triangle' }),
    open: () => { [262, 330, 392, 523].forEach((f, i) => tone({ f, f2: f * 1.5, t: i * 0.05, dur: 0.12, gain: 0.05, type: 'triangle' })); },
    toggle: () => tone({ f: 880, f2: 1320, dur: 0.06, gain: 0.04, type: 'triangle' }),
    error: () => { tone({ f: 150, f2: 110, dur: 0.25, gain: 0.08, type: 'sawtooth', q: 600 }); },
    startup: () => { [262, 330, 392, 523, 659, 784].forEach((f, i) => tone({ f, f2: f * 1.02, t: i * 0.08, dur: 0.3, gain: 0.05, type: 'triangle' })); tone({ f: 130, f2: 520, t: 0.5, dur: 0.6, gain: 0.05, type: 'triangle' }); },
    launch: () => { tone({ f: 130, f2: 1046, dur: 0.5, gain: 0.06, type: 'triangle' }); [784, 1046].forEach((f, i) => tone({ f, t: 0.45 + i * 0.08, dur: 0.3, gain: 0.04, type: 'square', q: 2500 })); },
  },
  // Bloques: golpes profundos y destellos cristalinos con eco, sobrio.
  disco: {
    rotate: () => { tone({ f: 110, f2: 82, dur: 0.3, gain: 0.07 }); tone({ f: 1318, t: 0.02, dur: 0.3, gain: 0.02, out: echo }); },
    select: () => { tone({ f: 523, dur: 0.5, gain: 0.04, out: echo }); tone({ f: 784, t: 0.06, dur: 0.6, gain: 0.035, out: echo }); tone({ f: 65, dur: 0.4, gain: 0.07 }); },
    back: () => { tone({ f: 659, f2: 330, dur: 0.25, gain: 0.04, out: echo }); },
    open: () => { noise({ dur: 0.9, gain: 0.03, from: 200, to: 3000, out: echo }); tone({ f: 55, f2: 82, dur: 0.8, gain: 0.08 }); [659, 988].forEach((f, i) => tone({ f, t: 0.15 + i * 0.1, dur: 0.8, gain: 0.025, out: echo })); },
    toggle: () => tone({ f: 1760, dur: 0.06, gain: 0.025, out: echo }),
    error: () => { tone({ f: 98, dur: 0.2, gain: 0.08, type: 'triangle' }); tone({ f: 92, t: 0.14, dur: 0.25, gain: 0.08, type: 'triangle' }); },
    startup: () => { tone({ f: 41, f2: 55, dur: 3, gain: 0.08, attack: 1 }); [880, 1318, 1760].forEach((f, i) => tone({ f, t: 1 + i * 0.25, dur: 2, gain: 0.02, out: echo, attack: 0.3 })); },
    launch: () => { tone({ f: 55, f2: 165, dur: 1, gain: 0.08, attack: 0.1 }); [1046, 1568].forEach((f, i) => tone({ f, t: 0.3 + i * 0.12, dur: 1, gain: 0.025, out: echo })); },
  },
  // Pantalla: pulsos cuadrados cortos, como un portátil de 8 bits.
  pantalla: {
    rotate: () => [988, 1318].forEach((f, i) => tone({ f, t: i * 0.04, dur: 0.04, gain: 0.035, type: 'square', attack: 0.001 })),
    select: () => [1046, 1568].forEach((f, i) => tone({ f, t: i * 0.06, dur: 0.07, gain: 0.04, type: 'square', attack: 0.001 })),
    back: () => [784, 523].forEach((f, i) => tone({ f, t: i * 0.05, dur: 0.06, gain: 0.035, type: 'square', attack: 0.001 })),
    open: () => [523, 784, 1046, 1568].forEach((f, i) => tone({ f, t: i * 0.04, dur: 0.05, gain: 0.035, type: 'square', attack: 0.001 })),
    toggle: () => tone({ f: 2093, dur: 0.03, gain: 0.03, type: 'square', attack: 0.001 }),
    error: () => tone({ f: 110, dur: 0.15, gain: 0.05, type: 'square', attack: 0.001 }),
    startup: () => { tone({ f: 1046, dur: 0.08, gain: 0.04, type: 'square', attack: 0.001 }); tone({ f: 2093, t: 0.1, dur: 0.6, gain: 0.04, type: 'square', attack: 0.001 }); },
    launch: () => [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone({ f, t: i * 0.035, dur: 0.05, gain: 0.035, type: 'square', attack: 0.001 })),
  },
});
// FM de dos operadores (como el chip de sonido del Genesis): un oscilador modula la frecuencia de otro.
function fm({ f = 440, t = 0, dur = 0.2, gain = 0.06, ratio = 2, index = 3, decay = 0.6, f2, out }) {
  const now = ctx.currentTime + t;
  const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
  car.frequency.setValueAtTime(f, now); mod.frequency.setValueAtTime(f * ratio, now);
  if (f2) { car.frequency.exponentialRampToValueAtTime(f2, now + dur); mod.frequency.exponentialRampToValueAtTime(f2 * ratio, now + dur); }
  mg.gain.setValueAtTime(f * index, now); mg.gain.exponentialRampToValueAtTime(Math.max(1, f * index * (1 - decay)), now + dur);
  mod.connect(mg); mg.connect(car.frequency);
  g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(gain, now + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  car.connect(g); g.connect(out || sfxBus);
  car.start(now); mod.start(now); car.stop(now + dur + 0.05); mod.stop(now + dur + 0.05);
}
// Pulso angosto (12,5 %) como el del NES: suma de un diente de sierra y otro desfasado.
function pulse({ f = 440, t = 0, dur = 0.08, gain = 0.04, duty = 0.125, out }) {
  const now = ctx.currentTime + t;
  const a = ctx.createOscillator(), b = ctx.createOscillator(), inv = ctx.createGain(), dl = ctx.createDelay(0.05), g = ctx.createGain();
  a.type = b.type = 'sawtooth'; a.frequency.value = b.frequency.value = f;
  dl.delayTime.value = duty / f; inv.gain.value = -1;
  a.connect(g); b.connect(dl); dl.connect(inv); inv.connect(g);
  g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(gain, now + 0.001); g.gain.setValueAtTime(gain, now + dur * 0.8); g.gain.linearRampToValueAtTime(0, now + dur);
  g.connect(out || sfxBus); a.start(now); b.start(now); a.stop(now + dur + 0.02); b.stop(now + dur + 0.02);
}
Object.assign(SFX, {
  // Gris: pulsos angostos y triángulo, como el chip del NES.
  gris: {
    rotate: () => [523, 659].forEach((f, i) => pulse({ f, t: i * 0.05, dur: 0.05 })),
    select: () => { [659, 988, 1318].forEach((f, i) => pulse({ f, t: i * 0.05, dur: 0.06, duty: 0.25 })); },
    back: () => [784, 392].forEach((f, i) => pulse({ f, t: i * 0.05, dur: 0.06 })),
    open: () => [262, 330, 392, 523, 659].forEach((f, i) => pulse({ f, t: i * 0.035, dur: 0.05, duty: 0.25 })),
    toggle: () => pulse({ f: 1568, dur: 0.03 }),
    error: () => { tone({ f: 98, dur: 0.18, gain: 0.07, type: 'triangle', attack: 0.001 }); pulse({ f: 104, dur: 0.12, gain: 0.03, duty: 0.5 }); },
    startup: () => { [523, 659, 784, 1046].forEach((f, i) => pulse({ f, t: i * 0.09, dur: 0.08, duty: 0.25 })); tone({ f: 131, t: 0.36, dur: 0.5, gain: 0.07, type: 'triangle', attack: 0.001 }); },
    launch: () => { [392, 523, 659, 784, 1046, 1318].forEach((f, i) => pulse({ f, t: i * 0.03, dur: 0.04, duty: 0.25 })); },
  },
  // Anillo: síntesis FM, metálica y con golpe, como el Genesis.
  anillo: {
    rotate: () => fm({ f: 220, f2: 440, dur: 0.18, gain: 0.06, ratio: 1, index: 4 }),
    select: () => { fm({ f: 523, dur: 0.25, gain: 0.06, ratio: 3.5, index: 2.5 }); fm({ f: 784, t: 0.07, dur: 0.3, gain: 0.05, ratio: 3.5, index: 2.5 }); },
    back: () => fm({ f: 660, f2: 330, dur: 0.18, gain: 0.05, ratio: 2, index: 3 }),
    open: () => { fm({ f: 110, f2: 55, dur: 0.4, gain: 0.09, ratio: 1, index: 6, decay: 0.9 }); [392, 523, 784].forEach((f, i) => fm({ f, t: 0.05 + i * 0.05, dur: 0.25, gain: 0.04, ratio: 3, index: 2 })); },
    toggle: () => fm({ f: 1046, dur: 0.06, gain: 0.04, ratio: 5, index: 1.5 }),
    error: () => fm({ f: 82, dur: 0.3, gain: 0.09, ratio: 1.41, index: 8 }),
    startup: () => { fm({ f: 55, f2: 110, dur: 1.2, gain: 0.1, ratio: 1, index: 5, decay: 0.8 }); [523, 659, 784, 1046].forEach((f, i) => fm({ f, t: 0.5 + i * 0.08, dur: 0.6, gain: 0.04, ratio: 3.5, index: 2 })); },
    launch: () => { fm({ f: 110, f2: 880, dur: 0.5, gain: 0.08, ratio: 1, index: 5 }); fm({ f: 1046, t: 0.45, dur: 0.5, gain: 0.04, ratio: 3.5, index: 2 }); },
  },
});
Object.assign(SFX, {
  // Órbita: tonos limpios y brillantes con mucho eco, espaciales.
  orbita: {
    rotate: () => { tone({ f: 330, f2: 660, dur: 0.4, gain: 0.04, out: echo }); noise({ dur: 0.5, gain: 0.02, from: 3000, to: 800, out: echo }); },
    select: () => { [659, 988, 1318].forEach((f, i) => tone({ f, t: i * 0.06, dur: 0.6, gain: 0.03, out: echo })); },
    back: () => tone({ f: 988, f2: 494, dur: 0.3, gain: 0.035, out: echo }),
    open: () => { tone({ f: 220, f2: 880, dur: 0.6, gain: 0.04, out: echo }); [1318, 1760].forEach((f, i) => tone({ f, t: 0.3 + i * 0.1, dur: 0.8, gain: 0.025, out: echo })); },
    toggle: () => tone({ f: 1760, dur: 0.08, gain: 0.025, out: echo }),
    error: () => tone({ f: 196, f2: 165, dur: 0.3, gain: 0.06, type: 'triangle' }),
    startup: () => { tone({ f: 65, f2: 130, dur: 2.5, gain: 0.07, attack: 0.8 }); [523, 784, 1046, 1568].forEach((f, i) => tone({ f, t: 0.8 + i * 0.18, dur: 1.6, gain: 0.025, out: echo, attack: 0.1 })); },
    launch: () => { tone({ f: 110, f2: 1760, dur: 0.9, gain: 0.04, out: echo }); },
  },
  // Tarjeta: chip de onda corta, agudo y nervioso.
  tarjeta: {
    rotate: () => [880, 1175].forEach((f, i) => tone({ f, t: i * 0.04, dur: 0.05, gain: 0.035, type: 'square', q: 4000, attack: 0.001 })),
    select: () => [784, 1046, 1568].forEach((f, i) => tone({ f, t: i * 0.045, dur: 0.07, gain: 0.035, type: 'square', q: 3500, attack: 0.001 })),
    back: () => tone({ f: 1046, f2: 523, dur: 0.1, gain: 0.035, type: 'square', q: 3000 }),
    open: () => tone({ f: 262, f2: 1046, dur: 0.18, gain: 0.04, type: 'square', q: 3000 }),
    toggle: () => tone({ f: 2093, dur: 0.03, gain: 0.03, type: 'square', q: 5000, attack: 0.001 }),
    error: () => tone({ f: 123, dur: 0.18, gain: 0.05, type: 'square', q: 1200 }),
    startup: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ f, t: i * 0.07, dur: 0.1, gain: 0.035, type: 'square', q: 3500, attack: 0.001 })),
    launch: () => { tone({ f: 131, f2: 2093, dur: 0.4, gain: 0.04, type: 'square', q: 4000 }); },
  },
  // Ficha: la moneda cayendo, bips de máquina y un zumbido de salón.
  ficha: {
    rotate: () => { tone({ f: 988, dur: 0.06, gain: 0.04, type: 'square', attack: 0.001 }); tone({ f: 1318, t: 0.06, dur: 0.1, gain: 0.04, type: 'square', attack: 0.001 }); },
    select: () => { [1976, 2637].forEach((f, i) => tone({ f, t: i * 0.08, dur: 0.25, gain: 0.04, type: 'square', q: 6000, attack: 0.001 })); }, // ¡moneda!
    back: () => tone({ f: 440, f2: 220, dur: 0.12, gain: 0.04, type: 'square' }),
    open: () => [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone({ f, t: i * 0.03, dur: 0.05, gain: 0.035, type: 'square', attack: 0.001 })),
    toggle: () => tone({ f: 1760, dur: 0.03, gain: 0.03, type: 'square', attack: 0.001 }),
    error: () => { tone({ f: 110, dur: 0.12, gain: 0.06, type: 'sawtooth', q: 900 }); tone({ f: 104, t: 0.12, dur: 0.18, gain: 0.06, type: 'sawtooth', q: 900 }); },
    startup: () => { [1976, 2637].forEach((f, i) => tone({ f, t: i * 0.08, dur: 0.3, gain: 0.04, type: 'square', q: 6000, attack: 0.001 })); [262, 330, 392, 523].forEach((f, i) => tone({ f, t: 0.4 + i * 0.08, dur: 0.12, gain: 0.04, type: 'square', attack: 0.001 })); },
    launch: () => { [1976, 2637].forEach((f, i) => tone({ f, t: i * 0.08, dur: 0.3, gain: 0.04, type: 'square', q: 6000, attack: 0.001 })); tone({ f: 110, f2: 880, t: 0.2, dur: 0.5, gain: 0.04, type: 'square', q: 2000 }); },
  },
  // Símbolo: la bocina interna de la PC: un solo bip cuadrado, seco.
  simbolo: {
    rotate: () => tone({ f: 880, dur: 0.04, gain: 0.03, type: 'square', attack: 0.001 }),
    select: () => tone({ f: 1046, dur: 0.07, gain: 0.035, type: 'square', attack: 0.001 }),
    back: () => tone({ f: 587, dur: 0.05, gain: 0.03, type: 'square', attack: 0.001 }),
    open: () => tone({ f: 784, dur: 0.06, gain: 0.03, type: 'square', attack: 0.001 }),
    toggle: () => tone({ f: 1318, dur: 0.03, gain: 0.03, type: 'square', attack: 0.001 }),
    error: () => tone({ f: 880, dur: 0.35, gain: 0.04, type: 'square', attack: 0.001 }),
    startup: () => tone({ f: 1000, dur: 0.12, gain: 0.04, type: 'square', attack: 0.001 }),
    launch: () => [523, 784].forEach((f, i) => tone({ f, t: i * 0.08, dur: 0.07, gain: 0.035, type: 'square', attack: 0.001 })),
  },
});
Object.assign(SFX, {
  // Luna: clics suaves de escritorio y campanas cálidas.
  luna: {
    rotate: () => click({ f: 2200, gain: 0.05, body: 700, dur: 0.025 }),
    select: () => { tone({ f: 659, dur: 0.4, gain: 0.04, type: 'triangle' }); tone({ f: 988, t: 0.09, dur: 0.6, gain: 0.035, type: 'triangle' }); },
    back: () => click({ f: 1800, gain: 0.05, body: 600, dur: 0.025 }),
    open: () => { click({ f: 2400, gain: 0.05, body: 800, dur: 0.025 }); tone({ f: 784, t: 0.02, dur: 0.18, gain: 0.025, type: 'triangle' }); },
    toggle: () => click({ f: 2800, gain: 0.04, body: 900, dur: 0.02 }),
    error: () => { tone({ f: 523, dur: 0.12, gain: 0.05, type: 'triangle' }); tone({ f: 392, t: 0.1, dur: 0.3, gain: 0.05, type: 'triangle' }); },
    startup: () => [392, 523, 659, 784, 1046].forEach((f, i) => tone({ f, t: i * 0.16, dur: 1.4, gain: 0.03, type: 'triangle', attack: 0.05, out: echo })),
    launch: () => { tone({ f: 523, dur: 0.5, gain: 0.04, type: 'triangle' }); tone({ f: 784, t: 0.12, dur: 0.6, gain: 0.035, type: 'triangle' }); },
  },
  // Doble: toques de pantalla táctil, redondos y cortos.
  doble: {
    rotate: () => tone({ f: 1200, f2: 1500, dur: 0.06, gain: 0.04 }),
    select: () => { tone({ f: 880, dur: 0.08, gain: 0.05 }); tone({ f: 1320, t: 0.06, dur: 0.12, gain: 0.045 }); },
    back: () => tone({ f: 1100, f2: 700, dur: 0.1, gain: 0.04 }),
    open: () => [988, 1318, 1760].forEach((f, i) => tone({ f, t: i * 0.04, dur: 0.1, gain: 0.035 })),
    toggle: () => tone({ f: 1760, dur: 0.04, gain: 0.035 }),
    error: () => tone({ f: 330, f2: 260, dur: 0.18, gain: 0.05, type: 'triangle' }),
    startup: () => { tone({ f: 1046, dur: 0.15, gain: 0.04 }); tone({ f: 1568, t: 0.12, dur: 0.5, gain: 0.04 }); },
    launch: () => [784, 1046, 1318, 1568].forEach((f, i) => tone({ f, t: i * 0.05, dur: 0.15, gain: 0.035 })),
  },
  // Basic: el chip de sonido de tres voces, cuadrado y claro.
  basic: {
    rotate: () => [784, 1046].forEach((f, i) => tone({ f, t: i * 0.05, dur: 0.05, gain: 0.035, type: 'square', attack: 0.001 })),
    select: () => tone({ f: 1318, dur: 0.12, gain: 0.04, type: 'square', attack: 0.001 }),
    back: () => tone({ f: 659, dur: 0.07, gain: 0.035, type: 'square', attack: 0.001 }),
    open: () => [523, 659, 784].forEach((f, i) => tone({ f, t: i * 0.05, dur: 0.06, gain: 0.035, type: 'square', attack: 0.001 })),
    toggle: () => tone({ f: 1568, dur: 0.03, gain: 0.03, type: 'square', attack: 0.001 }),
    error: () => tone({ f: 147, dur: 0.25, gain: 0.05, type: 'square', attack: 0.001 }),
    startup: () => tone({ f: 1760, dur: 0.15, gain: 0.04, type: 'square', attack: 0.001 }),
    launch: () => [523, 659, 784, 1046].forEach((f, i) => tone({ f, t: i * 0.06, dur: 0.07, gain: 0.035, type: 'square', attack: 0.001 })),
  },
});
Object.assign(SFX, {
  // Relieve: burbujas suaves y toques redondos.
  relieve: {
    rotate: () => { tone({ f: 660, f2: 990, dur: 0.09, gain: 0.04 }); tone({ f: 1320, t: 0.05, dur: 0.08, gain: 0.025 }); },
    select: () => { tone({ f: 784, dur: 0.1, gain: 0.05 }); tone({ f: 1175, t: 0.07, dur: 0.18, gain: 0.04 }); },
    back: () => tone({ f: 990, f2: 660, dur: 0.12, gain: 0.04 }),
    open: () => { tone({ f: 330, f2: 1320, dur: 0.22, gain: 0.04 }); },
    toggle: () => tone({ f: 1568, f2: 1760, dur: 0.05, gain: 0.035 }),
    error: () => tone({ f: 294, f2: 247, dur: 0.18, gain: 0.05, type: 'triangle' }),
    startup: () => [523, 784, 1046, 1568].forEach((f, i) => tone({ f, t: i * 0.1, dur: 0.6, gain: 0.03, out: echo })),
    launch: () => { tone({ f: 262, f2: 1046, dur: 0.4, gain: 0.04 }); tone({ f: 1568, t: 0.35, dur: 0.5, gain: 0.03, out: echo }); },
  },
  // Alas: cristal suave y aireado, discreto.
  alas: {
    rotate: () => { tone({ f: 1760, dur: 0.12, gain: 0.025 }); noise({ dur: 0.2, gain: 0.012, from: 6000, to: 9000 }); },
    select: () => { tone({ f: 1318, dur: 0.35, gain: 0.03 }); tone({ f: 1976, t: 0.05, dur: 0.45, gain: 0.022 }); },
    back: () => tone({ f: 1480, f2: 1175, dur: 0.15, gain: 0.025 }),
    open: () => { noise({ dur: 0.4, gain: 0.015, from: 2000, to: 9000 }); tone({ f: 1046, t: 0.05, dur: 0.5, gain: 0.025 }); },
    toggle: () => tone({ f: 2349, dur: 0.05, gain: 0.02 }),
    error: () => tone({ f: 392, f2: 349, dur: 0.18, gain: 0.04, type: 'triangle' }),
    startup: () => { noise({ dur: 2, gain: 0.015, from: 300, to: 8000 }); [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ f, t: 0.6 + i * 0.06, dur: 2, gain: 0.018, attack: 0.4 })); },
    launch: () => { tone({ f: 784, dur: 0.6, gain: 0.03 }); tone({ f: 1568, t: 0.1, dur: 0.8, gain: 0.022 }); noise({ dur: 0.7, gain: 0.015, from: 1500, to: 9000 }); },
  },
  // Monolito: clics nítidos con un golpe grave, sobrio.
  monolito: {
    rotate: () => { tone({ f: 80, f2: 60, dur: 0.12, gain: 0.07 }); click({ f: 3000, gain: 0.04, body: 1200, dur: 0.02 }); },
    select: () => { tone({ f: 988, dur: 0.1, gain: 0.04, type: 'triangle' }); tone({ f: 1480, t: 0.06, dur: 0.16, gain: 0.035, type: 'triangle' }); tone({ f: 70, dur: 0.18, gain: 0.06 }); },
    back: () => { click({ f: 2400, gain: 0.04, body: 900, dur: 0.02 }); tone({ f: 660, f2: 440, dur: 0.1, gain: 0.03, type: 'triangle' }); },
    open: () => { tone({ f: 55, f2: 82, dur: 0.35, gain: 0.08 }); tone({ f: 1318, t: 0.05, dur: 0.3, gain: 0.03, type: 'triangle' }); },
    toggle: () => click({ f: 3400, gain: 0.035, body: 1500, dur: 0.018 }),
    error: () => { tone({ f: 110, dur: 0.15, gain: 0.07, type: 'square', q: 700 }); },
    startup: () => { tone({ f: 41, f2: 82, dur: 2, gain: 0.09, attack: 0.6 }); [440, 659, 880].forEach((f, i) => tone({ f, t: 1 + i * 0.12, dur: 1.2, gain: 0.025, type: 'triangle' })); },
    launch: () => { tone({ f: 55, f2: 220, dur: 0.7, gain: 0.08 }); tone({ f: 1318, t: 0.4, dur: 0.6, gain: 0.03, type: 'triangle' }); },
  },
});
Object.assign(SFX, {
  // Steam: clics secos y un «whoosh» corto al cambiar de pestaña.
  vapor: {
    move: () => click({ f: 1800, gain: 0.04, body: 700, dur: 0.02 }),
    rotate: () => { noise({ dur: 0.18, gain: 0.03, from: 800, to: 4000 }); tone({ f: 440, f2: 520, dur: 0.08, gain: 0.025, type: 'triangle' }); },
    select: () => { tone({ f: 620, dur: 0.06, gain: 0.04, type: 'triangle' }); tone({ f: 930, t: 0.05, dur: 0.12, gain: 0.035, type: 'triangle' }); },
    back: () => tone({ f: 700, f2: 480, dur: 0.09, gain: 0.035, type: 'triangle' }),
    open: () => { noise({ dur: 0.35, gain: 0.03, from: 400, to: 5000 }); tone({ f: 392, dur: 0.25, gain: 0.03 }); tone({ f: 587, t: 0.08, dur: 0.3, gain: 0.03 }); },
    toggle: () => click({ f: 2200, gain: 0.035, body: 1000, dur: 0.016 }),
    error: () => tone({ f: 200, f2: 170, dur: 0.12, gain: 0.05, type: 'square', q: 900 }),
    startup: () => { noise({ dur: 0.9, gain: 0.03, from: 200, to: 3000 }); [261.6, 392, 523.3].forEach((f, i) => tone({ f, t: 0.15 + i * 0.12, dur: 1.2, gain: 0.03, type: 'triangle', q: 2400 })); },
    launch: () => { noise({ dur: 0.6, gain: 0.04, from: 300, to: 7000 }); [392, 523.3, 784].forEach((f, i) => tone({ f, t: i * 0.08, dur: 0.6, gain: 0.035, type: 'triangle' })); },
  },
  // Apple TV: «tics» suaves de cristal y un pop redondo al elegir.
  manzana: {
    move: (p = 0) => tone({ f: 1500 + (p % 4) * 40, dur: 0.035, gain: 0.03, attack: 0.001 }),
    rotate: () => tone({ f: 900, f2: 1100, dur: 0.07, gain: 0.03 }),
    select: () => { tone({ f: 660, f2: 990, dur: 0.09, gain: 0.04 }); tone({ f: 1320, t: 0.04, dur: 0.12, gain: 0.02 }); },
    back: () => tone({ f: 990, f2: 660, dur: 0.09, gain: 0.035 }),
    open: () => { tone({ f: 523.3, dur: 0.3, gain: 0.03, attack: 0.02 }); tone({ f: 784, t: 0.06, dur: 0.35, gain: 0.025, attack: 0.02 }); },
    toggle: () => tone({ f: 1200, dur: 0.04, gain: 0.03 }),
    error: () => { tone({ f: 330, dur: 0.07, gain: 0.04 }); tone({ f: 330, t: 0.1, dur: 0.07, gain: 0.04 }); },
    startup: () => [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone({ f, t: i * 0.11, dur: 1.4, gain: 0.022, attack: 0.04 })),
    launch: () => { tone({ f: 523.3, f2: 1046.5, dur: 0.4, gain: 0.03 }); tone({ f: 1568, t: 0.25, dur: 0.6, gain: 0.018 }); },
  },
  // Vitrina: toques de interfaz modernos, cortos y limpios.
  vitrina: {
    rotate: () => { tone({ f: 660, f2: 880, dur: 0.07, gain: 0.03 }); noise({ dur: 0.08, gain: 0.008, from: 3000, to: 7000 }); },
    select: () => { tone({ f: 880, dur: 0.08, gain: 0.035 }); tone({ f: 1320, t: 0.05, dur: 0.14, gain: 0.03 }); },
    back: () => tone({ f: 990, f2: 660, dur: 0.09, gain: 0.03 }),
    open: () => { tone({ f: 523, dur: 0.18, gain: 0.03 }); tone({ f: 784, t: 0.06, dur: 0.22, gain: 0.028 }); tone({ f: 1046, t: 0.12, dur: 0.3, gain: 0.022 }); },
    toggle: () => click({ f: 2800, gain: 0.03, body: 1300, dur: 0.016 }),
    error: () => tone({ f: 220, f2: 196, dur: 0.14, gain: 0.04, type: 'triangle' }),
    startup: () => [392, 523, 659, 784].forEach((f, i) => tone({ f, t: i * 0.09, dur: 1.4, gain: 0.02, attack: 0.05 })),
    launch: () => { tone({ f: 523, f2: 1046, dur: 0.35, gain: 0.035 }); tone({ f: 1568, t: 0.25, dur: 0.5, gain: 0.022 }); },
  },
  // Plaza: toques suaves y alegres, con campanita.
  plaza: {
    rotate: () => { tone({ f: 880, f2: 1100, dur: 0.08, gain: 0.04 }); tone({ f: 1320, t: 0.05, dur: 0.1, gain: 0.025 }); },
    select: () => { pluck(1046, 0, 0.05); pluck(1568, 0.07, 0.04); },
    back: () => tone({ f: 1046, f2: 660, dur: 0.12, gain: 0.04 }),
    open: () => [784, 988, 1175, 1568].forEach((f, i) => pluck(f, i * 0.05, 0.035)),
    toggle: () => tone({ f: 1760, dur: 0.05, gain: 0.03 }),
    error: () => tone({ f: 330, f2: 277, dur: 0.18, gain: 0.05, type: 'triangle' }),
    startup: () => [523, 659, 784, 1046, 1318].forEach((f, i) => pluck(f, i * 0.1, 0.04)),
    launch: () => { tone({ f: 262, f2: 1046, dur: 0.35, gain: 0.04 }); [1318, 1568].forEach((f, i) => pluck(f, 0.3 + i * 0.07, 0.035)); },
  },
  // Índigo: pitidos cuadrados brillantes y rápidos, de portátil.
  indigo: {
    rotate: () => [1046, 1568].forEach((f, i) => tone({ f, t: i * 0.04, dur: 0.05, gain: 0.03, type: 'square', attack: 0.001, q: 5000 })),
    select: () => [1318, 1760, 2093].forEach((f, i) => tone({ f, t: i * 0.04, dur: 0.06, gain: 0.03, type: 'square', attack: 0.001, q: 5000 })),
    back: () => [1046, 784].forEach((f, i) => tone({ f, t: i * 0.04, dur: 0.05, gain: 0.03, type: 'square', attack: 0.001 })),
    open: () => tone({ f: 523, f2: 2093, dur: 0.14, gain: 0.03, type: 'square', q: 4000 }),
    toggle: () => tone({ f: 2637, dur: 0.03, gain: 0.025, type: 'square', attack: 0.001 }),
    error: () => tone({ f: 165, dur: 0.16, gain: 0.045, type: 'square', attack: 0.001 }),
    startup: () => { tone({ f: 1046, dur: 0.06, gain: 0.035, type: 'square', attack: 0.001 }); tone({ f: 2093, t: 0.08, dur: 0.7, gain: 0.03, type: 'square', attack: 0.001, q: 4000 }); },
    launch: () => [784, 1046, 1318, 1568, 2093].forEach((f, i) => tone({ f, t: i * 0.03, dur: 0.05, gain: 0.03, type: 'square', attack: 0.001 })),
  },
  // Rojo: tonos graves y huecos, con eco profundo.
  rojo: {
    rotate: () => { tone({ f: 110, f2: 220, dur: 0.2, gain: 0.05, type: 'triangle', out: echo }); },
    select: () => { tone({ f: 440, dur: 0.25, gain: 0.04, type: 'square', q: 1200, out: echo }); tone({ f: 660, t: 0.08, dur: 0.3, gain: 0.035, type: 'square', q: 1200, out: echo }); },
    back: () => tone({ f: 330, f2: 165, dur: 0.2, gain: 0.04, type: 'square', q: 900 }),
    open: () => { tone({ f: 55, f2: 110, dur: 0.6, gain: 0.07, type: 'triangle' }); tone({ f: 880, t: 0.1, dur: 0.4, gain: 0.025, out: echo }); },
    toggle: () => tone({ f: 880, dur: 0.04, gain: 0.03, type: 'square', q: 1500 }),
    error: () => tone({ f: 73, dur: 0.3, gain: 0.08, type: 'square', q: 400 }),
    startup: () => { tone({ f: 41, f2: 82, dur: 2.4, gain: 0.08, attack: 0.8 }); [330, 440, 660].forEach((f, i) => tone({ f, t: 0.9 + i * 0.25, dur: 1, gain: 0.025, type: 'square', q: 1000, out: echo })); },
    launch: () => { tone({ f: 55, f2: 440, dur: 0.8, gain: 0.06, type: 'triangle', out: echo }); },
  },
});
// ---------- Movimiento musical ----------
// Cada paso toca la siguiente nota de una escala: hacia adelante sube, hacia atrás baja.
// «shepard»: escala infinita (varias octavas a la vez, con las de los extremos apagándose), nunca se sale de tono.
// «escala»: melodía dentro de dos octavas que se mueve contigo, como tocar un instrumento.
let deg = 0, lastP = null, lastAt = 0;
function stepDegree(p) {
  const now = performance.now();
  if (typeof p === 'number' && lastP !== null && now - lastAt < 4000 && p !== lastP) deg += p > lastP ? 1 : -1;
  else if (typeof p !== 'number' || lastP === null) deg += 1;
  else deg += 1;
  lastP = typeof p === 'number' ? p : null; lastAt = now;
  return deg;
}
const MAJ = [0, 2, 4, 5, 7, 9, 11], PEN = [0, 2, 4, 7, 9], MINP = [0, 3, 5, 7, 10], MIX = [0, 2, 4, 5, 7, 9, 10], LYD = [0, 2, 4, 6, 7, 9, 11];
const semi = (scale, d) => { const n = scale.length, o = Math.floor(d / n); return scale[((d % n) + n) % n] + 12 * o; };
function shepard(base, scale, d, voice) {
  // Las octavas suben juntas; el volumen depende de su altura (campana en escala logarítmica).
  const s = semi(scale, d), center = Math.log2(base * 2);
  for (let oct = -2; oct <= 2; oct++) {
    const f = base * Math.pow(2, (s % 12 + 12) % 12 / 12 + oct);
    const x = Math.log2(f) - center, w = Math.exp(-(x * x) / 1.1);
    if (w > 0.04) voice(f, w);
  }
}
function melody(base, scale, d, voice) {
  const span = scale.length * 2, k = ((d % span) + span) % span;
  // Va y viene dentro de dos octavas (sube hasta arriba y regresa), para que nunca se salga de rango.
  const turn = Math.floor(d / span) % 2 !== 0;
  voice(base * Math.pow(2, semi(scale, turn ? span - k : k) / 12), 1);
}
const MOVE = {
  cubo: d => shepard(330, MAJ, d, (f, w) => tone({ f, dur: 0.16, gain: 0.05 * w, type: 'triangle', q: 2600 })),
  canal: d => melody(523, PEN, d, f => { pluck(f, 0, 0.04); tone({ f: f * 2, dur: 0.06, gain: 0.012, attack: 0.002 }); }),
  barra: d => melody(1046, PEN, d, f => tone({ f, dur: 0.09, gain: 0.025, attack: 0.002 })),
  panel: d => melody(659, MIX, d, f => tone({ f, f2: f * 0.97, dur: 0.07, gain: 0.04, type: 'triangle', attack: 0.002 })),
  torre: d => { tone({ f: 98, f2: 82, dur: 0.2, gain: 0.05, attack: 0.004 }); shepard(660, LYD, d, (f, w) => tone({ f, dur: 0.18, gain: 0.02 * w, out: echo })); },
  onda: d => melody(880, PEN, d, f => tone({ f, dur: 0.06, gain: 0.035, type: 'triangle', attack: 0.001 })),
  esfera: d => melody(196, MINP, d, f => tone({ f, f2: f * 2.2, dur: 0.08, gain: 0.05, attack: 0.002 })),
  naranja: d => shepard(523, MAJ, d, (f, w) => tone({ f, dur: 0.1, gain: 0.035 * w, attack: 0.002, out: w > 0.8 ? echo : undefined })),
  lavanda: d => melody(784, MAJ, d, f => { tone({ f, dur: 0.12, gain: 0.035, type: 'triangle', attack: 0.002 }); tone({ f: f * 2, dur: 0.05, gain: 0.01, type: 'square', q: 3000 }); }),
  volumen: d => shepard(392, MAJ, d, (f, w) => tone({ f, f2: f * 1.06, dur: 0.1, gain: 0.05 * w, type: 'triangle', attack: 0.002 })),
  disco: d => melody(523, LYD, d, f => tone({ f, dur: 0.22, gain: 0.03, out: echo, attack: 0.003 })),
  gris: d => melody(659, MAJ, d, f => pulse({ f, dur: 0.05, gain: 0.035 })),
  anillo: d => melody(392, MIX, d, f => fm({ f, dur: 0.12, gain: 0.045, ratio: 3.5, index: 2.2 })),
  orbita: d => shepard(523, LYD, d, (f, w) => tone({ f, dur: 0.22, gain: 0.03 * w, out: echo, attack: 0.003 })),
  tarjeta: d => melody(880, MAJ, d, f => tone({ f, dur: 0.045, gain: 0.03, type: 'square', q: 4000, attack: 0.001 })),
  ficha: d => melody(523, PEN, d, f => tone({ f, dur: 0.04, gain: 0.035, type: 'square', attack: 0.001 })),
  simbolo: d => tone({ f: 600 + ((d % 4) + 4) % 4 * 0, dur: 0.012, gain: 0.025, type: 'square', attack: 0.001 }),
  luna: () => click({ f: 2600, gain: 0.045, body: 800, dur: 0.02 }),
  doble: d => melody(880, PEN, d, f => tone({ f, dur: 0.05, gain: 0.035, attack: 0.002 })),
  basic: d => melody(523, MAJ, d, f => tone({ f, dur: 0.04, gain: 0.03, type: 'square', attack: 0.001 })),
  relieve: d => melody(784, PEN, d, f => tone({ f, f2: f * 1.04, dur: 0.06, gain: 0.035, attack: 0.002 })),
  alas: () => tone({ f: 2093, dur: 0.05, gain: 0.018, attack: 0.002 }),
  monolito: () => click({ f: 3200, gain: 0.045, body: 1100, dur: 0.02 }),
  vitrina: () => click({ f: 2400, gain: 0.035, body: 1600, dur: 0.018 }),
  vapor: () => click({ f: 1800, gain: 0.035, body: 700, dur: 0.018 }),
  manzana: () => tone({ f: 1500, dur: 0.03, gain: 0.025, attack: 0.001 }),
  plaza: d => melody(784, PEN, d, f => pluck(f, 0, 0.035)),
  indigo: d => melody(1046, MAJ, d, f => tone({ f, dur: 0.04, gain: 0.028, type: 'square', attack: 0.001, q: 5000 })),
  rojo: d => shepard(220, MINP, d, (f, w) => tone({ f, dur: 0.14, gain: 0.03 * w, type: 'square', q: 1200, out: echo })),
  pantalla: d => melody(1046, PEN, d, f => tone({ f, dur: 0.04, gain: 0.035, type: 'square', attack: 0.001 })),
  cristal: d => shepard(1046, PEN, d, (f, w) => tone({ f, dur: 0.2, gain: 0.03 * w })),
  retro: d => melody(523, MAJ, d, f => tone({ f, dur: 0.05, gain: 0.04, type: 'square', attack: 0.001 })),
  madera: d => melody(392, PEN, d, f => marimba(f, 0, 0.07)),
  espacial: d => shepard(440, MINP, d, (f, w) => tone({ f, dur: 0.18, gain: 0.03 * w, out: echo, vib: 7 })),
};
export function moveDegree() { return deg; }

const PACK_MAP = { move: 'move', rotate: 'move', toggle: 'move', select: 'select', open: 'select', launch: 'select', back: 'back', error: 'back', startup: 'startup' };

export function play(name, arg) {
  if (!running() || theme === 'silencio') return;
  const p = packs[theme];
  if (p) {
    const list = p.buffers?.[PACK_MAP[name]];
    if (!list?.length) return;
    const s = ctx.createBufferSource(); s.buffer = list[Math.floor(Math.random() * list.length)];
    const g = ctx.createGain(); g.gain.value = 0.8; s.connect(g); g.connect(sfxBus); s.start();
    return;
  }
  if (name === 'move' && MOVE[theme]) { MOVE[theme](stepDegree(arg)); return; }
  const fn = SFX[theme]?.[name];
  if (fn) fn(arg);
}

// Ambiente: acordes que respiran lentamente; cambia con el tema sintetizado.
// ---------- Ambientes: cada tema tiene el suyo ----------
// pad: acordes que respiran · air: aire filtrado con destellos · seq: cajita musical en bucle · swell: oleadas cálidas
const AMB = {
  cubo: { kind: 'pad', notes: [55, 82.41, 110, 164.81], lp: 520, lfo: 220, gain: 0.05, types: ['sine', 'sine', 'triangle', 'triangle'] }, // grave y misterioso
  barra: { kind: 'air', base: 1760, gain: 0.02 },                                   // casi silencio: aire y destellos lejanos
  mosaico: { kind: 'none' },                                                        // sin música de fondo, como su consola
  canal: { kind: 'seq', bpm: 92, gain: 0.05,                                        // cajita musical tranquila y alegre (original)
    melody: [67, 0, 72, 0, 76, 74, 72, 0, 69, 0, 72, 0, 67, 0, 64, 0, 65, 0, 69, 0, 72, 71, 69, 0, 67, 0, 0, 0, 64, 0, 0, 0],
    bass: [48, 0, 0, 0, 0, 0, 0, 0, 45, 0, 0, 0, 0, 0, 0, 0, 41, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0, 0, 0] },
  panel: { kind: 'swell', notes: [146.8, 220, 277.2, 329.6], lp: 1600, gain: 0.03 }, // cálido y aireado con oleadas
  torre: { kind: 'drone', root: 41.2, gain: 0.07 },                                   // zumbido profundo de un espacio enorme y destellos con eco
  onda: { kind: 'pad', notes: [261.6, 329.6, 392, 493.9, 587.3], lp: 1500, lfo: 600, gain: 0.016, types: ['sine', 'triangle'] }, // claro y ligero
  esfera: { kind: 'bubble', root: 36.7, gain: 0.06 },                                  // zumbido orgánico con burbujas
  naranja: { kind: 'seq', bpm: 66, gain: 0.03, wave: 'sine', echo: true,               // arpegio brillante y lento con eco (original)
    melody: [72, 76, 79, 84, 0, 79, 76, 0, 71, 74, 79, 83, 0, 79, 74, 0, 69, 72, 76, 81, 0, 76, 72, 0, 67, 71, 74, 79, 0, 0, 0, 0],
    bass: [48, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0, 0, 0, 45, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0, 0, 0] },
  lavanda: { kind: 'seq', bpm: 84, gain: 0.032, wave: 'triangle', echo: true,             // tonada de pueblo tranquila (original)
    melody: [72, 0, 74, 76, 0, 79, 76, 74, 72, 0, 69, 0, 67, 0, 0, 0, 69, 0, 72, 74, 0, 76, 74, 72, 74, 0, 0, 0, 0, 0, 0, 0],
    bass: [48, 0, 0, 0, 55, 0, 0, 0, 45, 0, 0, 0, 52, 0, 0, 0, 41, 0, 0, 0, 48, 0, 0, 0, 43, 0, 0, 0, 50, 0, 0, 0] },
  volumen: { kind: 'seq', bpm: 112, gain: 0.03, wave: 'triangle',                          // ritmo saltarín (original)
    melody: [72, 0, 76, 0, 79, 0, 76, 0, 77, 0, 81, 0, 79, 0, 0, 0, 74, 0, 77, 0, 81, 0, 77, 0, 79, 0, 76, 0, 72, 0, 0, 0],
    bass: [48, 0, 55, 0, 48, 0, 55, 0, 53, 0, 60, 0, 53, 0, 60, 0, 50, 0, 57, 0, 50, 0, 57, 0, 43, 0, 50, 0, 43, 0, 47, 0] },
  disco: { kind: 'pad', notes: [73.4, 110, 164.8, 220, 329.6], lp: 900, lfo: 400, gain: 0.03, types: ['sine', 'triangle'] }, // niebla fría y profunda
  gris: { kind: 'seq', bpm: 150, gain: 0.02, wave: 'square',                               // tonada de 8 bits (original)
    melody: [72, 0, 72, 76, 0, 79, 0, 76, 74, 0, 74, 77, 0, 81, 0, 77, 76, 0, 79, 0, 84, 0, 79, 76, 74, 0, 71, 0, 72, 0, 0, 0],
    bass: [48, 0, 0, 0, 55, 0, 0, 0, 50, 0, 0, 0, 53, 0, 0, 0, 48, 0, 0, 0, 52, 0, 0, 0, 43, 0, 0, 0, 48, 0, 0, 0] },
  anillo: { kind: 'drone', root: 55, gain: 0.05 },                                           // zumbido oscuro y metálico con chispas
  orbita: { kind: 'pad', notes: [130.8, 196, 261.6, 392, 523.3], lp: 2600, lfo: 1200, gain: 0.02, types: ['sine', 'triangle'] }, // espacio luminoso
  tarjeta: { kind: 'seq', bpm: 128, gain: 0.018, wave: 'square',                           // ritmo de 16 bits (original)
    melody: [69, 0, 72, 76, 0, 72, 69, 0, 67, 0, 71, 74, 0, 71, 67, 0, 65, 0, 69, 72, 0, 69, 65, 0, 64, 0, 68, 71, 0, 0, 0, 0],
    bass: [45, 0, 0, 0, 45, 0, 0, 0, 43, 0, 0, 0, 43, 0, 0, 0, 41, 0, 0, 0, 41, 0, 0, 0, 40, 0, 0, 0, 40, 0, 0, 0] },
  ficha: { kind: 'drone', root: 61.7, gain: 0.03 },                                          // zumbido de salón con bips lejanos
  simbolo: { kind: 'none' },                                                                 // la PC no tenía música de fondo
  luna: { kind: 'pad', notes: [196, 293.7, 392, 493.9], lp: 1200, lfo: 300, gain: 0.025, types: ['triangle', 'sine'] }, // cielo tranquilo de escritorio
  doble: { kind: 'none' },                                                                   // el menú de su consola era silencioso
  basic: { kind: 'seq', bpm: 96, gain: 0.015, wave: 'square',                               // tonada de computadora casera (original)
    melody: [72, 0, 76, 0, 79, 0, 76, 0, 74, 0, 77, 0, 81, 0, 77, 0, 72, 0, 76, 0, 79, 0, 84, 0, 83, 0, 79, 0, 72, 0, 0, 0], bass: [] },
  relieve: { kind: 'seq', bpm: 100, gain: 0.025, wave: 'sine', echo: true,                  // tonada ligera de menú (original)
    melody: [76, 0, 79, 0, 81, 79, 76, 0, 74, 0, 76, 0, 72, 0, 0, 0, 74, 0, 77, 0, 79, 77, 74, 0, 72, 0, 71, 0, 72, 0, 0, 0],
    bass: [48, 0, 0, 0, 0, 0, 0, 0, 45, 0, 0, 0, 0, 0, 0, 0, 41, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0, 0, 0] },
  alas: { kind: 'pad', notes: [220, 329.6, 440, 554.4, 659.3], lp: 3000, lfo: 1400, gain: 0.014, types: ['sine'] }, // calma luminosa
  vapor: { kind: 'pad', notes: [130.8, 196, 261.6, 329.6], lp: 1200, lfo: 500, gain: 0.016, types: ['sine', 'triangle'] },
  manzana: { kind: 'pad', notes: [174.6, 261.6, 349.2, 440], lp: 1600, lfo: 700, gain: 0.014, types: ['sine', 'sine'] },
  vitrina: { kind: 'pad', notes: [146.8, 220, 293.7, 370], lp: 1400, lfo: 600, gain: 0.018, types: ['sine', 'triangle'] }, // fondo tranquilo
  monolito: { kind: 'pad', notes: [55, 82.4, 110, 146.8], lp: 380, lfo: 160, gain: 0.04, types: ['sawtooth', 'sine'] }, // grave y contenido
  plaza: { kind: 'seq', bpm: 104, gain: 0.025, wave: 'triangle',                            // paseo alegre por la plaza (original)
    melody: [72, 0, 76, 79, 0, 76, 74, 0, 72, 0, 69, 72, 0, 74, 0, 0, 71, 0, 74, 77, 0, 74, 72, 0, 71, 0, 67, 71, 0, 72, 0, 0],
    bass: [48, 0, 55, 0, 52, 0, 55, 0, 45, 0, 52, 0, 48, 0, 52, 0, 43, 0, 50, 0, 47, 0, 50, 0, 43, 0, 47, 0, 48, 0, 0, 0] },
  indigo: { kind: 'seq', bpm: 132, gain: 0.016, wave: 'square',                             // tonada de bolsillo a color (original)
    melody: [79, 0, 76, 0, 72, 0, 76, 79, 84, 0, 79, 0, 76, 0, 0, 0, 77, 0, 74, 0, 71, 0, 74, 77, 83, 0, 79, 0, 74, 0, 0, 0], bass: [] },
  rojo: { kind: 'drone', root: 36.7, gain: 0.05 },                                           // zumbido rojo profundo con destellos
  pantalla: { kind: 'seq', bpm: 138, gain: 0.018, wave: 'square',                          // cancioncita de bolsillo (original)
    melody: [76, 0, 79, 0, 84, 0, 79, 0, 81, 0, 79, 76, 0, 0, 0, 0, 74, 0, 77, 0, 81, 0, 77, 0, 79, 0, 76, 74, 0, 0, 0, 0], bass: [] },
  cristal: { kind: 'pad', notes: [523.25, 659.25, 783.99, 987.77], lp: 2400, lfo: 900, gain: 0.018, types: ['sine'] },
  retro: { kind: 'seq', bpm: 120, gain: 0.03, wave: 'square',
    melody: [60, 64, 67, 72, 60, 64, 67, 72, 57, 60, 64, 69, 57, 60, 64, 69, 53, 57, 60, 65, 53, 57, 60, 65, 55, 59, 62, 67, 55, 59, 62, 67], bass: [] },
  madera: { kind: 'pad', notes: [98, 146.8, 196, 246.9, 293.7], lp: 800, lfo: 200, gain: 0.035, types: ['sine', 'triangle'] },
  espacial: { kind: 'pad', notes: [41.2, 61.7, 82.4, 123.5], lp: 700, lfo: 500, gain: 0.035, types: ['sawtooth', 'sine'] },
};
let ambTimer = null, ambEchoNode = null;
// Eco propio del ambiente (para que siga el volumen del ambiente y no el de los efectos).
function ambEcho() {
  if (ambEchoNode) return ambEchoNode;
  const d = ctx.createDelay(1); d.delayTime.value = 0.32;
  const fb = ctx.createGain(); fb.gain.value = 0.42;
  const inG = ctx.createGain(); inG.connect(ambBus); inG.connect(d); d.connect(fb); fb.connect(d); d.connect(ambBus);
  return (ambEchoNode = inG);
}
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
function stopAmbient() {
  clearTimeout(ambTimer); ambTimer = null;
  for (const n of ambNodes) { try { n.stop ? n.stop() : n.disconnect(); } catch {} }
  ambNodes = [];
}
// Nota de cajita musical: ataque suave para que no chasquee, caída larga.
function boxNote(f, when, g0, wave = 'triangle', dest) {
  for (const [mult, k] of [[1, 1], [2, 0.18], [3, 0.06]]) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = mult === 1 ? wave : 'sine'; o.frequency.value = f * mult;
    g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(g0 * k, when + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, when + (wave === 'square' ? 0.18 : 1.4));
    o.connect(g); g.connect(dest || ambBus); o.start(when); o.stop(when + 1.5);
  }
}
function rebuildAmbient() {
  stopAmbient();
  const A = AMB[ambTheme];
  if (!ctx || !A || A.kind === 'none') return;
  if (A.kind === 'pad' || A.kind === 'swell') {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7; lp.frequency.value = A.lp;
    const out = ctx.createGain(); out.gain.value = 1; lp.connect(out); out.connect(ambBus); ambNodes.push(lp, out);
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
    lfo.frequency.value = A.kind === 'swell' ? 0.07 : 0.045; lfoG.gain.value = A.kind === 'swell' ? 900 : A.lfo;
    lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start(); ambNodes.push(lfo, lfoG);
    if (A.kind === 'swell') { // oleadas de volumen lentas
      const sw = ctx.createOscillator(), swG = ctx.createGain(); sw.frequency.value = 0.06; swG.gain.value = 0.45;
      sw.connect(swG); swG.connect(out.gain); sw.start(); ambNodes.push(sw, swG);
    }
    A.notes.forEach((f, i) => {
      for (const det of A.kind === 'swell' ? [-9, 0, 9] : [-4, 5]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = A.kind === 'swell' ? 'sawtooth' : A.types[i % A.types.length]; o.frequency.value = f; o.detune.value = det;
        g.gain.value = A.gain / (1 + i * 0.6) / (A.kind === 'swell' ? 2.2 : 1);
        if (A.kind === 'pad') {
          const tr = ctx.createOscillator(), trG = ctx.createGain();
          tr.frequency.value = 0.03 + i * 0.017; trG.gain.value = g.gain.value * 0.6; tr.connect(trG); trG.connect(g.gain); tr.start(); ambNodes.push(tr, trG);
        }
        o.connect(g); g.connect(lp); o.start(); ambNodes.push(o, g);
      }
    });
    if (A.kind === 'swell') { // de vez en cuando, un soplo de aire
      const puff = () => { if (ambOn && running()) noise({ dur: 2.4, gain: 0.012, from: 300, to: 2400, out: ambBus }); ambTimer = setTimeout(puff, 7000 + Math.random() * 6000); };
      ambTimer = setTimeout(puff, 3000);
    }
  } else if (A.kind === 'drone' || A.kind === 'bubble') {
    // Zumbido grave: dos osciladores casi iguales que laten despacio, con un filtro que respira.
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = A.kind === 'drone' ? 260 : 180; lp.Q.value = 3;
    const out = ctx.createGain(); out.gain.value = A.gain; lp.connect(out); out.connect(ambBus); ambNodes.push(lp, out);
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.04; lfoG.gain.value = A.kind === 'drone' ? 160 : 90;
    lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start(); ambNodes.push(lfo, lfoG);
    for (const [mult, det, type] of [[1, 0, 'sawtooth'], [1, 7, 'sawtooth'], [1.5, -4, 'triangle'], [2, 3, 'sine']]) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = A.root * mult; o.detune.value = det;
      g.gain.value = mult === 1 ? 0.5 : 0.25; o.connect(g); g.connect(lp); o.start(); ambNodes.push(o, g);
    }
    const spark = () => {
      if (ambOn && running()) {
        const t = ctx.currentTime + 0.02;
        if (A.kind === 'drone') boxNote(note(880, Math.floor(Math.random() * 8)), t, 0.01, 'sine', ambEcho());
        else for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) { // burbujas que suben
          const o = ctx.createOscillator(), g = ctx.createGain(), w = t + i * (0.08 + Math.random() * 0.1), f = 180 + Math.random() * 260;
          o.frequency.setValueAtTime(f, w); o.frequency.exponentialRampToValueAtTime(f * 2.6, w + 0.09);
          g.gain.setValueAtTime(0, w); g.gain.linearRampToValueAtTime(0.012, w + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, w + 0.12);
          o.connect(g); g.connect(ambBus); o.start(w); o.stop(w + 0.15);
        }
      }
      ambTimer = setTimeout(spark, (A.kind === 'drone' ? 4000 : 2200) + Math.random() * 4000);
    };
    ambTimer = setTimeout(spark, 1500);
  } else if (A.kind === 'air') {
    // Aire: ruido muy filtrado que respira, y destellos agudos y lejanos de vez en cuando.
    const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8; bp.frequency.value = 900;
    const g = ctx.createGain(); g.gain.value = A.gain * 0.5;
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.05; lfoG.gain.value = 500;
    lfo.connect(lfoG); lfoG.connect(bp.frequency); src.connect(bp); bp.connect(g); g.connect(ambBus); src.start(); lfo.start();
    ambNodes.push(src, bp, g, lfo, lfoG);
    const glint = () => {
      if (ambOn && running()) { const t = ctx.currentTime + 0.02; boxNote(note(A.base, Math.floor(Math.random() * 8)), t, 0.012, 'sine'); }
      ambTimer = setTimeout(glint, 3500 + Math.random() * 5000);
    };
    ambTimer = setTimeout(glint, 2000);
  } else if (A.kind === 'seq') {
    // Secuenciador con anticipación: programa las notas un poco antes para que nunca se atrasen.
    const step = 60 / A.bpm / 2; let i = 0, next = ctx.currentTime + 0.1;
    const tick = () => {
      while (next < ctx.currentTime + 0.4) {
        if (ambOn) {
          const m = A.melody[i % A.melody.length], bs = A.bass[i % (A.bass.length || 1)];
          if (m) boxNote(midi(m), next, A.gain, A.wave || 'triangle', A.echo ? ambEcho() : null);
          if (bs) boxNote(midi(bs), next, A.gain * 0.6, 'sine');
        }
        i++; next += step;
      }
      ambTimer = setTimeout(tick, 120);
    };
    tick();
  }
}
export function setAmbient(on) {
  if (!ctx) return;
  if (on && !ambNodes.length && !ambTimer) rebuildAmbient();
  ambOn = on;
  const A = AMB[ambTheme];
  ambBus.gain.setTargetAtTime(on && theme !== 'silencio' && A?.kind !== 'none' ? ambientLevel * 0.9 : 0, ctx.currentTime, on ? 1.2 : 0.4);
}
export function preview() { play('select'); setTimeout(() => play('move', 2), 260); setTimeout(() => play('move', 4), 400); }
