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
  constructor(stage, caption) { this.stage = stage; this.caption = caption; this.doc = null; this.mode = 'doble'; this.page = 1; this.token = 0; }

  async open(url, mode) {
    this.mode = mode || this.mode;
    this.stage.replaceChildren(h('div', { class: 'pdf-loading', text: 'Abriendo manual…' }));
    const tk = ++this.token;
    try {
      const p = await lib();
      const doc = await p.getDocument({ url, isEvalSupported: false }).promise;
      if (tk !== this.token) { doc.destroy(); return; }
      this.doc = doc; this.page = 1; this.pages = doc.numPages;
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
      const cw = Math.min(W, 70 * rem());
      const canvases = [];
      for (let i = 1; i <= this.pages; i++) {
        const c = h('canvas'); c.dataset.n = i; c.style.height = Math.round(cw * 1.35) + 'px'; canvases.push(c); wrap.append(c);
      }
      this.stage.replaceChildren(wrap);
      this.scroller = wrap;
      this.io = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting && !e.target.dataset.done) { e.target.dataset.done = 1; this.draw(+e.target.dataset.n, e.target, cw, 1e5); }
      }), { root: wrap, rootMargin: '100% 0px' });
      canvases.forEach(c => this.io.observe(c));
      const target = canvases[this.page - 1];
      requestAnimationFrame(() => { wrap.scrollTop = target.offsetTop; });
      wrap.addEventListener('scroll', () => {
        const mid = wrap.scrollTop + wrap.clientHeight / 3;
        const c = canvases.find(c => c.offsetTop + c.offsetHeight > mid);
        if (c) { this.page = +c.dataset.n; this.label(); }
      }, { passive: true });
    } else {
      this.scroller = null;
      const pages = this.spread(this.page);
      const box = h('div', { class: 'pdf-spread' + (pages.length === 1 ? ' single' : '') });
      const each = pages.length === 2 ? (W - 10) / 2 : W;
      for (const n of pages) { const c = h('canvas'); box.append(c); this.draw(n, c, each, H); }
      this.stage.replaceChildren(box);
    }
    this.label();
  }

  label() {
    const pages = this.mode === 'ancho' ? [this.page] : this.spread(this.page);
    const pg = pages.length === 2 ? `Páginas ${pages[0]}–${pages[1]}` : `Página ${pages[0]}`;
    this.caption.textContent = `${pg} de ${this.pages} · ${MODES[this.mode]}`;
  }

  turn(d) {
    if (!this.doc) return false;
    let p;
    if (this.mode === 'ancho') p = this.page + d;
    else { const s = this.spread(this.page); p = d > 0 ? s[s.length - 1] + 1 : s[0] - 1; }
    if (p < 1 || p > this.pages) return false;
    this.page = this.mode === 'doble' ? this.spread(p)[0] : p;
    if (this.mode === 'ancho') { const c = this.scroller.children[this.page - 1]; this.scroller.scrollTo({ top: c.offsetTop, behavior: 'smooth' }); this.label(); }
    else this.render();
    return true;
  }

  cycleMode() {
    const k = Object.keys(MODES);
    this.mode = k[(k.indexOf(this.mode) + 1) % k.length];
    this.render();
    return this.mode;
  }

  scroll(dy) { if (this.scroller) this.scroller.scrollBy({ top: dy, behavior: 'smooth' }); }

  frame(dt) {
    if (this.scroller && Math.abs(sticks.ry) > 0) this.scroller.scrollTop += sticks.ry * 30 * rem() * dt;
  }
}
