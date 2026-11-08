// Tema «Canales» (inspirado en el menú de Wii): cuadrícula de canales de 4×3 por página,
// el canal enfocado reproduce su video y al abrirlo aparece la pantalla del canal con «Comenzar».
export default function canales(api, root) {
  const { h, Spring, rem, clamp, fmtN, ord, S, Back } = api;
  const COLS = 4, ROWS = 3, PER = COLS * ROWS;
  const self = {
    chans: [], ci: 0, zone: 'grid', bi: 0, page: new Spring(0, { response: 0.45, damping: 1 }), preview: null, pi: 1,
    zoom: new Spring(0, { response: 0.42, damping: 0.92 }),
    hints() {
      if (this.preview) return [['lr', 'Elegir'], ['a', this.pi === 1 ? 'Comenzar' : 'Volver'], ['b', 'Volver']];
      return [['a', 'Abrir canal'], ['lr', 'Moverse'], ['lbrb', 'Página'], ['menu', 'Ajustes']];
    },
    build() {
      const lib = api.library;
      const specials = [['all', 'Todo', 'all'], ['modes', 'Modo de juego', 'modes'], ['genres', 'Géneros', 'genre'], ['developers', 'Desarrolladoras', 'dev']]
        .filter(([k]) => k === 'all' ? api.all : api[k].length).map(([k, name, ic]) => ({ special: k, name, ic, media: {} }));
      this.list = [...specials, ...lib.categories.flatMap(c => c.platforms)];
      root.replaceChildren();
      this.pagesEl = h('div', { class: 'wii-pages' });
      this.chans = this.list.map((p, i) => {
        const el = h('button', { class: 'wii-ch' + (p.special ? ' special' : '') },
          h('div', { class: 'wii-art' }, p.special ? api.icon(p.ic) : p.media.banner ? h('img', { class: 'cover', src: p.media.banner, alt: '' }) : p.media.device ? h('img', { src: p.media.device, alt: '' }) : null),
          p.media.logo ? h('img', { class: 'wii-logo', src: p.media.logo, alt: p.name }) : h('span', { class: 'wii-name', text: p.name }));
        el.addEventListener('click', () => { if (this.preview) return; if (i === this.ci && this.zone === 'grid') this.openPreview(); else { this.zone = 'grid'; this.ci = i; this.paint(true); } });
        this.pagesEl.append(el);
        return el;
      });
      this.chVideo = h('video', { class: 'wii-chvideo', muted: '', playsinline: '', loop: '' });
      this.chVideo.muted = true;
      this.arrowL = h('button', { class: 'wii-arrow l', text: '‹' }); this.arrowR = h('button', { class: 'wii-arrow r', text: '›' });
      this.arrowL.addEventListener('click', () => this.turnPage(-1)); this.arrowR.addEventListener('click', () => this.turnPage(1));
      this.clock = h('div', { class: 'wii-clock' }); this.date = h('div', { class: 'wii-date' });
      this.btnL = h('button', { class: 'wii-round l' }, api.icon('settings'));
      this.btnR = h('button', { class: 'wii-round r' }, api.icon('spectator'));
      this.btnL.addEventListener('click', () => api.openSettings()); this.btnR.addEventListener('click', () => api.openSpectator(null));
      this.bar = h('div', { class: 'wii-bar' }, this.btnL, h('div', { class: 'wii-time' }, this.clock, this.date), this.btnR);
      // Pantalla del canal
      this.pv = h('div', { class: 'wii-preview' });
      this.pvVideo = h('video', { playsinline: '', loop: '' });
      this.pvImg = h('img', { class: 'wii-pv-img', alt: '' });
      this.pvInfo = h('div', { class: 'wii-pv-info' });
      this.pvBtns = [h('button', { class: 'wii-pill', text: 'Menú' }), h('button', { class: 'wii-pill', text: 'Comenzar' })];
      this.pvBtns[0].addEventListener('click', () => this.closePreview()); this.pvBtns[1].addEventListener('click', () => this.start());
      this.pv.append(h('div', { class: 'wii-pv-frame' }, this.pvImg, this.pvVideo), this.pvInfo, h('div', { class: 'wii-pv-btns' }, ...this.pvBtns));
      root.append(this.pagesEl, this.chVideo, this.arrowL, this.arrowR, this.bar, this.pv);
      this.ci = clamp(this.ci, 0, this.chans.length - 1);
      this.page.jump(Math.floor(this.ci / PER));
      this.tick(); clearInterval(this.ct); this.ct = setInterval(() => this.tick(), 10000);
      this.paint(false);
    },
    tick() {
      const d = new Date();
      this.clock.textContent = d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' }).replace(/\s?[ap]\.?\s?m\.?/i, '');
      this.date.textContent = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'numeric' });
    },
    get pages() { return Math.ceil(this.chans.length / PER); },
    turnPage(d) {
      const p = clamp(Math.floor(this.ci / PER) + d, 0, this.pages - 1);
      if (p === Math.floor(this.ci / PER)) return S.play('error');
      this.ci = clamp(p * PER + (this.ci % PER), 0, this.chans.length - 1);
      S.play('rotate'); this.paint(false);
    },
    paint(sound) {
      this.chans.forEach((e, i) => e.classList.toggle('on', this.zone === 'grid' && i === this.ci));
      this.btnL.classList.toggle('on', this.zone === 'bar' && this.bi === 0);
      this.btnR.classList.toggle('on', this.zone === 'bar' && this.bi === 1);
      this.page.set(Math.floor(this.ci / PER));
      if (sound) S.play('move', this.ci);
      // El canal enfocado reproduce su video dentro del cuadro.
      clearTimeout(this.vt);
      this.chVideo.style.opacity = 0;
      const p = this.list[this.ci];
      if (this.zone === 'grid' && p?.media.video && api.settings.autoVideo) {
        this.vt = setTimeout(() => {
          if (this.chVideo.dataset.src !== p.media.video) { this.chVideo.dataset.src = p.media.video; this.chVideo.src = p.media.video; }
          this.chVideo.play().then(() => { this.chVideo.style.opacity = 1; }).catch(() => {});
        }, 650);
      } else this.chVideo.pause();
      api.updateAudio(); api.saveLast(); api.renderChrome();
    },
    openPreview() {
      const p = this.list[this.ci]; if (!p) return;
      if (p.special) { if (p.special === 'all') api.openAll(); else api.openKind(p.special); return; }
      this.preview = p; this.pi = 1;
      this.chVideo.pause(); this.chVideo.style.opacity = 0;
      const im = p.media.banner || p.media.device || p.media.logo;
      if (im) this.pvImg.src = im; else this.pvImg.removeAttribute('src');
      this.pvInfo.replaceChildren(p.media.logo ? h('img', { src: p.media.logo, alt: p.name }) : h('h1', { text: p.name }),
        h('p', { text: [p.manufacturer, p.year, ord(p.generation), `${fmtN(p.count)} juegos`].filter(Boolean).join(' · ') }));
      if (p.media.video) {
        this.pvVideo.src = p.media.video; this.pvVideo.muted = api.settings.audioMode !== 'video'; this.pvVideo.volume = Math.min(1, api.settings.volume);
        this.pvVideo.play().catch(() => {}); api.setHomeAudio(!this.pvVideo.muted);
      }
      else this.pvVideo.removeAttribute('src');
      this.pv.classList.add('show'); this.zoom.set(1);
      S.play('open'); this.paintPv(); api.renderChrome(); api.updateAudio();
    },
    paintPv() { this.pvBtns.forEach((b, i) => b.classList.toggle('on', i === this.pi)); },
    closePreview() {
      this.preview = null; this.pvVideo.pause(); this.zoom.set(0); api.setHomeAudio(false);
      setTimeout(() => { if (!this.preview) this.pv.classList.remove('show'); }, 380);
      S.play('back'); this.paint(false);
    },
    start() { const p = this.preview; if (!p) return; this.pvVideo.pause(); api.setHomeAudio(false); this.preview = null; this.pv.classList.remove('show'); this.zoom.jump(0); api.openPlatform(p); },
    enter() { Back.setImage(null); Back.setVideo(null); Back.setLook(''); this.paint(false); },
    resume() { this.enter(); },
    leave() { clearTimeout(this.vt); this.chVideo.pause(); this.pvVideo.pause(); api.setHomeAudio(false); },
    state() { return { ci: this.ci }; },
    restore(f) { if (f?.ci != null) { this.ci = f.ci; if (this.chans.length) { this.page.jump(Math.floor(this.ci / PER)); this.paint(false); } } },
    musicKey() { const p = this.list?.[this.ci]; return this.zone === 'grid' && p && !p.special ? 'p:' + p.name : null; },
    action(a) {
      if (this.preview) {
        if (a === 'left' || a === 'right') { const n = a === 'left' ? 0 : 1; if (n !== this.pi) { this.pi = n; S.play('move', n); this.paintPv(); } }
        else if (a === 'a') { this.pi === 1 ? this.start() : this.closePreview(); }
        return;
      }
      if (this.zone === 'bar') {
        if (a === 'left' || a === 'right') { this.bi = a === 'left' ? 0 : 1; S.play('move', this.bi); this.paint(false); }
        else if (a === 'up') { this.zone = 'grid'; this.paint(true); }
        else if (a === 'a') { S.play('select'); this.bi === 0 ? api.openSettings() : api.openSpectator(null); }
        return;
      }
      const pg = Math.floor(this.ci / PER), k = this.ci % PER, col = k % COLS, row = Math.floor(k / COLS);
      if (a === 'left') { if (col > 0) { this.ci--; this.paint(true); } else this.turnPage(-1); }
      else if (a === 'right') { if (col < COLS - 1 && this.ci + 1 < this.chans.length) { this.ci++; this.paint(true); } else this.turnPage(1); }
      else if (a === 'up') { if (row > 0) { this.ci -= COLS; this.paint(true); } else S.play('error'); }
      else if (a === 'down') { if (row < ROWS - 1 && this.ci + COLS < this.chans.length) { this.ci += COLS; this.paint(true); } else { this.zone = 'bar'; this.bi = col < 2 ? 0 : 1; this.paint(true); } }
      else if (a === 'lb' || a === 'rb') this.turnPage(a === 'lb' ? -1 : 1);
      else if (a === 'a') this.openPreview();
    },
    // Si hay vista previa abierta, B la cierra en lugar de salir.
    back() { if (this.preview) { this.closePreview(); return true; } return false; },
    frame(dt) {
      this.page.step(dt); this.zoom.step(dt);
      const key = `${this.page.x.toFixed(4)}|${this.zoom.x.toFixed(4)}|${this.ci}|${innerWidth}|${innerHeight}`;
      if (key === this.lastKey) return;
      this.lastKey = key;
      const r = rem(), W = 19.6 * r, H = 10.6 * r, gx = 1.5 * r, gy = 1.5 * r;
      const totalW = COLS * W + (COLS - 1) * gx, x0 = (innerWidth - totalW) / 2, y0 = 6.4 * r;
      this.chans.forEach((el, i) => {
        const pg = Math.floor(i / PER), k = i % PER, col = k % COLS, row = Math.floor(k / COLS);
        const x = x0 + col * (W + gx) + (pg - this.page.x) * innerWidth, y = y0 + row * (H + gy);
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        el.style.width = W + 'px'; el.style.height = H + 'px';
        if (i === this.ci) { this.chVideo.style.transform = `translate3d(${(x + 0.5 * r).toFixed(1)}px, ${(y + 0.5 * r).toFixed(1)}px, 0)`; this.chVideo.style.width = (W - r) + 'px'; this.chVideo.style.height = (H - r) + 'px'; }
      });
      const pg = Math.floor(this.ci / PER);
      this.arrowL.style.opacity = pg > 0 ? 1 : 0; this.arrowR.style.opacity = pg < this.pages - 1 ? 1 : 0;
      const z = this.zoom.x;
      this.pv.style.opacity = Math.min(1, z * 1.4).toFixed(3);
      this.pv.style.transform = `scale(${(0.6 + 0.4 * z).toFixed(4)})`;
    },
  };
  return self;
}
