// Tema «Índigo» (inspirado en Game Boy Color y Game Boy Advance): plástico translúcido de colores con el circuito
// a la vista, una pantalla ancha (3:2) con su marco oscuro y una lista a la izquierda. Cada pestaña cambia el
// color de la carcasa, como las ediciones de colores de la época. LB/RB cambian de pestaña.
export default function indigo(api, root) {
  const { h, Spring, rem, clamp, S, Back } = api;
  const SHELLS = [['Morado', '#5b3fc4'], ['Uva', '#8b3fc4'], ['Mora', '#c43f86'], ['Kiwi', '#5fae2e'], ['Mandarina', '#ef7d1a'], ['Turquesa', '#1fa7a8'], ['Índigo', '#3a3fb4']];
  const self = {
    paintScale: 0.4,
    secs: [], si: 0, idx: {}, listS: new Spring(0, { response: 0.25, damping: 1 }), t: 0,
    hints: () => [['ud', 'Elegir'], ['lbrb', 'Pestaña'], ['a', 'Abrir'], ['menu', 'Ajustes']],
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.tabs = h('div', { class: 'gx-tabs' });
      this.list = h('div', { class: 'gx-list' });
      this.vid = h('video', { muted: '', playsinline: '', loop: '' }); this.vid.muted = true;
      this.art = h('div', { class: 'gx-art' });
      this.lcd = h('div', { class: 'gx-lcd' }, this.art, this.vid);
      this.info = h('div', { class: 'gx-info' });
      this.shell = h('div', { class: 'gx-shell' }, h('div', { class: 'gx-circuit' }), h('div', { class: 'gx-bezel' }, h('i', { class: 'gx-led' }), this.lcd), this.info);
      root.append(this.tabs, h('div', { class: 'gx-side' }, this.list), this.shell);
      this.si = clamp(this.si, 0, this.secs.length - 1);
      this.fill(); this.listS.jump(this.ii); this.paint(false);
    },
    get sec() { return this.secs[this.si]; },
    get ii() { return clamp(this.idx[this.sec?.key] || 0, 0, Math.max(0, (this.sec?.items.length || 1) - 1)); },
    fill() {
      const s = this.sec; if (!s) return;
      const [name, col] = SHELLS[this.si % SHELLS.length];
      root.style.setProperty('--shell', col);
      this.tabs.replaceChildren(api.glyph('lb'), ...this.secs.map((x, i) => { const el = h('span', { class: i === this.si ? 'on' : '', style: `--c:${SHELLS[i % SHELLS.length][1]}`, text: x.label }); el.addEventListener('click', () => this.setSec(i)); return el; }), api.glyph('rb'));
      this.rows = s.items.map((it, i) => {
        const el = h('div', { class: 'gx-row' }, h('em', { text: '▶' }), h('span', { text: it.label }));
        el.addEventListener('click', () => { if (i === this.ii) this.run(); else { this.idx[s.key] = i; this.paint(true); } });
        return el;
      });
      this.list.replaceChildren(...this.rows);
      this.shellName = name;
    },
    run() { S.play('select'); this.sec.items[this.ii]?.run(); },
    paint(sound) {
      const s = this.sec, it = s?.items[this.ii], p = it?.p;
      this.rows?.forEach((e, i) => e.classList.toggle('on', i === this.ii));
      this.listS.set(this.ii);
      this.art.replaceChildren(p?.media.device ? h('img', { src: p.media.device, alt: '' }) : p?.media.logo ? h('img', { src: p.media.logo, alt: '' }) : api.icon(it?.ic || s?.icon));
      this.info.replaceChildren(h('small', { text: `Edición ${this.shellName}` }), h('b', { text: it?.label || '' }), h('span', { text: it?.sub || '' }));
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
      if (i >= 0) this.si = i;
      if (this.secs.length) { this.fill(); this.listS.jump(this.ii); this.paint(false); }
    },
    musicKey() { const it = this.sec?.items[this.ii]; return it?.p ? 'p:' + it.p.name : null; },
    action(a) {
      if (a === 'lb' || a === 'rb' || a === 'left' || a === 'right') return this.setSec(clamp(this.si + (a === 'lb' || a === 'left' ? -1 : 1), 0, this.secs.length - 1));
      if (a === 'up' || a === 'down') {
        const j = clamp(this.ii + (a === 'up' ? -1 : 1), 0, this.sec.items.length - 1);
        if (j === this.ii) return S.play('error');
        this.idx[this.sec.key] = j; this.paint(true);
      } else if (a === 'a') this.run();
    },
    frame(dt) {
      this.t += dt; this.listS.step(dt);
      const r = rem(), rowH = 3.2 * r;
      if (this.rows) {
        const vis = Math.max(4, Math.floor(this.list.clientHeight / rowH));
        const first = clamp(this.listS.x - 4, 0, Math.max(0, this.rows.length - vis));
        this.rows.forEach((el, i) => { const k = i - first; el.style.transform = `translate3d(0, ${Math.round(k * rowH)}px, 0)`; el.style.visibility = k < -0.5 || k > vis - 0.5 ? 'hidden' : ''; });
      }
    },
    // Fondo: del color de la carcasa, con burbujas de plástico y brillo.
    backdrop(g, W, H, dt, now) {
      const col = getComputedStyle(root).getPropertyValue('--shell').trim() || '#5b3fc4';
      g.fillStyle = '#16131f'; g.fillRect(0, 0, W, H);
      const gr = g.createRadialGradient(W * 0.65, H * 0.45, 0, W * 0.65, H * 0.45, W * 0.6);
      gr.addColorStop(0, col + '66'); gr.addColorStop(1, col + '00');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    },
  };
  return self;
}
