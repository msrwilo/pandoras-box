// Filtro CRT para los videos: el mismo «crt-lottes» de RetroArch (Timothy Lottes, dominio público),
// con sus valores de fábrica, dibujado con WebGL en un lienzo que va encima del <video>.
// El video se trata como una imagen de 240 líneas, igual que lo que sale de una consola 2D.
const VS = 'attribute vec2 p; varying vec2 uv; void main(){ uv = p * .5 + .5; uv.y = 1. - uv.y; gl_Position = vec4(p, 0., 1.); }';
const FS = `precision highp float;
uniform sampler2D tex; uniform vec2 res; uniform vec2 fitScale; varying vec2 uv;
const float hardScan = -8.0, hardPix = -3.0, warpX = 0.031, warpY = 0.041, maskDark = 0.5, maskLight = 1.5;
const float brightBoost = 1.0, hardBloomPix = -1.5, hardBloomScan = -2.0, bloomAmount = 0.15, shape = 2.0;
float ToLinear1(float c) { return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4); }
vec3 ToLinear(vec3 c) { return vec3(ToLinear1(c.r), ToLinear1(c.g), ToLinear1(c.b)); }
float ToSrgb1(float c) { return c < 0.0031308 ? c * 12.92 : 1.055 * pow(c, 0.41666) - 0.055; }
vec3 ToSrgb(vec3 c) { return vec3(ToSrgb1(c.r), ToSrgb1(c.g), ToSrgb1(c.b)); }
vec3 Fetch(vec2 pos, vec2 off) { pos = (floor(pos * res + off) + vec2(0.5)) / res; return ToLinear(brightBoost * texture2D(tex, pos).rgb); }
vec2 Dist(vec2 pos) { pos = pos * res; return -((pos - floor(pos)) - vec2(0.5)); }
float Gaus(float pos, float scale) { return exp2(scale * pow(abs(pos), shape)); }
vec3 Horz3(vec2 pos, float off) {
  vec3 b = Fetch(pos, vec2(-1.0, off)), c = Fetch(pos, vec2(0.0, off)), d = Fetch(pos, vec2(1.0, off));
  float dst = Dist(pos).x, wb = Gaus(dst - 1.0, hardPix), wc = Gaus(dst, hardPix), wd = Gaus(dst + 1.0, hardPix);
  return (b * wb + c * wc + d * wd) / (wb + wc + wd); }
vec3 Horz5(vec2 pos, float off) {
  vec3 a = Fetch(pos, vec2(-2.0, off)), b = Fetch(pos, vec2(-1.0, off)), c = Fetch(pos, vec2(0.0, off)), d = Fetch(pos, vec2(1.0, off)), e = Fetch(pos, vec2(2.0, off));
  float dst = Dist(pos).x, wa = Gaus(dst - 2.0, hardPix), wb = Gaus(dst - 1.0, hardPix), wc = Gaus(dst, hardPix), wd = Gaus(dst + 1.0, hardPix), we = Gaus(dst + 2.0, hardPix);
  return (a * wa + b * wb + c * wc + d * wd + e * we) / (wa + wb + wc + wd + we); }
vec3 Horz7(vec2 pos, float off) {
  vec3 a = Fetch(pos, vec2(-3.0, off)), b = Fetch(pos, vec2(-2.0, off)), c = Fetch(pos, vec2(-1.0, off)), d = Fetch(pos, vec2(0.0, off)), e = Fetch(pos, vec2(1.0, off)), f = Fetch(pos, vec2(2.0, off)), g = Fetch(pos, vec2(3.0, off));
  float dst = Dist(pos).x, wa = Gaus(dst - 3.0, hardBloomPix), wb = Gaus(dst - 2.0, hardBloomPix), wc = Gaus(dst - 1.0, hardBloomPix), wd = Gaus(dst, hardBloomPix), we = Gaus(dst + 1.0, hardBloomPix), wf = Gaus(dst + 2.0, hardBloomPix), wg = Gaus(dst + 3.0, hardBloomPix);
  return (a * wa + b * wb + c * wc + d * wd + e * we + f * wf + g * wg) / (wa + wb + wc + wd + we + wf + wg); }
float Scan(vec2 pos, float off) { return Gaus(Dist(pos).y + off, hardScan); }
float BloomScan(vec2 pos, float off) { return Gaus(Dist(pos).y + off, hardBloomScan); }
vec3 Tri(vec2 pos) { return Horz3(pos, -1.0) * Scan(pos, -1.0) + Horz5(pos, 0.0) * Scan(pos, 0.0) + Horz3(pos, 1.0) * Scan(pos, 1.0); }
vec3 Bloom(vec2 pos) {
  return Horz5(pos, -2.0) * BloomScan(pos, -2.0) + Horz7(pos, -1.0) * BloomScan(pos, -1.0) + Horz7(pos, 0.0) * BloomScan(pos, 0.0)
    + Horz7(pos, 1.0) * BloomScan(pos, 1.0) + Horz5(pos, 2.0) * BloomScan(pos, 2.0); }
vec2 Warp(vec2 pos) { pos = pos * 2.0 - 1.0; pos *= vec2(1.0 + (pos.y * pos.y) * warpX, 1.0 + (pos.x * pos.x) * warpY); return pos * 0.5 + 0.5; }
vec3 Mask(vec2 pos) {
  pos.x += pos.y * 3.0; vec3 mask = vec3(maskDark); pos.x = fract(pos.x / 6.0);
  if (pos.x < 0.333) mask.r = maskLight; else if (pos.x < 0.666) mask.g = maskLight; else mask.b = maskLight;
  return mask; }
void main() {
  vec2 pos = Warp((uv - 0.5) * fitScale + 0.5);
  if (pos.x < 0.0 || pos.x > 1.0 || pos.y < 0.0 || pos.y > 1.0) { gl_FragColor = vec4(0.0); return; }
  vec3 c = Tri(pos) + Bloom(pos) * bloomAmount;
  c *= Mask(gl_FragCoord.xy * 1.000001);
  gl_FragColor = vec4(ToSrgb(c), 1.0);
}`;

function setup(canvas) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  return { gl, res: gl.getUniformLocation(pr, 'res'), fit: gl.getUniformLocation(pr, 'fitScale') };
}

const items = new Map(); // video -> { canvas, ctx, on, want }
let failed = false;

// attach(video, quiere): «quiere» es una función que dice, en cada momento, si ese video lleva el filtro.
export function attach(video, want) {
  if (items.has(video)) { items.get(video).want = want; return; }
  const canvas = document.createElement('canvas'); canvas.className = 'crt-canvas'; canvas.hidden = true;
  video.after(canvas);
  items.set(video, { canvas, ctx: null, want, on: false });
}
export function detach(video) { const it = items.get(video); if (it) { it.canvas.remove(); video.classList.remove('crt-src'); items.delete(video); } }

// Vigila el documento: cualquier <video> que exista o aparezca recibe el filtro si quiere(video) lo pide.
export function watchAll(want) {
  const add = v => attach(v, () => want(v));
  const scan = n => { if (n.nodeType !== 1) return; if (n.tagName === 'VIDEO') add(n); else n.querySelectorAll?.('video').forEach(add); };
  scan(document.documentElement);
  new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(scan); }).observe(document.documentElement, { childList: true, subtree: true });
}

// Se llama en cada cuadro de la interfaz.
export function frame() {
  if (failed) return;
  for (const [video, it] of items) {
    if (!video.isConnected) { detach(video); continue; }
    if (it.canvas.previousSibling !== video) video.after(it.canvas); // el tema movió el video: el lienzo lo sigue
    const on = !!it.want() && video.readyState >= 2 && video.videoWidth > 0;
    if (on !== it.on) { it.on = on; it.canvas.hidden = !on; video.classList.toggle('crt-src', on); it.last = -1; }
    if (!on) continue;
    try {
      if (!it.ctx) it.ctx = setup(it.canvas);
      if (!it.ctx) { failed = true; it.canvas.hidden = true; video.classList.remove('crt-src'); return; }
      const cs = getComputedStyle(video), c = it.canvas, { gl } = it.ctx;
      // El lienzo copia la opacidad y los filtros del video, que queda oculto debajo.
      if (c.style.opacity !== cs.opacity) c.style.opacity = cs.opacity;
      if (c.dataset.f !== cs.filter) { c.dataset.f = cs.filter; c.style.filter = cs.filter === 'none' ? '' : cs.filter; }
      // …y su lugar exacto: cada tema coloca su video a su manera (marco, esquinas, giro, capa).
      const geo = `${video.offsetLeft}|${video.offsetTop}|${video.offsetWidth}|${video.offsetHeight}|${cs.borderRadius}|${cs.transform}|${cs.transformOrigin}|${cs.zIndex}|${cs.visibility}|${cs.display}`;
      if (c.dataset.g !== geo) {
        c.dataset.g = geo;
        Object.assign(c.style, { left: video.offsetLeft + 'px', top: video.offsetTop + 'px', width: video.offsetWidth + 'px', height: video.offsetHeight + 'px',
          borderRadius: cs.borderRadius, transform: cs.transform === 'none' ? '' : cs.transform, transformOrigin: cs.transformOrigin,
          zIndex: cs.zIndex === 'auto' ? '' : cs.zIndex, visibility: cs.visibility, display: cs.display === 'none' ? 'none' : '' });
      }
      const bw = video.clientWidth, bh = video.clientHeight; if (!bw || !bh) continue;
      const k = Math.min(devicePixelRatio || 1, 1920 / bw), W = Math.round(bw * k), H = Math.round(bh * k);
      const sized = c.width !== W || c.height !== H;
      if (sized) { c.width = W; c.height = H; gl.viewport(0, 0, W, H); }
      if (!sized && video.currentTime === it.last && it.fit === cs.objectFit) continue; // mismo cuadro del video
      it.last = video.currentTime; it.fit = cs.objectFit;
      const va = video.videoWidth / video.videoHeight, ba = bw / bh;
      // contain: el video cabe entero (sobran franjas); cover: llena la caja (se recorta).
      const contain = cs.objectFit === 'contain';
      const sx = (contain ? ba > va : ba < va) ? ba / va : 1, sy = (contain ? ba > va : ba < va) ? 1 : va / ba;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
      gl.uniform2f(it.ctx.res, Math.round(240 * va), 240);
      gl.uniform2f(it.ctx.fit, sx, sy);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } catch (e) { failed = true; console.warn('Filtro CRT desactivado:', e.message); for (const [v, x] of items) { x.canvas.hidden = true; v.classList.remove('crt-src'); } return; }
  }
}
