// Visor de manuales con pdf.js: doble página, una página o ancho completo, todo con el control.
import { sticks, rem, h } from './core.js';

let pdfjs = null;
async function lib() {
  if (!pdfjs) {
    pdfjs = await import('/vendor/pdfjs/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';
  }
  return pdfjs;
}

export const MODES = { doble: 'Doble página', pagina: 'Una página', ancho: 'Ancho completo' };

export class Manual {
  constructor(stage, caption) { this.stage = stage; this.caption = caption; this.doc = null; this.mode = 'doble'; this.page = 1; this.token = 0; this.zoom = 1; this.px = 0; this.py = 0; }

  async open(url, mode) {
    this.mode = mode || this.mode;
    this.stage.replaceChildren(h('div', { class: 'pdf-loading', text: 'Abriendo manual…' }));
    const tk = ++this.token;
    try {
      const p = await lib();
      const task = p.getDocument({ url, isEvalSupported: false });
      // Los manuales grandes tardan: se muestra cuánto va.
      task.onProgress = ({ loaded, total }) => {
        if (tk !== this.token || this.doc || !total) return;
        const el = this.stage.querySelector('.pdf-loading'); if (el) el.textContent = `Abriendo manual… ${Math.min(99, Math.round(loaded / total * 100))} %`;
      };
      const doc = await task.promise;
      if (tk !== this.token) { doc.destroy(); return; }
      try { const v = (await doc.getPage(1)).getViewport({ scale: 1 }); this.ratio = v.height / v.width; } catch { this.ratio = 1.35; }
      if (tk !== this.token) { doc.destroy(); return; }
      this.doc = doc; this.pages = doc.numPages; this.url = url; this.zoom = 1; this.px = this.py = 0;
      // Vuelve a la página donde te quedaste en este manual.
      let saved = 1; try { saved = +localStorage.getItem('manual:' + url) || 1; } catch {}
      this.page = Math.min(Math.max(1, saved), this.pages);
      if (this.mode === 'doble') this.page = this.spread(this.page)[0];
      this.render();
    } catch (e) {
      console.error(e);
      this.stage.replaceChildren(h('div', { class: 'pdf-loading', text: 'No pude abrir este manual.' }));
    }
  }

  close() { this.token++; this.io?.disconnect(); if (this.doc) { this.doc.destroy(); this.doc = null; } }

  // Páginas que se muestran juntas: la portada sola y luego pares (2-3, 4-5…), como un libro.
  spread(p) {
    if (this.mode !== 'doble' || p === 1) return [p];
    const start = p % 2 === 0 ? p : p - 1;
    return start + 1 <= this.pages ? [start, start + 1] : [start];
  }

  async draw(n, canvas, cssW, cssH) {
    const page = await this.doc.getPage(n);
    const vp1 = page.getViewport({ scale: 1 });
    const scale = Math.min(cssW / vp1.width, cssH / vp1.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const vp = page.getViewport({ scale: scale * dpr });
    canvas.width = Math.floor(vp.width); canvas.height = Math.floor(vp.height);
    canvas.style.width = Math.floor(vp.width / dpr) + 'px'; canvas.style.height = Math.floor(vp.height / dpr) + 'px';
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  }

  render() {
    if (!this.doc) return;
    this.io?.disconnect();
    const W = this.stage.clientWidth, H = this.stage.clientHeight;
    if (this.mode === 'ancho') {
      const wrap = h('div', { class: 'pdf-scroll' });
      const cw = Math.min(W, 70 * rem() * (this.zoom > 1 ? this.zoom : 1));
      const canvases = [];
      for (let i = 1; i <= this.pages; i++) {
        const c = h('canvas'); c.dataset.n = i; c.style.width = Math.round(cw) + 'px'; c.style.height = Math.round(cw * (this.ratio || 1.35)) + 'px'; canvases.push(c); wrap.append(c);
      }
      this.stage.replaceChildren(wrap);
      this.scroller = wrap;
      this.io = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting && !e.target.dataset.done) { e.target.dataset.done = 1; this.draw(+e.target.dataset.n, e.target, cw, 1e5).then(() => this.hold()).catch(() => {}); }
      }), { root: wrap, rootMargin: '100% 0px' });
      canvases.forEach(c => this.io.observe(c));
      const target = canvases[this.page - 1];
      this.holdT = performance.now() + 1500;
      requestAnimationFrame(() => { wrap.scrollTop = target.offsetTop; });
      wrap.addEventListener('scroll', () => {
        const mid = wrap.scrollTop + wrap.clientHeight / 3;
        const c = canvases.find(c => c.offsetTop + c.offsetHeight > mid);
        if (c && this.page !== +c.dataset.n && !(this.holdT > performance.now())) { this.page = +c.dataset.n; this.label(); this.remember(); }
      }, { passive: true });
    } else {
      this.scroller = null;
      const pages = this.spread(this.page);
      const box = h('div', { class: 'pdf-spread' + (pages.length === 1 ? ' single' : '') });
      const z = this.zoom, each = (pages.length === 2 ? (W - 10) / 2 : W) * z;
      if (z > 1) box.classList.add('zoom');
      const want = [this.px, this.py], tk = this.token, draws = [];
      for (const n of pages) { const c = h('canvas'); box.append(c); draws.push(this.draw(n, c, each, H * z)); }
      this.stage.replaceChildren(box);
      this.box = box; box.style.transform = 'none';
      // El tamaño real se conoce al terminar de dibujar: entonces se coloca la página.
      Promise.all(draws).then(() => { if (tk !== this.token || this.box !== box) return; [this.px, this.py] = want; this.pan(0, 0); }).catch(() => {});
    }
    this.label(); this.remember();
  }

  label() {
    const pages = this.mode === 'ancho' ? [this.page] : this.spread(this.page);
    const pg = pages.length === 2 ? `Páginas ${pages[0]}–${pages[1]}` : `Página ${pages[0]}`;
    this.caption.textContent = `${pg} de ${this.pages} · ${MODES[this.mode]}${this.zoom > 1 ? ' · ×' + String(this.zoom).replace('.', ',') : ''}`;
  }

  // Las páginas cambian de alto al dibujarse; mientras dura el salto se mantiene la página pedida arriba.
  hold() { if (this.scroller && this.holdT > performance.now()) { const c = this.scroller.children[this.page - 1]; if (c) this.scroller.scrollTop = c.offsetTop; } }

  remember() { try { if (this.url) localStorage.setItem('manual:' + this.url, String(this.page)); } catch {} }

  // Con zoom, la página es más grande que la pantalla: se mueve con la palanca derecha o con arriba y abajo.
  pan(dx, dy) {
    if (!this.box || this.mode === 'ancho') return;
    const W = this.stage.clientWidth, H = this.stage.clientHeight;
    const mx = Math.max(0, (this.box.scrollWidth - W) / 2), my = Math.max(0, (this.box.scrollHeight - H) / 2);
    this.px = Math.max(-mx, Math.min(mx, this.px + dx)); this.py = Math.max(-my, Math.min(my, this.py + dy));
    this.box.style.transform = `translate(${this.px.toFixed(1)}px, ${this.py.toFixed(1)}px)`;
  }

  zoomBy(d) {
    const steps = [1, 1.5, 2, 3], i = steps.indexOf(this.zoom), j = i + d;
    if (j < 0 || j >= steps.length) return false;
    if (this.mode === 'ancho') { this.zoom = steps[j]; this.widthZoom(); this.label(); return true; }
    const k = steps[j] / this.zoom; this.zoom = steps[j]; this.px *= k; this.py = steps[j] === 1 ? 0 : this.py * k;
    this.render();
    return true;
  }

  // En «ancho completo» el zoom cambia el ancho de las páginas (hasta el ancho de la pantalla).
  widthZoom() {
    if (!this.scroller) return;
    const keep = this.page; this.render(); this.page = keep;
  }

  jump(d) {
    if (!this.doc) return false;
    const p = Math.max(1, Math.min(this.pages, this.page + d));
    if (p === this.page) return false;
    this.page = this.mode === 'doble' ? this.spread(p)[0] : p; this.py = 0;
    if (this.mode === 'ancho') { const c = this.scroller.children[this.page - 1]; this.holdT = performance.now() + 1500; this.scroller.scrollTo({ top: c.offsetTop }); this.label(); this.remember(); }
    else this.render();
    return true;
  }

  turn(d) {
    if (!this.doc) return false;
    let p;
    if (this.mode === 'ancho') p = this.page + d;
    else { const s = this.spread(this.page); p = d > 0 ? s[s.length - 1] + 1 : s[0] - 1; }
    if (p < 1 || p > this.pages) return false;
    this.page = this.mode === 'doble' ? this.spread(p)[0] : p;
    // Al pasar página con zoom se empieza arriba (o abajo si vas hacia atrás).
    this.py = this.zoom > 1 ? (d > 0 ? 1e6 : -1e6) : 0;
    if (this.mode === 'ancho') { const c = this.scroller.children[this.page - 1]; this.scroller.scrollTo({ top: c.offsetTop, behavior: 'smooth' }); this.label(); this.remember(); }
    else this.render();
    return true;
  }

  cycleMode() {
    const k = Object.keys(MODES);
    this.mode = k[(k.indexOf(this.mode) + 1) % k.length];
    this.zoom = 1; this.px = this.py = 0;
    this.render();
    return this.mode;
  }

  scroll(dy) { if (this.scroller) this.scroller.scrollBy({ top: dy, behavior: 'smooth' }); else this.pan(0, -dy * 2); }

  frame(dt) {
    if (this.scroller && Math.abs(sticks.ry) > 0) this.scroller.scrollTop += sticks.ry * 30 * rem() * dt;
    else if (!this.scroller && this.zoom > 1 && (sticks.rx || sticks.ry)) this.pan(-sticks.rx * 45 * rem() * dt, -sticks.ry * 45 * rem() * dt);
  }
}
