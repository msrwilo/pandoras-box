// Tema «Doble» (inspirado en la idea del Nintendo DS: una pantalla para ver y otra para tocar).
// Arriba se mira: lo elegido, su video, un reloj de manecillas y el calendario del mes. Abajo se toca:
// papel cuadriculado con botones grandes y un lápiz que se desliza al elegido; al pie, las pestañas de sección.
export default function doble(api, root) {
  const { h, Spring, rem, clamp, S, Back } = api;
  const self = {
    paintScale: 0.5,
    secs: [], si: 0, idx: {}, row: new Spring(0, { response: 0.32, damping: 0.95 }), pen: new Spring(0, { response: 0.3, damping: 0.8 }), t: 0,
    hints: () => [['lr', 'Elegir'], ['lbrb', 'Pestaña'], ['a', 'Tocar'], ['menu', 'Ajustes']],
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.vid = h('video', { muted: '', playsinline: '', loop: '' }); this.vid.muted = true;
      this.art = h('div', { class: 'nd-art' });
      this.title = h('div', { class: 'nd-title' });
      this.clock = h('canvas', { class: 'nd-clock', width: 240, height: 240 });
      this.cal = h('div', { class: 'nd-cal' });
      this.top = h('div', { class: 'nd-top' }, h('div', { class: 'nd-view' }, this.art, this.vid), this.title, h('div', { class: 'nd-side' }, this.clock, this.cal));
      this.strip = h('div', { class: 'nd-strip' });
      this.penEl = h('div', { class: 'nd-pen' }); this.penEl.innerHTML = '<svg viewBox="0 0 40 40"><path d="M6 34l3-10L28 5a3 3 0 0 1 4 0l3 3a3 3 0 0 1 0 4L16 31z" fill="#e9eef5" stroke="#5a6472" stroke-width="2" stroke-linejoin="round"/><path d="M6 34l3-10 7 7z" fill="#5a6472"/></svg>';
      this.tabs = h('div', { class: 'nd-tabs' });
      this.bottom = h('div', { class: 'nd-bottom' }, this.strip, this.penEl, this.tabs);
      root.append(this.top, h('div', { class: 'nd-hinge' }), this.bottom);
      this.si = clamp(this.si, 0, this.secs.length - 1);
      this.calendar(); clearInterval(this.ct); this.ct = setInterval(() => this.calendar(), 60000);
      this.fill(); this.row.jump(this.ii); this.paint(false);
    },
    // Calendario del mes con el día de hoy marcado.
    calendar() {
      const d = new Date(), y = d.getFullYear(), m = d.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
      const cells = [...'LMMJVSD'].map(c => h('i', { class: 'hd', text: c }));
      for (let i = 0; i < first; i++) cells.push(h('i'));
      for (let k = 1; k <= days; k++) cells.push(h('i', { class: k === d.getDate() ? 'today' : '', text: String(k) }));
      this.cal.replaceChildren(h('b', { text: d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }) }), h('div', { class: 'nd-days' }, ...cells));
    },
    get sec() { return this.secs[this.si]; },
    get ii() { return clamp(this.idx[this.sec?.key] || 0, 0, Math.max(0, (this.sec?.items.length || 1) - 1)); },
    fill() {
      const s = this.sec; if (!s) return;
      this.tabs.replaceChildren(api.glyph('lb'), ...this.secs.map((x, i) => { const el = h('span', { class: i === this.si ? 'on' : '', text: x.label }); el.addEventListener('click', () => this.setSec(i)); return el; }), api.glyph('rb'));
      const on = this.tabs.children[this.si]; if (on) this.tabs.scrollTo({ left: on.offsetLeft - this.tabs.clientWidth / 2 + on.offsetWidth / 2 });
      this.cards = s.items.map((it, i) => {
        const p = it.p;
        const el = h('button', { class: 'nd-btn' }, h('div', { class: 'nd-bico' }, p?.media.device ? h('img', { src: p.media.device, alt: '' }) : p?.media.logo ? h('img', { src: p.media.logo, alt: '' }) : api.icon(it.ic || s.icon)), h('span', { text: it.label }));
        el.addEventListener('click', () => { if (i === this.ii) this.run(); else { this.idx[s.key] = i; this.paint(true); } });
        return el;
      });
      this.strip.replaceChildren(...this.cards);
    },
    run() { S.play('select'); this.sec.items[this.ii]?.run(); },
    paint(sound) {
      const s = this.sec, it = s?.items[this.ii], p = it?.p;
      this.cards?.forEach((e, i) => e.classList.toggle('on', i === this.ii));
      this.row.set(this.ii);
      this.art.replaceChildren(p?.media.device ? h('img', { src: p.media.device, alt: '' }) : p?.media.logo ? h('img', { src: p.media.logo, alt: '' }) : api.icon(it?.ic || s?.icon));
      this.title.replaceChildren(h('small', { text: s?.label || '' }), h('b', { text: it?.label || '' }), h('span', { text: it?.sub || '' }));
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
      this.si = n; this.fill(); this.row.jump(this.ii); S.play('rotate'); this.paint(false);
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
      if (this.secs.length) { this.fill(); this.row.jump(this.ii); this.paint(false); }
    },
    musicKey() { const it = this.sec?.items[this.ii]; return it?.p ? 'p:' + it.p.name : null; },
    action(a) {
      if (a === 'lb' || a === 'rb') return this.setSec(clamp(this.si + (a === 'lb' ? -1 : 1), 0, this.secs.length - 1));
      if (a === 'left' || a === 'right') {
        const d = a === 'left' ? -1 : 1;
        const j = clamp(this.ii + d, 0, this.sec.items.length - 1);
        if (j === this.ii) return S.play('error');
        this.idx[this.sec.key] = j; this.paint(true);
      } else if (a === 'up' || a === 'down') this.setSec(clamp(this.si + (a === 'up' ? -1 : 1), 0, this.secs.length - 1));
      else if (a === 'a') this.run();
    },
    frame(dt) {
      this.t += dt; this.row.step(dt); this.pen.step(dt);
      const r = rem(), w = 15.4 * r, W = this.strip.clientWidth, x0 = W / 2 - 7 * r;
      this.cards?.forEach((el, i) => {
        const off = i - this.row.x;
        el.style.transform = `translate3d(${(x0 + off * w).toFixed(1)}px, 0, 0)`;
        el.style.visibility = Math.abs(off) > 3.5 ? 'hidden' : '';
      });
      // El lápiz toca el botón elegido y se mece un poquito, como si estuviera por tocar.
      const tap = Math.max(0, Math.sin(this.t * 3)) * 0.6 * r;
      this.penEl.style.transform = `translate3d(${(innerWidth / 2 + 4.6 * r).toFixed(1)}px, ${(6.4 * r - tap).toFixed(1)}px, 0)`;
      // Reloj de manecillas.
      const g = this.clock.getContext('2d'), d = new Date(), c = 120;
      g.clearRect(0, 0, 240, 240);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(c, c, 108, 0, 6.283); g.fill();
      g.strokeStyle = '#c9d3df'; g.lineWidth = 6; g.stroke();
      g.fillStyle = '#9aa7b6'; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; g.beginPath(); g.arc(c + Math.sin(a) * 90, c - Math.cos(a) * 90, k % 3 ? 3 : 6, 0, 6.283); g.fill(); }
      const hand = (a, len, wdt, col) => { g.strokeStyle = col; g.lineWidth = wdt; g.lineCap = 'round'; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.sin(a) * len, c - Math.cos(a) * len); g.stroke(); };
      const sec = d.getSeconds() + d.getMilliseconds() / 1000, min = d.getMinutes() + sec / 60, hr = d.getHours() % 12 + min / 60;
      hand(hr * Math.PI / 6, 54, 10, '#3a4452'); hand(min * Math.PI / 30, 80, 7, '#3a4452'); hand(sec * Math.PI / 30, 88, 3, '#2d8cff');
      g.fillStyle = '#2d8cff'; g.beginPath(); g.arc(c, c, 8, 0, 6.283); g.fill();
    },
    backdrop(g, W, H) { g.fillStyle = '#e9edf2'; g.fillRect(0, 0, W, H); },
  };
  return self;
}
