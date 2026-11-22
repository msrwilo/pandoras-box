// Motor de recomendados (etapa 3a). Sin dependencias y sin leer disco: recibe la biblioteca ya cargada
// (los juegos normalizados por meta.js y las plataformas de server.js), las estadísticas y los favoritos,
// y devuelve filas de juegos instalados que Wilo no ha jugado (o casi no).
//
// Puntaje base = parecido (género, serie, desarrolladora, plataforma, época) × calificación.
// Calificación = la de la comunidad de LaunchBox ponderada por número de votos (promedio bayesiano):
// un 5,0 con 2 votos pesa menos que un 4,5 con 500. Si Wilo calificó el juego (estrellas), cuenta la mitad.
// En cada fila: máximo 2 juegos por serie y un solo juego por título (sin repetir el mismo juego en otra consola).
'use strict';

// ---------- Ajustes del motor (se pueden pasar otros en `opciones`) ----------
const DEFAULTS = {
  porFila: 20,
  maxPorSerie: 2,
  casiNoSegundos: 20 * 60, // menos de 20 min y no más de 2 partidas = «casi no jugado»: se puede recomendar
  casiNoPartidas: 2,
  votosConfianza: 15,      // m del promedio bayesiano: con 15 votos, la calificación propia pesa la mitad
  semillas: 25,            // cuántos juegos del historial forman el perfil de «Para ti»
  vidaMediaDias: 180,      // el peso de un juego jugado se reduce a la mitad cada 180 días (mínimo 25 %)
  minCortas: 5,            // «Partidas cortas» solo aparece si hay al menos esto
  sinRepetir: true,        // un juego no se repite en dos filas
  instalado: g => !!(g.appPath || (g.apps && g.apps.length)),
};

// Peso de cada parte del parecido (suman 1).
const PESOS = { genero: 0.35, serie: 0.25, desarrolladora: 0.15, plataforma: 0.10, epoca: 0.15 };

// ---------- Utilidades ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Título comparable: sin acentos, sin lo que va entre paréntesis o corchetes (región, versión), sin signos.
function normTitulo(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').replace(/^the /, '').trim();
}
// Igual que server.js › devName: «Capcom Co., Ltd.» y «Capcom (Japan)» cuentan como la misma.
const devName = d => String(d || '').split(';')[0].replace(/\s*\((?:Japan|US|USA|Europe|UK)\)\s*$/i, '').replace(/,?\s+(?:Inc|Ltd|Co|Corp|LLC)\.?$/i, '').replace(/,$/, '').trim().toLowerCase();
const fmt1 = n => String(Math.round(n * 10) / 10).replace('.', ',');

// ---------- 2D o 3D ----------
// LaunchBox no guarda este dato: se deduce de la plataforma y el género. Habrá errores; se corrigen con
// `excepciones` (las de Wilo, que mandan) o con la lista EXCEPCIONES de aquí (la que viene con Pandora).
const PLAT_2D = new Set(['Atari 2600', 'ColecoVision', 'Mattel Intellivision', 'Nintendo Entertainment System', 'Sega Master System',
  'NEC TurboGrafx-16', 'NEC TurboGrafx-CD', 'PC Engine SuperGrafx', 'Sega Genesis', 'Sega CD', 'Sega 32X', 'Super Nintendo Entertainment System',
  'Nintendo Game Boy', 'Sega Game Gear', 'Nintendo Game Boy Color', 'SNK Neo Geo Pocket Color', 'WonderSwan Color', 'Nintendo Game Boy Advance',
  'Microsoft MSX', 'Sharp X68000', 'ScummVM', "Arcade 80's", "Arcade 90's"]);
const PLAT_3D = new Set(['Nintendo 64', 'Sony Playstation 2', 'Nintendo GameCube', 'Microsoft Xbox', 'Microsoft Xbox 360', 'Sony Playstation 3',
  'Nintendo Wii', 'Nintendo 3DS', 'Nintendo Wii U', 'Sony Playstation 4', 'Nintendo Switch', 'Sony PSP', 'Sega Naomi', 'Teknoparrot', 'Arcade Y2K']);
const GEN_2D = new Set(['Puzle', 'Pinball', 'Novela visual', 'Juego de mesa', 'Casino', 'Laberinto', 'Preguntas']);
const GEN_3D = new Set(['Carreras', 'Simulador de vuelo', 'Simulación de vehículos']);
// [título normalizado (expresión), '2d' | '3d', plataforma opcional (expresión)]. Se busca al principio del título.
const EXCEPCIONES = [
  // 3D en plataformas que casi siempre son 2D (Super FX, 32X, primeros 3D de PC)
  ['star fox|starwing|stunt race fx|vortex|dirt trax fx|virtua racing|virtua fighter|doom|final doom|wolfenstein 3d|quake|duke nukem 3d|descent|heretic|hexen|tomb raider|magic carpet|wing commander|x wing|tie fighter|ultima underworld|system shock', '3d'],
  ['tekken|soul blade|soul edge|soulcalibur|soul calibur|battle arena toshinden|toshinden|street fighter ex|mortal kombat 4|bushido blade|dead or alive|bloody roar|virtua fighter', '3d'],
  // 2D en plataformas que casi siempre son 3D
  ['castlevania symphony of the night|mega man x4|mega man x5|mega man x6|mega man 8|rayman|oddworld|abe s|metal slug|street fighter alpha|street fighter iii|street fighter 3|marvel vs capcom|marvel super heroes|x men vs street fighter|capcom vs snk|snk vs capcom|guilty gear|king of fighters|darkstalkers|vampire savior|samurai shodown|garou|blazblue|skullgirls|new super mario bros|donkey kong country returns|donkey kong country tropical freeze|kirby s return to dream land|kirby triple deluxe|kirby planet robobot|wario land|shovel knight|celeste|hollow knight|cuphead|ori and the|braid|limbo|spelunky|dead cells|sonic mania|super meat boy|odin sphere|muramasa|dragon s crown|castlevania dawn of sorrow|castlevania portrait of ruin|castlevania order of ecclesia|pokemon (?:diamond|pearl|platinum|heartgold|soulsilver|black|white)', '2d'],
];
const EXC_RE = EXCEPCIONES.map(([t, d, p]) => [new RegExp('^(?:' + t + ')(?: |$)'), d, p ? new RegExp(p) : null]);

function dimension(g, plat = {}, excepciones = {}) {
  const t = normTitulo(g.title);
  const propia = excepciones[g.id] || excepciones['t:' + t];
  if (propia === '2d' || propia === '3d') return propia;
  for (const [re, d, p] of EXC_RE) if (re.test(t) && (!p || p.test(g.platform))) return d;
  const name = g.platform || '', genres = g.genres || [];
  const has2 = genres.some(x => GEN_2D.has(x)), has3 = genres.some(x => GEN_3D.has(x));
  if (PLAT_2D.has(name)) return '2d';
  if (PLAT_3D.has(name)) return has2 && !has3 ? '2d' : '3d';
  if (name === 'Sony Playstation' || name === 'Sega Saturn') {
    if (has3 || genres.includes('Deportes')) return '3d';
    if (has2 || genres.includes("Beat 'em up")) return '2d';
    if (genres.includes('Pelea')) return name === 'Sega Saturn' ? '2d' : '3d';
    return name === 'Sony Playstation' ? '3d' : '2d';
  }
  if (name === 'Sega Dreamcast') return genres.includes('Pelea') ? null : has2 && !has3 ? '2d' : '3d';
  if (name === 'Nintendo DS') return has3 ? '3d' : '2d';
  if (name === 'MS-DOS' || name === 'Windows') {
    const y = g.year || plat.year || 0;
    if (has3 && y >= 1990) return '3d';
    if (genres.includes('Disparos') && y >= 1993) return '3d';
    if (name === 'Windows' && y >= 2000 && !has2) return '3d';
    return y && y < 1996 ? '2d' : name === 'MS-DOS' ? '2d' : null;
  }
  if (name === 'Daphne' || name === 'Nintendo Virtual Boy') return null;
  // Plataformas que no están en las listas: por generación o por año.
  const gen = plat.generation, y = plat.year || g.year;
  if (gen && gen <= 4) return '2d';
  if (gen && gen >= 6) return has2 && !has3 ? '2d' : '3d';
  if (plat.category === 'Arcade' && y) return y < 1995 ? '2d' : y >= 2000 ? '3d' : null;
  if (y && y < 1993) return '2d';
  return null;
}

// ---------- Motor ----------
function crear(datos = {}, opciones = {}) {
  const o = { ...DEFAULTS, ...opciones };
  const stats = datos.stats || {}, favoritos = datos.favoritos || {}, excepciones = datos.excepciones || {};
  const ahora = datos.ahora ? new Date(datos.ahora).getTime() : Date.now();
  const plats = new Map((datos.plataformas || []).map(p => [p.name, p]));
  const lista = datos.juegos instanceof Map ? [...datos.juegos.values()] : [...(datos.juegos || [])];

  // Rasgos de cada juego, calculados una vez.
  const R = new Map();
  for (const g of lista) {
    const s = stats[g.id] || {};
    const p = plats.get(g.platform) || {};
    const partidas = (g.playCount || 0) + (s.plays || 0), segundos = (g.playTime || 0) + (s.seconds || 0);
    const ultima = s.lastAt || s.last || g.lastPlayed || '';
    R.set(g.id, {
      g, partidas, segundos, ultima,
      generos: new Set(g.genres || []), series: new Set(g.seriesList || (g.series ? g.series.split(';').map(x => x.trim()).filter(Boolean) : [])),
      dev: devName(g.developer), titulo: normTitulo(g.title),
      gen: p.generation || null, cat: p.category || '', anio: g.year || p.year || null,
      favorito: g.id in favoritos ? favoritos[g.id] === true : !!g.lbFavorite,
      instalado: !!o.instalado(g),
      multi: (g.modes || []).includes('Multijugador') || (g.modes || []).includes('Cooperativo') || g.maxPlayers > 1 || !!g.simultaneous || !!g.alternating,
      coop: (g.modes || []).includes('Cooperativo'),
    });
  }
  const jugadoDeVerdad = r => r.segundos >= o.casiNoSegundos || r.partidas > o.casiNoPartidas;
  const titulosJugados = new Set([...R.values()].filter(jugadoDeVerdad).map(r => r.titulo));
  // Candidatos: instalados, sin jugar o casi, y sin un título ya jugado en otra consola.
  const candidatos = [...R.values()].filter(r => r.instalado && !jugadoDeVerdad(r) && !titulosJugados.has(r.titulo));

  // Calificación ponderada por votos (0 a 5) y su factor (0 a 1, al cuadrado para que la diferencia entre 3,5 y 4,5 pese).
  const conVotos = lista.filter(g => g.community && g.votes > 0);
  const media = conVotos.length ? conVotos.reduce((a, g) => a + g.community, 0) / conVotos.length : 3.5;
  const m = o.votosConfianza;
  for (const r of R.values()) {
    const g = r.g;
    let c = g.community && g.votes > 0 ? (g.votes * g.community + m * media) / (g.votes + m) : media - 0.4;
    if (g.stars) c = (c + clamp(g.stars, 0, 5)) / 2;
    r.calif = c; r.q = (clamp(c, 0, 5) / 5) ** 2;
    r.dim = dimension(g, plats.get(g.platform), excepciones);
  }

  // Parecido entre dos juegos (0 a 1) y su parte más fuerte (para la razón que se muestra).
  function parecido(a, b) {
    let gi = 0; for (const x of a.generos) if (b.generos.has(x)) gi++;
    const gu = a.generos.size + b.generos.size - gi;
    const pg = gu ? gi / gu : 0;
    let ps = 0; for (const x of a.series) if (b.series.has(x)) { ps = 1; break; }
    const pd = a.dev && a.dev === b.dev ? 1 : 0;
    const pp = a.g.platform === b.g.platform ? 1 : a.gen && a.gen === b.gen && a.cat === b.cat ? 0.6 : a.cat && a.cat === b.cat ? 0.3 : 0;
    const pe = a.anio && b.anio ? clamp(1 - Math.abs(a.anio - b.anio) / 10, 0, 1) : 0.5;
    const partes = { genero: PESOS.genero * pg, serie: PESOS.serie * ps, desarrolladora: PESOS.desarrolladora * pd, plataforma: PESOS.plataforma * pp, epoca: PESOS.epoca * pe };
    return { v: partes.genero + partes.serie + partes.desarrolladora + partes.plataforma + partes.epoca, partes };
  }
  const razonDe = (a, b, partes) => {
    if (partes.serie) return 'Misma serie: ' + [...a.series].find(x => b.series.has(x));
    if (partes.desarrolladora) return 'De ' + (b.g.developer.split(';')[0].trim()) + ', como ' + a.g.title;
    if (partes.genero) return 'Como ' + a.g.title + ': ' + [...a.generos].filter(x => b.generos.has(x)).join(', ').toLowerCase();
    return 'Parecido a ' + a.g.title;
  };
  const razonCalif = r => r.g.community && r.g.votes ? `${fmt1(r.g.community)} de 5 · ${r.g.votes} votos` : 'Sin calificación de la comunidad';

  // Historial: peso de cada juego = tiempo jugado (con rendimientos decrecientes) × qué tan reciente, más favoritos.
  const diasDesde = t => { const ms = Date.parse(t); return Number.isFinite(ms) ? Math.max(0, (ahora - ms) / 86400000) : 365; };
  const pesoHist = r => {
    const tiempo = Math.log1p(r.segundos / 60) + (r.partidas > 0 && !r.segundos ? 1 : 0);
    const rec = Math.max(0.25, 0.5 ** (diasDesde(r.ultima) / o.vidaMediaDias));
    return tiempo * rec + (r.favorito ? 1.5 : 0);
  };
  const historial = [...R.values()].filter(r => r.partidas > 0 || r.segundos > 0 || r.favorito)
    .map(r => ({ r, w: pesoHist(r) })).filter(x => x.w > 0).sort((a, b) => b.w - a.w);
  const semillas = historial.slice(0, o.semillas);

  // Afinidad de cada candidato con todo el historial (0 a 1): mezcla del parecido más fuerte y del promedio.
  const afinidad = new Map(), razonAfin = new Map();
  if (semillas.length) {
    const wmax = semillas[0].w, wsum = semillas.reduce((a, s) => a + s.w, 0);
    let top = 0;
    for (const c of candidatos) {
      let mejor = 0, mejorRazon = '', suma = 0;
      for (const { r: s, w } of semillas) {
        if (s === c) continue;
        const p = parecido(s, c), v = p.v * (w / wmax);
        suma += p.v * w;
        if (v > mejor) { mejor = v; mejorRazon = razonDe(s, c, p.partes); }
      }
      const a = 0.6 * mejor + 0.4 * (suma / wsum);
      afinidad.set(c, a); razonAfin.set(c, mejorRazon); if (a > top) top = a;
    }
    if (top > 0) for (const [c, a] of afinidad) afinidad.set(c, a / top);
  }
  const afin = c => afinidad.get(c) || 0;

  // Arma una fila: ordena, quita repetidos (mismo título, más de N por serie, ya usados en otra fila) y corta.
  const usados = new Set(); let compartir = false; // compartir: solo dentro de todas()
  function fila(items, n = o.porFila) {
    items.sort((a, b) => b.puntaje - a.puntaje || a.r.g.title.localeCompare(b.r.g.title, 'es'));
    const out = [], porSerie = new Map(), titulos = new Set();
    for (const it of items) {
      if (out.length >= n) break;
      const r = it.r;
      if (compartir && usados.has(r.g.id)) continue;
      if (titulos.has(r.titulo)) continue;
      if ([...r.series].some(s => (porSerie.get(s) || 0) >= o.maxPorSerie)) continue;
      for (const s of r.series) porSerie.set(s, (porSerie.get(s) || 0) + 1);
      titulos.add(r.titulo);
      out.push({ id: r.g.id, juego: r.g, puntaje: Math.round(it.puntaje * 1000) / 1000, razon: it.razon || razonCalif(r) });
    }
    if (compartir) for (const x of out) usados.add(x.id);
    return out;
  }

  // Juego más reciente del historial (como Recientes: lastAt o last). Si no hay partidas, el favorito con más peso.
  function ultimoJugado() {
    const jugados = [...R.values()].filter(r => r.ultima && (r.partidas > 0 || r.segundos > 0));
    if (jugados.length) return jugados.sort((a, b) => (a.ultima < b.ultima ? 1 : a.ultima > b.ultima ? -1 : 0))[0];
    return historial.find(x => x.r.favorito)?.r || null;
  }

  const filas = {
    // 1. Porque jugaste (último juego): parecido con ese juego × calificación. Sin parecido mínimo no entra.
    porqueJugaste(n) {
      const s = ultimoJugado();
      if (!s) return null;
      const items = [];
      for (const c of candidatos) {
        if (c === s || c.titulo === s.titulo) continue;
        const p = parecido(s, c);
        if (p.v < 0.3) continue;
        items.push({ r: c, puntaje: p.v * c.q, razon: razonDe(s, c, p.partes) });
      }
      const juegos = fila(items, n);
      const jugado = s.partidas > 0 || s.segundos > 0;
      return juegos.length ? { id: 'porque', titulo: (jugado ? 'Porque jugaste ' : 'Porque te gusta ') + s.g.title, semilla: s.g.id, juegos } : null;
    },
    // 2. Para ti: todo el historial (pesando tiempo jugado y lo reciente). Sin historial, solo calificación.
    paraTi(n) {
      const items = candidatos.map(c => ({ r: c, puntaje: semillas.length ? (0.25 + 0.75 * afin(c)) * c.q : c.q, razon: razonAfin.get(c) || '' }));
      const juegos = fila(items, n);
      return juegos.length ? { id: 'parati', titulo: 'Para ti', juegos } : null;
    },
    // 3. Para jugar acompañado: multijugador o cooperativo (cooperativo pesa un poco más).
    acompanado(n) {
      const items = candidatos.filter(c => c.multi).map(c => ({ r: c, puntaje: (0.35 + 0.65 * afin(c)) * c.q * (c.coop ? 1.15 : 1),
        razon: c.coop ? 'Cooperativo' + (c.g.maxPlayers > 1 ? `, hasta ${c.g.maxPlayers} jugadores` : '') : c.g.maxPlayers > 1 ? `Hasta ${c.g.maxPlayers} jugadores` : 'Multijugador' }));
      const juegos = fila(items, n);
      return juegos.length ? { id: 'acompanado', titulo: 'Para jugar acompañado', juegos } : null;
    },
    // 4 y 5. En 3D / en 2D (deducido; ver `dimension`).
    en3D(n) { return porDimension('3d', 'En 3D', n); },
    en2D(n) { return porDimension('2d', 'En 2D', n); },
    // 6. Joyas que no has tocado: ninguna partida; los mejor calificados con votos suficientes.
    joyas(n) {
      const sinTocar = candidatos.filter(c => c.partidas === 0 && c.segundos === 0 && c.g.community && c.g.votes > 0);
      const minVotos = sinTocar.filter(c => c.g.votes >= 10).length >= 5 ? 10 : 3;
      const items = sinTocar.filter(c => c.g.votes >= minVotos).map(c => ({ r: c, puntaje: c.q * (0.9 + 0.1 * afin(c)) }));
      const juegos = fila(items, n);
      return juegos.length ? { id: 'joyas', titulo: 'Joyas que no has tocado', juegos } : null;
    },
    // 7. Más de tus series favoritas: series con más tiempo jugado o marcadas como favoritas.
    series(n) {
      const peso = new Map();
      for (const { r, w } of historial) for (const s of r.series) peso.set(s, (peso.get(s) || 0) + w);
      for (const [k, v] of Object.entries(favoritos)) if (v === true && k.startsWith('s:')) peso.set(k.slice(2), (peso.get(k.slice(2)) || 0) + 2);
      if (!peso.size) return null;
      const max = Math.max(...peso.values());
      const items = [];
      for (const c of candidatos) {
        let mejor = 0, cual = '';
        for (const s of c.series) { const p = peso.get(s) || 0; if (p > mejor) { mejor = p; cual = s; } }
        if (mejor > 0) items.push({ r: c, puntaje: (0.5 * mejor / max + 0.5) * c.q, razon: 'Serie ' + cual });
      }
      const juegos = fila(items, n);
      return juegos.length ? { id: 'series', titulo: 'Más de tus series favoritas', juegos } : null;
    },
    // 8. Partidas cortas: plataformas de arcade y géneros de partida rápida. Solo si hay suficientes.
    cortas(n) {
      const items = candidatos.filter(c => c.cat === 'Arcade' || c.generos.has('Pinball') || c.generos.has('Laberinto'))
        .map(c => ({ r: c, puntaje: (0.35 + 0.65 * afin(c)) * c.q }));
      if (items.length < o.minCortas) return null;
      const juegos = fila(items, n);
      return juegos.length >= o.minCortas ? { id: 'cortas', titulo: 'Partidas cortas', juegos } : null;
    },
  };
  function porDimension(d, titulo, n) {
    const items = candidatos.filter(c => c.dim === d).map(c => ({ r: c, puntaje: (0.35 + 0.65 * afin(c)) * c.q, razon: razonAfin.get(c) || '' }));
    const juegos = fila(items, n);
    return juegos.length ? { id: d, titulo, juegos } : null;
  }

  return {
    ...filas,
    // Todas las filas en el orden de la pantalla, sin las vacías. Un juego no se repite entre filas (sinRepetir).
    todas(n = o.porFila) {
      usados.clear(); compartir = !!o.sinRepetir;
      try { return ['porqueJugaste', 'paraTi', 'acompanado', 'en3D', 'en2D', 'joyas', 'series', 'cortas'].map(k => filas[k](n)).filter(Boolean); }
      finally { compartir = false; usados.clear(); }
    },
    // Para pruebas y depuración.
    get candidatos() { return candidatos.map(c => c.g.id); },
    rasgos: id => R.get(id),
    parecido: (a, b) => parecido(R.get(a), R.get(b)).v,
  };
}

module.exports = { crear, dimension, normTitulo, EXCEPCIONES, DEFAULTS, PESOS };
