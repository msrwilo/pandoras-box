// Tema «Disco» (inspirado en la época de la primera PlayStation): gráfica técnica y angular a la manera de los
// juegos de 1995, un disco de fondo negro girando y polígonos que tiemblan con tramado, como en la consola.
// Las secciones son una lista numerada; al entrar, los elementos se ven como bloques de tarjeta de memoria.
export default function disco(api, root) {
  const { h, Spring, rem, clamp, S, Back } = api;
  const COLS = 5, ROWS = 3, PER = COLS * ROWS;
  const self = {
    paintScale: 0.3,
    secs: [], si: 0, zone: 'list', idx: {}, listS: new Spring(0, { response: 0.32, damping: 1 }), open: new Spring(0, { response: 0.36, damping: 0.95 }),
    pageS: new Spring(0, { response: 0.4, damping: 1 }), t: 0,
    hints() { return this.zone === 'list' ? [['ud', 'Elegir'], ['a', 'Entrar'], ['menu', 'Ajustes']] : [['lr', 'Moverse'], ['lbrb', 'Página'], ['a', 'Abrir'], ['b', 'Volver']]; },
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.list = h('div', { class: 'pd-list' });
      this.rows = this.secs.map((s, i) => {
        const el = h('div', { class: 'pd-row' }, h('em', { text: String(i + 1).padStart(2, '0') }), h('b', { text: s.label }), h('small', { text: `${s.items.length} ${s.items.length === 1 ? 'elemento' : 'elementos'}` }));
        el.addEventListener('click', () => { if (this.zone === 'list' && i === this.si) this.enterSec(); else { this.zone = 'list'; this.si = i; this.paint(true); } });
        this.list.append(el); return el;
      });
      this.tag = h('div', { class: 'pd-tag' });
      this.card = h('div', { class: 'pd-card' });
      this.head = h('div', { class: 'pd-head' });
      this.grid = h('div', { class: 'pd-grid' });
      this.pager = h('div', { class: 'pd-pager' });
      this.card.append(this.head, h('div', { class: 'pd-gridbox' }, this.grid), this.pager);
      this.marks = h('div', { class: 'pd-marks' }, h('span', { text: 'SISTEMA ▸ BIBLIOTECA' }), h('span', { text: 'CD · 2X · 32 BITS' }));
      root.append(this.marks, this.list, this.tag, this.card);
      this.si = clamp(this.si, 0, this.secs.length - 1); this.listS.jump(this.si);
      this.paint(false);
    },
    get sec() { return this.secs[this.si]; },
    get ii() { return clamp(this.idx[this.sec?.key] || 0, 0, Math.max(0, (this.sec?.items.length || 1) - 1)); },
    get pages() { return Math.max(1, Math.ceil((this.sec?.items.length || 0) / PER)); },
    enterSec() {
      const s = this.sec; if (!s?.items.length) return S.play('error');
      if (s.items.length === 1) { S.play('select'); s.items[0].run(); return; }
      this.zone = 'grid'; this.fillGrid(); this.pageS.jump(Math.floor(this.ii / PER)); this.open.set(1); S.play('open'); this.paint(false);
    },
    fillGrid() {
      const s = this.sec;
      this.blocks = s.items.map((it, i) => {
        const p = it.p;
        const el = h('button', { class: 'pd-block' }, h('i', { text: String(i + 1).padStart(2, '0') }),
          p?.media.device ? h('img', { src: p.media.device, alt: '' }) : p?.media.logo ? h('img', { class: 'logo', src: p.media.logo, alt: '' }) : api.icon(it.ic || s.icon));
        el.addEventListener('click', () => { if (i === this.ii) { S.play('select'); it.run(); } else { this.idx[s.key] = i; this.paint(true); } });
        return el;
      });
      this.grid.replaceChildren(...this.blocks);
    },
    paint(sound) {
      this.rows.forEach((e, i) => e.classList.toggle('on', i === this.si));
      root.classList.toggle('pd-in', this.zone === 'grid');
      this.listS.set(this.si);
      const s = this.sec;
      this.tag.replaceChildren(h('em', { text: String(this.si + 1).padStart(2, '0') }), h('b', { text: s?.label || '' }));
      let it = null;
      if (this.zone === 'grid') {
        it = s.items[this.ii];
        this.blocks.forEach((e, i) => e.classList.toggle('on', i === this.ii));
        this.pageS.set(Math.floor(this.ii / PER));
        this.head.replaceChildren(h('small', { text: `${s.label} ▸ ${String(this.ii + 1).padStart(3, '0')}` }), h('b', { text: it?.label || '' }), h('span', { text: it?.sub || '' }));
        const pg = Math.floor(this.ii / PER);
        this.pager.replaceChildren(...Array.from({ length: this.pages }, (_, i) => h('i', { class: i === pg ? 'on' : '' })));
      }
      if (sound) S.play('move', this.zone === 'grid' ? this.ii : this.si);
      clearTimeout(this.vt);
      const vurl = this.zone === 'grid' ? api.videoFor(this.sec, it) : api.videoFor(this.sec, null);
      if (Back.video !== vurl) Back.setVideo(null);
      if (vurl && api.settings.autoVideo && Back.video !== vurl) this.vt = setTimeout(() => { if (api.top() === 'home') Back.setVideo(vurl); }, 900);
      api.updateAudio(); api.saveLast(); api.renderChrome();
    },
    enter() { Back.setImage(null); Back.setLook('ghost'); this.paint(false); },
    resume() { this.enter(); },
    leave() { clearTimeout(this.vt); },
    back() { if (this.zone === 'grid') { this.zone = 'list'; this.open.set(0); S.play('back'); this.paint(false); return true; } return false; },
    state() { return { key: this.sec?.key, idx: this.idx, zone: this.zone }; },
    restore(f) {
      if (!f) return;
      this.idx = f.idx || {};
      const i = this.secs.findIndex(s => s.key === f.key);
      if (i >= 0) { this.si = i; this.listS.jump(i); }
      if (f.zone === 'grid' && this.sec?.items.length > 1) { this.zone = 'grid'; this.fillGrid(); this.pageS.jump(Math.floor(this.ii / PER)); this.open.jump(1); }
      if (this.secs.length) this.paint(false);
    },
    musicKey() { const it = this.zone === 'grid' ? this.sec?.items[this.ii] : null; return it?.p ? 'p:' + it.p.name : null; },
    action(a) {
      if (this.zone === 'list') {
        if (a === 'up' || a === 'down') {
          const n = clamp(this.si + (a === 'up' ? -1 : 1), 0, this.secs.length - 1);
          if (n === this.si) return S.play('error');
          this.si = n; this.paint(true);
        } else if (a === 'a' || a === 'right') this.enterSec();
        return;
      }
      const n = this.sec.items.length, i = this.ii, col = (i % PER) % COLS;
      let j = i;
      if (a === 'left') j = col > 0 ? i - 1 : i - PER + (COLS - 1);
      else if (a === 'right') j = col < COLS - 1 ? i + 1 : i + PER - (COLS - 1);
      else if (a === 'up') j = i - COLS;
      else if (a === 'down') j = i + COLS;
      else if (a === 'lb') j = i - PER;
      else if (a === 'rb') j = i + PER;
      else if (a === 'a') { S.play('select'); this.sec.items[i]?.run(); return; }
      else return;
      if (j < 0 || j >= n) { if ((a === 'right' || a === 'rb') && Math.floor(i / PER) < this.pages - 1) j = n - 1; else return S.play('error'); }
      if (Math.floor(j / PER) !== Math.floor(i / PER)) S.play('rotate');
      this.idx[this.sec.key] = j; this.paint(true);
    },
    frame(dt) {
      this.t += dt; this.listS.step(dt); this.open.step(dt); this.pageS.step(dt);
      const r = rem(), o = this.open.x, rowH = 5 * r;
      this.rows.forEach((el, i) => {
        const off = i - this.listS.x;
        el.style.transform = `translate3d(${(-o * 8 * r).toFixed(1)}px, ${(innerHeight * 0.42 + off * rowH).toFixed(1)}px, 0)`;
        el.style.opacity = (Math.abs(off) > 4.5 ? 0 : (1 - Math.abs(off) * 0.16) * (1 - o * 0.85)).toFixed(3);
      });
      this.tag.style.opacity = (1 - o).toFixed(3);
      this.card.style.opacity = o.toFixed(3);
      this.card.style.transform = `translate3d(${((1 - o) * 5 * r).toFixed(1)}px, 0, 0) skewX(${((1 - o) * -6).toFixed(2)}deg)`;
      this.card.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
      if (this.blocks) {
        const bw = 8.6 * r, gap = 1 * r, pw = COLS * (bw + gap);
        this.blocks.forEach((el, i) => {
          const pg = Math.floor(i / PER), k = i % PER, c = k % COLS, rr = Math.floor(k / COLS);
          el.style.transform = `translate3d(${((pg - this.pageS.x) * (pw + 4 * r) + c * (bw + gap)).toFixed(1)}px, ${(rr * (bw + gap)).toFixed(1)}px, 0)`;
          el.style.visibility = Math.abs(pg - this.pageS.x) > 1.2 ? 'hidden' : '';
        });
      }
    },
    // Fondo (se pinta pequeño y se amplía pixelado): un disco de fondo negro que gira con su brillo,
    // y polígonos translúcidos cuyos vértices saltan de pixel en pixel, como en la consola.
    backdrop(g, W, H, dt, now) {
      const t = now / 1000;
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#1d1f26'); bg.addColorStop(1, '#0b0c10');
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      // Disco
      const cx = W * 0.72, cy = H * 0.52, R = H * 0.42;
      g.save(); g.translate(cx, cy);
      g.beginPath(); g.arc(0, 0, R, 0, 6.283); g.arc(0, 0, R * 0.17, 0, 6.283, true); g.fillStyle = '#07080b'; g.fill('evenodd');
      for (let k = 0; k < 3; k++) { // destellos que giran
        const a = t * 0.6 + k * 2.09;
        const gr = g.createConicGradient ? g.createConicGradient(a, 0, 0) : null;
        if (!gr) break;
        gr.addColorStop(0, 'rgba(60, 230, 200, .0)'); gr.addColorStop(0.04, 'rgba(60, 230, 200, .22)'); gr.addColorStop(0.08, 'rgba(120, 90, 255, .12)'); gr.addColorStop(0.14, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.beginPath(); g.arc(0, 0, R, 0, 6.283); g.arc(0, 0, R * 0.36, 0, 6.283, true); g.fillStyle = gr; g.fill('evenodd');
      }
      g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1;
      for (const k of [0.36, 0.38, 0.97]) { g.beginPath(); g.arc(0, 0, R * k, 0, 6.283); g.stroke(); }
      g.beginPath(); g.arc(0, 0, R * 0.17, 0, 6.283); g.strokeStyle = 'rgba(255,255,255,.18)'; g.stroke();
      g.restore();
      // Polígonos que tiemblan: vértices redondeados al pixel (sin precisión de subpixel).
      const snap = v => Math.round(v);
      for (let i = 0; i < 7; i++) {
        const px = W * ((i * 0.17 + t * 0.01 * (1 + i % 3)) % 1.2 - 0.1), py = H * (0.15 + ((i * 0.37) % 0.7)), s = H * (0.06 + (i % 3) * 0.03), a = t * (0.3 + i * 0.07);
        g.beginPath();
        for (let k = 0; k < 3; k++) { const ang = a + k * 2.09 + Math.sin(t + i) * 0.3; const x = snap(px + Math.cos(ang) * s), y = snap(py + Math.sin(ang) * s * 0.7); k ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.closePath();
        g.fillStyle = ['rgba(255, 120, 40, .16)', 'rgba(60, 200, 255, .14)', 'rgba(200, 210, 230, .1)'][i % 3]; g.fill();
      }
    },
  };
  return self;
}
