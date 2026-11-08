// Tema «Anillo» (inspirado en el Genesis de 1989): negro brillante, acentos rojos y el gran anillo alrededor
// de la ranura, con su leyenda grabada. Actitud de velocidad: líneas que pasan rápido al fondo y letra
// cromada inclinada. Izquierda/derecha cambia de pestaña; arriba/abajo recorre la lista.
export default function anillo(api, root) {
  const { h, Spring, rem, clamp, S, Back } = api;
  const self = {
    paintScale: 0.4,
    secs: [], si: 0, idx: {}, listS: new Spring(0, { response: 0.3, damping: 1 }), tabS: new Spring(0, { response: 0.32, damping: 0.9 }),
    spin: new Spring(0, { response: 0.6, damping: 0.7 }), t: 0,
    hints: () => [['ud', 'Elegir'], ['lbrb', 'Pestaña'], ['a', 'Abrir'], ['menu', 'Ajustes']],
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.tabs = this.secs.map((s, i) => { const el = h('div', { class: 'md-tab', text: s.label }); el.addEventListener('click', () => this.setSec(i)); return el; });
      this.tabRow = h('div', { class: 'md-tabs' }, ...this.tabs);
      this.tabKeys = h('div', { class: 'md-keys' }, api.glyph('lb'), api.glyph('rb'));
      const ring = h('div', { class: 'md-ring' });
      ring.innerHTML = `<svg viewBox="0 0 200 200"><defs><path id="mdc" d="M100,100 m-83,0 a83,83 0 1,1 166,0 a83,83 0 1,1 -166,0"/>
        <linearGradient id="mdg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f4f6"/><stop offset=".45" stop-color="#8b8d96"/><stop offset=".55" stop-color="#d6d7dc"/><stop offset="1" stop-color="#5a5c64"/></linearGradient></defs>
        <circle cx="100" cy="100" r="92" fill="none" stroke="url(#mdg)" stroke-width="14"/>
        <circle cx="100" cy="100" r="84.5" fill="none" stroke="#000" stroke-width="1"/>
        <g class="md-legend"><text font-size="7.4" font-weight="800" letter-spacing="2.6" fill="#1a1a1e"><textPath href="#mdc" startOffset="0">ALTA DEFINICIÓN · 16 BITS · ALTA DEFINICIÓN · 16 BITS ·</textPath></text></g></svg>`;
      this.legend = ring.querySelector('.md-legend');
      this.slotArt = h('div', { class: 'md-art' });
      this.vid = h('video', { muted: '', playsinline: '', loop: '' }); this.vid.muted = true;
      this.hole = h('div', { class: 'md-hole' }, this.slotArt, this.vid);
      this.disc = h('div', { class: 'md-disc' }, this.hole, ring);
      this.list = h('div', { class: 'md-list' });
      this.info = h('div', { class: 'md-info' });
      root.append(this.tabRow, this.tabKeys, this.disc, this.list, this.info);
      this.si = clamp(this.si, 0, this.secs.length - 1); this.tabS.jump(this.si);
      this.fill(); this.listS.jump(this.ii);
      this.paint(false);
    },
    get sec() { return this.secs[this.si]; },
    get ii() { return clamp(this.idx[this.sec?.key] || 0, 0, Math.max(0, (this.sec?.items.length || 1) - 1)); },
    fill() {
      const s = this.sec; if (!s) return;
      this.rows = s.items.map((it, i) => {
        const el = h('div', { class: 'md-row' }, h('b', { text: it.label }), h('span', { text: it.sub || '' }));
        el.addEventListener('click', () => { if (i === this.ii) this.run(); else { this.idx[s.key] = i; this.paint(true); } });
        return el;
      });
      this.list.replaceChildren(...this.rows);
    },
    run() { S.play('select'); this.sec.items[this.ii]?.run(); },
    paint(sound) {
      const s = this.sec, it = s?.items[this.ii], p = it?.p;
      this.tabs.forEach((e, i) => e.classList.toggle('on', i === this.si));
      this.rows?.forEach((e, i) => e.classList.toggle('on', i === this.ii));
      this.tabS.set(this.si); this.listS.set(this.ii);
      this.spin.set(this.spin.target + 1);
      this.slotArt.replaceChildren(p?.media.device ? h('img', { src: p.media.device, alt: '' }) : p?.media.logo ? h('img', { src: p.media.logo, alt: '' }) : api.icon(it?.ic || s?.icon));
      this.info.replaceChildren(h('b', { text: it?.label || '' }), h('span', { text: it?.desc ? it.desc.slice(0, 140) + (it.desc.length > 140 ? '…' : '') : (it?.sub || '') }));
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
      if (i >= 0) { this.si = i; this.tabS.jump(i); }
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
      this.t += dt; this.listS.step(dt); this.tabS.step(dt); this.spin.step(dt);
      const r = rem(), rowH = 4.2 * r;
      // La leyenda del anillo gira despacio y da un empujón cada vez que eliges algo.
      this.legend.setAttribute('transform', `rotate(${(this.t * 6 + this.spin.x * 40).toFixed(2)} 100 100)`);
      if (this.rows) {
        const vis = Math.max(4, Math.floor(this.list.clientHeight / rowH));
        const first = clamp(this.listS.x - 3, 0, Math.max(0, this.rows.length - vis));
        this.rows.forEach((el, i) => { const k = i - first; el.style.transform = `translate3d(${(k * -0.5 * r).toFixed(1)}px, ${(k * rowH).toFixed(1)}px, 0)`; el.style.visibility = k < -0.5 || k > vis - 0.5 ? 'hidden' : ''; });
      }
      const tw = 13 * r;
      this.tabs.forEach((el, i) => { el.style.transform = `translate3d(${((i - this.tabS.x) * tw).toFixed(1)}px, 0, 0) skewX(-14deg)`; el.style.opacity = Math.abs(i - this.tabS.x) > 3.5 ? 0 : 1; });
    },
    // Fondo: negro brillante con un reflejo diagonal y líneas de velocidad que cruzan.
    backdrop(g, W, H, dt, now) {
      const t = now / 1000;
      g.fillStyle = '#060607'; g.fillRect(0, 0, W, H);
      const sh = g.createLinearGradient(0, 0, W, H);
      sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.42, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,.07)'); sh.addColorStop(0.58, 'rgba(255,255,255,0)');
      g.fillStyle = sh; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 14; i++) {
        const y = H * ((i * 0.071 + 0.05) % 1), len = W * (0.1 + (i % 4) * 0.06), sp = 0.25 + (i % 5) * 0.12;
        const x = ((t * sp + i * 0.37) % 1.4) * W * 1.4 - len;
        const gr = g.createLinearGradient(x, 0, x + len, 0);
        gr.addColorStop(0, 'rgba(230, 30, 30, 0)'); gr.addColorStop(1, i % 3 ? 'rgba(230, 30, 30, .35)' : 'rgba(220, 220, 230, .25)');
        g.fillStyle = gr; g.fillRect(x, y, len, Math.max(1, H * 0.003));
      }
      g.fillStyle = '#c4161c'; g.fillRect(0, H * 0.905, W, H * 0.006);
    },
  };
  return self;
}
