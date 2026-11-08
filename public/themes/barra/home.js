// Tema «Barra» (inspirado en la barra cruzada de PS3/PSP).
// Categorías en horizontal; sus plataformas en vertical. Fondo de ondas de luz que cambia de color con el mes.
export default function barra(api, root) {
  const { h, Spring, rem, clamp, short, fmtN, ord, S, Back } = api;
  const HUES = [205, 200, 280, 330, 95, 120, 190, 175, 35, 20, 0, 250]; // un color por mes
  const self = {
    paintScale: 0.6,
    cols: [], ci: 1, rows: {}, colS: new Spring(1, { response: 0.42, damping: 1 }), rowS: new Spring(0, { response: 0.36, damping: 1 }), t: 0,
    hints: () => [['a', 'Abrir'], ['lr', 'Categoría'], ['ud', 'Elegir'], ['menu', 'Ajustes']],
    build() {
      const lib = api.library;
      this.cols = [
        { name: '_settings', label: 'Ajustes', icon: 'settings', items: [
          { label: 'Ajustes de Pandora', sub: 'Tema, sonido, vistas y datos', run: () => api.openSettings() },
          { label: 'Volver a leer LaunchBox', sub: 'Si agregaste juegos', run: () => api.reload() },
        ] },
        ...(api.all ? [{ name: '_all', label: 'Todo', icon: 'all', items: [
          { label: 'Todos los juegos', sub: `${fmtN(api.total)} juegos de todas tus plataformas`, iconKey: 'all', run: () => api.openAll() },
        ] }] : []),
        ...lib.categories.map(c => ({
          name: c.name, label: c.label, icon: c.name,
          items: c.platforms.map(p => ({ p, label: p.name, sub: [p.year, ord(p.generation), `${fmtN(p.count)} juegos`].filter(Boolean).join(' · '), img: p.media.device || p.media.logo, run: () => api.openPlatform(p) })),
        })),
        ...(api.modes.length ? [{ name: '_modes', label: 'Modo de juego', icon: 'modes', items: api.modes.map(m => ({
          label: m.label, sub: `${fmtN(m.count)} juegos · ${m.desc}`, iconKey: 'mode_' + m.id, run: () => api.openCollection(m),
        })) }] : []),
        ...(api.genres.length ? [{ name: '_genres', label: 'Géneros', icon: 'genre', items: api.genres.map(m => ({ label: m.label, sub: `${fmtN(m.count)} juegos`, iconKey: api.genreIcon(m), run: () => api.openCollection(m) })) }] : []),
        ...(api.developers.length ? [{ name: '_devs', label: 'Desarrolladoras', icon: 'dev', items: api.developers.map(m => ({ label: m.label, sub: `${fmtN(m.count)} juegos`, iconKey: 'dev', img: m.logo || null, run: () => api.openCollection(m) })) }] : []),
        { name: '_spectator', label: 'Espectador', icon: 'spectator', items: [
          { label: 'Toda la biblioteca', sub: 'Videos al azar', run: () => api.openSpectator(null) },
          ...lib.categories.map(c => ({ label: c.label, sub: 'Solo ' + c.label.toLowerCase(), run: () => api.openSpectator(c.name) })),
        ] },
      ];
      root.replaceChildren();
      this.bar = h('div', { class: 'xmb-bar' });
      this.colEls = this.cols.map((c, i) => {
        const el = h('div', { class: 'xmb-col' }, api.icon(c.icon), h('span', { class: 'xmb-label', text: c.label }));
        el.addEventListener('click', () => { if (i === this.ci) return; this.ci = i; this.colS.set(i); S.play('rotate'); this.list(); });
        this.bar.append(el); return el;
      });
      this.items = h('div', { class: 'xmb-items' });
      this.info = h('div', { class: 'xmb-info' });
      root.append(this.bar, this.items, this.info);
      this.ci = clamp(this.ci, 0, this.cols.length - 1); this.colS.jump(this.ci);
      this.list(true);
    },
    get col() { return this.cols[this.ci]; },
    get ri() { return this.rows[this.ci] || 0; },
    list(jump) {
      const c = this.col;
      this.itemEls = c.items.map((it, i) => {
        const el = h('div', { class: 'xmb-item' },
          h('div', { class: 'xmb-ico' }, it.img ? h('img', { src: it.img, alt: '' }) : api.icon(it.iconKey || c.icon)),
          h('div', { class: 'xmb-txt' }, h('b', { text: it.label }), h('span', { text: it.sub || '' })));
        el.addEventListener('click', () => { if (i === this.ri) it.run(); else this.move(i - this.ri); });
        return el;
      });
      this.items.replaceChildren(...this.itemEls);
      if (jump) this.rowS.jump(this.ri); else this.rowS.jump(this.ri - 0.0001);
      this.focus();
    },
    move(d) {
      const n = clamp(this.ri + d, 0, this.col.items.length - 1);
      if (n === this.ri) { S.play('error'); return; }
      this.rows[this.ci] = n; this.rowS.set(n); S.play('move', n); this.focus();
    },
    focus() {
      this.colEls.forEach((e, i) => e.classList.toggle('on', i === this.ci));
      this.itemEls.forEach((e, i) => e.classList.toggle('on', i === this.ri));
      const it = this.col.items[this.ri];
      clearTimeout(this.vt);
      Back.setVideo(null);
      this.info.textContent = it?.p ? (it.p.manufacturer || '') : '';
      const vurl = api.videoFor(this.col, it);
      if (Back.video !== vurl) Back.setVideo(null);
      if (vurl && api.settings.autoVideo && Back.video !== vurl) this.vt = setTimeout(() => { if (api.top() === 'home') Back.setVideo(vurl); }, 900);
      api.updateAudio(); api.saveLast();
    },
    enter() { Back.setImage(null); Back.setLook('ghost'); this.focus(); },
    resume() { this.enter(); },
    leave() { clearTimeout(this.vt); },
    state() { return { ci: this.ci, rows: this.rows }; },
    restore(f) { if (f?.rows) { this.rows = f.rows; this.ci = f.ci ?? this.ci; this.colS.jump(this.ci); if (this.itemEls) this.list(true); } },
    musicKey() { const it = this.col?.items[this.ri]; return it?.p ? 'p:' + it.p.name : (this.col && !this.col.name.startsWith('_') ? 'c:' + this.col.name : null); },
    action(a) {
      if (a === 'left' || a === 'right' || a === 'lb' || a === 'rb') {
        const n = clamp(this.ci + (a === 'left' || a === 'lb' ? -1 : 1), 0, this.cols.length - 1);
        if (n === this.ci) { S.play('error'); return; }
        this.ci = n; this.colS.set(n); S.play('rotate'); this.list();
      } else if (a === 'up') this.move(-1);
      else if (a === 'down') this.move(1);
      else if (a === 'a') { const it = this.col.items[this.ri]; if (it) it.run(); }
    },
    frame(dt) {
      this.t += dt;
      this.colS.step(dt); this.rowS.step(dt);
      const r = rem(), x0 = innerWidth * 0.22, step = 12 * r, barY = innerHeight * 0.26;
      this.colEls.forEach((el, i) => {
        const off = i - this.colS.x, on = Math.max(0, 1 - Math.abs(off));
        el.style.transform = `translate3d(${(x0 + off * step).toFixed(1)}px, ${barY.toFixed(1)}px, 0) scale(${(0.82 + 0.18 * on).toFixed(3)})`;
        el.style.opacity = (Math.abs(off) > 6 ? 0 : 0.45 + 0.55 * on).toFixed(3);
      });
      const rowH = 7.2 * r;
      this.itemEls.forEach((el, i) => {
        const off = i - this.rowS.x;
        const y = off >= -0.001 ? barY + 9.5 * r + off * rowH : barY - 2 * r + off * rowH;
        el.style.transform = `translate3d(${(x0 - 1.4 * r).toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        el.style.opacity = (y < -rowH || y > innerHeight ? 0 : Math.abs(off) < 0.5 ? 1 : off < 0 ? 0.35 : 0.6).toFixed(2);
      });
      this.info.style.transform = `translate3d(${(x0 + 3.6 * r).toFixed(1)}px, ${(barY + 9.5 * r + 5 * r).toFixed(1)}px, 0)`;
    },
    // Fondo: degradado del color del mes y cintas de luz que ondulan.
    backdrop(g, W, H, dt, now) {
      const hue = HUES[new Date().getMonth()], t = now / 1000;
      const bg = g.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, `hsl(${hue}, 55%, 22%)`); bg.addColorStop(0.55, `hsl(${hue}, 60%, 12%)`); bg.addColorStop(1, `hsl(${hue + 10}, 50%, 6%)`);
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 7; k++) {
        const amp = H * (0.05 + k * 0.012), base = H * (0.58 + k * 0.012), sp = 0.12 + k * 0.025, ph = k * 0.9;
        g.beginPath();
        for (let x = 0; x <= W; x += W / 80) {
          const y = base + Math.sin(x / W * 4.2 + t * sp + ph) * amp + Math.sin(x / W * 9 - t * sp * 1.6 + ph) * amp * 0.25;
          x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        g.strokeStyle = `hsla(${hue + 20}, 70%, 85%, ${0.05 + (k === 3 ? 0.08 : 0)})`;
        g.lineWidth = k === 3 ? 2.2 : 1.2;
        g.stroke();
        g.lineTo(W, H); g.lineTo(0, H); g.closePath();
        g.fillStyle = `hsla(${hue + 15}, 70%, 70%, 0.018)`; g.fill();
      }
      g.globalCompositeOperation = 'source-over';
    },
  };
  return self;
}
