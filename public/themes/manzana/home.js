// Tema «Apple TV»: arriba la «franja superior» con el arte grande de lo elegido; abajo, filas de íconos
// rectangulares que se levantan con brillo al enfocarlos. Arriba/abajo cambia de fila.
export default function manzana(api, root) {
  const { h, Spring, rem, clamp, S, Back } = api;
  const self = {
    paintScale: 0.4,
    secs: [], si: 0, idx: {}, x: new Spring(0, { response: 0.3, damping: 0.9 }), y: new Spring(0, { response: 0.36, damping: 1 }), tilt: 0, t: 0,
    hints: () => [['lr', 'Elegir'], ['ud', 'Fila'], ['a', 'Abrir'], ['menu', 'Ajustes']],
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.shelfA = h('div', { class: 'tv-shelf' }); this.shelfB = h('div', { class: 'tv-shelf' }); this.flip = false;
      this.vid = h('video', { class: 'tv-vid', muted: '', playsinline: '', loop: '' }); this.vid.muted = true;
      this.shelfText = h('div', { class: 'tv-stext' });
      this.rows = this.secs.map((s, si) => {
        const icons = s.items.map((it, i) => {
          const p = it.p, img = p?.media.logo || p?.media.device;
          const el = h('button', { class: 'tv-icon' + (img ? ' has-img' : '') },
            h('div', { class: 'tv-face' }, img ? h('img', { src: img, alt: '' }) : api.icon(it.ic || s.icon), h('i', { class: 'tv-glare' })),
            h('span', { class: 'tv-name', text: it.label }));
          el.addEventListener('click', () => { if (si === this.si && i === this.ii) this.run(); else { this.si = si; this.idx[s.key] = i; this.paint(true); } });
          return el;
        });
        const row = h('div', { class: 'tv-row' }, h('div', { class: 'tv-rlabel', text: s.label }), h('div', { class: 'tv-icons' }, ...icons));
        return { row, icons, x: new Spring(0, { response: 0.32, damping: 1 }) };
      });
      this.list = h('div', { class: 'tv-list' }, ...this.rows.map(r => r.row));
      root.append(this.shelfA, this.shelfB, this.vid, h('div', { class: 'tv-shade' }), this.shelfText, this.list);
      this.si = clamp(this.si, 0, this.secs.length - 1);
      this.y.jump(this.si); this.rows.forEach((r, i) => r.x.jump(this.idxOf(i)));
      this.paint(false);
    },
    idxOf(si) { const s = this.secs[si]; return s ? clamp(this.idx[s.key] || 0, 0, Math.max(0, s.items.length - 1)) : 0; },
    get sec() { return this.secs[this.si]; },
    get ii() { return this.idxOf(this.si); },
    run() { S.play('select'); this.sec.items[this.ii]?.run(); },
    setShelf(url) {
      if ((this.shUrl || null) === (url || null)) return;
      this.shUrl = url; this.flip = !this.flip;
      const on = this.flip ? this.shelfA : this.shelfB, off = this.flip ? this.shelfB : this.shelfA;
      on.style.backgroundImage = url ? `url("${url}")` : ''; on.classList.add('on'); off.classList.remove('on');
    },
    paint(sound) {
      const s = this.sec, it = s?.items[this.ii], p = it?.p;
      this.rows.forEach((r, ri) => {
        r.row.classList.toggle('on', ri === this.si);
        r.icons.forEach((c, i) => c.classList.toggle('on', ri === this.si && i === this.ii));
        r.x.set(this.idxOf(ri));
      });
      this.y.set(this.si);
      const fan = p?.media.fanart; this.setShelf(fan?.length ? fan[(this.ii * 3) % fan.length] : null);
      this.shelfText.replaceChildren(h('small', { text: s?.label || '' }), h('b', { text: it?.label || '' }), h('span', { text: it?.sub || '' }));
      this.shelfText.classList.toggle('dim', !!fan?.length);
      clearTimeout(this.vt); this.vid.pause(); this.vid.classList.remove('on');
      const vurl = api.videoFor(s, it);
      if (vurl && api.settings.autoVideo) this.vt = setTimeout(() => {
        if (api.top() !== 'home' || this.sec?.items[this.ii] !== it) return;
        if (this.vid.dataset.src !== vurl) { this.vid.dataset.src = vurl; this.vid.src = vurl; }
        this.vid.play().then(() => this.vid.classList.add('on')).catch(() => {});
      }, 1100);
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
      if (this.rows) { this.y.jump(this.si); this.rows.forEach((r, ri) => r.x.jump(this.idxOf(ri))); this.paint(false); }
    },
    musicKey() { const it = this.sec?.items[this.ii]; return it?.p ? 'p:' + it.p.name : null; },
    action(a) {
      if (a === 'left' || a === 'right' || a === 'lb' || a === 'rb') {
        const d = a === 'left' ? -1 : a === 'right' ? 1 : a === 'lb' ? -5 : 5;
        const j = clamp(this.ii + d, 0, this.sec.items.length - 1);
        if (j === this.ii) { this.tilt = d < 0 ? -1 : 1; return S.play('error'); }
        this.tilt = d < 0 ? -0.6 : 0.6;
        this.idx[this.sec.key] = j; this.paint(true);
      } else if (a === 'up' || a === 'down') {
        const n = clamp(this.si + (a === 'up' ? -1 : 1), 0, this.secs.length - 1);
        if (n === this.si) return S.play('error');
        this.si = n; S.play('rotate'); this.paint(false);
      } else if (a === 'a') this.run();
    },
    frame(dt) {
      this.t += dt; this.y.step(dt); this.tilt *= Math.pow(0.02, dt);
      if (!this.rows) return;
      const r = rem(), rowH = 16.6 * r, cw = 17.6 * r;
      this.list.style.transform = `translate3d(0,${(-this.y.x * rowH).toFixed(1)}px,0)`;
      this.rows.forEach((row, ri) => {
        row.x.step(dt);
        const first = Math.max(0, row.x.x - 1.2);
        row.icons.forEach((c, i) => {
          const o = i - first;
          const foc = ri === this.si && i === this.ii;
          const lift = foc ? `scale(1.12) rotateY(${(this.tilt * 8 + Math.sin(this.t * 0.8) * 2).toFixed(2)}deg) rotateX(${(Math.cos(this.t * 0.7) * 2).toFixed(2)}deg)` : '';
          c.style.transform = `translate3d(${(o * cw).toFixed(1)}px,0,0) ${lift}`;
          c.style.visibility = o < -1.2 || o > 7 ? 'hidden' : '';
          c.style.opacity = o < -0.2 ? Math.max(0, 1 + (o + 0.2) * 1.4).toFixed(3) : '';
          if (foc) c.style.setProperty('--gx', (50 + this.tilt * 40 + Math.sin(this.t * 0.8) * 18).toFixed(1) + '%');
        });
      });
    },
    backdrop(g, W, H) { g.fillStyle = '#0b0b0e'; g.fillRect(0, 0, W, H); },
  };
  return self;
}
