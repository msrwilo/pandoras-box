// Pandora — pantallas y lógica de la interfaz.
import { Spring, onFrame, onAction, draggable, project, rubberband, rem, sticks, reducedMotion, $, h, setTextSink, setCapture, getInputMode } from './core.js';
import * as S from './sound.js';
import { Manual, MODES as MANUAL_MODES } from './manual.js';

// ======================================================================
// Ajustes
// ======================================================================
const FIELDS = {
  genres: 'Género', year: 'Año', players: 'Jugadores', modes: 'Modo de juego', developer: 'Desarrolladora',
  publisher: 'Editora', region: 'Región', esrb: 'Clasificación', rating: 'Calificación', series: 'Serie',
  stats: 'Tus partidas', description: 'Descripción',
};
const SHELF_LAYOUTS = { tema: 'Del tema', repisa: 'Repisa', carrusel: 'Carrusel', rejilla: 'Rejilla', lista: 'Lista', rueda: 'Rueda', biblioteca: 'Biblioteca' };
const DETAIL_LAYOUTS = { tema: 'Del tema', clasica: 'Clásica', cine: 'Cine', poster: 'Póster', galeria: 'Galería', heroe: 'Héroe' };
const IMAGE_TYPES = [
  { id: 'box', label: 'Caja', aspect: 0.71, order: ['box', 'box3d', 'cart'] },
  { id: 'box3d', label: 'Caja 3D', aspect: 0.86, order: ['box3d', 'box', 'cart'] },
  { id: 'cart', label: 'Disco o cartucho', aspect: 1, order: ['cart', 'box'] },
  { id: 'logo', label: 'Logo', aspect: 1.9, order: ['logo'] },
  { id: 'shots', label: 'Captura', aspect: 1.34, order: ['shots', 'fanart'] },
];
const AUDIO_MODES = { video: 'Sonido del video', musica: 'Música del juego', ambiente: 'Ambiente' };
const AUDIO_SHORT = { video: 'Video', musica: 'Música', ambiente: 'Ambiente' };
const DEFAULTS = {
  theme: 'cubo', soundTheme: 'auto', volume: 0.7, ambient: 0.6, favFirst: true,
  audioMode: 'video', autoVideo: true, imageType: 'box',
  shelfLayout: 'tema', detailLayout: 'tema', manualMode: 'doble',
  cinemaDelay: 8, spectatorIdle: 5,
  // Qué aparece en el inicio, búsqueda y combinación para cerrar un juego.
  sections: { all: true, Consoles: true, Handhelds: true, Arcade: true, Computers: true, modes: true, genres: true, developers: true },
  search: true, letterBar: true,
  exitCombo: ['ls', 'rs', 'b'], exitHold: 0, exitFromLaunchBox: true, buttonStyle: 'auto',
  fields: Object.fromEntries(Object.keys(FIELDS).map(k => [k, true])),
  last: null,
};
let settings = structuredClone(DEFAULTS);
let saveTimer;
function saveSettings() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fetch('/api/settings', { method: 'POST', body: JSON.stringify(settings) }).catch(() => {}), 500);
}
// Temas visuales: cada uno trae su inicio, su tipografía, sus colores, sus sonidos y sus acomodos por defecto.
const THEMES = {
  cubo: { label: 'GameCube', sound: 'cubo', shelf: 'rejilla', detail: 'clasica', tile: 1, isz: 8.4 },
  barra: { label: 'PS3', sound: 'barra', shelf: 'lista', detail: 'cine', direct: true, art: ['box', 'box3d', 'shots'] },
  mosaicos: { label: 'Switch', sound: 'mosaico', shelf: 'rejilla', detail: 'clasica', direct: true, tile: 1, dart: ['box', 'box3d', 'cart'] },
  canales: { label: 'Wii', sound: 'canal', shelf: 'rejilla', detail: 'poster', direct: true, tile: 1.5, tkinds: ['shots', 'fanart', 'box'], dart: ['shots', 'fanart', 'box'] },
  paneles: { label: 'Xbox 360', sound: 'panel', shelf: 'lista', detail: 'galeria', direct: true, art: ['box', 'box3d', 'cart'] },
  torres: { label: 'PS2', sound: 'torre', shelf: 'rejilla', detail: 'clasica', direct: true, tile: 1, isz: 9, tkinds: ['box3d', 'box', 'cart'] },
  esfera: { label: 'Xbox', sound: 'esfera', shelf: 'lista', detail: 'galeria', direct: true, art: ['box', 'box3d', 'shots'] },
  naranja: { label: 'Dreamcast', sound: 'naranja', shelf: 'lista', detail: 'poster', direct: true, art: ['box', 'box3d', 'cart'] },
  volumen: { label: 'Nintendo 64', sound: 'volumen', shelf: 'lista', detail: 'poster', direct: true, art: ['box', 'box3d', 'cart'] },
  disco: { label: 'PS1', sound: 'disco', shelf: 'rejilla', detail: 'cine', direct: true, tile: 1, isz: 7.4 },
  lavanda: { label: 'Super Nintendo', sound: 'lavanda', shelf: 'lista', detail: 'clasica', direct: true, pixel: true, art: ['cart', 'box', 'box3d'], dart: ['cart', 'box', 'box3d'] },
  gris: { label: 'NES', sound: 'gris', shelf: 'lista', detail: 'clasica', direct: true, pixel: true },
  anillo: { label: 'Genesis', sound: 'anillo', shelf: 'lista', detail: 'cine', direct: true, pixel: true, art: ['box', 'cart', 'box3d'] },
  orbita: { label: 'Saturn', sound: 'orbita', shelf: 'carrusel', detail: 'cine', direct: true },
  tarjeta: { label: 'TurboGrafx-16', sound: 'tarjeta', shelf: 'repisa', detail: 'clasica', direct: true, pixel: true, tile: 1.58, tkinds: ['cart', 'box', 'box3d'], dart: ['cart', 'box', 'box3d'] },
  ficha: { label: 'Arcade', sound: 'ficha', shelf: 'lista', detail: 'cine', direct: true, pixel: true, art: ['box', 'box3d', 'shots'] },
  simbolo: { label: 'MS-DOS', sound: 'simbolo', shelf: 'lista', detail: 'clasica', direct: true },
  luna: { label: 'Windows XP', sound: 'luna', shelf: 'rejilla', detail: 'poster', direct: true, art: ['box', 'box3d', 'cart'] },
  doble: { label: 'Nintendo DS', sound: 'doble', shelf: 'lista', detail: 'clasica', direct: true, art: ['shots', 'box', 'fanart'], dart: ['shots', 'box', 'fanart'] },
  basic: { label: 'MSX', sound: 'basic', shelf: 'lista', detail: 'clasica', direct: true, pixel: true },
  relieve: { label: 'Nintendo 3DS', sound: 'relieve', shelf: 'rejilla', detail: 'clasica', direct: true, tile: 1, isz: 7.6, dart: ['shots', 'fanart', 'box'] },
  alas: { label: 'PS5', sound: 'alas', shelf: 'repisa', detail: 'heroe', direct: true, tile: 1, anchor: 6, gap: 1.2 },
  monolito: { label: 'Xbox Series X', sound: 'monolito', shelf: 'rejilla', detail: 'galeria', direct: true, tile: 1, isz: 10.5 },
  plaza: { label: 'Wii U', sound: 'plaza', shelf: 'rejilla', detail: 'poster', direct: true, tile: 1, isz: 7.6 },
  indigo: { label: 'Game Boy Advance', sound: 'indigo', shelf: 'lista', detail: 'clasica', direct: true, pixel: true, art: ['shots', 'box', 'cart'], dart: ['shots', 'box', 'cart'] },
  rojo: { label: 'Virtual Boy', sound: 'rojo', shelf: 'lista', detail: 'cine', direct: true, pixel: true },
  pantalla: { label: 'Game Boy', sound: 'pantalla', shelf: 'lista', detail: 'clasica', direct: true },
  vitrina: { label: 'Playnite', sound: 'vitrina', shelf: 'biblioteca', detail: 'heroe', direct: true },
};
// «Del tema»: cada tema usa su acomodo propio (definido en su theme.css sobre .L-tema / .D-tema).
const shelfLay = () => settings.shelfLayout === 'tema' ? (THEMES[settings.theme]?.shelf || 'repisa') : SHELF_LAYOUTS[settings.shelfLayout] ? settings.shelfLayout : 'repisa';
const detailLay = () => settings.detailLayout === 'tema' ? (THEMES[settings.theme]?.detail || 'clasica') : DETAIL_LAYOUTS[settings.detailLayout] ? settings.detailLayout : 'clasica';
const THEME_SOUND = Object.fromEntries(Object.entries(THEMES).map(([k, t]) => [k, t.sound]));
const soundTheme = () => settings.soundTheme === 'auto' ? (THEME_SOUND[settings.theme] || 'cubo') : settings.soundTheme;
function applySound() { S.configure({ theme: soundTheme(), volume: settings.volume, ambientLevel: settings.ambient }); }
const imageType = () => IMAGE_TYPES.find(t => t.id === settings.imageType) || IMAGE_TYPES[0];

const SHORT = {
  'Nintendo Entertainment System': 'NES', 'Super Nintendo Entertainment System': 'SNES', 'Nintendo 64': 'N64',
  'Nintendo GameCube': 'GameCube', 'Sony Playstation': 'PlayStation', 'Sony Playstation 2': 'PS2', 'Sony Playstation 3': 'PS3',
  'Sony Playstation 4': 'PS4', 'Microsoft Xbox': 'Xbox', 'Microsoft Xbox 360': 'Xbox 360', 'Nintendo Game Boy': 'Game Boy',
  'Nintendo Game Boy Color': 'GB Color', 'Nintendo Game Boy Advance': 'GBA', 'Sega Genesis': 'Genesis', 'Sega Master System': 'Master System',
  'NEC TurboGrafx-16': 'TurboGrafx-16', 'NEC TurboGrafx-CD': 'TurboGrafx-CD', 'SNK Neo Geo Pocket Color': 'NGP Color',
  'Nintendo Virtual Boy': 'Virtual Boy', 'Nintendo Wii U': 'Wii U', 'Nintendo Wii': 'Wii', 'Nintendo DS': 'DS', 'Nintendo 3DS': '3DS',
  'Nintendo Switch': 'Switch', 'Sega Dreamcast': 'Dreamcast', 'Sega Saturn': 'Saturn', 'Microsoft MSX': 'MSX', 'Sony PSP': 'PSP',
  'Sega Game Gear': 'Game Gear',
};
const short = n => SHORT[n] || n;
const fmtN = n => n.toLocaleString('es-MX');
const ord = g => g ? `${g}.ª generación` : '';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ======================================================================
// Glifos de botones (SVG propio: se ven igual con cualquier fuente)
// ======================================================================
const SVG = {
  lr: '<svg viewBox="0 0 26 12"><path d="M0 6 7.5 .5v11zM26 6 18.5 .5v11z"/></svg>',
  ud: '<svg viewBox="0 0 12 26"><path d="M6 0l5.5 7.5H.5zM6 26l5.5-7.5H.5z"/></svg>',
  menu: '<svg viewBox="0 0 16 14"><rect y="1" width="16" height="2" rx="1"/><rect y="6" width="16" height="2" rx="1"/><rect y="11" width="16" height="2" rx="1"/></svg>',
  view: '<svg viewBox="0 0 16 14"><rect x="5" y="1" width="10" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="1" y="5" width="10" height="8" rx="1.5"/></svg>',
};
// Estilos de botones: la posición física es siempre la misma (abajo, derecha, izquierda, arriba),
// solo cambia cómo se dibuja. «Automático» sigue a la consola del tema visual.
const PS_SHAPES = {
  a: '<svg viewBox="0 0 12 12"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" fill="none"/></svg>',
  b: '<svg viewBox="0 0 12 12"><circle cx="6" cy="6" r="3.6" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>',
  x: '<svg viewBox="0 0 12 12"><rect x="2.6" y="2.6" width="6.8" height="6.8" rx=".4" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>',
  y: '<svg viewBox="0 0 12 12"><path d="M6 2.2l4 6.8H2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/></svg>',
};
const BUTTON_STYLES = {
  xbox: { label: 'Xbox', face: { a: 'A', b: 'B', x: 'X', y: 'Y' }, sh: { lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT', ls: 'L', rs: 'R', view: 'Vista', menu: 'Menú' } },
  playstation: { label: 'PlayStation', shapes: true, sh: { lb: 'L1', rb: 'R1', lt: 'L2', rt: 'R2', ls: 'L3', rs: 'R3', view: 'SELECT', menu: 'START' }, names: { a: 'Cruz', b: 'Círculo', x: 'Cuadrado', y: 'Triángulo' } },
  nintendo: { label: 'Nintendo (Switch, Wii U)', face: { a: 'B', b: 'A', x: 'Y', y: 'X' }, sh: { lb: 'L', rb: 'R', lt: 'ZL', rt: 'ZR', ls: 'L', rs: 'R', view: '−', menu: '+' } },
  gamecube: { label: 'GameCube', face: { a: 'A', b: 'B', x: 'X', y: 'Y' }, sh: { lb: 'L', rb: 'R', lt: 'L', rt: 'R', ls: 'L', rs: 'C', view: 'Z', menu: 'START' } },
  n64: { label: 'Nintendo 64', face: { a: 'A', b: 'B', x: '◂', y: '▴' }, sh: { lb: 'L', rb: 'R', lt: 'Z', rt: 'R', ls: 'L', rs: 'R', view: 'L', menu: 'START' }, names: { x: 'C izquierda', y: 'C arriba' } },
  turbo: { label: 'TurboGrafx-16', face: { a: 'I', b: 'II', x: 'III', y: 'IV' }, sh: { lb: 'V', rb: 'VI', lt: 'V', rt: 'VI', ls: 'L', rs: 'R', view: 'SELECT', menu: 'RUN' } },
  arcade: { label: 'Arcade', face: { a: '1', b: '2', x: '3', y: '4' }, sh: { lb: '5', rb: '6', lt: '5', rt: '6', ls: 'L', rs: 'R', view: 'COIN', menu: 'START' } },
  nes: { label: 'NES', face: { a: 'A', b: 'B', x: 'X', y: 'Y' }, sh: { lb: 'L', rb: 'R', lt: 'L', rt: 'R', ls: 'L', rs: 'R', view: 'SELECT', menu: 'START' } },
  super: { label: 'Super Nintendo', face: { a: 'B', b: 'A', x: 'Y', y: 'X' }, sh: { lb: 'L', rb: 'R', lt: 'L', rt: 'R', ls: 'L', rs: 'R', view: 'SELECT', menu: 'START' } },
  sega: { label: 'Sega (Dreamcast, Saturn)', face: { a: 'A', b: 'B', x: 'X', y: 'Y' }, sh: { lb: 'L', rb: 'R', lt: 'L', rt: 'R', ls: 'L', rs: 'R', view: 'MODE', menu: 'START' } },
  neutral: { label: 'Neutro (sin colores)', face: { a: 'A', b: 'B', x: 'X', y: 'Y' }, sh: { lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT', ls: 'L', rs: 'R', view: 'Vista', menu: 'Menú' } },
};
const THEME_BUTTONS = { cubo: 'gamecube', barra: 'playstation', mosaicos: 'nintendo', canales: 'nintendo', paneles: 'xbox', torres: 'playstation', esfera: 'xbox', naranja: 'sega',
  volumen: 'n64', disco: 'playstation', lavanda: 'super', gris: 'nes', anillo: 'sega', pantalla: 'super',
  orbita: 'sega', tarjeta: 'turbo', ficha: 'arcade', simbolo: 'neutral', luna: 'xbox', doble: 'nintendo', basic: 'neutral', relieve: 'nintendo', alas: 'playstation', monolito: 'xbox', plaza: 'nintendo', indigo: 'super', rojo: 'neutral', vitrina: 'xbox' };
const btnStyleId = () => { const s = settings?.buttonStyle; return BUTTON_STYLES[s] ? s : (THEMES[settings?.theme]?.buttons || THEME_BUTTONS[settings?.theme] || 'xbox'); };
const btnStyle = () => BUTTON_STYLES[btnStyleId()];
function glyph(name) {
  const st = btnStyle(), sid = btnStyleId();
  if (['a', 'b', 'x', 'y'].includes(name)) {
    if (st.shapes) { const s = h('span', { class: `gl round st-${sid} ${name}` }); s.innerHTML = PS_SHAPES[name]; return s; }
    return h('span', { class: `gl round st-${sid} ${name}`, text: st.face[name] });
  }
  if (name === 'lr' || name === 'ud') { const s = h('span', { class: 'gl icon' }); s.innerHTML = SVG[name]; return s; }
  if (ARROW[name]) { const s = h('span', { class: 'gl icon' }); s.innerHTML = `<svg viewBox="0 0 12 12"><path d="${ARROW[name]}"/></svg>`; return s; }
  if (name === 'menu' || name === 'view') {
    if (sid === 'xbox' || sid === 'neutral') { const s = h('span', { class: 'gl round dark' }); s.innerHTML = SVG[name]; return s; }
    const txt = st.sh[name];
    return h('span', { class: `gl ${txt.length <= 1 ? 'round dark sym' : 'pill small'}`, text: txt });
  }
  if (name === 'ls' || name === 'rs') return h('span', { class: `gl round stick st-${sid}`, text: st.sh[name] });
  if (name === 'exitcombo') return h('span', { class: 'combo' }, ...comboGlyphs(exitCombo().list));
  if (name === 'lbrb') return h('span', { class: 'gl pill', text: st.sh.lb + ' ' + st.sh.rb });
  if (name === 'ltrt') return h('span', { class: 'gl pill', text: st.sh.lt + ' ' + st.sh.rt });
  if (name === 'viewmenu') { const s = h('span', { class: 'gl pill' }); s.innerHTML = SVG.view + '<b style="margin:0 .25em">+</b>' + SVG.menu; return s; }
  return h('span', { class: 'gl pill', text: st.sh[name] || name.toUpperCase() });
}
// La combinación que de verdad se usa: la de LaunchBox (mantener uno y presionar otro, al instante) o la tuya.
let lbExit = null;
fetch('/api/status').then(r => r.json()).then(s => { lbExit = s.exitBinding || null; if (settings) renderChrome(); }).catch(() => {});
function exitCombo() {
  if (settings?.exitFromLaunchBox !== false && lbExit) return { list: lbExit.list, text: lbExit.hold ? `Mantén ${btnName(lbExit.hold)} y presiona ${btnName(lbExit.press)}` : `Presiona ${btnName(lbExit.press)}`, lb: true };
  const hold = +settings?.exitHold || 0;
  return { list: settings?.exitCombo, text: hold ? `Sostén ${String(hold).replace('.', ',')} s` : 'Presiona juntos', lb: false };
}
function comboGlyphs(list) {
  const out = [];
  (list?.length ? list : ['ls', 'rs', 'b']).forEach((b, i) => { if (i) out.push('+'); out.push(glyph(b)); });
  return out;
}
const btnName = b => { const st = btnStyle(); return st.names?.[b] || st.face?.[b] || st.sh[b] || BTN_NAMES[b] || b.toUpperCase(); };
const comboText = list => (list?.length ? list : ['ls', 'rs', 'b']).map(b => ['ls', 'rs'].includes(b) ? (b === 'ls' ? 'palanca izquierda' : 'palanca derecha') : btnName(b)).join(' + ');
const BTN_NAMES = { a: 'A', b: 'B', x: 'X', y: 'Y', lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT', ls: 'LS', rs: 'RS', view: 'Vista', menu: 'Menú', up: '↑', down: '↓', left: '←', right: '→' };
const ARROW = { up: 'M6 1l5 7H1z', down: 'M6 11l5-7H1z', left: 'M1 6l7-5v10z', right: 'M11 6L4 1v10z' };
document.querySelectorAll('.gslot').forEach(s => s.replaceWith(glyph(s.dataset.g)));

// ======================================================================
// Fondo: imagen, video y modo cine
// ======================================================================
const backdrop = $('#backdrop'), bgA = $('#bgA'), bgB = $('#bgB'), bgVideo = $('#bgVideo'), music = $('#music');
const Back = {
  front: bgA, img: undefined, video: null, vidTimer: null,
  setLook(look) { for (const l of ['dim', 'clear', 'ghost']) backdrop.classList.toggle(l, look === l); },
  setImage(url) {
    if (url === this.img) return;
    this.img = url;
    const next = this.front === bgA ? bgB : bgA, prev = this.front;
    if (!url) { bgA.style.opacity = 0; bgB.style.opacity = 0; this.refresh(); return; }
    const im = new Image(); im.src = url;
    (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => {
      if (this.img !== url) return;
      next.style.backgroundImage = `url("${url}")`;
      next.style.opacity = 1; prev.style.opacity = 0; this.front = next; this.refresh();
    });
  },
  setVideo(url, { loop = true } = {}) {
    bgVideo.loop = loop;
    if (url === this.video) return;
    this.video = url;
    clearTimeout(this.vidTimer);
    bgVideo.style.opacity = 0; backdrop.classList.remove('vid');
    if (!url) {
      this.vidTimer = setTimeout(() => { if (!this.video) { bgVideo.pause(); bgVideo.removeAttribute('src'); bgVideo.load(); } }, 900);
      this.refresh(); updateAudio(); return;
    }
    bgVideo.src = url; bgVideo.muted = true;
    bgVideo.play().catch(() => {});
  },
  get playing() { return !!this.video && bgVideo.style.opacity === '1' && !bgVideo.paused; },
  refresh() { backdrop.classList.toggle('media', !!(this.img || this.video)); },
};
bgVideo.addEventListener('playing', () => {
  if (!Back.video) return;
  bgVideo.style.opacity = 1; backdrop.classList.add('vid'); Back.refresh(); updateAudio();
});
bgVideo.addEventListener('error', () => { Back.video = null; bgVideo.style.opacity = 0; backdrop.classList.remove('vid'); updateAudio(); });
bgVideo.addEventListener('ended', () => { if (top() === 'spectator') screens.spectator.next(); });

// Modo cine: si nadie toca nada y hay un video, la interfaz se retira.
let lastInput = performance.now(), cine = false;
function enterCine() {
  cine = true; document.body.classList.add('cine');
  document.body.classList.toggle('spec', top() === 'spectator');
  const g = currentGame, cap = $('#cineCap');
  if (g && top() !== 'spectator') {
    cap.replaceChildren(g.media.logo ? h('img', { src: g.media.logo[0], alt: '' }) : h('span', { text: g.title }),
      h('span', { text: [short(g.platform), g.year].filter(Boolean).join(' · ') }));
    cap.classList.add('show'); clearTimeout(cap.t); cap.t = setTimeout(() => cap.classList.remove('show'), 5000);
  }
}
function exitCine() { cine = false; document.body.classList.remove('cine', 'spec'); $('#cineCap').classList.remove('show'); }
function poke() { lastInput = performance.now(); if (cine) { exitCine(); return true; } return false; }
addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && (e.movementX || e.movementY)) poke(); });
addEventListener('pointerdown', () => poke());
onFrame((dt, now) => {
  if (!started) return;
  const t = top();
  const delay = t === 'spectator' ? 4 : settings.cinemaDelay;
  if (!cine && delay > 0 && Back.playing && !Menu.open && !Viewer.open && now - lastInput > delay * 1000 &&
      ['home', 'platforms', 'shelf', 'detail', 'spectator'].includes(t)) enterCine();
  if (t === 'home' && settings.spectatorIdle > 0 && !Menu.open && now - lastInput > settings.spectatorIdle * 60000) {
    lastInput = now; go('spectator', { auto: true });
  }
});

// ======================================================================
// Audio
// ======================================================================
let currentGame = null;
let homeAudible = false; // un video con sonido dentro del inicio del tema (canal de Wii, panel de 360)
// Pistas al azar para el inicio (Music/Background) y para cada plataforma (Music/<plataforma>).
const tracks = new Map();
function trackFor(key) {
  if (tracks.has(key)) return tracks.get(key);
  tracks.set(key, undefined);
  const q = key.startsWith('c:') ? '?category=' + encodeURIComponent(key.slice(2)) : '?platform=' + encodeURIComponent(key.slice(2));
  fetch('/api/music' + q).then(r => r.json()).then(d => { tracks.set(key, d.url || null); updateAudio(); }).catch(() => tracks.set(key, null));
  return undefined;
}
function updateAudio() {
  const t = top();
  const shown = !Viewer.open && !Playing.active;
  bgVideo.muted = !(settings.audioMode === 'video' && shown);
  bgVideo.volume = Math.min(1, settings.volume);
  let src = null;
  if (settings.audioMode === 'musica' && shown) {
    if (t === 'shelf' || t === 'detail' || t === 'spectator') src = currentGame?.media?.music || null;
    else if (t === 'platforms' && screens.platforms.focused) src = trackFor('p:' + screens.platforms.focused.name) || null;
    else if (t === 'home' && screens.home.musicKey()) src = trackFor(screens.home.musicKey()) || null;
  }
  if (src) {
    if (music.dataset.src !== src) { music.dataset.src = src; music.src = src; }
    music.volume = Math.min(1, settings.volume);
    if (music.paused) music.play().catch(() => {});
  } else if (!music.paused) music.pause();
  const musicOn = !!src && !music.paused;
  const viewerSound = Viewer.open && Viewer.kind === 'video';
  if (Playing.active) { bgVideo.pause(); S.setAmbient(false); return; }
  if (t === 'home' && homeAudible) { if (!music.paused) music.pause(); S.setAmbient(false); return; }
  // El ambiente solo suena si elegiste «Ambiente» como audio de fondo.
  S.setAmbient(settings.audioMode === 'ambiente' && !viewerSound && !musicOn);
}
music.addEventListener('playing', updateAudio);
music.addEventListener('error', () => { music.dataset.src = ''; updateAudio(); });

function cycleAudio() {
  const keys = Object.keys(AUDIO_MODES);
  settings.audioMode = keys[(keys.indexOf(settings.audioMode) + 1) % keys.length];
  saveSettings(); S.play('toggle'); renderChrome(); updateAudio();
  let msg = `Audio: ${AUDIO_MODES[settings.audioMode]}`;
  if (currentGame && settings.audioMode === 'musica' && !currentGame.media.music) msg += ' · este juego no tiene música';
  if (currentGame && settings.audioMode === 'video' && !currentGame.media.video) msg += ' · este juego no tiene video';
  toast(msg);
  if (top() === 'detail') screens.detail.paintActions();
}

function play(game, app) { Playing.launch(game, app); }

let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// ======================================================================
// Navegación entre pantallas
// ======================================================================
const screens = {};
const stack = [];
const vis = {}, side = {};
const top = () => stack[stack.length - 1]?.id;
function go(id, params, instant = false) {
  const from = stack[stack.length - 1];
  stack.push({ id, params });
  if (from) { side[from.id] = 1; if (instant) vis[from.id].jump(0); else vis[from.id].set(0); screens[from.id].leave?.(); }
  side[id] = -1; vis[id].jump(instant ? 1 : 0); vis[id].set(1);
  screens[id].enter(params);
  renderChrome(); updateAudio(); saveLast();
}
function back() {
  if (stack.length <= 1) return false;
  const cur = stack.pop();
  side[cur.id] = -1; vis[cur.id].set(0); screens[cur.id].leave?.();
  const prev = stack[stack.length - 1];
  side[prev.id] = 1; vis[prev.id].set(1);
  screens[prev.id].resume?.();
  S.play('back'); renderChrome(); updateAudio(); saveLast();
  return true;
}
onFrame(dt => {
  for (const id in screens) {
    const s = vis[id]; s.step(dt);
    const el = screens[id].el;
    const live = s.x > 0.002 || s.target > 0;
    el.classList.toggle('live', live);
    if (!live) continue;
    el.style.opacity = s.x.toFixed(3);
    el.style.transform = `scale(${(1 + (1 - s.x) * 0.07 * side[id]).toFixed(4)})`;
    el.style.pointerEvents = s.target > 0 ? 'auto' : 'none';
    screens[id].frame?.(dt);
  }
});

// Recuerda dónde te quedaste.
function saveLast() {
  const L = { screen: top() };
  for (const s of stack) {
    if (s.id === 'platforms') L.cat = s.params.name;
    if (s.id === 'shelf') { L.platform = s.params.name; if (s.params.mode) L.mode = s.params.mode; }
  }
  if (top() === 'platforms') L.platform = screens.platforms.focused?.name;
  const sh = screens.shelf;
  if (L.platform && sh.platform?.name === L.platform && sh.games[sh.idx]) L.game = sh.games[sh.idx].id;
  if (top() === 'home') L.face = screens.home.state();
  if (top() === 'spectator') L.screen = 'home';
  settings.last = L; saveSettings();
}

const HINTS = {
  home: [['a', 'Entrar'], ['lr', 'Girar'], ['ud', 'Arriba y abajo'], ['menu', 'Ajustes']],
  platforms: [['lr', 'Elegir'], ['a', 'Abrir'], ['b', 'Regresar'], ['menu', 'Ajustes']],
  shelf: [['a', 'Ficha'], ['x', 'Jugar'], ['rs', 'Vista'], ['ls', 'Favorito'], ['b', 'Regresar']],
  detail: [['a', 'Elegir'], ['x', 'Jugar'], ['y', 'Acomodo'], ['ls', 'Favorito'], ['b', 'Regresar']],
  playing: [['exitcombo', 'Sostén para cerrar el juego']],
  keyboard: [['a', 'Escribir'], ['x', 'Borrar'], ['y', 'Espacio'], ['menu', 'Listo'], ['b', 'Cerrar teclado']],
  capture: [],
  setup: [['ud', 'Elegir'], ['a', 'Aceptar']],
  picker: [['ud', 'Elegir'], ['a', 'Jugar'], ['b', 'Cerrar']],
  spectator: [['lr', 'Otro juego'], ['ud', 'Filtro'], ['a', 'Ficha'], ['x', 'Jugar'], ['b', 'Salir']],
  images: [['lr', 'Cambiar'], ['b', 'Cerrar']],
  video: [['a', 'Pausa'], ['lr', '10 s'], ['b', 'Cerrar']],
  manual: [['lr', 'Página'], ['ud', 'Desplazar'], ['a', 'Zoom'], ['b', 'Cerrar']],
  menu: [['ud', 'Elegir'], ['lr', 'Cambiar'], ['b', 'Cerrar']],
};
function renderChrome() {
  for (const c of [...document.body.classList]) if (c.startsWith('at-')) document.body.classList.remove(c);
  document.body.classList.add('at-' + (top() || 'boot'));
  document.body.classList.toggle('sheet-open', !!(Menu?.open || Picker?.open)); // las pistas se recorren para no quedar bajo el panel
  const key = Setup.open ? 'setup' : Capture.open ? 'capture' : Keyboard.open ? 'keyboard' : Playing.active ? 'playing' : Picker.open ? 'picker' : Menu.open ? 'menu' : Viewer.open ? Viewer.kind : top();
  let hints = (key === 'home' && homeImpl.hints) ? homeImpl.hints() : (HINTS[key] || []);
  if (key === 'menu') hints = Menu.hints();
  if (key === 'detail' && detailLay() === 'galeria') hints = [hints[0], ['lbrb', 'Imágenes'], ...hints.slice(1)];
  if (key === 'shelf') {
    const extra = [];
    extra.push(settings.search ? ['y', 'Buscar'] : ['y', 'Imagen']);
    if (settings.letterBar && screens.shelf.games.length > 20) extra.push(['ltrt', 'Letra']);
    hints = [...hints.slice(0, 2), ...extra, ...hints.slice(2)];
    if (screens.shelf.query) hints = hints.map(x => x[0] === 'b' ? ['b', 'Quitar búsqueda'] : x);
  }
  // El audio de fondo es una pista más, junto a las demás, y también se puede tocar.
  if (['home', 'platforms', 'shelf', 'detail', 'spectator'].includes(key)) hints = [...hints, ['view', 'Audio: ' + AUDIO_SHORT[settings.audioMode]]];
  if (key === 'playing') hints = [['exitcombo', exitCombo().text + ' para cerrar el juego']];
  $('#hints').replaceChildren(...hints.map(([g, t]) => {
    const el = h('span', {}, glyph(g), t);
    const tap = TAPS[g]?.(key);
    if (tap) { el.classList.add('tap'); el.addEventListener('click', tap); }
    return el;
  }));
  $('#backBtn').classList.toggle('show', stack.length > 1 || Viewer.open || Menu.open);
  const crumbs = [];
  for (const s of stack) {
    if (s.id === 'platforms') crumbs.push(s.params.label);
    if (s.id === 'shelf') crumbs.push(short(s.params.name));
    if (s.id === 'spectator') crumbs.push('Espectador');
    if (s.id === 'detail') crumbs.push(s.params.game.title);
  }
  $('#crumbs').replaceChildren(...crumbs.flatMap((c, i) => [i ? ' › ' : '', i === crumbs.length - 1 ? h('b', { text: c }) : c]));
}
// Pistas que también funcionan con el dedo o el ratón.
const TAPS = {
  view: k => ['home', 'platforms', 'shelf', 'detail', 'spectator'].includes(k) && (() => { poke(); cycleAudio(); }),
  y: k => k === 'shelf' && settings.search && (() => { poke(); screens.shelf.openSearch(); }),
  menu: k => !['menu', 'keyboard', 'playing', 'capture'].includes(k) && (() => { poke(); Menu.show(); }),
};
function tickClock() { $('#clock').textContent = new Date().toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' }); }
setInterval(tickClock, 10000); tickClock();

// ======================================================================
// Biblioteca
// ======================================================================
let library = null;
const gamesCache = new Map();
function loadGames(p) {
  const key = p.mode ? 'mode:' + p.mode : p.name;
  const q = p.mode ? 'mode=' + encodeURIComponent(p.mode) : 'platform=' + encodeURIComponent(p.name);
  if (!gamesCache.has(key)) gamesCache.set(key, fetch('/api/games?' + q).then(r => r.json()).then(d => d.games));
  return gamesCache.get(key);
}
// Colecciones: «categorías» cuyas entradas juntan juegos de todas las consolas
// (modo de juego, género o desarrolladora).
const COLLECTIONS = {
  modes: { name: '_modes', label: 'Modo de juego', unit: 'modos', icon: m => 'mode_' + m.id },
  genres: { name: '_genres', label: 'Géneros', unit: 'géneros', icon: m => genreIcon(m) },
  developers: { name: '_devs', label: 'Desarrolladoras', unit: 'desarrolladoras', icon: () => 'dev' },
};
function collectionCategory(kind) {
  const C = COLLECTIONS[kind];
  return {
    name: C.name, label: C.label, kind, modes: true, unit: C.unit,
    platforms: (library[kind] || []).map(m => ({ name: m.label, mode: m.id, count: m.count, notes: m.desc, manufacturer: '', year: null, generation: null, media: m.logo ? { logo: m.logo } : {}, icon: C.icon(m) })),
  };
}
// «Todo»: la lista completa de juegos, de todas las plataformas.
const secOn = k => settings.sections?.[k] !== false;
const allShelf = () => ({ name: 'Todo', label: 'Todo', mode: 'all', count: library.total, notes: 'Todos tus juegos, de todas las plataformas', manufacturer: '', year: null, generation: null, media: {}, icon: 'all' });
// Lo que el inicio muestra según tus ajustes (Ajustes › Inicio).
let viewLib = null, viewKey = '';
function visibleLibrary() {
  const k = JSON.stringify(settings.sections) + library.loadedAt + library.total;
  if (viewLib && viewKey === k && viewLib.src === library) return viewLib;
  viewKey = k;
  viewLib = { ...library, src: library, categories: library.categories.filter(c => secOn(c.name)) };
  for (const kind of Object.keys(COLLECTIONS)) if (!secOn(kind)) viewLib[kind] = [];
  return viewLib;
}
const kindOfId = id => id === 'all' ? 'all' : id.startsWith('g:') ? 'genres' : id.startsWith('d:') ? 'developers' : 'modes';
const kindOfCat = name => Object.keys(COLLECTIONS).find(k => COLLECTIONS[k].name === name);
const modesCategory = () => collectionCategory('modes');
const modeShelf = m => { const id = m.id || m.mode; if (id === 'all') return allShelf(); return collectionCategory(kindOfId(id)).platforms.find(p => p.mode === id); };

// ======================================================================
// Inicio: el cubo
// Izquierda/derecha giran entre categorías; arriba lleva a Espectador y abajo a Ajustes.
// ======================================================================
const ICONS = {
  Consoles: '<path d="M6 8.5h12a4 4 0 0 1 4 4v1.2a3 3 0 0 1-5.3 1.9L15 13.5H9l-1.7 2.1A3 3 0 0 1 2 13.7v-1.2a4 4 0 0 1 4-4z"/><path d="M7 10.5v3M5.5 12h3"/><circle cx="16" cy="11" r=".5"/><circle cx="18" cy="12.6" r=".5"/>',
  Handhelds: '<rect x="6" y="2.5" width="12" height="19" rx="2.2"/><rect x="8.4" y="5" width="7.2" height="6" rx=".7"/><path d="M9.2 14.6v3M7.7 16.1h3"/><circle cx="15.6" cy="15.2" r=".5"/><circle cx="14.2" cy="17" r=".5"/>',
  Arcade: '<path d="M4.5 20.5h15l-1.6-5H6.1z"/><path d="M12 15.5V8.6"/><circle cx="12" cy="6.3" r="2.6"/>',
  Computers: '<rect x="3" y="4" width="18" height="12" rx="1.6"/><path d="M8.5 20h7M12 16v4"/>',
  modes: '<circle cx="8" cy="8" r="2.6"/><circle cx="16.5" cy="8" r="2.6"/><path d="M3.5 18.5c.6-3 2.4-4.6 4.5-4.6s3.9 1.6 4.5 4.6M12 18.5c.6-3 2.4-4.6 4.5-4.6s3.9 1.6 4.5 4.6"/>',
  mode_solo: '<circle cx="12" cy="8" r="3.2"/><path d="M6 20c.8-4 3.2-6 6-6s5.2 2 6 6"/>',
  mode_multi: '<circle cx="8" cy="8" r="2.6"/><circle cx="16.5" cy="8" r="2.6"/><path d="M3.5 18.5c.6-3 2.4-4.6 4.5-4.6s3.9 1.6 4.5 4.6M12 18.5c.6-3 2.4-4.6 4.5-4.6s3.9 1.6 4.5 4.6"/>',
  mode_coop: '<circle cx="7.5" cy="7" r="2.4"/><circle cx="16.5" cy="7" r="2.4"/><path d="M3 18c.5-3 2.3-4.6 4.5-4.6 1.4 0 2.6.6 3.5 1.8M21 18c-.5-3-2.3-4.6-4.5-4.6-1.4 0-2.6.6-3.5 1.8"/><path d="M9.5 17.5l2.5 2 2.5-2"/>',
  mode_simul: '<path d="M3 11.5h7a3 3 0 0 1 3 3v.5a2.2 2.2 0 0 1-3.9 1.4L8 15H5l-1.1 1.4A2.2 2.2 0 0 1 0 15v-.5"/><path d="M11 6.5h7a3 3 0 0 1 3 3v.5a2.2 2.2 0 0 1-3.9 1.4L16 10h-3"/>',
  mode_turnos: '<path d="M5 9a7 7 0 0 1 12.5-2.5M19 15a7 7 0 0 1-12.5 2.5"/><path d="M17.8 3.5v3.3h-3.3M6.2 20.5v-3.3h3.3"/>',
  mode_p2: '<circle cx="12" cy="12" r="8.5"/><path d="M9.3 9.6a2.7 2.7 0 0 1 5.3.6c0 1.6-1.6 2.5-3 3.6L9.4 15.5h5.3"/>',
  mode_p34: '<circle cx="12" cy="12" r="8.5"/><path d="M13.6 15.6V8.4L8.7 13.6h6.6"/>',
  genre: '<path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1l8 8a1.4 1.4 0 0 1 0 2l-7.1 7.1a1.4 1.4 0 0 1-2 0z"/><circle cx="8" cy="8" r="1.6"/>',
  dev: '<path d="M3 20.5h18M5 20.5V9l5 3V9l5 3V5h4v15.5"/><path d="M8 16h1M12 16h1M16 16h1"/>',
  mode_p5: '<circle cx="12" cy="12" r="8.5"/><path d="M14.6 8.4H10l-.6 3.6a3 3 0 1 1-.4 3.2"/>',
  _other: '<rect x="4" y="4" width="7" height="7" rx="1.2"/><rect x="13" y="4" width="7" height="7" rx="1.2"/><rect x="4" y="13" width="7" height="7" rx="1.2"/><rect x="13" y="13" width="7" height="7" rx="1.2"/>',
  all: '<rect x="3.5" y="9" width="17" height="11.5" rx="1.6"/><path d="M5.5 6h13M7.5 3h9"/><path d="M9.5 13h5"/>',
  spectator: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><path d="M10.4 9.3v5.4l4.4-2.7z"/>',
  settings: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.8M12 18.4v2.8M2.8 12h2.8M18.4 12h2.8M5.5 5.5l2 2M16.5 16.5l2 2M5.5 18.5l2-2M16.5 7.5l2-2"/>',
};
// Un ícono propio para cada género (si alguno no está, se usa la etiqueta general).
Object.assign(ICONS, {
  "gen:Acción": '<path d="M12 2.5l1.8 4.6 4.6-1.9-1.9 4.6 4.6 1.8-4.6 1.8 1.9 4.6-4.6-1.9-1.8 4.6-1.8-4.6-4.6 1.9 1.9-4.6-4.6-1.8 4.6-1.8-1.9-4.6 4.6 1.9z"/>',
  "gen:Plataformas": '<path d="M3 20h5v-5h5v-5h5V5h3"/><circle cx="6.5" cy="11" r="1.6"/>',
  "gen:Deportes": '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6c3.5 3.5 3.5 9.3 0 12.8M18.4 5.6c-3.5 3.5-3.5 9.3 0 12.8M3 12h18"/>',
  "gen:Disparos": '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.8"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  "gen:RPG": '<path d="M20 4l-9.5 9.5M20 4h-4.5M20 4v4.5M7.5 13.5l3 3M5 19l2.8-2.8M4.5 15.5l4 4"/>',
  "gen:Aventura": '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  "gen:Puzle": '<path d="M4 8h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4H4z"/>',
  "gen:Carreras": '<path d="M5 21V3.5M5 4h13l-2.5 4 2.5 4H5"/><path d="M9 4v8M13 4v8M5 8h11"/>',
  "gen:Pelea": '<path d="M6 12V8.5a1.5 1.5 0 0 1 3 0V11M9 10V7a1.5 1.5 0 0 1 3 0v3.5M12 10V7.5a1.5 1.5 0 0 1 3 0V11M15 10.5V9a1.5 1.5 0 0 1 3 0v4.5a6.5 6.5 0 0 1-6.5 6.5h-.5A5 5 0 0 1 6 15v-3"/>',
  "gen:Estrategia": '<path d="M7 21h10M8 18h8l-1-8H9zM8 10V5h2v2h1.5V5h1v2H14V5h2v5"/>',
  "gen:Beat 'em up": '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
  "gen:Terror": '<path d="M6 20.5V10a6 6 0 0 1 12 0v10.5l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5z"/><circle cx="10" cy="10" r=".9"/><circle cx="14" cy="10" r=".9"/>',
  "gen:Juego de mesa": '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8.5" cy="8.5" r=".9"/><circle cx="15.5" cy="15.5" r=".9"/><circle cx="12" cy="12" r=".9"/><circle cx="15.5" cy="8.5" r=".9"/><circle cx="8.5" cy="15.5" r=".9"/>',
  "gen:Simulación de vida": '<path d="M3 11l9-7 9 7M5 9.5V20h14V9.5"/><path d="M12 17.5l-2.4-2.4a1.6 1.6 0 0 1 2.4-2.1 1.6 1.6 0 0 1 2.4 2.1z"/>',
  "gen:Educativo": '<path d="M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5M22 9v5"/>',
  "gen:Simulador de vuelo": '<path d="M12 3a1.5 1.5 0 0 1 1.5 1.5V10l7.5 4.5V16l-7.5-2.5v5L15 20v1.2l-3-.9-3 .9V20l1.5-1.5v-5L3 16v-1.5L10.5 10V4.5A1.5 1.5 0 0 1 12 3z"/>',
  "gen:Sigilo": '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/><path d="M4 4l16 16"/>',
  "gen:Construcción y gestión": '<path d="M4 21V9h6v12M10 21V4h10v17M3 21h18M13 8h1M16.5 8h1M13 12h1M16.5 12h1M13 16h1M16.5 16h1"/>',
  "gen:Casino": '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
  "gen:Música": '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  "gen:Fiesta": '<path d="M12 3a5 5 0 0 1 5 5c0 3.5-3 6-5 6s-5-2.5-5-6a5 5 0 0 1 5-5zM11 14h2l-1 2zM12 16c0 2-2 2.3-2 5"/>',
  "gen:Preguntas": '<circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.3a2.8 2.8 0 1 1 4 2.5c-.8.4-1.3 1-1.3 2v.4"/><circle cx="12" cy="17.2" r=".6"/>',
  "gen:Mundo abierto": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  "gen:Simulación de vehículos": '<path d="M3 16.5V13l2.5-5h13L21 13v3.5zM6.5 16.5V19M17.5 16.5V19"/><circle cx="7" cy="13" r="1"/><circle cx="17" cy="13" r="1"/>',
  "gen:Compilación": '<path d="M4 8h16v12H4zM6 5h12M8 2h8"/>',
  "gen:Laberinto": '<path d="M3 3h18v18H3zM7 3v10h4M11 7h6M15 7v10M7 17h4v4M19 13h-4"/>',
  "gen:Novela visual": '<path d="M4 4h16v12H9l-5 4zM8 8h8M8 12h5"/>',
  "gen:Pinball": '<circle cx="15" cy="7" r="2.5"/><path d="M4 19l7-3.5M20 19l-7-3.5M3 5l3 3"/>',
  "gen:MMO": '<circle cx="12" cy="5.5" r="2.5"/><circle cx="5" cy="17.5" r="2.5"/><circle cx="19" cy="17.5" r="2.5"/><path d="M12 8v4.5M7 16l3.5-2.5M17 16l-3.5-2.5"/>',
});
const genreIcon = m => ICONS['gen:' + (m?.label || m?.name)] ? 'gen:' + (m.label || m.name) : 'genre';
const icon = k => { const s = h('div', { class: 'ico' }); s.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[k] || ICONS._other}</svg>`; return s; };

const cubeHome = {
  el: $('#home'), sel: 0, tilt: 0, t: 0, items: [], center: null,
  musicKey() { const c = this.items[this.idx]; return this.tilt === 0 && c && !c.modes && !c.all ? 'c:' + c.name : null; },
  ring: new Spring(0, { response: 0.55, damping: 0.8 }),
  tiltS: new Spring(-16, { response: 0.5, damping: 0.82 }),
  // El cubo siempre tiene 4 caras alrededor; lo que muestra cada cara se asigna al girar,
  // así caben todas las opciones que haga falta sin deformarlo.
  build() {
    const L = visibleLibrary();
    this.items = [...(secOn('all') ? [{ name: '_all', label: 'Todo', all: true, platforms: [] }] : []), ...L.categories, ...Object.keys(COLLECTIONS).filter(k => (L[k] || []).length).map(collectionCategory)];
    this.faces = [0, 1, 2, 3].map(i => h('div', { class: 'shell', style: `transform: rotateY(${i * 90}deg) translateZ(9.5rem)` }));
    this.topFace = h('div', { class: 'shell', style: 'transform: rotateX(90deg) translateZ(9.5rem)' }, icon('spectator'));
    this.botFace = h('div', { class: 'shell', style: 'transform: rotateX(-90deg) translateZ(9.5rem)' }, icon('settings'));
    const core = h('div', { class: 'core' }, ['rotateY(0deg)', 'rotateY(90deg)', 'rotateY(180deg)', 'rotateY(270deg)', 'rotateX(90deg)', 'rotateX(-90deg)']
      .map((r, i) => h('div', { class: 'cface' + (i % 2 ? ' dark' : ''), style: `transform: ${r} translateZ(4rem)` })));
    this.core = core;
    $('#cube').replaceChildren(core, ...this.faces, this.topFace, this.botFace);
    for (const f of [...this.faces, this.topFace, this.botFace]) f.addEventListener('click', () => { if (!this.dragged) this.open(); });
    this.center = null; this.assign(Math.round(this.ring.x));
    this.caption();
  },
  get N() { return Math.max(this.items.length, 1); },
  get idx() { const n = this.N; return ((this.sel % n) + n) % n; },
  assign(c) {
    if (c === this.center) return;
    this.center = c;
    const mod = (x, n) => ((x % n) + n) % n;
    for (const d of [-1, 0, 1, 2]) {
      const it = this.items[mod(c + d, this.N)];
      const f = this.faces[mod(c + d, 4)];
      if (it && f.dataset.k !== it.name) { f.dataset.k = it.name; f.replaceChildren(icon(it.all ? 'all' : it.kind === 'genres' ? 'genre' : it.kind === 'developers' ? 'dev' : it.modes ? 'modes' : it.name)); }
    }
    this.paintOn();
  },
  paintOn() {
    const front = this.faces[((this.sel % 4) + 4) % 4];
    for (const f of this.faces) f.classList.toggle('on', this.tilt === 0 && f === front);
    this.topFace.classList.toggle('on', this.tilt < 0);
    this.botFace.classList.toggle('on', this.tilt > 0);
  },
  state() { return { cat: this.items[this.idx]?.name, tilt: this.tilt }; },
  restore(face) {
    const i = this.items.findIndex(c => c.name === face?.cat);
    if (i >= 0) { this.sel = i; this.ring.jump(i); this.assign(i); }
    this.tilt = face?.tilt || 0; this.tiltS.jump(this.tiltAngle());
    this.caption();
  },
  tiltAngle() { return this.tilt < 0 ? -80 : this.tilt > 0 ? 76 : -16; },
  caption() {
    if (this.faces) this.paintOn();
    if (this.tilt < 0) {
      $('#catTitle').textContent = 'Espectador';
      $('#catMeta').textContent = 'Videos al azar de toda tu biblioteca';
      $('#catList').textContent = 'Recorre, descubre y entra a cualquier juego';
    } else if (this.tilt > 0) {
      $('#catTitle').textContent = 'Ajustes';
      $('#catMeta').textContent = 'Sonido, vistas, modo cine y datos visibles';
      $('#catList').textContent = '';
    } else {
      const c = this.items[this.idx];
      if (!c) { $('#catTitle').textContent = 'Biblioteca vacía'; return; }
      $('#catTitle').textContent = c.label;
      if (c.all) {
        $('#catMeta').textContent = `${fmtN(library.total)} juegos · la biblioteca completa`;
        $('#catList').textContent = 'Todas tus plataformas en una sola lista, de la A a la Z';
      } else if (c.modes) {
        $('#catMeta').textContent = `${fmtN(c.platforms.length)} ${c.unit} · juegos de todas tus consolas`;
        $('#catList').textContent = c.platforms.slice(0, 12).map(p => `${p.name} (${fmtN(p.count)})`).join(' · ') + (c.platforms.length > 12 ? ' …' : '');
      } else {
        $('#catMeta').textContent = `${c.platforms.length} plataformas · ${fmtN(c.games)} juegos`;
        $('#catList').textContent = c.platforms.map(p => short(p.name)).join(' · ');
      }
    }
    this.background(); updateAudio();
  },
  background() {
    clearTimeout(this.vt);
    const c = this.items[this.idx];
    const v = this.tilt === 0 && settings.autoVideo && c?.video;
    if (!v) { Back.setVideo(null); return; }
    if (Back.video !== v) { Back.setVideo(null); this.vt = setTimeout(() => { if (top() === 'home') Back.setVideo(v); }, 700); }
  },
  turn(d) { this.tilt = 0; this.tiltS.set(this.tiltAngle()); this.sel += d; this.ring.set(this.sel); S.play('rotate'); this.caption(); },
  tiltTo(t) {
    if (t === this.tilt) { S.play('error'); return; }
    this.tilt = t; this.tiltS.set(this.tiltAngle()); S.play('rotate'); this.caption();
  },
  open() {
    if (this.tilt < 0) { S.play('open'); go('spectator', {}); return; }
    if (this.tilt > 0) { Menu.show(); return; }
    const c = this.items[this.idx]; if (!c) return;
    if (c.all) { S.play('select'); go('shelf', allShelf()); return; }
    S.play('open'); go('platforms', c.modes ? collectionCategory(c.kind) : c);
  },
  enter() { Back.setImage(null); Back.setLook('ghost'); currentGame = null; this.background(); },
  resume() { this.enter(); },
  leave() { clearTimeout(this.vt); },
  action(a) {
    if (a === 'left') this.turn(-1);
    else if (a === 'right') this.turn(1);
    else if (a === 'up') this.tiltTo(this.tilt > 0 ? 0 : -1);
    else if (a === 'down') this.tiltTo(this.tilt < 0 ? 0 : 1);
    else if (a === 'a') this.open();
  },
  frame(dt) {
    this.t += dt;
    this.ring.step(dt); this.tiltS.step(dt);
    const rm = reducedMotion.matches;
    this.assign(Math.round(this.ring.x));
    const bob = rm ? 0 : Math.sin(this.t * 2 * Math.PI / 9) * 0.6;
    const ringDeg = -this.ring.x * 90;
    $('#cube').style.transform = `rotateX(${this.tiltS.x.toFixed(3)}deg) rotateY(${ringDeg.toFixed(3)}deg)`;
    this.el.querySelector('.cube-float').style.transform = `translateY(${bob.toFixed(3)}rem)`;
    if (this.core) this.core.style.transform = rm ? '' : `rotateX(${(this.t * 11).toFixed(2)}deg) rotateY(${(this.t * 17).toFixed(2)}deg) rotateZ(${(this.t * 5).toFixed(2)}deg)`;
    // Los íconos de arriba y abajo se mantienen derechos aunque el cubo gire.
    if (this.topFace) this.topFace.firstChild.style.transform = `rotate(${(-ringDeg).toFixed(2)}deg)`;
    if (this.botFace) this.botFace.firstChild.style.transform = `rotate(${(ringDeg).toFixed(2)}deg)`;
  },
  initDrag() {
    let sx = 0, st = 0;
    draggable(this.el.querySelector('.cube-stage').parentElement, {
      axis: 'x',
      onStart: () => { sx = this.ring.x; st = this.tiltS.x; this.dragged = false; },
      onMove: (dx, dy) => {
        this.dragged = true;
        const face = 19 * rem();
        if (Math.abs(dy) > Math.abs(dx)) this.tiltS.jump(clamp(st + dy / face * 90, -85, 80));
        else this.ring.jump(sx - dx / face);
      },
      onEnd: (vx, vy, moved, e) => {
        if (!moved) return;
        const face = 19 * rem();
        if (Math.abs(this.tiltS.x - st) > 12) {
          const t = this.tiltS.x < -45 ? -1 : this.tiltS.x > 35 ? 1 : 0;
          this.tilt = t; this.tiltS.set(this.tiltAngle()); this.ring.set(this.sel);
        } else {
          const target = Math.round(this.ring.x - project(vx, 0.99) / face);
          this.sel = target; this.tilt = 0; this.ring.set(target, -vx / face); this.tiltS.set(this.tiltAngle());
        }
        S.play('rotate'); this.caption();
        setTimeout(() => (this.dragged = false), 50);
      },
    });
  },
};

// El inicio lo pone el tema activo; esta pantalla solo le pasa todo.
let homeImpl = cubeHome;
screens.home = {
  el: $('#home'),
  enter(p) { homeImpl.enter(p); }, resume() { (homeImpl.resume || homeImpl.enter).call(homeImpl); },
  leave() { homeImpl.leave?.(); document.querySelectorAll('#homeTheme video').forEach(v => v.pause()); homeAudible = false; if (DevLogos.dirty) { DevLogos.dirty = false; setTimeout(rebuildHome, 50); } },
  action(a) { homeImpl.action(a); }, frame(dt) { homeImpl.frame?.(dt); }, build() { homeImpl.build(); },
  state() { return homeImpl.state?.(); }, restore(f) { homeImpl.restore?.(f); }, musicKey() { return homeImpl.musicKey?.() || null; },
};

// Lo que un tema puede usar para construir su inicio.
const themeAPI = {
  get library() { return visibleLibrary(); }, get settings() { return settings; },
  get all() { return secOn('all'); }, get total() { return library.total; },
  openAll: () => { S.play('select'); go('shelf', allShelf()); },
  go, back, top, Back, S, toast, h, $, Spring, rem, clamp, short, fmtN, ord, glyph, reducedMotion, draggable, project, rubberband,
  updateAudio: () => updateAudio(), saveLast: () => saveLast(), renderChrome: () => renderChrome(),
  icon: k => icon(k), ICONS, genreIcon: m => genreIcon(m),
  // Video para lo enfocado: el de la plataforma; si no tiene (Todo, modos, géneros…), el de su sección
  // (Consolas, Portátiles, Arcade, Computadoras), como en LaunchBox.
  videoFor(sec, it) {
    const cat = library.categories.find(c => c.name === sec?.key || c.name === sec?.name);
    return it?.p?.media?.video || sec?.video || cat?.video || null;
  },
  openPlatform: p => { S.play('select'); go('shelf', p); },
  openSpectator: filter => { S.play('open'); go('spectator', { filter }); },
  openSettings: () => Menu.show(),
  get modes() { return visibleLibrary().modes || []; },
  get genres() { return visibleLibrary().genres || []; },
  get developers() { return visibleLibrary().developers || []; },
  openModes: () => { S.play('open'); go('platforms', modesCategory()); },
  openKind: kind => { S.play('open'); go('platforms', collectionCategory(kind)); },
  openCollection: m => { S.play('select'); go('shelf', modeShelf(m)); },
  setHomeAudio: on => { homeAudible = !!on; updateAudio(); },
  // Secciones del inicio ya armadas (lo que esté activado en Ajustes › Inicio), para temas nuevos.
  sections({ spectator = true, system = true } = {}) {
    const L = visibleLibrary(), out = [];
    const coll = (m, ic) => ({ coll: m, ic, label: m.label, sub: `${fmtN(m.count)} juegos`, desc: m.desc, run: () => themeAPI.openCollection(m),
      ...(m.logo ? { p: { name: m.label, count: m.count, media: { logo: m.logo } } } : {}) }); // las desarrolladoras muestran su logo
    if (secOn('all')) out.push({ key: '_all', label: 'Todo', icon: 'all', items: [{ all: true, ic: 'all', label: 'Todos los juegos', sub: `${fmtN(library.total)} juegos`, desc: 'Tu biblioteca completa en una sola lista, de la A a la Z.', run: () => themeAPI.openAll() }] });
    for (const c of L.categories) out.push({ key: c.name, label: c.label, icon: c.name, video: c.video, items: c.platforms.map(p => ({ p, label: p.name, sub: [p.year, ord(p.generation), `${fmtN(p.count)} juegos`].filter(Boolean).join(' · '), desc: p.notes, run: () => themeAPI.openPlatform(p) })) });
    if ((L.modes || []).length) out.push({ key: '_modes', label: 'Modo de juego', icon: 'modes', items: L.modes.map(m => coll(m, 'mode_' + m.id)) });
    if ((L.genres || []).length) out.push({ key: '_genres', label: 'Géneros', icon: 'genre', items: L.genres.map(m => coll(m, genreIcon(m))) });
    if ((L.developers || []).length) out.push({ key: '_devs', label: 'Desarrolladoras', icon: 'dev', items: L.developers.map(m => coll(m, 'dev')) });
    if (spectator) out.push({ key: '_spectator', label: 'Espectador', icon: 'spectator', items: [{ ic: 'spectator', label: 'Toda la biblioteca', sub: 'Videos al azar', run: () => themeAPI.openSpectator(null) },
      ...L.categories.map(c => ({ ic: c.name, label: c.label, sub: 'Videos al azar de ' + c.label.toLowerCase(), run: () => themeAPI.openSpectator(c.name) }))] });
    if (system) out.push({ key: '_settings', label: 'Ajustes', icon: 'settings', items: [{ ic: 'settings', label: 'Ajustes de Pandora', sub: 'Tema, sonido, inicio y control', run: () => themeAPI.openSettings() },
      { ic: '_other', label: 'Volver a leer LaunchBox', sub: 'Si agregaste juegos', run: () => themeAPI.reload() }] });
    return out;
  },
  reload: () => reloadLibrary(),
};
let themePaint = null, particleColor = '#c9c0ff';
// Tema aleatorio: al abrir Pandora (no al recargar por un cambio de ajustes) toca otro tema de los que elegiste.
const randomPool = () => { const p = (settings.randomPool || Object.keys(THEMES)).filter(k => THEMES[k]); return p.length ? p : Object.keys(THEMES); };
function pickRandomTheme() {
  let fresh = true;
  try { fresh = !sessionStorage.getItem('pandora-abierta'); sessionStorage.setItem('pandora-abierta', '1'); } catch {}
  if (!settings.themeRandom || !fresh) return;
  const pool = randomPool(), opts = pool.length > 1 ? pool.filter(k => k !== settings.theme) : pool;
  settings.theme = opts[Math.floor(Math.random() * opts.length)];
  settings.shelfLayout = 'tema'; settings.detailLayout = 'tema';
  saveSettings();
}
async function applyTheme() {
  // Temas que se rehicieron o se unieron con otro.
  settings.theme = { ondas: 'barra', ventanas: 'lavanda', cuatro: 'volumen', bloques: 'disco' }[settings.theme] || settings.theme;
  const id = THEMES[settings.theme] ? settings.theme : 'cubo';
  settings.theme = id;
  for (const c of [...document.body.classList]) if (c.startsWith('theme-')) document.body.classList.remove(c);
  document.body.classList.add('theme-' + id);
  document.body.classList.toggle('pixel-era', !!THEMES[id].pixel); // entramado de puntos para consolas de pixeles
  const link = $('#themeCss');
  const href = id === 'cubo' ? 'data:text/css,' : `/themes/${id}/theme.css`;
  if (link.getAttribute('href') !== href) {
    await new Promise(r => { link.onload = r; link.onerror = r; link.setAttribute('href', href); setTimeout(r, 1500); });
  }
  themePaint = null;
  if (id === 'cubo') homeImpl = cubeHome;
  else {
    const mod = await import(`/themes/${id}/home.js`);
    homeImpl = mod.default(themeAPI, $('#homeTheme'));
    themePaint = homeImpl.backdrop ? homeImpl.backdrop.bind(homeImpl) : null; // fondo pintado por el tema (no confundir con su paint de interfaz)
  }
  particleColor = getComputedStyle(document.documentElement).getPropertyValue('--particle').trim() || '#c9c0ff';
}
(function themeCanvas() {
  const cv = $('#themeCanvas'), g = cv.getContext('2d');
  let W = 0, H = 0;
  // Cada tema dice a qué resolución pinta su fondo (los difuminados no necesitan resolución completa).
  let scale = 0;
  const size = () => {
    scale = homeImpl.paintScale || 1;
    const k = Math.min(devicePixelRatio, 1.5) * scale;
    W = cv.width = Math.round(innerWidth * k); H = cv.height = Math.round(innerHeight * k);
  };
  size(); addEventListener('resize', size);
  let had = false;
  onFrame((dt, now) => {
    if (!themePaint) { if (had) { g.clearRect(0, 0, W, H); had = false; } return; }
    if ((homeImpl.paintScale || 1) !== scale) size();
    had = true; themePaint(g, W, H, dt, now);
  });
})();

// ======================================================================
// Plataformas de una categoría
// ======================================================================
screens.platforms = {
  el: $('#platforms'), cat: null, idx: 0, pos: new Spring(0, { response: 0.38, damping: 1 }), tiles: [], memo: {},
  get focused() { return this.cat?.platforms[this.idx]; },
  enter(cat) {
    this.cat = cat; this.idx = clamp(this.memo[cat.name] || 0, 0, cat.platforms.length - 1); this.pos.jump(this.idx);
    this.tiles = cat.platforms.map((p, i) => {
      const t = h('button', { class: 'tile' + (p.icon ? ' tile-mode' : '') }, p.media.logo ? h('img', { src: p.media.logo, alt: p.name })
        : p.icon ? h('div', { class: 'tile-ico' }, icon(p.icon), h('span', { class: 'tname', text: p.name })) : h('span', { class: 'tname', text: p.name }));
      t.addEventListener('click', () => { if (this.dragged) return; if (i === this.idx) this.open(); else this.focus(i); });
      return t;
    });
    $('#platRow').replaceChildren(...this.tiles);
    this.info(true);
  },
  resume() { this.info(true); },
  leave() { this.memo[this.cat.name] = this.idx; clearTimeout(this.vt); clearTimeout(this.t); if (top() === 'home') Back.setVideo(null); },
  focus(i, sound = true) {
    i = clamp(i, 0, this.tiles.length - 1);
    if (i === this.idx) return;
    this.idx = i; this.pos.set(i); if (sound) S.play('move', i); this.info(); saveLast();
  },
  info(now) {
    const p = this.focused;
    $('#platTitle').textContent = p.name;
    $('#platMeta').textContent = [p.manufacturer, p.year, ord(p.generation), `${fmtN(p.count)} juegos`].filter(Boolean).join(' · ');
    $('#platNotes').textContent = p.notes;
    clearTimeout(this.t); clearTimeout(this.vt);
    const apply = () => {
      const dev = $('#platDevice');
      if (p.media.device) { dev.src = p.media.device; dev.classList.add('on'); } else dev.classList.remove('on');
      Back.setImage(p.media.fanart?.[0] || null); Back.setLook('dim');
      if (Back.video !== p.media.video) Back.setVideo(null);
      if (settings.autoVideo && p.media.video) this.vt = setTimeout(() => { if (this.focused === p && top() === 'platforms') Back.setVideo(p.media.video); }, 800);
    };
    if (now) apply(); else this.t = setTimeout(apply, 140);
    this.tiles.forEach((t, i) => t.classList.toggle('focus', i === this.idx));
  },
  open() { S.play('select'); go('shelf', this.focused); },
  action(a) {
    if (a === 'left') this.focus(this.idx - 1);
    else if (a === 'right') this.focus(this.idx + 1);
    else if (a === 'lb') this.focus(this.idx - 5);
    else if (a === 'rb') this.focus(this.idx + 5);
    else if (a === 'a') this.open();
  },
  frame(dt) {
    this.pos.step(dt);
    const r = rem(), tw = 17 * r, slot = 19.5 * r, cx = innerWidth / 2 - tw / 2;
    this.tiles.forEach((t, i) => {
      const off = i - this.pos.x, f = Math.max(0, 1 - Math.abs(off));
      const x = cx + off * slot + Math.sign(off) * Math.min(Math.abs(off), 1) * tw * 0.1;
      const s = 0.88 + 0.2 * f, o = Math.max(0.12, 1 - Math.max(0, Math.abs(off) - 1) * 0.2);
      t.style.transform = `translate3d(${x.toFixed(1)}px, ${(-f * 0.6 * r).toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
      t.style.opacity = o.toFixed(3);
    });
  },
  initDrag() {
    let start = 0;
    const row = $('#platRow');
    draggable(row, {
      onStart: () => { start = this.pos.x; this.dragged = false; },
      onMove: dx => { this.dragged = true; this.pos.jump(clampRubber(start - dx / (19.5 * rem()), this.tiles.length)); },
      onEnd: (vx, _, moved) => {
        if (!moved) return;
        const slot = 19.5 * rem();
        const t = clamp(Math.round(this.pos.x - project(vx, 0.995) / slot), 0, this.tiles.length - 1);
        this.pos.set(t, -vx / slot);
        if (t !== this.idx) { this.idx = t; S.play('move', t); this.info(); }
        setTimeout(() => (this.dragged = false), 50);
      },
    });
    row.addEventListener('wheel', e => { e.preventDefault(); this.focus(this.idx + Math.sign(e.deltaY || e.deltaX)); }, { passive: false });
  },
};
function clampRubber(x, n) {
  if (x < 0) return -rubberband(-x, 3);
  if (x > n - 1) return n - 1 + rubberband(x - (n - 1), 3);
  return x;
}

// ======================================================================
// Juegos de una plataforma, en cinco acomodos
// ======================================================================
screens.shelf = {
  el: $('#shelf'), platform: null, games: [], idx: 0,
  pos: new Spring(0, { response: 0.36, damping: 1 }), row: new Spring(0, { response: 0.4, damping: 1 }),
  items: new Map(), memo: {}, L: null,
  async enter(platform) {
    this.platform = platform; this.games = []; this.all = []; this.query = ''; this.clearItems(); this.paintSearch();
    $('#shelfLogo').replaceChildren(h('h1', { text: 'Cargando…' }));
    $('#shelfMeta').textContent = ''; $('#shelfDesc').textContent = ''; $('#shelfPos').textContent = '';
    $('#shelfArt').removeAttribute('src');
    Back.setLook('dim');
    this.ready = loadGames(platform);
    const games = await this.ready;
    if (this.platform !== platform) return;
    this.all = sortGames(games); this.games = this.all;
    const want = this.memo[platform.name];
    const i = want ? this.games.findIndex(g => g.id === want) : -1;
    this.idx = clamp(i >= 0 ? i : 0, 0, Math.max(0, games.length - 1));
    this.relayout(); this.pos.jump(this.idx); this.row.jump(this.rowTarget());
    this.buildLetters(); this.info(); renderChrome();
  },
  // ---------- Búsqueda ----------
  openSearch() {
    if (!this.all.length) return;
    S.play('open');
    Keyboard.show({
      value: this.query, input: $('#searchInput'),
      onChange: q => this.setQuery(q),
      onClose: () => { this.paintSearch(); renderChrome(); },
    });
    this.paintSearch();
  },
  setQuery(q) {
    const cur = this.games[this.idx];
    this.query = q;
    const words = norm(q).split(/\s+/).filter(Boolean);
    this.games = words.length ? this.all.filter(g => { const t = g._n ||= norm(g.title); return words.every(w => t.includes(w)); }) : this.all;
    const i = cur ? this.games.indexOf(cur) : -1;
    this.idx = i >= 0 ? i : 0;
    this.refreshLayout(); this.buildLetters(); this.paintSearch(); renderChrome();
  },
  paintSearch() {
    const bar = $('#searchBar'), on = !!this.query || (Keyboard.open && Keyboard.owner === 'shelf');
    bar.classList.toggle('show', on);
    const inp = $('#searchInput');
    if (document.activeElement !== inp) inp.value = this.query || '';
    $('#searchCount').textContent = this.query ? (this.games.length ? `${fmtN(this.games.length)} ${this.games.length === 1 ? 'juego' : 'juegos'}` : 'Sin resultados') : '';
  },
  back() { if (this.query) { this.setQuery(''); S.play('back'); return true; } return false; },
  // ---------- Barra de letras ----------
  letterOf: g => { const c = (g.sortTitle || g.title || '#')[0]?.toLowerCase() || '#'; return /[a-z]/.test(c) ? c : '#'; },
  buildLetters() {
    const nav = $('#letters');
    const show = settings.letterBar && this.games.length > 20;
    this.el.classList.toggle('has-letters', show);
    if (!show) { nav.replaceChildren(); return; }
    const present = new Set(this.games.filter(g => !(settings.favFirst && g.favorite)).map(this.letterOf));
    nav.replaceChildren(...'#abcdefghijklmnopqrstuvwxyz'.split('').map(L => {
      const b = h('button', { class: present.has(L) ? '' : 'off', text: L === '#' ? '#' : L.toUpperCase(), 'data-l': L });
      b.addEventListener('click', () => this.gotoLetter(L));
      return b;
    }));
  },
  gotoLetter(L) {
    let i = this.games.findIndex(g => !(settings.favFirst && g.favorite) && this.letterOf(g) === L);
    if (i < 0) { S.play('error'); return; }
    this.focus(i); toast(L.toUpperCase());
  },
  paintLetters() {
    const g = this.games[this.idx]; if (!g) return;
    const L = settings.favFirst && g.favorite ? '★' : this.letterOf(g);
    for (const b of $('#letters').children) b.classList.toggle('on', b.dataset.l === L);
  },
  resume() { Back.setLook('dim'); currentGame = this.games[this.idx] || null; updateAudio(); },
  leave() {
    if (this.platform && this.games[this.idx]) this.memo[this.platform.name] = this.games[this.idx].id;
    clearTimeout(this.dwell1); clearTimeout(this.dwell2);
    if (top() !== 'detail') { Back.setVideo(null); currentGame = null; }
  },
  clearItems() { for (const it of this.items.values()) it.el.remove(); this.items.clear(); },

  relayout() {
    const lay = shelfLay();
    for (const k of Object.keys(SHELF_LAYOUTS)) this.el.classList.toggle('L-' + k, k === lay);
    this.el.classList.toggle('L-tema', settings.shelfLayout === 'tema');
    const track = $('#shelfTrack');
    track.classList.toggle('reflect', lay === 'repisa' || lay === 'carrusel');
    const tTh = settings.shelfLayout === 'tema' ? THEMES[settings.theme] || {} : {};
    const r = rem(), type = { ...imageType(), ...(tTh.tile ? { aspect: tTh.tile } : {}), ...(tTh.tkinds ? { order: tTh.tkinds } : {}) }, W = track.clientWidth || innerWidth, H = track.clientHeight || 24 * r;
    const L = { lay, r, W, H, type, content: 'image' };
    if (lay === 'repisa') { L.ih = H * 0.72; L.iw = L.ih * type.aspect; L.slot = L.iw + (tTh.gap ?? 1.8) * r; L.axis = 'h'; if (tTh.anchor) L.anchor = tTh.anchor * r; }
    if (lay === 'carrusel') { L.ih = H * 0.82; L.iw = L.ih * type.aspect; L.slot = L.iw * 0.42; L.axis = 'h'; }
    if (lay === 'rejilla') {
      L.ih = tTh.isz ? tTh.isz * r : type.aspect > 1.2 ? 9.5 * r : 13 * r; L.iw = Math.min(L.ih * type.aspect, 19 * r); L.ih = L.iw / type.aspect;
      L.gap = 1.6 * r; L.cols = Math.max(2, Math.floor((W - 8 * r + L.gap) / (L.iw + L.gap)));
      L.rowH = L.ih + 2.4 * r; L.left = (W - (L.cols * (L.iw + L.gap) - L.gap)) / 2; L.axis = 'grid';
    }
    if (lay === 'biblioteca') {
      // Estilo Playnite: rejilla compacta de carátulas a la izquierda; el panel de la derecha muestra el juego.
      L.iw = type.aspect > 1.2 ? 13.4 * r : 8.4 * r; L.ih = L.iw / type.aspect;
      if (L.ih > 12.4 * r) { L.ih = 12.4 * r; L.iw = L.ih * type.aspect; }
      L.gap = 1.1 * r; L.cols = Math.max(2, Math.floor((W - 2 * r + L.gap) / (L.iw + L.gap)));
      L.rowH = L.ih + 1.6 * r; L.left = (W - (L.cols * (L.iw + L.gap) - L.gap)) / 2; L.axis = 'grid';
    }
    if (lay === 'lista') { L.content = 'text'; L.rowH = 3.9 * r; L.iw = W; L.ih = 3.4 * r; L.axis = 'v'; }
    if (lay === 'rueda') { L.content = 'logo'; L.iw = 26 * r; L.ih = 6 * r; L.rowH = 7.4 * r; L.axis = 'v'; }
    this.L = L;
    this.clearItems();

  },
  rowTarget() { return this.L?.axis === 'grid' ? Math.max(0, Math.floor(this.idx / this.L.cols) - 1) : 0; },
  imageFor(g, order = this.L.type.order) {
    for (const k of order) if (g.media[k]?.length) return { url: g.media[k][0], kind: k };
    return null;
  },
  makeItem(i) {
    const g = this.games[i], L = this.L;
    let el;
    if (L.content === 'text') {
      el = h('div', { class: 'item row-item' }, h('span', { class: 'n', text: String(i + 1).padStart(3, '0') }), h('span', { class: 't', text: (g.favorite ? '★ ' : '') + g.title }), h('span', { class: 's', text: [this.platform.mode ? short(g.platform) : null, g.year, g.maxPlayers > 1 ? `${g.maxPlayers} J` : ''].filter(Boolean).join(' · ') }));
    } else if (L.content === 'logo') {
      const lg = g.media.logo?.[0];
      el = h('div', { class: 'item wheel-item' }, lg ? h('img', { src: lg, alt: g.title, decoding: 'async', draggable: 'false' }) : h('div', { class: 'ph', text: g.title }));
    } else {
      const im = this.imageFor(g);
      el = h('div', { class: 'item t-' + (im ? im.kind : 'none') });
      if (im) el.append(h('img', { src: im.url, alt: g.title, decoding: 'async', draggable: 'false' }));
      else el.append(h('div', { class: 'ph', text: g.title }));
      el.append(h('span', { class: 'cap', text: g.title }));
    }
    if (g.favorite) el.append(h('span', { class: 'fav-badge', text: '★' }));
    if (L.content !== 'text') { el.style.width = L.iw + 'px'; el.style.height = L.ih + 'px'; }
    el.addEventListener('click', () => { if (this.dragged) return; if (i === this.idx) this.open(); else this.focus(i); });
    el.classList.toggle('focus', i === this.idx);
    $('#shelfTrack').append(el);
    return { el, i };
  },
  focus(i, sound = true) {
    if (!this.games.length) return;
    i = clamp(i, 0, this.games.length - 1);
    if (i === this.idx) { if (sound) S.play('error'); return; }
    this.idx = i; this.pos.set(i); this.row.set(this.rowTarget());
    if (sound) S.play('move', i);
    this.info(); saveLast();
  },
  info() {
    const g = this.games[this.idx];
    if (!g) { $('#shelfLogo').replaceChildren(h('h1', { text: this.query ? 'Sin resultados' : 'Sin juegos' })); $('#shelfMeta').textContent = this.query ? `Nada coincide con «${this.query}»` : ''; $('#shelfDesc').textContent = ''; $('#shelfPos').textContent = ''; currentGame = null; return; }
    currentGame = g;
    const logo = g.media.logo?.[0];
    $('#shelfLogo').replaceChildren(logo ? h('img', { src: logo, alt: g.title }) : h('h1', { text: g.title }));
    Object.assign(this.el.querySelector('.shelf-info').dataset, { title: g.title, year: g.year || '', dev: (g.publisher || g.developer || '').split(';')[0] });
    $('#shelfLogo').dataset.title = g.title;
    $('#shelfMeta').textContent = metaLine(g);
    $('#shelfDesc').textContent = settings.fields.description ? g.notes : '';
    $('#shelfPos').textContent = `${fmtN(this.idx + 1)} / ${fmtN(this.games.length)}`;
    this.paintLetters();
    const lay = this.L.lay;
    const tArt = settings.shelfLayout === 'tema' && THEMES[settings.theme]?.art;
    this.el.dataset.plat = this.platform?.name || '';
    const art = tArt ? this.imageFor(g, tArt) : lay === 'rueda' ? this.imageFor(g, ['box3d', 'box', 'cart']) : lay === 'lista' ? this.imageFor(g)
      : lay === 'biblioteca' ? this.imageFor(g, ['shots', 'fanart', 'box']) : null;
    const st = $('#shelfStats');
    if (st) st.replaceChildren(...(lay === 'biblioteca' ? [
      h('span', {}, h('b', { text: g.playTime ? fmtTime(g.playTime) : '—' }), 'jugado'),
      h('span', {}, h('b', { text: g.playCount ? fmtN(g.playCount) : '0' }), 'partidas'),
      h('span', {}, h('b', { text: g.lastPlayed ? fmtDate(g.lastPlayed) : 'nunca' }), 'última vez'),
    ] : []));
    if (art) $('#shelfArt').src = art.url; else $('#shelfArt').removeAttribute('src');
    for (const it of this.items.values()) it.el.classList.toggle('focus', it.i === this.idx);
    clearTimeout(this.dwell1); clearTimeout(this.dwell2);
    if (Back.video && Back.video !== g.media.video) Back.setVideo(null);
    updateAudio();
    this.dwell1 = setTimeout(() => Back.setImage(g.media.fanart?.[0] || g.media.shots?.[0] || null), 300);
    if (settings.autoVideo && g.media.video) this.dwell2 = setTimeout(() => { if (currentGame === g && top() === 'shelf') Back.setVideo(g.media.video); }, 1200);
    else if (settings.audioMode === 'musica') this.dwell2 = setTimeout(updateAudio, 900);
  },
  jumpLetter(d) {
    const key = g => settings.favFirst && g.favorite ? '★' : this.letterOf(g);
    const cur = key(this.games[this.idx]);
    let i = this.idx;
    if (d > 0) { while (i < this.games.length - 1 && key(this.games[i]) === cur) i++; }
    else {
      while (i > 0 && key(this.games[i - 1]) === cur) i--;
      if (i === this.idx && i > 0) { const k = key(this.games[i - 1]); i--; while (i > 0 && key(this.games[i - 1]) === k) i--; }
    }
    this.focus(i); toast(key(this.games[i]) === '★' ? '★ Favoritos' : key(this.games[i]).toUpperCase());
  },
  cycleType() {
    const i = IMAGE_TYPES.findIndex(t => t.id === settings.imageType);
    settings.imageType = IMAGE_TYPES[(i + 1) % IMAGE_TYPES.length].id;
    saveSettings(); S.play('toggle'); this.refreshLayout();
    if (this.L.content !== 'image' && this.L.lay !== 'lista') toast(`Imagen: ${imageType().label} (se usa en Repisa, Carrusel, Rejilla y Lista)`);
  },
  cycleLayout() {
    const k = Object.keys(SHELF_LAYOUTS);
    settings.shelfLayout = k[(k.indexOf(settings.shelfLayout) + 1) % k.length];
    saveSettings(); S.play('toggle'); this.refreshLayout(); toast(`Vista: ${SHELF_LAYOUTS[settings.shelfLayout]}`);
  },
  async toggleFav() {
    const g = this.games[this.idx]; if (!g) return;
    await toggleFavorite(g);
    this.resort(g);
  },
  resort(keep = this.games[this.idx]) {
    this.all = sortGames(this.all);
    if (this.query) this.setQuery(this.query); else this.games = this.all;
    this.idx = Math.max(0, this.games.indexOf(keep));
    this.refreshLayout(); this.buildLetters();
  },
  refreshLayout() { this.relayout(); this.pos.jump(this.idx); this.row.jump(this.rowTarget()); this.info(); },
  open() { const g = this.games[this.idx]; if (!g) return; S.play('select'); go('detail', { game: g, platform: this.platform.mode ? { name: g.platform } : this.platform }); },
  action(a) {
    const ax = this.L?.axis;
    const step = { left: -1, right: 1, up: 0, down: 0 };
    if (ax === 'grid') { step.up = -this.L.cols; step.down = this.L.cols; }
    if (ax === 'v') { step.up = -1; step.down = 1; step.left = -10; step.right = 10; }
    if (a in step) { if (step[a]) this.focus(this.idx + step[a]); }
    else if (a === 'lb') this.focus(this.idx - (ax === 'grid' ? this.L.cols * 3 : 10));
    else if (a === 'rb') this.focus(this.idx + (ax === 'grid' ? this.L.cols * 3 : 10));
    else if (a === 'lt') this.jumpLetter(-1);
    else if (a === 'rt') this.jumpLetter(1);
    else if (a === 'y') { if (settings.search) this.openSearch(); else this.cycleType(); }
    else if (a === 'rs') this.cycleLayout();
    else if (a === 'ls') this.toggleFav();
    else if (a === 'x') play(this.games[this.idx]);
    else if (a === 'a') this.open();
  },
  range() {
    const L = this.L, n = this.games.length;
    if (L.axis === 'grid') {
      const r0 = Math.floor(this.row.x) - 1, rows = Math.ceil(L.H / L.rowH) + 2;
      return [Math.max(0, r0 * L.cols), Math.min(n - 1, (r0 + rows) * L.cols - 1)];
    }
    const span = L.axis === 'h' ? Math.ceil(L.W / L.slot / 2) + 3 : Math.ceil(L.H / L.rowH / 2) + 2;
    const c = Math.round(this.pos.x);
    return [Math.max(0, c - span), Math.min(n - 1, c + span)];
  },
  place(i, el) {
    const L = this.L, r = L.r, off = i - this.pos.x, a = Math.abs(off), f = Math.max(0, 1 - a), sg = Math.sign(off);
    let t, o = 1, z = 100 - Math.round(a * 2);
    if (L.lay === 'repisa') {
      const x = (L.anchor ?? L.W / 2 - L.iw / 2) + off * L.slot + sg * Math.min(a, 1) * L.iw * (L.anchor ? 0.26 : 0.13), y = L.H - L.ih - f * 1.4 * r;
      t = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${(1 + 0.22 * f).toFixed(3)})`;
      o = Math.max(0.2, 1 - Math.max(0, a - 1) * 0.11);
    } else if (L.lay === 'carrusel') {
      const c = clamp(off, -1, 1);
      const x = L.W / 2 - L.iw / 2 + c * L.iw * 0.78 + (a > 1 ? sg * (a - 1) * L.slot : 0), y = (L.H - L.ih) / 2;
      const tz = -Math.min(a, 1) * 7 * r - Math.max(0, a - 1) * 0.6 * r;
      t = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${tz.toFixed(1)}px) rotateY(${(-c * 58).toFixed(2)}deg) scale(${(1 + 0.1 * f).toFixed(3)})`;
      o = Math.max(0.12, 1 - Math.max(0, a - 1) * 0.08);
    } else if (L.lay === 'rejilla' || L.lay === 'biblioteca') {
      const col = i % L.cols, rw = Math.floor(i / L.cols), foc = i === this.idx, bib = L.lay === 'biblioteca';
      const x = L.left + col * (L.iw + L.gap), y = (bib ? 1 : 1.6) * r + (rw - this.row.x) * L.rowH;
      t = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${foc ? (bib ? 1.06 : 1.1) : 1})`;
      o = foc ? 1 : bib ? 0.7 : 0.82; z = foc ? 200 : 100;
    } else if (L.lay === 'lista' && settings.shelfLayout === 'tema') {
      // Listas «del tema» (ventanas, paneles): empiezan arriba y se desplazan sin dejar huecos.
      const vis = Math.max(1, Math.floor(L.H / L.rowH)), keep = Math.floor(vis * 0.45);
      const top = clamp(this.pos.x - keep, 0, Math.max(0, (this.games?.length || 0) - vis));
      const y = 0.3 * r + (i - top) * L.rowH;
      t = `translate3d(0,${y.toFixed(1)}px,0)`;
      o = y < -L.rowH || y > L.H ? 0 : 1;
    } else if (L.lay === 'lista') {
      const y = L.H * 0.45 + off * L.rowH - L.ih / 2;
      t = `translate3d(0,${y.toFixed(1)}px,0)`;
      o = Math.max(0.12, 1 - a * 0.085);
    } else if (L.lay === 'rueda') {
      const y = L.H / 2 - L.ih / 2 + off * L.rowH, x = (L.W - L.iw) / 2 + (1 - Math.cos(Math.min(a, 5) * 0.32)) * 16 * r;
      t = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${(0.7 + 0.42 * f).toFixed(3)})`;
      o = Math.max(0.1, 1 - a * 0.17);
    }
    el.style.transform = t; el.style.opacity = o.toFixed(3); el.style.zIndex = z;
  },
  frame(dt) {
    if (!this.games.length || !this.L) return;
    this.pos.step(dt); this.row.step(dt);
    if (Math.abs(this.L.r - rem()) > 0.01) this.refreshLayout();
    const [lo, hi] = this.range();
    for (const [i, it] of this.items) if (i < lo || i > hi) { it.el.remove(); this.items.delete(i); }
    for (let i = lo; i <= hi; i++) {
      if (!this.items.has(i)) this.items.set(i, this.makeItem(i));
      this.place(i, this.items.get(i).el);
    }
  },
  initDrag() {
    let sp = 0, sr = 0;
    const track = $('#shelfTrack');
    draggable(track, {
      axis: 'x',
      onStart: () => { sp = this.pos.x; sr = this.row.x; this.dragged = false; },
      onMove: (dx, dy) => {
        this.dragged = true;
        const L = this.L;
        if (L.axis === 'h') this.pos.jump(clampRubber(sp - dx / L.slot, this.games.length));
        else if (L.axis === 'v') this.pos.jump(clampRubber(sp - dy / L.rowH, this.games.length));
        else this.row.jump(Math.max(-0.5, sr - dy / L.rowH));
      },
      onEnd: (vx, vy, moved) => {
        if (!moved) return;
        const L = this.L, n = this.games.length;
        let t;
        if (L.axis === 'grid') {
          const rt = Math.max(0, Math.round(this.row.x - project(vy, 0.995) / L.rowH));
          this.row.set(rt, -vy / L.rowH);
          t = clamp((rt + 1) * L.cols + (this.idx % L.cols), 0, n - 1);
          if (t !== this.idx) { this.idx = t; this.pos.jump(t); S.play('move', t); this.info(); }
        } else {
          const unit = L.axis === 'h' ? L.slot : L.rowH, v = L.axis === 'h' ? vx : vy;
          t = clamp(Math.round(this.pos.x - project(v, 0.997) / unit), 0, n - 1);
          this.pos.set(t, -v / unit);
          if (t !== this.idx) { this.idx = t; S.play('move', t); this.info(); }
        }
        saveLast();
        setTimeout(() => (this.dragged = false), 50);
      },
    });
    track.addEventListener('wheel', e => {
      e.preventDefault();
      const d = Math.sign(e.deltaY || e.deltaX);
      this.focus(this.idx + d * (this.L.axis === 'grid' ? this.L.cols : 1));
    }, { passive: false });

  },
};

const norm = t => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function sortGames(list) {
  if (!settings.favFirst) return [...list].sort((a, b) => a.sortTitle.localeCompare(b.sortTitle, 'es'));
  return [...list].sort((a, b) => (b.favorite - a.favorite) || a.sortTitle.localeCompare(b.sortTitle, 'es'));
}
async function toggleFavorite(g) {
  const value = !g.favorite;
  try { await fetch('/api/favorite', { method: 'POST', body: JSON.stringify({ id: g.id, value }) }); } catch { toast('No pude guardar el favorito'); return; }
  g.favorite = value;
  S.play(value ? 'select' : 'back');
  toast(value ? `★ ${g.title} está en tus favoritos` : `${g.title} ya no está en favoritos`);
}

function metaLine(g) {
  const F = settings.fields, out = [];
  if (screens.shelf.platform?.mode) out.push(short(g.platform));
  if (F.year && g.year) out.push(g.year);
  if (F.genres && g.genres.length) out.push(g.genres.slice(0, 2).join(', '));
  if (F.players && g.maxPlayers) out.push(g.maxPlayers > 1 ? `1–${g.maxPlayers} jugadores` : '1 jugador');
  if (F.developer && g.developer) out.push(g.developer.split(';')[0]);
  return out.join(' · ');
}

// ======================================================================
// Ficha del juego, en cuatro acomodos
// ======================================================================
screens.detail = {
  el: $('#detail'), game: null, acts: [], ai: 0, t: 0, ti: 0,
  enter(params) {
    const { game, platform } = params;
    this.params = params; this.game = game; currentGame = game;
    const lay = detailLay();
    for (const k of Object.keys(DETAIL_LAYOUTS)) this.el.classList.toggle('D-' + k, k === lay);
    this.el.classList.toggle('D-tema', settings.detailLayout === 'tema');
    $('#dLogo').dataset.title = game.title;
    const dd = { title: game.title, plat: platform.name || '', file: dosName(game.title), year: game.year || '', dev: (game.publisher || game.developer || '').split(';')[0] };
    Object.assign(this.el.dataset, dd); Object.assign(this.el.querySelector('.detail-main').dataset, dd);
    const m = game.media, F = settings.fields;
    $('#dLogo').replaceChildren(m.logo ? h('img', { src: m.logo[0], alt: game.title }) : h('h1', { text: game.title }));
    $('#dSub').textContent = [platform.name, F.year && game.date ? fmtDate(game.date) : null].filter(Boolean).join(' · ');

    const dev = game.developer.split(';')[0], pub = game.publisher.split(';')[0];
    const players = game.maxPlayers ? (game.maxPlayers > 1 ? `1–${game.maxPlayers} jugadores` : '1 jugador') : '';
    const rating = game.community ? `★ ${game.community.toFixed(1)}` + (game.votes ? ` · ${fmtN(game.votes)} votos` : '') : '';
    const chips = [];
    if (F.genres) game.genres.forEach(g => chips.push(h('span', { text: g })));
    if (F.players && players) chips.push(h('span', { text: players }));
    if (F.modes) game.modes.filter(x => x === 'Cooperativo' || (x === 'Multijugador' && !game.maxPlayers)).forEach(x => chips.push(h('span', { text: x })));
    if (F.developer && dev) chips.push(h('span', { text: (pub === dev ? '' : 'Desarrolla: ') + dev }));
    if (F.publisher && pub && pub !== dev) chips.push(h('span', { text: 'Edita: ' + pub }));
    if (F.region && game.region) chips.push(h('span', { text: game.region }));
    if (F.esrb && game.esrb) chips.push(h('span', { text: game.esrb }));
    if (F.series && game.series) chips.push(h('span', { text: 'Serie: ' + game.series }));
    if (F.rating && rating) chips.push(h('span', { class: 'star', text: rating }));
    $('#dChips').replaceChildren(...chips);

    const facts = [];
    const add = (k, label, val) => { if (F[k] && val) facts.push(h('div', {}, h('dt', { text: label }), h('dd', { text: val }))); };
    add('developer', 'Desarrolla', dev); add('publisher', 'Edita', pub); add('year', 'Lanzamiento', game.date && fmtDate(game.date));
    add('genres', 'Género', game.genres.join(', ')); add('players', 'Jugadores', players); add('modes', 'Modo', game.modes.join(', '));
    add('region', 'Región', game.region); add('esrb', 'Clasificación', game.esrb); add('series', 'Serie', game.series);
    add('rating', 'Calificación', rating);
    if (F.stats && game.playCount) add('stats', 'Tus partidas', `${fmtN(game.playCount)}${game.playTime ? ' · ' + fmtTime(game.playTime) : ''}`);
    $('#dFacts').replaceChildren(...facts);

    const desc = $('#dDesc');
    desc.textContent = F.description ? (game.notes || 'Sin descripción.') : '';
    desc.scrollTop = 0;
    const st = [];
    if (F.stats && game.playCount) {
      st.push(h('span', {}, h('b', { text: fmtN(game.playCount) }), 'partidas'));
      if (game.playTime) st.push(h('span', {}, h('b', { text: fmtTime(game.playTime) }), 'jugado'));
      if (game.lastPlayed) st.push(h('span', {}, h('b', { text: fmtDate(game.lastPlayed) }), 'última vez'));
    }
    $('#dStats').replaceChildren(...st);

    this.images = galleryOf(game);
    this.buildActions();

    const dKinds = settings.detailLayout === 'tema' && THEMES[settings.theme]?.dart;
    const art = dKinds ? dKinds.map(k => m[k]?.[0]).find(Boolean) : m.box3d?.[0] || m.box?.[0] || m.cart?.[0];
    const artEl = $('#dArt');
    if (art) { artEl.src = art; artEl.hidden = false; } else artEl.hidden = true;
    const n = lay === 'galeria' ? 10 : 4;
    this.thumbs = this.images.filter(x => x.group === 'shots' || x.group === 'fanart').slice(0, n);
    this.ti = -1;
    $('#dThumbs').replaceChildren(...this.thumbs.map(x => {
      const im = h('img', { src: x.url, alt: '' });
      im.addEventListener('click', () => Viewer.show({ kind: 'images', items: this.images, index: this.images.indexOf(x) }));
      return im;
    }));

    Back.setLook('clear');
    Back.setImage(m.fanart?.[0] || m.shots?.[0] || null);
    clearTimeout(this.vt);
    if (settings.autoVideo && m.video && Back.video !== m.video) this.vt = setTimeout(() => { if (currentGame === game && top() === 'detail') Back.setVideo(m.video); }, 700);
  },
  buildActions() {
    const game = this.game, m = game.media;
    this.acts = [
      { label: 'Jugar', g: 'x', primary: true, run: () => play(game) },
      m.video && { label: 'Ver video', run: () => Viewer.show({ kind: 'video', url: m.video }) },
      this.images.length && { label: 'Imágenes', n: this.images.length, run: () => Viewer.show({ kind: 'images', items: this.images, index: 0 }) },
      m.manual && { label: 'Manual', run: () => Viewer.show({ kind: 'manual', url: m.manual }) },
      m.music && { label: settings.audioMode === 'musica' ? 'Música sonando' : 'Escuchar música', run: () => { if (settings.audioMode !== 'musica') setAudio('musica'); } },
      game.apps?.length && { label: 'Versiones', n: game.apps.length + 1, run: () => Picker.show(game) },
      { label: game.favorite ? 'En favoritos' : 'Favorito', star: true, run: () => toggleFavorite(game).then(() => this.buildActions()) },
    ].filter(Boolean);
    this.ai = clamp(this.ai, 0, this.acts.length - 1);
    $('#dActions').replaceChildren(...this.acts.map((a, i) => {
      const b = h('button', { class: 'act' + (a.primary ? ' primary' : '') + (a.star && game.favorite ? ' fav' : '') }, a.g ? glyph(a.g) : null, a.star ? h('span', { class: 'star-i', text: game.favorite ? '★' : '☆' }) : null, a.label, a.n ? h('span', { class: 'n', text: a.n }) : null);
      b.addEventListener('click', () => { this.ai = i; this.paint(); S.play('select'); a.run(); });
      return b;
    }));
    this.paint();
  },
  paintActions() { if (this.game) this.buildActions(); },
  resume() { Back.setLook('clear'); currentGame = this.game; updateAudio(); },
  leave() { clearTimeout(this.vt); Back.setLook('dim'); },
  paint() { [...$('#dActions').children].forEach((b, i) => b.classList.toggle('focus', i === this.ai)); },
  cycleLayout() {
    const k = Object.keys(DETAIL_LAYOUTS);
    settings.detailLayout = k[(k.indexOf(settings.detailLayout) + 1) % k.length];
    saveSettings(); S.play('toggle'); this.enter(this.params); renderChrome();
    toast(`Ficha: ${DETAIL_LAYOUTS[settings.detailLayout]}`);
  },
  thumb(d) {
    if (!this.thumbs.length) return;
    this.ti = (this.ti + d + this.thumbs.length) % this.thumbs.length;
    [...$('#dThumbs').children].forEach((im, i) => im.classList.toggle('focus', i === this.ti));
    const th = $('#dThumbs'), im = th.children[this.ti];
    if (im) th.scrollTo({ left: Math.max(0, im.offsetLeft - th.clientWidth / 2 + im.offsetWidth / 2), behavior: 'smooth' });
    Back.setVideo(null); Back.setImage(this.thumbs[this.ti].url); S.play('move', this.ti);
  },
  action(a) {
    if (a === 'left' || a === 'right') {
      const n = clamp(this.ai + (a === 'left' ? -1 : 1), 0, this.acts.length - 1);
      if (n !== this.ai) { this.ai = n; this.paint(); S.play('move', n); } else S.play('error');
    } else if (a === 'up' || a === 'down') {
      $('#dDesc').scrollBy({ top: (a === 'up' ? -1 : 1) * 5 * rem(), behavior: 'smooth' });
    } else if (a === 'lb' || a === 'rb') this.thumb(a === 'lb' ? -1 : 1);
    else if (a === 'a') { S.play('select'); this.acts[this.ai]?.run(); }
    else if (a === 'x') play(this.game);
    else if (a === 'y' || a === 'rs') this.cycleLayout();
    else if (a === 'ls') toggleFavorite(this.game).then(() => this.buildActions());
  },
  frame(dt) {
    this.t += dt;
    if (Math.abs(sticks.ry) > 0) $('#dDesc').scrollTop += sticks.ry * 14 * rem() * dt;
    if (!reducedMotion.matches) $('#dArt').style.transform = `translateY(${(Math.sin(this.t * 2 * Math.PI / 8) * 0.5).toFixed(3)}rem) rotate(${(Math.sin(this.t * 2 * Math.PI / 11) * 0.6).toFixed(3)}deg)`;
  },
};
function setAudio(mode) {
  settings.audioMode = mode; saveSettings(); renderChrome(); updateAudio(); syncHomeVideos(); toast(`Audio: ${AUDIO_MODES[mode]}`);
  if (top() === 'detail') screens.detail.paintActions();
}
function fmtDate(d) {
  const [y, m, day] = d.split('-').map(Number);
  if (!m) return String(y);
  return new Date(y, m - 1, day || 1).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}
// Nombre de archivo al estilo DOS (8.3) para las vistas de ese tema.
function dosName(t) { const w = String(t || '').normalize('NFD').replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().split(/\s+/).filter(Boolean); return ((w.length > 1 ? w[0].slice(0, 4) + w[1].slice(0, 4) : (w[0] || 'JUEGO')).slice(0, 8)) + '.TXT'; }
function fmtTime(s) { const hh = Math.floor(s / 3600), mm = Math.round((s % 3600) / 60); return hh ? `${hh} h ${mm} min` : `${mm} min`; }
const GALLERY = [
  ['box', 'Caja frontal'], ['back', 'Caja trasera'], ['box3d', 'Caja 3D'], ['cart', 'Disco o cartucho'],
  ['shots', 'Captura'], ['fanart', 'Fanart'], ['flyer', 'Publicidad'], ['marquee', 'Marquesina'], ['cabinet', 'Gabinete'], ['logo', 'Logo'],
];
function galleryOf(g) {
  const out = [];
  for (const [k, label] of GALLERY) (g.media[k] || []).forEach(url => out.push({ url, label, group: k }));
  return out;
}

// ======================================================================
// Espectador: videos al azar de toda la biblioteca
// ======================================================================
screens.spectator = {
  el: $('#spectator'), list: [], i: 0, filter: null, started: 0,
  async enter(params) {
    this.auto = !!params?.auto; this.filter = params?.filter || null;
    Back.setLook('clear'); Back.setImage(null);
    await this.load();
    this.show(0);
  },
  async load() {
    const q = this.filter ? '&category=' + encodeURIComponent(this.filter) : '';
    const d = await (await fetch('/api/random?n=40' + q)).json();
    this.list = d.games; this.i = 0;
    const cat = library.categories.find(c => c.name === this.filter);
    $('#specFilter').textContent = 'Espectador · ' + (cat ? cat.label : 'Toda la biblioteca');
  },
  show(i) {
    if (!this.list.length) { toast('No encontré juegos con video'); return; }
    this.i = (i + this.list.length) % this.list.length;
    const g = this.list[this.i];
    currentGame = g; this.started = performance.now();
    $('#specLogo').replaceChildren(g.media.logo ? h('img', { src: g.media.logo[0], alt: g.title }) : h('h1', { text: g.title }));
    $('#specMeta').textContent = [short(g.platform), g.year, g.genres.slice(0, 2).join(', ')].filter(Boolean).join(' · ');
    Back.setImage(g.media.fanart?.[0] || g.media.shots?.[0] || null);
    Back.setVideo(g.media.video, { loop: false });
    updateAudio();
  },
  async next() { if (this.i >= this.list.length - 1) { await this.load(); this.show(0); } else this.show(this.i + 1); },
  resume() { Back.setLook('clear'); if (this.list.length) this.show(this.i); },
  leave() { if (top() !== 'detail') Back.setVideo(null); },
  async cycleFilter(d) {
    const opts = [null, ...library.categories.map(c => c.name)];
    this.filter = opts[(opts.indexOf(this.filter) + d + opts.length) % opts.length];
    S.play('toggle'); await this.load(); this.show(0);
  },
  action(a) {
    if (a === 'right') { S.play('move', 1); this.next(); }
    else if (a === 'left') { S.play('move', 0); this.show(this.i - 1); }
    else if (a === 'up' || a === 'down') this.cycleFilter(a === 'down' ? 1 : -1);
    else if (a === 'x') play(this.list[this.i]);
    else if (a === 'a') { const g = this.list[this.i]; if (g) { S.play('select'); go('detail', { game: g, platform: { name: g.platform } }); } }
  },
  frame() {
    const dur = bgVideo.duration && isFinite(bgVideo.duration) ? Math.min(bgVideo.duration, 60) : 60;
    const t = Back.playing ? bgVideo.currentTime : (performance.now() - this.started) / 1000;
    $('#specBar').style.width = Math.min(100, (t / dur) * 100).toFixed(1) + '%';
    if (top() === 'spectator' && performance.now() - this.started > 62000) this.next(); // por si un video no termina
  },
};

// ======================================================================
// Visor: imágenes, video y manual
// ======================================================================
const Viewer = {
  open: false, kind: null, items: [], index: 0, el: $('#viewer'), manual: null,
  show(o) {
    this.open = true; this.kind = o.kind; this.items = o.items || []; this.index = o.index || 0;
    this.el.hidden = false;
    const stage = $('#viewerStage');
    if (o.kind === 'video') {
      bgVideo.pause();
      const v = h('video', { src: o.url, autoplay: '', controls: '', playsinline: '' });
      v.volume = Math.min(1, settings.volume);
      stage.replaceChildren(v); this.video = v;
      $('#viewerCaption').textContent = '';
    } else if (o.kind === 'manual') {
      if (/\.pdf($|\?)/i.test(o.url)) {
        this.manual = new Manual(stage, $('#viewerCaption'));
        this.manual.open(o.url, settings.manualMode);
      } else {
        stage.replaceChildren(h('iframe', { src: o.url, title: 'Manual' }));
        $('#viewerCaption').textContent = 'Manual';
      }
    } else this.paint();
    renderChrome(); updateAudio();
  },
  paint() {
    const it = this.items[this.index];
    $('#viewerStage').replaceChildren(h('img', { src: it.url, alt: it.label }));
    $('#viewerCaption').textContent = `${it.label} · ${this.index + 1} / ${this.items.length}`;
  },
  close() {
    this.open = false; this.el.hidden = true;
    this.manual?.close(); this.manual = null;
    $('#viewerStage').replaceChildren(); this.video = null;
    if (Back.video) bgVideo.play().catch(() => {});
    S.play('back'); renderChrome(); updateAudio();
  },
  action(a) {
    if (a === 'b') return this.close();
    if (this.kind === 'images') {
      if (a === 'left' || a === 'right' || a === 'lb' || a === 'rb') {
        const d = a === 'left' || a === 'lb' ? -1 : 1;
        this.index = (this.index + d + this.items.length) % this.items.length; S.play('move', this.index); this.paint();
      }
    } else if (this.kind === 'video' && this.video) {
      if (a === 'a') this.video.paused ? this.video.play() : this.video.pause();
      if (a === 'left') this.video.currentTime -= 10;
      if (a === 'right') this.video.currentTime += 10;
    } else if (this.kind === 'manual' && this.manual) {
      const M = this.manual;
      if (['left', 'right', 'lb', 'rb', 'lt', 'rt'].includes(a)) { if (M.turn(['left', 'lb', 'lt'].includes(a) ? -1 : 1)) S.play('move', M.page); else S.play('error'); }
      else if (a === 'up' || a === 'down') { if (M.mode === 'ancho') M.scroll((a === 'up' ? -1 : 1) * 8 * rem()); else if (M.turn(a === 'up' ? -1 : 1)) S.play('move', M.page); }
      else if (a === 'a' || a === 'y') { settings.manualMode = M.cycleMode(); saveSettings(); S.play('toggle'); toast(MANUAL_MODES[M.mode]); }
    }
  },
};
onFrame(dt => { if (Viewer.open && Viewer.manual) Viewer.manual.frame(dt); });
$('#viewer').addEventListener('click', e => {
  if (e.target.tagName === 'VIDEO' || e.target.closest('.pdf-scroll')) return;
  const d = e.clientX < innerWidth / 2 ? 'left' : 'right';
  if (Viewer.kind === 'images' || Viewer.kind === 'manual') Viewer.action(d);
});
addEventListener('resize', () => { if (Viewer.manual) Viewer.manual.render(); });

// ======================================================================
// Jugar: lanza con el emulador de LaunchBox y espera a que termines
// ======================================================================
const Playing = {
  active: false, game: null, timer: null, el: $('#playing'),
  async launch(game, app) {
    if (!game || this.active) return;
    S.play('launch');
    let r;
    try { r = await (await fetch('/api/launch', { method: 'POST', body: JSON.stringify({ id: game.id, app: app?.id }) })).json(); }
    catch { toast('No pude hablar con Pandora'); return; }
    if (!r.ok) { S.play('error'); toast(r.error || 'No se pudo abrir el juego'); return; }
    this.active = true; this.game = game; this.since = Date.now(); this.untracked = false;
    const m = game.media;
    $('#playArt').src = m.box3d?.[0] || m.box?.[0] || m.cart?.[0] || '';
    $('#playArt').hidden = !$('#playArt').getAttribute('src');
    $('#playLogo').replaceChildren(m.logo ? h('img', { src: m.logo[0], alt: game.title }) : h('h1', { text: game.title }));
    $('#playBg').style.backgroundImage = m.fanart?.[0] ? `url("${m.fanart[0]}")` : '';
    $('#playVia').textContent = `${app ? app.name + ' · ' : ''}con ${r.via}`;
    $('#playMsg').textContent = 'Abriendo…';
    $('#playHint').replaceChildren('Para salir del juego: ', glyph('exitcombo'), ' · ' + exitCombo().text);
    this.el.hidden = false; requestAnimationFrame(() => this.el.classList.add('on'));
    music.pause(); bgVideo.pause(); updateAudio(); renderChrome();
    clearInterval(this.timer);
    this.timer = setInterval(() => this.poll(), 1000);
  },
  async poll() {
    let st;
    try { st = await (await fetch('/api/status')).json(); } catch { return; }
    const secs = Math.round((Date.now() - this.since) / 1000);
    if (st.running) {
      this.untracked = !st.running.tracked;
      $('#playMsg').textContent = this.untracked ? 'Se abrió con Windows. Cuando termines, regresa y presiona A.' : `Jugando · ${fmtClock(secs)}`;
      $('#playClose').textContent = this.untracked ? 'Ya terminé' : 'Cerrar juego';
      return;
    }
    this.end(st.last);
  },
  end(last) {
    clearInterval(this.timer);
    this.active = false; this.el.classList.remove('on');
    setTimeout(() => { if (!this.active) this.el.hidden = true; }, 600);
    const g = this.game;
    if (last?.error) toast(last.error);
    else if (last && last.id === g.id && last.seconds > 5) {
      g.playCount = (g.playCount || 0) + 1; g.playTime = (g.playTime || 0) + last.seconds;
      g.lastPlayed = new Date().toISOString().slice(0, 10);
      toast(`Jugaste ${fmtTime(last.seconds)}`);
      if (top() === 'detail' && screens.detail.game === g) screens.detail.enter(screens.detail.params);
    }
    if (Back.video) bgVideo.play().catch(() => {});
    lastInput = performance.now();
    updateAudio(); renderChrome();
  },
  close() { fetch('/api/close', { method: 'POST', body: '{}' }).then(() => this.poll()).catch(() => {}); },
  action(a) { if (a === 'a' && this.untracked) this.close(); },
};
$('#playClose').addEventListener('click', () => Playing.close());
document.addEventListener('visibilitychange', () => { if (!document.hidden && Playing.active) Playing.poll(); });
function fmtClock(s) { const m = Math.floor(s / 60), x = s % 60; return `${m}:${String(x).padStart(2, '0')}`; }

// Elegir versión (regiones u otras variantes que LaunchBox guarda como aplicaciones adicionales).
const Picker = {
  open: false, i: 0, rows: [], el: $('#picker'),
  show(game) {
    this.game = game;
    this.rows = [{ name: 'Versión principal', app: null }, ...game.apps.map(a => ({ name: a.name, app: a }))];
    this.i = 0; this.open = true; this.el.hidden = false; this.paint(); S.play('open'); renderChrome();
  },
  paint() {
    $('#pickTitle').textContent = this.game.title;
    $('#pickRows').replaceChildren(...this.rows.map((r, i) => {
      const el = h('div', { class: 'mrow' + (i === this.i ? ' focus' : '') }, h('span', { text: r.name }));
      el.addEventListener('click', () => { this.i = i; this.pick(); });
      return el;
    }));
    $('#pickRows').children[this.i]?.scrollIntoView({ block: 'nearest' });
  },
  close() { this.open = false; this.el.hidden = true; S.play('back'); renderChrome(); },
  pick() { const r = this.rows[this.i]; this.open = false; this.el.hidden = true; renderChrome(); play(this.game, r.app); },
  action(a) {
    if (a === 'b') return this.close();
    if (a === 'up' || a === 'down') { const n = clamp(this.i + (a === 'up' ? -1 : 1), 0, this.rows.length - 1); if (n !== this.i) { this.i = n; S.play('move', n); this.paint(); } }
    if (a === 'a' || a === 'x') this.pick();
  },
};

// ======================================================================
// Teclado en pantalla (para el control; con el dedo también se puede tocar)
// ======================================================================
const KB_ROWS = [
  '1234567890'.split(''),
  'qwertyuiop'.split(''),
  'asdfghjklñ'.split(''),
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', '-', ':', '&'],
  [{ k: ' ', label: 'Espacio', w: 4 }, { k: 'del', label: 'Borrar', w: 3 }, { k: 'done', label: 'Listo', w: 3 }],
];
const Keyboard = {
  open: false, el: $('#kbd'), r: 1, u: 0, value: '', owner: null,
  build() {
    this.keys = KB_ROWS.map((row, r) => { let u = 0; return row.map(k => { const o = typeof k === 'string' ? { k, label: k.toUpperCase() } : { ...k }; o.w ||= 1; o.u = u; o.r = r; u += o.w; return o; }); });
    const grid = h('div', { class: 'kbd-grid' });
    for (const o of this.keys.flat()) {
      o.el = h('button', { class: 'key' + (o.w > 1 ? ' wide' : '') + (o.k === 'done' ? ' done' : ''), style: `grid-column: ${o.u + 1} / span ${o.w}; grid-row: ${o.r + 1}`, text: o.label });
      o.el.addEventListener('click', () => { this.r = o.r; this.u = o.u; this.press(o); this.paint(); });
      grid.append(o.el);
    }
    this.el.replaceChildren(grid);
  },
  get key() { return this.keys[this.r].find(o => this.u >= o.u && this.u < o.u + o.w) || this.keys[this.r][0]; },
  show({ value, input, onChange, onClose }) {
    if (!this.keys) this.build();
    this.value = value || ''; this.onChange = onChange; this.onClose = onClose; this.input = input; this.owner = top();
    this.open = true; this.el.hidden = false; requestAnimationFrame(() => this.el.classList.add('on'));
    document.body.classList.add('typing');
    setTextSink(e => this.type(e));
    // Con pantalla táctil también se puede usar el teclado de Windows sobre el cuadro de búsqueda.
    if (getInputMode() === 'touch' && input) input.focus();
    this.paint(); renderChrome();
  },
  setValue(v) { this.value = v; this.onChange?.(v); },
  type(e) {
    if (e.enter) return this.close();
    if (e.del) { if (!this.value) return S.play('error'); this.setValue(this.value.slice(0, -1)); }
    else if (e.ch) { if (this.value.length >= 40) return S.play('error'); this.setValue(this.value + e.ch); }
    S.play('move', this.value.length);
  },
  press(o) {
    if (o.k === 'done') return this.close();
    if (o.k === 'del') return this.type({ del: true });
    this.type({ ch: o.k });
  },
  paint() { for (const o of this.keys.flat()) o.el.classList.toggle('focus', o === this.key); },
  move(a) {
    const row = this.keys[this.r], k = this.key, i = row.indexOf(k);
    if (a === 'left' || a === 'right') {
      const n = row[clamp(i + (a === 'left' ? -1 : 1), 0, row.length - 1)];
      if (n === k) return S.play('error');
      this.u = n.u;
    } else {
      const r = clamp(this.r + (a === 'up' ? -1 : 1), 0, this.keys.length - 1);
      if (r === this.r) return S.play('error');
      this.r = r;
    }
    S.play('move'); this.paint();
  },
  close() {
    if (!this.open) return;
    this.open = false; this.el.classList.remove('on'); document.body.classList.remove('typing');
    setTimeout(() => { if (!this.open) this.el.hidden = true; }, 300);
    setTextSink(null); this.input?.blur();
    S.play('back'); this.onClose?.(); renderChrome();
  },
  action(a) {
    if (['left', 'right', 'up', 'down'].includes(a)) this.move(a);
    else if (a === 'a') { this.press(this.key); this.paint(); }
    else if (a === 'x') this.type({ del: true });
    else if (a === 'y') this.type({ ch: ' ' });
    else if (a === 'b' || a === 'menu') this.close();
  },
};
$('#searchInput').addEventListener('input', e => { if (Keyboard.open) Keyboard.setValue(e.target.value); else screens.shelf.setQuery(e.target.value); });
$('#searchBar').addEventListener('click', () => { if (!Keyboard.open) screens.shelf.openSearch(); });

// ======================================================================
// Elegir la combinación que cierra un juego: se presiona en el control y ya.
// La interfaz deja de responder al control mientras tanto, para que nada se active por accidente.
// ======================================================================
const BTN_ORDER = ['lb', 'rb', 'lt', 'rt', 'ls', 'rs', 'view', 'menu', 'a', 'b', 'x', 'y', 'up', 'down', 'left', 'right'];
const Capture = {
  open: false, el: $('#capture'),
  show() {
    this.open = true; this.armed = false; this.key = null; this.started = performance.now(); this.idle = this.started;
    this.el.hidden = false; requestAnimationFrame(() => this.el.classList.add('on'));
    this.paint([], 0);
    setCapture((set, now) => this.feed(set, now));
    S.play('open'); renderChrome();
  },
  feed(set, now) {
    if (set === null) return this.done(null);
    const list = BTN_ORDER.filter(b => set.has(b));
    if (!this.armed) { if (!list.length) this.armed = true; else return; } // primero hay que soltar el botón con el que entraste
    if (list.length) this.idle = now;
    if (now - this.idle > 12000) return this.done(null);
    if (list.length >= 2 && list.length <= 4) {
      const k = list.join('+');
      if (k !== this.key) { this.key = k; this.since = now; S.play('move', list.length); }
      const p = Math.min(1, (now - this.since) / 2000);
      this.paint(list, p);
      if (p >= 1) this.done(list);
    } else { this.key = null; this.paint(list, 0); }
  },
  paint(list, p) {
    $('#capCombo').replaceChildren(...(list.length ? comboGlyphs(list) : [h('span', { class: 'cap-wait', text: 'Esperando…' })]));
    $('#capBar').style.width = (p * 100).toFixed(1) + '%';
    const risky = list.length >= 2 && !list.some(b => ['ls', 'rs', 'view', 'menu'].includes(b));
    $('#capNote').textContent = list.length === 1 ? 'Agrega al menos otro botón' : list.length > 4 ? 'Máximo 4 botones' :
      risky ? 'Ojo: esos botones se usan mucho dentro de los juegos' : list.length ? 'Sigue sosteniendo…' : 'Se cancela solo si no presionas nada en 12 s';
  },
  done(list) {
    setCapture(null);
    this.open = false; this.el.classList.remove('on');
    setTimeout(() => { if (!this.open) this.el.hidden = true; }, 300);
    if (list) { settings.exitCombo = list; settings.exitFromLaunchBox = false; saveSettings(); S.play('select'); toast('Para cerrar un juego: ' + comboText(list)); }
    else S.play('back');
    if (Menu.open) Menu.paint();
    renderChrome();
  },
};
$('#capCancel').addEventListener('click', () => { if (Capture.open) Capture.done(null); });

// ======================================================================
// Ajustes (el menú abre primero lo de la vista en la que estás)
// ======================================================================
const NUM = { cinemaDelay: 1, spectatorIdle: 1, exitHold: 1 };
const Menu = {
  open: false, rows: [], i: 0, x: new Spring(1, { response: 0.32, damping: 1 }), el: $('#menu'),
  // Pestañas: cada una agrupa ajustes del mismo tipo; LB/RB cambia de pestaña. Cada fila trae una ayuda corta.
  build() {
    const opt = (id, label, options, help) => ({ id, label, options, help });
    const rng = (id, label, help) => ({ id, label, range: true, help });
    const yes = (id, label, help) => ({ id, label, bool: true, help });
    const act = (id, label, help, extra = {}) => ({ id, label, act: true, help, ...extra });
    const t = top();
    const lbMode = settings.exitFromLaunchBox !== false && lbExit;
    const themes = Object.fromEntries(Object.entries(THEMES).sort((a, b) => a[1].label.localeCompare(b[1].label, 'es', { numeric: true })).map(([k, x]) => [k, x.label]));
    const shelfRows = [
      opt('shelfLayout', 'Acomodo de la lista', SHELF_LAYOUTS, '«Del tema» usa el diseño propio del tema. Las demás opciones sirven en cualquier tema.'),
      opt('imageType', 'Imagen de cada juego', Object.fromEntries(IMAGE_TYPES.map(x => [x.id, x.label])), 'Qué imagen de LaunchBox se usa en la lista: caja, caja 3D, cartucho, captura…'),
      yes('favFirst', 'Favoritos primero', 'Pone tus favoritos al principio de cada lista.'),
    ];
    const detailRows = [opt('detailLayout', 'Acomodo de la ficha', DETAIL_LAYOUTS, '«Del tema» usa la ficha propia del tema. Las demás opciones sirven en cualquier tema.')];
    this.tabs = [
      ...(t === 'shelf' ? [{ name: 'Esta lista', rows: shelfRows }] : t === 'detail' ? [{ name: 'Esta ficha', rows: detailRows }] : []),
      { name: 'Apariencia', rows: [
        opt('theme', 'Tema', { aleatorio: 'Aleatorio', ...themes }, 'Cambia todo el aspecto de Pandora. A abre la lista completa. «Aleatorio» cambia de tema cada vez que abres Pandora.'),
        ...(settings.themeRandom ? [
          { sec: 'Temas que pueden salir' },
          act('rndAll', 'Marcar todos', 'Activa todos los temas para el aleatorio.'),
          ...Object.entries(themes).map(([k, l]) => yes('rnd.' + k, l, 'Si está activado, este tema puede salir al abrir Pandora. Debe quedar al menos uno.')),
          { sec: 'Más opciones' },
        ] : []),
        opt('buttonStyle', 'Botones en pantalla', { auto: 'Según el tema', ...Object.fromEntries(Object.entries(BUTTON_STYLES).map(([k, x]) => [k, x.label])) }, 'Cómo se dibujan los botones en las ayudas de abajo.'),
        ...(t === 'shelf' ? [] : shelfRows.slice(0, 2)),
        ...(t === 'detail' ? [] : detailRows),
      ] },
      { name: 'Sonido', rows: [
        rng('volume', 'Volumen general', 'Volumen de todo lo que suena en Pandora.'),
        opt('audioMode', 'Audio de fondo', AUDIO_MODES, 'Qué suena mientras navegas: el audio del video del juego, su música o un ambiente tranquilo.'),
        rng('ambient', 'Volumen del ambiente', 'Solo se oye si el audio de fondo es «Ambiente».'),
        opt('soundTheme', 'Efectos de sonido', { auto: 'Según el tema', ...Object.fromEntries(Object.entries(themes).map(([k, l]) => [THEME_SOUND[k], l]).filter(([k]) => k)), ...S.extras() }, 'Los sonidos al moverte y elegir. Cambian solos con el tema.'),
      ] },
      { name: 'Videos', rows: [
        yes('autoVideo', 'Reproducir videos', 'Muestra el video del juego o consola cuando te detienes en él.'),
        opt('cinemaDelay', 'Modo cine', { 0: 'Nunca', 2: 'A los 2 s', 3: 'A los 3 s', 5: 'A los 5 s', 8: 'A los 8 s', 15: 'A los 15 s', 30: 'A los 30 s' }, 'Si no tocas nada, oculta los textos y deja el video a pantalla completa.'),
        opt('spectatorIdle', 'Modo espectador', { 0: 'Nunca', 3: 'A los 3 min', 5: 'A los 5 min', 10: 'A los 10 min' }, 'En el inicio, si no tocas nada, pasa videos de tu colección uno tras otro.'),
      ] },
      { name: 'Inicio', rows: [
        { sec: 'Secciones visibles' },
        yes('sections.all', 'Todo (lista completa)', 'Una sección con todos tus juegos juntos.'),
        ...library.categories.map(c => yes('sections.' + c.name, c.label, 'Muestra u oculta esta sección en el inicio.')),
        ...Object.entries(COLLECTIONS).filter(([k]) => (library[k] || []).length).map(([k, c]) => yes('sections.' + k, c.label, 'Muestra u oculta esta sección en el inicio.')),
      ] },
      { name: 'Listas', rows: [
        yes('search', 'Búsqueda con teclado', 'Con Y se abre un teclado para buscar por nombre.'),
        yes('letterBar', 'Barra de letras', 'La barra con el abecedario a la derecha; LT y RT saltan de letra.'),
        { sec: 'Datos que se muestran' },
        ...Object.entries(FIELDS).map(([k, label]) => yes('fields.' + k, label, 'Muestra u oculta este dato en las listas y en la ficha.')),
      ] },
      { name: 'Control', rows: [
        ...(lbExit ? [yes('exitFromLaunchBox', 'Usar el atajo de LaunchBox', 'Cierra los juegos con la misma combinación que tienes en LaunchBox.')] : []),
        act('exitCombo', lbMode ? 'Atajo para cerrar un juego' : 'Combinación para cerrar un juego',
          lbMode ? 'Es el atajo de LaunchBox. Para usar uno propio, desactiva la opción de arriba.' : 'A para grabar una nueva: sostén los botones hasta que se llene la barra.', { show: () => comboText(exitCombo().list) }),
        ...(lbMode ? [] : [opt('exitHold', 'Sostenerla durante', { 0: 'Al instante', 0.5: '0,5 s', 1: '1 s', 1.5: '1,5 s', 2: '2 s', 3: '3 s' }, 'Cuánto tiempo hay que sostener la combinación para cerrar.')]),
      ] },
      { name: 'Biblioteca', rows: [
        act('lbPath', 'Carpeta de LaunchBox', 'De aquí lee Pandora tus juegos. Nunca modifica nada de LaunchBox.', { show: () => library.path || 'Sin elegir' }),
        act('reload', 'Volver a leer LaunchBox', 'Úsalo si agregaste juegos o imágenes en LaunchBox con Pandora abierta.'),
        yes('devLogos', 'Logos de desarrolladoras', 'Los busca en internet (Wikidata y Wikipedia) y los guarda en datos\\logos.'),
        act('retryLogos', 'Buscar logos que faltan', 'Vuelve a buscar los logos que no se encontraron.'),
        { sec: 'Borrar datos de Pandora' },
        act('reset:favoritos', 'Borrar favoritos', 'Pide confirmar. LaunchBox no se toca.', { danger: true }),
        act('reset:estadisticas', 'Borrar partidas y tiempo jugado', 'Pide confirmar. LaunchBox no se toca.', { danger: true }),
        act('reset:logos', 'Borrar logos descargados', 'Pide confirmar. Se pueden volver a descargar.', { danger: true }),
        act('reset:ajustes', 'Restablecer ajustes', 'Pide confirmar. Vuelve todo esto a como venía.', { danger: true }),
        act('reset:todo', 'Dejar Pandora como nueva', 'Pide confirmar. Borra favoritos, estadísticas, logos, ajustes y la carpeta elegida.', { danger: true }),
        ...(window.pandora?.app ? [{ sec: 'Pandora’s Box' }, act('quit', 'Salir de Pandora’s Box', 'Cierra la aplicación.')] : []),
      ] },
    ];
    const want = t === 'shelf' || t === 'detail' ? 0 : this.tabs.findIndex(x => x.name === this.lastTab);
    this.setTab(want >= 0 ? want : 0);
  },
  setTab(ti) {
    this.ti = clamp(ti, 0, this.tabs.length - 1);
    this.rows = this.tabs[this.ti].rows;
    this.i = Math.max(0, this.rows.findIndex(r => !r.sec));
    if (top() !== 'shelf' && top() !== 'detail') this.lastTab = this.tabs[this.ti].name;
  },
  get(id) { if (id.startsWith('rnd.')) return randomPool().includes(id.slice(4)); return id.startsWith('fields.') ? settings.fields[id.slice(7)] : id.startsWith('sections.') ? secOn(id.slice(9)) : settings[id]; },
  setv(id, v) {
    if (id.startsWith('rnd.')) {
      const k = id.slice(4), pool = randomPool().filter(x => x !== k);
      if (v) pool.push(k); else if (!pool.length) { S.play('error'); toast('Debe quedar al menos un tema'); return; }
      settings.randomPool = pool; return;
    }
    if (id.startsWith('fields.')) settings.fields[id.slice(7)] = v;
    else if (id.startsWith('sections.')) settings.sections = { ...settings.sections, [id.slice(9)]: v };
    else settings[id] = NUM[id] ? Number(v) : v;
  },
  value(r) {
    if (r.show) return r.show();
    if (r.id === 'theme' && !this.pendingTheme && settings.themeRandom) return 'Aleatorio · hoy ' + THEMES[settings.theme].label;
    const v = r.id === 'theme' && this.pendingTheme ? this.pendingTheme : this.get(r.id);
    if (r.options) return r.options[v] ?? v;
    if (r.range) return Math.round(v * 100) + '%';
    if (r.bool) return v ? 'Sí' : 'No';
    return '';
  },
  paint() {
    if (this.list) {
      const L = this.list;
      $('#menuRows').replaceChildren(h('div', { class: 'mrow sec', text: L.row.label }), ...L.keys.map((k, i) => {
        const el = h('div', { class: 'mrow choice' + (i === L.i ? ' focus' : '') }, h('span', { text: L.row.options[k] }),
          h('span', { class: 'val', text: String(L.row.id === 'theme' ? this.curTheme() : this.get(L.row.id)) === k ? '✓' : '' }));
        el.addEventListener('click', () => { L.i = i; this.closeList(true); });
        return el;
      }));
      $('#menuRows').children[L.i + 1]?.scrollIntoView({ block: 'nearest' });
      return;
    }
    $('#menuTabs').replaceChildren(...this.tabs.map((tb, i) => {
      const el = h('button', { class: 'mtab' + (i === this.ti ? ' on' : ''), text: tb.name });
      el.addEventListener('click', () => { this.setTab(i); S.play('rotate'); this.paint(); renderChrome(); });
      return el;
    }));
    $('#menuTabs').querySelector('.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    $('#menuRows').replaceChildren(...this.rows.map((r, i) => r.sec
      ? h('div', { class: 'mrow sec', text: r.sec })
      : (() => {
          const val = r.bool ? h('span', { class: 'val sw' + (this.get(r.id) ? ' on' : '') }, h('i')) : h('span', { class: 'val' + (r.act ? ' go' : '') + (r.danger ? ' danger' : ''), text: this.value(r) });
          const el = h('div', { class: 'mrow' + (i === this.i ? ' focus' : '') + (r.danger ? ' danger' : '') + (r.bool ? ' is-bool' : r.act ? ' is-act' : ' is-opt') }, h('span', { class: 'lbl', text: r.label }), val);
          el.addEventListener('click', () => { this.i = i; this.change(1, true); }); return el; })()));
    $('#menuRows').children[this.i]?.scrollIntoView({ block: 'nearest' });
    $('#menuHelp').textContent = this.confirm === this.rows[this.i]?.id ? 'Presiona A otra vez para confirmar.' : this.rows[this.i]?.help || '';
  },
  show() { this.list = null; this.build(); this.open = true; this.el.hidden = false; this.x.set(0); this.paint(); S.play('open'); renderChrome(); },
  close() { this.open = false; this.x.set(1); S.play('back'); renderChrome(); },
  change(d, viaA) {
    const r = this.rows[this.i];
    if (r.act) { if (viaA) this.runAct(r); return; }
    // A sobre una opción con varias elecciones abre la lista completa; izquierda/derecha sigue pasando una por una.
    if (viaA && r.options && Object.keys(r.options).length > 2) return this.openList();
    if (r.id === 'theme') return this.pickTheme(this.nextKey(r, this.curTheme(), d));
    if (r.bool) this.setv(r.id, !this.get(r.id));
    else if (r.range) this.setv(r.id, Math.round(clamp(this.get(r.id) + d * 0.1, 0, 1) * 10) / 10);
    else if (r.options) this.setv(r.id, this.nextKey(r, this.get(r.id), d));
    this.afterChange(r);
  },
  afterChange(r) {
    saveSettings(); applySound(); this.paint(); renderChrome(); updateAudio();
    const t = top();
    if (r.id === 'soundTheme') setTimeout(() => S.preview(), 120); else S.play('toggle');
    if (r.id === 'favFirst' && t === 'shelf') screens.shelf.resort();
    if (r.id === 'exitFromLaunchBox') { const ti = this.ti, i = this.i; this.build(); this.setTab(ti); this.i = i; this.paint(); }
    if (r.id === 'buttonStyle' && t === 'detail') screens.detail.buildActions?.();
    if ((r.id === 'letterBar' || r.id === 'search') && t === 'shelf') { screens.shelf.buildLetters(); screens.shelf.paintLetters(); }
    if (t === 'shelf' && (r.id === 'shelfLayout' || r.id === 'imageType')) screens.shelf.refreshLayout();
    if (t === 'detail' && r.id === 'detailLayout') screens.detail.enter(screens.detail.params);
    if (r.id.startsWith('fields.')) refreshCurrent();
    if (r.id.startsWith('sections.')) rebuildHome();
  },
  // Acciones del menú. Las que borran algo piden una segunda confirmación con A.
  async runAct(r) {
    if (r.id === 'quit') return window.pandora.quit();
    if (r.id === 'rndAll') { settings.randomPool = Object.keys(THEMES); saveSettings(); S.play('toggle'); return this.paint(); }
    if (r.id === 'exitCombo') return Capture.show();
    if (r.id === 'reload') return reloadLibrary();
    if (r.id === 'lbPath') { this.close(); return Setup.show(false); }
    if (r.id === 'retryLogos') { await fetch('/api/devlogos?retry=1'); toast('Buscando logos de desarrolladoras…'); DevLogos.watch(); return; }
    if (r.danger) {
      if (this.confirm !== r.id) { this.confirm = r.id; S.play('error'); toast('¿Seguro? Presiona A otra vez para borrar'); this.paint(); clearTimeout(this.ct); this.ct = setTimeout(() => { this.confirm = null; if (this.open) this.paint(); }, 4000); return; }
      this.confirm = null;
      const what = r.id.slice(6), all = ['favoritos', 'estadisticas', 'logos', 'ajustes', 'registro', 'carpeta', 'navegador'];
      await fetch('/api/reset', { method: 'POST', body: JSON.stringify({ what: what === 'todo' ? all : [what] }) });
      S.play('select');
      if (what === 'ajustes' || what === 'todo') { toast('Listo. Reiniciando…'); clearTimeout(saveTimer); setTimeout(() => location.reload(), 700); return; }
      toast('Listo: ' + r.label.toLowerCase().replace(/^borrar /, '') + ' borrado');
      if (what === 'favoritos' || what === 'estadisticas') { gamesCache.clear(); }
    }
  },
  hints() {
    if (this.list) return [['ud', 'Elegir'], ['a', 'Aplicar'], ['b', 'Volver']];
    const r = this.rows[this.i] || {}, tabs = ['lbrb', 'Pestaña'];
    if (r.act) return [['ud', 'Moverse'], tabs, ['a', r.id === 'exitCombo' ? 'Grabar' : r.danger ? 'Borrar' : 'Abrir'], ['b', 'Cerrar']];
    if (r.bool) return [['ud', 'Moverse'], tabs, ['a', 'Activar o quitar'], ['b', 'Cerrar']];
    if (r.options && Object.keys(r.options).length > 2) return [['ud', 'Moverse'], tabs, ['lr', 'Cambiar'], ['a', 'Ver todas'], ['b', 'Cerrar']];
    return [['ud', 'Moverse'], tabs, ['lr', 'Cambiar'], ['b', 'Cerrar']];
  },
  nextKey(r, cur, d) { const k = Object.keys(r.options); return k[(k.indexOf(String(cur)) + d + k.length) % k.length]; },
  // El tema se aplica cuando dejas de moverte (antes cada pulsación recargaba la app y podía congelarla).
  curTheme() { return this.pendingTheme || (settings.themeRandom ? 'aleatorio' : settings.theme); },
  pickTheme(id, now) {
    if (id === 'aleatorio') {
      clearTimeout(this.themeTimer); this.pendingTheme = null;
      if (!settings.themeRandom) { settings.themeRandom = true; saveSettings(); toast('Aleatorio: cada vez que abras Pandora saldrá otro tema'); }
      const ti = this.ti; this.build(); this.setTab(ti); this.paint(); renderChrome(); S.play('toggle'); return;
    }
    if (!THEMES[id]) return;
    if (settings.themeRandom) { settings.themeRandom = false; const ti = this.ti; this.build(); this.setTab(ti); }
    this.pendingTheme = id; this.paint(); S.play('toggle');
    clearTimeout(this.themeTimer);
    const apply = () => {
      if (this.applying) return; this.applying = true;
      settings.theme = id; settings.shelfLayout = 'tema'; settings.detailLayout = 'tema';
      saveLast(); clearTimeout(saveTimer);
      toast('Cambiando a ' + THEMES[id].label + '…');
      fetch('/api/settings', { method: 'POST', body: JSON.stringify(settings) }).finally(() => location.reload());
    };
    if (id === settings.theme) { this.pendingTheme = null; saveSettings(); this.paint(); return; }
    if (now) apply(); else this.themeTimer = setTimeout(apply, 1100);
  },
  openList() {
    const r = this.rows[this.i];
    const keys = Object.keys(r.options), cur = String(r.id === 'theme' ? this.curTheme() : this.get(r.id));
    this.list = { row: r, keys, i: Math.max(0, keys.indexOf(cur)) };
    clearTimeout(this.themeTimer);
    S.play('open'); this.paint(); renderChrome();
  },
  closeList(ok) {
    const L = this.list; if (!L) return;
    this.list = null;
    if (ok) {
      const v = L.keys[L.i];
      if (L.row.id === 'theme') return this.pickTheme(v, true);
      this.setv(L.row.id, v); this.afterChange(L.row);
    } else S.play('back');
    this.paint(); renderChrome();
  },
  listAction(a) {
    const L = this.list;
    if (a === 'b' || a === 'menu') return this.closeList(false);
    if (a === 'a') return this.closeList(true);
    const d = a === 'up' || a === 'left' ? -1 : a === 'down' || a === 'right' ? 1 : a === 'lb' ? -5 : a === 'rb' ? 5 : 0;
    if (!d) return;
    const n = clamp(L.i + d, 0, L.keys.length - 1);
    if (n !== L.i) { L.i = n; S.play('move', n); this.paint(); } else S.play('error');
  },
  action(a) {
    if (this.list) return this.listAction(a);
    if (a === 'b' || a === 'menu') return this.close();
    if (a === 'lb' || a === 'rb') {
      const n = clamp(this.ti + (a === 'lb' ? -1 : 1), 0, this.tabs.length - 1);
      if (n === this.ti) return S.play('error');
      this.confirm = null; this.setTab(n); S.play('rotate'); this.paint(); renderChrome(); return;
    }
    if (a === 'up' || a === 'down') {
      let n = this.i;
      do { n += a === 'up' ? -1 : 1; } while (this.rows[n]?.sec);
      if (this.rows[n]) { this.i = n; S.play('move', n); this.paint(); renderChrome(); }
    } else if (a === 'left') this.change(-1);
    else if (a === 'right') this.change(1);
    else if (a === 'a') this.change(1, true);
  },
};
onFrame(dt => {
  Menu.x.step(dt);
  if (Menu.el.hidden) return;
  Menu.el.style.transform = `translateX(${(Menu.x.x * 36).toFixed(3)}rem)`;
  Menu.el.style.opacity = (1 - Menu.x.x).toFixed(3);
  if (!Menu.open && Menu.x.x > 0.98) Menu.el.hidden = true;
});
function refreshCurrent() {
  const t = stack.at(-1);
  if (t?.id === 'shelf') screens.shelf.info();
  if (t?.id === 'detail') screens.detail.enter(t.params);
}
// El inicio se vuelve a armar cuando cambias lo que muestra.
function rebuildHome() {
  cubeHome.build(); if (homeImpl !== cubeHome) homeImpl.build();
  if (top() === 'home') screens.home.resume();
}
async function reloadLibrary() {
  toast('Leyendo LaunchBox…');
  await fetch('/api/reload');
  library = await (await fetch('/api/library')).json();
  gamesCache.clear();
  cubeHome.build(); if (homeImpl !== cubeHome) homeImpl.build();
  toast(`Listo: ${fmtN(library.total)} juegos`);
}


// ======================================================================
// Bienvenida: elegir la carpeta de LaunchBox (si se comparte la app o no la encuentra)
// ======================================================================
const Setup = {
  open: false, i: 0, rows: [],
  async show(first) {
    const s = await fetch('/api/setup').then(r => r.json()).catch(() => ({ candidates: [] }));
    this.first = first; this.error = '';
    this.rows = [
      ...s.candidates.map(c => ({ label: 'Usar ' + c, sub: 'Encontré una biblioteca de LaunchBox aquí', run: () => this.use(c) })),
      ...(window.pandora?.pickFolder ? [{ label: 'Buscar la carpeta…', sub: 'Abre el explorador para elegirla', run: () => this.pick() }] : []),
      { label: 'Escribir la ruta', sub: 'Por ejemplo D:\\LaunchBox', input: true },
      ...(first ? [] : [{ label: 'Cancelar', run: () => this.close() }]),
    ];
    this.i = 0;
    if (!this.el) {
      this.el = h('div', { class: 'setup' });
      document.body.append(this.el);
    }
    this.open = true; this.el.hidden = false;
    this.paint(); renderChrome();
    requestAnimationFrame(() => this.el.classList.add('on'));
  },
  paint() {
    const card = h('div', { class: 'setup-card' },
      h('div', { class: 'setup-mark' }), h('h2', { text: this.first ? 'Bienvenido a Pandora’s Box' : 'Carpeta de LaunchBox' }),
      h('p', { text: this.first ? 'Pandora’s Box muestra tu biblioteca de LaunchBox sin modificarla. Elige tu carpeta de LaunchBox (la que tiene adentro Data, Images y Videos).' : 'Elige otra carpeta de LaunchBox. Tus favoritos y ajustes de Pandora se conservan.' }),
      h('div', { class: 'setup-rows' }, ...this.rows.map((r, i) => {
        const el = h('div', { class: 'setup-row' + (i === this.i ? ' focus' : '') }, h('b', { text: r.label }), h('span', { text: r.sub || '' }));
        if (r.input) { const inp = h('input', { class: 'setup-input', placeholder: 'D:\\LaunchBox', spellcheck: 'false' }); inp.value = this.typed || ''; inp.addEventListener('input', () => { this.typed = inp.value; }); inp.addEventListener('keydown', e => { if (e.key === 'Enter') this.use(inp.value); }); el.append(inp); }
        el.addEventListener('click', () => { this.i = i; this.activate(); });
        return el;
      })),
      h('p', { class: 'setup-err', text: this.error }));
    this.el.replaceChildren(card);
    const inp = this.el.querySelector('.setup-row.focus .setup-input'); if (inp) inp.focus();
  },
  async pick() { const dir = await window.pandora.pickFolder(); if (dir) this.use(dir); },
  async use(dir) {
    if (!dir) return S.play('error');
    const r = await fetch('/api/setup', { method: 'POST', body: JSON.stringify({ path: dir }) }).then(x => x.json()).catch(e => ({ ok: false, error: e.message }));
    if (!r.ok) { this.error = r.error; S.play('error'); this.paint(); return; }
    S.play('select'); toast(`Listo: ${fmtN(r.total)} juegos`);
    setTimeout(() => location.reload(), 600);
  },
  activate() { const r = this.rows[this.i]; if (!r) return; if (r.input) return this.use(this.typed); S.play('select'); r.run(); },
  close() { this.open = false; this.el.classList.remove('on'); setTimeout(() => { if (!this.open) this.el.hidden = true; }, 300); S.play('back'); renderChrome(); },
  action(a) {
    if (a === 'up' || a === 'down') { const n = clamp(this.i + (a === 'up' ? -1 : 1), 0, this.rows.length - 1); if (n !== this.i) { this.i = n; S.play('move', n); this.paint(); } }
    else if (a === 'a') this.activate();
    else if (a === 'b' && !this.first) this.close();
  },
};

// Logos de desarrolladoras: se descargan en segundo plano; al llegar, se actualiza la lista.
const DevLogos = {
  t: null,
  watch() {
    clearTimeout(this.t);
    this.t = setTimeout(async () => {
      const r = await fetch('/api/devlogos').then(x => x.json()).catch(() => null);
      if (!r || !library) return;
      let changed = false;
      for (const d of library.developers || []) { const u = r.logos[d.label] || null; if (u !== (d.logo || null)) { d.logo = u; changed = true; } }
      if (changed && performance.now() - lastInput > 4000 && top() !== 'home') rebuildHome();
      else if (changed) this.dirty = true;
      if (r.pending > 0) this.watch();
    }, 15000);
  },
};
// ======================================================================
// Entrada global, arranque y regreso a la última vista
// ======================================================================
let started = false;
async function start() {
  if (started) return;
  started = true;
  S.unlock(); applySound();
  $('#boot').classList.add('out');
  setTimeout(() => $('#boot').remove(), 1000);
  S.play('startup');
  try { await restore(); } catch (e) { console.error(e); try { go('home', null, true); } catch {} }
  fetch('/api/log', { method: 'POST', body: JSON.stringify({ msg: `lista en ${Math.round(performance.now())} ms (tema ${settings.theme})` }) }).catch(() => {});
  lastInput = performance.now();
}
let bootLast = null;
async function restore() {
  const L = bootLast || settings.last || {};
  const direct = !!THEMES[settings.theme]?.direct;
  screens.home.restore(L.face);
  go('home', null, true);
  if (L.screen === 'home' || L.screen === 'spectator') return;
  if (L.mode === 'all') {
    if (!secOn('all')) return;
    if (L.game) screens.shelf.memo['Todo'] = L.game;
    go('shelf', allShelf(), true);
    await screens.shelf.ready;
    if (L.screen === 'detail') { const sh = screens.shelf, g = sh.games[sh.idx]; if (g && g.id === L.game) go('detail', { game: g, platform: { name: g.platform } }, true); }
    return;
  }
  const ck = L.mode ? kindOfId(L.mode) : kindOfCat(L.cat);
  if (ck && !secOn(ck)) return;
  const modeCat = ck ? collectionCategory(ck) : null;
  const cats = visibleLibrary().categories;
  const cat = modeCat || (direct ? null : cats.find(c => c.name === L.cat));
  const pool = cat ? cat.platforms : cats.flatMap(c => c.platforms);
  const p = L.mode ? pool.find(x => x.mode === L.mode) : pool.find(x => x.name === L.platform);
  if (cat && !direct) {
    if (p) screens.platforms.memo[cat.name] = cat.platforms.indexOf(p);
    cubeHome.restore({ cat: cat.name, tilt: 0 });
    go('platforms', cat, true);
    if (L.screen === 'platforms') return;
  }
  if (!p) return;
  if (L.game) screens.shelf.memo[p.name] = L.game;
  go('shelf', p, true);
  await screens.shelf.ready;
  if (L.screen === 'detail') {
    const sh = screens.shelf, g = sh.games[sh.idx];
    if (g && g.id === L.game) go('detail', { game: g, platform: p.mode ? { name: g.platform } : p }, true);
  }
}
onAction(a => {
  if (!S.running()) { S.unlock(); applySound(); }
  if (!started) { if (library) start(); return; }
  const swallowed = poke() && top() !== 'spectator';
  if (swallowed) return;
  if (Capture.open) return;
  if (Setup.open) return Setup.action(a);
  if (Playing.active) return Playing.action(a);
  if (Keyboard.open) return Keyboard.action(a);
  if (Picker.open) return Picker.action(a);
  if (Viewer.open) return Viewer.action(a);
  if (Menu.open) return Menu.action(a);
  if (a === 'menu') return Menu.show();
  if (a === 'b') { if (top() === 'home' && homeImpl.back?.()) return; if (top() !== 'home' && screens[top()].back?.()) return; back(); return; }
  if (a === 'view') { cycleAudio(); return; }
  screens[top()].action(a);
  if (top() === 'home') renderChrome(); // las pistas del inicio cambian según la zona del tema
});
$('#boot').addEventListener('pointerdown', () => { if (library) start(); });
$('#backBtn').addEventListener('click', () => { if (Picker.open) Picker.close(); else if (Viewer.open) Viewer.close(); else if (Menu.open) Menu.close(); else back(); });

for (const id in screens) { vis[id] = new Spring(0, { response: 0.45, damping: 1 }); side[id] = -1; }

(async function init() {
  try {
    const [s, lib] = await Promise.all([
      fetch('/api/settings').then(r => r.json()).catch(() => ({})),
      fetch('/api/library').then(r => r.json()),
    ]);
    settings = { ...DEFAULTS, ...s, fields: { ...DEFAULTS.fields, ...(s.fields || {}) } };
    bootLast = settings.last; // se guarda antes de que el inicio se dibuje y la sobrescriba
    // Las vistas «Del tema» llegan como predeterminadas una sola vez; después se respeta lo que elijas.
    if (!s.viewsTema) { settings.shelfLayout = 'tema'; settings.detailLayout = 'tema'; settings.viewsTema = 1; saveSettings(); }
    if (s.soundTheme === 'cubo' && !s.soundAuto) { settings.soundTheme = 'auto'; settings.soundAuto = true; }
    fetch('/api/soundpacks').then(r => r.json()).then(d => { S.registerPacks(d.packs || []); applySound(); }).catch(() => {});
    library = lib;
    // Sin LaunchBox (primera vez o app compartida): se muestra la bienvenida para elegir la carpeta.
    if (lib.empty) { $('#boot').remove(); started = true; applySound(); S.unlock(); Setup.show(true); return; }
    pickRandomTheme();
    await applyTheme();
    cubeHome.build();
    if (homeImpl !== cubeHome) homeImpl.build();
    cubeHome.initDrag(); screens.platforms.initDrag(); screens.shelf.initDrag();
    applySound(); renderChrome();
    // Arranca solo en cuanto termina la animación de inicio.
    setTimeout(() => start(), 2300);
    DevLogos.watch();
  } catch (e) {
    $('#bootHint').hidden = false;
    $('#bootHint').textContent = 'No pude leer la biblioteca de LaunchBox.';
    setTimeout(() => Setup.show(true), 800);
    console.error(e);
  }
})();

// Cuando Pandora no está al frente (minimizada, en segundo plano o con un juego abierto), se pausan
// los videos, la música y el sonido para no gastar memoria ni procesador; al volver, se reanuda todo.
const Away = {
  on: false, paused: [],
  set(away) {
    if (away === this.on) return;
    this.on = away;
    if (away) {
      this.paused = [...document.querySelectorAll('video, audio')].filter(m => !m.paused);
      this.paused.forEach(m => m.pause());
      S.sleep(true);
    } else {
      S.sleep(false);
      this.paused.forEach(m => { if (m.isConnected && m.src) m.play().catch(() => {}); });
      this.paused = [];
      updateAudio();
    }
  },
};
document.addEventListener('visibilitychange', () => Away.set(document.hidden));
// Si algo intenta reproducir mientras Pandora está en segundo plano (un video que esperaba su turno), se detiene.
document.addEventListener('play', e => { if (Away.on) { e.target.pause(); if (!Away.paused.includes(e.target)) Away.paused.push(e.target); } }, true);
window.pandora?.onFront?.(on => Away.set(!on));

// Videos propios de los temas (la tele, el canal, la demo…): siguen la opción «Audio de fondo».
// Con «Sonido del video» se oyen y callan la música y el ambiente; con otra opción van en silencio.
const homeVideos = () => [...document.querySelectorAll('#homeTheme video')];
function syncHomeVideos() {
  const snd = settings.audioMode === 'video' && top() === 'home';
  let audible = false;
  for (const v of homeVideos()) {
    v.muted = !snd; v.volume = Math.min(1, settings.volume);
    if (!v.paused && snd && v.style.opacity !== '0' && v.isConnected) audible = true;
  }
  if (audible !== homeAudible) { homeAudible = audible; updateAudio(); }
}
for (const ev of ['play', 'playing', 'pause', 'ended', 'emptied']) {
  document.addEventListener(ev, e => { if (e.target.closest?.('#homeTheme')) setTimeout(syncHomeVideos, 0); }, true);
}

// Partículas: polvo luminoso que flota despacio.
(function particles() {
  const cv = $('#particles'), g = cv.getContext('2d');
  let W, H, P = [];
  const resize = () => {
    W = cv.width = innerWidth * devicePixelRatio; H = cv.height = innerHeight * devicePixelRatio;
    P = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.8 + 0.4) * devicePixelRatio,
      v: (Math.random() * 6 + 3) * devicePixelRatio, a: Math.random() * 0.45 + 0.08, p: Math.random() * 6.28 }));
  };
  resize(); addEventListener('resize', resize);
  onFrame((dt, now) => {
    if (cine) return;
    g.clearRect(0, 0, W, H);
    for (const p of P) {
      if (!reducedMotion.matches) { p.y -= p.v * dt; p.x += Math.sin(now / 4000 + p.p) * 0.08 * devicePixelRatio; }
      if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      g.globalAlpha = p.a * (0.7 + 0.3 * Math.sin(now / 1700 + p.p));
      g.fillStyle = particleColor;
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
    }
  });
})();
