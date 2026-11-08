// Tema «Volumen» (inspirado en la llegada del 3D con Nintendo 64): un espacio con profundidad de verdad.
// Las opciones son losas con grosor que giran en un anillo; al fondo, un cubo armado con cuatro bloques
// de colores gira con sombreado suave sobre una rejilla que se pierde en el horizonte.
export default function volumen(api, root) {
  const { h, Spring, rem, clamp, S, Back } = api;
  const COLORS = ['#e2322b', '#1f9e48', '#2556d9', '#f2b705'];
  const STEP = 26; // grados entre losas
  const self = {
    paintScale: 0.6,
    secs: [], si: 0, idx: {}, ring: new Spring(0, { response: 0.45, damping: 0.82 }), flip: new Spring(0, { response: 0.5, damping: 0.7 }), t: 0,
    hints: () => [['lr', 'Elegir'], ['ud', 'Sección'], ['a', 'Abrir'], ['menu', 'Ajustes']],
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      this.title = h('div', { class: 'vo-title' });
      this.count = h('div', { class: 'vo-count' });
      this.stage = h('div', { class: 'vo-stage' });
      this.ringEl = h('div', { class: 'vo-ring' });
      this.stage.append(this.ringEl);
      this.info = h('div', { class: 'vo-info' });
      this.nav = h('div', { class: 'vo-nav' });
      root.append(this.title, this.count, this.stage, this.info, this.nav);
      this.si = clamp(this.si, 0, this.secs.length - 1);
      this.fill(); this.ring.jump(this.ii);
      this.paint(false);
    },
    get sec() { return this.secs[this.si]; },
    get ii() { return clamp(this.idx[this.sec?.key] || 0, 0, Math.max(0, (this.sec?.items.length || 1) - 1)); },
    get color() { return COLORS[this.si % 4]; },
    fill() {
      const s = this.sec; if (!s) return;
      root.style.setProperty('--vo', this.color);
      this.title.textContent = s.label.toUpperCase();
      this.nav.replaceChildren(...this.secs.map((x, i) => h('span', { class: i === this.si ? 'on' : '', style: `--c:${COLORS[i % 4]}` }, h('i'), x.label)));
      // Cada losa es una caja de seis caras (tiene grosor de verdad).
      this.slabs = s.items.map((it, i) => {
        const p = it.p;
        const face = c => h('div', { class: 'vo-f ' + c });
        const front = h('div', { class: 'vo-f front' },
          p?.media.device ? h('img', { src: p.media.device, alt: '' }) : p?.media.logo ? h('img', { class: 'logo', src: p.media.logo, alt: '' }) : api.icon(it.ic || s.icon));
        const el = h('div', { class: 'vo-slab' }, front, face('back'), face('left'), face('right'), face('top'), face('bottom'));
        el.addEventListener('click', () => { if (i === this.ii) { S.play('select'); it.run(); } else { this.idx[s.key] = i; this.paint(true); } });
        return el;
      });
      this.ringEl.replaceChildren(...this.slabs);
      this.flip.jump(1); this.flip.set(0);
    },
    paint(sound) {
      const s = this.sec, it = s?.items[this.ii];
      this.slabs?.forEach((e, i) => e.classList.toggle('on', i === this.ii));
      this.ring.set(this.ii);
      this.count.textContent = `${String(this.ii + 1).padStart(2, '0')} / ${String(s?.items.length || 0).padStart(2, '0')}`;
      this.info.replaceChildren(h('b', { text: it?.label || '' }), h('span', { text: it?.sub || '' }));
      if (sound) S.play('move', this.ii);
      clearTimeout(this.vt);
      const vurl = api.videoFor(this.sec, it);
      if (Back.video !== vurl) Back.setVideo(null);
      if (vurl && api.settings.autoVideo && Back.video !== vurl) this.vt = setTimeout(() => { if (api.top() === 'home') Back.setVideo(vurl); }, 900);
      api.updateAudio(); api.saveLast(); api.renderChrome();
    },
    setSec(n) {
      if (n === this.si) return S.play('error');
      this.si = n; this.fill(); this.ring.jump(this.ii); S.play('rotate'); this.paint(false);
    },
    enter() { Back.setImage(null); Back.setLook('ghost'); this.paint(false); },
    resume() { this.enter(); },
    leave() { clearTimeout(this.vt); },
    state() { return { key: this.sec?.key, idx: this.idx }; },
    restore(f) {
      if (!f) return;
      this.idx = f.idx || {};
      const i = this.secs.findIndex(s => s.key === f.key);
      if (i >= 0) this.si = i;
      if (this.secs.length) { this.fill(); this.ring.jump(this.ii); this.paint(false); }
    },
    musicKey() { const it = this.sec?.items[this.ii]; return it?.p ? 'p:' + it.p.name : null; },
    action(a) {
      if (a === 'left' || a === 'right' || a === 'lb' || a === 'rb') {
        const d = a === 'left' ? -1 : a === 'right' ? 1 : a === 'lb' ? -5 : 5;
        const j = clamp(this.ii + d, 0, this.sec.items.length - 1);
        if (j === this.ii) return S.play('error');
        this.idx[this.sec.key] = j; this.paint(true);
      } else if (a === 'up' || a === 'down') this.setSec(clamp(this.si + (a === 'up' ? -1 : 1), 0, this.secs.length - 1));
      else if (a === 'a') { S.play('select'); this.sec.items[this.ii]?.run(); }
    },
    frame(dt) {
      this.t += dt; this.ring.step(dt); this.flip.step(dt);
      const r = rem(), R = 34 * r, fl = this.flip.x;
      // El anillo entero gira; al cambiar de sección, da media vuelta hacia arriba.
      this.ringEl.style.transform = `translateZ(${(-R).toFixed(1)}px) rotateX(${(fl * -70 - 8).toFixed(2)}deg) rotateY(${(-this.ring.x * STEP).toFixed(2)}deg)`;
      this.slabs?.forEach((el, i) => {
        const off = i - this.ring.x;
        if (Math.abs(off) > 3.6) { el.style.display = 'none'; return; }
        el.style.display = '';
        const on = i === this.ii;
        // La elegida sale al frente y gira un poco sobre sí misma, presumiendo su volumen.
        const spin = on ? Math.sin(this.t * 1.3) * 18 : 0, pop = on ? 4 * r : 0, bob = on ? Math.sin(this.t * 2.2) * 0.5 * r : 0;
        el.style.transform = `rotateY(${(i * STEP).toFixed(2)}deg) translateZ(${(R + pop).toFixed(1)}px) translateY(${bob.toFixed(1)}px) rotateY(${spin.toFixed(2)}deg)`;
      });
      this.title.style.transform = `perspective(60rem) rotateX(${(fl * 80).toFixed(2)}deg)`;
      this.title.style.opacity = (1 - fl).toFixed(3);
    },
    // Fondo: cielo profundo, rejilla en perspectiva y un cubo de cuatro bloques con sombreado suave.
    backdrop(g, W, H, dt, now) {
      const t = now / 1000;
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#040a2a'); sky.addColorStop(0.55, '#0b2a78'); sky.addColorStop(1, '#030716');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      // Rejilla del piso: líneas que corren hacia ti.
      const hz = H * 0.62;
      g.strokeStyle = 'rgba(90, 150, 255, .35)'; g.lineWidth = Math.max(1, H / 600);
      for (let i = -14; i <= 14; i++) { g.beginPath(); g.moveTo(W / 2 + i * W * 0.012, hz); g.lineTo(W / 2 + i * W * 0.16, H); g.stroke(); }
      const sh = (t * 0.35) % 1;
      for (let k = 0; k < 16; k++) { const z = (k + sh) / 16, y = hz + (H - hz) * z * z; g.globalAlpha = z; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      g.globalAlpha = 1;
      // Cubo de cuatro bloques (2×2), cada uno de un color, girando con luz.
      const cx = W * 0.82, cy = H * 0.25, S3 = H * 0.085;
      const ax = t * 0.5, ay = t * 0.7, cxs = Math.cos(ax), sxs = Math.sin(ax), cys = Math.cos(ay), sys = Math.sin(ay);
      const rot = ([x, y, z]) => { const y1 = y * cxs - z * sxs, z1 = y * sxs + z * cxs; return [x * cys + z1 * sys, y1, -x * sys + z1 * cys]; };
      const faces = [];
      const blocks = [[-0.5, -0.5, 0], [0.5, -0.5, 0], [-0.5, 0.5, 0], [0.5, 0.5, 0]];
      const F = [[0, 1, 2, 3, [0, 0, -1]], [4, 5, 6, 7, [0, 0, 1]], [0, 1, 5, 4, [0, -1, 0]], [3, 2, 6, 7, [0, 1, 0]], [0, 3, 7, 4, [-1, 0, 0]], [1, 2, 6, 5, [1, 0, 0]]];
      blocks.forEach((b, bi) => {
        const v = [[-.47, -.47, -.47], [.47, -.47, -.47], [.47, .47, -.47], [-.47, .47, -.47], [-.47, -.47, .47], [.47, -.47, .47], [.47, .47, .47], [-.47, .47, .47]]
          .map(([x, y, z]) => rot([x + b[0], y + b[1], z * 1.0]));
        for (const f of F) {
          const n = rot(f[4]);
          if (n[2] > 0) continue; // cara de espaldas
          const pts = f.slice(0, 4).map(k => v[k]);
          const depth = pts.reduce((s, p) => s + p[2], 0) / 4;
          const light = clamp(0.35 + 0.65 * Math.max(0, -n[2] * 0.7 - n[1] * 0.4 + n[0] * 0.2), 0, 1);
          faces.push({ pts, depth, light, col: COLORS[bi] });
        }
      });
      faces.sort((a, b) => b.depth - a.depth);
      for (const f of faces) {
        g.beginPath();
        f.pts.forEach(([x, y, z], i) => { const k = 4 / (4 + z); const px = cx + x * S3 * k, py = cy + y * S3 * k; i ? g.lineTo(px, py) : g.moveTo(px, py); });
        g.closePath();
        g.fillStyle = f.col; g.fill();
        g.fillStyle = `rgba(${f.light > 0.6 ? '255,255,255' : '0,0,20'}, ${(Math.abs(f.light - 0.6) * 0.8).toFixed(3)})`; g.fill();
      }
    },
  };
  return self;
}
