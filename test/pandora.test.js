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
    '<Game><ID>b</ID><Title>Dos</Title><Platform>Sega Genesis</Platform><Developer>Capcom</Developer><PlayMode>Un Jugador; Multijugador</PlayMode><MaxPlayers>2</MaxPlayers><Genre>Fighting</Genre></Game></LaunchBox>');
  fs.mkdirSync(path.join(datos, 'marcas', 'anillo'), { recursive: true });
  fs.writeFileSync(path.join(datos, 'marcas', 'anillo', 'logo.png'), 'x');
  fs.writeFileSync(path.join(datos, 'marcas', 'anillo', 'move.wav'), 'x');
  fs.writeFileSync(path.join(datos, 'config.json'), JSON.stringify({ launchboxPath: lb }));
  process.env.PANDORA_DATA = datos;
  const server = require('../server.js');
  const port = await server.start(0);
  const base = 'http://127.0.0.1:' + port;
  const lib = await (await fetch(base + '/api/library')).json();
  assert.strictEqual(lib.total, 2);
  assert.deepStrictEqual(lib.developersAll.map(d => d.label), ['Capcom', 'Sega']);
  const mk = await (await fetch(base + '/api/marcas')).json();
  assert.ok(mk.temas.anillo.logo && mk.temas.anillo.sounds.move);
  assert.strictEqual((await fetch(base + '/api/settings', { method: 'POST', body: '{}' })).status, 403);
  assert.strictEqual((await fetch(base + '/api/settings', { method: 'POST', body: '{}', headers: { 'X-Pandora': '1' } })).status, 200);
  assert.strictEqual((await fetch(base + '/api/dry?id=a')).status, 404);
  assert.strictEqual((await fetch(base + '/%E0%A4%A')).status, 400);
});

// El servidor y sus búsquedas en segundo plano siguen vivos: se cierra el proceso al terminar.
test.after(() => setTimeout(() => process.exit(process.exitCode || 0), 300).unref());
