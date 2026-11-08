// Tema «Órbita» (inspirado en el menú de Sega Saturn): espacio azul profundo, un planeta con anillos al centro
// y las opciones girando en su órbita inclinada; la elegida pasa al frente. Paneles azules translúcidos con
// letra inclinada. LB/RB cambian de pestaña (también arriba/abajo); izquierda/derecha gira la órbita.
export default function orbita(api, root) {
  const { h, Spring, rem, clamp, S, Back } = api;
  const self = {
    paintScale: 0.5,
    secs: [], si: 0, idx: {}, orb: new Spring(0, { response: 0.55, damping: 0.85 }), t: 0,
    hints: () => [['lr', 'Girar'], ['lbrb', 'Pestaña'], ['a', 'Abrir'], ['menu', 'Ajustes']],
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.bar = h('div', { class: 'sa-bar' });
      this.secRows = this.secs.map((x, i) => { const el = h('div', { class: 'sa-sec' }, h('span', { text: x.label }), h('em', { text: String(x.items.length) })); el.addEventListener('click', () => this.setSec(i)); return el; });
      this.secList = h('div', { class: 'sa-secs' }, h('i', { class: 'sa-up', text: '▲' }), h('div', { class: 'sa-seclist' }, ...this.secRows), h('i', { class: 'sa-dn', text: '▼' }));
      this.arrows = h('div', { class: 'sa-arrows' }, h('i', { text: '◀' }), h('i', { text: '▶' }));
      this.count = h('div', { class: 'sa-count' });
      this.moons = h('div', { class: 'sa-moons' });
      this.panel = h('div', { class: 'sa-panel' });
      this.vid = h('video', { muted: '', playsinline: '', loop: '' }); this.vid.muted = true;
      this.screen = h('div', { class: 'sa-screen' }, this.vid);
      root.append(this.bar, this.moons, this.screen, this.panel);
      this.si = clamp(this.si, 0, this.secs.length - 1);
      this.fill(); this.orb.jump(this.ii);
      this.paint(false);
    },
    get sec() { return this.secs[this.si]; },
    get ii() { return clamp(this.idx[this.sec?.key] || 0, 0, Math.max(0, (this.sec?.items.length || 1) - 1)); },
    fill() {
      const s = this.sec; if (!s) return;
      this.bar.replaceChildren(api.glyph('lb'), ...this.secs.map((x, i) => { const el = h('span', { class: i === this.si ? 'on' : '', text: x.label }); el.addEventListener('click', () => this.setSec(i)); return el; }), api.glyph('rb'));
      this.items = s.items.map((it, i) => {
        const p = it.p;
        const el = h('button', { class: 'sa-moon' }, h('div', { class: 'sa-ball' }, p?.media.device ? h('img', { src: p.media.device, alt: '' }) : p?.media.logo ? h('img', { class: 'logo', src: p.media.logo, alt: '' }) : api.icon(it.ic || s.icon)), h('span', { text: it.label }));
        el.addEventListener('click', () => { if (i === this.ii) this.run(); else { this.idx[s.key] = i; this.paint(true); } });
        return el;
      });
      this.moons.replaceChildren(...this.items);
    },
    run() { S.play('select'); this.sec.items[this.ii]?.run(); },
    paint(sound) {
      const s = this.sec, it = s?.items[this.ii], p = it?.p;
      this.items?.forEach((e, i) => e.classList.toggle('on', i === this.ii));
      this.orb.set(this.ii);
      this.panel.replaceChildren(h('small', { text: `${s?.label || ''} · ${this.ii + 1} de ${s?.items.length || 0}` }), h('b', { text: it?.label || '' }), h('span', { text: it?.sub || '' }));
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
      this.si = n; this.fill(); this.orb.jump(this.ii - 2); this.orb.set(this.ii); S.play('rotate'); this.paint(false);
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
      if (this.secs.length) { this.fill(); this.orb.jump(this.ii); this.paint(false); }
    },
    musicKey() { const it = this.sec?.items[this.ii]; return it?.p ? 'p:' + it.p.name : null; },
    action(a) {
      if (a === 'left' || a === 'right') {
        const d = a === 'left' ? -1 : 1;
        const j = clamp(this.ii + d, 0, this.sec.items.length - 1);
        if (j === this.ii) return S.play('error');
        this.idx[this.sec.key] = j; this.paint(true);
      } else if (a === 'up' || a === 'down' || a === 'lb' || a === 'rb') this.setSec(clamp(this.si + (a === 'up' || a === 'lb' ? -1 : 1), 0, this.secs.length - 1));
      else if (a === 'a') this.run();
    },
    frame(dt) {
      this.t += dt; this.orb.step(dt);
      const r = rem(), cx = innerWidth * 0.5, cy = innerHeight * 0.4, RX = 34 * r, RY = 9 * r, step = 0.42;
      // Órbita inclinada: el ángulo pone a cada opción en la elipse; la de enfrente es la elegida.
      this.items?.forEach((el, i) => {
        const a = (i - this.orb.x) * step;
        if (Math.abs(a) > 3.1) { el.style.visibility = 'hidden'; return; }
        el.style.visibility = '';
        const x = Math.sin(a) * RX, y = Math.cos(a) * RY, depth = Math.cos(a); // 1 al frente, -1 atrás
        const sc = 0.45 + 0.55 * (depth + 1) / 2 + (i === this.ii ? 0.12 : 0);
        el.style.transform = `translate3d(${(cx + x - 5 * r).toFixed(1)}px, ${(cy + y - 5 * r - Math.sin(a) * 2.2 * r).toFixed(1)}px, 0) scale(${sc.toFixed(3)})`;
        el.style.zIndex = String(Math.round(100 + depth * 50));
        el.style.opacity = (0.25 + 0.75 * (depth + 1) / 2).toFixed(3);
        el.style.filter = depth < 0 ? `brightness(${(0.5 + 0.5 * (depth + 1)).toFixed(2)})` : '';
      });
    },
    // Fondo: azul profundo, estrellas y un planeta con anillo inclinado (el anillo pasa por delante abajo).
    backdrop(g, W, H, dt, now) {
      const t = now / 1000;
      const bg = g.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, W * 0.75);
      bg.addColorStop(0, '#12307a'); bg.addColorStop(0.5, '#071640'); bg.addColorStop(1, '#02050f');
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 90; i++) {
        const x = ((i * 137.5) % W), y = ((i * 71.3) % H), a = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.8 + i));
        g.fillStyle = `rgba(200, 220, 255, ${(a * 0.6).toFixed(2)})`; g.fillRect(x, y, i % 7 ? 1 : 2, i % 7 ? 1 : 2);
      }
      const cx = W * 0.5, cy = H * 0.4, R = H * 0.13;
      const ring = (front) => {
        g.save(); g.translate(cx, cy); g.rotate(-0.12); g.scale(1, 0.24);
        g.beginPath(); g.arc(0, 0, R * 2.3, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
        g.lineWidth = R * 0.32; g.strokeStyle = 'rgba(160, 190, 255, .35)'; g.stroke();
        g.lineWidth = R * 0.06; g.strokeStyle = 'rgba(220, 235, 255, .55)'; g.beginPath(); g.arc(0, 0, R * 2.05, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); g.stroke();
        g.restore();
      };
      ring(false);
      const pl = g.createRadialGradient(cx - R * 0.4, cy - R * 0.4, R * 0.1, cx, cy, R);
      pl.addColorStop(0, '#9fc4ff'); pl.addColorStop(0.5, '#3a68d8'); pl.addColorStop(1, '#0b1d5c');
      g.fillStyle = pl; g.beginPath(); g.arc(cx, cy, R, 0, 6.283); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = R * 0.05;
      for (let k = -2; k <= 2; k++) { g.beginPath(); g.ellipse(cx, cy + k * R * 0.3, R * Math.sqrt(1 - (k * 0.3) ** 2), R * 0.06, 0, 0, 6.283); g.stroke(); }
      ring(true);
    },
  };
  return self;
}
