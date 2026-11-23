// Pruebas básicas: node --test (sin dependencias). Usan una biblioteca de LaunchBox mínima hecha aquí mismo.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const meta = require('../lib/meta.js');
const { sameName, COMPANY_DESC, NOT_COMPANY, BAD_FILE } = require('../lib/logos.js')._test;

test('modos de juego', () => {
  const g = meta.normalizeGame({ ID: '1', Title: 'X', Platform: 'P', PlayMode: 'Un Jugador; Multijugador; Cooperativo', MaxPlayers: '2' });
  const ids = meta.PLAY_MODES.filter(m => m.test(g)).map(m => m.id);
  assert.deepStrictEqual(ids, ['solo', 'multi', 'coop', 'p2']);
  assert.ok(!meta.PLAY_MODES.some(m => m.id === 'simul' || m.id === 'turnos'));
  // Un juego marcado multijugador con dato de 1 jugador no cuenta como «Un jugador».
  const h = meta.normalizeGame({ ID: '2', Title: 'Y', Platform: 'P', PlayMode: 'Multijugador', MaxPlayers: '1' });
  assert.ok(!meta.PLAY_MODES.find(m => m.id === 'solo').test(h));
});

test('año y generación de plataformas', () => {
  assert.deepStrictEqual(meta.platformInfo('Sega Genesis'), { year: 1988, gen: 4 });
  assert.deepStrictEqual(meta.platformInfo('Atari Jaguar', '1993-11-23T00:00:00', 'Consoles'), { year: 1993, gen: 5 });
  assert.deepStrictEqual(meta.platformInfo('Commodore 64', '1982-08-01', 'Computers'), { year: 1982, gen: null });
  assert.deepStrictEqual(meta.platformInfo('Nada'), { year: null, gen: null });
});

test('logos: el nombre tiene que ser el de la empresa', () => {
  assert.ok(sameName('Tose (company)', 'TOSE'));
  assert.ok(sameName('Bandai Namco Entertainment', 'Bandai Namco'));
  assert.ok(!sameName('Infosys', 'ITL'));
  assert.ok(!sameName('Walt Disney Imagineering', 'Imagineering'));
  assert.ok(NOT_COMPANY.test('American adult animated sitcom'));
  assert.ok(COMPANY_DESC.test('Japanese video game developer'));
  assert.ok(BAD_FILE.test('Wiktionary-logo-en-v2.svg'));
});

test('servidor: biblioteca, marcas y peticiones protegidas', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pandora-'));
  const lb = path.join(tmp, 'LaunchBox'), datos = path.join(tmp, 'datos');
  fs.mkdirSync(path.join(lb, 'Data', 'Platforms'), { recursive: true });
  fs.writeFileSync(path.join(lb, 'Data', 'Platforms.xml'), '<?xml version="1.0"?>\n<LaunchBox><Platform><Name>Sega Genesis</Name><Category>Consoles</Category></Platform></LaunchBox>');
  fs.writeFileSync(path.join(lb, 'Data', 'Platforms', 'Sega Genesis.xml'), '<?xml version="1.0"?>\n<LaunchBox>' +
    '<Game><ID>a</ID><Title>Uno</Title><Platform>Sega Genesis</Platform><Developer>Sega</Developer><PlayMode>Un Jugador</PlayMode><MaxPlayers>1</MaxPlayers><Genre>Platform</Genre></Game>' +
    '<Game><ID>b</ID><Title>Dos</Title><Platform>Sega Genesis</Platform><Developer>Capcom</Developer><PlayMode>Un Jugador; Multijugador</PlayMode><MaxPlayers>2</MaxPlayers><Genre>Fighting</Genre></Game>' +
    // 24 juegos más (g01 a g24) para probar Recientes y su límite de 20.
    Array.from({ length: 24 }, (_, i) => { const n = String(i + 1).padStart(2, '0'); return `<Game><ID>g${n}</ID><Title>Juego ${n}</Title><Platform>Sega Genesis</Platform><Developer>Sega</Developer><PlayMode>Un Jugador</PlayMode><MaxPlayers>1</MaxPlayers><Genre>Platform</Genre><ApplicationPath>Games\\${n}.zip</ApplicationPath><CommunityStarRating>${(3 + i / 10).toFixed(1)}</CommunityStarRating><CommunityStarRatingTotalVotes>${20 + i}</CommunityStarRatingTotalVotes></Game>`; }).join('') +
    '</LaunchBox>');
  // Estadísticas para Recientes: 22 juegos con partidas, uno que ya no está en la biblioteca y uno sin fecha.
  // g01 a g20: un día distinto cada uno (g20 es el más nuevo). a y b: el mismo día que g20 pero con hora (más nuevos).
  // g21 y g22: mismo día (el más viejo), solo fecha, sin hora: se ordenan por el orden del archivo.
  const stats = {};
  stats.g21 = { plays: 1, seconds: 60, last: '2026-01-01' };
  stats.g22 = { plays: 1, seconds: 60, last: '2026-01-01' };
  stats.fantasma = { plays: 1, seconds: 60, last: '2026-11-30' };
  stats.g23 = { plays: 0, seconds: 0, last: '' };
  for (let i = 1; i <= 20; i++) stats['g' + String(i).padStart(2, '0')] = { plays: 1, seconds: 60, last: `2026-02-${String(i).padStart(2, '0')}` };
  stats.g01.last = '2026-02-05'; // empata con g05 (solo fecha): g05 se registró después en el archivo, va primero
  stats.a = { plays: 2, seconds: 100, last: '2026-02-20', lastAt: '2026-02-20T10:00:00.000Z' };
  stats.b = { plays: 1, seconds: 100, last: '2026-02-20', lastAt: '2026-02-20T18:30:00.000Z' };
  fs.mkdirSync(datos, { recursive: true });
  fs.writeFileSync(path.join(datos, 'estadisticas.json'), JSON.stringify(stats));
  fs.mkdirSync(path.join(datos, 'marcas', 'anillo'), { recursive: true });
  fs.writeFileSync(path.join(datos, 'marcas', 'anillo', 'logo.png'), 'x');
  fs.writeFileSync(path.join(datos, 'marcas', 'anillo', 'move.wav'), 'x');
  fs.writeFileSync(path.join(datos, 'config.json'), JSON.stringify({ launchboxPath: lb }));
  process.env.PANDORA_DATA = datos;
  const server = require('../server.js');
  const port = await server.start(0);
  const base = 'http://127.0.0.1:' + port;
  const lib = await (await fetch(base + '/api/library')).json();
  assert.strictEqual(lib.total, 26);
  assert.deepStrictEqual(lib.developersAll.map(d => d.label), ['Capcom', 'Sega']);
  // Recientes: máximo 20, del más nuevo al más viejo; sin juegos fuera de la biblioteca ni partidas sin fecha.
  assert.deepStrictEqual(lib.recent, { count: 20 });
  assert.deepStrictEqual(await (await fetch(base + '/api/recent')).json(), { count: 20 });
  const rec = await (await fetch(base + '/api/games?mode=recent')).json();
  assert.strictEqual(rec.games.length, 20);
  assert.deepStrictEqual(rec.games.slice(0, 4).map(g => g.id), ['b', 'a', 'g20', 'g19']);
  assert.deepStrictEqual(rec.games.slice(17).map(g => g.id), ['g05', 'g01', 'g04']); // empate de día: gana el registrado después
  assert.ok(!rec.games.some(g => g.id === 'g02' || g.id === 'g03')); // quedan fuera por el límite de 20
  assert.ok(!rec.games.some(g => ['fantasma', 'g21', 'g22', 'g23'].includes(g.id)));
  // Recomendados (etapa 3b): filas con juegos de la biblioteca, cada uno con su razón y sus medios; el resumen coincide.
  const recs = await (await fetch(base + '/api/recomendados')).json();
  assert.ok(recs.filas.length >= 2, 'hay filas de recomendados');
  assert.ok(recs.filas.some(f => f.id === 'parati'));
  const vistos = new Set();
  for (const f of recs.filas) {
    assert.ok(f.titulo && f.juegos.length > 0 && f.juegos.length <= 20, f.id);
    for (const g of f.juegos) {
      assert.ok(typeof g.razon === 'string' && g.media && g.title, f.id + ' ' + g.id);
      assert.ok(!('appPath' in g), 'no se filtran rutas');
      assert.ok(!vistos.has(g.id), 'un juego no se repite entre filas: ' + g.id); vistos.add(g.id);
    }
  }
  const resumen = await (await fetch(base + '/api/recomendados?resumen=1')).json();
  assert.deepStrictEqual(resumen.filas, recs.filas.map(f => ({ id: f.id, titulo: f.titulo, count: f.juegos.length })));
  assert.deepStrictEqual(lib.recs, resumen.filas);
  const mk = await (await fetch(base + '/api/marcas')).json();
  assert.ok(mk.temas.anillo.logo && mk.temas.anillo.sounds.move);
  assert.strictEqual((await fetch(base + '/api/settings', { method: 'POST', body: '{}' })).status, 403);
  assert.strictEqual((await fetch(base + '/api/settings', { method: 'POST', body: '{}', headers: { 'X-Pandora': '1' } })).status, 200);
  assert.strictEqual((await fetch(base + '/api/dry?id=a')).status, 404);
  assert.strictEqual((await fetch(base + '/%E0%A4%A')).status, 400);
});

test('actualización: solo se instala el programa, nunca datos ni documentos', () => {
  const { incluido } = require('../lib/actualizar.js')._test;
  for (const p of ['main.js', 'server.js', 'preload.js', 'package.json', 'lib/launch.js', 'public/app.js', 'public/themes/cubo/theme.css', 'docs/GUIA.md']) assert.ok(incluido(p), p);
  for (const p of ['datos/ajustes.json', 'node_modules/koffi/index.js', 'docs/capturas/a.png', 'test/pandora.test.js', 'README.md', 'LICENSE', 'config.json']) assert.ok(!incluido(p), p);
});

// El servidor y sus búsquedas en segundo plano siguen vivos: se cierra el proceso al terminar.
test.after(() => setTimeout(() => process.exit(process.exitCode || 0), 300).unref());
