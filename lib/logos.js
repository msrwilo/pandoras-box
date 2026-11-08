// Logos de las desarrolladoras: LaunchBox no los tiene, así que Pandora los busca una vez en Wikidata
// (propiedad «logotipo», P154) y, si no, en Wikipedia; los guarda en datos/logos/desarrolladoras.
// Si pones tu propia imagen ahí (mismo nombre de la empresa, .png/.svg/.jpg/.webp), se usa la tuya.
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const UA = 'Pandora/1.0 (frontend personal para LaunchBox)';
const EXT = ['.png', '.svg', '.webp', '.jpg', '.jpeg'];
// Tipos de entidad que cuentan como empresa de videojuegos (desarrolladora, editora, empresa, estudio…).
const COMPANY = new Set(['Q210167', 'Q1137109', 'Q4830453', 'Q783794', 'Q6881511', 'Q891723', 'Q18388277', 'Q1589009', 'Q43229', 'Q2085381', 'Q161726']);

function get(url, { json = true, hops = 0 } = {}) {
  return new Promise((ok, ko) => {
    const req = https.get(url, { headers: { 'User-Agent': UA, Accept: json ? 'application/json' : 'image/*' }, timeout: 15000 }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && hops < 5) { res.resume(); return ok(get(new URL(res.headers.location, url).href, { json, hops: hops + 1 })); }
      if (res.statusCode !== 200) { res.resume(); return ko(new Error('HTTP ' + res.statusCode)); }
      const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (!json) return ok({ buf, type: res.headers['content-type'] || '' });
        try { ok(JSON.parse(buf.toString('utf8'))); } catch (e) { ko(e); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('tiempo agotado')));
    req.on('error', ko);
  });
}
const q = o => Object.entries(o).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
const safe = name => name.replace(/[\\/:*?"<>|]/g, '_').trim();

// Busca el archivo de logo en Wikidata: entre los resultados, el primero que sea empresa y tenga P154.
async function fromWikidata(name) {
  const s = await get('https://www.wikidata.org/w/api.php?' + q({ action: 'wbsearchentities', search: name, language: 'en', type: 'item', limit: 7, format: 'json' }));
  const ids = (s.search || []).map(x => x.id);
  if (!ids.length) return null;
  const e = await get('https://www.wikidata.org/w/api.php?' + q({ action: 'wbgetentities', ids: ids.join('|'), props: 'claims', format: 'json' }));
  let fallback = null;
  for (const id of ids) {
    const c = e.entities?.[id]?.claims || {};
    const logo = c.P154?.[0]?.mainsnak?.datavalue?.value;
    if (!logo) continue;
    const types = (c.P31 || []).map(x => x.mainsnak?.datavalue?.value?.id);
    if (types.some(t => COMPANY.has(t))) return logo;
    fallback ||= logo;
  }
  return fallback;
}
// Respaldo: en el artículo de Wikipedia, una imagen cuyo nombre diga «logo».
async function fromWikipedia(name) {
  const s = await get('https://en.wikipedia.org/w/api.php?' + q({ action: 'query', list: 'search', srsearch: name + ' video game company', srlimit: 3, format: 'json' }));
  const title = s.query?.search?.[0]?.title;
  if (!title) return null;
  const im = await get('https://en.wikipedia.org/w/api.php?' + q({ action: 'query', prop: 'images', titles: title, imlimit: 100, format: 'json' }));
  const page = Object.values(im.query?.pages || {})[0];
  const word = name.toLowerCase().split(/\s+/)[0];
  const files = (page?.images || []).map(i => i.title).filter(t => /logo/i.test(t) && !/commons|wiki|ambox|edit|question|flag|symbol|icon|padlock/i.test(t));
  const best = files.find(f => f.toLowerCase().includes(word)) || files[0];
  return best ? best.replace(/^File:/, '') : null;
}

module.exports = function createLogos({ dataDir, log = () => {} }) {
  const dir = path.join(dataDir, 'logos', 'desarrolladoras');
  const known = new Map(); // nombre -> archivo (o null si ya se buscó sin éxito)
  let queue = [], busy = false;

  function find(name) {
    if (known.has(name)) return known.get(name);
    const base = path.join(dir, safe(name));
    for (const e of EXT) if (fs.existsSync(base + e)) { known.set(name, path.basename(base + e)); return known.get(name); }
    if (fs.existsSync(base + '.none')) { known.set(name, null); return null; }
    return undefined; // aún no se ha buscado
  }
  async function fetchOne(name) {
    let file = null, how = '', fails = 0, lastErr = null;
    try { file = await fromWikidata(name); how = 'Wikidata'; } catch (e) { fails++; lastErr = e; }
    if (!file) { try { file = await fromWikipedia(name); how = 'Wikipedia'; } catch (e) { fails++; lastErr = e; } }
    // Si fallaron las dos búsquedas (sin internet, por ejemplo), no se marca como «sin logo»: se reintenta otro día.
    if (!file && fails === 2) throw lastErr;
    fs.mkdirSync(dir, { recursive: true });
    const base = path.join(dir, safe(name));
    if (!file) { fs.writeFileSync(base + '.none', ''); known.set(name, null); log(`Logo de ${name}: no encontrado`); return; }
    // Commons entrega una versión PNG del tamaño pedido (también de los SVG).
    const img = await get('https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(file.replace(/ /g, '_')) + '?width=512', { json: false });
    const ext = /svg/.test(img.type) ? '.svg' : /jpe?g/.test(img.type) ? '.jpg' : /webp/.test(img.type) ? '.webp' : '.png';
    fs.writeFileSync(base + ext, img.buf);
    known.set(name, path.basename(base + ext));
    log(`Logo de ${name}: ${file} (${how})`);
  }
  async function pump() {
    if (busy) return; busy = true;
    while (queue.length) {
      const name = queue.shift();
      if (find(name) !== undefined) continue;
      try { await fetchOne(name); } catch (e) { log(`Logo de ${name}: ${e.message}`); if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|tiempo|HTTP 4|HTTP 5|socket/.test(e.message)) { log('Sin conexión con Wikidata/Wikipedia: los logos se buscarán la próxima vez.'); queue = []; } }
      await new Promise(r => setTimeout(r, 350)); // sin prisa: es un servicio gratuito
    }
    busy = false;
  }
  return {
    dir,
    url: name => { const f = find(name); return f ? '/dl/' + encodeURIComponent(f) : null; },
    // Pone en cola las que aún no tienen logo (no repite las que ya se buscaron).
    want(names) { for (const n of names) if (find(n) === undefined && !queue.includes(n)) queue.push(n); pump(); },
    retry() { for (const [k, v] of known) if (v === null) { known.delete(k); try { fs.unlinkSync(path.join(dir, safe(k) + '.none')); } catch {} } },
    clear() { known.clear(); queue = []; },
    pending: () => queue.length + (busy ? 1 : 0),
  };
};
