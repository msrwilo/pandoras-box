// Pandora — interfaz para LaunchBox. Servidor local sin dependencias.
// Corre dentro de Pandora.exe (Electron) o solo con «node server.js».
// Lee la carpeta Data de LaunchBox (solo lectura) y sirve la interfaz y los medios.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const meta = require('./lib/meta');
const createLauncher = require('./lib/launch');
const createLogos = require('./lib/logos');

const APP_DIR = __dirname;
// Datos propios de Pandora (no se tocan los XML de LaunchBox). Dentro de la app viven junto a Pandora.exe.
const DATA_DIR = process.env.PANDORA_DATA || path.join(APP_DIR, 'datos');
// Dónde está LaunchBox: lo que elegiste en Pandora (datos/config.json) manda; si no, el config.json de la app.
const USER_CFG = path.join(DATA_DIR, 'config.json');
const cfg = Object.assign({ launchboxPath: '', port: 7777 }, readJSON(path.join(APP_DIR, 'config.json'), {}), readJSON(USER_CFG, {}));
if (process.env.LB_PATH) cfg.launchboxPath = process.env.LB_PATH;
if (process.env.PORT) cfg.port = +process.env.PORT;
let LB = cfg.launchboxPath ? path.resolve(cfg.launchboxPath) : '';
const isLaunchBox = dir => { try { return !!dir && fs.existsSync(path.join(dir, 'Data', 'Platforms.xml')); } catch { return false; } };
// Lugares donde suele estar LaunchBox, para sugerirlos si Pandora no lo encuentra.
function findLaunchBox() {
  const out = new Set(), home = require('os').homedir();
  const tries = [path.join(home, 'LaunchBox'), path.join(home, 'Documents', 'LaunchBox'), path.join(home, 'Desktop', 'LaunchBox')];
  if (process.platform === 'win32') for (const d of 'CDEFGHIJKLMNOPQRSTUVWXYZ') for (const sub of ['LaunchBox', 'Games\\LaunchBox', 'Juegos\\LaunchBox', 'Emulacion\\LaunchBox', 'Emulación\\LaunchBox']) tries.push(`${d}:\\${sub}`);
  for (const d of tries) if (isLaunchBox(d)) out.add(path.resolve(d));
  return [...out];
}
const SETTINGS_FILE = path.join(DATA_DIR, 'ajustes.json');
const events = new (require('events'))();
const FAV_FILE = path.join(DATA_DIR, 'favoritos.json');
const STATS_FILE = path.join(DATA_DIR, 'estadisticas.json');
const favorites = readJSON(FAV_FILE, {});
const stats = readJSON(STATS_FILE, {});
function writeData(file, obj) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(file, JSON.stringify(obj, null, 1)); } catch (e) { console.error(e.message); }
}
// Registro de lo que pasa al abrir juegos (para diagnosticar emuladores rebeldes): datos/registro.txt
const LOG_FILE = path.join(DATA_DIR, 'registro.txt');
function log(msg) {
  const line = `${new Date().toLocaleString('es-MX', { hour12: false })}  ${msg}\n`;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    try { if (fs.statSync(LOG_FILE).size > 512 * 1024) fs.renameSync(LOG_FILE, LOG_FILE.replace(/\.txt$/, '-anterior.txt')); } catch {}
    fs.appendFileSync(LOG_FILE, line);
  } catch {}
  console.log(msg);
}
const launcher = createLauncher({
  getLB: () => LB, appDir: APP_DIR, events, log, getSettings: () => readJSON(SETTINGS_FILE, {}),
  onEnd(id, seconds) {
    const s = stats[id] || (stats[id] = { plays: 0, seconds: 0, last: '' });
    s.plays++; s.seconds += seconds; s.last = new Date().toISOString().slice(0, 10);
    writeData(STATS_FILE, stats);
  },
});

const devLogos = createLogos({ dataDir: DATA_DIR, log });
function readJSON(f, def) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return def; }
}

// ---------- XML mínimo (LaunchBox guarda registros planos) ----------
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1));
    return ENT[e] ?? m;
  });
}
function records(xml, tag) {
  const out = [];
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g');
  const field = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = re.exec(xml))) {
    const o = {};
    let f;
    field.lastIndex = 0;
    while ((f = field.exec(m[1]))) o[f[1]] = decode(f[2]);
    out.push(o);
  }
  return out;
}
function readXML(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

// ---------- Biblioteca ----------
let lib = null;
function loadLibrary() {
  const t0 = Date.now();
  if (!isLaunchBox(LB)) { lib = { games: new Map(), apps: new Map(), platforms: [], modes: [], genres: [], developers: [], collections: new Map(), loadedAt: Date.now(), empty: true }; return; }
  const data = path.join(LB, 'Data');
  const platformsXml = readXML(path.join(data, 'Platforms.xml'));
  const platforms = records(platformsXml, 'Platform');
  const parents = records(readXML(path.join(data, 'Parents.xml')), 'Parent');

  const parentOf = {};
  for (const p of parents) if (p.PlatformName && p.ParentPlatformCategoryName) parentOf[p.PlatformName] = p.ParentPlatformCategoryName;

  const games = new Map();      // id -> game
  const byPlatform = new Map(); // nombre -> [ids]
  const versions = new Map();   // gameId -> nº de versiones adicionales
  const apps = new Map();       // id -> aplicación adicional (otras versiones / regiones)
  const dir = path.join(data, 'Platforms');
  let files = [];
  try { files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.xml')); } catch {}
  for (const f of files) {
    const xml = readXML(path.join(dir, f));
    for (const a of records(xml, 'AdditionalApplication')) {
      if (a.GameID) versions.set(a.GameID, (versions.get(a.GameID) || 0) + 1);
      if (a.GameID && a.Id && a.ApplicationPath) apps.set(a.Id, {
        id: a.Id, gameId: a.GameID, name: (a.Name || a.Version || 'Otra versión').replace(/^Jugar la Versión\s*/i, '').replace(/\.\.\.$/, '').trim() || 'Otra versión',
        appPath: a.ApplicationPath, commandLine: a.CommandLine || '', useEmulator: a.UseEmulator === 'true', emulatorId: a.EmulatorId || '',
        region: a.Region || '', priority: +a.Priority || 0,
      });
    }
    for (const g of records(xml, 'Game')) {
      if (g.Hide === 'true') continue;
      const game = meta.normalizeGame(g);
      games.set(game.id, game);
      if (!byPlatform.has(game.platform)) byPlatform.set(game.platform, []);
      byPlatform.get(game.platform).push(game.id);
    }
  }
  for (const [id, n] of versions) if (games.has(id)) games.get(id).versions = n;
  for (const a of apps.values()) if (games.has(a.gameId)) games.get(a.gameId).apps.push({ id: a.id, name: a.name });

  const plats = [];
  for (const p of platforms) {
    const ids = byPlatform.get(p.Name) || [];
    if (!ids.length) continue; // plataformas sin juegos no se muestran
    ids.sort((a, b) => games.get(a).sortTitle.localeCompare(games.get(b).sortTitle, 'es'));
    const info = meta.platformInfo(p.Name);
    plats.push({
      name: p.Name,
      category: parentOf[p.Name] || p.Category || 'Otros',
      count: ids.length,
      developer: p.Developer || '', manufacturer: p.Manufacturer || '',
      cpu: p.Cpu || '', memory: p.Memory || '', graphics: p.Graphics || '',
      sound: p.Sound || '', display: p.Display || '', media: p.Media || '',
      maxControllers: p.MaxControllers || '', notes: p.Notes || '',
      year: info.year, generation: info.gen,
      ids,
    });
  }
  plats.sort((a, b) => (a.year || 9999) - (b.year || 9999) || a.name.localeCompare(b.name));
  // Modos de juego: cuántos juegos hay en cada uno (los vacíos no se muestran).
  const modes = meta.PLAY_MODES.map(m => {
    const ids = [];
    for (const p of plats) for (const id of p.ids) if (m.test(games.get(id))) ids.push(id);
    ids.sort((a, b) => games.get(a).sortTitle.localeCompare(games.get(b).sortTitle, 'es'));
    return { id: m.id, label: m.label, desc: m.desc, ids };
  }).filter(m => m.ids.length);
  // Géneros y desarrolladoras (las que tienen al menos 10 juegos, ordenadas por cantidad).
  const group = keyOf => {
    const m = new Map();
    for (const p of plats) for (const id of p.ids) for (const k of keyOf(games.get(id))) { if (!m.has(k)) m.set(k, []); m.get(k).push(id); }
    for (const ids of m.values()) ids.sort((a, b) => games.get(a).sortTitle.localeCompare(games.get(b).sortTitle, 'es'));
    return m;
  };
  const genres = [...group(g => g.genres)].map(([label, ids]) => ({ id: 'g:' + label, label, ids, desc: `Juegos de ${label.toLowerCase()}.` }))
    .sort((a, b) => b.ids.length - a.ids.length);
  const devName = d => d.split(';')[0].replace(/\s*\((?:Japan|US|USA|Europe|UK)\)\s*$/i, '').replace(/,?\s+(?:Inc|Ltd|Co|Corp|LLC)\.?$/i, '').trim();
  const developers = [...group(g => g.developer ? [devName(g.developer)] : [])].filter(([, ids]) => ids.length >= 10)
    .map(([label, ids]) => ({ id: 'd:' + label, label, ids, desc: `Juegos desarrollados por ${label}.` }))
    .sort((a, b) => b.ids.length - a.ids.length);
  const collections = new Map([...modes, ...genres, ...developers].map(c => [c.id, c]));
  lib = { games, apps, platforms: plats, modes, genres, developers, collections, loadedAt: Date.now() };
  launcher.load(records, readXML);
  mediaCache.clear();
  gameMedia.clear();
  console.log(`Biblioteca: ${games.size} juegos en ${plats.length} plataformas (${Date.now() - t0} ms)`);
}

// ---------- Índice de medios ----------
// LaunchBox nombra los archivos "Título-01.ext" y sustituye : ' / etc. por "_".
const IMG_EXT = /\.(png|jpe?g|webp|gif|bmp)$/i;
const VID_EXT = /\.(mp4|webm|m4v|mkv|avi|mov|flv)$/i;
const AUD_EXT = /\.(mp3|ogg|wav|flac|m4a|aac|opus)$/i;
const DOC_EXT = /\.(pdf|cbz|cbr|html?|txt)$/i;
const REGION_ORDER = ['', 'north america', 'united states', 'usa', 'world', 'canada', 'europe', 'united kingdom', 'australia', 'latin america', 'mexico', 'spain', 'japan'];

function lbSafe(s) { return s.replace(/[\\/:*?"<>|']/g, '_'); }
function key(s) { return lbSafe(s).toLowerCase().trim(); }
function loose(s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''); }
function stemOf(file) { return path.basename(file).replace(/\.[^.]+$/, '').replace(/-\d{1,3}$/, ''); }

function walk(root, rel = '', out = [], depth = 0) {
  let ents;
  try { ents = fs.readdirSync(path.join(root, rel), { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) { if (depth < 4) walk(root, r, out, depth + 1); }
    else out.push(r);
  }
  return out;
}

function platformDirs(base, name) {
  const cands = [...new Set([name, lbSafe(name)])];
  return cands.map(c => path.join(LB, base, c)).filter(d => { try { return fs.statSync(d).isDirectory(); } catch { return false; } });
}

const mediaCache = new Map();
function indexPlatform(name) {
  if (mediaCache.has(name)) return mediaCache.get(name);
  // idx: tipo -> Map(clave -> [{rel, region, num}])
  const idx = { strict: new Map(), loose: new Map() };
  const add = (type, relFromLB, stem, region) => {
    const num = +(path.basename(relFromLB).match(/-(\d{1,3})\.[^.]+$/) || [0, 0])[1];
    const item = { rel: relFromLB, region: region.toLowerCase(), num };
    for (const [m, k] of [[idx.strict, key(stem)], [idx.loose, loose(stem)]]) {
      if (!m.has(type)) m.set(type, new Map());
      const t = m.get(type);
      if (!t.has(k)) t.set(k, []);
      t.get(k).push(item);
    }
  };
  for (const d of platformDirs('Images', name)) {
    const baseRel = path.relative(LB, d).split(path.sep).join('/');
    for (const r of walk(d)) {
      if (!IMG_EXT.test(r)) continue;
      const parts = r.split('/');
      const type = parts[0];
      const region = parts.length > 2 ? parts[1] : '';
      add(type, baseRel + '/' + r, stemOf(r), region);
    }
  }
  for (const [base, re, type] of [['Videos', VID_EXT, 'video'], ['Music', AUD_EXT, 'music'], ['Manuals', DOC_EXT, 'manual']]) {
    for (const d of platformDirs(base, name)) {
      const baseRel = path.relative(LB, d).split(path.sep).join('/');
      for (const r of walk(d)) {
        if (!re.test(r)) continue;
        const sub = r.includes('/') ? r.split('/')[0].toLowerCase() : '';
        if (type === 'video' && (sub === 'marquee' || sub === 'theme')) continue;
        add(type, baseRel + '/' + r, stemOf(r), '');
      }
    }
  }
  mediaCache.set(name, idx);
  return idx;
}

function pick(idx, type, title) {
  let list = idx.strict.get(type)?.get(key(title));
  if (!list) list = idx.loose.get(type)?.get(loose(title));
  if (!list) return [];
  const rank = r => { const i = REGION_ORDER.indexOf(r); return i < 0 ? REGION_ORDER.length - 1 : i; };
  return [...list].sort((a, b) => rank(a.region) - rank(b.region) || a.num - b.num).map(x => x.rel);
}

const IMAGE_GROUPS = {
  box: ['Box - Front', 'Box - Front - Reconstructed', 'Fanart - Box - Front'],
  box3d: ['Box - 3D'],
  cart: ['Disc', 'Cart - Front', 'Cart - 3D', 'Fanart - Disc', 'Fanart - Cart - Front'],
  logo: ['Clear Logo'],
  back: ['Box - Back', 'Box - Back - Reconstructed'],
  shots: ['Screenshot - Gameplay', 'Screenshot - Game Title', 'Screenshot - Game Select', 'Screenshot - High Scores', 'Screenshot - Game Over'],
  fanart: ['Fanart - Background'],
  marquee: ['Arcade - Marquee', 'Banner'],
  flyer: ['Advertisement Flyer - Front', 'Advertisement Flyer - Back'],
  cabinet: ['Arcade - Cabinet', 'Arcade - Control Panel', 'Arcade - Circuit Board'],
};
const u = rel => '/m/' + rel.split('/').map(encodeURIComponent).join('/');
const absToMedia = p => {
  if (!p) return null;
  const abs = path.isAbsolute(p) ? p : path.join(LB, p);
  const rel = path.relative(LB, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  try { fs.accessSync(abs); } catch { return null; }
  return u(rel.split(path.sep).join('/'));
};

const gameMedia = new Map();
function mediaFor(game) {
  if (gameMedia.has(game.id)) return gameMedia.get(game.id);
  const idx = indexPlatform(game.platform);
  const m = {};
  for (const [g, types] of Object.entries(IMAGE_GROUPS)) {
    let all = [];
    for (const t of types) all = all.concat(pick(idx, t, game.title));
    if (all.length) m[g] = all.slice(0, g === 'fanart' || g === 'shots' ? 12 : 4).map(u);
  }
  const vid = game.videoPath && absToMedia(game.videoPath) || (pick(idx, 'video', game.title)[0] && u(pick(idx, 'video', game.title)[0]));
  if (vid) m.video = vid;
  const mus = game.musicPath && absToMedia(game.musicPath) || (pick(idx, 'music', game.title)[0] && u(pick(idx, 'music', game.title)[0]));
  if (mus) m.music = mus;
  const man = game.manualPath && absToMedia(game.manualPath) || (pick(idx, 'manual', game.title)[0] && u(pick(idx, 'manual', game.title)[0]));
  if (man) m.manual = man;
  gameMedia.set(game.id, m);
  return m;
}

function platformMedia(name) {
  const m = {};
  const types = { logo: 'Clear Logo', device: 'Device', banner: 'Banner', fanart: 'Fanart' };
  for (const d of platformDirs('Images', 'Platforms/' + name)) {
    const baseRel = path.relative(LB, d).split(path.sep).join('/');
    for (const r of walk(d)) {
      if (!IMG_EXT.test(r)) continue;
      const t = r.split('/')[0];
      for (const [k, v] of Object.entries(types)) if (t === v) (m[k] ||= []).push(u(baseRel + '/' + r));
    }
  }
  for (const d of platformDirs('Videos', 'Platforms')) {
    for (const r of walk(d)) if (VID_EXT.test(r) && loose(stemOf(r)) === loose(name)) { m.video = u(path.relative(LB, d).split(path.sep).join('/') + '/' + r); break; }
  }
  const out = {};
  for (const [k, v] of Object.entries(m)) out[k] = Array.isArray(v) ? (k === 'fanart' ? v.slice(0, 8) : v[0]) : v;
  return out;
}

function categoryVideo(name) {
  for (const d of platformDirs('Videos', 'Platform Categories')) {
    for (const r of walk(d)) if (VID_EXT.test(r) && loose(stemOf(r)) === loose(name)) return u(path.relative(LB, d).split(path.sep).join('/') + '/' + r);
  }
  return null;
}

// ---------- API ----------
function publicGame(g, withMedia = true) {
  const o = { ...g };
  for (const k of ['videoPath', 'musicPath', 'manualPath', 'appPath', 'emulatorId', 'commandLine', 'rootFolder', 'lbFavorite', 'simultaneous', 'alternating']) delete o[k];
  o.favorite = g.id in favorites ? favorites[g.id] : g.lbFavorite;
  const s = stats[g.id];
  if (s) {
    o.playCount = g.playCount + s.plays; o.playTime = g.playTime + s.seconds;
    if (!o.lastPlayed || s.last > o.lastPlayed) o.lastPlayed = s.last;
  }
  if (withMedia) o.media = mediaFor(g);
  return o;
}

function api(pathname, q) {
  if (pathname === '/api/library') {
    const cats = new Map();
    for (const p of lib.platforms) {
      if (!cats.has(p.category)) cats.set(p.category, []);
      const { ids, ...rest } = p;
      cats.get(p.category).push({ ...rest, media: platformMedia(p.name) });
    }
    const order = ['Consoles', 'Handhelds', 'Arcade', 'Computers'];
    const categories = [...cats.entries()]
      .sort((a, b) => (order.indexOf(a[0]) + 1 || 99) - (order.indexOf(b[0]) + 1 || 99))
      .map(([name, platforms]) => ({
        name, label: meta.categoryLabel(name), platforms,
        games: platforms.reduce((s, p) => s + p.count, 0),
        video: categoryVideo(name),
      }));
    const pub = list => list.map(m => ({ id: m.id, label: m.label, desc: m.desc, count: m.ids.length }));
    const devs = pub(lib.developers).map(d => ({ ...d, logo: devLogos.url(d.label) }));
    return { categories, total: lib.games.size, modes: pub(lib.modes), genres: pub(lib.genres), developers: devs, empty: !!lib.empty, path: LB };
  }
  if (pathname === '/api/games' && q.get('mode') === 'all') {
    return { mode: 'all', games: [...lib.games.values()].map(g => publicGame(g)) };
  }
  if (pathname === '/api/games' && q.get('mode')) {
    const m = lib.collections.get(q.get('mode'));
    return { mode: m?.id, games: m ? m.ids.map(id => publicGame(lib.games.get(id))) : [] };
  }
  if (pathname === '/api/games') {
    const p = lib.platforms.find(x => x.name === q.get('platform'));
    if (!p) return { games: [] };
    return { platform: p.name, games: p.ids.map(id => publicGame(lib.games.get(id))) };
  }
  if (pathname === '/api/random') {
    // Juegos al azar con video, para el modo espectador.
    const n = Math.min(+q.get('n') || 30, 100), cat = q.get('category');
    const pool = [];
    for (const p of lib.platforms) if (!cat || p.category === cat) pool.push(...p.ids);
    const out = [];
    while (out.length < n && pool.length) {
      const i = Math.floor(Math.random() * pool.length);
      const id = pool[i]; pool[i] = pool[pool.length - 1]; pool.pop();
      const g = publicGame(lib.games.get(id));
      if (g.media.video) out.push(g);
    }
    return { games: out };
  }
  if (pathname === '/api/status') return { ...launcher.status(), exitBinding: launcher.exitBinding() };
  if (pathname === '/api/dry') {
    const g = lib.games.get(q.get('id'));
    return g ? launcher.build(g, q.get('app') ? lib.apps.get(q.get('app')) : null) : { error: 'no existe' };
  }
  if (pathname === '/api/music') {
    // Una pista al azar. Primero la música de fondo que tengas en Music/Background,
    // si no hay, una pista de algún juego de esa plataforma o categoría.
    const pickFrom = files => files.length ? u(files[Math.floor(Math.random() * files.length)]) : null;
    const bgFiles = sub => { let f = []; for (const d of platformDirs('Music', 'Background/' + sub)) f = f.concat(walk(d).filter(r => AUD_EXT.test(r)).map(r => path.relative(LB, path.join(d, r)).split(path.sep).join('/'))); return f; };
    const gameTracks = name => { const out = []; for (const list of (indexPlatform(name).strict.get('music') || new Map()).values()) out.push(...list.map(x => x.rel)); return out; };
    let plat = q.get('platform');
    if (q.get('category')) {
      const bg = bgFiles('Platform Categories/' + q.get('category'));
      if (bg.length) return { url: pickFrom(bg) };
      const ps = lib.platforms.filter(p => p.category === q.get('category')).sort(() => Math.random() - 0.5);
      for (const p of ps) { const t = gameTracks(p.name); if (t.length) return { url: pickFrom(t) }; }
      return { url: null };
    }
    if (!plat) return { url: null };
    const bg = bgFiles('Platforms/' + plat);
    return { url: pickFrom(bg.length ? bg : gameTracks(plat)) };
  }
  if (pathname === '/api/soundpacks') {
    // Paquetes de efectos de LaunchBox (E:\LaunchBox\Sounds): Back, Move, Select, Startup.
    const out = [];
    let dirs = [];
    try { dirs = fs.readdirSync(path.join(LB, 'Sounds'), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name); } catch {}
    for (const name of dirs) {
      const base = path.join(LB, 'Sounds', name), files = {};
      for (const r of walk(base)) {
        if (!AUD_EXT.test(r)) continue;
        const k = r.split('/')[0].replace(/\.[^.]+$/, '').toLowerCase();
        if (['back', 'move', 'select', 'startup'].includes(k)) (files[k] ||= []).push(u('Sounds/' + name + '/' + r));
      }
      if (files.move && files.select) out.push({ id: 'lb:' + name, name, files });
    }
    return { packs: out };
  }
  if (pathname === '/api/reload') { loadLibrary(); return { ok: true, total: lib.games.size }; }
  if (pathname === '/api/devlogos') {
    if (q.get('retry')) { devLogos.retry(); fetchDevLogos(true); }
    return { pending: devLogos.pending(), logos: Object.fromEntries(lib.developers.map(d => [d.label, devLogos.url(d.label)])) };
  }
  if (pathname === '/api/setup') return { ok: isLaunchBox(LB), path: LB, candidates: findLaunchBox(), dataDir: DATA_DIR };
  return null;
}

// ---------- Archivos ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.bmp': 'image/bmp',
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.webm': 'video/webm', '.mkv': 'video/x-matroska', '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.flac': 'audio/flac', '.m4a': 'audio/mp4', '.opus': 'audio/ogg',
  '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8',
};

function sendFile(req, res, file, cache) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end(); }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': cache ? 'public, max-age=86400' : 'no-cache' };
    const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
    if (range) {
      let start = range[1] ? +range[1] : st.size - +range[2];
      let end = range[1] && range[2] ? +range[2] : st.size - 1;
      if (!range[1]) end = st.size - 1;
      if (start >= st.size || start < 0) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
      end = Math.min(end, st.size - 1);
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res);
    } else {
      res.writeHead(200, { ...headers, 'Content-Length': st.size });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
    }
  });
}

function inside(root, p) {
  const rel = path.relative(root, p);
  return !rel.startsWith('..') && !path.isAbsolute(rel);
}

function readBody(req) {
  return new Promise((ok, ko) => {
    let b = ''; req.on('data', c => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => ok(b)); req.on('error', ko);
  });
}

const server = http.createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch { res.writeHead(400); return res.end(); }
  const p = decodeURIComponent(url.pathname);
  try {
    if (p === '/api/settings') {
      if (req.method === 'POST') {
        const body = JSON.parse(await readBody(req) || '{}');
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(body, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"ok":true}');
      }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      return res.end(JSON.stringify(readJSON(SETTINGS_FILE, {})));
    }
    // Elegir la carpeta de LaunchBox (primera vez, o si compartes la app con otra persona).
    if (req.method === 'POST' && p === '/api/setup') {
      const body = JSON.parse(await readBody(req) || '{}');
      const dir = String(body.path || '').trim().replace(/^"|"$/g, '');
      let out;
      if (!isLaunchBox(dir)) out = { ok: false, error: `En «${dir}» no encuentro LaunchBox: debe tener la carpeta Data con Platforms.xml dentro.` };
      else {
        LB = path.resolve(dir);
        writeData(USER_CFG, { ...readJSON(USER_CFG, {}), launchboxPath: LB });
        loadLibrary(); warmUp();
        log('LaunchBox elegido: ' + LB);
        out = { ok: true, path: LB, total: lib.games.size };
      }
      res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(out));
    }
    // Borrar datos propios de Pandora (nunca toca LaunchBox).
    if (req.method === 'POST' && p === '/api/reset') {
      const body = JSON.parse(await readBody(req) || '{}');
      const done = [];
      const rm = f => { try { fs.rmSync(f, { recursive: true, force: true }); return true; } catch { return false; } };
      for (const w of body.what || []) {
        if (w === 'favoritos') { for (const k of Object.keys(favorites)) delete favorites[k]; rm(FAV_FILE); done.push(w); }
        if (w === 'estadisticas') { for (const k of Object.keys(stats)) delete stats[k]; rm(STATS_FILE); done.push(w); }
        if (w === 'ajustes') { rm(SETTINGS_FILE); done.push(w); }
        if (w === 'registro') { rm(LOG_FILE); done.push(w); }
        if (w === 'logos') { rm(path.join(DATA_DIR, 'logos')); devLogos.clear(); done.push(w); }
        if (w === 'carpeta') { rm(USER_CFG); done.push(w); }
        if (w === 'navegador') { rm(path.join(DATA_DIR, 'navegador', 'Cache')); done.push(w); }
      }
      log('Datos borrados: ' + done.join(', '));
      res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ok: true, done }));
    }
    if (req.method === 'POST' && (p === '/api/launch' || p === '/api/close' || p === '/api/favorite')) {
      const body = JSON.parse(await readBody(req) || '{}');
      let out;
      if (p === '/api/launch') {
        const g = lib.games.get(body.id);
        out = g ? launcher.launch(g, body.app ? lib.apps.get(body.app) : null) : { error: 'No encuentro ese juego.' };
        if (out.ok) console.log('Jugando:', g.title, '->', out.command);
        else console.log('No se pudo lanzar:', out.error);
      } else if (p === '/api/close') out = launcher.close();
      else {
        favorites[body.id] = !!body.value; writeData(FAV_FILE, favorites); out = { ok: true, favorite: !!body.value };
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(out));
    }
    if (p.startsWith('/api/')) {
      const out = api(p, url.searchParams);
      if (!out) { res.writeHead(404); return res.end(); }
      const body = JSON.stringify(out);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(body);
    }
    if (p.startsWith('/dl/')) {
      const file = path.join(devLogos.dir, p.slice(4));
      if (!inside(devLogos.dir, file)) { res.writeHead(403); return res.end(); }
      return sendFile(req, res, file, true);
    }
    if (p.startsWith('/m/')) {
      const file = path.join(LB, p.slice(3));
      if (!inside(LB, file)) { res.writeHead(403); return res.end(); }
      return sendFile(req, res, file, true);
    }
    const pub = path.join(APP_DIR, 'public');
    const file = path.join(pub, p === '/' ? 'index.html' : p);
    if (!inside(pub, file)) { res.writeHead(403); return res.end(); }
    return sendFile(req, res, file, false);
  } catch (e) {
    console.error(e);
    res.writeHead(500); res.end(String(e.message || e));
  }
});

// Arranca el servidor. Dentro de Pandora.exe usa un puerto libre cualquiera.
function start(port = cfg.port) {
  return new Promise((ok, ko) => {
    // Si no hay LaunchBox, Pandora arranca igual y la interfaz guía para elegir la carpeta.
    if (!isLaunchBox(LB)) { const found = findLaunchBox(); if (found.length === 1) { LB = found[0]; log('LaunchBox encontrado en ' + LB); } }
    loadLibrary();
    server.once('error', ko);
    server.listen(port, '127.0.0.1', () => {
      const p = server.address().port;
      console.log(`Pandora lista en http://localhost:${p}`);
      warmUp(); ok(p);
    });
  });
}
module.exports = { start, events, get LB() { return LB; } };
if (require.main === module) start().catch(e => { console.error(e.message); process.exit(1); });

// Busca en segundo plano los logos de las desarrolladoras que aún no tiene (se puede apagar en Ajustes).
function fetchDevLogos(force) {
  const s = readJSON(SETTINGS_FILE, {});
  if (!force && s.devLogos === false) return;
  if (lib?.developers?.length) devLogos.want(lib.developers.map(d => d.label));
}
// Indexa los medios de cada plataforma en segundo plano para que abrirlas sea instantáneo.
function warmUp() {
  setTimeout(() => fetchDevLogos(false), 4000);
  const names = lib.platforms.map(p => p.name);
  const t0 = Date.now();
  const next = () => {
    const n = names.shift();
    if (!n) return console.log(`Medios indexados (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    if (!mediaCache.has(n)) indexPlatform(n);
    setTimeout(next, 5);
  };
  setTimeout(next, 200);
}
