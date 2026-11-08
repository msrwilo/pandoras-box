// Normalización de metadatos de LaunchBox: géneros y modos en español, generaciones.
'use strict';

const GENRES = [
  [/^fight|^fighting/i, 'Pelea'],
  [/^platform/i, 'Plataformas'],
  [/^shooter/i, 'Disparos'],
  [/^sports/i, 'Deportes'],
  [/^puzzle/i, 'Puzle'],
  [/^maze/i, 'Laberinto'],
  [/^driving|^racing/i, 'Carreras'],
  [/^action/i, 'Acción'],
  [/^adventure/i, 'Aventura'],
  [/^beat 'em up/i, "Beat 'em up"],
  [/^board game/i, 'Juego de mesa'],
  [/^casino/i, 'Casino'],
  [/^compilation/i, 'Compilación'],
  [/^construction/i, 'Construcción y gestión'],
  [/^education/i, 'Educativo'],
  [/^flight/i, 'Simulador de vuelo'],
  [/^horror/i, 'Terror'],
  [/^life simulation/i, 'Simulación de vida'],
  [/^mmo/i, 'MMO'],
  [/^music/i, 'Música'],
  [/^party/i, 'Fiesta'],
  [/^pinball/i, 'Pinball'],
  [/^quiz/i, 'Preguntas'],
  [/^role-playing|^rpg/i, 'RPG'],
  [/^sandbox/i, 'Mundo abierto'],
  [/^stealth/i, 'Sigilo'],
  [/^strategy/i, 'Estrategia'],
  [/^vehicle/i, 'Simulación de vehículos'],
  [/^visual novel/i, 'Novela visual'],
];
function genre(g) {
  for (const [re, es] of GENRES) if (re.test(g)) return es;
  return g;
}

function mode(m) {
  const s = m.toLowerCase();
  if (s.includes('coop')) return 'Cooperativo';
  if (s === 'single player' || s === 'un jugador') return 'Un jugador';
  if (s.includes('multi') || /\d-player/.test(s)) return 'Multijugador';
  return m;
}

const CATEGORY_LABELS = { Consoles: 'Consolas', Handhelds: 'Portátiles', Arcade: 'Arcade', Computers: 'Computadoras' };
const categoryLabel = c => CATEGORY_LABELS[c] || c;

// Año de lanzamiento y generación de consola. Arcade y computadoras no tienen generación.
// Las portátiles de frontera (NGPC, WonderSwan Color) van por año; se pueden ajustar aquí.
const PLATFORMS = {
  'Atari 2600': [1977, 2], 'ColecoVision': [1982, 2], 'Mattel Intellivision': [1979, 2],
  'Nintendo Entertainment System': [1983, 3], 'Sega Master System': [1985, 3],
  'NEC TurboGrafx-16': [1987, 4], 'NEC TurboGrafx-CD': [1988, 4], 'PC Engine SuperGrafx': [1989, 4],
  'Sega Genesis': [1988, 4], 'Sega CD': [1991, 4], 'Sega 32X': [1994, 4],
  'Super Nintendo Entertainment System': [1990, 4], 'Nintendo Game Boy': [1989, 4], 'Sega Game Gear': [1990, 4],
  'Sony Playstation': [1994, 5], 'Sega Saturn': [1994, 5], 'Nintendo 64': [1996, 5],
  'Nintendo Virtual Boy': [1995, 5], 'Nintendo Game Boy Color': [1998, 5], 'SNK Neo Geo Pocket Color': [1999, 5],
  'WonderSwan Color': [2000, 6],
  'Sega Dreamcast': [1998, 6], 'Sony Playstation 2': [2000, 6], 'Nintendo GameCube': [2001, 6],
  'Microsoft Xbox': [2001, 6], 'Nintendo Game Boy Advance': [2001, 6],
  'Microsoft Xbox 360': [2005, 7], 'Sony Playstation 3': [2006, 7], 'Nintendo Wii': [2006, 7],
  'Nintendo DS': [2004, 7], 'Sony PSP': [2004, 7],
  'Nintendo 3DS': [2011, 8], 'Nintendo Wii U': [2012, 8], 'Sony Playstation 4': [2013, 8], 'Nintendo Switch': [2017, 8],
  "Arcade 80's": [1980, null], "Arcade 90's": [1990, null], 'Arcade Y2K': [2000, null],
  'Daphne': [1983, null], 'Sega Naomi': [1998, null], 'Teknoparrot': [2005, null],
  'Microsoft MSX': [1983, null], 'Sharp X68000': [1987, null], 'MS-DOS': [1981, null],
  'ScummVM': [1987, null], 'Windows': [1995, null],
};
function platformInfo(name) {
  const p = PLATFORMS[name];
  return p ? { year: p[0], gen: p[1] } : { year: null, gen: null };
}

const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const list = (v, f) => [...new Set((v || '').split(';').map(s => s.trim()).filter(Boolean).map(f))];

function normalizeGame(g) {
  const date = g.ReleaseDate || '';
  return {
    id: g.ID,
    title: g.Title || '(sin título)',
    sortTitle: (g.SortTitle || g.Title || '').toLowerCase(),
    platform: g.Platform,
    year: /^\d{4}/.test(date) ? +date.slice(0, 4) : null,
    date: date.slice(0, 10),
    genres: list(g.Genre, genre),
    developer: g.Developer || '',
    publisher: g.Publisher || '',
    maxPlayers: num(g.MaxPlayers) || null,
    modes: list(g.PlayMode, mode),
    simultaneous: /simultaneous|simult/i.test(g.PlayMode || ''),
    alternating: /alternating|turnos/i.test(g.PlayMode || ''),
    region: g.Region || '',
    community: num(g.CommunityStarRating) ? Math.round(num(g.CommunityStarRating) * 10) / 10 : null,
    votes: num(g.CommunityStarRatingTotalVotes) || 0,
    stars: num(g.StarRatingFloat) || num(g.StarRating) || null,
    esrb: g.Rating || '',
    notes: (g.Notes || '').trim(),
    series: g.Series || '',
    playCount: num(g.PlayCount),
    playTime: num(g.PlayTime),
    lastPlayed: (g.LastPlayedDate || '').slice(0, 10),
    favorite: g.Favorite === 'true',
    completed: g.Completed === 'true',
    versions: 0,
    videoPath: g.VideoPath || '', musicPath: g.MusicPath || '', manualPath: g.ManualPath || '',
    appPath: g.ApplicationPath || '',
    emulatorId: g.Emulator || '',
    commandLine: g.CommandLine || '',
    rootFolder: g.RootFolder || '',
    lbFavorite: g.Favorite === 'true',
    apps: [],
  };
}

// Modos de juego para el inicio, a partir de PlayMode y MaxPlayers de LaunchBox.
const PLAY_MODES = [
  { id: 'solo', label: 'Un jugador', desc: 'Juegos para jugar solo.', test: g => g.modes.includes('Un jugador') || g.maxPlayers === 1 },
  { id: 'multi', label: 'Multijugador', desc: 'Cualquier juego para dos o más personas.', test: g => g.modes.includes('Multijugador') || g.maxPlayers > 1 || g.simultaneous || g.alternating },
  { id: 'coop', label: 'Cooperativo', desc: 'Juegan en el mismo equipo.', test: g => g.modes.includes('Cooperativo') },
  { id: 'simul', label: 'Simultáneo', desc: 'Varios jugadores a la vez (así lo marca LaunchBox en pocos juegos).', test: g => g.simultaneous },
  { id: 'turnos', label: 'Por turnos', desc: 'Varios jugadores, uno a la vez.', test: g => g.alternating },
  { id: 'p2', label: '2 jugadores', desc: 'Hasta dos jugadores.', test: g => g.maxPlayers === 2 },
  { id: 'p34', label: '3 o 4 jugadores', desc: 'Para tres o cuatro jugadores.', test: g => g.maxPlayers >= 3 && g.maxPlayers <= 4 },
  { id: 'p5', label: '5 o más', desc: 'Para cinco jugadores o más.', test: g => g.maxPlayers >= 5 },
];

module.exports = { normalizeGame, platformInfo, categoryLabel, PLAY_MODES };
