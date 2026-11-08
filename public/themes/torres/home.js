// Tema «Torres» (inspirado en el menú de PS2): espacio azul profundo con torres de cubos de luz.
// A la izquierda, las secciones en texto fino; al entrar, sus elementos flotan como cubos que giran.
export default function torres(api, root) {
  const { h, Spring, rem, clamp, fmtN, S, Back } = api;
  const COLS = 4;
  const self = {
    paintScale: 0.5,
    secs: [], si: 0, zone: 'list', idx: {}, rowS: new Spring(0, { response: 0.45, damping: 1 }), listS: new Spring(0, { response: 0.42, damping: 1 }),
    t: 0, towers: null, motes: null,
    hints() {
      return this.zone === 'list' ? [['ud', 'Sección'], ['a', 'Entrar'], ['menu', 'Ajustes']] : [['lr', 'Elegir'], ['a', 'Abrir'], ['b', 'Secciones']];
    },
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.list = h('nav', { class: 'ps2-list' });
      this.secEls = this.secs.map((s, i) => {
        const el = h('button', { class: 'ps2-sec', text: s.label });
        el.addEventListener('click', () => { if (this.zone === 'list' && i === this.si) this.enterItems(); else { this.si = i; this.zone = 'list'; this.paint(true); } });
        this.list.append(el); return el;
      });
      this.grid = h('div', { class: 'ps2-grid' });
      this.head = h('div', { class: 'ps2-head' });
      this.info = h('div', { class: 'ps2-info' });
      root.append(this.list, this.head, this.grid, this.info);
      this.si = clamp(this.si, 0, this.secs.length - 1);
      this.fill(true);
    },
    get sec() { return this.secs[this.si]; },
    get ii() { return clamp(this.idx[this.sec?.key] || 0, 0, (this.sec?.items.length || 1) - 1); },
    fill(jump) {
      const s = this.sec; if (!s) return;
      this.head.textContent = s.label;
      this.tiles = s.items.map((it, i) => {
        const art = it.p?.media.device ? h('img', { src: it.p.media.device, alt: '' }) : it.p?.media.logo ? h('img', { class: 'logo', src: it.p.media.logo, alt: '' }) : api.icon(it.ic || s.icon);
        const el = h('button', { class: 'ps2-tile' }, h('div', { class: 'ps2-cube' }, h('i', { class: 'f' }), h('i', { class: 't' }), h('i', { class: 's' }), h('div', { class: 'ps2-art' }, art)), h('span', { text: it.label }));
        el.addEventListener('click', () => { if (this.zone === 'items' && i === this.ii) it.run(); else { this.zone = 'items'; this.idx[s.key] = i; this.paint(true); } });
        return el;
      });
      this.grid.replaceChildren(...this.tiles);
      const row = Math.floor(this.ii / COLS);
      if (jump) this.rowS.jump(row); else this.rowS.set(row);
      this.paint(false);
    },
    enterItems() { if (!this.sec.items.length) return S.play('error'); this.zone = 'items'; S.play('open'); this.paint(false); },
    paint(sound) {
      this.secEls.forEach((e, i) => e.classList.toggle('on', i === this.si));
      root.classList.toggle('in-items', this.zone === 'items');
      this.tiles.forEach((e, i) => e.classList.toggle('on', this.zone === 'items' && i === this.ii));
      this.listS.set(this.si);
      this.rowS.set(Math.max(0, Math.floor(this.ii / COLS) - 1));
      const it = this.sec.items[this.zone === 'items' ? this.ii : 0];
      const showIt = this.zone === 'items' || this.sec.items.length === 1;
      this.info.replaceChildren(
        h('b', { text: showIt && it ? it.label : this.sec.label }),
        h('span', { text: showIt && it ? (it.sub || '') : `${this.sec.items.length} ${this.sec.items.length === 1 ? 'elemento' : 'elementos'}` }));
      if (sound) S.play('move', this.zone === 'items' ? this.ii : this.si);
      clearTimeout(this.vt);
      const p = this.zone === 'items' ? it?.p : null;
      const vurl = this.zone === 'items' ? api.videoFor(this.sec, it) : api.videoFor(this.sec, null);
      if (Back.video !== vurl) Back.setVideo(null);
      if (vurl && api.settings.autoVideo && Back.video !== vurl) this.vt = setTimeout(() => { if (api.top() === 'home') Back.setVideo(vurl); }, 900);
      api.updateAudio(); api.saveLast(); api.renderChrome();
    },
    enter() { Back.setImage(null); Back.setLook('ghost'); this.paint(false); },
    resume() { this.enter(); },
    leave() { clearTimeout(this.vt); },
    back() { if (this.zone === 'items') { this.zone = 'list'; S.play('back'); this.paint(false); return true; } return false; },
    state() { return { si: this.si, idx: this.idx, zone: this.zone, key: this.sec?.key }; },
    restore(f) {
      if (!f) return;
      this.idx = f.idx || {};
      const i = this.secs.findIndex(s => s.key === f.key);
      if (i >= 0) this.si = i;
      this.zone = f.zone === 'items' ? 'items' : 'list';
      if (this.secs.length) { this.listS.jump(this.si); this.fill(true); }
    },
    musicKey() { const it = this.zone === 'items' ? this.sec?.items[this.ii] : null; return it?.p ? 'p:' + it.p.name : null; },
    action(a) {
      if (this.zone === 'list') {
        if (a === 'up' || a === 'down') {
          const n = clamp(this.si + (a === 'up' ? -1 : 1), 0, this.secs.length - 1);
          if (n === this.si) return S.play('error');
          this.si = n; S.play('rotate'); this.fill(false);
        } else if (a === 'a' || a === 'right') this.enterItems();
        return;
      }
      const n = this.sec.items.length, i = this.ii;
      let j = i;
      if (a === 'left') { if (i % COLS === 0) { this.back(); return; } j = i - 1; }
      else if (a === 'right') j = Math.min(n - 1, i + 1);
      else if (a === 'up') j = i - COLS;
      else if (a === 'down') j = Math.min(n - 1, i + COLS);
      else if (a === 'a') { S.play('select'); this.sec.items[i].run(); return; }
      else return;
      if (j < 0 || j === i) return S.play('error');
      this.idx[this.sec.key] = j; this.paint(true);
    },
    frame(dt) {
      this.t += dt;
      this.listS.step(dt); this.rowS.step(dt);
      const r = rem(), rowH = 7.4 * r;
      // La lista de secciones se mueve para dejar la elegida a la altura de la línea guía.
      this.list.style.transform = `translate3d(0, ${(innerHeight * 0.44 - this.listS.x * 4.2 * r).toFixed(1)}px, 0)`;
      this.secEls.forEach((e, i) => { const d = Math.abs(i - this.listS.x); e.style.opacity = Math.max(0.12, 1 - d * 0.22).toFixed(3); });
      const tw = 13 * r, th = 15 * r, gx = 2 * r;
      const x0 = innerWidth * 0.36;
      this.tiles.forEach((el, i) => {
        const col = i % COLS, row = Math.floor(i / COLS);
        const y = innerHeight * 0.2 + (row - this.rowS.x) * (th + 1.2 * r);
        el.style.transform = `translate3d(${(x0 + col * (tw + gx)).toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        el.style.opacity = (y < innerHeight * 0.08 || y > innerHeight * 0.78 ? 0 : 1).toFixed(2);
        // Los cubos flotan y el elegido gira despacio, como los íconos de la tarjeta de memoria.
        const cube = el.firstChild, on = el.classList.contains('on');
        const ry = on ? (this.t * 40) % 360 : Math.sin(this.t * 0.8 + i) * 18, bob = Math.sin(this.t * 1.3 + i * 0.7) * 0.25 * r;
        cube.style.transform = `translateY(${bob.toFixed(1)}px) rotateX(-12deg) rotateY(${ry.toFixed(1)}deg)`;
      });
    },
    // Fondo: azul muy profundo, torres de cubos de luz que suben y bajan, motas que flotan.
    backdrop(g, W, H, dt, now) {
      const t = now / 1000;
      if (!this.towers) {
        this.towers = Array.from({ length: 26 }, () => ({ x: Math.random() * 2 - 1, z: 0.25 + Math.random() * 0.9, h: 2 + Math.floor(Math.random() * 9), p: Math.random() * 6.28, s: 0.1 + Math.random() * 0.25 }));
        this.towers.sort((a, b) => b.z - a.z);
        this.motes = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), v: 0.004 + Math.random() * 0.01, a: Math.random() }));
      }
      const bg = g.createRadialGradient(W * 0.5, H * 0.75, 0, W * 0.5, H * 0.75, H * 1.1);
      bg.addColorStop(0, '#0d2a6b'); bg.addColorStop(0.5, '#06122f'); bg.addColorStop(1, '#010309');
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      const horizon = H * 0.72;
      for (const tw of this.towers) {
        const sc = 1 / tw.z, x = W * 0.5 + tw.x * W * 0.55 * sc, cs = H * 0.035 * sc;
        const n = Math.max(1, Math.round(tw.h * (0.6 + 0.4 * Math.sin(t * tw.s + tw.p))));
        for (let k = 0; k < n; k++) {
          const y = horizon - (k + 1) * cs * 1.08 + (sc - 1) * H * 0.08;
          const a = 0.05 + 0.12 * (1 - k / n) * Math.min(1, sc * 0.6);
          g.fillStyle = `rgba(90, 150, 255, ${a.toFixed(3)})`;
          g.fillRect(x - cs / 2, y, cs, cs);
          g.strokeStyle = `rgba(170, 210, 255, ${(a * 1.6).toFixed(3)})`; g.lineWidth = Math.max(1, sc * 0.8);
          g.strokeRect(x - cs / 2, y, cs, cs);
        }
      }
      const fog = g.createLinearGradient(0, horizon - H * 0.1, 0, H);
      fog.addColorStop(0, 'rgba(1, 3, 12, 0)'); fog.addColorStop(1, 'rgba(1, 3, 12, .9)');
      g.fillStyle = fog; g.fillRect(0, horizon - H * 0.1, W, H);
      for (const m of this.motes) {
        m.y -= m.v * dt; if (m.y < 0) { m.y = 1; m.x = Math.random(); }
        g.fillStyle = `rgba(190, 220, 255, ${(0.25 + 0.35 * Math.sin(t + m.a * 6)).toFixed(3)})`;
        g.fillRect(m.x * W, m.y * H, 2, 2);
      }
    },
  };
  return self;
}
