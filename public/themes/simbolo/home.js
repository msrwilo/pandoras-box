// Tema «Símbolo» (inspirado en MS-DOS y los administradores de archivos en modo texto de los 80 y 90):
// pantalla azul, marcos de línea doble, letra de ancho fijo, barra de menús arriba y teclas de función abajo.
// Tres paneles: carpetas (secciones), archivos (elementos) y vista rápida. Izquierda/derecha cambia de panel.
export default function simbolo(api, root) {
  const { h, Spring, rem, clamp, fmtN, S, Back } = api;
  const self = {
    paintScale: 0.1,
    secs: [], si: 0, zone: 'dirs', idx: {}, t: 0,
    hints() { return this.zone === 'dirs' ? [['ud', 'Carpeta'], ['a', 'Entrar'], ['menu', 'Ajustes']] : [['ud', 'Archivo'], ['a', 'Ejecutar'], ['b', 'Carpetas']]; },
    build() {
      this.secs = api.sections();
      root.replaceChildren();
      const pane = (title, ...kids) => h('div', { class: 'ds-pane' }, h('div', { class: 'ds-ptitle', text: title }), ...kids);
      this.menu = h('div', { class: 'ds-menu' }, ...['Izquierda', 'Archivos', 'Comandos', 'Opciones', 'Derecha'].map(x => h('span', { text: x })), h('i'));
      this.dirList = h('div', { class: 'ds-list' });
      this.fileList = h('div', { class: 'ds-list' });
      this.dirFoot = h('div', { class: 'ds-foot' }); this.fileFoot = h('div', { class: 'ds-foot' });
      this.view = h('div', { class: 'ds-view' });
      this.vid = h('video', { muted: '', playsinline: '', loop: '' }); this.vid.muted = true;
      this.viewInfo = h('div', { class: 'ds-vinfo' });
      this.paneDirs = pane('C:\\PANDORA', this.dirList, this.dirFoot);
      this.paneFiles = pane('', this.fileList, this.fileFoot); this.fileTitle = this.paneFiles.firstChild;
      this.paneView = pane('Vista rápida', h('div', { class: 'ds-frame' }, this.view, this.vid), this.viewInfo);
      this.prompt = h('div', { class: 'ds-prompt' });
      this.keys = h('div', { class: 'ds-keys' }, ...[['1', 'Ayuda'], ['2', 'Menú'], ['3', 'Ver'], ['4', 'Editar'], ['5', 'Copiar'], ['6', 'Mover'], ['7', 'CrDir'], ['8', 'Borrar'], ['9', 'Menús'], ['10', 'Salir']]
        .map(([n, l]) => h('span', {}, h('b', { text: n }), h('em', { text: l }))));
      root.append(this.menu, h('div', { class: 'ds-panes' }, this.paneDirs, this.paneFiles, this.paneView), this.prompt, this.keys);
      this.dirRows = this.secs.map((s, i) => {
        const el = h('div', { class: 'ds-row' }, h('span', { text: s.label.toUpperCase().replace(/\s+/g, '_').slice(0, 14) }), h('em', { text: '<DIR>' }));
        el.addEventListener('click', () => { if (this.zone === 'dirs' && i === this.si) this.enterDir(); else { this.zone = 'dirs'; this.si = i; this.fill(); this.paint(true); } });
        return el;
      });
      this.dirList.replaceChildren(h('div', { class: 'ds-row up' }, h('span', { text: '..' }), h('em', { text: '<UP>' })), ...this.dirRows);
      this.si = clamp(this.si, 0, this.secs.length - 1);
      this.fill(); this.paint(false);
    },
    get sec() { return this.secs[this.si]; },
    get ii() { return clamp(this.idx[this.sec?.key] || 0, 0, Math.max(0, (this.sec?.items.length || 1) - 1)); },
    // Nombres de archivo de 8 letras + extensión, como en la época.
    dosName(label) {
      const base = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 8) || 'SINNOMBR';
      return base.padEnd(8, ' ');
    },
    fill() {
      const s = this.sec; if (!s) return;
      this.fileTitle.textContent = 'C:\\PANDORA\\' + s.label.toUpperCase().replace(/\s+/g, '_').slice(0, 14);
      this.rows = s.items.map((it, i) => {
        const n = it.p?.count ?? it.coll?.count ?? (it.all ? api.total : 0);
        const el = h('div', { class: 'ds-row' }, h('span', { text: `${this.dosName(it.label)} ${it.p ? 'EXE' : 'BAT'}` }), h('i', { text: it.label }), h('em', { text: fmtN(n || 0).padStart(6, ' ') }));
        el.addEventListener('click', () => { if (this.zone === 'files' && i === this.ii) this.run(); else { this.zone = 'files'; this.idx[s.key] = i; this.paint(true); } });
        return el;
      });
      this.fileList.replaceChildren(...this.rows);
      this.dirFoot.textContent = `${this.secs.length} carpetas`;
      this.fileFoot.textContent = `${s.items.length} archivo(s)`;
    },
    enterDir() { if (!this.sec?.items.length) return S.play('error'); this.zone = 'files'; S.play('open'); this.paint(false); },
    run() { S.play('select'); this.sec.items[this.ii]?.run(); },
    paint(sound) {
      const s = this.sec, it = s?.items[this.ii], p = it?.p;
      this.dirRows.forEach((e, i) => e.classList.toggle('on', i === this.si));
      this.rows?.forEach((e, i) => e.classList.toggle('on', this.zone === 'files' && i === this.ii));
      root.classList.toggle('ds-in', this.zone === 'files');
      this.view.replaceChildren(p?.media.device ? h('img', { src: p.media.device, alt: '' }) : p?.media.logo ? h('img', { src: p.media.logo, alt: '' }) : api.icon(it?.ic || s?.icon));
      this.viewInfo.textContent = `${it?.label || ''}\n${it?.sub || ''}`;
      this.prompt.replaceChildren(h('span', { text: `C:\\PANDORA\\${(s?.label || '').toUpperCase().replace(/\s+/g, '_').slice(0, 14)}>` + (this.zone === 'files' && it ? this.dosName(it.label).trim() : '') }), h('i'));
      clearTimeout(this.vt); this.vid.pause(); this.vid.classList.remove('on');
      const vurl = this.zone === 'files' ? api.videoFor(s, it) : api.videoFor(s, null);
      if (vurl && api.settings.autoVideo) this.vt = setTimeout(() => {
        if (api.top() !== 'home' || this.sec?.items[this.ii] !== it) return;
        if (this.vid.dataset.src !== vurl) { this.vid.dataset.src = vurl; this.vid.src = vurl; }
        this.vid.play().then(() => this.vid.classList.add('on')).catch(() => {});
      }, 800);
      // Mantiene visible la fila elegida, saltando de renglón en renglón.
      const keep = (list, row) => { if (!row) return; const top = row.offsetTop, hgt = list.clientHeight; if (top < list.scrollTop) list.scrollTop = top; else if (top + row.offsetHeight > list.scrollTop + hgt) list.scrollTop = top + row.offsetHeight - hgt; };
      keep(this.dirList, this.dirRows[this.si]); keep(this.fileList, this.rows?.[this.ii]);
      if (sound) S.play('move', this.zone === 'files' ? this.ii : this.si);
      api.updateAudio(); api.saveLast(); api.renderChrome();
    },
    enter() { Back.setImage(null); Back.setVideo(null); Back.setLook(''); this.paint(false); },
    resume() { this.enter(); },
    leave() { clearTimeout(this.vt); this.vid.pause(); },
    back() { if (this.zone === 'files') { this.zone = 'dirs'; S.play('back'); this.paint(false); return true; } return false; },
    state() { return { key: this.sec?.key, idx: this.idx, zone: this.zone }; },
    restore(f) {
      if (!f) return;
      this.idx = f.idx || {};
      const i = this.secs.findIndex(s => s.key === f.key);
      if (i >= 0) this.si = i;
      this.zone = f.zone === 'files' ? 'files' : 'dirs';
      if (this.secs.length) { this.fill(); this.paint(false); }
    },
    musicKey() { const it = this.zone === 'files' ? this.sec?.items[this.ii] : null; return it?.p ? 'p:' + it.p.name : null; },
    action(a) {
      if (this.zone === 'dirs') {
        if (a === 'up' || a === 'down' || a === 'lb' || a === 'rb') {
          const n = clamp(this.si + (a === 'up' ? -1 : a === 'down' ? 1 : a === 'lb' ? -5 : 5), 0, this.secs.length - 1);
          if (n === this.si) return S.play('error');
          this.si = n; this.fill(); this.paint(true);
        } else if (a === 'a' || a === 'right') this.enterDir();
        return;
      }
      if (a === 'up' || a === 'down' || a === 'lb' || a === 'rb') {
        const d = a === 'up' ? -1 : a === 'down' ? 1 : a === 'lb' ? -10 : 10;
        const j = clamp(this.ii + d, 0, this.sec.items.length - 1);
        if (j === this.ii) return S.play('error');
        this.idx[this.sec.key] = j; this.paint(true);
      } else if (a === 'a') this.run();
      else if (a === 'left') this.back();
    },
    frame(dt) {
      this.t += dt;
      root.classList.toggle('ds-blink', Math.floor(this.t * 2.5) % 2 === 0);
    },
    backdrop(g, W, H) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); },
  };
  return self;
}
