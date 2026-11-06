// Diagrama da cadeia (SVG + D3). Cada estado é um POTE: o nível do líquido é a fração
// das bolinhas que estão nele e a linha tracejada marca o equilíbrio π.
import d3 from '../../vendor/d3/index.js';
import { subscribe, actions, getState } from '../store.js';
import { fmtP, clamp, num } from '../util.js';
import { EPS } from '../math/analyze.js';
import { NODE_R, edgeGeometry, pathString, arrowString, bezierPoint, bezierTangent } from './geometry.js';
import { isPiHidden } from '../challenges/definitions.js';
import { LEVELS } from '../levels/index.js';
import { explain } from '../coach/api.js';

const MARGIN = 104;
const R = NODE_R;
const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
const KEY_MOVE = 0.03;
const WAVE_L = R * 0.9;
let clipSeq = 0;

/** Altura do líquido (a partir do fundo) para que a ÁREA preenchida seja `frac` do círculo. */
function levelHeight(frac, r = R) {
  if (frac <= 0) return 0;
  if (frac >= 1) return 2 * r;
  let lo = 0, hi = 2 * r;
  for (let k = 0; k < 28; k++) {
    const h = (lo + hi) / 2;
    const d = r - h;
    const area = r * r * Math.acos(d / r) - d * Math.sqrt(Math.max(0, r * r - d * d));
    if (area / (Math.PI * r * r) < frac) lo = h;
    else hi = h;
  }
  return (lo + hi) / 2;
}

/** Superfície ondulada; repete a cada WAVE_L para o "balanço" ser contínuo. */
function wavePath(L = WAVE_L, A = 2.6) {
  const x0 = -R - 2 * L;
  let d = `M${x0},0`;
  for (let x = x0; x < R + L; x += L) d += ` q${L / 4},${-A} ${L / 2},0 t${L / 2},0`;
  return `${d} V${2 * R + 8} H${x0} Z`;
}

export class GraphView {
  constructor(wrap, svgEl) {
    this.wrap = wrap;
    this.svg = d3.select(svgEl);
    this.w = 800;
    this.h = 600;
    this.nodes = [];
    this.byId = new Map();
    this.edges = [];
    this.P = [[1]];
    this.geomCache = new Map();

    // Duplo clique no papel cria um estado ali mesmo (quando o nível permite editar estados).
    this.svg.on('dblclick', (ev) => {
      if (ev.target !== this.svg.node()) return;
      if (!LEVELS[getState().meta.level].features.editStates) return;
      const [x, y] = d3.pointer(ev, this.svg.node());
      actions.addState({ x: this.ix(x), y: this.iy(y) });
    });

    this.gGhost = this.svg.append('g');
    this.gEdges = this.svg.append('g').attr('class', 'edges');
    this.gNodes = this.svg.append('g').attr('class', 'nodes');
    this.gLabels = this.svg.append('g').attr('class', 'edge-labels');

    this.force = d3
      .forceSimulation()
      .alphaDecay(0.045)
      .velocityDecay(0.38)
      .force('charge', d3.forceManyBody().strength(-140).distanceMax(260))
      .force('collide', d3.forceCollide(R * 2.2))
      .force('x', d3.forceX((d) => d.tx).strength(0.2))
      .force('y', d3.forceY((d) => d.ty).strength(0.2))
      .on('tick', () => this.layout());

    this.drag = d3
      .drag()
      .on('start', (ev, n) => {
        if (!ev.active) this.force.alphaTarget(0.25).restart();
        n.fx = n.x;
        n.fy = n.y;
        n.dragged = false;
      })
      .on('drag', (ev, n) => {
        n.dragged = true;
        n.fx = clamp(ev.x, R + 8, this.w - R - 8);
        n.fy = clamp(ev.y, R + 22, this.h - R - 64);
      })
      .on('end', (ev, n) => {
        if (!ev.active) this.force.alphaTarget(0);
        const x = this.ix(n.fx), y = this.iy(n.fy);
        n.fx = null;
        n.fy = null;
        // Um clique para ler a explicação não muda o modelo nem gera passo de desfazer.
        if (n.dragged) actions.moveState(n.i, x, y);
      });

    new ResizeObserver(() => this.resize()).observe(wrap);
    this.resize();

    subscribe((s, t) => {
      if (t.has('derived') || t.has('layout') || t.has('level') || t.has('challenge') || t.has('ui')) this.render(s);
      if (t.has('hover') || t.has('derived')) this.applyHover(s);
      if (t.has('sim') || t.has('derived') || t.has('challenge')) this.renderLevels(s);
    });
  }

  // coordenadas normalizadas (0..1) ↔ pixels
  // A margem lateral encolhe em telas estreitas, sem deixar o pote sair do papel.
  get mx() { return Math.min(MARGIN, Math.max(R + 22, this.w * 0.15)); }
  px(x) { return this.mx + x * (this.w - 2 * this.mx); }
  py(y) { return MARGIN * 0.75 + y * (this.h - MARGIN * 2.5); }
  ix(px) { return clamp((px - this.mx) / (this.w - 2 * this.mx), 0, 1); }
  iy(py) { return clamp((py - MARGIN * 0.75) / (this.h - MARGIN * 2.5), 0, 1); }

  resize() {
    const r = this.wrap.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.w = r.width;
    this.h = r.height;
    this.svg.attr('viewBox', `0 0 ${this.w} ${this.h}`);
    for (const n of this.nodes) {
      n.tx = this.px(n.st.x);
      n.ty = this.py(n.st.y);
    }
    this.force.alpha(0.5).restart();
  }

  render(s) {
    const states = s.chain.states;
    const d = s.derived;
    this.P = d.effective;
    const old = this.byId;
    this.byId = new Map();
    let added = false;
    this.nodes = states.map((st, i) => {
      let nd = old.get(st.id);
      if (!nd) {
        nd = { id: st.id, cid: `jar${clipSeq++}`, x: this.px(st.x), y: this.py(st.y) };
        added = true;
      }
      Object.assign(nd, { i, st, tx: this.px(st.x), ty: this.py(st.y) });
      this.byId.set(st.id, nd);
      return nd;
    });
    this.force.nodes(this.nodes);
    this.force.alpha(old.size !== this.nodes.length || added ? 0.7 : 0.25).restart();

    const mode = s.ui.matrixMode;

    // ── potes
    const ng = this.gNodes.selectAll('g.node').data(this.nodes, (n) => n.id);
    ng.exit().remove();
    const enter = ng.enter().append('g').attr('class', 'node').style('opacity', 0).call(this.drag);
    enter.append('circle').attr('class', 'hl-disk').attr('r', R + 10);
    enter.append('circle').attr('class', 'warn-ring').attr('r', R + 6);
    enter.append('circle').attr('class', 'jar').attr('r', R);
    enter.append('clipPath').attr('id', (n) => n.cid).append('circle').attr('r', R - 1.2);
    enter
      .append('g')
      .attr('clip-path', (n) => `url(#${n.cid})`)
      .append('g')
      .attr('class', 'liquid')
      .attr('transform', `translate(0,${R + 4})`)
      .append('path')
      .attr('class', 'wave')
      .attr('d', wavePath())
      .style('--wl', `${WAVE_L}px`);
    enter.append('path').attr('class', 'pi-mark').style('opacity', 0);
    enter.append('text').attr('class', 'pi-glyph').text('π').style('opacity', 0);
    enter.append('circle').attr('class', 'rim').attr('r', R);
    enter.append('text').attr('class', 'share').attr('dy', '0.36em');
    const tag = enter.append('g').attr('class', 'tag').attr('transform', `translate(0,${R + 18})`);
    tag.append('rect').attr('height', 24).attr('y', -12).attr('rx', 12);
    tag.append('circle').attr('class', 'swatch').attr('r', 4.5);
    tag.append('text').attr('text-anchor', 'start');
    enter.append('text').attr('class', 'pi-val').attr('y', R + 47);
    const badge = enter.append('g').attr('class', 'badge').attr('transform', `translate(0,${-R - 14})`);
    badge.append('rect').attr('width', 78).attr('height', 19).attr('x', -39).attr('y', -9.5).attr('rx', 9.5);
    badge.append('text').text('absorvente');
    enter.append('title');
    enter
      .attr('tabindex', 0)
      .attr('role', 'button')
      .on('mouseenter', (ev, n) => actions.setHover({ type: 'node', i: n.i }))
      .on('mouseleave', () => actions.setHover(null))
      .on('click', (ev, n) => explain('jar-info', { i: n.i }))
      .on('focus', (ev, n) => actions.setHover({ type: 'node', i: n.i }))
      .on('blur', () => actions.setHover(null))
      .on('keydown', (ev, n) => this.nodeKey(ev, n));
    enter.transition().duration(400).style('opacity', 1);

    const all = enter.merge(ng);
    this.nodeSel = all;
    all
      .attr('data-i', (n) => n.i)
      .attr('aria-label', (n) => `Estado ${n.st.label}. Enter abre a explicação, setas percorrem as transições, Shift com setas move o pote.`)
      .classed('absorbing', (n) => d.absorbing.includes(n.i))
      .classed('warn', (n) => d.rowStatus[n.i] !== 'ok');
    all.select('.wave').attr('fill', (n) => n.st.color);
    all.select('.tag .swatch').attr('fill', (n) => n.st.color);
    all.select('.tag text').text((n) => n.st.label);
    all.select('.tag').each(function () {
      const g = d3.select(this);
      const t = g.select('text').node();
      let tw = 0;
      try { tw = t.getComputedTextLength(); } catch { /* sem layout */ }
      if (!tw) tw = t.textContent.length * 7.2;
      const w = tw + 34;
      g.select('rect').attr('x', -w / 2).attr('width', w);
      g.select('.swatch').attr('cx', -w / 2 + 13);
      g.select('text').attr('x', -w / 2 + 23);
    });
    all.select('title').text((n) => {
      const out = d.adj[n.i].map((j) => `→ ${states[j].label}: ${fmtP(d.effective[n.i][j], mode)}`).join('\n');
      return `${n.st.label}\n${out}`;
    });

    // ── setas
    this.edges = d.edges.map((e) => ({
      ...e,
      key: `${states[e.i].id}>${states[e.j].id}`,
      rev: e.i !== e.j && d.effective[e.j][e.i] > EPS,
      color: states[e.i].color,
      w: 1.6 + 7 * e.p,
    }));
    const eg = this.gEdges.selectAll('g.edge').data(this.edges, (e) => e.key);
    eg.exit().remove();
    const ee = eg
      .enter()
      .append('g')
      .attr('class', 'edge')
      .attr('tabindex', -1)
      .attr('role', 'button')
      .style('opacity', 0)
      .on('focus', (ev, e) => actions.setHover({ type: 'edge', i: e.i, j: e.j }))
      .on('blur', () => actions.setHover(null))
      .on('keydown', (ev, e) => this.edgeKey(ev, e));
    ee.append('path').attr('class', 'hl-under');
    ee.append('path').attr('class', 'stroke');
    ee.append('path').attr('class', 'arrow');
    ee.append('path')
      .attr('class', 'hit')
      .on('mouseenter', (ev, e) => actions.setHover({ type: 'edge', i: e.i, j: e.j }))
      .on('mouseleave', () => actions.setHover(null))
      .on('click', (ev, e) => explain('edge-info', { i: e.i, j: e.j }));
    ee.transition().duration(400).style('opacity', 1);
    this.edgeSel = ee.merge(eg);
    this.edgeSel.attr('aria-label', (e) => `Transição de ${states[e.i].label} para ${states[e.j].label}, chance ${fmtP(e.p, mode)}. Enter abre a explicação, Esc volta ao pote.`);
    this.edgeSel
      .select('.stroke')
      .attr('stroke', (e) => e.color)
      .transition()
      .duration(380)
      .ease(d3.easeCubicOut)
      .attr('stroke-width', (e) => e.w)
      .attr('stroke-opacity', (e) => 0.4 + 0.55 * e.p);
    this.edgeSel.select('.hl-under').attr('stroke-width', (e) => e.w + 12);
    this.edgeSel.select('.arrow').attr('fill', (e) => e.color);

    // ── rótulos das setas
    const lg = this.gLabels.selectAll('g.elabel').data(this.edges, (e) => e.key);
    lg.exit().remove();
    const le = lg.enter().append('g').attr('class', 'elabel');
    le.append('rect').attr('height', 20).attr('y', -10).attr('rx', 10);
    le.append('text');
    this.labelSel = le.merge(lg).attr('data-edge', (e) => `${e.i}-${e.j}`);
    this.labelSel.select('text').text((e) => fmtP(e.p, mode));
    this.labelSel.each(function (e) {
      const w = fmtP(e.p, mode).length * 7 + 14;
      d3.select(this).select('rect').attr('width', w).attr('x', -w / 2);
    });

    this.layout();
    this.applyHover(s);
    this.renderLevels(s);
  }

  // ── Teclado: Tab passa pelos potes; as setas entram nas transições que saem de cada um.
  nodeKey(ev, n) {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      explain('jar-info', { i: n.i });
      return;
    }
    const dir = ARROWS[ev.key];
    if (!dir) return;
    ev.preventDefault();
    if (ev.shiftKey) {
      actions.moveState(n.i, clamp(n.st.x + dir[0] * KEY_MOVE, 0, 1), clamp(n.st.y + dir[1] * KEY_MOVE, 0, 1));
      return;
    }
    const out = this.edgesFrom(n.i);
    if (out.length) out[dir[0] + dir[1] > 0 ? 0 : out.length - 1].focus();
  }

  edgeKey(ev, e) {
    const jar = () => this.gNodes.selectAll('g.node').filter((n) => n.i === e.i).node();
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      explain('edge-info', { i: e.i, j: e.j });
    } else if (ev.key === 'Escape') {
      jar()?.focus();
    } else if (ev.key === 'Tab') {
      jar()?.focus(); // o Tab segue a partir do pote, sem passar por todas as setas
    } else if (ARROWS[ev.key]) {
      ev.preventDefault();
      const out = this.edgesFrom(e.i);
      const step = ARROWS[ev.key][0] + ARROWS[ev.key][1];
      out[(out.indexOf(ev.currentTarget) + step + out.length) % out.length].focus();
    }
  }

  edgesFrom(i) {
    return this.gEdges.selectAll('g.edge').filter((e) => e.i === i).nodes();
  }

  /** Geometria atual da aresta i→j (cache invalidado a cada tick). */
  geom(i, j) {
    const key = i * 64 + j;
    let g = this.geomCache.get(key);
    if (!g) {
      const a = this.nodes[i], b = this.nodes[j];
      if (!a || !b) return null;
      const rev = i !== j && this.P[j]?.[i] > EPS;
      g = edgeGeometry(a, b, i === j, rev, this.centroid);
      this.geomCache.set(key, g);
    }
    return g;
  }

  layout() {
    this.geomCache.clear();
    let cx = 0, cy = 0;
    for (const n of this.nodes) {
      n.x = clamp(n.x, R + 8, this.w - R - 8);
      n.y = clamp(n.y, R + 22, this.h - R - 64);
      cx += n.x;
      cy += n.y;
    }
    const k = this.nodes.length || 1;
    this.centroid = [cx / k, cy / k];

    this.gNodes.selectAll('g.node').attr('transform', (n) => `translate(${n.x.toFixed(1)},${n.y.toFixed(1)})`);
    const self = this;
    this.edgeSel?.each(function (e) {
      const g = self.geom(e.i, e.j);
      if (!g) return;
      const size = 7 + e.w * 1.05;
      const sel = d3.select(this);
      sel.select('.stroke').attr('d', pathString(g, size * 0.9));
      sel.select('.hl-under').attr('d', pathString(g));
      sel.select('.hit').attr('d', pathString(g));
      sel.select('.arrow').attr('d', arrowString(g, size));
    });
    this.labelSel?.attr('transform', (e) => {
      const g = this.geom(e.i, e.j);
      if (!g) return '';
      const [x, y] = bezierPoint(g, 0.5);
      if (e.i === e.j) return `translate(${x},${y})`;
      const [tx, ty] = bezierTangent(g, 0.5);
      const off = e.rev ? 12 : 0;
      return `translate(${x - ty * off},${y + tx * off})`;
    });
    if (this.ghost) this.drawGhost(this.ghost);
  }

  applyHover(s) {
    const h = s.ui.hover;
    const n = this.nodes.length;
    const nodesHL = new Set();
    const edgesHL = new Set();
    let ghost = null;
    const key = (i, j) => `${i}-${j}`;
    const has = (i, j) => this.P[i]?.[j] > EPS;

    if (h && (h.type === 'cell' || h.type === 'edge') && h.i < n && h.j < n) {
      nodesHL.add(h.i).add(h.j);
      if (has(h.i, h.j)) edgesHL.add(key(h.i, h.j));
      else ghost = { i: h.i, j: h.j };
    } else if (h && (h.type === 'node' || h.type === 'row' || h.type === 'col') && h.i < n) {
      nodesHL.add(h.i);
      for (const e of this.edges) {
        const out = e.i === h.i && h.type !== 'col';
        const inn = e.j === h.i && h.type !== 'row';
        if (out || inn) {
          edgesHL.add(key(e.i, e.j));
          nodesHL.add(e.i).add(e.j);
        }
      }
    } else if (h && h.type === 'class') {
      h.members.forEach((m) => nodesHL.add(m));
      for (const e of this.edges) if (nodesHL.has(e.i) && nodesHL.has(e.j)) edgesHL.add(key(e.i, e.j));
    }

    const active = !!h && nodesHL.size > 0;
    this.gNodes
      .selectAll('g.node')
      .classed('is-hl', (d) => active && nodesHL.has(d.i))
      .classed('is-dim', (d) => active && !nodesHL.has(d.i));
    this.edgeSel
      ?.classed('is-hl', (e) => active && edgesHL.has(key(e.i, e.j)))
      .classed('is-dim', (e) => active && !edgesHL.has(key(e.i, e.j)));
    const showAll = n <= 6;
    this.labelSel
      ?.classed('show', (e) => (active ? edgesHL.has(key(e.i, e.j)) : showAll))
      .classed('is-hl', (e) => active && edgesHL.has(key(e.i, e.j)));

    this.ghost = ghost;
    this.drawGhost(ghost);
  }

  /** Seta tracejada para P(i,j) = 0: "esta transição poderia existir". */
  drawGhost(ghost) {
    const data = ghost ? [ghost] : [];
    const sel = this.gGhost.selectAll('g.ghost-g').data(data);
    sel.exit().remove();
    const en = sel.enter().append('g').attr('class', 'ghost-g');
    en.append('path').attr('class', 'ghost');
    en.append('text').attr('class', 'ghost-label');
    const m = en.merge(sel);
    if (!ghost) return;
    const a = this.nodes[ghost.i], b = this.nodes[ghost.j];
    if (!a || !b) return;
    const g = edgeGeometry(a, b, ghost.i === ghost.j, ghost.i !== ghost.j && this.P[ghost.j]?.[ghost.i] > EPS, this.centroid);
    m.select('.ghost').attr('d', pathString(g));
    const [x, y] = bezierPoint(g, 0.5);
    m.select('.ghost-label').attr('x', x).attr('y', y - 9).text('P = 0, sem seta');
  }

  /** Nível do líquido (simulação) e marca de equilíbrio π em cada pote. */
  renderLevels(s) {
    if (!this.nodeSel) return;
    const sim = s.simulation;
    const occ = sim.status !== 'idle' ? sim.occupancy : null;
    const total = occ ? occ.reduce((a, b) => a + b, 0) : 0;
    const share = (i) => (occ && total ? (occ[i] || 0) / total : null);
    const pi = s.derived.stationary;
    const showPi = !!pi && !isPiHidden(s);
    this.svg.classed('running', sim.status === 'running');

    this.nodeSel
      .select('.liquid')
      .transition()
      .duration(sim.status === 'running' ? 520 : 300)
      .ease(d3.easeCubicOut)
      .attr('transform', (n) => {
        const f = share(n.i);
        return `translate(0,${f === null || f === 0 ? R + 4 : R - levelHeight(f)})`;
      });
    this.nodeSel.select('.share').text((n) => {
      const f = share(n.i);
      return f === null ? '' : `${Math.round(f * 100)}%`;
    });

    this.nodeSel.each(function (n) {
      const g = d3.select(this);
      if (!showPi || !pi[n.i] || pi[n.i] >= 0.999) {
        g.select('.pi-mark').style('opacity', 0);
        g.select('.pi-glyph').style('opacity', 0);
        return;
      }
      const y = R - levelHeight(pi[n.i]);
      const hw = Math.sqrt(Math.max(0, R * R - y * y));
      g.select('.pi-mark').attr('d', `M${-hw + 1},${y}H${hw + 9}`).style('opacity', 1);
      g.select('.pi-glyph').attr('x', hw + 11).attr('y', y + 4).style('opacity', 1);
    });
    this.nodeSel.select('.pi-val').text((n) => (showPi ? `π = ${num(pi[n.i], 3)}` : ''));
  }
}
