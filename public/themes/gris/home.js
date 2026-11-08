// Tema «Gris» (inspirado en el NES de 1985): arriba, una pantalla negra de título de 8 bits con cursor ►
// y «PRESIONA A» parpadeando; abajo, el frente de la consola en dos grises con estrías, donde se elige la sección
// y un foco rojo marca la que está encendida.
export default function gris(api, root) {
  const { h, Spring, rem, clamp, S, Back } = api;
  const PAL = ['#f83800', '#00a800', '#0058f8', '#f8b800', '#d800cc', '#00b8d8'];
  const self = {
    paintScale: 0.14,
    secs: [], si: 0, idx: {}, listS: new Spring(0, { response: 0.2, damping: 1 }), band: new Spring(0, { response: 0.3, damping: 1 }), t: 0,
    hints: () => [['ud', 'Elegir'], ['lbrb', 'Pestaña'], ['a', 'Empezar'], ['menu', 'Ajustes']],
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.title = h('div', { class: 'ne-title' });
      this.list = h('div', { class: 'ne-list' });
      this.pic = h('div', { class: 'ne-pic' });
      this.vid = h('video', { muted: '', playsinline: '', loop: '' }); this.vid.muted = true;
      this.box = h('div', { class: 'ne-frame' }, this.pic, this.vid);
      this.push = h('div', { class: 'ne-push', text: 'PRESIONA A' });
      this.sub = h('div', { class: 'ne-sub' });
      this.tabs = this.secs.map((s, i) => { const el = h('div', { class: 'ne-tab' }, h('i'), h('span', { text: s.label.toUpperCase() })); el.addEventListener('click', () => this.setSec(i)); return el; });
      this.tabRow = h('div', { class: 'ne-tabs' }, ...this.tabs);
      this.tabKeys = h('div', { class: 'ne-keys' }, api.glyph('lb'), api.glyph('rb'));
      this.front = h('div', { class: 'ne-front' }, h('div', { class: 'ne-top' }), h('div', { class: 'ne-face' },
        h('div', { class: 'ne-btns' }, h('b', { text: 'POWER' }), h('b', { text: 'RESET' })), this.tabRow, this.tabKeys));
      root.append(this.title, this.list, this.box, this.sub, this.push, this.front);
      this.si = clamp(this.si, 0, this.secs.length - 1);
      this.fill(); this.listS.jump(this.ii); this.band.jump(this.si);
      this.paint(false);
    },
    get sec() { return this.secs[this.si]; },
    get ii() { return clamp(this.idx[this.sec?.key] || 0, 0, Math.max(0, (this.sec?.items.length || 1) - 1)); },
    fill() {
      const s = this.sec; if (!s) return;
      // Letras del título: cada una con sombra de un color de la paleta.
      this.title.replaceChildren(...[...s.label.toUpperCase()].map((ch, i) => h('span', { text: ch === ' ' ? ' ' : ch, style: `--s:${PAL[(i + this.si) % PAL.length]}` })));
      this.rows = s.items.map((it, i) => {
        const el = h('div', { class: 'ne-row' }, h('em', { text: '►' }), h('span', { text: it.label.toUpperCase() }));
        el.addEventListener('click', () => { if (i === this.ii) this.run(); else { this.idx[s.key] = i; this.paint(true); } });
        return el;
      });
      this.list.replaceChildren(...this.rows);
    },
    run() { S.play('select'); this.sec.items[this.ii]?.run(); },
    paint(sound) {
      const s = this.sec, it = s?.items[this.ii], p = it?.p;
      this.rows?.forEach((e, i) => e.classList.toggle('on', i === this.ii));
      this.tabs.forEach((e, i) => e.classList.toggle('on', i === this.si));
      this.listS.set(this.ii); this.band.set(this.si);
      this.pic.replaceChildren(p?.media.device ? h('img', { src: p.media.device, alt: '' }) : p?.media.logo ? h('img', { src: p.media.logo, alt: '' }) : api.icon(it?.ic || s?.icon));
      this.sub.textContent = (it?.sub || '').toUpperCase();
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
    setSec(n) {
      if (n === this.si) return S.play('error');
      this.si = n; this.fill(); this.listS.jump(this.ii); S.play('rotate'); this.paint(false);
    },
    enter() { Back.setImage(null); Back.setVideo(null); Back.setLook(''); this.paint(false); },
    resume() { this.enter(); },
    leave() { clearTimeout(this.vt); this.vid.pause(); },
    state() { return { key: this.sec?.key, idx: this.idx }; },
    restore(f) {
      if (!f) return;
      this.idx = f.idx || {};
      const i = this.secs.findIndex(s => s.key === f.key);
      if (i >= 0) { this.si = i; this.band.jump(i); }
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
      } else if (a === 'a') this.run();
    },
    frame(dt) {
      this.t += dt; this.listS.step(dt); this.band.step(dt);
      const r = rem(), rowH = 3 * r, step = v => Math.round(v / (0.5 * r)) * 0.5 * r; // movimiento por saltos
      if (this.rows) {
        const vis = Math.max(4, Math.floor(this.list.clientHeight / rowH));
        const first = clamp(this.listS.x - 3, 0, Math.max(0, this.rows.length - vis));
        this.rows.forEach((el, i) => { const k = i - first; el.style.transform = `translate3d(0, ${step(k * rowH)}px, 0)`; el.style.visibility = k < -0.5 || k > vis - 0.5 ? 'hidden' : ''; });
      }
      const blink = Math.floor(this.t * 2) % 2 === 0;
      root.classList.toggle('ne-blink', blink);
      // Pestañas en el frente: la encendida queda cerca del centro.
      const tw = 15 * r;
      this.tabs.forEach((el, i) => { el.style.transform = `translate3d(${step((i - this.band.x) * tw)}px, 0, 0)`; el.style.visibility = Math.abs(i - this.band.x) > 1.6 ? 'hidden' : ''; });
    },
    // Fondo: negro con estrellas de 1 pixel que titilan (se pinta muy pequeño y se amplía pixelado).
    backdrop(g, W, H, dt, now) {
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      const f = Math.floor(now / 400);
      for (let i = 0; i < 40; i++) {
        const x = (i * 97) % W, y = (i * 53) % Math.round(H * 0.72);
        if ((i + f) % 5 === 0) continue;
        g.fillStyle = (i + f) % 7 === 0 ? '#fcfcfc' : i % 3 ? '#3cbcfc' : '#7c7c7c';
        g.fillRect(x, y, 1, 1);
      }
    },
  };
  return self;
}
