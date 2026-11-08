// Tema «Mosaicos» (inspirado en el inicio de Switch): una fila de cuadros grandes y botones redondos abajo.
export default function mosaicos(api, root) {
  const { h, Spring, rem, clamp, fmtN, S, Back } = api;
  const self = {
    tiles: [], ti: 0, bi: 0, row: 'tiles', scroll: new Spring(0, { response: 0.38, damping: 1 }),
    hints: () => [['a', 'Abrir'], ['lr', 'Moverse'], ['ud', 'Cuadros y botones'], ['menu', 'Ajustes']],
    build() {
      const lib = api.library;
      this.plats = [...(api.all ? [{ all: true, p: { name: 'Todo', count: api.total, media: {} }, cat: { name: 'all' } }] : []), ...lib.categories.flatMap(c => c.platforms.map(p => ({ p, cat: c })))];
      root.replaceChildren();
      this.title = h('div', { class: 'sw-title' });
      this.track = h('div', { class: 'sw-track' });
      this.tiles = this.plats.map(({ p, cat, all }, i) => {
        const el = all ? h('button', { class: 'sw-tile sw-all' }, api.icon('all'), h('span', { class: 'sw-name', text: 'Todo' }))
          : h('button', { class: 'sw-tile cat-' + cat.name.toLowerCase() },
          p.media.device ? h('img', { src: p.media.device, alt: '' }) : null,
          p.media.logo ? h('img', { class: 'sw-logo', src: p.media.logo, alt: p.name }) : h('span', { class: 'sw-name', text: p.name }));
        el.addEventListener('click', () => { if (this.row === 'tiles' && i === this.ti) this.open(); else { this.row = 'tiles'; this.ti = i; this.paintFocus(true); } });
        return el;
      });
      this.track.append(...this.tiles);
      this.buttons = [
        { label: 'Espectador', icon: 'spectator', run: () => api.openSpectator(null) },
        ...(api.modes.length ? [{ label: 'Modo de juego', icon: 'modes', run: () => api.openModes() }] : []),
        ...(api.genres.length ? [{ label: 'Géneros', icon: 'genre', run: () => api.openKind('genres') }] : []),
        ...(api.developers.length ? [{ label: 'Desarrolladoras', icon: 'dev', run: () => api.openKind('developers') }] : []),
        { label: 'Volver a leer LaunchBox', icon: '_other', run: () => api.reload() },
        { label: 'Ajustes', icon: 'settings', run: () => api.openSettings() },
      ];
      this.btnLabel = h('div', { class: 'sw-btn-label' });
      this.btnEls = this.buttons.map((b, i) => {
        const el = h('button', { class: 'sw-btn' }, api.icon(b.icon));
        el.addEventListener('click', () => { this.row = 'buttons'; this.bi = i; this.paintFocus(true); b.run(); });
        return el;
      });
      this.bar = h('div', { class: 'sw-buttons' }, ...this.btnEls);
      root.append(this.title, this.track, this.btnLabel, this.bar);
      this.ti = clamp(this.ti, 0, this.tiles.length - 1);
      this.scroll.jump(this.scrollTarget());
      this.paintFocus(false);
    },
    first: 0,
    scrollTarget() {
      const r = rem(), slot = 18.4 * r, vis = Math.max(1, Math.floor((innerWidth - 12 * r) / slot));
      if (this.ti < this.first) this.first = this.ti;
      if (this.ti > this.first + vis - 1) this.first = this.ti - vis + 1;
      return this.first;
    },
    paintFocus(sound) {
      this.tiles.forEach((e, i) => e.classList.toggle('on', this.row === 'tiles' && i === this.ti));
      this.btnEls.forEach((e, i) => e.classList.toggle('on', this.row === 'buttons' && i === this.bi));
      const it = this.plats[this.ti];
      this.title.textContent = this.row === 'tiles' && it ? (it.all ? 'Todos los juegos' : it.p.name) : '';
      this.title.dataset.sub = this.row === 'tiles' && it ? `${fmtN(it.p.count)} juegos` : '';
      this.btnLabel.textContent = this.row === 'buttons' ? this.buttons[this.bi].label : '';
      this.scroll.set(this.scrollTarget());
      if (sound) S.play('move', this.row === 'tiles' ? this.ti : 1000 + this.bi);
      // Video de la plataforma de fondo, salvo que esté apagado en Ajustes.
      clearTimeout(this.vt); Back.setVideo(null);
      const vp = this.row === 'tiles' ? it?.p : null;
      if (vp?.media?.video && api.settings.autoVideo) this.vt = setTimeout(() => { if (api.top() === 'home' && this.plats[this.ti] === it && this.row === 'tiles') Back.setVideo(vp.media.video); }, 900);
      api.updateAudio(); api.saveLast();
    },
    open() {
      if (this.row === 'buttons') { S.play('select'); this.buttons[this.bi].run(); return; }
      const it = this.plats[this.ti]; if (it) { if (it.all) api.openAll(); else api.openPlatform(it.p); }
    },
    enter() { Back.setImage(null); Back.setVideo(null); Back.setLook('ghost'); this.paintFocus(false); },
    leave() { clearTimeout(this.vt); },
    resume() { this.enter(); },
    state() { return { ti: this.ti }; },
    restore(f) { if (f?.ti != null) { this.ti = f.ti; if (this.tiles.length) { this.scroll.jump(this.scrollTarget()); this.paintFocus(false); } } },
    musicKey() { const it = this.plats?.[this.ti]; return this.row === 'tiles' && it && !it.all ? 'p:' + it.p.name : null; },
    action(a) {
      if (a === 'left' || a === 'right') {
        const d = a === 'left' ? -1 : 1;
        if (this.row === 'tiles') { const n = clamp(this.ti + d, 0, this.tiles.length - 1); if (n === this.ti) return S.play('error'); this.ti = n; }
        else { const n = clamp(this.bi + d, 0, this.buttons.length - 1); if (n === this.bi) return S.play('error'); this.bi = n; }
        this.paintFocus(true);
      } else if (a === 'down' && this.row === 'tiles') { this.row = 'buttons'; this.paintFocus(true); }
      else if (a === 'up' && this.row === 'buttons') { this.row = 'tiles'; this.paintFocus(true); }
      else if (a === 'lb' || a === 'rb') { this.row = 'tiles'; this.ti = clamp(this.ti + (a === 'lb' ? -5 : 5), 0, this.tiles.length - 1); this.paintFocus(true); }
      else if (a === 'a') this.open();
    },
    frame(dt) {
      this.scroll.step(dt);
      const r = rem(), slot = 18.4 * r;
      this.track.style.transform = `translate3d(${(6 * r - this.scroll.x * slot).toFixed(1)}px, 0, 0)`;
    },
  };
  return self;
}
