// Tema «Luna» (inspirado en Windows XP): un escritorio con colina verde y cielo azul, la barra de tareas con
// el botón verde de inicio y el menú Inicio abierto. A la izquierda del menú están las secciones; al elegir una,
// se despliega su submenú a la derecha (como «Todos los programas»). Lo elegido se ve en una ventana azul.
export default function luna(api, root) {
  const { h, Spring, rem, clamp, fmtN, S, Back } = api;
  const self = {
    paintScale: 0.5,
    secs: [], si: 0, zone: 'menu', idx: {}, t: 0, fly: new Spring(0, { response: 0.22, damping: 1 }),
    hints() { return this.zone === 'menu' ? [['ud', 'Elegir'], ['a', 'Abrir menú'], ['menu', 'Ajustes']] : [['ud', 'Elegir'], ['a', 'Ejecutar'], ['b', 'Cerrar menú']]; },
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.secRows = this.secs.map((s, i) => {
        const el = h('div', { class: 'xp-item' }, h('div', { class: 'xp-ico' }, api.icon(s.icon)), h('div', {}, h('b', { text: s.label }), h('small', { text: `${s.items.length} ${s.items.length === 1 ? 'elemento' : 'elementos'}` })), h('i', { text: '▶' }));
        el.addEventListener('click', () => { if (this.zone === 'menu' && i === this.si) this.openFly(); else { this.zone = 'menu'; this.si = i; this.paint(true); } });
        return el;
      });
      this.menuList = h('div', { class: 'xp-left' }, ...this.secRows);
      this.right = h('div', { class: 'xp-right' });
      this.start = h('div', { class: 'xp-start' },
        h('div', { class: 'xp-user' }, h('div', { class: 'xp-pic' }), h('b', { text: 'Pandora’s Box' })),
        h('div', { class: 'xp-cols' }, this.menuList, this.right),
        h('div', { class: 'xp-off' }, h('span', { class: 'xp-key' }, h('i'), 'Cerrar sesión'), h('span', { class: 'xp-pow' }, h('i'), 'Apagar equipo')));
      this.flyList = h('div', { class: 'xp-flylist' });
      this.flyUp = h('div', { class: 'xp-more up', text: '▲' }); this.flyDn = h('div', { class: 'xp-more dn', text: '▼' });
      this.fly = h('div', { class: 'xp-fly' }, h('div', { class: 'xp-flybox' }, this.flyUp, this.flyList, this.flyDn));
      this.vid = h('video', { muted: '', playsinline: '', loop: '' }); this.vid.muted = true;
      this.pic = h('div', { class: 'xp-wpic' });
      this.wtitle = h('span');
      this.win = h('div', { class: 'xp-win' }, h('div', { class: 'xp-title' }, this.wtitle, h('em', {}, h('i', { text: '_' }), h('i', { text: '□' }), h('i', { class: 'x', text: '✕' }))),
        h('div', { class: 'xp-body' }, this.pic, this.vid), this.winInfo = h('div', { class: 'xp-status' }));
      this.clock = h('span', { class: 'xp-clock' });
      this.task = h('div', { class: 'xp-task' }, h('div', { class: 'xp-go' }, h('i'), 'inicio'), h('div', { class: 'xp-tasks' }, this.taskBtn = h('span')), h('div', { class: 'xp-tray' }, this.clock));
      root.append(this.win, this.start, this.fly, this.task);
      this.si = clamp(this.si, 0, this.secs.length - 1);
      this.tick(); clearInterval(this.ct); this.ct = setInterval(() => this.tick(), 15000);
      this.paint(false);
    },
    tick() { this.clock.textContent = new Date().toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' }); },
    get sec() { return this.secs[this.si]; },
    get ii() { return clamp(this.idx[this.sec?.key] || 0, 0, Math.max(0, (this.sec?.items.length || 1) - 1)); },
    openFly() {
      const s = this.sec; if (!s?.items.length) return S.play('error');
      if (s.items.length === 1) { S.play('select'); s.items[0].run(); return; }
      this.zone = 'fly'; S.play('open'); this.paint(false);
    },
    fillFly() {
      const s = this.sec;
      this.flyRows = s.items.map((it, i) => {
        const el = h('div', { class: 'xp-frow' }, h('div', { class: 'xp-fico' }, it.p?.media.logo ? h('img', { src: it.p.media.logo, alt: '' }) : api.icon(it.ic || s.icon)), h('span', { text: it.label }));
        el.addEventListener('click', () => { if (this.zone === 'fly' && i === this.ii) this.run(); else { this.zone = 'fly'; this.idx[s.key] = i; this.paint(true); } });
        return el;
      });
      this.flyList.replaceChildren(...this.flyRows);
    },
    run() { S.play('select'); this.sec.items[this.ii]?.run(); },
    paint(sound) {
      const s = this.sec;
      if (this.flyFor !== this.si) { this.flyFor = this.si; this.fillFly(); }
      this.secRows.forEach((e, i) => e.classList.toggle('on', i === this.si));
      this.flyRows.forEach((e, i) => e.classList.toggle('on', this.zone === 'fly' && i === this.ii));
      this.fly.classList.toggle('open', this.zone === 'fly');
      // El submenú sale junto a la sección elegida.
      const row = this.secRows[this.si], M = this.menuList;
      if (row) { if (row.offsetTop - 8 < M.scrollTop) M.scrollTop = row.offsetTop - 8; else if (row.offsetTop + row.offsetHeight + 8 > M.scrollTop + M.clientHeight) M.scrollTop = row.offsetTop + row.offsetHeight + 8 - M.clientHeight; }

      const it = this.zone === 'fly' ? s.items[this.ii] : null, p = it?.p;
      // Columna azul derecha: datos de la sección o del elemento.
      this.right.replaceChildren(h('b', { text: it ? it.label : s.label }), h('span', { text: it ? (it.sub || '') : `${s.items.length} elementos` }),
        ...(it?.desc ? [h('p', { text: it.desc.slice(0, 220) + (it.desc.length > 220 ? '…' : '') })] : []));
      this.wtitle.textContent = it ? it.label : s.label;
      this.taskBtn.textContent = it ? it.label : s.label;
      this.winInfo.textContent = it ? (it.sub || '') : `${s.items.length} elementos`;
      this.pic.replaceChildren(p?.media.device ? h('img', { src: p.media.device, alt: '' }) : p?.media.logo ? h('img', { src: p.media.logo, alt: '' }) : api.icon(it?.ic || s?.icon));
      // El submenú se desplaza suave y deja la fila elegida al centro.
      const fr = this.flyRows[this.ii], L = this.flyList;
      if (fr && this.zone === 'fly') {
        const target = Math.max(0, Math.min(L.scrollHeight - L.clientHeight, fr.offsetTop - L.clientHeight / 2 + fr.offsetHeight / 2));
        L.scrollTo({ top: target, behavior: sound ? 'smooth' : 'auto' });
        this.flyUp.classList.toggle('on', target > 2); this.flyDn.classList.toggle('on', target < L.scrollHeight - L.clientHeight - 2);
      }
      clearTimeout(this.vt); this.vid.pause(); this.vid.classList.remove('on');
      const vurl = api.videoFor(s, it);
      if (vurl && api.settings.autoVideo) this.vt = setTimeout(() => {
        if (api.top() !== 'home') return;
        if (this.vid.dataset.src !== vurl) { this.vid.dataset.src = vurl; this.vid.src = vurl; }
        this.vid.play().then(() => this.vid.classList.add('on')).catch(() => {});
      }, 800);
      if (sound) S.play('move', this.zone === 'fly' ? this.ii : this.si);
      api.updateAudio(); api.saveLast(); api.renderChrome();
    },
    enter() { Back.setImage(null); Back.setVideo(null); Back.setLook(''); this.paint(false); },
    resume() { this.enter(); },
    leave() { clearTimeout(this.vt); this.vid.pause(); },
    back() { if (this.zone === 'fly') { this.zone = 'menu'; S.play('back'); this.paint(false); return true; } return false; },
    state() { return { key: this.sec?.key, idx: this.idx, zone: this.zone }; },
    restore(f) {
      if (!f) return;
      this.idx = f.idx || {};
      const i = this.secs.findIndex(s => s.key === f.key);
      if (i >= 0) this.si = i;
      this.zone = f.zone === 'fly' && this.sec?.items.length > 1 ? 'fly' : 'menu';
      if (this.secs.length) { this.flyFor = null; this.paint(false); }
    },
    musicKey() { const it = this.zone === 'fly' ? this.sec?.items[this.ii] : null; return it?.p ? 'p:' + it.p.name : null; },
    action(a) {
      if (this.zone === 'menu') {
        if (a === 'up' || a === 'down') {
          const n = clamp(this.si + (a === 'up' ? -1 : 1), 0, this.secs.length - 1);
          if (n === this.si) return S.play('error');
          this.si = n; this.paint(true);
        } else if (a === 'a' || a === 'right') this.openFly();
        return;
      }
      if (a === 'up' || a === 'down' || a === 'lb' || a === 'rb') {
        const d = a === 'up' ? -1 : a === 'down' ? 1 : a === 'lb' ? -8 : 8;
        const j = clamp(this.ii + d, 0, this.sec.items.length - 1);
        if (j === this.ii) return S.play('error');
        this.idx[this.sec.key] = j; this.paint(true);
      } else if (a === 'a' || a === 'right') this.run();
      else if (a === 'left') this.back();
    },
    frame(dt) { this.t += dt; },
    // Fondo: cielo azul con nubes suaves y una colina verde (dibujo propio).
    backdrop(g, W, H, dt, now) {
      const t = now / 1000;
      const sky = g.createLinearGradient(0, 0, 0, H * 0.7);
      sky.addColorStop(0, '#2d6fe0'); sky.addColorStop(0.6, '#6aa8f2'); sky.addColorStop(1, '#b9d8f7');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 5; i++) {
        const x = ((i * 0.27 + t * 0.004) % 1.3 - 0.15) * W, y = H * (0.1 + (i % 3) * 0.08), s = H * (0.06 + (i % 2) * 0.03);
        const c = g.createRadialGradient(x, y, 0, x, y, s * 2.4);
        c.addColorStop(0, 'rgba(255,255,255,.75)'); c.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = c; g.beginPath(); g.ellipse(x, y, s * 2.4, s, 0, 0, 6.283); g.fill();
      }
      const hill = g.createLinearGradient(0, H * 0.55, 0, H);
      hill.addColorStop(0, '#7cc24a'); hill.addColorStop(0.5, '#4e9a2a'); hill.addColorStop(1, '#2f6e1a');
      g.fillStyle = hill; g.beginPath(); g.moveTo(0, H * 0.72);
      g.bezierCurveTo(W * 0.25, H * 0.5, W * 0.6, H * 0.52, W, H * 0.68); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
    },
  };
  return self;
}
