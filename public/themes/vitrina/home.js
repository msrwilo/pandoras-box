// Tema «Vitrina» (inspirado en los temas de la comunidad de Playnite, como Mythic o Aniki): barra lateral con las
// secciones, un banner grande con el arte de lo elegido (fanart o video) y una fila de tarjetas redondeadas.
// Arriba/abajo cambia de sección; izquierda/derecha recorre las tarjetas; LB/RB salta de cinco en cinco.
export default function vitrina(api, root) {
  const { h, Spring, rem, clamp, S, Back } = api;
  const self = {
    paintScale: 0.4,
    secs: [], si: 0, idx: {}, x: new Spring(0, { response: 0.34, damping: 1 }), side: new Spring(0, { response: 0.3, damping: 1 }), t: 0,
    hints: () => [['lr', 'Elegir'], ['ud', 'Sección'], ['a', 'Abrir'], ['menu', 'Ajustes']],
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.bgA = h('div', { class: 'vt-bg' }); this.bgB = h('div', { class: 'vt-bg' }); this.flip = false;
      this.vid = h('video', { class: 'vt-vid', muted: '', playsinline: '', loop: '' }); this.vid.muted = true;
      this.shade = h('div', { class: 'vt-shade' });
      this.navItems = this.secs.map((s, si) => {
        const el = h('button', { class: 'vt-nav-i' }, api.icon(s.icon), h('span', { text: s.label }));
        el.addEventListener('click', () => { if (si !== this.si) { this.si = si; this.x.jump(this.ii); this.fill(); this.paint(true); } });
        return el;
      });
      this.nav = h('nav', { class: 'vt-nav' }, h('div', { class: 'vt-brand' }, h('img', { src: '/pandora.svg', alt: '' }), h('b', { text: 'Pandora’s Box' })), h('div', { class: 'vt-nav-list' }, ...this.navItems));
      this.heroText = h('div', { class: 'vt-htext' });
      this.rowTitle = h('div', { class: 'vt-rtitle' });
      this.track = h('div', { class: 'vt-track' });
      this.next = h('div', { class: 'vt-next' });
      this.main = h('div', { class: 'vt-main' }, this.heroText, this.rowTitle, this.track, this.next);
      root.append(this.bgA, this.bgB, this.vid, this.shade, this.nav, this.main);
      this.si = clamp(this.si, 0, this.secs.length - 1);
      this.fill(); this.x.jump(this.ii); this.paint(false);
    },
    idxOf(s) { return clamp(this.idx[s.key] || 0, 0, Math.max(0, s.items.length - 1)); },
    get sec() { return this.secs[this.si]; },
    get ii() { return this.sec ? this.idxOf(this.sec) : 0; },
    fill() {
      const s = this.sec; if (!s) return;
      this.cards = s.items.map((it, i) => {
        const p = it.p;
        const art = p?.media.fanart?.[0] || null;
        const el = h('button', { class: 'vt-card' + (art ? ' has-art' : '') },
          art ? h('img', { class: 'bg', src: art, alt: '', decoding: 'async' }) : null,
          p?.media.logo ? h('img', { class: 'lg', src: p.media.logo, alt: '' }) : p?.media.device ? h('img', { class: 'dv', src: p.media.device, alt: '' }) : api.icon(it.ic || s.icon),
          h('span', { class: 'nm', text: it.label }), it.sub ? h('small', { text: it.sub }) : null);
        el.addEventListener('click', () => { if (i === this.ii) this.run(); else { this.idx[s.key] = i; this.paint(true); } });
        return el;
      });
      this.track.replaceChildren(...this.cards);
      this.rowTitle.replaceChildren(h('b', { text: s.label }), h('span', { text: `${s.items.length}` }));
      const n = this.secs[this.si + 1];
      this.next.textContent = n ? n.label : '';
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
      this.navItems.forEach((n, i) => n.classList.toggle('on', i === this.si));
      this.cards?.forEach((c, i) => c.classList.toggle('on', i === this.ii));
      this.x.set(this.ii); this.side.set(this.si);
      const fan = p?.media.fanart; const pick = fan?.length ? fan[Math.abs(this.ii * 7 + this.si) % fan.length] : null;
      this.setBg(pick);
      this.heroText.replaceChildren(
        h('small', { text: s?.label || '' }),
        p?.media.logo ? h('img', { src: p.media.logo, alt: it.label }) : h('b', { text: it?.label || '' }),
        h('span', { text: it?.sub || '' }),
        h('div', { class: 'vt-btns' }, h('span', { class: 'vt-play' }, api.glyph('a'), 'Abrir'), p?.count ? h('span', { class: 'vt-tag', text: `${api.fmtN(p.count)} juegos` }) : null));
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
      if (this.secs.length) { this.fill(); this.x.jump(this.ii); this.side.jump(this.si); this.paint(false); }
    },
    musicKey() { const it = this.sec?.items[this.ii]; return it?.p ? 'p:' + it.p.name : null; },
    action(a) {
      if (a === 'left' || a === 'right' || a === 'lb' || a === 'rb') {
        const d = a === 'left' ? -1 : a === 'right' ? 1 : a === 'lb' ? -5 : 5;
        const j = clamp(this.ii + d, 0, this.sec.items.length - 1);
        if (j === this.ii) return S.play('error');
        this.idx[this.sec.key] = j; this.paint(true);
      } else if (a === 'up' || a === 'down') {
        const n = clamp(this.si + (a === 'up' ? -1 : 1), 0, this.secs.length - 1);
        if (n === this.si) return S.play('error');
        this.si = n; S.play('rotate'); this.fill(); this.x.jump(Math.max(0, this.ii - 1)); this.paint(false);
      } else if (a === 'a') this.run();
    },
    frame(dt) {
      this.t += dt; this.x.step(dt); this.side.step(dt);
      if (!this.cards) return;
      const r = rem(), cw = 15.4 * r;
      const first = Math.max(0, this.x.x - 1.2);
      this.cards.forEach((c, i) => {
        const o = i - first;
        c.style.transform = `translate3d(${(o * cw).toFixed(1)}px,0,0)`;
        c.style.visibility = o < -1 || o > 6 ? 'hidden' : '';
        c.style.opacity = o < 0 ? Math.max(0, 1 + o * 1.6).toFixed(3) : '';
      });
    },
    backdrop(g, W, H) { g.fillStyle = '#0d0f14'; g.fillRect(0, 0, W, H); },
  };
  return self;
}
