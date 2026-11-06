// Store reativo mínimo: uma única fonte de verdade para matriz, grafo e simulação.
// `chain` é o único estado editável; `derived` é sempre recalculado a partir dele.
import { analyze } from './math/analyze.js';
import { PALETTE, MAX_STATES, normalizeRow } from './util.js';

let state = null;
const subscribers = new Set();

export function initStore(initial) {
  state = initial;
  state.derived = analyze(state.chain);
}

export const getState = () => state;

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

/**
 * Aplica uma mutação e notifica com as tags afetadas.
 * Tags: chain | derived | structure | layout | hover | sim | level | challenge | ui
 */
export function update(mutator, ...tags) {
  if (mutator) mutator(state);
  const t = new Set(tags);
  if (t.has('chain')) {
    state.derived = analyze(state.chain);
    t.add('derived');
  }
  for (const fn of subscribers) fn(state, t);
}

const sameHover = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.type === b.type && a.i === b.i && a.j === b.j && String(a.members) === String(b.members);
};

let uid = 0;

export const actions = {
  setCell(i, j, v) {
    update((s) => (s.chain.matrix[i][j] = v), 'chain');
  },
  setRow(i, row) {
    update((s) => (s.chain.matrix[i] = row.slice()), 'chain');
  },
  normalizeRow(i) {
    update((s) => (s.chain.matrix[i] = normalizeRow(s.chain.matrix[i], i)), 'chain');
  },
  normalizeAll() {
    update((s) => (s.chain.matrix = s.chain.matrix.map((r, i) => normalizeRow(r, i))), 'chain');
  },
  addState(at) {
    const s = state;
    const n = s.chain.states.length;
    if (n >= MAX_STATES) return false;
    const used = new Set(s.chain.states.map((x) => x.color));
    const color = PALETTE.find((c) => !used.has(c)) || PALETTE[n % PALETTE.length];
    const a = Math.random() * Math.PI * 2;
    update((st) => {
      st.chain.states.push({
        id: `n${Date.now().toString(36)}${uid++}`,
        label: `Estado ${n + 1}`,
        color,
        x: at ? at.x : 0.5 + 0.18 * Math.cos(a),
        y: at ? at.y : 0.5 + 0.18 * Math.sin(a),
      });
      st.chain.meta.custom = true;
      st.chain.matrix.forEach((r) => r.push(0));
      // O novo estado nasce "indeciso": distribui igualmente para todos.
      st.chain.matrix.push(new Array(n + 1).fill(Math.round((1 / (n + 1)) * 1e4) / 1e4));
      st.chain.matrix[n] = normalizeRow(st.chain.matrix[n], n);
    }, 'chain', 'structure');
    return true;
  },
  removeState(i) {
    if (state.chain.states.length <= 2) return false;
    update((st) => {
      st.chain.states.splice(i, 1);
      st.chain.matrix.splice(i, 1);
      st.chain.matrix.forEach((r) => r.splice(i, 1));
      st.ui.hover = null;
    }, 'chain', 'structure', 'hover');
    return true;
  },
  renameState(i, label) {
    const next = String(label).slice(0, 24) || `Estado ${i + 1}`;
    if (next === state.chain.states[i].label) return;
    update((st) => {
      st.chain.states[i].label = next;
      st.chain.meta.custom = true;
    }, 'chain', 'structure');
  },
  moveState(i, x, y) {
    update((st) => Object.assign(st.chain.states[i], { x, y }), 'layout');
  },
  setHover(h) {
    if (sameHover(state.ui.hover, h)) return;
    update((s) => (s.ui.hover = h), 'hover');
  },
  /** Troca o modelo inteiro: simulação recomeça e a interface passa a falar a língua dele. */
  loadChain(chain) {
    update((s) => {
      s.chain = chain;
      s.ui.hover = null;
    }, 'chain', 'structure', 'layout', 'hover', 'model');
  },
  /** Edita nomes do modelo e dos estados de uma vez. */
  editModel(meta, labels) {
    update((s) => {
      Object.assign(s.chain.meta, meta, { custom: true });
      labels?.forEach((l, i) => {
        if (s.chain.states[i]) s.chain.states[i].label = String(l).slice(0, 24) || `Estado ${i + 1}`;
      });
    }, 'chain', 'structure', 'layout');
  },
};
