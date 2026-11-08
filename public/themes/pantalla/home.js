// Tema «Pantalla» (inspirado en el Game Boy original): todo en cuatro tonos de verde, como una pantalla de cristal
// líquido con sus puntos visibles. Izquierda/derecha cambia de sección; arriba/abajo, lista con flecha que parpadea.
export default function pantalla(api, root) {
  const { h, Spring, rem, clamp, S, Back } = api;
  const self = {
    paintScale: 0.12,
    secs: [], si: 0, idx: {}, listS: new Spring(0, { response: 0.22, damping: 1 }), slide: new Spring(0, { response: 0.3, damping: 1 }), t: 0,
    hints: () => [['lbrb', 'Pestaña'], ['ud', 'Elegir'], ['a', 'Abrir'], ['menu', 'Ajustes']],
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.bar = h('div', { class: 'gb-bar' });
      this.list = h('div', { class: 'gb-list' });
      this.sprite = h('div', { class: 'gb-sprite' });
      this.caption = h('div', { class: 'gb-cap' });
      root.append(this.bar, h('div', { class: 'gb-box gb-left' }, this.list), h('div', { class: 'gb-box gb-right' }, this.sprite, this.caption));
      this.si = clamp(this.si, 0, this.secs.length - 1);
      this.fill(); this.listS.jump(this.ii);
      this.paint(false);
    },
    get sec() { return this.secs[this.si]; },
    get ii() { return clamp(this.idx[this.sec?.key] || 0, 0, Math.max(0, (this.sec?.items.length || 1) - 1)); },
    fill() {
      const s = this.sec; if (!s) return;
      this.bar.replaceChildren(api.glyph('lb'), h('b', { text: s.label.toUpperCase() }), api.glyph('rb'));
      this.rows = s.items.map((it, i) => {
        const el = h('div', { class: 'gb-row' }, h('em', { text: '▶' }), h('span', { text: it.label.toUpperCase() }));
        el.addEventListener('click', () => { if (i === this.ii) { S.play('select'); it.run(); } else { this.idx[s.key] = i; this.paint(true); } });
        return el;
      });
      this.list.replaceChildren(...this.rows);
    },
    paint(sound) {
      const s = this.sec, it = s?.items[this.ii], p = it?.p;
      this.rows?.forEach((e, i) => e.classList.toggle('on', i === this.ii));
      this.listS.set(this.ii);
      // La imagen se ve como en la pantalla verde: pequeña, pixelada y en cuatro tonos.
      this.sprite.replaceChildren(p?.media.device ? h('img', { src: p.media.device, alt: '' }) : p?.media.logo ? h('img', { src: p.media.logo, alt: '' }) : api.icon(it?.ic || s?.icon));
      clearTimeout(this.vt);
      if (this.vid) { this.vid.pause(); this.vid.remove(); this.vid = null; }
      const vurl = api.videoFor(s, it);
      if (vurl && api.settings.autoVideo) this.vt = setTimeout(() => {
        if (api.top() !== 'home' || this.sec?.items[this.ii] !== it) return;
        // El video se ve dentro del recuadro, en los cuatro verdes de la pantalla.
        const v = h('video', { class: 'gb-video', src: vurl, playsinline: '', loop: '' }); v.muted = true;
        this.sprite.append(v); this.vid = v;
        v.play().then(() => v.classList.add('on')).catch(() => {});
      }, 800);
      this.caption.replaceChildren(h('b', { text: (it?.label || '').toUpperCase() }), h('span', { text: (it?.sub || '').toUpperCase() }));
      if (sound) S.play('move', this.ii);
      api.updateAudio(); api.saveLast(); api.renderChrome();
    },
    setSec(n) {
      if (n === this.si) return S.play('error');
      const d = n > this.si ? 1 : -1;
      this.si = n; this.fill(); this.listS.jump(this.ii); this.slide.jump(d); this.slide.set(0); S.play('rotate'); this.paint(false);
    },
    enter() { Back.setImage(null); Back.setVideo(null); Back.setLook(''); this.paint(false); },
    resume() { this.enter(); },
    leave() { clearTimeout(this.vt); this.vid?.pause(); },
    state() { return { key: this.sec?.key, idx: this.idx }; },
    restore(f) {
      if (!f) return;
      this.idx = f.idx || {};
      const i = this.secs.findIndex(s => s.key === f.key);
      if (i >= 0) this.si = i;
      if (this.secs.length) { this.fill(); this.listS.jump(this.ii); this.paint(false); }
    },
    musicKey() { const it = this.sec?.items[this.ii]; return it?.p ? 'p:' + it.p.name : null; },
    action(a) {
      if (a === 'left' || a === 'right' || a === 'lb' || a === 'rb') this.setSec(clamp(this.si + (a === 'left' || a === 'lb' ? -1 : 1), 0, this.secs.length - 1));
      else if (a === 'up' || a === 'down') {
        const d = a === 'up' ? -1 : 1;
        const j = clamp(this.ii + d, 0, this.sec.items.length - 1);
        if (j === this.ii) return S.play('error');
        this.idx[this.sec.key] = j; this.paint(true);
      } else if (a === 'a') { S.play('select'); this.sec.items[this.ii]?.run(); }
    },
    frame(dt) {
      this.t += dt; this.listS.step(dt); this.slide.step(dt);
      const r = rem(), rowH = 3.6 * r;
      // Movimiento por saltos, como en la pantalla original (sin suavizado fino).
      const snap = v => Math.round(v / (0.4 * r)) * 0.4 * r;
      if (this.rows) {
        const vis = Math.max(4, Math.floor(this.list.clientHeight / rowH));
        const first = clamp(this.listS.x - 3, 0, Math.max(0, this.rows.length - vis));
        this.rows.forEach((el, i) => { el.style.transform = `translate3d(${snap(this.slide.x * 6 * r)}px, ${snap((i - first) * rowH)}px, 0)`; });
      }
      root.classList.toggle('gb-blink', Math.floor(this.t * 2.2) % 2 === 0);
    },
    // Fondo: el verde de la pantalla con una rejilla de puntos (se pinta pequeño y se amplía pixelado).
    backdrop(g, W, H, dt, now) {
      g.fillStyle = '#9bbc0f'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#8bac0f';
      const t = Math.floor(now / 160);
      for (let y = 0; y < H; y += 2) for (let x = (y / 2 + t) % 4 < 2 ? 0 : 1; x < W; x += 6) g.fillRect(x, y, 1, 1);
    },
  };
  return self;
}
