// Tema «Monolito» (inspirado en el inicio de Xbox Series X): fondo oscuro, verde como acento y filas de cuadros
// redondeados una debajo de otra (cada sección es una fila). Arriba, un panel grande con lo elegido y su video.
// Arriba/abajo cambia de fila; izquierda/derecha recorre la fila.
export default function monolito(api, root) {
  const { h, Spring, rem, clamp, fmtN, S, Back } = api;
  const self = {
    paintScale: 0.4,
    secs: [], si: 0, idx: {}, rowsS: new Spring(0, { response: 0.36, damping: 1 }), cols: {}, t: 0,
    hints: () => [['lr', 'Elegir'], ['ud', 'Fila'], ['a', 'Abrir'], ['menu', 'Ajustes']],
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.hero = h('div', { class: 'xs-hero' });
      this.vid = h('video', { muted: '', playsinline: '', loop: '' }); this.vid.muted = true;
      this.heroArt = h('div', { class: 'xs-hart' });
      this.heroText = h('div', { class: 'xs-htext' });
      this.hero.append(this.heroArt, this.vid, this.heroText);
      this.rowsBox = h('div', { class: 'xs-rows' });
      this.rowEls = this.secs.map((s, si) => {
        const tiles = s.items.map((it, i) => {
          const p = it.p;
          const el = h('button', { class: 'xs-tile' }, p?.media.device ? h('img', { src: p.media.device, alt: '' }) : p?.media.logo ? h('img', { class: 'logo', src: p.media.logo, alt: '' }) : api.icon(it.ic || s.icon), h('span', { text: it.label }));
          el.addEventListener('click', () => { if (si === this.si && i === this.ii) this.run(); else { this.si = si; this.idx[s.key] = i; this.paint(true); } });
          return el;
        });
        const track = h('div', { class: 'xs-track' }, ...tiles);
        const el = h('div', { class: 'xs-row' }, h('div', { class: 'xs-rtitle', text: s.label }), track);
        return { el, track, tiles, s, x: new Spring(0, { response: 0.32, damping: 1 }) };
      });
      this.rowsBox.append(...this.rowEls.map(r => r.el));
      this.top = h('div', { class: 'xs-top' }, h('div', { class: 'xs-avatar' }), h('b', { text: 'Pandora’s Box' }));
      root.append(this.hero, this.rowsBox, this.top);
      this.si = clamp(this.si, 0, this.secs.length - 1);
      this.rowsS.jump(this.si);
      this.rowEls.forEach(R => R.x.jump(this.idxOf(R.s)));
      this.paint(false);
    },
    idxOf(s) { return clamp(this.idx[s.key] || 0, 0, Math.max(0, s.items.length - 1)); },
    get sec() { return this.secs[this.si]; },
    get ii() { return this.sec ? this.idxOf(this.sec) : 0; },
    run() { S.play('select'); this.sec.items[this.ii]?.run(); },
    paint(sound) {
      const s = this.sec, it = s?.items[this.ii], p = it?.p;
      this.rowEls.forEach((R, ri) => { R.el.classList.toggle('on', ri === this.si); R.tiles.forEach((t, i) => t.classList.toggle('on', ri === this.si && i === this.idxOf(R.s))); R.x.set(this.idxOf(R.s)); });
      this.rowsS.set(this.si);
      this.heroArt.replaceChildren(p?.media.device ? h('img', { src: p.media.device, alt: '' }) : api.icon(it?.ic || s?.icon));
      this.heroText.replaceChildren(h('small', { text: s?.label || '' }), p?.media.logo ? h('img', { src: p.media.logo, alt: it.label }) : h('b', { text: it?.label || '' }), h('span', { text: it?.sub || '' }));
      clearTimeout(this.vt); this.vid.pause(); this.vid.classList.remove('on');
      const vurl = api.videoFor(s, it);
      if (vurl && api.settings.autoVideo) this.vt = setTimeout(() => {
        if (api.top() !== 'home' || this.sec?.items[this.ii] !== it) return;
        if (this.vid.dataset.src !== vurl) { this.vid.dataset.src = vurl; this.vid.src = vurl; }
        this.vid.play().then(() => this.vid.classList.add('on')).catch(() => {});
      }, 800);
      if (sound) S.play('move', this.ii);
      api.updateAudio(); api.saveLast(); api.renderChrome();
    },
    enter() { Back.setImage(null); Back.setVideo(null); Back.setLook(''); this.paint(false); },
    resume() { this.enter(); },
    leave() { clearTimeout(this.vt); this.vid.pause(); },
    state() { return { key: this.sec?.key, idx: this.idx }; },
    restore(f) {
      if (!f) return;
      this.idx = f.idx || {};
      const i = this.secs.findIndex(s => s.key === f.key);
      if (i >= 0) this.si = i;
      if (this.secs.length) { this.rowsS.jump(this.si); this.rowEls.forEach(R => R.x.jump(this.idxOf(R.s))); this.paint(false); }
    },
    musicKey() { const it = this.sec?.items[this.ii]; return it?.p ? 'p:' + it.p.name : null; },
    action(a) {
      if (a === 'left' || a === 'right' || a === 'lb' || a === 'rb') {
        const d = a === 'left' ? -1 : a === 'right' ? 1 : a === 'lb' ? -5 : 5;
        const j = clamp(this.ii + d, 0, this.sec.items.length - 1);
        if (j === this.ii) return S.play('error');
        this.idx[this.sec.key] = j; this.paint(true);
      } else if (a === 'up' || a === 'down') {
        const n = clamp(this.si + (a === 'up' ? -1 : 1), 0, this.secs.length - 1);
        if (n === this.si) return S.play('error');
        this.si = n; S.play('rotate'); this.paint(false);
      } else if (a === 'a') this.run();
    },
    frame(dt) {
      this.t += dt; this.rowsS.step(dt);
      const r = rem(), rowH = 13.4 * r;
      this.rowEls.forEach((R, ri) => {
        R.x.step(dt);
        const off = ri - this.rowsS.x;
        R.el.style.transform = `translate3d(0, ${(off * rowH).toFixed(1)}px, 0)`;
        R.el.style.opacity = off < -0.6 ? '0' : (1 - Math.max(0, off) * 0.25).toFixed(3);
        const tw = (ri === this.si ? 13 : 11) * r + 1 * r;
        R.tiles.forEach((t, i) => {
          const o = i - Math.max(0, R.x.x - 2);
          t.style.transform = `translate3d(${(o * tw).toFixed(1)}px, 0, 0)`;
          t.style.visibility = o < -1 || o > 9 ? 'hidden' : '';
        });
      });
    },
    // Fondo: negro con un resplandor verde tenue que respira, como las rejillas de ventilación iluminadas.
    backdrop(g, W, H, dt, now) {
      const t = now / 1000;
      g.fillStyle = '#0b0c0d'; g.fillRect(0, 0, W, H);
      const gr = g.createRadialGradient(W * 0.8, -H * 0.1, 0, W * 0.8, -H * 0.1, W * 0.7);
      gr.addColorStop(0, `rgba(16, 124, 16, ${(0.28 + 0.06 * Math.sin(t * 0.6)).toFixed(3)})`); gr.addColorStop(1, 'rgba(16,124,16,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    },
  };
  return self;
}
