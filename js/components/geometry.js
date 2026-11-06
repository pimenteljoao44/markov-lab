// Geometria compartilhada entre o SVG (setas) e o Canvas (partículas):
// as partículas percorrem exatamente a mesma curva desenhada.

export const NODE_R = 40;

export function bezierPoint(g, t) {
  const u = 1 - t;
  if (g.type === 'q') {
    return [
      u * u * g.p0[0] + 2 * u * t * g.c[0] + t * t * g.p2[0],
      u * u * g.p0[1] + 2 * u * t * g.c[1] + t * t * g.p2[1],
    ];
  }
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [
    a * g.p0[0] + b * g.c1[0] + c * g.c2[0] + d * g.p3[0],
    a * g.p0[1] + b * g.c1[1] + c * g.c2[1] + d * g.p3[1],
  ];
}

export function bezierTangent(g, t) {
  const u = 1 - t;
  let x, y;
  if (g.type === 'q') {
    x = 2 * u * (g.c[0] - g.p0[0]) + 2 * t * (g.p2[0] - g.c[0]);
    y = 2 * u * (g.c[1] - g.p0[1]) + 2 * t * (g.p2[1] - g.c[1]);
  } else {
    x = 3 * u * u * (g.c1[0] - g.p0[0]) + 6 * u * t * (g.c2[0] - g.c1[0]) + 3 * t * t * (g.p3[0] - g.c2[0]);
    y = 3 * u * u * (g.c1[1] - g.p0[1]) + 6 * u * t * (g.c2[1] - g.c1[1]) + 3 * t * t * (g.p3[1] - g.c2[1]);
  }
  const L = Math.hypot(x, y) || 1;
  return [x / L, y / L];
}

export const startOf = (g) => g.p0;
export const endOf = (g) => (g.type === 'q' ? g.p2 : g.p3);

const unit = (dx, dy) => {
  const L = Math.hypot(dx, dy) || 1;
  return [dx / L, dy / L];
};

/**
 * Curva entre o nó a e o nó b.
 * - i ≠ j: Bézier quadrática; curva para a "direita" do sentido quando existe a seta reversa.
 * - i = j: self-loop cúbico apontando para fora do centróide do grafo.
 */
export function edgeGeometry(a, b, isLoop, hasReverse, centroid, R = NODE_R) {
  if (isLoop) {
    let [dx, dy] = [a.x - centroid[0], a.y - centroid[1]];
    if (Math.hypot(dx, dy) < 1) [dx, dy] = [0, -1];
    let ang = Math.atan2(dy, dx);
    if (ang > Math.PI / 5 && ang < (4 * Math.PI) / 5) ang = dx >= 0 ? Math.PI / 8 : (7 * Math.PI) / 8;
    const s = 0.42, w = 0.62, far = R * 2.45;
    const at = (r, t) => [a.x + r * Math.cos(t), a.y + r * Math.sin(t)];
    return { type: 'c', p0: at(R + 2, ang - s), c1: at(far, ang - w), c2: at(far, ang + w), p3: at(R + 4, ang + s) };
  }
  const dx = b.x - a.x, dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const bend = hasReverse ? Math.min(Math.max(0.2 * L, 22), 70) : 0;
  const c = [(a.x + b.x) / 2 + nx * bend, (a.y + b.y) / 2 + ny * bend];
  const ua = unit(c[0] - a.x, c[1] - a.y);
  const ub = unit(c[0] - b.x, c[1] - b.y);
  return {
    type: 'q',
    p0: [a.x + ua[0] * (R + 2), a.y + ua[1] * (R + 2)],
    c,
    p2: [b.x + ub[0] * (R + 4), b.y + ub[1] * (R + 4)],
  };
}

const f = (p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;

/** Path SVG; `trim` recua o final (para a ponta da seta não ser invadida pelo traço). */
export function pathString(g, trim = 0) {
  if (g.type === 'q') {
    const tan = bezierTangent(g, 1);
    const end = [g.p2[0] - tan[0] * trim, g.p2[1] - tan[1] * trim];
    return `M${f(g.p0)}Q${f(g.c)} ${f(end)}`;
  }
  const tan = bezierTangent(g, 1);
  const end = [g.p3[0] - tan[0] * trim, g.p3[1] - tan[1] * trim];
  return `M${f(g.p0)}C${f(g.c1)} ${f(g.c2)} ${f(end)}`;
}

export function arrowString(g, size) {
  const tip = endOf(g);
  const [ux, uy] = bezierTangent(g, 1);
  const bx = tip[0] - ux * size * 1.25, by = tip[1] - uy * size * 1.25;
  const px = -uy * size * 0.62, py = ux * size * 0.62;
  return `M${f(tip)}L${f([bx + px, by + py])}L${f([bx - px, by - py])}Z`;
}
