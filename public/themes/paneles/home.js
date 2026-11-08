// Tema «Paneles» (inspirado en el primer tablero de Xbox 360): paneles que se deslizan,
// los anteriores se apilan a la izquierda y los siguientes a la derecha, cada uno con su color.
export default function paneles(api, root) {
  const { h, Spring, rem, clamp, fmtN, ord, S, Back } = api;
  const COLORS = { _all: '#3c8dde', _genres: '#d6488f', _devs: '#2e9c8f', _modes: '#8a5cd6', _spectator: '#f08a24', Consoles: '#5fb336', Handhelds: '#2b9fd8', Arcade: '#d83a32', Computers: '#7d8590', _settings: '#55595f' };
  const self = {
    paintScale: 0.3,
    blades: [], bi: 1, rows: {}, pos: new Spring(1, { response: 0.5, damping: 0.95 }), t: 0, orbs: null,
    hints: () => [['a', 'Abrir'], ['lr', 'Panel'], ['ud', 'Elegir'], ['menu', 'Ajustes']],
    build() {
      const lib = api.library;
      this.data = [
        { key: '_spectator', label: 'Espectador', items: [{ label: 'Toda la biblioteca', sub: 'Videos al azar', run: () => api.openSpectator(null) },
          ...lib.categories.map(c => ({ label: c.label, sub: 'Videos de ' + c.label.toLowerCase(), run: () => api.openSpectator(c.name) }))] },
        ...(api.all ? [{ key: '_all', label: 'Todo', items: [{ ic: 'all', label: 'Todos los juegos', sub: `${fmtN(api.total)} juegos`, all: true, run: () => api.openAll() }] }] : []),
        ...lib.categories.map(c => ({ key: c.name, label: c.label, items: c.platforms.map(p => ({ p, label: p.name, sub: [p.year, ord(p.generation)].filter(Boolean).join(' · '), run: () => api.openPlatform(p) })) })),
        ...(api.modes.length ? [{ key: '_modes', label: 'Modo de juego', items: api.modes.map(m => ({ mode: m, label: m.label, sub: `${fmtN(m.count)} juegos`, run: () => api.openCollection(m) })) }] : []),
        ...(api.genres.length ? [{ key: '_genres', label: 'Géneros', items: api.genres.map(m => ({ coll: m, ic: api.genreIcon(m), label: m.label, sub: `${fmtN(m.count)} juegos`, run: () => api.openCollection(m) })) }] : []),
        ...(api.developers.length ? [{ key: '_devs', label: 'Desarrolladoras', items: api.developers.map(m => ({ coll: m, ic: 'dev', label: m.label, sub: `${fmtN(m.count)} juegos`, ...(m.logo ? { p: { name: m.label, media: { logo: m.logo } } } : {}), run: () => api.openCollection(m) })) }] : []),
        { key: '_settings', label: 'Sistema', items: [{ label: 'Ajustes de Pandora', sub: 'Tema, sonido, vistas', run: () => api.openSettings() }, { label: 'Volver a leer LaunchBox', sub: 'Si agregaste juegos', run: () => api.reload() }] },
      ];
      root.replaceChildren();
      this.blades = this.data.map((d, i) => {
        const list = h('div', { class: 'x-list' });
        const pv = h('div', { class: 'x-preview' });
        const el = h('section', { class: 'x-blade', style: `--accent:${COLORS[d.key] || '#5fb336'}` },
          h('div', { class: 'x-edge' }, h('span', { text: d.label })),
          h('div', { class: 'x-body' }, h('h1', { class: 'x-title', text: d.label }), h('div', { class: 'x-content' }, list, pv)));
        el.querySelector('.x-edge').addEventListener('click', () => this.go(i));
        return { el, list, pv, d };
      });
      root.append(...this.blades.map(b => b.el));
      this.bi = clamp(this.bi, 0, this.blades.length - 1); this.pos.jump(this.bi);
      this.blades.forEach((_, i) => this.fill(i));
      this.focus(false);
    },
    ri(i = this.bi) { return this.rows[i] || 0; },
    fill(i) {
      const b = this.blades[i];
      b.rowsEls = b.d.items.map((it, k) => {
        const thumb = it.p?.media.logo ? h('span', { class: 'x-logo' }, h('img', { src: it.p.media.logo, alt: '' }))
          : it.mode ? api.icon('mode_' + it.mode.id) : it.ic ? api.icon(it.ic) : h('i');
        const el = h('div', { class: 'x-row' }, thumb, h('b', { text: it.label }), h('span', { text: it.sub || '' }));
        el.addEventListener('click', () => { if (i !== this.bi) return this.go(i); if (k === this.ri()) it.run(); else { this.rows[i] = k; this.focus(true); } });
        return el;
      });
      b.list.replaceChildren(...b.rowsEls);
    },
    go(i) { i = clamp(i, 0, this.blades.length - 1); if (i === this.bi) return; this.bi = i; this.pos.set(i); S.play('rotate'); this.focus(false); },
    focus(sound) {
      const b = this.blades[this.bi], it = b.d.items[this.ri()];
      this.blades.forEach((x, i) => { x.el.classList.toggle('on', i === this.bi); x.rowsEls.forEach((e, k) => e.classList.toggle('on', i === this.bi && k === this.ri(i))); });
      // Mantener visible la fila sin mover nada más de la pantalla.
      const row = b.rowsEls[this.ri()], L = b.list;
      if (row) { if (row.offsetTop < L.scrollTop) L.scrollTop = row.offsetTop; else if (row.offsetTop + row.offsetHeight > L.scrollTop + L.clientHeight) L.scrollTop = row.offsetTop + row.offsetHeight - L.clientHeight; }
      if (sound) S.play('move', this.ri());
      // Vista previa: el video de la plataforma o su consola.
      clearTimeout(this.vt);
      const p = it?.p;
      b.pv.replaceChildren(
        p ? (p.media.device ? h('img', { class: 'x-dev', src: p.media.device, alt: '' }) : p.media.logo ? h('img', { class: 'x-dev', src: p.media.logo, alt: '' }) : h('i')) : api.icon(it?.mode ? 'mode_' + it.mode.id : it?.ic || b.d.key),
        h('div', { class: 'x-pv-text' }, h('b', { text: it?.label || '' }), h('span', { text: p ? `${p.manufacturer || ''}${p.manufacturer ? ' · ' : ''}${fmtN(p.count)} juegos` : it?.mode ? `${fmtN(it.mode.count)} juegos · ${it.mode.desc}` : it?.coll ? `${fmtN(it.coll.count)} juegos de todas tus consolas` : it?.all ? 'La biblioteca completa en una sola lista' : (it?.sub || '') })));
      if (p?.media.video && api.settings.autoVideo) {
        this.vt = setTimeout(() => {
          if (b.d.items[this.ri()] !== it || api.top() !== 'home') return;
          const v = h('video', { src: p.media.video, playsinline: '', loop: '', autoplay: '' });
          v.muted = api.settings.audioMode !== 'video'; v.volume = Math.min(1, api.settings.volume);
          v.addEventListener('playing', () => { v.classList.add('on'); api.setHomeAudio(!v.muted); });
          b.pv.querySelector('video')?.remove(); b.pv.prepend(v); this.video = v;
        }, 700);
      }
      this.video?.pause(); this.video = null; api.setHomeAudio(false);
      api.updateAudio(); api.saveLast();
    },
    enter() { Back.setImage(null); Back.setVideo(null); Back.setLook(''); this.focus(false); },
    resume() { this.enter(); },
    leave() { clearTimeout(this.vt); this.video?.pause(); api.setHomeAudio(false); },
    state() { return { bi: this.bi, rows: this.rows }; },
    restore(f) { if (f?.rows) { this.rows = f.rows; this.bi = f.bi ?? this.bi; this.pos.jump(this.bi); if (this.blades.length) this.focus(false); } },
    musicKey() { const it = this.blades[this.bi]?.d.items[this.ri()]; return it?.p ? 'p:' + it.p.name : null; },
    action(a) {
      if (a === 'left' || a === 'lb') this.go(this.bi - 1);
      else if (a === 'right' || a === 'rb') this.go(this.bi + 1);
      else if (a === 'up' || a === 'down') {
        const n = clamp(this.ri() + (a === 'up' ? -1 : 1), 0, this.blades[this.bi].d.items.length - 1);
        if (n === this.ri()) return S.play('error');
        this.rows[this.bi] = n; this.focus(true);
      } else if (a === 'a') { const it = this.blades[this.bi].d.items[this.ri()]; if (it) it.run(); }
    },
    frame(dt) {
      this.pos.step(dt);
      const r = rem(), edge = 3.2 * r, n = this.blades.length, W = innerWidth;
      this.blades.forEach((b, i) => {
        // Los paneles anteriores quedan como lomos a la izquierda; los siguientes, a la derecha.
        const off = i - this.pos.x, left = i * edge, right = W - (n - i) * edge;
        const x = off <= 0 ? left : left + (right - left) * Math.min(1, off);
        b.el.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
        b.el.style.zIndex = 10 + i;
        b.el.style.width = (W - (n - 1) * edge) + 'px';
      });
    },
    // Fondo: blanco verdoso con esferas de luz difusas que flotan.
    backdrop(g, W, H, dt, now) {
      if (!this.orbs) this.orbs = Array.from({ length: 9 }, (_, i) => ({ x: Math.random(), y: Math.random(), r: 0.12 + Math.random() * 0.22, s: 0.01 + Math.random() * 0.02, p: Math.random() * 6, c: i % 3 }));
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#f4f7f2'); bg.addColorStop(1, '#d9e3d4');
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      const t = now / 1000;
      for (const o of this.orbs) {
        const x = (o.x + Math.sin(t * o.s + o.p) * 0.08) * W, y = (o.y + Math.cos(t * o.s * 0.8 + o.p) * 0.06) * H, rr = o.r * H;
        const gr = g.createRadialGradient(x, y, 0, x, y, rr);
        const col = o.c === 0 ? '120, 200, 70' : o.c === 1 ? '255, 255, 255' : '170, 220, 140';
        gr.addColorStop(0, `rgba(${col}, .45)`); gr.addColorStop(1, `rgba(${col}, 0)`);
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, 6.283); g.fill();
      }
    },
  };
  return self;
}
