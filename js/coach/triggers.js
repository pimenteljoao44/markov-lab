// Quando cada balão aparece: as explicações seguem o que a pessoa está fazendo.
import { tvDistance } from '../math/linalg.js';
import { isPiHidden } from '../challenges/definitions.js';

/** Primeira visita a cada nível: uma sequência curta, que se pode pular. */
export const TOURS = {
  1: ['state', 'arrow', 'markov', 'run'],
  2: ['matrix', 'row', 'column'],
  3: ['start-modeling', 'good-state', 'click-anything'],
};

export function snapshot(s) {
  const d = s.derived;
  return {
    n: d.n,
    absorbing: d.absorbing.slice(),
    period: d.isIrreducible ? d.period : null,
    closed: d.classes.filter((c) => c.closed).length,
    doubly: d.isDoublyStochastic,
    init: s.simulation.initialDistribution,
  };
}

/** Compara com o momento anterior e dispara o que acabou de acontecer. */
export function checkEvents(s, prev, fire) {
  const d = s.derived;
  const sim = s.simulation;
  const level = s.meta.level;

  // ── matriz
  const bad = d.rowStatus.findIndex((x) => x !== 'ok');
  if (bad >= 0 && level >= 2) fire('row-sum', { i: bad, still: (st) => st.derived.rowStatus[bad] !== 'ok' });
  if (d.n > prev.n) fire('state-added', { i: d.n - 1 });

  // ── comportamento da cadeia
  const fresh = d.absorbing.find((i) => !prev.absorbing.includes(i));
  if (fresh !== undefined) fire('absorbing', { i: fresh, still: (st) => st.derived.absorbing.includes(fresh) });
  const period = d.isIrreducible ? d.period : null;
  if (period >= 2 && prev.period !== period) fire('periodic', { still: (st) => st.derived.period >= 2 });
  const closed = d.classes.filter((c) => c.closed).length;
  if (closed >= 2 && prev.closed < 2) fire('islands', { still: (st) => st.derived.classes.filter((c) => c.closed).length >= 2 });
  if (level >= 2 && d.isDoublyStochastic && !prev.doubly) fire('doubly', { still: (st) => st.derived.isDoublyStochastic });

  // ── simulação
  if (sim.initialDistribution !== prev.init && sim.initialDistribution !== 'first') fire('mu0');
  if (sim.status !== 'running') return;
  const count = sim.particleCount;
  if (count <= 3 && sim.tick >= 3) fire('trail', { still: (st) => st.simulation.particleCount <= 3 });
  if (count === 1 && sim.tick >= 9) fire('more-units', { still: (st) => st.simulation.particleCount === 1 });
  if (count > 25 && sim.tick >= 1) fire('jar');
  if (count > 3 && count <= 50 && sim.tick >= 10) fire('lln');
  if (count >= 100 && sim.tick >= 8) fire('chart');

  const last = sim.history[sim.history.length - 1];
  if (d.isErgodic && d.stationary && !isPiHidden(s) && count >= 100 && sim.tick >= 6 && last && tvDistance(last.emp, d.stationary) < 0.06) {
    fire('equilibrium');
  }
  if (d.absorbing.length && count >= 25 && sim.occupancy.length === d.n) {
    const inside = d.absorbing.reduce((a, i) => a + sim.occupancy[i], 0);
    if (inside / count >= 0.6) fire('absorbed', { i: d.absorbing[0] });
  }
}

/** O que explicar depois de um tempinho com o mouse em cima de algo. */
export function dwellTip(h, level) {
  if (h.type === 'cell') return h.i === h.j ? ['diagonal', { i: h.i }] : ['cell', { i: h.i, j: h.j }];
  if (h.type === 'edge') return ['arrow', { i: h.i, j: h.j }];
  if (h.type === 'row' && level >= 2) return ['row', { i: h.i }];
  if (h.type === 'col' && level >= 2) return ['column', { i: h.i }];
  return null;
}
