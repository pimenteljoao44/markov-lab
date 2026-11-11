// O plano: duas setas para arrastar (modo "Duas setas") ou uma consulta entre textos fixos (modo "Busca").
// O desenho é montado uma vez; arrastar só atualiza atributos, para o foco e o ponteiro não se perderem.
import { num } from '../../util.js';
import { DOCS } from '../engine.js';
import { LIMIT, snap } from '../state.js';

const SIZE = 480;
const C = SIZE / 2;
const U = 40; // pixels por unidade
const X = (x) => C + x * U;
const Y = (y) => C - y * U;
const HEAD = 13; // comprimento da ponta da seta
const ARC = 30; // raio do arco do ângulo

const VECTORS = {
  a: { label: 'A', mode: 'pair' },
  b: { label: 'B', mode: 'pair' },
  q: { label: 'Q', mode: 'search' },
};
const STEP = { plain: 0.1, shift: 0.5 };
const KEYS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };

const f = (n) => n.toFixed(1);
// Elementos SVG não têm a propriedade `hidden` (só os HTML têm): é preciso mexer no atributo.
const setHidden = (el, hidden) => el.toggleAttribute('hidden', hidden);

export class Plane {
  /** onMove(chave, [x, y]) é chamado com valores já arredondados e dentro do plano. */
  constructor(svg, { onMove }) {
    this.svg = svg;
    this.onMove = onMove;
    this.vecs = { a: [0, 0], b: [0, 0], q: [0, 0] };
    this.drag = null;
    this.build();
    this.bind();
  }

  build() {
    const lines = [];
    for (let i = -LIMIT; i <= LIMIT; i++) {
      const axis = i === 0 ? ' axis' : '';
      lines.push(`<line class="gl${axis}" x1="${X(i)}" y1="${Y(-LIMIT)}" x2="${X(i)}" y2="${Y(LIMIT)}"/>`);
      lines.push(`<line class="gl${axis}" x1="${X(-LIMIT)}" y1="${Y(i)}" x2="${X(LIMIT)}" y2="${Y(i)}"/>`);
      if (i !== 0) {
        lines.push(`<text class="tick" x="${X(i)}" y="${Y(0) + 14}">${i}</text>`);
        lines.push(`<text class="tick" x="${X(0) - 8}" y="${Y(i) + 4}" text-anchor="end">${i}</text>`);
      }
    }
    const docs = DOCS.map((doc, i) => `<g class="doc" data-doc="${i}" hidden>
        <title>${i + 1}. ${doc.text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title>
        <line class="dl" x1="${C}" y1="${C}" x2="${X(doc.v[0])}" y2="${Y(doc.v[1])}"/>
        <circle cx="${X(doc.v[0])}" cy="${Y(doc.v[1])}" r="11"/>
        <text x="${X(doc.v[0])}" y="${Y(doc.v[1]) + 4}" text-anchor="middle">${i + 1}</text></g>`).join('');
    const vector = (key) => `<g class="vec ${key}" data-vec="${key}" hidden>
        <path class="vline"/><polygon class="vhead"/>
        <g class="handle" data-handle="${key}" tabindex="0" role="button">
          <circle class="hit" r="26"/><circle class="tip" r="8"/><text class="vlabel" dy="-14">${VECTORS[key].label}</text>
        </g></g>`;
    this.svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
    this.svg.innerHTML = `${lines.join('')}
      <text class="ax" x="${X(LIMIT) - 4}" y="${Y(0) - 8}" text-anchor="end" data-axis="x"></text>
      <text class="ax" x="${X(0) + 8}" y="${Y(LIMIT) + 14}" data-axis="y"></text>
      <path class="arc" hidden/><text class="arc-label" hidden></text>
      ${docs}${vector('a')}${vector('b')}${vector('q')}`;
    this.el = {
      arc: this.svg.querySelector('.arc'),
      arcLabel: this.svg.querySelector('.arc-label'),
      docs: [...this.svg.querySelectorAll('.doc')],
    };
  }

  bind() {
    const { svg } = this;
    svg.addEventListener('pointerdown', (e) => {
      const handle = e.target.closest('[data-handle]');
      if (!handle) return;
      e.preventDefault();
      this.drag = handle.dataset.handle;
      try {
        svg.setPointerCapture(e.pointerId);
      } catch {
        /* ponteiro que já acabou ou sem suporte: o arrasto continua pelos eventos do próprio svg */
      }
      handle.focus({ preventScroll: true });
      this.moveTo(e);
    });
    svg.addEventListener('pointermove', (e) => {
      if (this.drag) this.moveTo(e);
    });
    const end = () => {
      this.drag = null;
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('keydown', (e) => {
      const handle = e.target.closest('[data-handle]');
      const dir = KEYS[e.key];
      if (!handle || !dir) return;
      e.preventDefault();
      const key = handle.dataset.handle;
      const step = e.shiftKey ? STEP.shift : STEP.plain;
      const [x, y] = this.vecs[key];
      this.onMove(key, [snap(x + dir[0] * step), snap(y + dir[1] * step)]);
    });
  }

  moveTo(e) {
    const r = this.svg.getBoundingClientRect();
    const x = (((e.clientX - r.left) / r.width) * SIZE - C) / U;
    const y = -(((e.clientY - r.top) / r.height) * SIZE - C) / U;
    this.onMove(this.drag, [snap(x), snap(y)]);
  }

  /** Ponta de seta: um triângulo na direção do vetor, só quando há comprimento para ele. */
  head(x, y) {
    const len = Math.hypot(x - C, y - C);
    if (len < HEAD + 4) return { points: '', line: `M${f(C)} ${f(C)}L${f(x)} ${f(y)}` };
    const ux = (x - C) / len;
    const uy = (y - C) / len;
    const bx = x - ux * HEAD;
    const by = y - uy * HEAD;
    const wx = -uy * 6;
    const wy = ux * 6;
    return { points: `${f(x)},${f(y)} ${f(bx + wx)},${f(by + wy)} ${f(bx - wx)},${f(by - wy)}`, line: `M${f(C)} ${f(C)}L${f(bx)} ${f(by)}` };
  }

  /** Arco entre A e B, pelo lado menor. O ângulo escrito é o mesmo que a ficha de medidas mostra. */
  drawArc(a, b, angle, active) {
    const { arc, arcLabel } = this.el;
    const show = active && Math.hypot(...a) > 0.3 && Math.hypot(...b) > 0.3 && angle > 1;
    setHidden(arc, !show);
    setHidden(arcLabel, !show);
    if (!show) return;
    const a1 = Math.atan2(a[1], a[0]);
    let diff = Math.atan2(b[1], b[0]) - a1;
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;
    const at = (ang, r) => [C + r * Math.cos(ang), C - r * Math.sin(ang)];
    const [x1, y1] = at(a1, ARC);
    const [x2, y2] = at(a1 + diff, ARC);
    arc.setAttribute('d', `M${f(x1)} ${f(y1)}A${ARC} ${ARC} 0 0 ${diff > 0 ? 0 : 1} ${f(x2)} ${f(y2)}`);
    const [lx, ly] = at(a1 + diff / 2, ARC + 20);
    arcLabel.setAttribute('x', f(lx));
    arcLabel.setAttribute('y', f(ly + 4));
    arcLabel.textContent = `${num(angle, 0)}°`;
  }

  update(s) {
    this.vecs = { a: s.a, b: s.b, q: s.q };
    const search = s.mode === 'search';
    this.svg.querySelector('[data-axis="x"]').textContent = search ? 'fiscal →' : 'x →';
    this.svg.querySelector('[data-axis="y"]').textContent = search ? '↑ cobrança' : '↑ y';
    for (const [key, spec] of Object.entries(VECTORS)) {
      const g = this.svg.querySelector(`[data-vec="${key}"]`);
      const off = spec.mode !== s.mode;
      setHidden(g, off);
      if (off) continue;
      const [vx, vy] = s[key];
      const x = X(vx);
      const y = Y(vy);
      const { points, line } = this.head(x, y);
      g.querySelector('.vline').setAttribute('d', line);
      g.querySelector('.vhead').setAttribute('points', points);
      g.querySelector('.handle').setAttribute('transform', `translate(${f(x)} ${f(y)})`);
      g.querySelector('.handle').setAttribute('aria-label', `Ponta da seta ${spec.label}: ${num(vx, 1)} para o lado e ${num(vy, 1)} para cima. Setas do teclado movem, com Shift movem mais.`);
    }
    this.drawArc(s.a, s.b, s.derived.pair.angle, !search);
    const best = s.derived.rank[0]?.index;
    this.el.docs.forEach((g, i) => {
      setHidden(g, !search);
      g.classList.toggle('best', search && i === best && !s.derived.queryZero);
    });
  }
}
