// Store reativo mínimo: uma única fonte de verdade para matriz, grafo e simulação.
// `chain` é o único estado editável; `derived` é sempre recalculado a partir dele.
import { analyze } from './math/analyze.js';
import { PALETTE, MAX_STATES, normalizeRow, deepClone } from './util.js';
import { ChainHistory } from './models/history.js';

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
 * Tags: chain | derived | structure | layout | hover | sim | level | challenge | ui | model | restore
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

// Cada nível tem o seu modelo, então cada um tem o seu histórico.
const histories = { 1: new ChainHistory(), 2: new ChainHistory(), 3: new ChainHistory() };
const currentHistory = () => histories[state.meta.level];

/** Muda o modelo e guarda como ele estava. Se nada mudou de fato, não gera passo de desfazer. */
function commit(kind, mutator, ...tags) {
  const before = JSON.stringify(state.chain);
  mutator(state);
  if (JSON.stringify(state.chain) !== before) currentHistory().record(JSON.parse(before), kind);
  update(null, ...tags);
}

function travel(direction) {
  const next = currentHistory()[direction](deepClone(state.chain));
  if (!next) return false;
  update((s) => {
    s.chain = next;
    s.ui.hover = null;
  }, 'chain', 'structure', 'layout', 'hover', 'restore');
  return true;
}

export const historyState = () => ({ canUndo: currentHistory().canUndo, canRedo: currentHistory().canRedo });

export const dumpHistories = () => ({ 1: histories[1].past, 2: histories[2].past, 3: histories[3].past });

export function restoreHistories(saved) {
  for (const level of [1, 2, 3]) histories[level].restore(saved[level] || []);
}

export const actions = {
  setCell(i, j, v) {
    commit(`cell:${i}:${j}`, (s) => (s.chain.matrix[i][j] = v), 'chain');
  },
  setRow(i, row) {
    commit(`row:${i}`, (s) => (s.chain.matrix[i] = row.slice()), 'chain');
  },
  setMatrix(matrix) {
    commit(null, (s) => (s.chain.matrix = matrix), 'chain');
  },
  normalizeRow(i) {
    commit(null, (s) => (s.chain.matrix[i] = normalizeRow(s.chain.matrix[i], i)), 'chain');
  },
  normalizeAll() {
    commit(null, (s) => (s.chain.matrix = s.chain.matrix.map((r, i) => normalizeRow(r, i))), 'chain');
  },
  addState(at) {
    const s = state;
    const n = s.chain.states.length;
    if (n >= MAX_STATES) return false;
    const used = new Set(s.chain.states.map((x) => x.color));
    const color = PALETTE.find((c) => !used.has(c)) || PALETTE[n % PALETTE.length];
    const a = Math.random() * Math.PI * 2;
    commit(null, (st) => {
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
      st.chain.matrix.push(new Array(n + 1).fill(1 / (n + 1)));
    }, 'chain', 'structure');
    return true;
  },
  removeState(i) {
    if (state.chain.states.length <= 2) return false;
    commit(null, (st) => {
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
    commit(null, (st) => {
      st.chain.states[i].label = next;
      st.chain.meta.custom = true;
    }, 'chain', 'structure');
  },
  moveState(i, x, y) {
    commit(`move:${i}`, (st) => Object.assign(st.chain.states[i], { x, y }), 'layout');
  },
  setHover(h) {
    if (sameHover(state.ui.hover, h)) return;
    update((s) => (s.ui.hover = h), 'hover');
  },
  /** Troca o modelo inteiro: simulação recomeça e a interface passa a falar a língua dele. */
  loadChain(chain) {
    commit(null, (s) => {
      s.chain = chain;
      s.ui.hover = null;
    }, 'chain', 'structure', 'layout', 'hover', 'model');
  },
  /** Edita nomes do modelo e dos estados de uma vez. */
  editModel(meta, labels) {
    commit(null, (s) => {
      Object.assign(s.chain.meta, meta, { custom: true });
      labels?.forEach((l, i) => {
        if (s.chain.states[i]) s.chain.states[i].label = String(l).slice(0, 24) || `Estado ${i + 1}`;
      });
    }, 'chain', 'structure', 'layout');
  },
  undo: () => travel('undo'),
  redo: () => travel('redo'),
};
