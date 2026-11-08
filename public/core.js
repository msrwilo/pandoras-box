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
function emit(action, source) {
  if (source === 'touch') document.body.classList.add('touch');
  else if (source !== inputMode) document.body.classList.remove('touch');
  inputMode = source;
  if (source !== 'touch') document.body.classList.add('no-cursor');
  for (const fn of listeners) { try { fn(action, source); } catch (e) { console.error(e); } }
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
  emit(a, 'key');
});
addEventListener('pointermove', e => { if (e.pointerType === 'mouse') document.body.classList.remove('no-cursor'); });
addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch') { document.body.classList.add('touch'); inputMode = 'touch'; }
  else document.body.classList.remove('no-cursor');
});

// Botones del mapeo estándar (Xbox, Switch Pro y los virtuales de Sunshine).
const BTN = { 0: 'a', 1: 'b', 2: 'x', 3: 'y', 4: 'lb', 5: 'rb', 6: 'lt', 7: 'rt', 8: 'view', 9: 'menu', 10: 'ls', 11: 'rs', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
const DIRS = new Set(['up', 'down', 'left', 'right']);
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
    p.buttons.forEach((b, i) => { if ((b.pressed || b.value > 0.6) && BTN[i]) pressed.add(BTN[i]); });
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
    if (!h) { held.set(a, { since: now, next: now + 380 }); emit(a, 'pad'); }
    else if (DIRS.has(a) || a === 'lb' || a === 'rb') {
      if (now >= h.next) {
        const t = now - h.since;
        h.next = now + (t > 1800 ? 45 : t > 900 ? 70 : 110); // acelera al mantener
        emit(a, 'pad');
      }
    }
  }
  for (const a of [...held.keys()]) if (!pressed.has(a)) held.delete(a);
}

// ---------- Arrastre 1:1 con velocidad ----------
// onStart() -> estado inicial; onMove(dx, dy); onEnd(vx, vy, moved)
export function draggable(el, { onStart, onMove, onEnd, axis = 'x' }) {
  let id = null, x0 = 0, y0 = 0, hist = [], moved = false;
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    id = e.pointerId; x0 = e.clientX; y0 = e.clientY; hist = [{ x: x0, y: y0, t: e.timeStamp }]; moved = false;
    onStart && onStart(e);
  });
  el.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (!moved && Math.hypot(dx, dy) > 10) { moved = true; el.setPointerCapture(id); }
    if (!moved) return;
    hist.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    if (hist.length > 6) hist.shift();
    onMove && onMove(axis === 'x' ? dx : dy, dy);
  });
  const end = e => {
    if (e.pointerId !== id) return;
    id = null;
    const a = hist[0], b = hist[hist.length - 1];
    const dt = Math.max(1, b.t - a.t) / 1000;
    const vx = moved ? (b.x - a.x) / dt : 0, vy = moved ? (b.y - a.y) / dt : 0;
    onEnd && onEnd(axis === 'x' ? vx : vy, vy, moved, e);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
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
