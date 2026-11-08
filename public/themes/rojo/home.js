// Tema «Rojo» (inspirado en Virtual Boy): solo rojo sobre negro, como su pantalla de LED. Un túnel de líneas
// se pierde al fondo; la opción elegida se adelanta hacia ti como en su 3D y las demás se quedan atrás.
// Imágenes y videos se ven en tonos de rojo. LB/RB cambian de pestaña; arriba/abajo, la lista.
export default function rojo(api, root) {
  const { h, Spring, rem, clamp, S, Back } = api;
  const self = {
    paintScale: 0.35,
    secs: [], si: 0, idx: {}, listS: new Spring(0, { response: 0.3, damping: 0.9 }), t: 0,
    hints: () => [['ud', 'Elegir'], ['lbrb', 'Pestaña'], ['a', 'Abrir'], ['menu', 'Ajustes']],
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.tabs = h('div', { class: 'vb-tabs' });
      this.list = h('div', { class: 'vb-list' });
      this.vid = h('video', { muted: '', playsinline: '', loop: '' }); this.vid.muted = true;
      this.art = h('div', { class: 'vb-art' });
      this.view = h('div', { class: 'vb-view' }, this.art, this.vid);
      this.info = h('div', { class: 'vb-info' });
      root.append(this.tabs, this.list, this.view, this.info);
      this.si = clamp(this.si, 0, this.secs.length - 1);
      this.fill(); this.listS.jump(this.ii); this.paint(false);
    },
    get sec() { return this.secs[this.si]; },
    get ii() { return clamp(this.idx[this.sec?.key] || 0, 0, Math.max(0, (this.sec?.items.length || 1) - 1)); },
    fill() {
      const s = this.sec; if (!s) return;
      this.tabs.replaceChildren(api.glyph('lb'), ...this.secs.map((x, i) => h('span', { class: i === this.si ? 'on' : '', text: x.label.toUpperCase() })).slice(Math.max(0, this.si - 2), this.si + 3), api.glyph('rb'));
      this.rows = s.items.map((it, i) => {
        const el = h('div', { class: 'vb-row' }, h('span', { text: it.label.toUpperCase() }));
        el.addEventListener('click', () => { if (i === this.ii) this.run(); else { this.idx[s.key] = i; this.paint(true); } });
        return el;
      });
      this.list.replaceChildren(...this.rows);
    },
    run() { S.play('select'); this.sec.items[this.ii]?.run(); },
    paint(sound) {
      const s = this.sec, it = s?.items[this.ii], p = it?.p;
      this.rows?.forEach((e, i) => e.classList.toggle('on', i === this.ii));
      this.listS.set(this.ii);
      this.art.replaceChildren(p?.media.device ? h('img', { src: p.media.device, alt: '' }) : p?.media.logo ? h('img', { src: p.media.logo, alt: '' }) : api.icon(it?.ic || s?.icon));
      this.info.replaceChildren(h('b', { text: (it?.label || '').toUpperCase() }), h('span', { text: (it?.sub || '').toUpperCase() }));
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
      const r = rem(), rowH = 3.6 * r, cy = this.list.clientHeight / 2;
      // Profundidad: la elegida al frente (grande y brillante), las demás se van atrás y se apagan.
      this.rows?.forEach((el, i) => {
        const off = i - this.listS.x, d = Math.min(1, Math.abs(off) / 4);
        if (Math.abs(off) > 5) { el.style.visibility = 'hidden'; return; }
        el.style.visibility = '';
        el.style.transform = `translate3d(${(off * off * 0.25 * r).toFixed(1)}px, ${(cy + off * rowH * (1 - d * 0.2) - 1.6 * r).toFixed(1)}px, 0) scale(${(1.25 - d * 0.55).toFixed(3)})`;
        el.style.opacity = (1 - d * 0.75).toFixed(3);
      });
    },
    // Fondo: túnel de líneas rojas que avanza hacia ti.
    backdrop(g, W, H, dt, now) {
      const t = now / 1000;
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      const cx = W * 0.62, cy = H * 0.48;
      g.strokeStyle = '#ff0000'; g.lineWidth = 1;
      for (let k = 0; k < 10; k++) {
        const z = ((k + (t * 0.6) % 1) / 10), s = z * z;
        g.globalAlpha = 0.15 + s * 0.6;
        g.strokeRect(cx - W * 0.7 * s, cy - H * 0.7 * s, W * 1.4 * s, H * 1.4 * s);
      }
      g.globalAlpha = 0.35;
      for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]]) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(x, y); g.stroke(); }
      g.globalAlpha = 1;
    },
  };
  return self;
}
