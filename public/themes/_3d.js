// Motor 3D mínimo para los fondos de los temas: mallas de polígonos, cámara con perspectiva,
// orden por profundidad (pintor), luz plana por cara y niebla. Suficiente para el look de fines de los 90.
export const V = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
};
// Rotación (yaw, pitch, roll) + escala + posición.
export function transform(p, { rx = 0, ry = 0, rz = 0, s = 1, x = 0, y = 0, z = 0 } = {}) {
  let [a, b, c] = [p[0] * s, p[1] * s, p[2] * s];
  let cs = Math.cos(rz), sn = Math.sin(rz); [a, b] = [a * cs - b * sn, a * sn + b * cs];
  cs = Math.cos(rx); sn = Math.sin(rx); [b, c] = [b * cs - c * sn, b * sn + c * cs];
  cs = Math.cos(ry); sn = Math.sin(ry); [a, c] = [a * cs + c * sn, -a * sn + c * cs];
  return [a + x, b + y, c + z];
}
// Cámara: posición, giro horizontal (yaw) y vertical (pitch); devuelve coordenadas de cámara.
export function camera({ x = 0, y = 0, z = 0, yaw = 0, pitch = 0, fov = 1.1 }) {
  const cy = Math.cos(-yaw), sy = Math.sin(-yaw), cp = Math.cos(-pitch), sp = Math.sin(-pitch);
  return {
    fov,
    view(p) {
      let a = p[0] - x, b = p[1] - y, c = p[2] - z;
      [a, c] = [a * cy + c * sy, -a * sy + c * cy];
      [b, c] = [b * cp - c * sp, b * sp + c * cp];
      return [a, b, c];
    },
  };
}
// Cola de polígonos: se agregan todos y luego se pintan de atrás hacia adelante.
export function scene() {
  const polys = [];
  return {
    add(pts, color, opts = {}) { polys.push({ pts, color, ...opts }); },
    draw(g, W, H, cam, { light = V.norm([0.4, 0.8, -0.5]), fog = null, near = 0.1, ambient = 0.35 } = {}) {
      const f = (H / 2) / Math.tan(cam.fov / 2), cx = W / 2, cyy = H / 2;
      const out = [];
      for (const p of polys) {
        const vs = p.pts.map(q => cam.view(q));
        if (vs.some(v => v[2] < near)) continue;
        const n = V.norm(V.cross(V.sub(vs[1], vs[0]), V.sub(vs[2], vs[0])));
        const center = vs.reduce((m, v) => [m[0] + v[0], m[1] + v[1], m[2] + v[2]], [0, 0, 0]).map(k => k / vs.length);
        if (!p.twoSided && V.dot(n, center) > 0) continue; // cara de espaldas
        const depth = Math.max(...vs.map(v => v[2]));
        out.push({ p, vs, n, depth, z: center[2] });
      }
      out.sort((a, b) => b.depth - a.depth);
      for (const o of out) {
        const { p } = o;
        const lam = p.unlit ? 1 : ambient + (1 - ambient) * Math.max(0, -V.dot(o.n, light));
        let [r, gg, b] = p.color;
        r *= lam; gg *= lam; b *= lam;
        if (fog) { const k = Math.min(1, Math.max(0, (o.z - fog.near) / (fog.far - fog.near))); r += (fog.color[0] - r) * k; gg += (fog.color[1] - gg) * k; b += (fog.color[2] - b) * k; }
        g.beginPath();
        o.vs.forEach((v, i) => { const sx = cx + v[0] * f / v[2], sy = cyy - v[1] * f / v[2]; i ? g.lineTo(sx, sy) : g.moveTo(sx, sy); });
        g.closePath();
        const a = p.alpha ?? 1;
        if (p.fill !== false) { g.fillStyle = `rgba(${r | 0},${gg | 0},${b | 0},${a})`; g.fill(); }
        if (p.stroke) { g.strokeStyle = p.stroke; g.lineWidth = p.lineWidth || 1; g.stroke(); }
      }
      return out.length;
    },
  };
}
// Mallas.
export function box(w = 1, h = 1, d = 1) {
  const x = w / 2, y = h / 2, z = d / 2;
  const v = [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]];
  const f = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 4, 7, 3], [1, 2, 6, 5], [3, 7, 6, 2], [0, 1, 5, 4]];
  return { v, f };
}
export function icosahedron(r = 1) {
  const t = (1 + Math.sqrt(5)) / 2;
  const v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]
    .map(p => V.norm(p).map(k => k * r));
  const f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  return { v, f };
}
// Agrega una malla a la escena con su transformación; color por cara (función o arreglo).
export function addMesh(sc, mesh, tr, color, opts = {}) {
  const pts = mesh.v.map(p => transform(p, tr));
  mesh.f.forEach((face, i) => sc.add(face.map(k => pts[k]), typeof color === 'function' ? color(i) : color, opts));
}
