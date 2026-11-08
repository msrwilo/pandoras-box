// Tema «Plaza» (inspirado en la idea de Wii U: la tele y el control con pantalla, y una plaza donde la gente se
// reúne alrededor de los juegos). Arriba, las opciones flotan en semicírculo sobre un piso claro y unas personitas
// caminan hacia la elegida, que muestra su globo de texto. Abajo, la segunda pantalla: pestañas e íconos.
export default function plaza(api, root) {
  const { h, Spring, rem, clamp, S, Back } = api;
  const self = {
    paintScale: 0.5,
    secs: [], si: 0, idx: {}, arc: new Spring(0, { response: 0.45, damping: 0.9 }), strip: new Spring(0, { response: 0.32, damping: 1 }), t: 0,
    hints: () => [['lr', 'Elegir'], ['lbrb', 'Pestaña'], ['a', 'Abrir'], ['menu', 'Ajustes']],
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.floats = h('div', { class: 'wu-floats' });
      this.bubble = h('div', { class: 'wu-bubble' });
      this.vid = h('video', { muted: '', playsinline: '', loop: '' }); this.vid.muted = true;
      this.screen = h('div', { class: 'wu-screen' }, this.vid);
      this.people = Array.from({ length: 22 }, (_, i) => ({ el: h('i', { class: 'wu-p', style: `--c:${['#5ab4f0', '#f07ab4', '#8ad05a', '#f0c85a', '#b48af0', '#f0965a'][i % 6]}` }), a: Math.random() * 6.28, r: 0.35 + Math.random() * 0.6, sp: 0.2 + Math.random() * 0.3 }));
      this.crowd = h('div', { class: 'wu-crowd' }, ...this.people.map(p => p.el));
      this.tabs = h('div', { class: 'wu-tabs' });
      this.grid = h('div', { class: 'wu-grid' });
      this.pad = h('div', { class: 'wu-pad' }, this.tabs, this.grid);
      root.append(h('div', { class: 'wu-plaza' }, this.crowd, this.floats, this.screen, this.bubble), this.pad);
      this.si = clamp(this.si, 0, this.secs.length - 1);
      this.fill(); this.arc.jump(this.ii); this.strip.jump(this.ii); this.paint(false);
    },
    get sec() { return this.secs[this.si]; },
    get ii() { return clamp(this.idx[this.sec?.key] || 0, 0, Math.max(0, (this.sec?.items.length || 1) - 1)); },
    art(it, s) { const p = it?.p; return p?.media.device ? h('img', { src: p.media.device, alt: '' }) : p?.media.logo ? h('img', { src: p.media.logo, alt: '' }) : api.icon(it?.ic || s?.icon); },
    fill() {
      const s = this.sec; if (!s) return;
      this.tabs.replaceChildren(api.glyph('lb'), ...this.secs.map((x, i) => { const el = h('span', { class: i === this.si ? 'on' : '', text: x.label }); el.addEventListener('click', () => this.setSec(i)); return el; }), api.glyph('rb'));
      this.fl = s.items.map(it => h('div', { class: 'wu-float' }, this.art(it, s)));
      this.floats.replaceChildren(...this.fl);
      this.icons = s.items.map((it, i) => {
        const el = h('button', { class: 'wu-ico' }, this.art(it, s));
        el.addEventListener('click', () => { if (i === this.ii) this.run(); else { this.idx[s.key] = i; this.paint(true); } });
        return el;
      });
      this.grid.replaceChildren(...this.icons);
    },
    run() { S.play('select'); this.sec.items[this.ii]?.run(); },
    paint(sound) {
      const s = this.sec, it = s?.items[this.ii];
      this.icons?.forEach((e, i) => e.classList.toggle('on', i === this.ii));
      this.fl?.forEach((e, i) => e.classList.toggle('on', i === this.ii));
      this.arc.set(this.ii); this.strip.set(this.ii);
      this.bubble.replaceChildren(h('b', { text: it?.label || '' }), h('span', { text: it?.sub || '' }));
      clearTimeout(this.vt); this.vid.pause(); this.screen.classList.remove('on');
      const vurl = api.videoFor(s, it);
      if (vurl && api.settings.autoVideo) this.vt = setTimeout(() => {
        if (api.top() !== 'home' || this.sec?.items[this.ii] !== it) return;
        if (this.vid.dataset.src !== vurl) { this.vid.dataset.src = vurl; this.vid.src = vurl; }
        this.vid.play().then(() => this.screen.classList.add('on')).catch(() => {});
      }, 900);
      if (sound) S.play('move', this.ii);
      api.updateAudio(); api.saveLast(); api.renderChrome();
    },
    setSec(n) {
      if (n === this.si) return S.play('error');
      this.si = n; this.fill(); this.arc.jump(this.ii); this.strip.jump(this.ii); S.play('rotate'); this.paint(false);
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
      if (this.secs.length) { this.fill(); this.arc.jump(this.ii); this.strip.jump(this.ii); this.paint(false); }
    },
    musicKey() { const it = this.sec?.items[this.ii]; return it?.p ? 'p:' + it.p.name : null; },
    action(a) {
      if (a === 'lb' || a === 'rb' || a === 'up' || a === 'down') return this.setSec(clamp(this.si + (a === 'lb' || a === 'up' ? -1 : 1), 0, this.secs.length - 1));
      if (a === 'left' || a === 'right') {
        const j = clamp(this.ii + (a === 'left' ? -1 : 1), 0, this.sec.items.length - 1);
        if (j === this.ii) return S.play('error');
        this.idx[this.sec.key] = j; this.paint(true);
      } else if (a === 'a') this.run();
    },
    frame(dt) {
      this.t += dt; this.arc.step(dt); this.strip.step(dt);
      const r = rem(), cx = innerWidth / 2, cy = 17.6 * r, RX = 34 * r, RY = 7 * r;
      // Semicírculo: lo elegido al frente y al centro; lo demás se abre hacia los lados y al fondo.
      this.fl?.forEach((el, i) => {
        const a = (i - this.arc.x) * 0.38;
        if (Math.abs(a) > 1.6) { el.style.visibility = 'hidden'; return; }
        el.style.visibility = '';
        const x = Math.sin(a) * RX, y = -Math.cos(a) * RY + RY, on = i === this.ii;
        const bob = Math.sin(this.t * 1.6 + i) * 0.4 * r;
        el.style.transform = `translate3d(${(cx + x - 4.5 * r).toFixed(1)}px, ${(cy + y - 4.5 * r + bob).toFixed(1)}px, 0) scale(${(on ? 1.3 : 1 - Math.abs(a) * 0.25).toFixed(3)})`;
        el.style.zIndex = String(100 - Math.round(Math.abs(a) * 30));
      });
      // Personitas que pasean y se juntan cerca de lo elegido.
      this.people.forEach((p, i) => {
        p.a += dt * p.sp * (i % 2 ? 1 : -1);
        const x = cx + Math.cos(p.a) * (14 + p.r * 30) * r, y = cy + 6.6 * r + Math.sin(p.a) * (2.2 + p.r * 2.6) * r;
        const step = Math.abs(Math.sin(this.t * 6 + i)) * 0.25 * r;
        p.el.style.transform = `translate3d(${x.toFixed(1)}px, ${(y - step).toFixed(1)}px, 0) scale(${(0.7 + (Math.sin(p.a) + 1) * 0.2).toFixed(3)})`;
        p.el.style.zIndex = String(50 + Math.round(Math.sin(p.a) * 40));
      });
      const w = 9.2 * r, x0 = 2 * r, lead = Math.max(0, this.strip.x - 4); // empieza a la izquierda y avanza cuando hace falta
      this.icons?.forEach((el, i) => {
        const off = i - lead;
        el.style.transform = `translate3d(${(x0 + off * w).toFixed(1)}px, 0, 0)`;
        el.style.visibility = off < -1 || off > 10 ? 'hidden' : '';
      });
    },
    // Fondo: cielo claro y un piso blanco que se pierde, como una plaza tranquila.
    backdrop(g, W, H) {
      const sky = g.createLinearGradient(0, 0, 0, H * 0.6);
      sky.addColorStop(0, '#cfe8f7'); sky.addColorStop(1, '#f4f9fc');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      const fl = g.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, W * 0.6);
      fl.addColorStop(0, '#ffffff'); fl.addColorStop(1, '#dfe9ef');
      g.fillStyle = fl; g.beginPath(); g.ellipse(W / 2, H * 0.5, W * 0.62, H * 0.17, 0, 0, 6.283); g.fill();
    },
  };
  return self;
}
