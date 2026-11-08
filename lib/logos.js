// Logos de las desarrolladoras: LaunchBox no los tiene, así que Pandora los busca una vez en Wikidata
// (propiedad «logotipo», P154) y, si no, en Wikipedia; los guarda en datos/logos/desarrolladoras.
// Si pones tu propia imagen ahí (mismo nombre de la empresa, .png/.svg/.jpg/.webp), se usa la tuya.
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const UA = 'PandorasBox/1.0 (https://github.com/msrwilo/pandoras-box; frontend personal para LaunchBox)';
const EXT = ['.png', '.svg', '.webp', '.jpg', '.jpeg'];
// Tipos de entidad que cuentan como empresa de videojuegos (desarrolladora, editora, empresa, estudio…).
const COMPANY = new Set(['Q210167', 'Q1137109', 'Q4830453', 'Q783794', 'Q6881511', 'Q891723', 'Q18388277', 'Q1589009', 'Q43229', 'Q2085381', 'Q161726']);

function get(url, { json = true, hops = 0 } = {}) {
  return new Promise((ok, ko) => {
    const req = https.get(url, { headers: { 'User-Agent': UA, Accept: json ? 'application/json' : 'image/*' }, timeout: 20000 }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && hops < 5) { res.resume(); return ok(get(new URL(res.headers.location, url).href, { json, hops: hops + 1 })); }
      if (res.statusCode !== 200) { res.resume(); const e = new Error('HTTP ' + res.statusCode); e.status = res.statusCode; return ko(e); }
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
const WP = 'https://en.wikipedia.org/w/api.php?';
// Sin internet (o el servidor no responde): se detiene la cola y se reintenta otro día.
const isNetwork = e => !e.status && /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|tiempo|socket|network/i.test(e.message);
// Palabras de la empresa que deben aparecer en el título del artículo o en el nombre del logo.
const words = name => name.toLowerCase().normalize('NFD').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !/^(inc|ltd|co|corp|llc|the|games|game|soft|software|entertainment|studio|studios)$/.test(w));
const mentions = (text, name) => { const t = text.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, ''); const w = words(name); return !w.length || t.includes(w[0]); };

// 1) Wikidata: propiedad «logotipo» (P154). Son logos libres, en Wikimedia Commons.
async function fromWikidata(name) {
  const s = await get('https://www.wikidata.org/w/api.php?' + q({ action: 'wbsearchentities', search: name, language: 'en', type: 'item', limit: 7, format: 'json' }));
  const ids = (s.search || []).map(x => x.id);
  if (!ids.length) return null;
  const e = await get('https://www.wikidata.org/w/api.php?' + q({ action: 'wbgetentities', ids: ids.join('|'), props: 'claims', format: 'json' }));
  for (const id of ids) {
    const c = e.entities?.[id]?.claims || {};
    const logo = c.P154?.[0]?.mainsnak?.datavalue?.value;
    const types = (c.P31 || []).map(x => x.mainsnak?.datavalue?.value?.id);
    if (logo && types.some(t => COMPANY.has(t))) return { file: logo };
  }
  return null;
}
// 2) Wikipedia: la imagen principal del artículo de la empresa (casi siempre su logo). Muchos logos de
//    empresas no son libres y solo están en la Wikipedia en inglés: por eso pilicense=any.
async function fromWikipediaPage(name) {
  const s = await get(WP + q({ action: 'query', list: 'search', srsearch: name + ' video game company', srlimit: 4, format: 'json' }));
  const titles = (s.query?.search || []).map(x => x.title).filter(t => mentions(t, name));
  if (!titles.length) return null;
  const r = await get(WP + q({ action: 'query', titles: titles.join('|'), redirects: 1, prop: 'pageimages|pageprops', piprop: 'thumbnail|name', pithumbsize: 512, pilicense: 'any', format: 'json' }));
  const pages = Object.values(r.query?.pages || {}).filter(p => !p.pageprops?.disambiguation)
    .sort((a, b) => titles.indexOf(a.title) - titles.indexOf(b.title));
  for (const p of pages) {
    const img = p.pageimage || '', url = p.thumbnail?.source;
    if (url && (/logo|wordmark/i.test(img) || /\.svg$/i.test(img))) return { url, file: img };
  }
  return null;
}
// 3) Wikipedia: cualquier imagen del artículo cuyo nombre diga «logo».
async function fromWikipediaImages(name) {
  const s = await get(WP + q({ action: 'query', list: 'search', srsearch: name + ' video game company', srlimit: 3, format: 'json' }));
  const title = (s.query?.search || []).map(x => x.title).find(t => mentions(t, name));
  if (!title) return null;
  const im = await get(WP + q({ action: 'query', prop: 'images', titles: title, imlimit: 100, format: 'json' }));
  const page = Object.values(im.query?.pages || {})[0];
  const files = (page?.images || []).map(i => i.title).filter(t => /logo/i.test(t) && !/commons|wiki|ambox|edit|question|flag|symbol|icon|padlock/i.test(t));
  const best = files.find(f => mentions(f, name)) || files[0];
  return best ? { file: best.replace(/^File:/, '') } : null;
}
// Descarga un archivo de Wikimedia como PNG de 512 px. La Wikipedia en inglés sirve tanto sus
// archivos propios como los de Commons, así que se prueba ahí si Commons no lo tiene.
async function download(hit) {
  if (hit.url) return get(hit.url, { json: false });
  const f = encodeURIComponent(hit.file.replace(/ /g, '_'));
  try { return await get('https://commons.wikimedia.org/wiki/Special:FilePath/' + f + '?width=512', { json: false }); }
  catch (e) { if (e.status !== 404) throw e; }
  return get('https://en.wikipedia.org/wiki/Special:FilePath/' + f + '?width=512', { json: false });
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
    let lastErr = null, tried = 0;
    for (const [how, src] of [['Wikidata', fromWikidata], ['Wikipedia', fromWikipediaPage], ['Wikipedia', fromWikipediaImages]]) {
      let hit = null;
      try { hit = await src(name); tried++; } catch (e) { if (isNetwork(e) || e.status === 429) throw e; lastErr = e; continue; }
      if (!hit) continue;
      let img;
      try { img = await download(hit); } catch (e) { if (isNetwork(e) || e.status === 429) throw e; lastErr = e; log(`Logo de ${name}: ${hit.file} no se pudo bajar (${e.message}); pruebo otra fuente`); continue; }
      if (!/image\//.test(img.type) || img.buf.length < 200) continue;
      fs.mkdirSync(dir, { recursive: true });
      const base = path.join(dir, safe(name));
      const ext = /svg/.test(img.type) ? '.svg' : /jpe?g/.test(img.type) ? '.jpg' : /webp/.test(img.type) ? '.webp' : '.png';
      fs.writeFileSync(base + ext, img.buf);
      known.set(name, path.basename(base + ext));
      log(`Logo de ${name}: ${hit.file || 'imagen del artículo'} (${how})`);
      return;
    }
    // Ninguna fuente respondió (por ejemplo, todas fallaron con error del servidor): se reintenta otro día.
    if (!tried && lastErr) throw lastErr;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, safe(name)) + '.none', '');
    known.set(name, null); log(`Logo de ${name}: no encontrado`);
  }
  async function pump() {
    if (busy) return; busy = true;
    let found = 0, missing = 0;
    while (queue.length) {
      const name = queue[0];
      if (find(name) !== undefined) { queue.shift(); continue; }
      try { await fetchOne(name); queue.shift(); if (known.get(name)) found++; else missing++; }
      catch (e) {
        if (e.status === 429) { log('Wikimedia pide esperar (demasiadas consultas); sigo en un minuto.'); await new Promise(r => setTimeout(r, 60000)); continue; }
        if (isNetwork(e)) { log(`Logo de ${name}: ${e.message}. Sin conexión con Wikidata/Wikipedia: los logos que faltan se buscarán la próxima vez.`); queue = []; break; }
        log(`Logo de ${name}: ${e.message}`); queue.shift(); // otro error: se pasa a la siguiente
      }
      await new Promise(r => setTimeout(r, 1000)); // sin prisa: es un servicio gratuito
    }
    if (found || missing) log(`Logos de desarrolladoras: ${found} encontrados, ${missing} sin logo.`);
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
