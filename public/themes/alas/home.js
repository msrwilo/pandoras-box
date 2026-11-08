// Tema «Alas» (inspirado en el inicio de PlayStation 5): arriba, pestañas de texto; una fila de cuadros
// pequeños donde el elegido crece y su nombre aparece a su lado; todo el fondo es la imagen o el video de lo
// elegido; abajo, el título grande, un botón blanco y tarjetas de información.
export default function alas(api, root) {
  const { h, Spring, rem, clamp, fmtN, ord, S, Back } = api;
  const self = {
    paintScale: 0.5,
    secs: [], si: 0, idx: {}, row: new Spring(0, { response: 0.34, damping: 1 }), t: 0,
    hints: () => [['lr', 'Elegir'], ['lbrb', 'Pestaña'], ['a', 'Abrir'], ['menu', 'Ajustes']],
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.tabs = h('div', { class: 'p5-tabs' });
      this.row_ = h('div', { class: 'p5-row' });
      this.name = h('div', { class: 'p5-name' });
      this.hero = h('div', { class: 'p5-hero' });
      this.cards = h('div', { class: 'p5-cards' });
      root.append(this.tabs, this.row_, this.name, this.hero, this.cards);
      this.si = clamp(this.si, 0, this.secs.length - 1);
      this.fill(); this.row.jump(this.ii); this.paint(false);
    },
    get sec() { return this.secs[this.si]; },
    get ii() { return clamp(this.idx[this.sec?.key] || 0, 0, Math.max(0, (this.sec?.items.length || 1) - 1)); },
    fill() {
      const s = this.sec; if (!s) return;
      this.tabs.replaceChildren(api.glyph('lb'), ...this.secs.map((x, i) => { const el = h('span', { class: i === this.si ? 'on' : '', text: x.label }); el.addEventListener('click', () => this.setSec(i)); return el; }), api.glyph('rb'));
      this.tiles = s.items.map((it, i) => {
        const p = it.p;
        const el = h('button', { class: 'p5-tile' }, p?.media.device ? h('img', { src: p.media.device, alt: '' }) : p?.media.logo ? h('img', { class: 'logo', src: p.media.logo, alt: '' }) : api.icon(it.ic || s.icon));
        el.addEventListener('click', () => { if (i === this.ii) this.run(); else { this.idx[s.key] = i; this.paint(true); } });
        return el;
      });
      this.row_.replaceChildren(...this.tiles);
    },
    run() { S.play('select'); this.sec.items[this.ii]?.run(); },
    paint(sound) {
      const s = this.sec, it = s?.items[this.ii], p = it?.p;
      this.tiles?.forEach((e, i) => e.classList.toggle('on', i === this.ii));
      this.row.set(this.ii);
      this.name.textContent = it?.label || '';
      this.hero.replaceChildren(p?.media.logo ? h('img', { class: 'p5-logo', src: p.media.logo, alt: it.label }) : h('h1', { text: it?.label || '' }),
        h('div', { class: 'p5-btns' }, h('button', { class: 'p5-play', text: 'Abrir' }), h('button', { class: 'p5-more', text: '•••' })));
      this.hero.querySelector('.p5-play').addEventListener('click', () => this.run());
      const facts = [p?.year && ['Año', p.year], p?.generation && ['Generación', ord(p.generation)], (p?.count ?? it?.coll?.count) != null && ['Juegos', fmtN(p?.count ?? it.coll.count)], p?.manufacturer && ['Fabricante', p.manufacturer]].filter(Boolean);
      this.cards.replaceChildren(...facts.map(([k, v]) => h('div', { class: 'p5-card' }, h('small', { text: k }), h('b', { text: String(v) }))),
        ...(it?.desc ? [h('div', { class: 'p5-card wide' }, h('small', { text: 'Acerca de' }), h('p', { text: it.desc.slice(0, 170) + (it.desc.length > 170 ? '…' : '') }))] : []));
      // El fondo completo es lo elegido: su video o, mientras, la imagen de la consola.
      Back.setImage(p?.media.banner || p?.media.fanart || null);
      clearTimeout(this.vt);
      const vurl = api.videoFor(s, it);
      if (Back.video !== vurl) Back.setVideo(null);
      if (vurl && api.settings.autoVideo && Back.video !== vurl) this.vt = setTimeout(() => { if (api.top() === 'home') Back.setVideo(vurl); }, 900);
      if (sound) S.play('move', this.ii);
      api.updateAudio(); api.saveLast(); api.renderChrome();
    },
    setSec(n) {
      if (n === this.si) return S.play('error');
      this.si = n; this.fill(); this.row.jump(this.ii); S.play('rotate'); this.paint(false);
    },
    enter() { Back.setLook('clear'); this.paint(false); },
    resume() { this.enter(); },
    leave() { clearTimeout(this.vt); Back.setLook(''); },
    state() { return { key: this.sec?.key, idx: this.idx }; },
    restore(f) {
      if (!f) return;
      this.idx = f.idx || {};
      const i = this.secs.findIndex(s => s.key === f.key);
      if (i >= 0) this.si = i;
      if (this.secs.length) { this.fill(); this.row.jump(this.ii); this.paint(false); }
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
      this.t += dt; this.row.step(dt);
      const r = rem(), small = 7 * r, big = 10.4 * r, gap = 1 * r, x0 = 4 * r;
      // Los cuadros anteriores se van a la izquierda; el elegido queda primero y más grande.
      let nameX = x0 + big + 1.4 * r;
      this.tiles?.forEach((el, i) => {
        const off = i - this.row.x, on = i === this.ii;
        const gapName = 17 * r; // espacio para el nombre del elegido
        const x = off <= 0 ? x0 + off * (small + gap) : x0 + Math.min(off, 1) * (big + gap + gapName) + Math.max(0, off - 1) * (small + gap);
        el.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
        el.style.width = el.style.height = (on ? big : small) + 'px';
        el.style.opacity = off < -0.5 ? '0' : '1';
      });
      this.name.style.transform = `translate3d(${nameX.toFixed(1)}px, 0, 0)`;
    },
  };
  return self;
}
