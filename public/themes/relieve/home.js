// Tema «Relieve» (inspirado en la idea del Nintendo 3DS: 3D sin lentes, con un deslizador para elegir cuánto).
// Arriba, una escena con profundidad: rejilla al fondo, lo elegido flotando y el título al frente; se mece
// como si inclinaras la consola. LT/RT mueven el deslizador «3D». Abajo, cuadrícula de íconos como su menú HOME.
export default function relieve(api, root) {
  const { h, Spring, rem, clamp, S, Back } = api;
  const ROWS = 3;
  const self = {
    paintScale: 0.5,
    secs: [], si: 0, idx: {}, col: new Spring(0, { response: 0.35, damping: 1 }), depth: new Spring(0.7, { response: 0.3, damping: 1 }), t: 0, d3: 0.7,
    hints: () => [['lr', 'Elegir'], ['lbrb', 'Pestaña'], ['ltrt', 'Relieve 3D'], ['a', 'Abrir']],
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.far = h('div', { class: 'td-far' });
      this.mid = h('div', { class: 'td-mid' });
      this.vid = h('video', { muted: '', playsinline: '', loop: '' }); this.vid.muted = true;
      this.near = h('div', { class: 'td-near' });
      this.slider = h('div', { class: 'td-slider' }, h('b', { text: '3D' }), h('div', { class: 'td-rail' }, h('i')));
      this.stage = h('div', { class: 'td-stage' }, this.far, h('div', { class: 'td-midwrap' }, this.mid, this.vid), this.near, this.slider);
      this.bar = h('div', { class: 'td-bar' });
      this.grid = h('div', { class: 'td-grid' });
      this.bottom = h('div', { class: 'td-bottom' }, this.bar, this.grid);
      root.append(this.stage, this.bottom);
      this.si = clamp(this.si, 0, this.secs.length - 1);
      this.fill(); this.col.jump(Math.floor(this.ii / ROWS)); this.paint(false);
    },
    get sec() { return this.secs[this.si]; },
    get ii() { return clamp(this.idx[this.sec?.key] || 0, 0, Math.max(0, (this.sec?.items.length || 1) - 1)); },
    fill() {
      const s = this.sec; if (!s) return;
      this.bar.replaceChildren(api.glyph('lb'), ...this.secs.map((x, i) => h('span', { class: i === this.si ? 'on' : '', text: x.label })).slice(Math.max(0, this.si - 2), this.si + 3), api.glyph('rb'));
      this.icons = s.items.map((it, i) => {
        const p = it.p;
        const el = h('button', { class: 'td-ico' }, p?.media.device ? h('img', { src: p.media.device, alt: '' }) : p?.media.logo ? h('img', { src: p.media.logo, alt: '' }) : api.icon(it.ic || s.icon));
        el.addEventListener('click', () => { if (i === this.ii) this.run(); else { this.idx[s.key] = i; this.paint(true); } });
        return el;
      });
      this.grid.replaceChildren(...this.icons);
    },
    run() { S.play('select'); this.sec.items[this.ii]?.run(); },
    paint(sound) {
      const s = this.sec, it = s?.items[this.ii], p = it?.p;
      this.icons?.forEach((e, i) => e.classList.toggle('on', i === this.ii));
      this.col.set(Math.floor(this.ii / ROWS));
      this.mid.replaceChildren(p?.media.device ? h('img', { src: p.media.device, alt: '' }) : p?.media.logo ? h('img', { src: p.media.logo, alt: '' }) : api.icon(it?.ic || s?.icon));
      this.near.replaceChildren(h('b', { text: it?.label || '' }), h('span', { text: it?.sub || '' }));
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
      this.si = n; this.fill(); this.col.jump(Math.floor(this.ii / ROWS)); S.play('rotate'); this.paint(false);
    },
    enter() { Back.setImage(null); Back.setVideo(null); Back.setLook(''); this.paint(false); },
    resume() { this.enter(); },
    leave() { clearTimeout(this.vt); this.vid.pause(); },
    state() { return { key: this.sec?.key, idx: this.idx, d3: this.d3 }; },
    restore(f) {
      if (!f) return;
      this.idx = f.idx || {}; if (f.d3 != null) { this.d3 = f.d3; this.depth.jump(f.d3); }
      const i = this.secs.findIndex(s => s.key === f.key);
      if (i >= 0) this.si = i;
      if (this.secs.length) { this.fill(); this.col.jump(Math.floor(this.ii / ROWS)); this.paint(false); }
    },
    musicKey() { const it = this.sec?.items[this.ii]; return it?.p ? 'p:' + it.p.name : null; },
    action(a) {
      const n = this.sec.items.length, i = this.ii;
      let j = i;
      if (a === 'left') j = i - ROWS; else if (a === 'right') j = i + ROWS;
      else if (a === 'up') j = i % ROWS ? i - 1 : i; else if (a === 'down') j = i % ROWS < ROWS - 1 ? i + 1 : i;
      else if (a === 'lb' || a === 'rb') return this.setSec(clamp(this.si + (a === 'lb' ? -1 : 1), 0, this.secs.length - 1));
      else if (a === 'lt' || a === 'rt') { this.d3 = clamp(Math.round((this.d3 + (a === 'lt' ? -0.25 : 0.25)) * 4) / 4, 0, 1); this.depth.set(this.d3); S.play('toggle'); api.saveLast(); return; }
      else if (a === 'a') return this.run();
      else return;
      if (j < 0 || j >= n || j === i) { if (a === 'right' && i < n - 1 && j >= n) j = n - 1; else return S.play('error'); }
      this.idx[this.sec.key] = j; this.paint(true);
    },
    frame(dt) {
      this.t += dt; this.col.step(dt); this.depth.step(dt);
      const r = rem(), d = this.depth.x;
      // Paralaje: cada capa se mueve distinto según su profundidad; con el deslizador en 0, todo queda plano.
      const sx = Math.sin(this.t * 0.5) * r * 1.6 * d, sy = Math.cos(this.t * 0.37) * r * 0.7 * d;
      this.far.style.transform = `translate3d(${(-sx * 0.6).toFixed(1)}px, ${(-sy * 0.6).toFixed(1)}px, 0) scale(${(1 + 0.04 * d).toFixed(3)})`;
      this.mid.parentElement.style.transform = `translate3d(${(sx * 0.4).toFixed(1)}px, ${(sy * 0.4).toFixed(1)}px, 0)`;
      this.mid.parentElement.style.filter = `drop-shadow(${(1.2 * d).toFixed(2)}rem ${(1.4 * d).toFixed(2)}rem ${(1.2 * d).toFixed(2)}rem rgba(0,0,0,${(0.15 + 0.3 * d).toFixed(2)}))`;
      this.near.style.transform = `translate3d(${(sx * 1.2).toFixed(1)}px, ${(sy * 1.2).toFixed(1)}px, 0)`;
      this.slider.querySelector('i').style.transform = `translateY(${((1 - d) * 7.6 * r).toFixed(1)}px)`;
      const cw = 9.6 * r, x0 = 4 * r, lead = Math.max(0, this.col.x - 3); // la cuadrícula empieza a la izquierda y avanza cuando hace falta
      this.icons?.forEach((el, i) => {
        const c = Math.floor(i / ROWS), rr = i % ROWS, off = c - lead;
        el.style.transform = `translate3d(${(x0 + off * cw).toFixed(1)}px, ${(rr * 7.2 * r).toFixed(1)}px, 0)`;
        el.style.visibility = off < -1 || off > 9.5 ? 'hidden' : '';
      });
    },
    backdrop(g, W, H) { const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#f3f4f6'); bg.addColorStop(1, '#d9dce2'); g.fillStyle = bg; g.fillRect(0, 0, W, H); },
  };
  return self;
}
