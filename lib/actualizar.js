// Actualización automática desde GitHub (msrwilo/pandoras-box, rama main).
//
// Cómo funciona:
//  1. Buscar: pregunta a GitHub cuál es el último commit de main. Si es distinto del que tiene
//     instalado, compara archivo por archivo (con la huella de git de cada uno) y descarga solo
//     los que cambiaron a datos/actualizacion/pendiente. Cada archivo descargado se verifica con
//     su huella; los .js del programa (no los de public/) se revisan para que no tengan errores
//     de escritura. Si algo falla, no se instala nada.
//  2. Instalar: al arrancar Pandora, antes de cargar el servidor, copia lo pendiente sobre el
//     programa. Lo que se reemplaza queda en datos/actualizacion/respaldo; lo que se quita va a
//     datos/actualizacion/papelera (no se borra).
//  3. Si después de instalar Pandora no logra arrancar, regresa sola a la versión anterior y no
//     vuelve a intentar ese commit.
//
// Nunca toca la carpeta datos (favoritos, ajustes, estadísticas, logos, marcas) ni node_modules.
// Si la actualización necesita otras dependencias o otra versión de Electron, no se instala sola:
// avisa que hay que descargar el zip nuevo.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const Module = require('module');

const REPO = 'msrwilo/pandoras-box';
const RAMA = 'main';
const API = `https://api.github.com/repos/${REPO}`;
const RAW = `https://raw.githubusercontent.com/${REPO}`;

// Lo que no forma parte del programa instalado.
const EXCLUIR = [
  /^docs\/(?!GUIA\.md$)/, /^test\//, /^\.github\//, /^\.gitignore$/, /^\.gitattributes$/,
  /^README/i, /^THIRD_PARTY/i, /^LICENSE/i, /^config\.json$/, /^node_modules\//, /^datos\//,
];
const incluido = p => !EXCLUIR.some(r => r.test(p));

function crear({ appDir, dataDir, log = () => {} }) {
  const base = path.join(dataDir, 'actualizacion');
  const ESTADO = path.join(base, 'estado.json');
  const PEND = path.join(base, 'pendiente');
  const RESP = path.join(base, 'respaldo');
  const PAPELERA = path.join(base, 'papelera');

  const leer = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
  const escribir = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 2)); };
  const estado = () => leer(ESTADO, {});
  const huella = buf => crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
  const huellaLocal = rel => { try { return huella(fs.readFileSync(path.join(appDir, rel))); } catch { return null; } };
  // Mover sin borrar; si el destino está en otra unidad, copiar y luego quitar el original.
  const mover = (de, a) => {
    fs.mkdirSync(path.dirname(a), { recursive: true });
    try { fs.renameSync(de, a); } catch { fs.copyFileSync(de, a); fs.rmSync(de, { force: true }); }
  };
  const poner = (de, a) => { // copia atómica: primero a .nuevo y luego se renombra encima
    fs.mkdirSync(path.dirname(a), { recursive: true });
    const tmp = a + '.nuevo';
    fs.copyFileSync(de, tmp); fs.renameSync(tmp, a);
  };

  async function pedir(url, tipo = 'json') {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'PandorasBox-actualizador', Accept: tipo === 'sha' ? 'application/vnd.github.sha' : 'application/vnd.github+json' },
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) throw new Error(`GitHub respondió ${r.status} en ${url.replace(/^https:\/\/[^/]+/, '')}`);
    if (tipo === 'json') return r.json();
    if (tipo === 'sha') return (await r.text()).trim();
    return Buffer.from(await r.arrayBuffer());
  }

  // ¿Se puede instalar sin reinstalar? Mismas dependencias y misma versión mayor de Electron.
  function compatible(pkgNuevo) {
    let local = {};
    try { local = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8')); } catch {}
    const deps = o => JSON.stringify(Object.entries(o || {}).sort());
    if (deps(pkgNuevo.dependencies) !== deps(local.dependencies)) return 'cambian las dependencias (node_modules)';
    const mayor = v => String(v || '').replace(/^[^\d]*/, '').split('.')[0];
    const elNuevo = mayor(pkgNuevo.devDependencies?.electron);
    const elActual = mayor(process.versions.electron || local.devDependencies?.electron);
    if (elNuevo && elActual && elNuevo !== elActual) return `cambia Electron (${elActual} → ${elNuevo})`;
    return null;
  }

  // Revisa que los .js del proceso principal (main, server, lib) no tengan errores de escritura.
  function sintaxis(rel, buf) {
    if (!/\.js$/.test(rel) || rel.startsWith('public/')) return null;
    try { new vm.Script(Module.wrap(buf.toString('utf8')), { filename: rel }); return null; }
    catch (e) { return `${rel}: ${e.message}`; }
  }

  let ocupado = false;
  // Devuelve { estado: 'al-dia' | 'lista' | 'requiere-zip' | 'error', ... }
  async function buscar() {
    if (ocupado) return { estado: 'ocupado' };
    ocupado = true;
    try {
      const st = estado();
      const sha = await pedir(`${API}/commits/${RAMA}`, 'sha');
      if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('respuesta rara de GitHub');
      const pend = leer(path.join(PEND, 'manifiesto.json'), null);
      if (pend && pend.sha === sha) return { estado: 'lista', sha, cambios: pend.cambia.length + pend.quita.length };
      if (st.sha === sha) return { estado: 'al-dia', sha };
      if (st.fallida === sha) return { estado: 'al-dia', sha, nota: 'ese commit falló al arrancar; se espera uno nuevo' };
      if (st.requiereZip === sha) return { estado: 'requiere-zip', sha, motivo: st.motivo };

      const arbol = await pedir(`${API}/git/trees/${sha}?recursive=1`);
      if (arbol.truncated) throw new Error('el repositorio es demasiado grande para compararlo');
      const archivos = arbol.tree.filter(t => t.type === 'blob' && incluido(t.path));
      // Seguro: nunca instalar una versión que ya no trae el actualizador (sería quedarse sin él).
      if (!archivos.some(t => t.path === 'lib/actualizar.js')) {
        log(`Actualización: ${sha.slice(0, 7)} no trae lib/actualizar.js; no se instala.`);
        return { estado: 'al-dia', sha, nota: 'la versión de GitHub no tiene actualizador' };
      }
      const pkg = archivos.find(t => t.path === 'package.json');
      if (pkg) {
        const motivo = compatible(JSON.parse((await pedir(`${RAW}/${sha}/package.json`, 'buf')).toString('utf8')));
        if (motivo) {
          escribir(ESTADO, { ...st, requiereZip: sha, motivo });
          log(`Actualización: ${sha.slice(0, 7)} no se instala sola porque ${motivo}. Descarga el zip nuevo.`);
          return { estado: 'requiere-zip', sha, motivo };
        }
      }
      const cambia = archivos.filter(t => huellaLocal(t.path) !== t.sha);
      const nuevos = new Set(archivos.map(t => t.path));
      const quita = (st.archivos || []).filter(p => !nuevos.has(p) && fs.existsSync(path.join(appDir, p)));

      if (!cambia.length && !quita.length) {
        escribir(ESTADO, { ...st, sha, archivos: [...nuevos], revisada: new Date().toISOString() });
        return { estado: 'al-dia', sha };
      }
      // Descarga a una carpeta aparte; solo cuando todo llegó bien queda como pendiente.
      const tmp = PEND + '.descargando';
      fs.rmSync(tmp, { recursive: true, force: true });
      for (const t of cambia) {
        const url = `${RAW}/${sha}/${t.path.split('/').map(encodeURIComponent).join('/')}`;
        const buf = await pedir(url, 'buf');
        if (huella(buf) !== t.sha) throw new Error(`${t.path} llegó dañado`);
        const err = sintaxis(t.path, buf);
        if (err) throw new Error(`error de escritura en ${err}`);
        fs.mkdirSync(path.dirname(path.join(tmp, t.path)), { recursive: true });
        fs.writeFileSync(path.join(tmp, t.path), buf);
      }
      escribir(path.join(tmp, 'manifiesto.json'), {
        sha, anterior: st.sha || null, cambia: cambia.map(t => t.path), quita, archivos: [...nuevos],
        descargada: new Date().toISOString(),
      });
      fs.rmSync(PEND, { recursive: true, force: true });
      fs.renameSync(tmp, PEND);
      log(`Actualización: descargada ${sha.slice(0, 7)} (${cambia.length} archivos cambian${quita.length ? `, ${quita.length} se quitan` : ''}). Se instala al reiniciar Pandora.`);
      return { estado: 'lista', sha, cambios: cambia.length + quita.length };
    } catch (e) {
      log(`Actualización: no se pudo revisar (${e.message})`);
      return { estado: 'error', error: e.message };
    } finally { ocupado = false; }
  }

  // Al arrancar: instala lo pendiente. Devuelve la lista de archivos tocados (vacía si no había nada).
  function instalarPendiente() {
    const man = leer(path.join(PEND, 'manifiesto.json'), null);
    if (!man) return [];
    try {
      fs.rmSync(RESP, { recursive: true, force: true });
      const sinOriginal = [];
      for (const rel of [...man.cambia, ...man.quita]) {
        const dst = path.join(appDir, rel);
        if (fs.existsSync(dst)) { fs.mkdirSync(path.dirname(path.join(RESP, rel)), { recursive: true }); fs.copyFileSync(dst, path.join(RESP, rel)); }
        else sinOriginal.push(rel);
      }
      escribir(path.join(RESP, 'manifiesto.json'), { ...man, sinOriginal });
      for (const rel of man.cambia) poner(path.join(PEND, rel), path.join(appDir, rel));
      for (const rel of man.quita) mover(path.join(appDir, rel), path.join(PAPELERA, man.sha.slice(0, 7), rel));
      const st = estado();
      escribir(ESTADO, { sha: man.sha, anterior: man.anterior, archivos: man.archivos, instalada: new Date().toISOString(), fallida: st.fallida });
      fs.rmSync(PEND, { recursive: true, force: true });
      log(`Actualización: instalada ${man.sha.slice(0, 7)} (${man.cambia.length + man.quita.length} archivos).`);
      return [...man.cambia, ...man.quita];
    } catch (e) {
      log(`Actualización: no se pudo instalar (${e.message}); se regresa a la versión anterior.`);
      revertir();
      return [];
    }
  }

  // Regresa a lo que había antes de la última instalación y marca ese commit como fallido.
  function revertir() {
    const man = leer(path.join(RESP, 'manifiesto.json'), null);
    if (!man) return false;
    for (const rel of [...man.cambia, ...man.quita]) {
      const r = path.join(RESP, rel);
      if (fs.existsSync(r)) poner(r, path.join(appDir, rel));
    }
    for (const rel of man.sinOriginal || []) {
      const p = path.join(appDir, rel);
      if (fs.existsSync(p)) mover(p, path.join(PAPELERA, man.sha.slice(0, 7) + '-fallida', rel));
    }
    const st = estado();
    escribir(ESTADO, { ...st, sha: man.anterior, fallida: man.sha });
    fs.rmSync(PEND, { recursive: true, force: true });
    log(`Actualización: ${man.sha.slice(0, 7)} no arrancó; se regresó a la versión anterior.`);
    return true;
  }

  const hayPendiente = () => fs.existsSync(path.join(PEND, 'manifiesto.json'));
  const version = () => { const s = estado(); return { sha: s.sha || null, instalada: s.instalada || null }; };
  return { buscar, instalarPendiente, revertir, hayPendiente, version };
}

module.exports = { crear, _test: { incluido } };
