// Tema «Tarjeta» (inspirado en TurboGrafx-16 y sus juegos en tarjetas del tamaño de una de crédito):
// negro con naranja, las opciones son tarjetas en abanico que se abren al pasar, y la elegida sube
// para entrar a la ranura. Izquierda/derecha recorre el abanico; arriba/abajo cambia de sección.
export default function tarjeta(api, root) {
  const { h, Spring, rem, clamp, S, Back } = api;
  const self = {
    paintScale: 0.4,
    secs: [], si: 0, idx: {}, fan: new Spring(0, { response: 0.35, damping: 0.85 }), lift: new Spring(0, { response: 0.4, damping: 0.75 }), t: 0,
    hints: () => [['lr', 'Tarjeta'], ['lbrb', 'Pestaña'], ['a', 'Insertar'], ['menu', 'Ajustes']],
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.head = h('div', { class: 'tg-head' });
      this.slot = h('div', { class: 'tg-slot' }, h('i'));
      this.deck = h('div', { class: 'tg-deck' });
      this.info = h('div', { class: 'tg-info' });
      this.vid = h('video', { muted: '', playsinline: '', loop: '' }); this.vid.muted = true;
      this.tv = h('div', { class: 'tg-tv' }, this.vid);
      root.append(this.head, this.slot, this.tv, this.deck, this.info);
      this.si = clamp(this.si, 0, this.secs.length - 1);
      this.fill(); this.fan.jump(this.ii);
      this.paint(false);
    },
    get sec() { return this.secs[this.si]; },
    get ii() { return clamp(this.idx[this.sec?.key] || 0, 0, Math.max(0, (this.sec?.items.length || 1) - 1)); },
    fill() {
      const s = this.sec; if (!s) return;
      this.head.replaceChildren(api.glyph('lb'), h('b', { text: s.label.toUpperCase() }), api.glyph('rb'), h('small', { text: `${this.si + 1} / ${this.secs.length}` }));
      this.cards = s.items.map((it, i) => {
        const p = it.p;
        const el = h('button', { class: 'tg-card' }, h('div', { class: 'tg-chip' }), h('div', { class: 'tg-art' },
          p?.media.device ? h('img', { src: p.media.device, alt: '' }) : p?.media.logo ? h('img', { class: 'logo', src: p.media.logo, alt: '' }) : api.icon(it.ic || s.icon)),
          h('b', { text: it.label }), h('div', { class: 'tg-stripe' }));
        el.addEventListener('click', () => { if (i === this.ii) this.run(); else { this.idx[s.key] = i; this.paint(true); } });
        return el;
      });
      this.deck.replaceChildren(...this.cards);
    },
    run() { S.play('select'); this.lift.set(1); setTimeout(() => { this.lift.set(0); this.sec.items[this.ii]?.run(); }, 260); },
    paint(sound) {
      const s = this.sec, it = s?.items[this.ii], p = it?.p;
      this.cards?.forEach((e, i) => e.classList.toggle('on', i === this.ii));
      this.fan.set(this.ii);
      this.info.replaceChildren(h('b', { text: it?.label || '' }), h('span', { text: it?.sub || '' }));
      clearTimeout(this.vt); this.vid.pause(); this.tv.classList.remove('on');
      const vurl = api.videoFor(s, it);
      if (vurl && api.settings.autoVideo) this.vt = setTimeout(() => {
        if (api.top() !== 'home' || this.sec?.items[this.ii] !== it) return;
        if (this.vid.dataset.src !== vurl) { this.vid.dataset.src = vurl; this.vid.src = vurl; }
        this.vid.play().then(() => this.tv.classList.add('on')).catch(() => {});
      }, 800);
      if (sound) S.play('move', this.ii);
      api.updateAudio(); api.saveLast(); api.renderChrome();
    },
    setSec(n) {
      if (n === this.si) return S.play('error');
      this.si = n; this.fill(); this.fan.jump(this.ii); S.play('rotate'); this.paint(false);
    },
    enter() { Back.setImage(null); Back.setVideo(null); Back.setLook(''); this.paint(false); },
    resume() { this.lift.jump(0); this.enter(); },
    leave() { clearTimeout(this.vt); this.vid.pause(); },
    state() { return { key: this.sec?.key, idx: this.idx }; },
    restore(f) {
      if (!f) return;
      this.idx = f.idx || {};
      const i = this.secs.findIndex(s => s.key === f.key);
      if (i >= 0) this.si = i;
      if (this.secs.length) { this.fill(); this.fan.jump(this.ii); this.paint(false); }
    },
    musicKey() { const it = this.sec?.items[this.ii]; return it?.p ? 'p:' + it.p.name : null; },
    action(a) {
      if (a === 'lb' || a === 'rb') return this.setSec(clamp(this.si + (a === 'lb' ? -1 : 1), 0, this.secs.length - 1));
      if (a === 'left' || a === 'right') {
        const d = a === 'left' ? -1 : 1;
        const j = clamp(this.ii + d, 0, this.sec.items.length - 1);
        if (j === this.ii) return S.play('error');
        this.idx[this.sec.key] = j; this.paint(true);
      } else if (a === 'up' || a === 'down') this.setSec(clamp(this.si + (a === 'up' ? -1 : 1), 0, this.secs.length - 1));
      else if (a === 'a') this.run();
    },
    frame(dt) {
      this.t += dt; this.fan.step(dt); this.lift.step(dt);
      const r = rem(), cx = innerWidth * 0.5 - 8 * r, base = innerHeight * 0.78;
      // Abanico: las tarjetas giran alrededor de un punto bajo, como cartas en la mano.
      this.cards?.forEach((el, i) => {
        const off = i - this.fan.x;
        if (Math.abs(off) > 4.5) { el.style.visibility = 'hidden'; return; }
        el.style.visibility = '';
        const on = i === this.ii, ang = off * 9;
        const up = on ? (2.2 + this.lift.x * 9) * r : 0;
        el.style.transform = `translate3d(${(cx + off * 7.2 * r).toFixed(1)}px, ${(base - 22 * r - up + Math.abs(off) * Math.abs(off) * 0.35 * r).toFixed(1)}px, 0) rotate(${ang.toFixed(2)}deg)`;
        el.style.zIndex = String(100 - Math.round(Math.abs(off) * 10));
        el.style.opacity = on ? '1' : (1 - Math.abs(off) * 0.08).toFixed(3);
      });
    },
    // Fondo: negro con franjas naranjas y rojas en diagonal, como la caja de la consola (pequeño y pixelado).
    backdrop(g, W, H, dt, now) {
      const t = now / 1000;
      g.fillStyle = '#0a0806'; g.fillRect(0, 0, W, H);
      g.save(); g.translate(W * 0.1, H); g.rotate(-0.42);
      const cols = ['#ff7a00', '#ff4d00', '#d81e00'];
      cols.forEach((c, i) => { g.fillStyle = c; g.globalAlpha = 0.85 - i * 0.15; g.fillRect(-W, -H * (0.22 + i * 0.05) - Math.sin(t * 0.4) * 2, W * 3, Math.max(2, H * 0.025)); });
      g.restore(); g.globalAlpha = 1;
      g.fillStyle = 'rgba(255, 120, 0, .06)';
      for (let y = 0; y < H; y += 2) g.fillRect(0, y, W, 1);
    },
  };
  return self;
}
