// Tema «Esfera» (inspirado en el primer tablero de Xbox): botones verdes en arco unidos a un tubo
// y una esfera de energía a la derecha. Al entrar en una sección, el arco muestra sus elementos.
export default function esfera(api, root) {
  const { h, Spring, rem, clamp, fmtN, S, Back } = api;
  const self = {
    paintScale: 0.5,
    secs: [], si: 0, zone: 'main', idx: {}, sel: new Spring(0, { response: 0.38, damping: 0.9 }), swap: new Spring(1, { response: 0.35, damping: 1 }),
    t: 0, pulse: 0,
    hints() { return this.zone === 'main' ? [['ud', 'Elegir'], ['a', 'Entrar'], ['menu', 'Ajustes']] : [['ud', 'Elegir'], ['a', 'Abrir'], ['b', 'Volver']]; },
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.title = h('div', { class: 'xb-title' });
      this.stack = h('div', { class: 'xb-stack' });
            this.orb = h('div', { class: 'xb-orb' }, h('div', { class: 'xb-orb-art' }), h('div', { class: 'xb-orb-text' }));
      this.panel = h('div', { class: 'xb-panel' });
      root.append(this.stack, this.title, this.orb, this.panel);
      this.si = clamp(this.si, 0, this.secs.length - 1);
      this.fill(true);
    },
    get sec() { return this.secs[this.si]; },
    get entries() { return this.zone === 'main' ? this.secs.map(s => ({ label: s.label, ic: s.icon, sub: s.items.length === 1 ? s.items[0].sub : `${s.items.length}` })) : this.sec.items; },
    get cur() { return this.zone === 'main' ? this.si : clamp(this.idx[this.sec.key] || 0, 0, this.sec.items.length - 1); },
    set cur(v) { if (this.zone === 'main') this.si = v; else this.idx[this.sec.key] = v; },
    fill(jump) {
      this.btns = this.entries.map((e, i) => {
        const el = h('button', { class: 'xb-btn' }, h('span', { class: 'xb-l', text: e.label }), h('span', { class: 'xb-s', text: e.p ? fmtN(e.p.count) : e.coll ? fmtN(e.coll.count) : (e.sub || '') }));
        el.addEventListener('click', () => { if (i === this.cur) this.activate(); else { this.cur = i; this.paint(true); } });
        return el;
      });
      this.stack.replaceChildren(...this.btns);
      this.title.textContent = this.zone === 'main' ? '' : this.sec.label;
      if (jump) this.sel.jump(this.cur); else { this.sel.jump(this.cur + (this.zone === 'main' ? -0.8 : 0.8)); this.sel.set(this.cur); }
      this.swap.jump(0); this.swap.set(1);
      this.paint(false);
    },
    activate() {
      if (this.zone === 'main') {
        const s = this.sec;
        if (s.items.length === 1) { S.play('select'); s.items[0].run(); return; } // «Todo» abre directo
        this.zone = 'sub'; S.play('open'); this.pulse = 1; this.fill(false); return;
      }
      S.play('select'); this.pulse = 1; this.sec.items[this.cur]?.run();
    },
    paint(sound) {
      this.btns.forEach((e, i) => e.classList.toggle('on', i === this.cur));
      this.sel.set(this.cur);
      const it = this.zone === 'sub' ? this.sec.items[this.cur] : null, p = it?.p;
      const art = this.orb.firstChild, txt = this.orb.lastChild;
      art.replaceChildren(p?.media.device ? h('img', { src: p.media.device, alt: '' }) : api.icon(it?.ic || this.sec.icon));
      txt.textContent = it ? it.label : this.sec.label;
      this.panel.textContent = it?.desc ? it.desc.slice(0, 200) + (it.desc.length > 200 ? '…' : '') : (it?.sub || (this.zone === 'main' ? `${this.sec.items.length} ${this.sec.items.length === 1 ? 'opción' : 'opciones'}` : ''));
      if (sound) S.play('move', this.cur);
      clearTimeout(this.vt);
      const vurl = this.zone === 'sub' ? api.videoFor(this.sec, it) : api.videoFor(this.sec, null);
      if (Back.video !== vurl) Back.setVideo(null);
      if (vurl && api.settings.autoVideo && Back.video !== vurl) this.vt = setTimeout(() => { if (api.top() === 'home') Back.setVideo(vurl); }, 900);
      api.updateAudio(); api.saveLast(); api.renderChrome();
    },
    enter() { Back.setImage(null); Back.setLook('ghost'); this.paint(false); },
    resume() { this.enter(); },
    leave() { clearTimeout(this.vt); },
    back() { if (this.zone === 'sub') { this.zone = 'main'; S.play('back'); this.fill(false); return true; } return false; },
    state() { return { key: this.sec?.key, idx: this.idx, zone: this.zone }; },
    restore(f) {
      if (!f) return;
      this.idx = f.idx || {};
      const i = this.secs.findIndex(s => s.key === f.key);
      if (i >= 0) this.si = i;
      this.zone = f.zone === 'sub' && this.sec?.items.length > 1 ? 'sub' : 'main';
      if (this.secs.length) this.fill(true);
    },
    musicKey() { const it = this.zone === 'sub' ? this.sec?.items[this.cur] : null; return it?.p ? 'p:' + it.p.name : null; },
    action(a) {
      const n = this.btns.length;
      if (a === 'up' || a === 'down' || a === 'lb' || a === 'rb') {
        const d = a === 'up' ? -1 : a === 'down' ? 1 : a === 'lb' ? -6 : 6;
        const j = clamp(this.cur + d, 0, n - 1);
        if (j === this.cur) return S.play('error');
        this.cur = j; this.paint(true);
      } else if (a === 'a' || (a === 'right' && this.zone === 'main')) this.activate();
      else if (a === 'left' && this.zone === 'sub') this.back();
    },
    frame(dt) {
      this.t += dt; this.sel.step(dt); this.swap.step(dt);
      this.pulse = Math.max(0, this.pulse - dt * 2.5);
      const r = rem(), cy = innerHeight * 0.48, gap = 5.4 * r, R = 46 * r, cx = 9 * r - R * 0.0;
      // Los botones siguen un arco: el elegido al centro y más hacia la derecha.
      this.btns.forEach((el, i) => {
        const off = i - this.sel.x, ang = off * 0.12;
        const x = cx + R * (Math.cos(ang) - 1) * 1.6 + (1 - this.swap.x) * -6 * r, y = cy + R * Math.sin(ang) * 1.04;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${(y - 2.2 * r).toFixed(1)}px, 0) scale(${(i === this.cur ? 1.06 : 0.94).toFixed(2)})`;
        el.style.opacity = (Math.abs(off) > 6.5 ? 0 : (1 - Math.abs(off) * 0.11) * this.swap.x).toFixed(3);
      });
      const breathe = 1 + Math.sin(this.t * 1.6) * 0.02 + this.pulse * 0.08;
      this.orb.style.transform = `translate(-50%, -50%) scale(${breathe.toFixed(4)})`;
    },
    // Fondo: verde casi negro, tubos de luz que se curvan y la esfera que late.
    backdrop(g, W, H, dt, now) {
      const t = now / 1000;
      const bg = g.createRadialGradient(W * 0.68, H * 0.5, 0, W * 0.68, H * 0.5, W * 0.75);
      bg.addColorStop(0, '#1d4a12'); bg.addColorStop(0.45, '#0b1f08'); bg.addColorStop(1, '#020602');
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      // Retícula hexagonal tenue.
      g.strokeStyle = 'rgba(120, 220, 60, .05)'; g.lineWidth = 1;
      const s = H / 14;
      for (let y = 0, row = 0; y < H + s; y += s * 0.87, row++) for (let x = (row % 2) * s * 0.5; x < W + s; x += s) {
        g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283 + 0.5236; const px = x + Math.cos(a) * s * 0.5, py = y + Math.sin(a) * s * 0.5; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); g.stroke();
      }
      // Volutas de energía que giran alrededor de la esfera.
      const ox = W * 0.68, oy = H * 0.44;
      g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 5; k++) {
        g.beginPath();
        const rr = H * (0.26 + k * 0.035), sp = 0.15 + k * 0.05;
        for (let a = 0; a <= 6.3; a += 0.08) {
          const w = rr * (1 + 0.06 * Math.sin(a * 3 + t * (1 + k * 0.3)));
          const px = ox + Math.cos(a + t * sp) * w, py = oy + Math.sin(a + t * sp) * w * 0.35 + Math.sin(a * 2 + t) * H * 0.02;
          a ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.strokeStyle = `rgba(150, 255, 80, ${0.05 + k * 0.012})`; g.lineWidth = 2; g.stroke();
      }
      const glow = g.createRadialGradient(ox, oy, 0, ox, oy, H * 0.34);
      glow.addColorStop(0, `rgba(170, 255, 90, ${0.32 + 0.06 * Math.sin(t * 1.6)})`); glow.addColorStop(0.5, 'rgba(90, 200, 30, .12)'); glow.addColorStop(1, 'rgba(40, 120, 10, 0)');
      g.fillStyle = glow; g.beginPath(); g.arc(ox, oy, H * 0.36, 0, 6.283); g.fill();
      g.globalCompositeOperation = 'source-over';
      // El tubo que une los botones (sigue el mismo arco que ellos).
      const k = W / innerWidth, r = rem() * k, R = 46 * r, cy = innerHeight * 0.48 * k, cx = 6.8 * r;
      g.beginPath();
      for (let a = -0.9; a <= 0.9; a += 0.02) { const px = cx + R * (Math.cos(a) - 1) * 1.6, py = cy + R * Math.sin(a) * 1.04; a > -0.9 ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.strokeStyle = 'rgba(20, 40, 12, .9)'; g.lineWidth = 2.6 * r; g.stroke();
      g.strokeStyle = 'rgba(140, 230, 70, .35)'; g.lineWidth = 0.35 * r; g.stroke();
    },
  };
  return self;
}
