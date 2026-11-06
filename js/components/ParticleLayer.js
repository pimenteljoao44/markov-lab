// Bolinhas (Canvas 2D) que percorrem as mesmas curvas das setas.
// Com muitas bolinhas, elas "mergulham" no pote ao chegar: quem mostra a contagem é o nível do líquido.
import { bezierPoint, bezierTangent, startOf, endOf, NODE_R } from './geometry.js';
import { REST } from './ParticleEngine.js';

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const CROWD = 25; // acima disso, bolinhas em repouso ficam "dentro do líquido"

export class ParticleLayer {
  constructor(canvas, wrap, graph) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.graph = graph;
    this.wrap = wrap;
    this.sprites = new Map();
    this.trail = [];
    this.alpha = 0;
    new ResizeObserver(() => this.resize()).observe(wrap);
    this.resize();
  }

  resize() {
    const r = this.wrap.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(r.width * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
  }

  /** Bolinha de gude: cor chapada, contorno de tinta e um ponto de brilho. */
  sprite(color) {
    let s = this.sprites.get(color);
    if (s) return s;
    const size = 48;
    s = document.createElement('canvas');
    s.width = s.height = size;
    const c = s.getContext('2d');
    const m = size / 2;
    c.beginPath();
    c.arc(m, m, m - 3, 0, Math.PI * 2);
    c.fillStyle = color;
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = 'rgba(31,42,68,0.55)';
    c.stroke();
    c.beginPath();
    c.arc(m - 7, m - 7, 5.5, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.fill();
    this.sprites.set(color, s);
    return s;
  }

  clear() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.trail = [];
    this.alpha = 0;
  }

  /** Posição e opacidade da bolinha p no instante `progress` do ciclo. Retorna a opacidade (0 = não desenhar). */
  position(engine, p, progress, out, crowd) {
    const nodes = this.graph.nodes;
    const a = engine.cur[p];
    const A = nodes[a];
    if (!A) return 0;
    const cr = NODE_R * 0.58 * engine.rad[p];
    const ang = engine.ang[p];
    const ca = [A.x + Math.cos(ang) * cr, A.y + Math.sin(ang) * cr];
    if (!engine.moving || progress < REST) {
      out[0] = ca[0];
      out[1] = ca[1];
      return crowd ? 0 : 1;
    }
    const b = engine.next[p];
    const B = nodes[b];
    const g = this.graph.geom(a, b);
    if (!B || !g) return 0;
    // Quem foi absorvido fica no pote: não há o que mostrar andando em círculos.
    if (crowd && a === b && this.graph.P[a]?.[a] >= 0.999) return 0;
    const u = (progress - REST) / (1 - REST);
    const local = Math.min(1, Math.max(0, (u - engine.delay[p]) / 0.65));
    const e = easeInOut(local);
    const cb = [B.x + Math.cos(ang) * cr, B.y + Math.sin(ang) * cr];
    let pt;
    let alpha = 1;
    if (e < 0.1) {
      pt = lerp(ca, startOf(g), e / 0.1);
      if (crowd) alpha = e / 0.1;
    } else if (e > 0.9) {
      pt = lerp(endOf(g), cb, (e - 0.9) / 0.1);
      if (crowd) alpha = (1 - e) / 0.1;
    } else {
      const t = (e - 0.1) / 0.8;
      pt = bezierPoint(g, t);
      const [tx, ty] = bezierTangent(g, t);
      const amp = engine.jit[p] * 5 * Math.sin(Math.PI * t);
      pt[0] += -ty * amp;
      pt[1] += tx * amp;
    }
    if (crowd && local === 0) alpha = 0;
    out[0] = pt[0];
    out[1] = pt[1];
    return alpha;
  }

  draw(engine, progress, visible) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!visible || !engine.count) return;
    this.alpha = Math.min(1, this.alpha + 0.08);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const nodes = this.graph.nodes;
    const n = engine.count;
    const crowd = n > CROWD;
    const size = n <= 1 ? 22 : n <= 10 ? 16 : n <= 60 ? 12 : n <= 400 ? 9 : 7;
    const pos = [0, 0];

    // Modo viajante: o rastro desbota — a cadeia não lembra por onde passou.
    if (n <= 3) {
      if (this.position(engine, 0, progress, pos, false)) {
        this.trail.push([pos[0], pos[1]]);
        if (this.trail.length > 60) this.trail.shift();
      }
      ctx.fillStyle = '#1f2a44';
      for (let k = 0; k < this.trail.length; k += 3) {
        const t = k / this.trail.length;
        ctx.globalAlpha = this.alpha * t * 0.35;
        ctx.beginPath();
        ctx.arc(this.trail[k][0], this.trail[k][1], 1.5 + 2 * t, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let p = 0; p < n; p++) {
      const a = this.position(engine, p, progress, pos, crowd);
      if (a <= 0.01) continue;
      ctx.globalAlpha = this.alpha * a;
      const col = nodes[engine.cur[p]]?.st.color || '#1f2a44';
      ctx.drawImage(this.sprite(col), pos[0] - size / 2, pos[1] - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  }
}
