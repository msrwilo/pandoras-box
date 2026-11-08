// Tema «Steam Big Picture»: pestañas arriba (LB/RB), fondo con el arte de lo elegido y una fila de
// cápsulas verticales; el botón verde de «Jugar/Abrir» como en la biblioteca de Steam.
export default function vapor(api, root) {
  const { h, Spring, rem, clamp, S, Back } = api;
  const self = {
    paintScale: 0.4,
    secs: [], si: 0, idx: {}, x: new Spring(0, { response: 0.32, damping: 1 }),
    hints: () => [['lr', 'Elegir'], ['lb', 'Pestaña'], ['a', 'Abrir'], ['menu', 'Ajustes']],
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.bgA = h('div', { class: 'sb-bg' }); this.bgB = h('div', { class: 'sb-bg' }); this.flip = false;
      this.vid = h('video', { class: 'sb-vid', muted: '', playsinline: '', loop: '' }); this.vid.muted = true;
      this.tabs = h('nav', { class: 'sb-tabs' });
      this.tabEls = this.secs.map((s, i) => {
        const el = h('button', { class: 'sb-tab', text: s.label });
        el.addEventListener('click', () => { if (i !== this.si) { this.si = i; this.fill(); this.x.jump(this.ii); this.paint(true); } });
        return el;
      });
      this.tabs.append(h('span', { class: 'sb-lb' }, api.glyph('lb')), ...this.tabEls, h('span', { class: 'sb-lb' }, api.glyph('rb')));
      this.info = h('div', { class: 'sb-info' });
      this.track = h('div', { class: 'sb-track' });
      this.rowTitle = h('div', { class: 'sb-rtitle' });
      root.append(this.bgA, this.bgB, this.vid, h('div', { class: 'sb-shade' }), this.tabs, this.rowTitle, this.track, this.info);
      this.si = clamp(this.si, 0, this.secs.length - 1);
      this.fill(); this.x.jump(this.ii); this.paint(false);
    },
    get sec() { return this.secs[this.si]; },
    get ii() { const s = this.sec; return s ? clamp(this.idx[s.key] || 0, 0, Math.max(0, s.items.length - 1)) : 0; },
    fill() {
      const s = this.sec; if (!s) return;
      this.cards = s.items.map((it, i) => {
        const p = it.p;
        const img = p?.media.device || p?.media.logo;
        const el = h('button', { class: 'sb-cap' },
          img ? h('img', { src: img, alt: '' }) : api.icon(it.ic || s.icon),
          h('span', { class: 'nm', text: it.label }));
        el.addEventListener('click', () => { if (i === this.ii) this.run(); else { this.idx[s.key] = i; this.paint(true); } });
        return el;
      });
      this.track.replaceChildren(...this.cards);
      this.rowTitle.replaceChildren(h('b', { text: s.label }), h('span', { text: `${s.items.length}` }));
    },
    run() { S.play('select'); this.sec.items[this.ii]?.run(); },
    setBg(url) {
      if ((this.bgUrl || null) === (url || null)) return;
      this.bgUrl = url; this.flip = !this.flip;
      const on = this.flip ? this.bgA : this.bgB, off = this.flip ? this.bgB : this.bgA;
      on.style.backgroundImage = url ? `url("${url}")` : ''; on.classList.add('on'); off.classList.remove('on');
    },
    paint(sound) {
      const s = this.sec, it = s?.items[this.ii], p = it?.p;
      this.tabEls.forEach((t, i) => t.classList.toggle('on', i === this.si));
      this.tabEls[this.si]?.scrollIntoView({ inline: 'center', block: 'nearest' });
      this.cards?.forEach((c, i) => c.classList.toggle('on', i === this.ii));
      this.x.set(this.ii);
      const fan = p?.media.fanart; this.setBg(fan?.length ? fan[this.ii % fan.length] : null);
      this.info.replaceChildren(
        p?.media.logo ? h('img', { class: 'sb-logo', src: p.media.logo, alt: it.label }) : h('h1', { text: it?.label || '' }),
        h('div', { class: 'sb-row' },
          h('span', { class: 'sb-play' }, api.glyph('a'), p ? 'Abrir' : 'Ver'),
          h('div', { class: 'sb-meta' }, h('small', { text: s?.label || '' }), h('b', { text: it?.sub || '' }))));
      clearTimeout(this.vt); this.vid.pause(); this.vid.classList.remove('on');
      const vurl = api.videoFor(s, it);
      if (vurl && api.settings.autoVideo) this.vt = setTimeout(() => {
        if (api.top() !== 'home' || this.sec?.items[this.ii] !== it) return;
        if (this.vid.dataset.src !== vurl) { this.vid.dataset.src = vurl; this.vid.src = vurl; }
        this.vid.play().then(() => this.vid.classList.add('on')).catch(() => {});
      }, 900);
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
      if (this.secs.length) { this.fill(); this.x.jump(this.ii); this.paint(false); }
    },
    musicKey() { const it = this.sec?.items[this.ii]; return it?.p ? 'p:' + it.p.name : null; },
    action(a) {
      if (a === 'left' || a === 'right') {
        const j = clamp(this.ii + (a === 'left' ? -1 : 1), 0, this.sec.items.length - 1);
        if (j === this.ii) return S.play('error');
        this.idx[this.sec.key] = j; this.paint(true);
      } else if (a === 'lb' || a === 'rb' || a === 'up' || a === 'down') {
        const n = clamp(this.si + (a === 'lb' || a === 'up' ? -1 : 1), 0, this.secs.length - 1);
        if (n === this.si) return S.play('error');
        this.si = n; S.play('rotate'); this.fill(); this.x.jump(this.ii); this.paint(false);
      } else if (a === 'a') this.run();
    },
    frame(dt) {
      this.x.step(dt);
      if (!this.cards) return;
      const r = rem(), cw = 13.4 * r, first = Math.max(0, this.x.x - 0.4);
      this.cards.forEach((c, i) => {
        const o = i - first;
        c.style.transform = `translate3d(${(o * cw).toFixed(1)}px,0,0)`;
        c.style.visibility = o < -1 || o > 7 ? 'hidden' : '';
        c.style.opacity = o < 0 ? Math.max(0, 1 + o * 1.5).toFixed(3) : '';
      });
    },
    backdrop(g, W, H) { g.fillStyle = '#10161f'; g.fillRect(0, 0, W, H); },
  };
  return self;
}
