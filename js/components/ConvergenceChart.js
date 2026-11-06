// Empírico (partículas) vs teórico μ₀Pᵗ — torna a Lei dos Grandes Números visível.
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { subscribe } from '../store.js';
import { tvDistance } from '../math/linalg.js';
import { num } from '../util.js';
import { vocab } from '../vocab.js';
import { helpDot } from '../coach/api.js';
import { isPiHidden } from '../challenges/definitions.js';

export class ConvergenceChart {
  constructor(el) {
    this.el = el;
    el.innerHTML = `
      <header class="card-head"><h2>Potes ao longo do tempo ${helpDot('chart', 'Explicar este gráfico')}</h2></header>
      <p class="card-sub"><span data-sub></span> <span class="chart-stat" data-stat></span></p>
      <div class="chart-wrap"><svg></svg><div class="chart-empty">Rode a simulação e as curvas aparecem aqui.</div></div>
      <div class="chart-legend"><span><i></i>sorteios (Monte Carlo) ${helpDot('lln', 'Explicar os sorteios')}</span><span><i class="dash"></i>conta exata μ₀Pᵗ</span></div>`;
    this.svg = d3.select(el.querySelector('svg'));
    this.empty = el.querySelector('.chart-empty');
    this.stat = el.querySelector('[data-stat]');
    this.g = this.svg.append('g');
    this.gx = this.g.append('g').attr('class', 'axis');
    this.gy = this.g.append('g').attr('class', 'axis');
    this.lines = this.g.append('g');
    new ResizeObserver(() => this.lastState && this.render(this.lastState)).observe(el);
    subscribe((s, t) => {
      if (t.has('sim') || t.has('derived') || t.has('challenge')) this.render(s);
    });
  }

  render(s) {
    this.lastState = s;
    const hist = s.simulation.history;
    const states = s.chain.states;
    const v = vocab(s.chain);
    this.el.querySelector('[data-sub]').textContent = `Fração de ${v.units} em cada estado, ${v.step} a ${v.step}.`;
    const box = this.el.querySelector('.chart-wrap').getBoundingClientRect();
    const W = box.width || 380, H = box.height || 170;
    const m = { l: 34, r: 8, t: 6, b: 18 };
    this.svg.attr('viewBox', `0 0 ${W} ${H}`);
    this.empty.style.display = hist.length ? 'none' : 'grid';

    const tMax = Math.max(20, hist.length ? hist[hist.length - 1].t : 0);
    const tMin = hist.length ? hist[0].t : 0;
    const x = d3.scaleLinear().domain([tMin, Math.max(tMin + 20, tMax)]).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([0, 1]).range([H - m.b, m.t]);
    this.gx.attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(5).tickSize(3));
    this.gy.attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(3).tickFormat(d3.format('.0%')));

    const series = hist.length
      ? states.flatMap((st, i) => [
          { key: `e${st.id}`, color: st.color, dash: null, w: 2.2, op: 1, pts: hist.map((h) => [h.t, h.emp[i] ?? 0]) },
          { key: `t${st.id}`, color: st.color, dash: '5 4', w: 1.4, op: 0.8, pts: hist.map((h) => [h.t, h.th[i] ?? 0]) },
        ])
      : [];
    const line = d3.line().x((p) => x(p[0])).y((p) => y(p[1])).curve(d3.curveMonotoneX);
    const sel = this.lines.selectAll('path').data(series, (d) => d.key);
    sel.exit().remove();
    sel
      .enter()
      .append('path')
      .attr('fill', 'none')
      .merge(sel)
      .attr('stroke', (d) => d.color)
      .attr('stroke-width', (d) => d.w)
      .attr('stroke-dasharray', (d) => d.dash)
      .attr('stroke-opacity', (d) => d.op)
      .attr('d', (d) => line(d.pts));

    const pi = s.derived.stationary;
    const last = hist[hist.length - 1];
    if (last && pi && last.emp.length === pi.length && !isPiHidden(s)) {
      this.stat.innerHTML = `longe de π: <b>${num(tvDistance(last.emp, pi), 3)}</b> ${helpDot('tv', 'Explicar esta medida')}`;
    } else if (last && !pi) {
      this.stat.textContent = 'Sem π única: o destino depende do início.';
    } else this.stat.textContent = '';
  }
}
