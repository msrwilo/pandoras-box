// Pruebas del motor de recomendados (lib/recomendar.js). Biblioteca hecha aquí mismo, sin disco.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const R = require('../lib/recomendar.js');

const PLATS = [
  { name: 'Sega Genesis', category: 'Consoles', generation: 4, year: 1988 },
  { name: 'Super Nintendo Entertainment System', category: 'Consoles', generation: 4, year: 1990 },
  { name: 'Nintendo 64', category: 'Consoles', generation: 5, year: 1996 },
  { name: 'Sega Saturn', category: 'Consoles', generation: 5, year: 1994 },
  { name: 'Sony Playstation', category: 'Consoles', generation: 5, year: 1994 },
  { name: "Arcade 90's", category: 'Arcade', generation: null, year: 1990 },
];
let n = 0;
// Juego con los campos que deja meta.normalizeGame (solo los que usa el motor).
const J = (title, o = {}) => ({
  id: o.id || 'j' + (++n), title, platform: o.platform || 'Sega Genesis', year: o.year ?? 1992,
  genres: o.genres || ['Plataformas'], developer: o.developer || 'Sega', series: (o.series || []).join('; '), seriesList: o.series || [],
  modes: o.modes || ['Un jugador'], maxPlayers: o.maxPlayers ?? 1, community: o.community ?? 4, votes: o.votes ?? 100,
  stars: o.stars || null, playCount: o.playCount || 0, playTime: o.playTime || 0, lastPlayed: o.lastPlayed || '',
  lbFavorite: !!o.fav, appPath: o.appPath ?? 'C:\\juegos\\' + title + '.zip', apps: [],
});
const ids = fila => (fila ? fila.juegos.map(x => x.id) : []);

test('calificación ponderada: pocos votos pesan menos', () => {
  const juegos = [J('Muchos votos', { id: 'a', community: 4.5, votes: 500 }), J('Dos votos', { id: 'b', community: 5, votes: 2 }),
    J('Sin votos', { id: 'c', community: null, votes: 0 }), J('Relleno', { community: 3, votes: 50 })];
  const m = R.crear({ juegos, plataformas: PLATS });
  assert.ok(m.rasgos('a').calif > m.rasgos('b').calif, '4,5 con 500 votos va antes que 5,0 con 2');
  assert.ok(m.rasgos('b').calif > m.rasgos('c').calif, 'sin calificación queda abajo');
  // Las estrellas de Wilo cuentan la mitad.
  const m2 = R.crear({ juegos: [J('Con estrellas', { id: 'd', community: 3, votes: 1000, stars: 5 })], plataformas: PLATS });
  assert.ok(Math.abs(m2.rasgos('d').calif - 4) < 0.05);
});

test('candidatos: instalados, sin jugar o casi, sin el mismo título en otra consola', () => {
  const juegos = [
    J('Jugado mucho', { id: 'jug', playTime: 3 * 3600, playCount: 5 }),
    J('Jugado mucho (Japan)', { id: 'port', platform: 'Super Nintendo Entertainment System' }), // mismo título, otra versión
    J('Casi no', { id: 'casi', playTime: 5 * 60, playCount: 1 }),
    J('Muchas partidas cortas', { id: 'muchas', playTime: 60, playCount: 3 }),
    J('No instalado', { id: 'noinst', appPath: '' }),
    J('Nuevo', { id: 'nuevo' }),
  ];
  const m = R.crear({ juegos, plataformas: PLATS, stats: { nuevo: { plays: 0, seconds: 0, last: '' } } });
  assert.deepStrictEqual(m.candidatos.sort(), ['casi', 'nuevo']);
  // Las partidas de Pandora (estadisticas.json) se suman a las de LaunchBox.
  const m2 = R.crear({ juegos, plataformas: PLATS, stats: { casi: { plays: 1, seconds: 40 * 60, last: '2026-11-01' } } });
  assert.ok(!m2.candidatos.includes('casi'));
});

test('porque jugaste: sale del último juego, prefiere la misma serie y respeta el parecido mínimo', () => {
  const juegos = [
    J('Sonic the Hedgehog', { id: 's1', series: ['Sonic'], playTime: 7200, playCount: 3 }),
    J('Streets of Rage', { id: 'sor', genres: ["Beat 'em up"], playTime: 3600, playCount: 2 }),
    J('Sonic the Hedgehog 2', { id: 's2', series: ['Sonic'] }),
    J('Sonic 3', { id: 's3', series: ['Sonic'] }),
    J('Sonic & Knuckles', { id: 's4', series: ['Sonic'] }),
    J('Ristar', { id: 'ris' }),
    J('Golden Axe', { id: 'ga', genres: ["Beat 'em up"] }),
    J('Simulador lejano', { id: 'lejos', platform: 'Nintendo 64', year: 2001, genres: ['Simulador de vuelo'], developer: 'Otra' }),
  ];
  const stats = { s1: { plays: 1, seconds: 100, last: '2026-11-20', lastAt: '2026-11-20T20:00:00Z' }, sor: { plays: 1, seconds: 100, last: '2026-11-19' } };
  const m = R.crear({ juegos, plataformas: PLATS, stats });
  const f = m.porqueJugaste();
  assert.strictEqual(f.titulo, 'Porque jugaste Sonic the Hedgehog');
  assert.strictEqual(f.semilla, 's1');
  assert.ok(['s2', 's3', 's4'].includes(f.juegos[0].id), 'primero uno de la serie');
  assert.ok(f.juegos[0].razon.startsWith('Misma serie'));
  assert.strictEqual(ids(f).filter(x => ['s2', 's3', 's4'].includes(x)).length, 2, 'máximo 2 por serie');
  assert.ok(ids(f).includes('ris'));
  assert.ok(!ids(f).includes('lejos'), 'sin parecido mínimo no entra');
  assert.ok(!ids(f).includes('s1') && !ids(f).includes('sor'), 'no recomienda lo ya jugado');
});

test('poco historial: sin partidas, «Para ti» ordena por calificación; un favorito sirve de semilla', () => {
  const juegos = [J('Malo', { id: 'm', community: 2.5 }), J('Bueno', { id: 'b', community: 4.8, votes: 300 }), J('Medio', { id: 'x', community: 3.8 })];
  const m = R.crear({ juegos, plataformas: PLATS });
  assert.strictEqual(m.porqueJugaste(), null);
  assert.deepStrictEqual(ids(m.paraTi()), ['b', 'x', 'm']);
  const conFav = R.crear({ juegos: [...juegos, J('Favorito', { id: 'f', fav: true, series: ['Saga'] }), J('Favorito 2', { id: 'f2', series: ['Saga'] })], plataformas: PLATS });
  const f = conFav.porqueJugaste();
  assert.strictEqual(f.titulo, 'Porque te gusta Favorito');
  // Parecido × calificación: «Bueno» (4,8, mismo género, desarrolladora y época) puede ir antes que el de la serie.
  assert.ok(f.juegos.find(x => x.id === 'f2').razon.startsWith('Misma serie'));
});

test('para ti: pesa el tiempo jugado', () => {
  const juegos = [
    J('RPG eterno', { id: 'rpg', genres: ['RPG'], developer: 'Square', playTime: 80 * 3600, playCount: 40, platform: 'Super Nintendo Entertainment System' }),
    J('Plataformas breve', { id: 'pl', genres: ['Plataformas'], playTime: 25 * 60, playCount: 3 }),
    J('Otro RPG', { id: 'rpg2', genres: ['RPG'], developer: 'Square', platform: 'Super Nintendo Entertainment System', community: 4 }),
    J('Otro plataformas', { id: 'pl2', genres: ['Plataformas'], community: 4 }),
  ];
  const m = R.crear({ juegos, plataformas: PLATS, ahora: '2026-11-22' });
  assert.deepStrictEqual(ids(m.paraTi()), ['rpg2', 'pl2']);
});

test('acompañado, joyas y cortas', () => {
  const juegos = [
    J('Coop', { id: 'coop', modes: ['Cooperativo'], maxPlayers: 2 }),
    J('Versus', { id: 'vs', modes: ['Multijugador'], maxPlayers: 4 }),
    J('Solo', { id: 'solo' }),
    J('Joya', { id: 'joya', community: 4.9, votes: 400 }),
    J('Joya con 1 voto', { id: 'joya1', community: 5, votes: 1 }),
    J('Probado', { id: 'probado', community: 4.9, votes: 400, playTime: 120, playCount: 1 }),
  ];
  const m = R.crear({ juegos, plataformas: PLATS });
  assert.deepStrictEqual(ids(m.acompanado()).sort(), ['coop', 'vs']);
  assert.match(m.acompanado().juegos.find(x => x.id === 'coop').razon, /Cooperativo/);
  const j = ids(m.joyas());
  assert.strictEqual(j[0], 'joya');
  assert.ok(!j.includes('probado'), 'joyas: solo sin ninguna partida');
  assert.ok(!j.includes('joya1'), 'joyas: con pocos votos no entra');
  assert.ok(m.candidatos.includes('probado'), 'pero «casi no jugado» sí es candidato en las demás filas');
  // Cortas: solo si hay al menos 5.
  assert.strictEqual(m.cortas(), null);
  const arc = Array.from({ length: 6 }, (_, i) => J('Arcade ' + i, { id: 'a' + i, platform: "Arcade 90's", genres: ['Disparos'] }));
  assert.strictEqual(R.crear({ juegos: [...juegos, ...arc], plataformas: PLATS }).cortas().juegos.length, 6);
});

test('2D y 3D: plataforma, género y excepciones', () => {
  const p = name => PLATS.find(x => x.name === name);
  const d = (title, platform, genres, exc) => R.dimension({ id: 'x', title, platform, genres }, p(platform), exc);
  assert.strictEqual(d('Super Mario World', 'Super Nintendo Entertainment System', ['Plataformas']), '2d');
  assert.strictEqual(d('Star Fox', 'Super Nintendo Entertainment System', ['Disparos']), '3d');
  assert.strictEqual(d('Super Mario 64', 'Nintendo 64', ['Plataformas']), '3d');
  assert.strictEqual(d('Puzzle Fighter', 'Sega Saturn', ['Puzle']), '2d');
  assert.strictEqual(d('Gran Turismo', 'Sony Playstation', ['Carreras']), '3d');
  assert.strictEqual(d('Castlevania: Symphony of the Night', 'Sony Playstation', ['Acción']), '2d');
  assert.strictEqual(d('Tekken 3', 'Sony Playstation', ['Pelea']), '3d');
  assert.strictEqual(d('Darkstalkers 3', 'Sony Playstation', ['Pelea']), '2d');
  // Las excepciones de Wilo mandan (por id o por título).
  assert.strictEqual(d('Super Mario World', 'Super Nintendo Entertainment System', ['Plataformas'], { x: '3d' }), '3d');
  assert.strictEqual(d('Sonic R', 'Sega Saturn', ['Carreras'], { 't:sonic r': '2d' }), '2d');
  // Un título que empieza igual pero es otra palabra no cuenta («Doomsday» no es Doom).
  assert.strictEqual(d('Doomsday Warrior', 'Super Nintendo Entertainment System', ['Pelea']), '2d');
  assert.strictEqual(R.dimension({ title: 'X', platform: 'Desconocida', genres: [] }, {}), null);
});

test('filas: máximo 2 por serie, sin repetir juego entre filas y en orden', () => {
  const juegos = [J('Sonic', { id: 'hist', series: ['Sonic'], playTime: 7200, playCount: 4, modes: ['Multijugador'], maxPlayers: 2 })];
  for (let i = 0; i < 6; i++) juegos.push(J('Sonic ' + (i + 2), { series: ['Sonic'], modes: ['Multijugador'], maxPlayers: 2, community: 4.5 }));
  for (let i = 0; i < 150; i++) juegos.push(J('Otro ' + i, { genres: [i % 2 ? 'Plataformas' : 'Acción'], community: 3 + (i % 10) / 5, platform: i % 3 ? 'Sega Genesis' : 'Nintendo 64' }));
  const m = R.crear({ juegos, plataformas: PLATS, stats: { hist: { plays: 1, seconds: 10, last: '2026-11-21' } } });
  const filas = m.todas(10);
  const orden = ['porque', 'parati', 'acompanado', '3d', '2d', 'joyas', 'series', 'cortas'];
  const got = filas.map(f => f.id);
  assert.deepStrictEqual(got, orden.filter(k => got.includes(k)), 'en el orden de la pantalla');
  for (const k of ['porque', 'parati', 'acompanado', '3d', '2d', 'joyas']) assert.ok(got.includes(k), 'falta ' + k);
  const vistos = new Set();
  for (const f of filas) {
    assert.ok(f.juegos.length <= 10);
    const porSerie = f.juegos.filter(x => x.juego.seriesList.includes('Sonic')).length;
    assert.ok(porSerie <= 2, `${f.id}: ${porSerie} de Sonic`);
    for (const x of f.juegos) { assert.ok(!vistos.has(x.id), `${x.id} repetido en ${f.id}`); vistos.add(x.id); }
    for (let i = 1; i < f.juegos.length; i++) assert.ok(f.juegos[i - 1].puntaje >= f.juegos[i].puntaje);
    assert.ok(f.juegos.every(x => typeof x.razon === 'string' && x.razon));
  }
  // Las filas sueltas no se quitan juegos entre sí; solo todas() lo hace.
  assert.ok(m.paraTi(10).juegos.length >= m.todas(10)[1].juegos.length);
});

test('biblioteca grande: 20 000 juegos en menos de 3 s', () => {
  const genres = ['Plataformas', 'RPG', 'Acción', 'Pelea', 'Carreras', 'Puzle', 'Disparos', 'Deportes'];
  const juegos = Array.from({ length: 20000 }, (_, i) => J('Juego ' + i, { id: 'g' + i, platform: PLATS[i % PLATS.length].name, genres: [genres[i % 8], genres[(i * 7) % 8]],
    developer: 'Dev ' + (i % 300), series: i % 5 ? [] : ['Serie ' + (i % 400)], community: 2 + (i % 30) / 10, votes: i % 500, year: 1985 + (i % 25),
    playTime: i % 97 === 0 ? 3600 * (i % 7 + 1) : 0, playCount: i % 97 === 0 ? 2 : 0, modes: i % 4 ? ['Un jugador'] : ['Multijugador'], maxPlayers: i % 4 ? 1 : 2 }));
  const stats = { g0: { plays: 1, seconds: 1000, last: '2026-11-21' } };
  const t0 = Date.now();
  const filas = R.crear({ juegos, plataformas: PLATS, stats, ahora: '2026-11-22' }).todas(20);
  const ms = Date.now() - t0;
  assert.ok(filas.length >= 6);
  assert.ok(ms < 3000, `tardó ${ms} ms`);
});
