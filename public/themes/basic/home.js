// Tema «Basic» (inspirado en las computadoras MSX): pantalla azul de texto con borde, el intérprete BASIC
// recién encendido y un listado de programa donde cada línea es una opción (la elegida en video inverso).
// Abajo, la barra de teclas de función (color auto goto list run). Izquierda/derecha cambia de sección.
export default function basic(api, root) {
  const { h, rem, clamp, fmtN, S, Back } = api;
  const self = {
    paintScale: 0.12,
    secs: [], si: 0, idx: {}, t: 0, typed: 0,
    hints: () => [['ud', 'Línea'], ['lr', 'Sección'], ['a', 'RUN'], ['menu', 'Ajustes']],
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.head = h('div', { class: 'mx-head' }, h('div', { text: 'MSX BASIC versión 1.0' }), h('div', { text: 'Pandora’s Box · 28815 bytes libres' }), h('div', { text: 'Ok' }));
      this.cmd = h('div', { class: 'mx-cmd' });
      this.list = h('div', { class: 'mx-list' });
      this.ok = h('div', { class: 'mx-ok' }, h('span', { text: 'Ok' }), h('br'), h('i'));
      this.vid = h('video', { muted: '', playsinline: '', loop: '' }); this.vid.muted = true;
      this.pic = h('div', { class: 'mx-pic' });
      this.sprite = h('div', { class: 'mx-sprite' }, this.pic, this.vid);
      this.info = h('div', { class: 'mx-info' });
      this.keys = h('div', { class: 'mx-keys' }, ...['color', 'auto', 'goto', 'list', 'run'].map(k => h('span', { text: k })));
      root.append(h('div', { class: 'mx-screen' }, this.head, this.cmd, this.list, this.ok, this.sprite, this.info), this.keys);
      this.si = clamp(this.si, 0, this.secs.length - 1);
      this.fill(); this.paint(false);
    },
    get sec() { return this.secs[this.si]; },
    get ii() { return clamp(this.idx[this.sec?.key] || 0, 0, Math.max(0, (this.sec?.items.length || 1) - 1)); },
    fill() {
      const s = this.sec; if (!s) return;
      this.cmdText = `LIST "${s.label.toUpperCase()}"`; this.typed = 0;
      this.rows = s.items.map((it, i) => {
        const el = h('div', { class: 'mx-row' }, h('span', { text: String((i + 1) * 10).padStart(4, ' ') }), h('b', { text: ` PRINT "${it.label}"` }));
        el.addEventListener('click', () => { if (i === this.ii) this.run(); else { this.idx[s.key] = i; this.paint(true); } });
        return el;
      });
      this.list.replaceChildren(...this.rows);
    },
    run() { S.play('select'); this.sec.items[this.ii]?.run(); },
    paint(sound) {
      const s = this.sec, it = s?.items[this.ii], p = it?.p;
      this.rows?.forEach((e, i) => e.classList.toggle('on', i === this.ii));
      const row = this.rows?.[this.ii], L = this.list;
      if (row) { if (row.offsetTop < L.scrollTop) L.scrollTop = row.offsetTop; else if (row.offsetTop + row.offsetHeight > L.scrollTop + L.clientHeight) L.scrollTop = row.offsetTop + row.offsetHeight - L.clientHeight; }
      this.pic.replaceChildren(p?.media.device ? h('img', { src: p.media.device, alt: '' }) : p?.media.logo ? h('img', { src: p.media.logo, alt: '' }) : api.icon(it?.ic || s?.icon));
      this.info.textContent = `${(it?.label || '').toUpperCase()}\n${it?.sub || ''}`;
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
      this.si = n; this.fill(); S.play('rotate'); this.paint(false);
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
      if (this.secs.length) { this.fill(); this.paint(false); }
    },
    musicKey() { const it = this.sec?.items[this.ii]; return it?.p ? 'p:' + it.p.name : null; },
    action(a) {
      if (a === 'left' || a === 'right') this.setSec(clamp(this.si + (a === 'left' ? -1 : 1), 0, this.secs.length - 1));
      else if (a === 'up' || a === 'down' || a === 'lb' || a === 'rb') {
        const d = a === 'up' ? -1 : a === 'down' ? 1 : a === 'lb' ? -10 : 10;
        const j = clamp(this.ii + d, 0, this.sec.items.length - 1);
        if (j === this.ii) return S.play('error');
        this.idx[this.sec.key] = j; this.paint(true);
      } else if (a === 'a') this.run();
    },
    frame(dt) {
      this.t += dt;
      // El comando se escribe letra por letra, como si alguien lo tecleara.
      if (this.typed < this.cmdText.length) { this.typed = Math.min(this.cmdText.length, this.typed + dt * 28); this.cmd.textContent = this.cmdText.slice(0, Math.floor(this.typed)); }
      root.classList.toggle('mx-blink', Math.floor(this.t * 2.2) % 2 === 0);
    },
    // Fondo: el borde de la pantalla, azul más oscuro.
    backdrop(g, W, H) { g.fillStyle = '#2b2bb8'; g.fillRect(0, 0, W, H); },
  };
  return self;
}
