// Tema «Lavanda» (inspirado en la consola de Super Nintendo de América): la pantalla es la cubierta gris con
// estrías de la consola. A la izquierda, un interruptor deslizable lavanda elige la sección; los cartuchos
// esperan en fila y el elegido entra en la ranura. El video se ve en una tele de tubo, con sus pixeles.
export default function lavanda(api, root) {
  const { h, Spring, rem, clamp, S, Back } = api;
  const self = {
    paintScale: 0.5,
    secs: [], si: 0, idx: {}, row: new Spring(0, { response: 0.36, damping: 0.9 }), knob: new Spring(0, { response: 0.3, damping: 0.75 }),
    insert: new Spring(1, { response: 0.42, damping: 0.8 }), t: 0,
    hints: () => [['lr', 'Cartucho'], ['ud', 'Sección'], ['a', 'Encender'], ['menu', 'Ajustes']],
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.knobEl = h('div', { class: 'sv-knob' }, h('i'), h('i'), h('i'));
      this.labels = this.secs.map((s, i) => {
        const el = h('div', { class: 'sv-lab', text: s.label });
        el.addEventListener('click', () => this.setSec(i));
        return el;
      });
      this.slider = h('div', { class: 'sv-slider' }, h('div', { class: 'sv-track' }, this.knobEl), h('div', { class: 'sv-labs' }, ...this.labels));
      this.slot = h('div', { class: 'sv-slot' }, h('div', { class: 'sv-door l' }), h('div', { class: 'sv-door r' }));
      this.big = h('div', { class: 'sv-cart big' });
      this.info = h('div', { class: 'sv-info' });
      this.shelf = h('div', { class: 'sv-shelf' });
      this.tvVideo = h('video', { muted: '', playsinline: '', loop: '' }); this.tvVideo.muted = true;
      this.tvArt = h('div', { class: 'sv-tvart' });
      this.tv = h('div', { class: 'sv-tv' }, h('div', { class: 'sv-screen' }, this.tvArt, this.tvVideo), h('div', { class: 'sv-tvbase' }));
      this.power = h('div', { class: 'sv-power' }, h('i'), h('span', { text: 'POWER' }));
      root.append(this.slider, this.slot, this.big, this.info, this.shelf, this.tv, this.power);
      this.si = clamp(this.si, 0, this.secs.length - 1); this.knob.jump(this.si);
      this.fill(); this.row.jump(this.ii);
      this.paint(false);
    },
    get sec() { return this.secs[this.si]; },
    get ii() { return clamp(this.idx[this.sec?.key] || 0, 0, Math.max(0, (this.sec?.items.length || 1) - 1)); },
    cart(it, s, cls = '') {
      const p = it?.p;
      return h('div', { class: 'sv-cart ' + cls }, h('div', { class: 'sv-grip' }),
        h('div', { class: 'sv-label' }, p?.media.device ? h('img', { src: p.media.device, alt: '' }) : p?.media.logo ? h('img', { class: 'logo', src: p.media.logo, alt: '' }) : api.icon(it?.ic || s?.icon),
          h('b', { text: it?.label || '' })));
    },
    fill() {
      const s = this.sec; if (!s) return;
      this.carts = s.items.map((it, i) => {
        const el = this.cart(it, s);
        el.addEventListener('click', () => { if (i === this.ii) this.run(); else { this.idx[s.key] = i; this.paint(true); } });
        return el;
      });
      this.shelf.replaceChildren(...this.carts);
    },
    run() { S.play('select'); this.sec.items[this.ii]?.run(); },
    paint(sound) {
      const s = this.sec, it = s?.items[this.ii], p = it?.p;
      this.labels.forEach((e, i) => e.classList.toggle('on', i === this.si));
      this.carts?.forEach((e, i) => e.classList.toggle('on', i === this.ii));
      this.knob.set(this.si); this.row.set(this.ii);
      // El cartucho elegido baja a la ranura.
      this.big.replaceChildren(...this.cart(it, s).childNodes);
      this.insert.jump(0); this.insert.set(1);
      this.info.replaceChildren(h('b', { text: it?.label || '' }), h('span', { text: it?.sub || '' }));
      this.tvArt.replaceChildren(p?.media.device ? h('img', { src: p.media.device, alt: '' }) : api.icon(it?.ic || s?.icon));
      clearTimeout(this.vt); this.tvVideo.pause(); this.tvVideo.classList.remove('on');
      const vurl = api.videoFor(s, it);
      if (vurl && api.settings.autoVideo) this.vt = setTimeout(() => {
        if (api.top() !== 'home' || this.sec?.items[this.ii] !== it) return;
        if (this.tvVideo.dataset.src !== vurl) { this.tvVideo.dataset.src = vurl; this.tvVideo.src = vurl; }
        this.tvVideo.play().then(() => this.tvVideo.classList.add('on')).catch(() => {});
      }, 800);
      if (sound) S.play('move', this.ii);
      api.updateAudio(); api.saveLast(); api.renderChrome();
    },
    setSec(n) {
      if (n === this.si) return S.play('error');
      this.si = n; this.fill(); this.row.jump(this.ii); S.play('rotate'); this.paint(false);
    },
    enter() { Back.setImage(null); Back.setVideo(null); Back.setLook(''); this.paint(false); },
    resume() { this.enter(); },
    leave() { clearTimeout(this.vt); this.tvVideo.pause(); },
    state() { return { key: this.sec?.key, idx: this.idx }; },
    restore(f) {
      if (!f) return;
      this.idx = f.idx || {};
      const i = this.secs.findIndex(s => s.key === f.key);
      if (i >= 0) { this.si = i; this.knob.jump(i); }
      if (this.secs.length) { this.fill(); this.row.jump(this.ii); this.paint(false); }
    },
    musicKey() { const it = this.sec?.items[this.ii]; return it?.p ? 'p:' + it.p.name : null; },
    action(a) {
      if (a === 'left' || a === 'right' || a === 'lb' || a === 'rb') {
        const d = a === 'left' ? -1 : a === 'right' ? 1 : a === 'lb' ? -5 : 5;
        const j = clamp(this.ii + d, 0, this.sec.items.length - 1);
        if (j === this.ii) return S.play('error');
        this.idx[this.sec.key] = j; this.paint(true);
      } else if (a === 'up' || a === 'down') this.setSec(clamp(this.si + (a === 'up' ? -1 : 1), 0, this.secs.length - 1));
      else if (a === 'a') this.run();
    },
    frame(dt) {
      this.t += dt; this.row.step(dt); this.knob.step(dt); this.insert.step(dt);
      const r = rem();
      // Interruptor: la perilla se desliza por su riel.
      const labH = 2.6 * r, first = clamp(this.knob.x - 4, 0, Math.max(0, this.secs.length - 8));
      this.knobEl.style.transform = `translate3d(0, ${((this.knob.x - first) * labH).toFixed(1)}px, 0)`;
      this.labels.forEach((el, i) => { const k = i - first; el.style.transform = `translate3d(0, ${(k * labH).toFixed(1)}px, 0)`; el.style.opacity = k < -0.5 || k > 7.5 ? 0 : 1; });
      // Fila de cartuchos.
      const cw = 11.6 * r, cx = innerWidth * 0.5 - 10.3 * r;
      this.carts?.forEach((el, i) => {
        const off = i - this.row.x;
        if (Math.abs(off) > 5) { el.style.visibility = 'hidden'; return; }
        el.style.visibility = '';
        const on = i === this.ii;
        el.style.transform = `translate3d(${(cx + off * cw).toFixed(1)}px, ${(on ? -1.4 * r : 0).toFixed(1)}px, 0) scale(${on ? 1.04 : 0.94})`;
        el.style.opacity = (on ? 0.35 : 1 - Math.abs(off) * 0.12).toFixed(3);
      });
      // El grande entra a la ranura desde arriba.
      const ins = this.insert.x;
      this.big.style.transform = `translate3d(0, ${((1 - ins) * -6 * r).toFixed(1)}px, 0)`;
      this.big.style.opacity = Math.min(1, ins * 1.5).toFixed(3);
    },
    // Fondo: la cubierta gris de la consola con sus estrías (pequeño y pixelado).
    backdrop(g, W, H) {
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#d9d9e0'); bg.addColorStop(1, '#b9b9c4');
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(80, 80, 100, .12)';
      for (let y = Math.round(H * 0.78); y < H; y += 3) g.fillRect(0, y, W, 1);
      g.fillStyle = 'rgba(255, 255, 255, .5)';
      for (let y = Math.round(H * 0.78) + 1; y < H; y += 3) g.fillRect(0, y, W, 1);
    },
  };
  return self;
}
