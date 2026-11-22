// Núcleo: resortes, bucle de animación, entrada (control, teclado, touch).

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Resorte con los dos parámetros de Apple: response (s) y damping ratio.
// Siempre anima desde el valor actual, así cualquier movimiento se puede interrumpir.
export class Spring {
  constructor(x = 0, { response = 0.4, damping = 1 } = {}) {
    this.x = x; this.v = 0; this.target = x; this.response = response; this.damping = damping;
  }
  set(t, velocity) { this.target = t; if (velocity !== undefined) this.v = velocity; }
  jump(x) { this.x = this.target = x; this.v = 0; }
  step(dt) {
    if (reducedMotion.matches) { this.x = this.target; this.v = 0; return; }
    const k = (2 * Math.PI / this.response) ** 2;
    const c = 4 * Math.PI * this.damping / this.response;
    const n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = -k * (this.x - this.target) - c * this.v;
      this.v += a * h; this.x += this.v * h;
    }
    if (Math.abs(this.x - this.target) < 1e-4 && Math.abs(this.v) < 1e-3) { this.x = this.target; this.v = 0; }
  }
  get settled() { return this.x === this.target && this.v === 0; }
}

// Proyección de inercia (la que usa Apple en Designing Fluid Interfaces).
export function project(velocity, rate = 0.998) {
  return (velocity / 1000) * rate / (1 - rate);
}
export function rubberband(over, dim, c = 0.55) {
  return (over * dim * c) / (dim + c * Math.abs(over));
}

// ---------- Bucle ----------
const tickers = new Set();
export function onFrame(fn) { tickers.add(fn); return () => tickers.delete(fn); }
let last = performance.now();
// Si una parte falla en un cuadro, el resto sigue: nunca se detiene el bucle (antes eso congelaba la app).
const failed = new WeakSet();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  try { pollGamepads(now); } catch (e) { console.error(e); }
  for (const fn of tickers) {
    try { fn(dt, now); } catch (e) { if (!failed.has(fn)) { failed.add(fn); console.error(e); } }
  }
}
requestAnimationFrame(loop);

export const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize);

// ---------- Entrada ----------
// Acciones: left right up down a b x y lb rb lt rt menu view
const listeners = new Set();
export function onAction(fn) { listeners.add(fn); return () => listeners.delete(fn); }
let inputMode = 'pad';
function emit(action, source, rep = false) {
  if (source === 'touch') document.body.classList.add('touch');
  else if (source !== inputMode) document.body.classList.remove('touch');
  inputMode = source;
  if (source !== 'touch') document.body.classList.add('no-cursor');
  for (const fn of listeners) { try { fn(action, source, rep); } catch (e) { console.error(e); } }
}
export const getInputMode = () => inputMode;

const KEYS = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  Enter: 'a', ' ': 'a', Escape: 'b', Backspace: 'b',
  x: 'x', X: 'x', y: 'y', Y: 'y', q: 'lb', Q: 'lb', e: 'rb', E: 'rb',
  PageUp: 'lt', PageDown: 'rt', m: 'menu', M: 'menu', Tab: 'menu', v: 'view', V: 'view', f: 'ls', F: 'ls', l: 'rs', L: 'rs',
};
// Mientras se escribe (búsqueda) las teclas van al texto; mientras se captura una combinación
// del control, la interfaz no recibe nada.
let textSink = null, capture = null, quiet = false;
export function setTextSink(fn) { textSink = fn; }
export function setCapture(fn) { capture = fn; held.clear(); if (!fn) quiet = true; }
addEventListener('keydown', e => {
  if (capture) { if (e.key === 'Escape') capture(null); e.preventDefault(); return; }
  const inInput = document.activeElement?.tagName === 'INPUT';
  if (inInput && e.key !== 'Enter' && e.key !== 'Escape' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
  if (textSink && !inInput && !e.ctrlKey && !e.altKey && !e.metaKey) {
    if (e.key.length === 1) { e.preventDefault(); textSink({ ch: e.key }); return; }
    if (e.key === 'Backspace') { e.preventDefault(); textSink({ del: true }); return; }
    if (e.key === 'Enter') { e.preventDefault(); textSink({ enter: true }); return; }
  }
  const a = KEYS[e.key];
  if (!a) return;
  e.preventDefault();
  if (inInput) document.activeElement.blur();
  emit(a, 'key', e.repeat);
});
addEventListener('pointermove', e => { if (e.pointerType === 'mouse') document.body.classList.remove('no-cursor'); });
addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch') { document.body.classList.add('touch'); inputMode = 'touch'; }
  else document.body.classList.remove('no-cursor');
});

// Botones del mapeo estándar (Xbox, Switch Pro y los virtuales de Sunshine).
const BTN = { 0: 'a', 1: 'b', 2: 'x', 3: 'y', 4: 'lb', 5: 'rb', 6: 'lt', 7: 'rt', 8: 'view', 9: 'menu', 10: 'ls', 11: 'rs', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
const DIRS = new Set(['up', 'down', 'left', 'right']);
// Distribución de botones: «xbox» (abajo = A) o «switch» (derecha = A, abajo = B; X e Y también cambian).
// Solo afecta a la navegación; al grabar una combinación se usan los botones físicos.
const SWAP = { a: 'b', b: 'a', x: 'y', y: 'x' };
let padLayout = 'xbox';
// Solo se reinicia el estado del control si la distribución cambió de verdad. Antes se reiniciaba con cada
// ajuste que se guardaba: el botón que seguía presionado contaba como pulsación nueva en cada cuadro y las
// opciones corrían solas.
export function setPadLayout(v) {
  const n = v === 'switch' ? 'switch' : 'xbox';
  if (n === padLayout) return;
  padLayout = n; held.clear(); quiet = true;
}
const held = new Map(); // acción -> {since, next}
export const sticks = { rx: 0, ry: 0 };
function pollGamepads(now) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const pressed = new Set();
  sticks.rx = 0; sticks.ry = 0;
  if (capture) {
    const raw = new Set();
    for (const p of pads) if (p && p.connected) p.buttons.forEach((b, i) => { if ((b.pressed || b.value > 0.6) && BTN[i]) raw.add(BTN[i]); });
    capture(raw, now);
    return;
  }
  for (const p of pads) {
    if (!p || !p.connected) continue;
    p.buttons.forEach((b, i) => { if ((b.pressed || b.value > 0.6) && BTN[i]) pressed.add(padLayout === 'switch' && SWAP[BTN[i]] || BTN[i]); });
    const [lx = 0, ly = 0, rx = 0, ry = 0] = p.axes;
    if (lx < -0.5) pressed.add('left'); if (lx > 0.5) pressed.add('right');
    if (ly < -0.5) pressed.add('up'); if (ly > 0.5) pressed.add('down');
    const dz = v => Math.abs(v) < 0.18 ? 0 : v;
    sticks.rx += dz(rx); sticks.ry += dz(ry);
  }
  // Tras capturar una combinación, nada cuenta hasta soltar todos los botones.
  if (quiet) { if (!pressed.size) quiet = false; return; }
  for (const a of pressed) {
    const h = held.get(a);
    // La siguiente repetición se cuenta desde que la interfaz terminó de responder: si un cambio tarda
    // (cambiar de acomodo, rearmar el inicio), no se acumulan pulsaciones ni salen varias de golpe.
    if (!h) { const n = { since: now, next: Infinity }; held.set(a, n); emit(a, 'pad'); n.next = performance.now() + 420; }
    else if (DIRS.has(a) || a === 'lb' || a === 'rb') {
      if (now >= h.next) {
        const t = now - h.since;
        h.next = Infinity;
        emit(a, 'pad', true);
        h.next = performance.now() + (t > 1800 ? 45 : t > 900 ? 70 : 110); // acelera al mantener
      }
    }
  }
  for (const a of [...held.keys()]) if (!pressed.has(a)) held.delete(a);
}

// ---------- Arrastre 1:1 con velocidad ----------
// onStart() -> estado inicial; onMove(dx, dy); onEnd(vx, vy, moved)
// Tres detalles para que el dedo se sienta pegado al contenido:
// - Al pasar el umbral (10 px) el contenido arranca desde 0, no da un salto de 10 px.
// - La velocidad sale solo de los últimos 100 ms: si el dedo se detiene antes de soltar, no hay lanzamiento.
// - Se leen los puntos intermedios del movimiento (getCoalescedEvents), así la velocidad es más fiel.
const SLOP = 10, VEL_WINDOW = 100;
// Tras un deslizamiento o un toque largo, el «clic» que el navegador manda al soltar no cuenta. Se ataja en
// la ventana porque lo que estaba bajo el dedo puede haberse redibujado (p. ej. al reordenar favoritos).
let swallowUntil = 0;
addEventListener('click', e => { if (performance.now() < swallowUntil) { e.stopPropagation(); e.preventDefault(); } }, true);
const swallowClick = (ms = 350) => { swallowUntil = performance.now() + ms; };
export function velocityOf(hist, tEnd) {
  const pts = hist.filter(p => tEnd - p.t <= VEL_WINDOW);
  if (pts.length < 2) return { vx: 0, vy: 0 };
  const a = pts[0], b = pts[pts.length - 1];
  // Un dedo quieto al final cuenta: la ventana llega hasta el momento de soltar.
  const dt = Math.max(16, tEnd - a.t) / 1000;
  return { vx: (b.x - a.x) / dt, vy: (b.y - a.y) / dt };
}
export function draggable(el, { onStart, onMove, onEnd, axis = 'x' }) {
  let id = null, x0 = 0, y0 = 0, hist = [], moved = false;
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0 || id !== null) return;
    id = e.pointerId; x0 = e.clientX; y0 = e.clientY; hist = [{ x: x0, y: y0, t: e.timeStamp }]; moved = false;
    onStart && onStart(e);
  });
  el.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return;
    let dx = e.clientX - x0, dy = e.clientY - y0;
    if (!moved) {
      const d = Math.hypot(dx, dy);
      if (d <= SLOP) return;
      moved = true;
      try { el.setPointerCapture(id); } catch {}
      // Se corre el origen para que el movimiento empiece en 0 justo al pasar el umbral.
      x0 += dx * SLOP / d; y0 += dy * SLOP / d;
      dx = e.clientX - x0; dy = e.clientY - y0;
    }
    const pts = e.getCoalescedEvents?.() || [];
    for (const p of (pts.length ? pts : [e])) hist.push({ x: p.clientX, y: p.clientY, t: p.timeStamp });
    if (hist.length > 40) hist.splice(0, hist.length - 40);
    onMove && onMove(axis === 'x' ? dx : dy, dy);
  });
  const end = e => {
    if (e.pointerId !== id) return;
    id = null;
    if (moved) swallowClick(); // tras arrastrar, el clic de soltar no abre lo que quedó bajo el dedo
    const { vx, vy } = moved && e.type === 'pointerup' ? velocityOf(hist, e.timeStamp) : { vx: 0, vy: 0 };
    onEnd && onEnd(axis === 'x' ? vx : vy, vy, moved, e);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

// ---------- Fila o rueda pegada al dedo (temas) ----------
// El contenido sigue al dedo 1:1 en un eje; al soltar sigue con inercia y se detiene en un elemento.
// Lo elegido cambia en vivo con lo que pasa por el centro, como con la flecha del control.
// - pos(): el Spring del tema, en unidades de elemento (0 = el primero).
// - pitch(): cuántos px mide un elemento en pantalla. axis: 'x' o 'y'.
// - count(): cuántos elementos hay. wrap: true si es una rueda sin principio ni fin.
// - index() / select(i, sonido): lo elegido según el tema; select debe apuntar pos a i (con set, no jump).
// - pass(i): al pasar por un elemento durante el lanzamiento (para el sonido de cada paso).
// - free: true si la fila se desplaza sin cambiar lo elegido (como el inicio de Switch); entonces al soltar
//   se llama settle(destino) en vez de select.
// - invert: true si lo que se mueve es una perilla que va con el dedo (dedo abajo = más), no contenido que se
//   arrastra (dedo abajo = menos). Para una perilla conviene maxFling: 0 (se queda donde se suelta).
// - paging: true para páginas completas (pitch = una página): un golpe corto pasa una página aunque el dedo
//   haya recorrido poco, como en la pantalla de inicio de un teléfono.
// El elemento queda marcado con data-own-touch: swipeActions deja ese eje a esta fila y sigue con el otro.
// Solo dedo o lápiz: con ratón y control todo sigue igual.
const FLING_RATE = 0.996, PAGE_FLICK = 250; // px/s a partir de los cuales un golpe pasa de página
export function dragRow(el, { pos, pitch, axis = 'x', count, index, select, pass, settle, wrap = false, free = false, active = () => true, maxFling = 12, invert = false, paging = false }) {
  const sgn = invert ? 1 : -1;
  el.dataset.ownTouch = axis;
  let id = null, x0 = 0, y0 = 0, start = 0, raw = 0, hist = [], state = null, flinging = false, lastPass = 0, stopped = false;
  const lim = v => {
    if (wrap) return v;
    const hi = Math.max(0, count() - 1);
    // Más allá de los extremos el contenido se resiste (banda elástica), como en iOS.
    if (v < 0) return -rubberband(-v, 3, 0.55);
    if (v > hi) return hi + rubberband(v - hi, 3, 0.55);
    return v;
  };
  const near = v => { const n = count(); const i = Math.round(v); return wrap ? ((i % n) + n) % n : clamp(i, 0, n - 1); };
  // Si se detuvo a medio camino, termina de llegar al elemento más cercano.
  const snap = () => {
    const s = pos(), t = near(s.x);
    if (!free && t !== index()) select(t, false);
    const r = wrap ? Math.round(s.x) : free ? clamp(Math.round(s.x), 0, Math.max(0, count() - 1)) : t;
    s.set(r);
    if (free) settle?.(r);
  };
  el.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || id !== null || !active() || !count()) return;
    id = e.pointerId; x0 = e.clientX; y0 = e.clientY; state = 'wait'; hist = [{ x: x0, y: y0, t: e.timeStamp }];
    flinging = false;
    // Tocar mientras se mueve lo detiene donde va, como en iOS.
    const s = pos(); stopped = !s.settled && Math.abs(s.v) > 0.5; start = raw = s.x; s.jump(s.x);
  });
  el.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return;
    let dx = e.clientX - x0, dy = e.clientY - y0;
    if (state === 'wait') {
      const d = Math.hypot(dx, dy);
      if (d <= SLOP) return;
      // Mismo criterio que swipeActions: el eje dominante decide. Si es el otro eje, esta fila no hace nada.
      const ax = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      if (ax !== axis) { state = 'off'; id = null; snap(); return; }
      state = 'drag';
      try { el.setPointerCapture(id); } catch {}
      x0 += dx * SLOP / d; y0 += dy * SLOP / d;
      dx = e.clientX - x0; dy = e.clientY - y0;
    }
    if (state !== 'drag') return;
    const pts = e.getCoalescedEvents?.() || [];
    for (const p of (pts.length ? pts : [e])) hist.push({ x: p.clientX, y: p.clientY, t: p.timeStamp });
    if (hist.length > 40) hist.splice(0, hist.length - 40);
    raw = lim(start + sgn * (axis === 'x' ? dx : dy) / pitch());
    const s = pos();
    if (!free) {
      const i = near(raw);
      if (i !== index()) select(i, true);
    }
    s.jump(raw); // después de select: lo que el tema haya apuntado se reemplaza por la posición del dedo
  });
  const end = e => {
    if (e.pointerId !== id) return;
    id = null;
    if (state !== 'drag') {
      // Un toque que detuvo la fila en movimiento solo la detiene: no abre ni elige lo que hay bajo el dedo.
      if (state === 'wait') { if (stopped) swallowClick(); if (pos().x !== Math.round(pos().x) || stopped) snap(); }
      state = null; return;
    }
    state = null;
    swallowClick();
    const vel = e.type === 'pointerup' ? velocityOf(hist, e.timeStamp) : { vx: 0, vy: 0 };
    const v = sgn * (axis === 'x' ? vel.vx : vel.vy) / pitch(); // en elementos por segundo
    let target;
    if (paging) target = Math.abs(v * pitch()) > PAGE_FLICK ? (v > 0 ? Math.floor(raw) + 1 : Math.ceil(raw) - 1) : Math.round(raw);
    else {
      let dist = project(v * pitch(), FLING_RATE) / pitch();
      dist = Math.max(-maxFling, Math.min(maxFling, dist));
      target = Math.round(raw + dist);
    }
    if (!wrap) target = clamp(target, 0, Math.max(0, count() - 1));
    const s = pos();
    // Si se soltó fuera del extremo, regresa sin impulso hacia afuera.
    s.v = (!wrap && (raw < 0 || raw > count() - 1)) ? 0 : v;
    lastPass = near(s.x); flinging = Math.round(s.x) !== target;
    if (free) { s.set(target); settle?.(target); return; }
    const t = wrap ? near(target) : target;
    if (t !== index()) select(t, false);
    // select apunta a i (0…n-1); en una rueda el destino puede estar a vueltas de distancia.
    s.set(wrap ? target : t);
  };
  // En la ventana: si el elemento se rehízo a media gesto, el soltar igual se recibe y la fila no se queda trabada.
  addEventListener('pointerup', end, true);
  addEventListener('pointercancel', end, true);
  // Durante el lanzamiento, cada elemento que pasa por el centro suena (se siente el peso).
  // Si el tema rehízo su inicio, esta fila ya no está en la página: se deja de vigilar.
  const off = onFrame(() => {
    if (!el.isConnected) { off(); removeEventListener('pointerup', end, true); removeEventListener('pointercancel', end, true); return; }
    if (!flinging) return;
    const s = pos(), i = near(s.x);
    if (i !== lastPass) { lastPass = i; pass?.(i); }
    if (s.settled || Math.abs(s.x - s.target) < 0.02) flinging = false;
  });
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- Gestos para los temas que solo entienden acciones ----------
// Un dedo que se desliza se traduce en acciones del control: una cada `step` px mientras se arrastra
// (el contenido sigue al dedo paso a paso) y, al soltar con impulso, unas cuantas más espaciadas en el tiempo.
// El dedo hacia la izquierda pide «right» (lo de la derecha viene hacia el centro), hacia arriba pide «down».
// Solo responde al dedo (o lápiz); el ratón y el control siguen igual.
export function press(action, rep = false) { emit(action, 'touch', rep); }
// allow(acción): si devuelve false, ese paso no se da con el dedo (p. ej. «derecha» que entraría a una sección).
// once: true para un solo paso por deslizamiento, por largo que sea (pasar de video, de imagen o de página).
export function swipeActions(el, { step = () => 80, active = () => true, maxFling = 6, allow = () => true, once = false } = {}) {
  let id = null, x0 = 0, y0 = 0, axis = null, done = 0, hist = [], timers = [];
  const cancelFling = () => { timers.forEach(clearTimeout); timers = []; };
  el.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || id !== null || !active()) return;
    cancelFling();
    id = e.pointerId; x0 = e.clientX; y0 = e.clientY; axis = null; done = 0; hist = [{ x: x0, y: y0, t: e.timeStamp }];
  }, true);
  el.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return;
    let dx = e.clientX - x0, dy = e.clientY - y0;
    if (!axis) {
      const d = Math.hypot(dx, dy);
      if (d <= SLOP) return;
      axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      // Una fila con su propio arrastre (dragRow) se queda con su eje; aquí solo se atiende el otro.
      // Se usa la ruta del evento: si la fila ya rehízo sus elementos, el que estaba bajo el dedo ya no está en la página.
      if (e.composedPath().some(n => n.dataset?.ownTouch === axis)) { id = null; axis = null; return; }
      try { el.setPointerCapture(id); } catch {}
      x0 += dx * SLOP / d; y0 += dy * SLOP / d;
      dx = e.clientX - x0; dy = e.clientY - y0;
    }
    hist.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    if (hist.length > 40) hist.splice(0, hist.length - 40);
    const d = axis === 'x' ? dx : dy, s = step(axis);
    // Un poco de histéresis: el primer paso sale a media distancia, para que responda pronto.
    let want = Math.trunc((Math.abs(d) + s / 2) / s) * Math.sign(d);
    if (once) { if (done) return; want = Math.max(-1, Math.min(1, want)); }
    // Si un paso abrió otra pantalla (p. ej. una lista), el resto del arrastre ya no cuenta.
    while (done !== want && active()) {
      const dir = want > done ? 1 : -1;
      done += dir;
      const a = axis === 'x' ? (dir > 0 ? 'left' : 'right') : (dir > 0 ? 'up' : 'down');
      if (allow(a)) press(a, Math.abs(done) > 1);
    }
  });
  const end = e => {
    if (e.pointerId !== id) return;
    id = null;
    if (!axis) return;
    swallowClick();
    if (e.type !== 'pointerup') return;
    const { vx, vy } = velocityOf(hist, e.timeStamp);
    const v = axis === 'x' ? vx : vy;
    const extra = Math.min(maxFling, Math.trunc(Math.abs(project(v, 0.99)) / step(axis)));
    // Solo se lanza en la misma dirección en que se venía arrastrando.
    if (!extra || Math.sign(v) !== Math.sign(done || v)) return;
    const a = axis === 'x' ? (v > 0 ? 'left' : 'right') : (v > 0 ? 'up' : 'down');
    for (let i = 0; i < extra; i++) timers.push(setTimeout(() => { if (active() && allow(a)) press(a, true); else cancelFling(); }, 60 + i * (55 + i * 12)));
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

// ---------- Toque largo ----------
// fn() al dejar el dedo quieto `ms` milisegundos. Se anula si el dedo se mueve; el clic que sigue no cuenta.
export function longPress(el, fn, ms = 480) {
  let t = null, x0 = 0, y0 = 0, id = null, fired = false;
  // Se escucha en la ventana: si al cumplirse el toque largo el elemento se redibuja, el dedo se suelta en otro.
  const move = e => { if (e.pointerId === id && t && Math.hypot(e.clientX - x0, e.clientY - y0) > SLOP) { clearTimeout(t); t = null; } };
  const up = e => {
    if (e.pointerId !== id) return;
    clearTimeout(t); if (fired) swallowClick(); // ya se cumplió: el clic de soltar no cuenta
    t = null; id = null; fired = false;
    removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
  };
  el.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || id !== null) return;
    id = e.pointerId; x0 = e.clientX; y0 = e.clientY;
    t = setTimeout(() => { t = null; fired = true; swallowClick(5000); fn(); }, ms);
    addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  });
  el.addEventListener('contextmenu', e => e.preventDefault());
}

export const $ = (s, r = document) => r.querySelector(s);
export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) el.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) el.append(c);
  return el;
}
