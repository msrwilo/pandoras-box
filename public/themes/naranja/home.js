// Tema «Naranja» (inspirado en el menú de Dreamcast): fondo claro, botones cuadrados grandes en fila
// y, al entrar, una lista tipo «archivos» con la tarjeta grande de lo elegido a la izquierda.
export default function naranja(api, root) {
  const { h, Spring, rem, clamp, S, Back } = api;
  const self = {
    paintScale: 0.5,
    secs: [], si: 0, zone: 'top', idx: {}, row: new Spring(0, { response: 0.4, damping: 0.85 }), listS: new Spring(0, { response: 0.32, damping: 1 }),
    open: new Spring(0, { response: 0.38, damping: 0.9 }), t: 0,
    hints() { return this.zone === 'top' ? [['lr', 'Elegir'], ['a', 'Entrar'], ['menu', 'Ajustes']] : [['ud', 'Elegir'], ['a', 'Abrir'], ['b', 'Volver']]; },
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.track = h('div', { class: 'dc-track' });
      this.btns = this.secs.map((s, i) => {
        const el = h('button', { class: 'dc-btn' }, h('div', { class: 'dc-face' }, api.icon(s.icon)), h('span', { text: s.label }));
        el.addEventListener('click', () => { if (this.zone === 'top' && i === this.si) this.enterSec(); else { this.zone = 'top'; this.si = i; this.paint(true); } });
        this.track.append(el); return el;
      });
      this.caption = h('div', { class: 'dc-caption' });
      this.files = h('div', { class: 'dc-files' }, h('div', { class: 'dc-card' }), h('div', { class: 'dc-list' }));
      root.append(this.track, this.caption, this.files);
      this.si = clamp(this.si, 0, this.secs.length - 1); this.row.jump(this.si);
      this.paint(false);
    },
    get sec() { return this.secs[this.si]; },
    get ii() { return clamp(this.idx[this.sec?.key] || 0, 0, Math.max(0, (this.sec?.items.length || 1) - 1)); },
    enterSec() {
      const s = this.sec; if (!s) return;
      if (s.items.length === 1) { S.play('select'); s.items[0].run(); return; }
      this.zone = 'files'; S.play('open'); this.fillList(); this.listS.jump(this.ii); this.open.set(1); this.paint(false);
    },
    fillList() {
      const s = this.sec, list = this.files.lastChild;
      this.rows = s.items.map((it, i) => {
        const el = h('div', { class: 'dc-row' }, h('div', { class: 'dc-mini' }, it.p?.media.logo ? h('img', { src: it.p.media.logo, alt: '' }) : api.icon(it.ic || s.icon)),
          h('b', { text: it.label }), h('span', { text: it.sub || '' }));
        el.addEventListener('click', () => { if (i === this.ii) it.run(); else { this.idx[s.key] = i; this.paint(true); } });
        return el;
      });
      list.replaceChildren(...this.rows);
    },
    paint(sound) {
      this.btns.forEach((e, i) => e.classList.toggle('on', i === this.si));
      root.classList.toggle('dc-in', this.zone === 'files');
      this.row.set(this.si);
      const s = this.sec;
      this.caption.replaceChildren(h('b', { text: s.label }), h('span', { text: s.items.length === 1 ? s.items[0].sub : `${s.items.length} ${s.items.length === 1 ? 'opción' : 'opciones'}` }));
      let it = null;
      if (this.zone === 'files') {
        it = s.items[this.ii];
        this.rows.forEach((e, i) => e.classList.toggle('on', i === this.ii));
        this.listS.set(this.ii);
        const p = it?.p;
        this.files.firstChild.replaceChildren(
          h('div', { class: 'dc-card-art' }, p?.media.device ? h('img', { src: p.media.device, alt: '' }) : api.icon(it?.ic || s.icon)),
          h('b', { text: it?.label || '' }), h('p', { text: it?.desc ? it.desc.slice(0, 160) + (it.desc.length > 160 ? '…' : '') : (it?.sub || '') }));
      }
      if (sound) S.play('move', this.zone === 'files' ? this.ii : this.si);
      clearTimeout(this.vt);
      const vurl = this.zone === 'files' ? api.videoFor(this.sec, it) : api.videoFor(this.sec, null);
      if (Back.video !== vurl) Back.setVideo(null);
      if (vurl && api.settings.autoVideo && Back.video !== vurl) this.vt = setTimeout(() => { if (api.top() === 'home') Back.setVideo(vurl); }, 900);
      api.updateAudio(); api.saveLast(); api.renderChrome();
    },
    enter() { Back.setImage(null); Back.setLook('ghost'); this.paint(false); },
    resume() { this.enter(); },
    leave() { clearTimeout(this.vt); },
    back() { if (this.zone === 'files') { this.zone = 'top'; this.open.set(0); S.play('back'); this.paint(false); return true; } return false; },
    state() { return { key: this.sec?.key, idx: this.idx, zone: this.zone }; },
    restore(f) {
      if (!f) return;
      this.idx = f.idx || {};
      const i = this.secs.findIndex(s => s.key === f.key);
      if (i >= 0) { this.si = i; this.row.jump(i); }
      if (f.zone === 'files' && this.sec?.items.length > 1) { this.zone = 'files'; this.fillList(); this.listS.jump(this.ii); this.open.jump(1); }
      if (this.secs.length) this.paint(false);
    },
    musicKey() { const it = this.zone === 'files' ? this.sec?.items[this.ii] : null; return it?.p ? 'p:' + it.p.name : null; },
    action(a) {
      if (this.zone === 'top') {
        if (a === 'left' || a === 'right' || a === 'lb' || a === 'rb') {
          const n = clamp(this.si + (a === 'left' || a === 'lb' ? -1 : 1), 0, this.secs.length - 1);
          if (n === this.si) return S.play('error');
          this.si = n; this.paint(true);
        } else if (a === 'a' || a === 'down') this.enterSec();
        return;
      }
      if (a === 'up' || a === 'down' || a === 'lb' || a === 'rb') {
        const d = a === 'up' ? -1 : a === 'down' ? 1 : a === 'lb' ? -6 : 6;
        const j = clamp(this.ii + d, 0, this.sec.items.length - 1);
        if (j === this.ii) return S.play('error');
        this.idx[this.sec.key] = j; this.paint(true);
      } else if (a === 'a' || a === 'right') { S.play('select'); this.sec.items[this.ii]?.run(); }
      else if (a === 'left') this.back();
    },
    frame(dt) {
      this.t += dt; this.row.step(dt); this.listS.step(dt); this.open.step(dt);
      const r = rem(), size = 19 * r, gap = 3 * r, o = this.open.x;
      const cx = innerWidth / 2 - size / 2, y = innerHeight * 0.3 - o * innerHeight * 0.27;
      this.btns.forEach((el, i) => {
        const off = i - this.row.x, on = i === this.si;
        const bounce = on && this.zone === 'top' ? Math.abs(Math.sin(this.t * 3)) * -0.5 * r : 0;
        const sc = (on ? 1.06 : 0.9) * (1 - o * 0.6);
        el.style.transform = `translate3d(${(cx + off * (size + gap) * (1 - o * 0.6)).toFixed(1)}px, ${(y + bounce).toFixed(1)}px, 0) scale(${sc.toFixed(3)})`;
        el.style.opacity = (Math.abs(off) > 3.2 ? 0 : o > 0.01 && !on ? 0.5 * (1 - o) + 0.25 : 1).toFixed(3);
      });
      this.caption.style.opacity = (1 - o).toFixed(3);
      this.files.style.opacity = o.toFixed(3);
      this.files.style.transform = `translateY(${((1 - o) * 4 * r).toFixed(1)}px)`;
      this.files.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
      if (this.rows) {
        // La lista empieza arriba y avanza dejando dos filas de contexto sobre la elegida.
        const rowH = 4.6 * r, L = this.files.lastChild, vis = Math.max(3, Math.floor((L.clientHeight - r) / rowH));
        const first = clamp(this.listS.x - 2, 0, Math.max(0, this.rows.length - vis));
        this.rows.forEach((el, i) => { el.style.transform = `translate3d(0, ${(0.8 * r + (i - first) * rowH).toFixed(1)}px, 0)`; });
      }
    },
    // Fondo: blanco cálido con franjas diagonales suaves, azul y naranja, que se deslizan muy despacio.
    backdrop(g, W, H, dt, now) {
      const t = now / 1000;
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#f7f8fa'); bg.addColorStop(1, '#dde3ea');
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      const band = (y0, wdt, col, sp) => {
        const off = (t * sp) % (W * 0.2);
        g.save(); g.translate(0, H * y0); g.rotate(-0.22);
        const gr = g.createLinearGradient(0, -wdt, 0, wdt);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(-W * 0.3 + off, -wdt, W * 1.8, wdt * 2);
        g.restore();
      };
      band(0.78, H * 0.16, 'rgba(255, 140, 40, .22)', 6);
      band(0.92, H * 0.07, 'rgba(255, 120, 20, .3)', 9);
      band(0.18, H * 0.12, 'rgba(60, 120, 220, .12)', 4);
      // Puntos que flotan, como burbujas lejanas.
      for (let i = 0; i < 14; i++) {
        const x = ((i * 0.137 + t * 0.006 * (1 + i % 3)) % 1) * W, y = H * (0.15 + ((i * 0.31) % 0.75)) + Math.sin(t * 0.5 + i) * H * 0.02;
        g.fillStyle = i % 3 ? 'rgba(255, 150, 60, .12)' : 'rgba(80, 140, 230, .1)';
        g.beginPath(); g.arc(x, y, H * (0.01 + (i % 4) * 0.006), 0, 6.283); g.fill();
      }
    },
  };
  return self;
}
