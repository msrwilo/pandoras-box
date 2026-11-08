// Tema «Ficha» (inspirado en los salones de arcade): arriba la marquesina iluminada con el nombre de la sección,
// abajo una pantalla de tubo con su tabla de récords («1ST, 2ND…»), «INSERTA FICHA» parpadeando y,
// a un lado, la máquina mostrando su demo. El joystick cambia de sección a los lados y recorre la tabla arriba/abajo.
export default function ficha(api, root) {
  const { h, Spring, rem, clamp, fmtN, S, Back } = api;
  const ORD = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'ST' : n % 10 === 2 && n % 100 !== 12 ? 'ND' : n % 10 === 3 && n % 100 !== 13 ? 'RD' : 'TH');
  const COLORS = ['#ff3b3b', '#ffd23b', '#3bff7a', '#3bd8ff', '#c63bff', '#ff8a3b'];
  const self = {
    paintScale: 0.2,
    secs: [], si: 0, idx: {}, listS: new Spring(0, { response: 0.2, damping: 1 }), t: 0,
    hints: () => [['ud', 'Elegir'], ['lr', 'Sección'], ['a', 'Jugar'], ['menu', 'Ajustes']],
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.marquee = h('div', { class: 'ar-marquee' }, h('div', { class: 'ar-bulbs' }), h('b'), h('div', { class: 'ar-bulbs' }));
      this.crt = h('div', { class: 'ar-crt' });
      this.head = h('div', { class: 'ar-head' }, h('span', { text: 'RANK' }), h('span', { text: 'NOMBRE' }), h('span', { text: 'JUEGOS' }));
      this.list = h('div', { class: 'ar-list' });
      this.coin = h('div', { class: 'ar-coin', text: 'INSERTA FICHA' });
      this.credit = h('div', { class: 'ar-credit' });
      this.crt.append(this.head, this.list, this.coin, this.credit);
      this.vid = h('video', { muted: '', playsinline: '', loop: '' }); this.vid.muted = true;
      this.pic = h('div', { class: 'ar-pic' });
      this.demo = h('div', { class: 'ar-demo' }, this.pic, this.vid, h('span', { text: 'DEMO' }));
      root.append(this.marquee, this.crt, this.demo);
      this.si = clamp(this.si, 0, this.secs.length - 1);
      this.fill(); this.listS.jump(this.ii);
      this.paint(false);
    },
    get sec() { return this.secs[this.si]; },
    get ii() { return clamp(this.idx[this.sec?.key] || 0, 0, Math.max(0, (this.sec?.items.length || 1) - 1)); },
    fill() {
      const s = this.sec; if (!s) return;
      this.marquee.querySelector('b').textContent = s.label.toUpperCase();
      this.rows = s.items.map((it, i) => {
        const n = it.p?.count ?? it.coll?.count ?? (it.all ? api.total : null);
        const el = h('div', { class: 'ar-row', style: `--c:${COLORS[i % COLORS.length]}` }, h('span', { text: ORD(i + 1) }), h('b', { text: it.label.toUpperCase() }), h('em', { text: n != null ? String(n).padStart(5, '0') : '-----' }));
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
      this.credit.textContent = `CRÉDITO ${String(this.si + 1).padStart(2, '0')}`;
      this.pic.replaceChildren(p?.media.device ? h('img', { src: p.media.device, alt: '' }) : p?.media.logo ? h('img', { src: p.media.logo, alt: '' }) : api.icon(it?.ic || s?.icon));
      clearTimeout(this.vt); this.vid.pause(); this.vid.classList.remove('on');
      const vurl = api.videoFor(s, it);
      if (vurl && api.settings.autoVideo) this.vt = setTimeout(() => {
        if (api.top() !== 'home' || this.sec?.items[this.ii] !== it) return;
        if (this.vid.dataset.src !== vurl) { this.vid.dataset.src = vurl; this.vid.src = vurl; }
        this.vid.play().then(() => this.vid.classList.add('on')).catch(() => {});
      }, 700);
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
      if (a === 'left' || a === 'right') this.setSec(clamp(this.si + (a === 'left' ? -1 : 1), 0, this.secs.length - 1));
      else if (a === 'up' || a === 'down' || a === 'lb' || a === 'rb') {
        const d = a === 'up' ? -1 : a === 'down' ? 1 : a === 'lb' ? -8 : 8;
        const j = clamp(this.ii + d, 0, this.sec.items.length - 1);
        if (j === this.ii) return S.play('error');
        this.idx[this.sec.key] = j; this.paint(true);
      } else if (a === 'a') this.run();
    },
    frame(dt) {
      this.t += dt; this.listS.step(dt);
      const r = rem(), rowH = 2.9 * r;
      if (this.rows) {
        const vis = Math.max(4, Math.floor(this.list.clientHeight / rowH));
        const first = clamp(Math.round(this.listS.x) - 3, 0, Math.max(0, this.rows.length - vis));
        this.rows.forEach((el, i) => { const k = i - first; el.style.transform = `translate3d(0, ${(k * rowH).toFixed(0)}px, 0)`; el.style.visibility = k < 0 || k >= vis ? 'hidden' : ''; });
      }
      root.classList.toggle('ar-blink', Math.floor(this.t * 1.6) % 2 === 0);
      root.style.setProperty('--chase', String(Math.floor(this.t * 6) % 3));
    },
    // Fondo: el salón a oscuras, con alfombra de figuras de neón (pequeño y pixelado).
    backdrop(g, W, H, dt, now) {
      g.fillStyle = '#05030a'; g.fillRect(0, 0, W, H);
      const t = Math.floor(now / 500);
      for (let i = 0; i < 60; i++) {
        const x = (i * 37) % W, y = (i * 23 + 7) % H, k = (i + t) % 4;
        g.fillStyle = ['#3b1a6b', '#1a3b6b', '#6b1a4a', '#1a6b4a'][k]; g.globalAlpha = 0.5;
        if (i % 3 === 0) { g.fillRect(x, y, 2, 1); g.fillRect(x, y + 1, 1, 1); } else if (i % 3 === 1) { g.fillRect(x, y, 1, 2); } else g.fillRect(x, y, 2, 2);
      }
      g.globalAlpha = 1;
    },
  };
  return self;
}
